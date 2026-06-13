import React from 'react';

const Field = ({ label, required, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{
      display: 'block',
      color: '#475569',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '6px',
      fontFamily: "'Inter', sans-serif",
    }}>
      {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function BuilderStep1({ data, update }) {
  return (
    <div>
      <h2 style={{ color: '#0F172A', fontSize: '1.25rem', marginBottom: '8px', fontWeight: 700 }}>
        Station Identity
      </h2>
      <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '32px' }}>
        Set the core identity of your simulated station.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Field label="Station Name" required>
          <input
            className="rail-input"
            placeholder="e.g. Howrah Junction"
            value={data.name}
            onChange={e => update({ name: e.target.value })}
            id="builder-station-name"
          />
        </Field>

        <Field label="Station Code" required>
          <input
            className="rail-input"
            placeholder="e.g. HWH"
            value={data.station_code}
            maxLength={5}
            onChange={e => update({ station_code: e.target.value.toUpperCase() })}
            id="builder-station-code"
          />
          <p style={{ color: '#64748B', fontSize: '0.7rem', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
            Max 5 characters · auto-uppercase
          </p>
        </Field>

        <Field label="Division" required>
          <input
            className="rail-input"
            placeholder="e.g. Eastern Railway"
            value={data.division}
            onChange={e => update({ division: e.target.value })}
            id="builder-division"
          />
        </Field>

        <Field label="Station Type" required>
          <select
            className="rail-select"
            value={data.station_type}
            onChange={e => update({ station_type: e.target.value })}
            id="builder-station-type"
          >
            <option value="Junction">Junction</option>
            <option value="Terminal">Terminal</option>
            <option value="Wayside">Wayside</option>
            <option value="Halt">Halt</option>
          </select>
        </Field>
      </div>

      {/* Preview badge */}
      {data.name && data.station_code && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', fontWeight: 900, color: '#B45309' }}>STN</span>
          <div>
            <p style={{ color: '#0F172A', fontWeight: 700, fontSize: '1rem' }}>
              {data.name}
            </p>
            <p style={{
              color: '#F59E0B',
              fontSize: '0.75rem',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.1em',
            }}>
              {data.station_code} · {data.station_type} · {data.division || '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
