import React, { useRef, useEffect } from 'react';
import { useSimStore } from '../store/useSimStore';

const TYPE_COLORS = {
  info:     '#475569',
  success:  '#16A34A',
  warning:  '#D97706',
  conflict: '#DC2626',
  user:     '#7C3AED',
  ml:       '#2563EB',
  fallback: '#D97706',
};
const TYPE_ICONS = {
  info:     '·',
  success:  '\u2713',
  warning:  '!',
  conflict: '!',
  user:     '\u25c6',
  ml:       '\u2192',
  fallback: '\u2192',
};

export default function EventLog() {
  const { eventLog, toggleEventLog } = useSimStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [eventLog.length]);

  return (
    <div className="event-log" style={{
      height: '150px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '4px 12px',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: '#475569', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
          ■ Event Log
        </span>
        <button
          onClick={toggleEventLog}
          className="sim-btn"
          style={{ padding: '2px 8px', height: '20px', fontSize: '0.65rem' }}
        >
          Hide (L)
        </button>
      </div>
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '4px 12px' }}
        className="scroll-dark"
      >
        {[...eventLog].reverse().map(entry => (
          <div key={entry.id} style={{
            display: 'flex',
            gap: '10px',
            padding: '2px 0',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            lineHeight: '1.5',
          }}>
            <span style={{ color: '#94A3B8', flexShrink: 0 }}>[{entry.timestamp}]</span>
            <span style={{ color: TYPE_COLORS[entry.type] || '#475569', flexShrink: 0, fontWeight: 'bold' }}>
              {TYPE_ICONS[entry.type] || '·'}
            </span>
            <span style={{ color: TYPE_COLORS[entry.type] || '#475569' }}>{entry.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
