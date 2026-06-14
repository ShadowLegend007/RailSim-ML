import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/useSimStore';
import { generateTrain, getSpawnInterval } from '../utils/trainGenerator';
import { greedyAssign } from '../utils/greedyAssign';
import { predictAssignment } from '../services/mlService';
import trainAllocationService from '../services/trainAllocationService';

/**
 * Core simulation loop hook.
 * Runs a setInterval at 200ms real time for smooth animation.
 * Each tick advances simTime by (speed × simTimeRatio × 0.2) sim-minutes.
 *
 * Key design decisions:
 *  - simTime is always stored as a float but all formatting uses Math.floor()
 *  - trackOccupancy is re-read from the store INSIDE handleTrainArrival
 *    (not passed as a snapshot) so each arrival sees up-to-date occupancy
 *  - Only ONE train is processed per tick to avoid stale-state conflicts
 */
export function useSimulationLoop() {
  const intervalRef     = useRef(null);
  const nextSpawnRef    = useRef(null);
  const lastRushRef     = useRef(null);
  const lastSaveRef     = useRef(Date.now());
  const dataSnapshotRef = useRef([]);
  const SESSION_KEY     = 'railsim_session';

  useEffect(() => {
    const tick = async () => {
      const s = useSimStore.getState();

      // Simulation requires manual start now

      if (s.paused || !s.simStarted || !s.station) return;

      // s.speed is 1, 10, 30, 60 (real-time multiplier)
      // 200ms tick = 0.2 seconds real-time.
      // delta in minutes = (real_delta_seconds * speed_multiplier) / 60
      const deltaSimMins = (0.2 * s.speed) / 60;
      const newSimTime   = s.simTime + deltaSimMins;

      // Advance clock
      useSimStore.setState({ simTime: newSimTime });

      // Save simTime to sessionStorage every 10 real-seconds for restore-on-reload
      const now = Date.now();
      if (now - lastSaveRef.current > 10000) {
        lastSaveRef.current = now;
        const st = useSimStore.getState();
        try {
          const prev = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            ...prev,
            simTime: newSimTime,
            rushLevel: st.rushLevel,
            simStarted: st.simStarted,
            fullTrains: st.trains,
            trackOccupancy: st.trackOccupancy,
            trackTimeline: st.trackTimeline,
            // Snapshot of active train positions for data collection
            snapshot: {
              at: now,
              simTime: newSimTime,
              activeCount: st.trains.active.length,
              queueCount: st.trains.queue.length,
              departedCount: st.trains.departed.length,
              trains: st.trains.active.map(t => ({
                no: t.train_no,
                track: t._assignedTrack,
                x: t._phys_x,
                v: t._phys_v,
              }))
            }
          }));
        } catch {}
      }

      // Reset spawn timer when rush level changes
      const { rushLevel } = useSimStore.getState();
      if (lastRushRef.current !== rushLevel) {
        lastRushRef.current = rushLevel;
        nextSpawnRef.current = null;
      }

      // ── Process at most ONE arriving train per tick ──────────────────────
      // This prevents stale-occupancy conflicts when many trains pile up.
      // Re-read fresh state after each store mutation.
      const freshState = useSimStore.getState();
      const firstArriving = freshState.trains.queue
        .filter(t => t._arrivalSimMin <= newSimTime)
        .sort((a, b) => (a._arrivalSimMin - b._arrivalSimMin) || (a.isSpecial ? -1 : 1))[0];

      if (firstArriving) {
        const { station, trackOccupancy, trackTimeline, maintenanceTracks,
                disabledTracks, mlEndpoint } = useSimStore.getState();
        await handleTrainArrival(
          firstArriving, station, trackOccupancy, trackTimeline,
          maintenanceTracks, disabledTracks, newSimTime, mlEndpoint
        );
      }

      // ── Rule 15: Overstay monitoring ───────────────────────────────────────
      if (freshState.station && freshState.station.platforms && Math.floor(newSimTime) > Math.floor(s.simTime)) {
        const overstays = trainAllocationService.checkOverstayingTrains(freshState.trains.active, freshState.station.platforms, newSimTime);
        if (overstays.length > 0) {
           useSimStore.getState().addOverstayAlerts(overstays);
           overstays.forEach(o => {
             useSimStore.getState().addEvent(`ALERT: ${o.trainNo} overstayed at platform ${o.platform} for ${o.waitedMinutes}m`, 'warning');
             useSimStore.getState().addToast(`Overstay: ${o.trainNo} at ${o.platform}`, 'warning');
           });
        }
      }

      // ── Physics Engine (Kinematics Step) ───────────────────────────────────
      // dt_seconds is the amount of physical seconds that passed in this tick
      const dt_seconds = 0.2 * s.speed; 
      const activeTrains = useSimStore.getState().trains.active;
      let departedTrainNos = [];

      const updatedActiveTrains = activeTrains.map(train => {
        let x = train._phys_x;
        if (x === undefined) {
           x = 0;
           // Find if other trains are queued up at entry
           const entryTrains = activeTrains.filter(t => t.train_no !== train.train_no && (t._phys_x || 0) < 200);
           if (entryTrains.length > 0) {
              const minX = Math.min(...entryTrains.map(t => t._phys_x || 0));
              if (minX <= 200) {
                 x = minX - 220; // stagger safely behind by 220m (train length + visible buffer)
              }
           }
        }
        let v = train._phys_v || 0;

        // Kinematic Profiles
        let maxSpeed = 25; // m/s (~90km/h)
        let a_trac = 0.5;
        let a_brake = -0.4;

        if (train.train_type === 'superfast' || train.train_type === 'VIP') {
          maxSpeed = 38; // 136 km/h
          a_trac = 0.8;
          a_brake = -0.6;
        } else if (train.train_type === 'goods') {
          maxSpeed = 20.8; // 75 km/h
          a_trac = 0.2;
          a_brake = -0.25; // Heavy mass = slow braking
        }

        // Apply Speed Limits (Track-based)
        // Assume main_line is 130km/h (36m/s), loop is 30km/h (8.3m/s)
        const track = s.station?.tracks?.[train._assignedTrack];
        if (track && track.type !== 'main_line') {
          maxSpeed = Math.min(maxSpeed, 8.3);
        }

        // Target state logic
        let targetSpeed = maxSpeed;
        
        // Braking logic: distance required to stop from current velocity
        const stopDist = (v * v) / (2 * Math.abs(a_brake));

        // Rule: Junction collision prevention
        if (x <= 200) {
          const blockers = activeTrains.filter(t => 
            t.train_no !== train.train_no && 
            t._phys_x !== undefined && t._phys_x <= 200 &&
            (t._phys_x > x || (t._phys_x === x && t.train_no < train.train_no))
          );
          if (blockers.length > 0) {
            const blocker = blockers.reduce((closest, curr) => 
               (curr._phys_x - x) < (closest._phys_x - x) ? curr : closest
            );
            if ((blocker._phys_x - x) < stopDist + 220) {
              targetSpeed = 0;
            }
          }
        } else if (x >= 2800 && x < 3000) {
          const blockers = activeTrains.filter(t => 
            t.train_no !== train.train_no && 
            t._phys_x !== undefined && t._phys_x >= 2800 && t._phys_x <= 3000 &&
            (t._phys_x > x || (t._phys_x === x && t.train_no < train.train_no))
          );
          if (blockers.length > 0) {
            const blocker = blockers.reduce((closest, curr) => 
               (curr._phys_x - x) < (closest._phys_x - x) ? curr : closest
            );
            if ((blocker._phys_x - x) < stopDist + 220) {
              targetSpeed = 0;
            }
          }
        } else {
          // Mid-track collision prevention (same track only)
          const blockers = activeTrains.filter(t => 
            t.train_no !== train.train_no && 
            t._assignedTrack === train._assignedTrack &&
            t._phys_x !== undefined && t._phys_x > x
          );
          if (blockers.length > 0) {
            const blocker = blockers.reduce((closest, curr) => 
               (curr._phys_x - x) < (closest._phys_x - x) ? curr : closest
            );
            if ((blocker._phys_x - x) < stopDist + 220) {
              targetSpeed = 0;
            }
          }
        }
        
        if (train.isHalted) {
          // Emergency stop immediately
          targetSpeed = 0;
          v = 0;
        } else if (!train.train_pass_through && newSimTime < (train._departureAt || 0) && x < 1500) {
          // Stopping train approaching platform (center = 1500m)
          const distToPlatform = 1500 - x;
          if (distToPlatform <= stopDist + 10) {
            targetSpeed = 0;
          }
        } else if (x >= 3000) {
          // Reached end of track
          departedTrainNos.push(train.train_no);
        }

        // If dwelling at platform
        if (!train.train_pass_through && newSimTime < (train._departureAt || 0) && Math.abs(x - 1500) < 5) {
          v = 0;
          x = 1500;
        } else {
          // Calculate acceleration
          let accel = 0;
          if (v < targetSpeed) {
            accel = a_trac;
          } else if (v > targetSpeed) {
            accel = a_brake;
          }

          // Resistance (simple drag)
          if (v > 0) accel -= (0.01 * v);

          // Update velocity and position
          v += accel * dt_seconds;
          if (v < 0) v = 0; // No reversing yet
          if (v > maxSpeed && targetSpeed === maxSpeed) v = maxSpeed;

          x += v * dt_seconds;
        }

        return { ...train, _phys_x: x, _phys_v: v };
      });

      // Commit physics state
      useSimStore.setState(prev => ({
        trains: { ...prev.trains, active: updatedActiveTrains }
      }));

      // Depart trains that hit 3000m
      for (const tNo of departedTrainNos) {
        useSimStore.getState().departTrain(tNo);
        const t = updatedActiveTrains.find(tr => tr.train_no === tNo);
        if (t) {
          useSimStore.getState().addEvent(`${t.train_no} departed — Track ${t._assignedTrack}`, 'info');
        }
      }

      // ── Spawn next train ───────────────────────────────────────────────────
      if (nextSpawnRef.current === null) {
        const interval = getSpawnInterval(rushLevel);
        nextSpawnRef.current = Math.floor(newSimTime) + interval.min +
          Math.floor(Math.random() * (interval.max - interval.min));
      }

      if (newSimTime >= nextSpawnRef.current) {
        const newTrain = generateTrain(rushLevel, newSimTime, 0);
        useSimStore.getState().enqueueTrains([newTrain]);
        const interval = getSpawnInterval(rushLevel);
        nextSpawnRef.current = Math.floor(newSimTime) + interval.min +
          Math.floor(Math.random() * (interval.max - interval.min));
      }

      // ── Heatmap snapshot ───────────────────────────────────────────────────
      const { trackOccupancy: occ2, station: stn2, conflicts, trains: simTrains } = useSimStore.getState();
      if (stn2) {
        const perTrack = {};
        Object.keys(stn2.tracks || {}).forEach(tid => {
          let score = occ2[tid] ? 0.3 : 0;
          const trackConflicts = conflicts.filter(c => !c.resolved && String(c.trackId) === tid);
          const activeOnTrack = simTrains.active.filter(t => String(t._assignedTrack) === tid).length;
          
          if (activeOnTrack >= 2) score = Math.max(score, 0.7);
          if (activeOnTrack >= 3) score = Math.max(score, 0.9);
          if (trackConflicts.length > 0) score = 1.0;
          
          perTrack[tid] = score;
        });
        useSimStore.getState().pushHeatmapSnapshot({
          simMin: Math.floor(newSimTime), perTrack,
        });
      }

      // ── Occupancy % metric ─────────────────────────────────────────────────
      const { trackOccupancy: occ3, station: stn3 } = useSimStore.getState();
      if (stn3) {
        const totalTracks  = Object.keys(stn3.tracks || {}).length;
        const activeTracks = Object.values(occ3).filter(Boolean).length;
        const occupancyPct = totalTracks > 0
          ? Math.round((activeTracks / totalTracks) * 100) : 0;
        useSimStore.setState(prev => ({
          metrics: { ...prev.metrics, occupancyPct },
        }));
      }
    };

    intervalRef.current = setInterval(tick, 200);
    return () => clearInterval(intervalRef.current);
  }, []);
}

// ─── Train arrival handler ────────────────────────────────────────────────────
// IMPORTANT: trackOccupancy is re-read fresh inside here, not passed in,
// so concurrent arrivals in separate ticks always see the latest state.
async function handleTrainArrival(
  train, station, _occupancySnapshot, trackTimeline,
  maintenanceTracks, disabledTracks, simTime, mlEndpoint
) {
  const { assignTrain, addEvent, addConflict, autoPauseOnConflict,
          setPaused, addToast, setMlStatus } = useSimStore.getState();

  addEvent(
    `${train.train_no} ${train.train_name} arrived (${train.train_type})`, 'info'
  );

  // Always read fresh occupancy so each train sees the latest assignments
  const freshOccupancy = useSimStore.getState().trackOccupancy;

  let result     = null;
  let source     = 'fallback';
  let confidence = 1.0;
  let responseMs = 0;

  // Try ML first
  try {
    const mlResult = await predictAssignment(
      station, train, freshOccupancy, mlEndpoint
    );
    result     = { track_id: mlResult.track_id, platform_id: mlResult.platform_id };
    source     = 'ml';
    confidence = mlResult.confidence;
    responseMs = mlResult.responseMs;
    setMlStatus('connected');
  } catch (_) {
    setMlStatus('fallback');
  }

  // Greedy fallback
  if (!result) {
    // Re-read occupancy again in case ML took a while
    const latestOccupancy = useSimStore.getState().trackOccupancy;
    result = greedyAssign(
      train,
      station.tracks,
      station.platforms,
      latestOccupancy,
      maintenanceTracks,
      disabledTracks,
      simTime,
      train._forcedTrackId    || null,
      train._forcedPlatformId || null,
      station,
      useSimStore.getState().trackTimeline
    );
    source     = 'fallback';
    confidence = 1.0;
    responseMs = 0;
  }

  if (!result) {
    addConflict({
      type:      'no_track',
      trainNo:   train.train_no,
      trainName: train.train_name,
      simTime,
      message: `No compatible track for ${train.train_no} at ${Math.floor(simTime)} min`,
    });
    addEvent(`CONFLICT: No compatible track for ${train.train_no}`, 'conflict');
    addToast(`${train.train_no} has no compatible track`, 'error');
    
    // Push the train 5 minutes into the future (based on current simTime) to avoid spamming
    useSimStore.setState(prev => ({
      trains: {
        ...prev.trains,
        queue: prev.trains.queue.map(t => 
          t.train_no === train.train_no ? { ...t, _arrivalSimMin: simTime + 5 } : t
        )
      }
    }));

    if (autoPauseOnConflict) setPaused(true);
    return;
  }

  // Check occupancy conflict using the freshest state
  const finalOccupancy = useSimStore.getState().trackOccupancy;
  const existingOcc    = finalOccupancy[String(result.track_id)];
  if (existingOcc && existingOcc.until > simTime) {
    addConflict({
      type:               'occupancy',
      trainNo:            train.train_no,
      conflictingTrainNo: existingOcc.trainNo,
      trackId:            result.track_id,
      simTime,
      message: `${train.train_no} & ${existingOcc.trainNo} both on Track ${result.track_id}`,
    });
    addEvent(
      `CONFLICT: ${train.train_no} & ${existingOcc.trainNo} on Track ${result.track_id}`,
      'conflict'
    );
    addToast(`Conflict on Track ${result.track_id}`, 'error');
    
    // Push the train 5 minutes into the future (based on current simTime) to avoid spamming
    useSimStore.setState(prev => ({
      trains: {
        ...prev.trains,
        queue: prev.trains.queue.map(t => 
          t.train_no === train.train_no ? { ...t, _arrivalSimMin: simTime + 5 } : t
        )
      }
    }));

    if (autoPauseOnConflict) setPaused(true);
    return;
  }

  assignTrain(
    train.train_no,
    result.track_id,
    result.platform_id,
    source,
    confidence,
    responseMs,
  );

  // Advanced Allocation Side-effects (Rules 8 & 28)
  if (result.method === 'advanced') {
    // 1. Update Track Timeline
    const finalTrackTimeline = useSimStore.getState().trackTimeline;
    const updatedTimeline = trainAllocationService.updateTrackTimeline(finalTrackTimeline, result.track_id, train);
    useSimStore.getState().setTrackTimeline(updatedTimeline);

    // 2. Set Signals to block converging tracks
    if (result.convergingTracks && result.convergingTracks.length > 0) {
       const signalsToBlock = trainAllocationService.getSignalsForTrainCrossing(station.tracks[result.track_id], station.line_crossings);
       useSimStore.getState().bulkSetSignals(signalsToBlock, 'red');
    }
  }

  if (source === 'fallback') {
    addToast(`${train.train_no} → Track ${result.track_id} [FALLBACK]`, 'warning');
  } else {
    addToast(`${train.train_no} → Track ${result.track_id} [ML ${responseMs}ms]`, 'success');
  }
}
