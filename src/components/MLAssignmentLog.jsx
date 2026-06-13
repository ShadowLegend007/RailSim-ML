import React, { useRef, useEffect } from 'react';
import { useSimStore } from '../store/useSimStore';

function LogEntry({ entry }) {
  const colors = {
    info:     '#475569',
    success:  '#16A34A',
    warning:  '#D97706',
    conflict: '#DC2626',
    user:     '#7C3AED',
    ml:       '#2563EB',
    fallback: '#D97706',
  };
  const icons = {
    info:     '·',
    success:  '\u2713',
    warning:  '!',
    conflict: '!',
    user:     '\u25c6',
    ml:       '\u2192',
    fallback: '\u2192',
  };

  return (
    <div style={{
      padding: '4px 0',
      borderBottom: '1px solid rgba(15, 23, 42, 0.04)',
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-start',
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.65rem',
        color: '#94A3B8',
        flexShrink: 0,
        lineHeight: '1.6',
      }}>
        [{entry.timestamp}]
      </span>
      <span style={{ color: colors[entry.type] || '#475569', flexShrink: 0, lineHeight: '1.6', fontWeight: 'bold' }}>
        {icons[entry.type] || '·'}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.65rem',
        color: colors[entry.type] || '#475569',
        lineHeight: '1.6',
        fontWeight: entry.type === 'ml' ? 500 : 400,
      }}>
        {entry.message}
      </span>
    </div>
  );
}

export default function MLAssignmentLog() {
  const { eventLog } = useSimStore();
  const bottomRef = useRef(null);

  // Filter to ML/fallback assignment entries only
  const assignments = eventLog.filter(e => e.type === 'ml' || e.type === 'fallback');

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assignments.length]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          ML Assignment Log
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '0.65rem', color: '#2563EB', fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
            ML
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '0.65rem', color: '#D97706', fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706', display: 'inline-block' }} />
            FALLBACK
          </span>
        </div>
      </div>
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}
        className="scroll-dark"
      >
        {assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}>
            Waiting for assignments...
          </div>
        ) : (
          [...assignments].reverse().map(entry => (
            <LogEntry key={entry.id} entry={entry} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
