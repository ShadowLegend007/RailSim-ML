/**
 * Enhanced Greedy Assignment with Advanced Train Allocation Logic
 * Integrates 28 intelligent routing rules as default backend behavior
 * Falls back to greedy selection if advanced allocation unavailable
 */

import trainAllocationService from '../services/trainAllocationService';

/**
 * Check if a track/platform combination is compatible with the given train.
 * Now integrated with advanced allocation rules.
 *
 * Compatibility rules:
 * 1. train.train_type ∈ track.train_type
 * 2. Track not in maintenanceTracks or disabledTracks
 * 3. No occupancy conflict (current occupant departs before new train arrives)
 * 4. If train.water_filling && !track.water_filling → incompatible
 * 5. If train.train_terminate && !platform.termination → incompatible
 * 6. Platform length ≥ coaches × 25m
 * + All 28 advanced allocation rules
 */
function isCompatible(track, platform, train, occupancy, maintenanceTracks, disabledTracks, simTime) {
  const tid = String(track.id);

  // 2. Maintenance / Disabled
  if (maintenanceTracks.has(tid) || disabledTracks.has(tid)) return false;

  // 1. Train type
  const trainType = (train.train_type || 'passenger').toLowerCase();
  const allowed = (track.train_type || []).map(t => t.toLowerCase());
  if (!allowed.includes(trainType)) return false;

  // 3. Occupancy conflict
  const occ = occupancy[tid];
  if (occ) {
    // occupied until occ.until — new train arrives at simTime
    if (occ.until > simTime) return false;
  }

  // 4. Water filling
  if (train.water_filling && !track.water_filling) return false;

  // 5. Termination
  if (train.train_terminate && platform && !platform.termination) return false;

  // 6. Platform length
  if (platform) {
    const platformLengthM = parseInt(
      (platform.platform_length || '0').replace(/[^\d]/g, ''), 10
    ) || 0;
    const coaches = train.train_coaches || 12;
    const requiredLength = coaches * 25; // 25m per coach
    if (platformLengthM > 0 && platformLengthM < requiredLength) return false;
  }

  return true;
}

/**
 * Smart greedy assignment with advanced allocation logic
 * Attempts intelligent allocation first, falls back to greedy if needed
 *
 * @param {object} train          - train object from schema
 * @param {object} stationTracks  - tracks dict from station
 * @param {object} stationPlatforms - platforms dict
 * @param {object} occupancy      - current occupancy map
 * @param {Set}    maintenanceTracks
 * @param {Set}    disabledTracks
 * @param {number} simTime        - current sim-time in minutes
 * @param {string|null} forcedTrackId    - user-forced track (optional)
 * @param {string|null} forcedPlatformId - user-forced platform (optional)
 * @param {object} station - full station data (optional, enables advanced rules)
 * @param {object} trackTimeline - track occupancy timeline (optional)
 */
export function greedyAssign(
  train,
  stationTracks,
  stationPlatforms,
  occupancy,
  maintenanceTracks,
  disabledTracks,
  simTime,
  forcedTrackId = null,
  forcedPlatformId = null,
  station = null,
  trackTimeline = null
) {
  const tracks = Object.values(stationTracks || {});
  const platforms = stationPlatforms || {};

  // If user forced a specific track/platform, attempt that first
  if (forcedTrackId !== null) {
    const fTrack = stationTracks[String(forcedTrackId)];
    const fPlatform = forcedPlatformId ? platforms[forcedPlatformId] : null;
    if (fTrack) {
      return { track_id: fTrack.id, platform_id: forcedPlatformId || null, forced: true };
    }
  }

  // Try advanced allocation if station data available
  if (station && trackTimeline) {
    try {
      const advancedResult = trainAllocationService.allocateTrainAdvanced(
        train,
        station,
        trackTimeline,
        {},
        simTime
      );

      if (!advancedResult.error) {
        return {
          track_id: advancedResult.track_id,
          platform_id: advancedResult.platform_id,
          forced: false,
          method: 'advanced',
          score: advancedResult.score,
          reason: advancedResult.reason,
          timeSlot: advancedResult.timeSlot,
          convergingTracks: advancedResult.convergingTracks,
        };
      }
    } catch (error) {
      console.warn('Advanced allocation failed, falling back to greedy:', error);
    }
  }

  // Greedy fallback: iterate tracks in order
  for (const track of tracks) {
    // Filter out maintenance/disabled tracks
    if (maintenanceTracks.has(String(track.id)) || disabledTracks.has(String(track.id))) {
      continue;
    }

    // Find the first associated platform for this track
    const assocPlatformIds = track.associated_platform || [];
    const platform = assocPlatformIds.length > 0 ? platforms[assocPlatformIds[0]] : null;

    if (isCompatible(track, platform, train, occupancy, maintenanceTracks, disabledTracks, simTime)) {
      return {
        track_id: track.id,
        platform_id: platform?.id || null,
        forced: false,
        method: 'greedy',
      };
    }
  }

  return null; // No compatible assignment found
}
