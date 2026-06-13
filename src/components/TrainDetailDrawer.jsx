import React from 'react';
import { useSimStore } from '../store/useSimStore';

export default function TrainDetailDrawer() {
  const { selectedElement, clearSelected, simTime, haltTrain, addTrainBuffer, trains, station, reassignTrainTrack } = useSimStore();

  if (!selectedElement || selectedElement.type !== 'train') return null;
  
  // Fetch from store dynamically so it reacts to updates (like halt/buffer)
  const train = trains.active.find(t => t.train_no === selectedElement.data.train_no) 
             || trains.queue.find(t => t.train_no === selectedElement.data.train_no) 
             || selectedElement.data;

  const arrival  = train._arrivalSimMin || 0;
  const rawDwell = train.train_platform_duration || 10;
  const dwell    = typeof rawDwell === 'string' ? parseInt(rawDwell) || 0 : rawDwell;
  const departure = train._departureAt || arrival + dwell;
  const progress = simTime >= departure ? 100 : simTime <= arrival ? 0
    : Math.round(((simTime - arrival) / (departure - arrival)) * 100);

  const srcColor = train._assignedSource === 'ml' ? '#2563EB' : '#D97706';
  const srcLabel = train._assignedSource === 'ml'
    ? `ML [${train._responseMs}ms, ${Math.round((train._confidence || 0) * 100)}%]`
    : 'GREEDY FALLBACK';

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 300,
        }}
        onClick={clearSelected}
      />
      {/* Drawer panel */}
      <div
        className="drawer-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '340px',
          background: '#FFFFFF',
          borderLeft: '1px solid rgba(15, 23, 42, 0.08)',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ color: '#B45309', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px' }}>
              TRAIN DETAILS
            </p>
            <h3 style={{ color: '#0F172A', fontWeight: 800, fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace" }}>
              {train.train_no}
              {train.isSpecial && <span style={{ marginLeft: '8px', color: '#B45309', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 700 }}>SPECIAL</span>}
            </h3>
          </div>
          <button onClick={clearSelected} className="sim-btn" style={{ width: '28px', height: '28px', padding: 0, justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} className="scroll-dark">
          {/* Train name */}
          <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '16px', lineHeight: '1.4' }}>
            {train.train_name}
          </p>

          {/* Type badge */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              background: 'rgba(59,130,246,0.1)',
              color: '#1D4ED8',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}>
              {train.train_type?.toUpperCase()}
            </span>
            {train.isSpecial && (
              <span style={{
                padding: '3px 10px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                background: 'rgba(234,179,8,0.1)',
                color: '#B45309',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
              }}>
                {train._priority || 'HIGH'} PRIORITY
              </span>
            )}
          </div>

          {/* Assignment info */}
          {train._assignedTrack != null && (
            <div style={{
              background: '#F8FAFC',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px',
            }}>
              <p style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Assignment
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <p style={{ color: '#94A3B8', fontSize: '0.65rem' }}>Track</p>
                  <p style={{ color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', fontWeight: 700 }}>
                    {train._assignedTrack}
                  </p>
                </div>
                <div>
                  <p style={{ color: '#94A3B8', fontSize: '0.65rem' }}>Platform</p>
                  <p style={{ color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', fontWeight: 700 }}>
                    {train._assignedPlatform?.replace('platform', 'PF ') || '—'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: srcColor, display: 'inline-block' }} />
                <span style={{ color: srcColor, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 500 }}>
                  {srcLabel}
                </span>
              </div>

              {/* Confidence bar */}
              {train._confidence != null && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748B', fontSize: '0.65rem' }}>Confidence</span>
                    <span style={{ color: srcColor, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 600 }}>
                      {Math.round((train._confidence || 0) * 100)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${(train._confidence || 0) * 100}%`, height: '100%', background: srcColor, borderRadius: '2px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Station Master Operations */}
          {train._assignedTrack != null && (
            <div style={{
              background: '#FFFBEB',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px',
            }}>
              <p style={{ color: '#B45309', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 700 }}>
                Station Master Operations
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className={`sim-btn ${train.isHalted ? 'success' : 'danger'}`}
                  onClick={() => haltTrain(train.train_no, !train.isHalted)}
                  style={{ width: '100%', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  {train.isHalted ? '▶ RESUME FROM INSPECTION' : '⏸ HALT FOR INSPECTION'}
                </button>
                
                {!train.isHalted && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="sim-btn"
                      onClick={() => addTrainBuffer(train.train_no, 5)}
                      style={{ flex: 1, justifyContent: 'center', background: '#FFFFFF', color: '#0F172A', border: '1px solid rgba(15, 23, 42, 0.1)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}
                    >
                      +5m BUFFER
                    </button>
                    <button
                      className="sim-btn"
                      onClick={() => addTrainBuffer(train.train_no, 10)}
                      style={{ flex: 1, justifyContent: 'center', background: '#FFFFFF', color: '#0F172A', border: '1px solid rgba(15, 23, 42, 0.1)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}
                    >
                      +10m BUFFER
                    </button>
                  </div>
                )}
              </div>

              {/* Track Re-assignment */}
              {!train.isHalted && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ color: '#B45309', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontWeight: 600 }}>
                    Change Track
                  </p>
                  <select 
                    className="rail-input"
                    style={{ width: '100%', padding: '6px', fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace" }}
                    value={train._assignedTrack || ''}
                    onChange={(e) => {
                       const newTrack = e.target.value;
                       if (newTrack === String(train._assignedTrack)) return;

                       const x = train._phys_x || 0;
                       let crossingExists = false;
                       if (station && station.line_crossings) {
                          crossingExists = Object.values(station.line_crossings).some(c => 
                            (c.cross_between?.from?.line_id == train._assignedTrack && c.cross_between?.to?.line_id == newTrack) ||
                            (c.cross_between?.to?.line_id == train._assignedTrack && c.cross_between?.from?.line_id == newTrack)
                          );
                       }

                       if (x >= 500 && !crossingExists) {
                          alert('Cannot change track: Train has passed the 2km radius threshold and no crossing path exists.');
                       } else {
                          if (window.confirm(`Reassign ${train.train_no} to Track ${newTrack}?`)) {
                             reassignTrainTrack(train.train_no, newTrack);
                          }
                       }
                    }}
                  >
                    <option disabled value="">Select Track</option>
                    {station && station.tracks && Object.values(station.tracks).map(t => (
                      <option key={t.id} value={t.id}>Track {t.id} ({t.type})</option>
                    ))}
                  </select>
                  <p style={{ color: '#94A3B8', fontSize: '0.6rem', marginTop: '4px', lineHeight: '1.2' }}>
                    Allowed only if train is outside 2km radius or if crossing path exists.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {train._assignedTrack != null && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Timeline
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '6px' }}>
                {[
                  { label: 'Arrival',  time: train.train_arrival_time || '—', color: '#16A34A' },
                  { label: 'Dwell',    time: `${dwell}m`,                     color: '#D97706' },
                  { label: 'Depart',   time: train.train_departure_time || '—', color: '#DC2626' },
                ].map((phase, i) => (
                  <React.Fragment key={i}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: phase.color, margin: '0 auto 4px' }} />
                      <p style={{ color: phase.color, fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{phase.time}</p>
                      <p style={{ color: '#94A3B8', fontSize: '0.6rem' }}>{phase.label}</p>
                    </div>
                    {i < 2 && <div style={{ flex: 2, height: '2px', background: '#E2E8F0', marginBottom: '14px' }} />}
                  </React.Fragment>
                ))}
              </div>
              {/* Progress bar */}
              <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #16A34A, #D97706)',
                  borderRadius: '3px',
                  transition: 'width 1s ease',
                }} />
              </div>
              <p style={{ color: '#64748B', fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace", marginTop: '4px', textAlign: 'right' }}>
                {progress}% complete
              </p>
            </div>
          )}

          {/* Full data */}
          <div>
            <p style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Raw Data
            </p>
            <pre style={{
              background: '#F8FAFC',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: '6px',
              padding: '10px',
              color: '#475569',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.62rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {JSON.stringify({
                train_no:   train.train_no,
                train_type: train.train_type,
                coaches:    train.train_coaches,
                water_filling: train.water_filling,
                pass_through:  train.train_pass_through,
                terminate:     train.train_terminate,
                start_from:    train.train_start_from_here,
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
