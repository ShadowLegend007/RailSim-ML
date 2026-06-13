import React, { useState } from 'react';

const Field = ({ label, required, hint, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{
      display: 'block',
      color: required ? '#475569' : '#64748B',
      fontSize: '0.7rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '5px',
    }}>
      {label} {required ? <span style={{ color: '#EF4444' }}>*</span> : <span style={{ color: '#94A3B8', fontSize: '0.65rem' }}>(optional)</span>}
    </label>
    {children}
    {hint && <p style={{ color: '#64748B', fontSize: '0.65rem', marginTop: '3px', fontFamily: "'JetBrains Mono', monospace" }}>{hint}</p>}
  </div>
);

const Toggle = ({ label, value, onChange, randomized }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#F1F5F9',
    borderRadius: '6px',
    border: `1px solid ${randomized ? 'rgba(245,158,11,0.3)' : 'rgba(15, 23, 42, 0.08)'}`,
    marginBottom: '8px',
    transition: 'border-color 0.2s',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: '#334155', fontSize: '0.825rem' }}>{label}</span>
      {randomized && (
        <span style={{
          background: 'rgba(245,158,11,0.15)',
          color: '#F59E0B',
          fontSize: '0.6rem',
          padding: '1px 6px',
          borderRadius: '10px',
          fontFamily: "'JetBrains Mono', monospace",
        }}>randomized</span>
      )}
    </div>
    <label className="rail-toggle">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      <div className="rail-toggle-track" />
      <div className="rail-toggle-thumb" />
    </label>
  </div>
);

export default function BuilderStep2({ data, update }) {
  const [randomizedFields, setRandomizedFields] = useState(new Set());

  const randomizeOptional = () => {
    const updates = {
      num_terminal_tracks: Math.floor(Math.random() * 4),
      has_carshade: Math.random() > 0.5,
      has_water_filling: Math.random() > 0.4,
      has_freight_line: Math.random() > 0.6,
      terminate_terminal_line: Math.random() > 0.5,
    };
    update(updates);
    setRandomizedFields(new Set(['num_terminal_tracks', 'has_carshade', 'has_water_filling', 'has_freight_line', 'terminate_terminal_line']));
    setTimeout(() => setRandomizedFields(new Set()), 3000);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ color: '#0F172A', fontSize: '1.25rem', marginBottom: '4px', fontWeight: 700 }}>
            Infrastructure
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
            Define tracks, platforms, and optional facilities.
          </p>
        </div>
        <button
          onClick={randomizeOptional}
          className="sim-btn"
          style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#F59E0B' }}
          id="btn-randomize-infra"
        >
          Fill Non-Required Randomly
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Left — Required */}
        <div>
          <h3 style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
            Required Fields
          </h3>
          <Field label="Number of Tracks" required hint="Range: 1–20">
            <input
              type="number" min={1} max={20}
              className="rail-input"
              value={data.num_tracks}
              onChange={e => update({ num_tracks: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) })}
              id="builder-num-tracks"
            />
          </Field>
          <Field label="Number of Platforms" required hint="Range: 1–15">
            <input
              type="number" min={1} max={15}
              className="rail-input"
              value={data.num_platforms}
              onChange={e => update({ num_platforms: Math.min(15, Math.max(1, parseInt(e.target.value) || 1)) })}
              id="builder-num-platforms"
            />
          </Field>
        </div>

        {/* Right — Optional */}
        <div>
          <h3 style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
            Optional Fields
          </h3>
          <Field label="Terminal Tracks">
            <input
              type="number" min={0} max={10}
              className="rail-input"
              value={data.num_terminal_tracks}
              onChange={e => update({ num_terminal_tracks: Math.max(0, parseInt(e.target.value) || 0) })}
              style={{ borderColor: randomizedFields.has('num_terminal_tracks') ? 'rgba(245,158,11,0.4)' : undefined }}
              id="builder-terminal-tracks"
            />
            {randomizedFields.has('num_terminal_tracks') && (
              <span style={{ color: '#F59E0B', fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace" }}>randomized</span>
            )}
          </Field>

          <Toggle
            label="Has Carshade"
            value={data.has_carshade}
            onChange={v => update({ has_carshade: v })}
            randomized={randomizedFields.has('has_carshade')}
          />
          <Toggle
            label="Has Water Filling"
            value={data.has_water_filling}
            onChange={v => update({ has_water_filling: v })}
            randomized={randomizedFields.has('has_water_filling')}
          />
          <Toggle
            label="Has Freight Line"
            value={data.has_freight_line}
            onChange={v => update({ has_freight_line: v })}
            randomized={randomizedFields.has('has_freight_line')}
          />
          <Toggle
            label="Terminate / Terminal Line"
            value={data.terminate_terminal_line}
            onChange={v => update({ terminate_terminal_line: v })}
            randomized={randomizedFields.has('terminate_terminal_line')}
          />
        </div>
      </div>
    </div>
  );
}
