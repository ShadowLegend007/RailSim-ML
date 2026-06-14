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
  const intervalRef            = useRef(null);
  const nextSpawnRef           = useRef(null);
  const lastRushRef            = useRef(null);
  const lastSaveRef            = useRef(Date.now());
  const lastTickRef            = useRef(Date.now());
  const dataSnapshotRef        = useRef([]);
  const isProcessingArrivalRef = useRef(false);
  const SESSION_KEY            = 'railsim_session';

  useEffect(() => {
    const tick = async () => {
      const s = useSimStore.getState();

      // Simulation requires manual start now

      if (s.paused || !s.simStarted || !s.station) return;

      // Determine real elapsed time since last tick
      const nowMs = Date.now();
      let elapsedSecs = (nowMs - lastTickRef.current) / 1000;
      if (!lastTickRef.current) elapsedSecs = 0.2;
      lastTickRef.current = nowMs;

      // Cap at 1.0 second to prevent massive physics jumps after waking from sleep
      const safeElapsedSecs = Math.min(elapsedSecs, 1.0);

      // s.speed is 1, 10, 30, 60 (real-time multiplier)
      // At 1x speed, 1 real second = 1 sim minute. 
      // 200ms tick = 0.2 real seconds = 0.2 sim minutes
      // Applied 0.5x multiplier to slow down overall simulation pace
      const deltaSimMins = safeElapsedSecs * s.speed * 0.5;
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

      // ── Process at most ONE pre-allocation or arrival per tick ─────────────
      // Re-read fresh state after each store mutation.
      if (!isProcessingArrivalRef.current) {
        const freshState = useSimStore.getState();

        // 1. Physical Arrival: If a pre-assigned train's time has come, activate it immediately.
        const readyToArrive = freshState.trains.queue
          .find(t => t._preAssignedTrack && t._arrivalSimMin <= newSimTime);

        if (readyToArrive) {
          useSimStore.getState().activatePreAssignedTrain(readyToArrive.train_no);
        } else {
          // 2. Pre-allocation: Look ahead 60 minutes for unassigned trains.
          const firstArriving = freshState.trains.queue
            .filter(t => !t._preAssignedTrack && t._arrivalSimMin <= newSimTime + 60)
            .sort((a, b) => (a._arrivalSimMin - b._arrivalSimMin) || (a.isSpecial ? -1 : 1))[0];

          if (firstArriving) {
            const { station, trackOccupancy, trackTimeline, maintenanceTracks,
                    disabledTracks, mlEndpoint } = useSimStore.getState();
            isProcessingArrivalRef.current = true;
            // Run asynchronously so physics engine doesn't block on ML requests
            handleTrainArrival(
              firstArriving, station, trackOccupancy, trackTimeline,
              maintenanceTracks, disabledTracks, newSimTime, mlEndpoint
            ).finally(() => {
              isProcessingArrivalRef.current = false;
            });
          }
        }
      }

      // ── Rule 15: Overstay monitoring ───────────────────────────────────────
      if (useSimStore.getState().station && useSimStore.getState().station.platforms && Math.floor(newSimTime) > Math.floor(s.simTime)) {
        const overstays = trainAllocationService.checkOverstayingTrains(useSimStore.getState().trains.active, useSimStore.getState().station.platforms, newSimTime);
        if (overstays.length > 0) {
           useSimStore.getState().addOverstayAlerts(overstays);
           overstays.forEach(o => {
             useSimStore.getState().addEvent(`ALERT: ${o.trainNo} overstayed at platform ${o.platform} for ${o.waitedMinutes}m`, 'warning');
             useSimStore.getState().addToast(`Overstay: ${o.trainNo} at ${o.platform}`, 'warning');
           });
        }
      }

      // Physics Engine (Kinematics Step)
      // dt_seconds is the amount of physical seconds that passed in this tick
      // Since deltaSimMins is in minutes, physical seconds is deltaSimMins * 60
      const total_dt_seconds = deltaSimMins * 60;
      const numSteps = Math.max(1, Math.ceil(total_dt_seconds / 0.5));
      const dt_seconds = total_dt_seconds / numSteps;

      let currentTrains = useSimStore.getState().trains.active;
      let departedTrainNosSet = new Set();

      for (let step = 0; step < numSteps; step++) {
        currentTrains = currentTrains.map(train => {
          if (departedTrainNosSet.has(train.train_no)) return train;

          let x = train._phys_x;
          if (x === undefined) {
             x = 0;
             // Find if other trains are queued up at entry
             const entryTrains = currentTrains.filter(t => t.train_no !== train.train_no && (t._phys_x || 0) < 200);
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

          // Visual enhancement: slow down passing trains near the station so the user can see them!
          if (train.train_pass_through && x > 1000 && x < 2000) {
            targetSpeed = Math.min(targetSpeed, 15); // ~54 km/h when passing platform
          }
          
          // Braking logic: distance required to stop from current velocity
          const stopDist = (v * v) / (2 * Math.abs(a_brake));

          // Rule: Junction collision prevention
          if (x <= 200) {
            const blockers = currentTrains.filter(t => 
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
          } else if (x >= 2800 && x < 3500) {
            const blockers = currentTrains.filter(t => 
              t.train_no !== train.train_no && 
              t._phys_x !== undefined && t._phys_x >= 2800 && t._phys_x <= 3500 &&
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
            const blockers = currentTrains.filter(t => 
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
          } else if (!train.train_pass_through && newSimTime < (train._departureAt || 0) && x < 1550) {
            // Stopping train approaching platform (center = 1500m)
            const distToPlatform = Math.max(0, 1500 - x);
            if (distToPlatform <= stopDist + 30) {
              targetSpeed = 0;
            }
          } else if (x >= 3500) {
            // Reached end of track (2km from station)
            departedTrainNosSet.add(train.train_no);
          }

          // If dwelling at platform (robust clamping to catch overshoots at high speed)
          if (!train.train_pass_through && newSimTime < (train._departureAt || 0) && x >= 1450 && x <= 1550 && v < 8) {
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
      }

      const updatedActiveTrains = currentTrains;
      const departedTrainNos = Array.from(departedTrainNosSet);

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
        // Limit queue size to prevent infinite conflict accumulation when station is overloaded
        const currentQueue = useSimStore.getState().trains.queue;
        if (currentQueue.length < 20) {
          const newTrain = generateTrain(rushLevel, newSimTime, 0);
          useSimStore.getState().enqueueTrains([newTrain]);
        }
        
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

    // Save session synchronously if user reloads or closes tab
    const handleBeforeUnload = () => {
      const st = useSimStore.getState();
      if (!st.simStarted) return;
      try {
        const prev = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          ...prev,
          simTime: st.simTime,
          rushLevel: st.rushLevel,
          simStarted: st.simStarted,
          fullTrains: st.trains,
          trackOccupancy: st.trackOccupancy,
          trackTimeline: st.trackTimeline
        }));
      } catch (e) {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    intervalRef.current = setInterval(tick, 200);
    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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
    
    // Validate ML result
    let isValid = true;
    const tid = String(mlResult.track_id);
    const existingOcc = freshOccupancy[tid];
    if (existingOcc && existingOcc.until > Math.max(simTime, train._arrivalSimMin || simTime)) {
      isValid = false; // Occupancy conflict
    }
    if (!train.train_pass_through && !mlResult.platform_id) {
      isValid = false; // Dwelling train MUST have a platform
    }
    if (maintenanceTracks.has(tid) || disabledTracks.has(tid)) {
      isValid = false; // Maintenance/Disabled track
    }

    if (isValid) {
      result     = { track_id: mlResult.track_id, platform_id: mlResult.platform_id };
      source     = 'ml';
      confidence = mlResult.confidence;
      responseMs = mlResult.responseMs;
    }
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
    const isNew = !useSimStore.getState().conflicts.some(c => 
      !c.resolved && c.trainNo === train.train_no && c.type === 'no_track'
    );

    addConflict({
      type:      'no_track',
      trainNo:   train.train_no,
      trainName: train.train_name,
      simTime,
      message: `No compatible track for ${train.train_no} at ${Math.floor(simTime)} min`,
    });
    
    if (isNew) {
      addEvent(`CONFLICT: No compatible track for ${train.train_no}`, 'conflict');
      addToast(`${train.train_no} has no compatible track`, 'error');
    }
    
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
  if (existingOcc && existingOcc.until > Math.max(simTime, train._arrivalSimMin || simTime)) {
    const isNew = !useSimStore.getState().conflicts.some(c => 
      !c.resolved && c.trainNo === train.train_no && c.type === 'occupancy'
    );

    addConflict({
      type:               'occupancy',
      trainNo:            train.train_no,
      conflictingTrainNo: existingOcc.trainNo,
      trackId:            result.track_id,
      simTime,
      message: `${train.train_no} & ${existingOcc.trainNo} both on Track ${result.track_id}`,
    });
    
    if (isNew) {
      addEvent(
        `CONFLICT: ${train.train_no} & ${existingOcc.trainNo} on Track ${result.track_id}`,
        'conflict'
      );
      addToast(`Conflict on Track ${result.track_id}`, 'error');
    }
    
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

  // If train is in the future, pre-assign it. If it's already here, assign it directly.
  const isFuture = train._arrivalSimMin > simTime;

  if (isFuture) {
    useSimStore.getState().preAssignTrain(
      train.train_no,
      result.track_id,
      result.platform_id,
      source,
      confidence,
      responseMs
    );
  } else {
    assignTrain(
      train.train_no,
      result.track_id,
      result.platform_id,
      source,
      confidence,
      responseMs
    );
  }

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
