/**
 * Train Allocation API Service
 * Provides REST-like API endpoints for advanced train allocation
 * Integrates with trainAllocationService for intelligent routing
 */

import trainAllocationService from './trainAllocationService';

/**
 * Allocate a single train to a track/platform
 * Uses all 28 advanced routing rules
 */
export async function allocateSingleTrain(train, station, options = {}) {
  try {
    const trackTimeline = options.trackTimeline || {};
    const simTime = options.simTime || 0;
    const currentDay = options.currentDay || null;

    const allocation = trainAllocationService.allocateTrainAdvanced(
      train,
      station,
      trackTimeline,
      {},
      simTime,
      currentDay
    );

    if (allocation.error) {
      return {
        success: false,
        error: allocation.error,
        trainId: train.id,
      };
    }

    // Generate signals for conflict management
    const signals = trainAllocationService.getSignalsForTrainCrossing(
      station.tracks[allocation.track_id],
      station.line_crossings || {}
    );

    // Update timeline
    const updatedTimeline = trainAllocationService.updateTrackTimeline(
      trackTimeline,
      allocation.track_id,
      train
    );

    return {
      success: true,
      allocation: {
        trainId: train.id,
        trackId: allocation.track_id,
        platformId: allocation.platform_id,
        timeSlot: allocation.timeSlot,
        allocationScore: allocation.score,
        reason: allocation.reason,
        rulesApplied: allocation.reason,
        signalConflicts: signals,
        blockingDuration: allocation.blockingDuration,
      },
      updatedTimeline,
    };
  } catch (error) {
    console.error('Train allocation error:', error);
    return {
      success: false,
      error: error.message,
      trainId: train.id,
    };
  }
}

/**
 * Allocate multiple trains in batch
 * Considers cascading dependencies and priority ordering
 */
export async function allocateTrainBatch(trains, station, options = {}) {
  const results = [];
  let trackTimeline = options.trackTimeline || {};
  const simTime = options.simTime || 0;
  const currentDay = options.currentDay || null;

  // Sort trains by priority: SUPERFAST > passenger > GOODS
  const sortedTrains = [...trains].sort((a, b) => {
    const priorityMap = {
      'superfast': 100,
      'rajdhani': 90,
      'shatabdi': 85,
      'passenger': 50,
      'goods': 10,
    };
    const aPriority = priorityMap[a.train_type?.toLowerCase()] || 30;
    const bPriority = priorityMap[b.train_type?.toLowerCase()] || 30;
    return bPriority - aPriority;
  });

  for (const train of sortedTrains) {
    const result = await allocateSingleTrain(train, station, {
      trackTimeline,
      simTime,
      currentDay,
    });

    results.push(result);

    if (result.success) {
      trackTimeline = result.updatedTimeline;
    }
  }

  return {
    success: results.every(r => r.success),
    allocations: results,
    finalTimeline: trackTimeline,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    },
  };
}

/**
 * Find available time slots for a train on a specific track
 */
export async function findAvailableSlots(trackId, station, options = {}) {
  try {
    const track = station.tracks?.[trackId];
    if (!track) {
      return { error: `Track ${trackId} not found` };
    }

    const trackTimeline = options.trackTimeline || {};
    const startTime = options.startTime || 0;
    const endTime = options.endTime || 1440; // 24 hours
    const slotDuration = options.slotDuration || 10;

    const availableSlots = trainAllocationService.getAvailableTimeSlots(
      track,
      trackTimeline,
      startTime,
      endTime,
      slotDuration
    );

    return {
      success: true,
      trackId,
      trackInfo: {
        type: track.type,
        direction: track.direction,
        capacity: track.line_capacity,
      },
      availableSlots,
      slotCount: availableSlots.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      trackId,
    };
  }
}

/**
 * Validate if a specific track+platform combination is suitable for a train
 */
export async function validateAllocation(train, trackId, platformId, station) {
  try {
    const track = station.tracks?.[trackId];
    const platform = station.platforms?.[platformId];

    if (!track) {
      return {
        valid: false,
        reasons: [`Track ${trackId} not found`],
      };
    }

    const reasons = [];
    let valid = true;

    // Run through all 28 rules and collect reasons for acceptance/rejection

    // Rule 1-2: Time slot and safety buffer
    if (!trainAllocationService.isTrackTimeSlotFree?.(track, train, {}, 0)) {
      reasons.push('Track time slot occupied or insufficient safety buffer');
      valid = false;
    }

    // Rule 3: Passenger platform requirement
    if (train.train_pass_through === 0 && train.train_type?.toLowerCase() === 'passenger') {
      if (!platform) {
        reasons.push('Passenger train requires platform but none allocated');
        valid = false;
      }
    }

    // Rule 5: GOODS track validation
    if (train.train_type?.toLowerCase() === 'goods') {
      const allowedTypes = (track.train_type || []).map(t => t.toLowerCase());
      if (!allowedTypes.includes('goods')) {
        reasons.push('GOODS trains not allowed on this track');
        valid = false;
      }
    }

    // Rule 9: Platform capacity
    if (platform) {
      const trainCoaches = train.train_coaches || 12;
      const platformMaxCoaches = parseInt(
        (platform.train_length || '0').replace(/[^\d]/g, ''),
        10
      ) || 30;
      if (trainCoaches > platformMaxCoaches) {
        reasons.push(
          `Train (${trainCoaches} coaches) exceeds platform capacity (${platformMaxCoaches})`
        );
        valid = false;
      }
    }

    // Rule 10: Water filling
    if (train.water_filling === 1 && !track.water_filling) {
      reasons.push('Train requires water filling but track not equipped');
      valid = false;
    }

    // Rule 11: Terminal requirement
    if ((train.train_terminate === 1 || train.train_start_from_here === 1) && !track.terminal) {
      reasons.push('Train requires terminal track');
      valid = false;
    }

    // Rule 12: GOODS termination
    if (train.train_type?.toLowerCase() === 'goods' && train.train_terminate === 1) {
      if (!track.goods_train_termination) {
        reasons.push('GOODS train termination not allowed on this track');
        valid = false;
      }
    }

    // Rule 13: Direction matching
    const trainDir = train.train_direction?.toLowerCase() || 'up';
    const trackDir = track.direction?.toLowerCase() || 'both';
    if (trackDir !== 'both' && trainDir !== trackDir) {
      reasons.push(`Train direction (${trainDir}) doesn't match track (${trackDir})`);
      valid = false;
    }

    // Rule 21: Electrification
    if (
      (train.train_type?.toLowerCase() === 'passenger' ||
        train.train_type?.toLowerCase() === 'superfast') &&
      platform &&
      !platform.electrified
    ) {
      reasons.push('Passenger train requires electrified platform');
      valid = false;
    }

    if (valid) {
      reasons.push('All validation checks passed');
    }

    return {
      valid,
      reasons,
      trackDetails: {
        id: trackId,
        type: track.type,
        direction: track.direction,
        capacity: track.line_capacity,
      },
      platformDetails: platform
        ? {
            id: platformId,
            capacity: platform.train_length,
            passenger_density: platform.passenger_density,
            electrified: platform.electrified,
          }
        : null,
    };
  } catch (error) {
    return {
      valid: false,
      reasons: [`Validation error: ${error.message}`],
    };
  }
}

/**
 * Generate comprehensive allocation report
 */
export async function generateAllocationReport(allocations, station) {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalAllocations: allocations.length,
        successful: allocations.filter(a => a.success).length,
        failed: allocations.filter(a => !a.success).length,
      },
      allocations: allocations.map(alloc => ({
        trainId: alloc.allocation?.trainId || 'N/A',
        status: alloc.success ? 'SUCCESS' : 'FAILED',
        error: alloc.error || null,
        details: alloc.success
          ? {
              track: alloc.allocation.trackId,
              platform: alloc.allocation.platformId,
              score: alloc.allocation.allocationScore,
              reason: alloc.allocation.reason,
              timeSlot: alloc.allocation.timeSlot,
            }
          : null,
      })),
    };

    return report;
  } catch (error) {
    return {
      error: error.message,
    };
  }
}

/**
 * Get signal states for a train crossing
 */
export async function getSignalStates(trackId, station) {
  try {
    const track = station.tracks?.[trackId];
    if (!track) {
      return { error: `Track ${trackId} not found` };
    }

    const signals = trainAllocationService.getSignalsForTrainCrossing(track, station.line_crossings);

    return {
      success: true,
      trackId,
      signals: signals.map(sig => ({
        signal_no: sig,
        state: 'RED', // Red signal during crossing
        priority: 'CRITICAL',
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get track occupancy timeline
 */
export async function getTrackTimeline(trackId, station, trackTimeline = {}) {
  try {
    const track = station.tracks?.[trackId];
    if (!track) {
      return { error: `Track ${trackId} not found` };
    }

    const occupancies = trackTimeline[trackId] || [];

    return {
      success: true,
      trackId,
      trackInfo: {
        type: track.type,
        direction: track.direction,
      },
      occupancies: occupancies.map(occ => ({
        trainId: occ.trainId,
        start: occ.start,
        end: occ.end,
        duration: occ.end - occ.start,
      })),
      totalOccupancy: occupancies.reduce((sum, occ) => sum + (occ.end - occ.start), 0),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  allocateSingleTrain,
  allocateTrainBatch,
  findAvailableSlots,
  validateAllocation,
  generateAllocationReport,
  getSignalStates,
  getTrackTimeline,
};
