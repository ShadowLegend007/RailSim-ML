import React, { useState } from 'react';
import { useSimStore } from '../store/useSimStore';
import { formatSimTime } from './StationMasterTimeTable'; // reuse formatter

/**
 * Unified table that shows both queued and active trains in a single view.
 * It displays arrival, departure, status, and delay information.
 */
export default function UnifiedTrainsTable() {
  const { trains: { queue, active }, simTime } = useSimStore();
  const [expanded, setExpanded] = useState(false);

  const allTrains = [...queue, ...active].sort((a, b) =>
    (a._arrivalSimMin || 0) - (b._arrivalSimMin || 0)
  );
  
  const displayTrains = expanded ? allTrains : allTrains.slice(0, 6);

  const getStatus = (train) => {
    if (train.isHalted) return { label: 'Halted', color: '#EF4444' };
    if (train.train_pass_through) return { label: 'Passing', color: '#10B981' };
    if (train._departureAt && train._departureAt <= simTime) return { label: 'Departing', color: '#F59E0B' };
    return { label: 'Dwelling', color: '#3B82F6' };
  };

  return (
    <div style={{ padding: '0', overflowY: expanded ? 'auto' : 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }} className="scroll-dark">
      <div style={{ flex: expanded ? '1 1 auto' : '0 0 auto', overflowY: expanded ? 'auto' : 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#F8FAFC', borderBottom: '1px solid rgba(15,23,42,0.08)', position: expanded ? 'sticky' : 'static', top: 0, zIndex: 10 }}>
          <tr>
            <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Train</th>
            <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Pref</th>
            <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Arr</th>
            <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Dep</th>
            <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Delay</th>
          </tr>
          </thead>
          <tbody>
            {displayTrains.map(train => {
              const arr = formatSimTime(train._arrivalSimMin || train.arrival_time_mins || 0);
            const depTime = train._departureAt || train.departure_time_mins;
            const dep = (depTime && !isNaN(depTime)) ? formatSimTime(depTime) : '-';
            const { label, color } = getStatus(train);
            return (
              <tr key={train.train_no} style={{ borderBottom: '1px solid rgba(15,23,42,0.04)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '4px 6px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.7rem' }}>{train.train_no}</td>
                <td style={{ padding: '4px 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 600 }}>{train.preferred_track ? `T${train.preferred_track}` : '—'}</td>
                <td style={{ padding: '4px 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem' }}>{arr}</td>
                <td style={{ padding: '4px 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: '#B45309', fontWeight: 600 }}>{dep}</td>
                <td style={{ padding: '4px 6px' }}>
                  <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '3px', background: `${color}15`, color, fontWeight: 600 }}>{label}</span>
                </td>
                <td style={{ padding: '4px 6px', color: '#EF4444', fontWeight: 600, fontSize: '0.65rem' }}>
                  {train.delay_mins > 0 ? `+${train.delay_mins}m` : '-'}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      {!expanded && allTrains.length > 6 && (
        <button 
          onClick={() => setExpanded(true)}
          style={{ width: '100%', textAlign: 'center', padding: '6px', fontSize: '0.65rem', color: '#3B82F6', fontWeight: 600, borderTop: '1px solid rgba(15, 23, 42, 0.04)', background: 'none', border: 'none', borderTop: '1px solid rgba(15,23,42,0.04)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          + {allTrains.length - 6} more trains (Load More)
        </button>
      )}
      {expanded && (
        <button 
          onClick={() => setExpanded(false)}
          style={{ width: '100%', textAlign: 'center', padding: '6px', fontSize: '0.65rem', color: '#64748B', fontWeight: 600, borderTop: '1px solid rgba(15, 23, 42, 0.04)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          Show Less
        </button>
      )}
    </div>
  );
}
