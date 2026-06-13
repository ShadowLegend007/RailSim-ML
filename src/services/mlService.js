/**
 * ML Model API Bridge.
 * Sends train + station state to /predict endpoint.
 * Falls back gracefully when unreachable.
 */

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Call the ML model for a track/platform assignment prediction.
 *
 * @param {object} station        - full station object
 * @param {object} incomingTrain  - train schema object
 * @param {object} currentOccupancy - trackOccupancy map
 * @param {string} endpoint       - configurable URL
 * @returns {Promise<{ track_id, platform_id, confidence, reason, responseMs }>}
 * @throws {Error} if endpoint unreachable or response invalid
 */
export async function predictAssignment(station, incomingTrain, currentOccupancy, endpoint) {
  const payload = {
    station: {
      metadata: station.metadata,
      tracks: station.tracks,
      platforms: station.platforms,
    },
    incoming_train: incomingTrain,
    current_occupancy: currentOccupancy,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const t0 = performance.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const responseMs = Math.round(performance.now() - t0);

    if (data.track_id === undefined) {
      throw new Error('Invalid response — missing track_id');
    }

    return {
      track_id:   data.track_id,
      platform_id: data.platform_id || null,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.9,
      reason:     data.reason || '',
      responseMs,
      source: 'ml',
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Simple connectivity check for the Settings panel.
 * Returns { ok: boolean, latencyMs: number, error: string|null }
 */
export async function testConnection(endpoint) {
  const baseUrl = endpoint.replace('/predict', '');
  const t0 = performance.now();
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    await fetch(baseUrl, { method: 'HEAD', signal: controller.signal });
    return { ok: true, latencyMs: Math.round(performance.now() - t0), error: null };
  } catch (e) {
    return { ok: false, latencyMs: null, error: e.message };
  }
}
