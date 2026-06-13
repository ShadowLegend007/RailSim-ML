import React from 'react';
import { useSimStore } from '../store/useSimStore';

export default function ConflictBanner() {
  const { conflicts, resolveConflict, addToast, assignTrain, station,
          trackOccupancy, maintenanceTracks, disabledTracks, simTime } = useSimStore();

  const unresolved = conflicts.filter(c => !c.resolved);
  if (unresolved.length === 0) return null;

  const latest = unresolved[unresolved.length - 1];

  const autoResolve = (conflict) => {
    // Simple auto-resolve: just mark as resolved and log
    resolveConflict(conflict.id);
    addToast(`Auto-resolved: ${conflict.message}`, 'warning');
  };

  return (
    <div className="conflict-banner" style={{
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      zIndex: 30,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Blinking red dot */}
        <span style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#EF4444',
          display: 'inline-block',
          animation: 'blink 0.8s ease infinite',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
          color: '#DC2626',
          fontWeight: 700,
        }}>
          CONFLICT:
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          color: '#991B1B',
          fontWeight: 500,
        }}>
          {latest.message}
        </span>
        {unresolved.length > 1 && (
          <span style={{
            background: 'rgba(239,68,68,0.1)',
            color: '#DC2626',
            fontSize: '0.65rem',
            padding: '1px 6px',
            borderRadius: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
          }}>
            +{unresolved.length - 1} more
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => autoResolve(latest)}
          className="sim-btn"
          style={{ fontSize: '0.72rem', color: '#B45309', borderColor: 'rgba(245,158,11,0.2)' }}
        >
          Auto-Resolve (ML)
        </button>
        <button
          onClick={() => resolveConflict(latest.id)}
          className="sim-btn"
          style={{ fontSize: '0.72rem' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
