import React from 'react';
import { useSimStore } from '../store/useSimStore';

// Color scale from green → yellow → orange → red based on usage ratio
function heatColor(ratio) {
  if (ratio < 0.25) return '#22C55E';
  if (ratio < 0.5)  return '#84CC16';
  if (ratio < 0.7)  return '#F59E0B';
  if (ratio < 0.9)  return '#F97316';
  return '#EF4444';
}

export default function CongestionHeatmap() {
  const { station, heatmapHistory, trains, simTime } = useSimStore();

  if (!station) return null;

  const tracks = Object.values(station.tracks || {});
  const history = heatmapHistory.slice(-30); // last 30 snapshots
  const CELL_W = history.length > 0 ? Math.max(4, Math.floor(260 / history.length)) : 8;
  const CELL_H = 10;
  const LABEL_W = 32;

  const activeTrains = trains.active || [];
  const isTrackPhysicallyOccupied = (trackId) => {
    return activeTrains.some(train => {
      if (String(train._assignedTrack) !== String(trackId)) return false;
      const duration = train.train_platform_duration ? parseInt(train.train_platform_duration) : 10;
      const totalTransitTime = duration + 10;
      const timeSinceSpawn = simTime - ((train._arrivedAt || simTime) - 5);
      const progress = timeSinceSpawn / totalTransitTime;
      return progress >= 0 && progress <= 1;
    });
  };

  // Current occupancy for live bar
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        flexShrink: 0,
      }}>
        <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Congestion Heatmap
        </span>
        <span style={{ color: '#94A3B8', fontSize: '0.65rem', marginLeft: '8px', fontFamily: "'JetBrains Mono', monospace" }}>
          last {Math.min(30, history.length)} ticks
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }} className="scroll-dark">
        {tracks.map((track) => {
          const tid = String(track.id);
          const currentOcc = isTrackPhysicallyOccupied(track.id) ? 1 : 0;
          const liveColor = currentOcc ? '#EF4444' : '#22C55E';

          return (
            <div key={tid} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px',
            }}>
              {/* Track label */}
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: '#475569',
                width: LABEL_W,
                flexShrink: 0,
                textAlign: 'right',
              }}>
                T{track.id}
              </span>

              {/* Live bar */}
              <div style={{
                width: '10px',
                height: CELL_H,
                background: liveColor,
                borderRadius: '2px',
                flexShrink: 0,
                opacity: currentOcc ? 1 : 0.2,
              }} />

              {/* History cells */}
              <svg width={history.length * CELL_W} height={CELL_H}>
                {history.map((snap, i) => {
                  const ratio = snap.perTrack[tid] || 0;
                  return (
                    <rect
                      key={i}
                      x={i * CELL_W}
                      y={0}
                      width={Math.max(1, CELL_W - 1)}
                      height={CELL_H}
                      fill={ratio > 0 ? heatColor(ratio) : '#E2E8F0'}
                      opacity={ratio > 0 ? 0.9 : 0.5}
                      rx="1"
                    />
                  );
                })}
              </svg>
            </div>
          );
        })}

        {/* Color scale legend */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#64748B', fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace" }}>Low</span>
          {['#22C55E', '#84CC16', '#F59E0B', '#F97316', '#EF4444'].map(c => (
            <div key={c} style={{ width: '16px', height: '6px', background: c, borderRadius: '1px' }} />
          ))}
          <span style={{ color: '#64748B', fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace" }}>High</span>
        </div>
      </div>
    </div>
  );
}
