import { create } from 'zustand';
import { generateInitialBatch } from '../utils/trainGenerator';

// ─── Session Persistence Helpers ─────────────────────────────────────────────
const SESSION_KEY = 'railsim_session';

function saveSession(partial) {
  try {
    const prev = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    // Don't overwrite station if not provided in partial, keep existing
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {}
}

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
  } catch { return {}; }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

const session = loadSession();

// ─── Helpers ─────────────────────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).substr(2, 9);

const MAX_LOG_ENTRIES = 200;
const MAX_TOASTS      = 3;
const MAX_HEATMAP_HISTORY = 60; // sim-minutes

// ─── Initial occupancy (all tracks empty) ────────────────────────────────────
const emptyOccupancy = (tracks) => {
  const occ = {};
  if (!tracks) return occ;
  Object.keys(tracks).forEach(id => { occ[id] = null; });
  return occ;
};

// ─── Store ───────────────────────────────────────────────────────────────────
export const useSimStore = create((set, get) => ({
  // ── Station ──────────────────────────────────────────────────────────────
  station: null,            // full station object from builder or sample
  setStation: (station) => set((state) => {
    const hasExistingOcc = Object.keys(state.trackOccupancy || {}).length > 0;
    saveSession({ station });
    return {
      station,
      trackOccupancy: hasExistingOcc ? state.trackOccupancy : emptyOccupancy(station?.tracks),
      maintenanceTracks: state.maintenanceTracks || new Set(),
      disabledTracks: state.disabledTracks || new Set(),
    };
  }),

  // ── Simulation Runtime ───────────────────────────────────────────────────
  trains: session.fullTrains || { queue: [], active: [], departed: [] },
  trackOccupancy: session.trackOccupancy || {},       // { [trackId]: { trainNo, since, until } | null }
  trackTimeline: session.trackTimeline || {},        // Advanced track timeline for 28 rule allocation
  signalStates: {},         // { [signalNo]: 'red' | 'green' | 'yellow' }
  maintenanceTracks: new Set(),
  disabledTracks: new Set(),
  overstayAlerts: [],       // Trains that have overstayed their max platform time

  setTrackTimeline: (trackTimeline) => set({ trackTimeline }),
  setSignalState: (signalNo, stateVal) => set(s => ({ signalStates: { ...s.signalStates, [signalNo]: stateVal } })),
  bulkSetSignals: (signals, stateVal) => set(s => {
    const next = { ...s.signalStates };
    (signals || []).forEach(sig => next[sig] = stateVal);
    return { signalStates: next };
  }),
  addOverstayAlerts: (alerts) => set(s => ({ overstayAlerts: [...s.overstayAlerts, ...alerts] })),
  clearOverstayAlerts: () => set({ overstayAlerts: [] }),

  rushLevel: session.rushLevel || 'basic',
  simTime: session.simTime || 0,
  speed: 1,
  paused: false,
  simStarted: session.simStarted || false,

  // ── Metrics ──────────────────────────────────────────────────────────────
  metrics: {
    occupancyPct: 0,
    conflictCount: 0,
    conflictsResolved: 0,
    trainsHandled: 0,
    avgDwellTime: 0,
    totalDwellTime: 0,
    dwellSamples: 0,
    mlDecisions: 0,
    overriddenDecisions: 0,
  },

  // ── Event Log ────────────────────────────────────────────────────────────
  eventLog: [],
  addEvent: (msg, type = 'info') => set((state) => {
    const totalMins = Math.floor(state.simTime);
    const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
    const mm = String(totalMins % 60).padStart(2, '0');
    const entry = {
      id: generateId(),
      timestamp: `${hh}:${mm}`,
      message: msg,
      type, // 'info' | 'success' | 'warning' | 'conflict' | 'user' | 'ml' | 'fallback'
    };
    return {
      eventLog: [entry, ...state.eventLog].slice(0, MAX_LOG_ENTRIES),
    };
  }),

  // ── Conflicts ────────────────────────────────────────────────────────────
  conflicts: [],
  addConflict: (conflict) => set((state) => ({
    conflicts: [...state.conflicts, { ...conflict, id: generateId(), resolved: false }],
    metrics: { ...state.metrics, conflictCount: state.metrics.conflictCount + 1 },
  })),
  resolveConflict: (conflictId) => set((state) => ({
    conflicts: state.conflicts.map(c =>
      c.id === conflictId ? { ...c, resolved: true } : c
    ),
    metrics: { ...state.metrics, conflictsResolved: state.metrics.conflictsResolved + 1 },
  })),

  // ML Status
  mlStatus: 'fallback',     // 'connected' | 'fallback'
  mlMode: true, // true = use simple ML decision tree, false = always greedy fallback
  setMlStatus: (s) => set({ mlStatus: s }),

  // Settings
  // ML mode toggle - true uses simple decision tree, false forces greedy fallback
  mlEndpoint: 'http://localhost:8000/predict',
  autoPauseOnConflict: false,
  showSignals: true,
  showCrossings: true,
  soundEnabled: false,

  updateSettings: (patch) => set((state) => ({ ...state, ...patch })),

  // ── Toasts ───────────────────────────────────────────────────────────────
  toasts: [],
  addToast: (message, variant = 'info') => {
    const id = generateId();
    set((state) => ({
      toasts: [
        ...state.toasts.slice(-(MAX_TOASTS - 1)),
        { id, message, variant }
      ]
    }));
    // auto-dismiss after 4s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
  dismissToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id),
  })),

  // ── Selected Element (for detail drawer) ─────────────────────────────────
  selectedElement: null,    // { type: 'train'|'track'|'signal', data: {} }
  setSelectedElement: (el) => set({ selectedElement: el }),
  clearSelected: () => set({ selectedElement: null }),

  // ── UI Panels ────────────────────────────────────────────────────────────
  metricsOpen: false,
  eventLogOpen: false,
  settingsOpen: false,
  shortcutsOpen: false,
  specialTrainModalOpen: false,
  toggleMetrics:      () => set(s => ({ metricsOpen: !s.metricsOpen })),
  toggleEventLog:     () => set(s => ({ eventLogOpen: !s.eventLogOpen })),
  toggleSettings:     () => set(s => ({ settingsOpen: !s.settingsOpen })),
  toggleShortcuts:    () => set(s => ({ shortcutsOpen: !s.shortcutsOpen })),
  openSpecialModal:   () => set({ specialTrainModalOpen: true }),
  closeSpecialModal:  () => set({ specialTrainModalOpen: false }),

  // ── Heatmap history ───────────────────────────────────────────────────────
  heatmapHistory: [],       // [{ simMin, perTrack: { trackId: count } }]
  pushHeatmapSnapshot: (snapshot) => set((state) => ({
    heatmapHistory: [...state.heatmapHistory, snapshot].slice(-MAX_HEATMAP_HISTORY),
  })),

  // ── Simulation Controls ───────────────────────────────────────────────────
  setRushLevel: (level) => {
    const state = useSimStore.getState();
    const newQueue = generateInitialBatch(level, 15, state.simTime);
    set({ 
      rushLevel: level,
      trains: {
        ...state.trains,
        queue: newQueue
      }
    });
    get().addEvent(`RUSH LEVEL changed to ${level.toUpperCase()} - Generating new queue`, 'user');
    get().addToast(`Rush level → ${level.toUpperCase()}`, 'info');
  },

  setSpeed: (speed) => set({ speed }),

  setPaused: (paused) => set({ paused }),

  startSimulation: () => {
    if (get().simStarted) return; // idempotent
    set({ simStarted: true, paused: false, simTime: 0 });
    saveSession({ simStarted: true, simTime: 0, rushLevel: get().rushLevel });
    get().addEvent('Simulation started.', 'info');
  },

  resetSimulation: () => {
    const station = get().station;
    set({
      trains: { queue: [], active: [], departed: [] },
      trackOccupancy: emptyOccupancy(station?.tracks),
      trackTimeline: {},
      signalStates: {},
      overstayAlerts: [],
      maintenanceTracks: new Set(),
      disabledTracks: new Set(),
      simTime: 0,
      paused: false,
      conflicts: [],
      eventLog: [],
      toasts: [],
      heatmapHistory: [],
      metrics: {
        occupancyPct: 0, conflictCount: 0, conflictsResolved: 0,
        trainsHandled: 0, avgDwellTime: 0, totalDwellTime: 0,
        dwellSamples: 0, mlDecisions: 0, overriddenDecisions: 0,
      },
    });
    get().addEvent('Simulation reset.', 'user');
    clearSession();
    saveSession({ simStarted: false, simTime: 0, rushLevel: get().rushLevel });
  },

  // Stop and clear session (called by Exit button only)
  exitSimulation: () => {
    clearSession();
    set({
      simStarted: false,
      paused: true,
      simTime: 0,
      station: null,
      trains: { queue: [], active: [], departed: [] },
      trackOccupancy: {},
      trackTimeline: {},
      signalStates: {},
      overstayAlerts: [],
      maintenanceTracks: new Set(),
      disabledTracks: new Set(),
      conflicts: [],
      eventLog: [],
      toasts: [],
      heatmapHistory: [],
      metrics: {
        occupancyPct: 0, conflictCount: 0, conflictsResolved: 0,
        trainsHandled: 0, avgDwellTime: 0, totalDwellTime: 0,
        dwellSamples: 0, mlDecisions: 0, overriddenDecisions: 0,
      },
    });
  },

  // ── Simulation Tick (called by the loop) ─────────────────────────────────
  tick: (deltaSimMins) => set((state) => {
    if (state.paused || !state.simStarted) return {};
    return { simTime: state.simTime + deltaSimMins };
  }),

  // ── Train Queue Management ────────────────────────────────────────────────
  enqueueTrains: (trains) => set((state) => ({
    trains: { ...state.trains, queue: [...state.trains.queue, ...trains] },
  })),

  activateTrain: (train) => set((state) => ({
    trains: {
      ...state.trains,
      queue: state.trains.queue.filter(t => t.train_no !== train.train_no),
      active: [...state.trains.active, train],
    },
  })),

  departTrain: (trainNo) => set((state) => {
    const train = state.trains.active.find(t => t.train_no === trainNo);
    if (!train) return {};
    // Free occupancy
    const trackId = String(train._assignedTrack);
    const newOcc = { ...state.trackOccupancy };
    if (newOcc[trackId]?.trainNo === trainNo) newOcc[trackId] = null;
    // Update dwell metrics
    const dwellTime = state.simTime - (train._arrivedAt || state.simTime);
    const newSamples = state.metrics.dwellSamples + 1;
    const newTotal = state.metrics.totalDwellTime + dwellTime;
    return {
      trains: {
        ...state.trains,
        active: state.trains.active.filter(t => t.train_no !== trainNo),
        departed: [
          { ...train, _departedAt: state.simTime },
          ...state.trains.departed,
        ].slice(0, 50),
      },
      trackOccupancy: newOcc,
      metrics: {
        ...state.metrics,
        trainsHandled: state.metrics.trainsHandled + 1,
        totalDwellTime: newTotal,
        dwellSamples: newSamples,
        avgDwellTime: Math.round(newTotal / newSamples),
      },
    };
  }),

  // ── Track Assignment ──────────────────────────────────────────────────────
  haltTrain: (trainNo, halt) => set((state) => {
    get().addEvent(`Station Master ${halt ? 'HALTED' : 'RESUMED'} train ${trainNo}`, 'user');
    
    // Find the train to get its assigned track
    const train = state.trains.active.find(t => t.train_no === trainNo);
    let newDisabled = new Set(state.disabledTracks);
    
    if (train && train._assignedTrack) {
      if (halt) {
        newDisabled.add(String(train._assignedTrack));
      } else {
        newDisabled.delete(String(train._assignedTrack));
      }
    }

    return {
      disabledTracks: newDisabled,
      trains: {
        ...state.trains,
        active: state.trains.active.map(t => t.train_no === trainNo ? { ...t, isHalted: halt } : t),
      }
    };
  }),

  addTrainBuffer: (trainNo, bufferMins) => set((state) => {
    get().addEvent(`Station Master added +${bufferMins}m buffer to train ${trainNo}`, 'user');
    return {
      trains: {
        ...state.trains,
        active: state.trains.active.map(t => {
          if (t.train_no !== trainNo) return t;
          return {
            ...t,
            _departureAt: (t._departureAt || state.simTime) + bufferMins,
            train_platform_duration: (() => {
              const current = typeof t.train_platform_duration === 'string'
                ? parseInt(t.train_platform_duration) || 0
                : (t.train_platform_duration || 0);
              return `${current + bufferMins} minute`;
            })(),
          };
        }),
      }
    };
  }),

  reassignTrainTrack: (trainNo, newTrackId) => set((state) => {
    get().addEvent(`Station Master reassigned train ${trainNo} to Track ${newTrackId}`, 'user');
    
    const train = state.trains.active.find(t => t.train_no === trainNo);
    if (!train) return state;

    const oldOcc = { ...state.trackOccupancy };
    if (oldOcc[String(train._assignedTrack)]) {
       delete oldOcc[String(train._assignedTrack)];
    }
    oldOcc[String(newTrackId)] = { trainNo, since: state.simTime, until: train._departureAt };

    return {
      trackOccupancy: oldOcc,
      trains: {
        ...state.trains,
        active: state.trains.active.map(t => 
          t.train_no === trainNo ? { ...t, _assignedTrack: newTrackId, _assignedPlatform: null } : t
        ),
      }
    };
  }),

  assignTrain: (trainNo, trackId, platformId, source, confidence, responseMs) => set((state) => {
    const trains = state.trains;
    const train = trains.queue.find(t => t.train_no === trainNo)
                || trains.active.find(t => t.train_no === trainNo);
    if (!train) return {};

    const now = state.simTime;
    const rawDur = train.train_platform_duration;
    const durMins = (typeof rawDur === 'string') ? (parseInt(rawDur) || 10) : (rawDur || 10);
    const departureSimTime = now + durMins;

    const newOcc = { ...state.trackOccupancy };
    newOcc[String(trackId)] = { trainNo, since: now, until: departureSimTime };

    const tag = source === 'ml'
      ? `[ML: ${responseMs}ms, conf: ${(confidence * 100).toFixed(0)}%]`
      : '[FALLBACK]';
    const msg = `→ ${trainNo} → Track ${trackId}, ${platformId}  ${tag}`;

    const updatedTrain = {
      ...train,
      _assignedTrack: trackId,
      _assignedPlatform: platformId,
      _assignedSource: source,
      _confidence: confidence,
      _arrivedAt: now,
      _departureAt: departureSimTime,
      _responseMs: responseMs,
    };

    return {
      trains: {
        ...trains,
        queue: trains.queue.filter(t => t.train_no !== trainNo),
        active: [...trains.active.filter(t => t.train_no !== trainNo), updatedTrain],
      },
      trackOccupancy: newOcc,
      metrics: {
        ...state.metrics,
        mlDecisions: source === 'ml'
          ? state.metrics.mlDecisions + 1
          : state.metrics.mlDecisions,
      },
      eventLog: [
        {
          id: generateId(),
          timestamp: (() => {
            const totalMins = Math.floor(now);
            const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
            const mm = String(totalMins % 60).padStart(2, '0');
            return `${hh}:${mm}`;
          })(),
          message: msg,
          type: source === 'ml' ? 'ml' : 'fallback',
        },
        ...state.eventLog,
      ].slice(0, MAX_LOG_ENTRIES),
    };
  }),

  // ── Track Maintenance / Disable ───────────────────────────────────────────
  markMaintenance: (trackId) => set((state) => {
    const next = new Set(state.maintenanceTracks);
    next.add(String(trackId));
    get().addEvent(`Track ${trackId} marked MAINTENANCE`, 'user');
    return { maintenanceTracks: next };
  }),

  clearMaintenance: (trackId) => set((state) => {
    const next = new Set(state.maintenanceTracks);
    next.delete(String(trackId));
    get().addEvent(`Track ${trackId} cleared from MAINTENANCE`, 'user');
    return { maintenanceTracks: next };
  }),

  disableTrack: (trackId) => set((state) => {
    const next = new Set(state.disabledTracks);
    next.add(String(trackId));
    get().addEvent(`Track ${trackId} DISABLED`, 'user');
    return { disabledTracks: next };
  }),

  enableTrack: (trackId) => set((state) => {
    const next = new Set(state.disabledTracks);
    next.delete(String(trackId));
    get().addEvent(`Track ${trackId} RE-ENABLED`, 'user');
    return { disabledTracks: next };
  }),

  // ── Override (user reassign) ──────────────────────────────────────────────
  overrideAssignment: (trainNo, newTrackId, newPlatformId) => {
    const state = get();
    get().addEvent(`Override: ${trainNo} → Track ${newTrackId}, ${newPlatformId}`, 'user');
    set((s) => ({
      metrics: { ...s.metrics, overriddenDecisions: s.metrics.overriddenDecisions + 1 },
    }));
    get().assignTrain(trainNo, newTrackId, newPlatformId, 'override', 1.0, 0);
  },

  // ── Special Train ─────────────────────────────────────────────────────────
  addSpecialTrain: (train) => {
    const specialTrain = {
      ...train,
      isSpecial: true,
      _priority: train.special_priority || 'HIGH',
      train_no: train.train_no || `SP-${generateId().slice(0, 5).toUpperCase()}`,
    };
    set((state) => ({
      trains: {
        ...state.trains,
        queue: [specialTrain, ...state.trains.queue], // prepend to top
      },
    }));
    get().addEvent(`SPECIAL TRAIN ${specialTrain.train_no} added to queue`, 'user');
    get().addToast(`Special train ${specialTrain.train_no} added to queue`, 'info');
  },

  // ── Export Session Log ────────────────────────────────────────────────────
  exportSessionLog: () => {
    const state = get();
    const data = {
      exportedAt: new Date().toISOString(),
      station: state.station?.metadata,
      simTime: state.simTime,
      metrics: state.metrics,
      eventLog: state.eventLog,
      conflicts: state.conflicts,
      trains: {
        active: state.trains.active,
        departed: state.trains.departed,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `railsim-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    get().addToast('Session log exported.', 'success');
  },
}));
