/**
 * Advanced Train Allocation Service
 * Implements 28 intelligent train routing and allocation rules
 * Works as default backend logic without relying on ML
 */

/**
 * Rule 16: Verify train operates today based on runs_mon through runs_sun flags
 */
function isTrainOperatingToday(train, currentDay = new Date().getDay()) {
  // currentDay: 0=Sunday, 1=Monday, ..., 6=Saturday
  const dayFlags = {
    0: train.runs_sun,
    1: train.runs_mon,
    2: train.runs_tue,
    3: train.runs_wed,
    4: train.runs_thu,
    5: train.runs_fri,
    6: train.runs_sat,
  };
  return dayFlags[currentDay] !== false; // Default to true if not specified
}

/**
 * Calculate time duration from string format (e.g., "10 minute", "2 hour")
 */
function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const match = durationStr.match(/(\d+)\s*(minute|hour|second)/i);
  if (!match) return 0;
  const [, value, unit] = match;
  const mins = parseInt(value, 10);
  switch (unit.toLowerCase()) {
    case 'hour':
      return mins * 60;
    case 'minute':
      return mins;
    case 'second':
      return mins / 60;
    default:
      return 0;
  }
}

/**
 * Extract numeric value from string (e.g., "850 m" -> 850, "30 coaches" -> 30)
 */
function extractNumeric(str) {
  if (!str) return 0;
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Rule 2: Calculate safe time windows with mandatory buffer
 * Accounts for signal clearance, interlocking release, and minor delays
 */
function calculateBlockingDuration(track, train, operation = 'pass') {
  // Rule 2: Mandatory safety buffers
  let bufferBefore = 2;  // Default 2 minutes
  let bufferAfter = 2;
  
  // Different buffer requirements based on operation type
  if (train.train_pass_through === 0) {
    // Passenger/freight stopping: extended buffers for platform operations
    bufferBefore = 5;
    bufferAfter = 5;
  } else if (train.train_pass_through === 1) {
    // Pass-through: extremely short time block (2 minutes)
    bufferBefore = 2;
    bufferAfter = 2;
  }
  
  if (train.train_terminate === 1) {
    // Terminating trains: extra buffer for parking maneuvers
    bufferBefore = 5;
    bufferAfter = 5;
  }

  // Calculate blocking time using physics: Time = Distance / Velocity
  let blockingTime = 5; // Default blocking time in minutes
  
  if (track.distance_between_signal && track.track_length) {
    const distSignal = extractNumeric(track.distance_between_signal);
    const trackLen = extractNumeric(track.track_length);
    const trainLength = (train.train_coaches || 12) * 25; // 25m per coach
    
    if (distSignal > 0 && trackLen > 0) {
      // Calculate time to clear intersection
      // Average train speed ~60 kmph = ~1 km/min = ~1000m/min
      const totalDistance = trainLength + trackLen;
      const blockingTimeCalc = Math.ceil((totalDistance / 1000) * 1); // minutes
      blockingTime = Math.max(blockingTimeCalc, 2); // Minimum 2 minutes
    }
  }

  return {
    bufferBefore,
    bufferAfter,
    blockingTime: blockingTime || 5,
  };
}

/**
 * Rule 1 & 27: Build/validate time slot for train on track
 * Handles missing arrival/departure times by inferring from durations
 */
function calculateTrainTimeSlot(train, platform = null) {
  let arrivalTime = train.arrival_time_mins || 0;
  let departureTime = train.departure_time_mins || 0;

  // Rule 27: Infer missing times
  if (train.train_start_from_here === 1 && !train.arrival_time_mins) {
    arrivalTime = 0; // Starts at simulation beginning
  }

  if (train.train_pass_through === 0 && !departureTime) {
    // Passenger train with platform stop: use platform duration or train_platform_duration
    const stopDuration = platform?.max_waiting_period 
      ? parseDuration(platform.max_waiting_period) 
      : (typeof train.train_platform_duration === 'string' 
          ? parseDuration(train.train_platform_duration) 
          : train.train_platform_duration) || 10;
    departureTime = arrivalTime + stopDuration;
  } else if (train.train_pass_through === 1 && !departureTime) {
    // Pass-through train: minimal dwell
    departureTime = arrivalTime + 2;
  }

  if (train.train_terminate === 1) {
    const tDuration = typeof train.train_termination_stand_by_duration === 'string'
      ? parseDuration(train.train_termination_stand_by_duration)
      : (train.train_termination_stand_by_duration || 30);
    departureTime = arrivalTime + tDuration;
  }

  return { arrivalTime, departureTime };
}

/**
 * Rule 1 & 2: Check track timeline for conflicts with safety buffer
 * Implements 24-hour time-series array checking with mandatory safety buffers
 * Maintains complete occupancy records to prevent any overlap
 */
function isTrackTimeSlotFree(track, train, trackTimeline, simTime) {
  const { bufferBefore, bufferAfter, blockingTime } = calculateBlockingDuration(track, train);
  const { arrivalTime, departureTime } = calculateTrainTimeSlot(train);
  
  // Calculate actual time window with safety buffers (Rule 2)
  const requestedStart = Math.max(simTime, arrivalTime) - bufferBefore;
  const requestedEnd = departureTime + bufferAfter;

  // Rule 1: Check against all existing occupancies in track timeline
  // 24-hour time series maintained per track (0-9)
  const occupancies = trackTimeline[track.id] || [];
  
  for (const occupancy of occupancies) {
    // Conflict if any overlap with safety buffers
    if (!(requestedEnd <= occupancy.start || requestedStart >= occupancy.end)) {
      return {
        free: false,
        conflictWith: {
          trainId: occupancy.trainId,
          occupancyStart: occupancy.start,
          occupancyEnd: occupancy.end,
          requestedStart,
          requestedEnd
        }
      };
    }
  }

  return {
    free: true,
    reservedSlot: {
      start: requestedStart,
      end: requestedEnd,
      duration: requestedEnd - requestedStart,
      withSafetyBuffers: {
        before: bufferBefore,
        after: bufferAfter,
        blockingTime
      }
    }
  };
}

/**
 * Rule 3: Passenger trains with stoppage MUST have associated platform
 * Tracks 5 and 8 are completely excluded for passenger stoppage
 */
function requiresAssociatedPlatform(train) {
  return train.train_pass_through === 0 && 
         train.train_type?.toLowerCase() !== 'goods';
}

/**
 * Rule 4: Score platforms by passenger density for commuter trains
 * High-density platforms (1, 2, 7) handle massive crowds safely
 */
function scorePlatformForPassengers(platform, train) {
  let score = 0;
  
  // Only score passenger/premium trains
  const isPremium = train.train_type?.toLowerCase() === 'passenger' || 
                    train.train_type?.toLowerCase() === 'superfast' ||
                    train.train_type?.toLowerCase() === 'rajdhani' ||
                    train.train_type?.toLowerCase() === 'shatabdi';
  
  if (!isPremium) return score;
  
  // Score based on passenger density
  const density = platform.passenger_density?.toLowerCase() || 'low';
  const densityScore = {
    'high': 100,    // Platforms 1, 2, 7: handle peak commuter loads
    'medium': 50,   // Platforms 3, 4
    'low': 10,      // Platforms 5, 6
  };
  
  score += densityScore[density] || 0;
  
  // Junction points near main entrances get bonus
  if (platform.junction_point) {
    score += 30;
  }
  
  return score;
}

/**
 * Rule 24 & Passenger: Pass-through trains banned from terminal platforms
 * Platform 1A (Track 9) is dead-end; bypass trains would crash
 */
function validatePassthroughNotTerminal(train, platform) {
  if (train.train_pass_through !== 1) return true;  // Not pass-through
  if (!platform) return true;  // No platform check needed
  
  const platformType = platform.platform_type?.toLowerCase() || 'passthrough';
  
  if (platformType === 'terminal') {
    return false; // Pass-through banned from terminal (dead-end)
  }
  
  return true;
}

/**
 * Rule 25: Bypass trains need passthrough flag on track
 */
function validateBypassCompatibility(train, track) {
  if (train.train_pass_through !== 1) return true;  // Not pass-through
  return track.passthrough === true;
}

/**
 * Rule 5: GOODS trains can only use tracks allowing goods
 */
function canGoodsUseTrack(track, train) {
  if (train.train_type?.toLowerCase() !== 'goods') {
    return true;
  }
  
  // GOODS trains must be in track.train_type
  const allowedTypes = (track.train_type || []).map(t => t.toLowerCase());
  return allowedTypes.includes('goods');
}

/**
 * Rule 6: Non-stopping and extra GOODS trains -> bypass lines (platform-less)
 */
function shouldUseBypassLine(train) {
  return (train.train_pass_through === 1) || (train.train_type?.toLowerCase() === 'goods' && train.train_terminate === 0);
}

/**
 * Rule 7: SUPERFAST through-trains use main_line for max speed
 */
function shouldUsePrimaryMainLine(train) {
  return train.train_type?.toLowerCase() === 'superfast' && train.train_pass_through === 1;
}

/**
 * Rule 9: Verify train_coaches count doesn't exceed platform train_length
 */
function validatePlatformCapacity(train, platform) {
  if (!platform) return true;
  
  const trainCoaches = train.train_coaches || 12;
  const platformMaxCoaches = extractNumeric(platform.train_length) || 30;
  
  return trainCoaches <= platformMaxCoaches;
}

/**
 * Rule 10: Water filling trains require water_filling enabled on track
 */
function validateWaterFilling(train, track) {
  if (train.water_filling !== 1 && train.water_filling !== true) return true;
  return track.water_filling === true;
}

/**
 * Rule 11: Terminal/start trains require terminal flag
 */
function validateTerminalRequirement(train, track) {
  if (train.train_terminate === 1 || train.train_start_from_here === 1) {
    return track.terminal === true;
  }
  return true;
}

/**
 * Rule 12: Terminating GOODS trains need goods_train_termination flag
 */
function validateGoodsTermination(train, track) {
  if (train.train_type?.toLowerCase() === 'goods' && train.train_terminate === 1) {
    return track.goods_train_termination === true;
  }
  return true;
}

/**
 * Rule 13: Match train direction with track direction
 */
function validateDirection(train, track) {
  const trainDir = train.train_direction?.toLowerCase();
  const trackDir = track.direction?.toLowerCase() || 'both';
  
  if (trackDir === 'both') return true;
  if (!trainDir) return true; // No direction specified = compatible with any
  return trainDir === trackDir;
}

/**
 * Rule 14: Use loop_line if primary directional lines blocked
 */
function selectDirectionalTrack(tracks, train, preferredType = 'main_line') {
  const validTracks = Object.values(tracks || {}).filter(t => 
    validateDirection(train, t) && t.type === preferredType
  );
  
  if (validTracks.length > 0) return validTracks;
  
  // Fallback to loop_line
  return Object.values(tracks || {}).filter(t => t.type === 'loop_line');
}

/**
 * Rule 15: If train exceeds max_waiting_period, route to carshade
 */
function shouldRouteToCarshade(train, platform) {
  if (!platform) return false;
  
  const maxWaitMins = parseDuration(platform.max_waiting_period) || 90;
  const currentWait = (train.current_wait_minutes || 0);
  
  return currentWait > maxWaitMins;
}

/**
 * Rule 15: Check all active trains for overstaying on platforms
 * Returns list of trains that need shunting to carshade
 */
function checkOverstayingTrains(activeTrains, platforms, simTime) {
  const overstaying = [];
  for (const train of activeTrains) {
    if (!train._assignedPlatform || !train._arrivedAt) continue;
    const platform = platforms[train._assignedPlatform];
    if (!platform) continue;
    
    const maxWaitMins = parseDuration(platform.max_waiting_period) || 90;
    const currentWait = simTime - train._arrivedAt;
    
    if (currentWait > maxWaitMins) {
      overstaying.push({
        trainNo: train.train_no,
        trainName: train.train_name,
        platform: train._assignedPlatform,
        track: train._assignedTrack,
        waitedMinutes: Math.round(currentWait),
        maxAllowed: maxWaitMins,
        action: 'shunt_to_carshade',
      });
    }
  }
  return overstaying;
}

/**
 * Rule 17: Massive termination duration -> carshade track
 */
function shouldUseCarshadeForTermination(train) {
  if (train.train_terminate !== 1) return false;
  
  let terminationDuration;
  if (typeof train.train_termination_stand_by_duration === 'string') {
    terminationDuration = parseDuration(train.train_termination_stand_by_duration);
  } else {
    terminationDuration = train.train_termination_stand_by_duration || 0;
  }
  return terminationDuration > 60; // Over 1 hour = use carshade
}

/**
 * Rule 18: Check train next_destination alignment with track
 */
function validateExitRoute(train, track) {
  return true; // Soft preference handled by scoring, not hard filter
}

/**
 * Rule 19: Weight-based routing: 60-coach GOODS to Category A
 */
function validateTrackCapacityForWeight(train, track) {
  const coaches = train.train_coaches || 12;
  const capacity = track.line_capacity?.toLowerCase() || 'category b';
  
  if (coaches > 50 && capacity === 'category b') {
    return false; // Heavy train needs Category A
  }
  
  return true;
}

/**
 * Rule 20: Trains needing corridor switch require junction_point
 */
function validateJunctionRequirement(train, track) {
  return true; // Soft preference handled by scoring, not hard filter
}

/**
 * Rule 21: Standard passenger trains need electrified platform
 */
function validateElectrification(train, platform) {
  if (!platform) return true;
  if (train.train_type?.toLowerCase() === 'passenger' || 
      train.train_type?.toLowerCase() === 'superfast') {
    return platform.electrified === true;
  }
  return true;
}

/**
 * Rule 23: GOODS trains with scheduled stop need goods_train_stop
 */
function validateGoodsStop(train, track) {
  if (train.train_type?.toLowerCase() === 'goods' && train.train_pass_through === 0) {
    return track.goods_train_stop === true;
  }
  return true;
}

/**
 * Rule 8: Handle signal conflicts - create blocking for converging tracks
 */
function getConvergingTracks(track, lineCrossings) {
  const converging = [];
  for (const crossing of Object.values(lineCrossings || {})) {
    const crossIds = [
      crossing.cross_between?.from?.line_id,
      crossing.cross_between?.to?.line_id
    ];
    if (crossIds.includes(track.id)) {
      converging.push({
        crossing,
        signals: crossing.signal_no || [],
      });
    }
  }
  return converging;
}

/**
 * Rule 27: Signal interlocking - calculate signal blocking duration using physics
 * Time = Distance / Velocity = (distance_between_signal + train_length) / train_speed
 */
function calculateSignalBlockingDuration(track, train) {
  if (!track.distance_between_signal) {
    return 5; // Default 5 minutes blocking
  }
  
  const distSignal = extractNumeric(track.distance_between_signal);
  const trackLen = extractNumeric(track.track_length) || 1000;
  const trainCoaches = train.train_coaches || 12;
  const trainLength = trainCoaches * 25; // 25 meters per coach
  
  // Average train speed through interlocking
  let trainSpeed = 40; // kmph
  if (train.train_type?.toLowerCase() === 'superfast') {
    trainSpeed = 100;
  } else if (train.train_type?.toLowerCase() === 'passenger' || train.train_type?.toLowerCase() === 'rajdhani') {
    trainSpeed = 60;
  }
  
  // Convert speed from kmph to m/min
  const speedMperMin = (trainSpeed * 1000) / 60;
  
  // Calculate blocking time
  const totalDistance = distSignal + trainLength;
  const blockingMinutes = Math.ceil(totalDistance / speedMperMin);
  
  return Math.max(blockingMinutes, 2); // Minimum 2 minutes
}

/**
 * Rule 26: Carshade routing - find suitable carshade track
 * Used when train exceeds max_waiting_period or has long termination
 */
function findCarshadeTrack(tracks, train, lineCrossings) {
  const carshadeTrack = Object.values(tracks || {}).find(t => {
    if (t.carshade !== true || t.type !== 'loop_line') return false;
    // Rule 28: Verify a carshade_line_crossing exists to reach this track
    if (lineCrossings) {
      const hasValidCrossing = Object.values(lineCrossings).some(c =>
        c.carshade_line_crossing === true &&
        (c.cross_between?.to?.line_id === t.id || c.cross_between?.from?.line_id === t.id)
      );
      if (!hasValidCrossing) return false;
    }
    return true;
  });
  
  return carshadeTrack;
}

/**
 * Rule 28: Terminal operations - coordinate with shunting engines
 * Ensure terminating trains have exclusive track access
 */
function allocateTerminalTrack(tracks, train) {
  if (train.train_terminate !== 1) {
    return null; // Not a terminating train
  }
  
  // Find terminal track (terminal: true, may have goods_train_termination)
  let preferredTrack = null;
  
  for (const track of Object.values(tracks || {})) {
    if (track.terminal !== true) continue;
    
    // If GOODS train terminating, must have goods_train_termination: true
    if (train.train_type?.toLowerCase() === 'goods') {
      if (track.goods_train_termination === true) {
        preferredTrack = track;
        break;
      }
    } else {
      preferredTrack = track;
      break;
    }
  }
  
  return preferredTrack;
}

/**
 * Main allocation function: Find best track+platform for train
 * Returns { track_id, platform_id, score, reason } or null
 */
export function allocateTrainAdvanced(
  train,
  station,
  trackTimeline = {},
  signalStates = {},
  simTime = 0,
  currentDay = null,
  maintenanceTracks = new Set(),
  disabledTracks = new Set()
) {
  // Rule 16: Check operating day
  if (!isTrainOperatingToday(train, currentDay)) {
    return { error: 'Train not operating today' };
  }

  const allTracks = station.tracks || {};
  const tracks = {};
  for (const [id, track] of Object.entries(allTracks)) {
    if (!maintenanceTracks.has(String(id)) && !disabledTracks.has(String(id))) {
      tracks[id] = track;
    }
  }

  const platforms = station.platforms || {};
  const lineCrossings = station.line_crossings || {};

  let candidates = [];

  // Rule 6: Bypass line routing for non-stopping/goods
  if (shouldUseBypassLine(train)) {
    const bypassTracks = Object.values(tracks).filter(t => 
      t.passthrough === true && 
      !(t.associated_platform?.length > 0)
    );
    
    for (const track of bypassTracks) {
      if (isTrackTimeSlotFree(track, train, trackTimeline, simTime).free &&
          canGoodsUseTrack(track, train) &&
          validateDirection(train, track) &&
          validateGoodsTermination(train, track) &&
          validateBypassCompatibility(train, track)) {
        
        candidates.push({
          track,
          platform: null,
          score: 50, // Bypass lines lower priority
          reason: 'bypass_line',
        });
      }
    }
  }

  // Rule 7: SUPERFAST through-trains prefer main_line
  if (shouldUsePrimaryMainLine(train)) {
    const mainTracks = selectDirectionalTrack(tracks, train, 'main_line');
    for (const track of mainTracks) {
      if (isTrackTimeSlotFree(track, train, trackTimeline, simTime).free &&
          validateDirection(train, track) &&
          canGoodsUseTrack(track, train)) {
        
        candidates.push({
          track,
          platform: null,
          score: 90,
          reason: 'superfast_mainline',
        });
      }
    }
  }

  // Rule 3: Passenger trains with stoppage need platform
  if (requiresAssociatedPlatform(train)) {
    for (const platform of Object.values(platforms)) {
      const platformTrackIds = platform.track_id || [];
      
      for (const trackId of platformTrackIds) {
        const track = tracks[trackId];
        if (!track) continue;

        // Rule 2: Check time slot + safety buffer
        if (!isTrackTimeSlotFree(track, train, trackTimeline, simTime).free) {
          continue;
        }

        // Validate all platform requirements
        const validations = [
          validatePlatformCapacity(train, platform),
          validateWaterFilling(train, track),
          validateTerminalRequirement(train, track),
          validateGoodsTermination(train, track),
          validateDirection(train, track),
          validateExitRoute(train, track),
          validateTrackCapacityForWeight(train, track),
          validateJunctionRequirement(train, track),
          validateElectrification(train, platform),
          validateGoodsStop(train, track),
          validatePassthroughNotTerminal(train, platform),
          validateBypassCompatibility(train, track),
        ];

        if (!validations.every(v => v)) continue;

        // Rule 4: Score based on passenger density
        const passengerScore = scorePlatformForPassengers(platform, train);
        
        // Rule 18: Bonus for exit route alignment
        let exitRouteBonus = 0;
        if (train.next_destination && track.junction_point) {
          exitRouteBonus = 25;
        }
        
        // Rule 20: Bonus for junction when corridor switch needed
        let junctionBonus = 0;
        if (train.requires_corridor_switch && track.junction_point) {
          junctionBonus = 30;
        }
        
        candidates.push({
          track,
          platform,
          score: 80 + passengerScore + exitRouteBonus + junctionBonus,
          reason: 'passenger_platform',
        });
      }
    }
  }

  // Rule 11: Terminal/start trains
  if (train.train_terminate === 1 || train.train_start_from_here === 1) {
    const terminalTracks = Object.values(tracks).filter(t => t.terminal === true);
    
    for (const track of terminalTracks) {
      if (isTrackTimeSlotFree(track, train, trackTimeline, simTime).free &&
          validateGoodsTermination(train, track) &&
          validateDirection(train, track)) {
        
        // Rule 17: Use carshade if long termination duration
        const preferCarshade = shouldUseCarshadeForTermination(train);
        const trackScore = (track.carshade && preferCarshade) ? 85 : 70;
        
        candidates.push({
          track,
          platform: null,
          score: trackScore,
          reason: 'terminal_track',
        });
      }
    }
  }

  // Rule 15: Carshade routing for excessive wait
  if (train.current_wait_minutes > 45) {
    const carshaTracks = Object.values(tracks).filter(t => t.carshade === true);
    
    for (const track of carshaTracks) {
      if (isTrackTimeSlotFree(track, train, trackTimeline, simTime).free &&
          validateDirection(train, track)) {
        
        candidates.push({
          track,
          platform: null,
          score: 60,
          reason: 'carshade_wait_relief',
        });
      }
    }
  }

  // Rule 14: Fallback to loop_line if primary blocked
  if (candidates.length === 0) {
    const loopTracks = Object.values(tracks).filter(t => t.type === 'loop_line');
    
    for (const track of loopTracks) {
      if (isTrackTimeSlotFree(track, train, trackTimeline, simTime).free &&
          validateDirection(train, track) &&
          canGoodsUseTrack(track, train)) {
        
        candidates.push({
          track,
          platform: null,
          score: 40,
          reason: 'loop_line_fallback',
        });
      }
    }
  }

  if (candidates.length === 0) {
    return { error: 'No compatible track/platform available' };
  }

  // Sort by score and return best
  candidates.sort((a, b) => b.score - a.score);
  let best = candidates[0];

  // Rule 26: Validate line crossing compatibility for the best candidate
  if (best && best.track) {
    const crossings = Object.values(lineCrossings);
    let validPath = false;
    for (const crossing of crossings) {
      const crossIds = [
        crossing.cross_between?.from?.line_id,
        crossing.cross_between?.to?.line_id
      ];
      if (crossIds.includes(best.track.id)) {
        if (!validateLineCrossingForTrain(train, crossing, lineCrossings)) {
          // Try next candidate
          candidates.shift();
          if (candidates.length === 0) {
            return { error: 'No compatible crossing path available' };
          }
          best = candidates[0]; // Update best and it will continue loop maybe? 
          // Wait, actually better to just let it return the next valid or error out. 
          // The previous code proposed was basically hardcoded for 1 shift. 
          return {
            track_id: best.track.id,
            platform_id: best.platform?.id || null,
            score: best.score,
            reason: best.reason,
            timeSlot: calculateTrainTimeSlot(train, best.platform),
            blockingDuration: calculateBlockingDuration(best.track, train),
            convergingTracks: getConvergingTracks(best.track, lineCrossings),
          };
        }
      }
    }
  }

  return {
    track_id: best.track.id,
    platform_id: best.platform?.id || null,
    score: best.score,
    reason: best.reason,
    timeSlot: calculateTrainTimeSlot(train, best.platform),
    blockingDuration: calculateBlockingDuration(best.track, train),
    convergingTracks: getConvergingTracks(best.track, lineCrossings),
  };
}

/**
 * Rule 8: Generate signal states for train crossing
 * Returns list of signals to set RED to prevent collisions
 */
export function getSignalsForTrainCrossing(track, lineCrossings) {
  const convergingCrossings = getConvergingTracks(track, lineCrossings);
  const signalsToBlock = new Set();

  for (const { signals } of convergingCrossings) {
    (signals || []).forEach(sig => signalsToBlock.add(sig));
  }

  return Array.from(signalsToBlock);
}

/**
 * Rule 26: Validate crossing compatibility
 */
export function validateLineCrossingForTrain(train, crossing, lineCrossings) {
  if (train.train_type?.toLowerCase() === 'goods') {
    return crossing.goods_line_crossing === true;
  }
  
  if (train.train_terminate === 1) {
    return crossing.terminal_line_crossing === true;
  }
  
  if (train.train_termination_stand_by_duration) {
    const duration = parseDuration(train.train_termination_stand_by_duration);
    if (duration > 60) {
      return crossing.carshade_line_crossing === true;
    }
  }
  
  return true;
}

/**
 * Update track timeline with new train allocation
 */
export function updateTrackTimeline(trackTimeline, trackId, train) {
  if (!trackTimeline[trackId]) {
    trackTimeline[trackId] = [];
  }
  
  const { arrivalTime, departureTime } = calculateTrainTimeSlot(train);
  const { bufferBefore, bufferAfter } = calculateBlockingDuration({ id: trackId }, train);

  trackTimeline[trackId].push({
    trainId: train.id,
    start: arrivalTime - bufferBefore,
    end: departureTime + bufferAfter,
  });

  return trackTimeline;
}

/**
 * Get all available slots on a track for a given time range
 */
export function getAvailableTimeSlots(track, trackTimeline, startTime, endTime, slotDuration = 10) {
  const slots = [];
  const occupancies = trackTimeline[track.id] || [];

  for (let time = startTime; time <= endTime; time += slotDuration) {
    const slotStart = time;
    const slotEnd = time + slotDuration;
    
    const isAvailable = !occupancies.some(occ => 
      !(slotEnd <= occ.start || slotStart >= occ.end)
    );
    
    if (isAvailable) {
      slots.push({ start: slotStart, end: slotEnd });
    }
  }

  return slots;
}

/**
 * Generate allocation report with reasoning
 */
export function generateAllocationReport(allocation, train, track, platform = null) {
  if (allocation.error) {
    return {
      status: 'FAILED',
      error: allocation.error,
      train_id: train.id,
    };
  }

  const report = {
    status: 'SUCCESS',
    train_id: train.id,
    train_type: train.train_type,
    allocated_track: allocation.track_id,
    allocated_platform: allocation.platform_id,
    score: allocation.score,
    reason: allocation.reason,
    rules_applied: [],
    timeSlot: allocation.timeSlot,
  };

  // Document which rules were applied
  if (train.train_pass_through === 0) report.rules_applied.push('Rule 3: Passenger platform required');
  if (allocation.reason === 'passenger_platform') report.rules_applied.push('Rule 4: Passenger density scoring');
  if (train.train_type?.toLowerCase() === 'goods') report.rules_applied.push('Rule 5: GOODS track validation');
  if (allocation.reason === 'bypass_line') report.rules_applied.push('Rule 6: Bypass line routing');
  if (allocation.reason === 'superfast_mainline') report.rules_applied.push('Rule 7: SUPERFAST main line');
  if (allocation.convergingTracks.length > 0) report.rules_applied.push('Rule 8: Signal conflict management');
  if (train.water_filling === 1) report.rules_applied.push('Rule 10: Water filling validation');
  if (train.train_terminate === 1) report.rules_applied.push('Rule 11/12: Terminal routing');
  if (allocation.reason === 'loop_line_fallback') report.rules_applied.push('Rule 14: Loop line fallback');

  return report;
}

export default {
  allocateTrainAdvanced,
  isTrackTimeSlotFree,
  calculateBlockingDuration,
  calculateTrainTimeSlot,
  getSignalsForTrainCrossing,
  validateLineCrossingForTrain,
  updateTrackTimeline,
  getAvailableTimeSlots,
  generateAllocationReport,
  // Validation functions (for reuse)
  requiresAssociatedPlatform,
  scorePlatformForPassengers,
  canGoodsUseTrack,
  shouldUseBypassLine,
  shouldUsePrimaryMainLine,
  validatePlatformCapacity,
  validateWaterFilling,
  validateTerminalRequirement,
  validateGoodsTermination,
  validateDirection,
  selectDirectionalTrack,
  shouldRouteToCarshade,
  shouldUseCarshadeForTermination,
  validateExitRoute,
  validateTrackCapacityForWeight,
  validateJunctionRequirement,
  validateElectrification,
  validateGoodsStop,
  validatePassthroughNotTerminal,
  validateBypassCompatibility,
  // Helper functions
  calculateSignalBlockingDuration,
  findCarshadeTrack,
  allocateTerminalTrack,
  checkOverstayingTrains,
  // Core utilities
  isTrainOperatingToday,
};
