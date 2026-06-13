import React from 'react';
import { useSimStore } from '../store/useSimStore';

export function formatSimTime(simMins) {
  const totalMins = Math.floor(simMins);
  const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
  const mm = String(totalMins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function StationMasterTimeTable() {
  const { trains, simTime, setSelectedElement } = useSimStore();

  const activeTrains = trains.active || [];
  
  // Sort trains by departure time or arrival time
  const sortedTrains = [...activeTrains].sort((a, b) => {
    return (a._departureAt || 0) - (b._departureAt || 0);
  }).slice(0, 6); // Keep it small, top 6 trains only

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Station Master Time Table
        </span>
        <span style={{
          background: 'rgba(245,158,11,0.1)',
          color: '#B45309',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          padding: '1px 7px',
          borderRadius: '10px',
          fontWeight: 600,
        }}>
          {sortedTrains.length} ACTIVE
        </span>
      </div>
      
      <div style={{ padding: '0', overflow: 'hidden' }}>
        {sortedTrains.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px', color: '#94A3B8', fontSize: '0.75rem' }}>
            No active trains
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#F8FAFC', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <tr>
                <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Train</th>
                <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Pref</th>
                <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Track</th>
                <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Time</th>
                <th style={{ padding: '4px 6px', fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrains.map(train => {
                const arr = formatSimTime(train._arrivedAt || 0);
                const dep = formatSimTime(train._departureAt || 0);
                
                // Determine status
                let status = 'Dwelling';
                let color = '#3B82F6';
                if (train.isHalted) {
                  status = 'Halted (Insp)';
                  color = '#EF4444';
                } else if (train.train_pass_through) {
                  status = 'Passing';
                  color = '#10B981';
                } else if (train._departureAt && train._departureAt <= simTime) {
                  status = 'Departing';
                  color = '#F59E0B';
                }
                
                return (
                  <tr 
                    key={train.train_no} 
                    onClick={() => setSelectedElement({ type: 'train', data: train })}
                    style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.04)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '4px 6px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#0F172A' }}>
                        {train.train_no}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                        {train.train_name}
                      </div>
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: '#0F172A', fontWeight: 600 }}>
                        {train.preferred_track ? `T${train.preferred_track}` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: '#0F172A', fontWeight: 600 }}>
                        {train._assignedPlatform ? train._assignedPlatform.replace('platform', 'PF') : `T${train._assignedTrack}`}
                      </span>
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: '#475569' }}>
                        {arr}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: '#B45309', fontWeight: 600 }}>
                        {dep}
                      </div>
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        padding: '2px 6px', 
                        borderRadius: '3px', 
                        background: `${color}15`, 
                        color: color, 
                        fontWeight: 600 
                      }}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {activeTrains.length > 6 && (
          <div style={{ textAlign: 'center', padding: '4px', fontSize: '0.6rem', color: '#94A3B8', borderTop: '1px solid rgba(15, 23, 42, 0.04)' }}>
            + {activeTrains.length - 6} more active
          </div>
        )}
      </div>
    </div>
  );
}
