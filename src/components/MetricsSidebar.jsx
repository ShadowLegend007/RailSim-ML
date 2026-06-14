import React from 'react';
import { useSimStore } from '../store/useSimStore';

// Animated arc gauge
// Animated arc gauge
function GaugeArc({ pct, color, size = 80 }) {
  const r = size / 2 - 8;
  const circ = Math.PI * r; // half circle
  const stroke = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
      {/* Background arc */}
      <path
        d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${circ - stroke} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      {/* Label */}
      <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="JetBrains Mono">
        {pct}%
      </text>
    </svg>
  );
}

function MetricRow({ label, value, unit, color = '#0F172A', trend }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
    }}>
      <span style={{ color: '#475569', fontSize: '0.75rem' }}>{label}</span>
      <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 700 }}>
        {value}<span style={{ fontSize: '0.65rem', color: '#64748B', marginLeft: '2px' }}>{unit}</span>
        {trend && <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>{trend}</span>}
      </span>
    </div>
  );
}

export default function MetricsSidebar() {
  const { metrics, exportSessionLog, station, trains, trackOccupancy } = useSimStore();

  const {
    occupancyPct, conflictCount, conflictsResolved,
    trainsHandled, avgDwellTime, mlDecisions, overriddenDecisions,
  } = metrics;

  const mlAccuracy = mlDecisions > 0
    ? Math.round(((mlDecisions - overriddenDecisions) / mlDecisions) * 100)
    : 100;

  const totalTracks = station ? Object.keys(station.tracks || {}).length : 0;
  const occupiedTracks = Object.values(trackOccupancy).filter(Boolean).length;
  const platforms = station ? Object.values(station.platforms || {}) : [];

  const occColor = occupancyPct > 80 ? '#DC2626' : occupancyPct > 50 ? '#D97706' : '#16A34A';

  return (
    <div style={{
      width: '260px',
      flexShrink: 0,
      background: '#FFFFFF',
      borderLeft: '1px solid rgba(15, 23, 42, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
    }} className="scroll-dark">
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        flexShrink: 0,
      }}>
        <span style={{
          color: '#475569',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Live Metrics
        </span>
        <span style={{
          float: 'right',
          color: '#94A3B8',
          fontSize: '0.65rem',
          fontFamily: "'JetBrains Mono', monospace",
        }}>M to toggle</span>
      </div>

      <div style={{ padding: '12px 14px', flex: 1 }}>
        {/* Occupancy gauge */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <GaugeArc pct={occupancyPct} color={occColor} size={100} />
          <p style={{ color: '#64748B', fontSize: '0.65rem', marginTop: '4px' }}>Station Occupancy</p>
          <p style={{ color: '#475569', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace" }}>
            {occupiedTracks}/{totalTracks} tracks
          </p>
        </div>

        {/* Metrics */}
        <MetricRow label="Trains Handled"  value={trainsHandled}  unit="trains" color="#16A34A" />
        <MetricRow label="Avg Dwell Time"  value={avgDwellTime || 0}  unit="min" color="#2563EB" />
        <MetricRow label="Conflicts Total" value={conflictCount}   unit=""      color="#DC2626" />
        <MetricRow label="Conflicts Res."  value={conflictsResolved} unit=""    color="#16A34A" />
        <MetricRow label="ML Decisions"    value={mlDecisions}    unit=""      color="#2563EB" />
        <MetricRow label="ML Accuracy"     value={mlAccuracy}     unit="%"     color={mlAccuracy > 90 ? '#16A34A' : '#D97706'} />

        {/* Platform density */}
        {platforms.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Platform Density
            </p>
            {platforms.map(plat => {
              // Calculate dynamic density by counting trains currently assigned to this platform's tracks
              const assignedCount = (trains.active || []).filter(t => t._assignedPlatform === plat.id).length;
              
              const barColor = assignedCount >= 2 ? '#DC2626' : assignedCount === 1 ? '#D97706' : '#16A34A';
              const barPct   = assignedCount >= 2 ? 85 : assignedCount === 1 ? 55 : 15;
              const letter   = assignedCount >= 2 ? 'H' : assignedCount === 1 ? 'M' : 'L';
              
              return (
                <div key={plat.id} style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#475569', fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", width: '32px', flexShrink: 0 }}>
                    {plat.id.replace('platform', 'P')}
                  </span>
                  <div style={{ flex: 1, height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${barPct}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: '3px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ color: barColor, fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace", width: '24px' }}>
                    {letter}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Export button */}
        <button
          onClick={exportSessionLog}
          className="sim-btn"
          id="btn-export-session"
          style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}
        >
          Export Session Log
        </button>
      </div>
    </div>
  );
}
