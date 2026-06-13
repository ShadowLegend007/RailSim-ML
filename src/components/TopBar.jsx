import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore';
import { testConnection } from '../services/mlService';

const SPEEDS = [1, 10, 30, 60];
const RUSH_LEVELS = [
  { key: 'basic',    label: 'BASIC',    color: '#22C55E' },
  { key: 'moderate', label: 'MODERATE', color: '#F59E0B' },
  { key: 'extreme',  label: 'EXTREME',  color: '#EF4444' },
];

// Sim clock display
function SimClock({ simTime }) {
  const totalMins = Math.floor(simTime);
  const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
  const mm = String(totalMins % 60).padStart(2, '0');
  const ss = String(Math.floor((simTime % 1) * 60)).padStart(2, '0');
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '1rem',
      fontWeight: 700,
      color: '#B45309',
      letterSpacing: '0.08em',
    }}>
      {hh}:{mm}:{ss}
    </span>
  );
}

// Health score badge
function HealthScore({ metrics, conflicts }) {
  const unresolvedConflicts = conflicts.filter(c => !c.resolved).length;
  const score = Math.max(0, Math.min(100,
    100
    - (metrics.occupancyPct > 80 ? 20 : 0)
    - (unresolvedConflicts * 15)
    - (metrics.avgDwellTime > 30 ? 10 : 0)
  ));
  const color = score > 75 ? '#16A34A' : score > 50 ? '#D97706' : '#DC2626';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: '20px',
    }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700 }}>
        {score}
      </span>
      <span style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: 600 }}>HEALTH</span>
    </div>
  );
}

// Settings panel
function SettingsPanel({ onClose }) {
  const {
    mlEndpoint, simTimeRatio, autoPauseOnConflict, showSignals, showCrossings, soundEnabled,
    updateSettings, addToast,
  } = useSimStore();
  const [endpoint, setEndpoint] = useState(mlEndpoint);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    const result = await testConnection(endpoint);
    setTestResult(result);
    setTesting(false);
    if (result.ok) {
      addToast(`ML endpoint reachable (${result.latencyMs}ms)`, 'success');
    } else {
      addToast(`ML endpoint unreachable: ${result.error}`, 'error');
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      backdropFilter: 'blur(4px)', zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" style={{
        background: '#FFFFFF',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        borderRadius: '12px',
        width: '460px',
        padding: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ color: '#0F172A', fontSize: '1rem', fontWeight: 700 }}>Settings</h3>
          <button onClick={onClose} className="sim-btn" style={{ padding: '2px 8px', height: '24px', fontSize: '0.7rem' }}>✕</button>
        </div>

        {/* ML Endpoint */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
            ML Model Endpoint
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="rail-input"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder="http://localhost:8000/predict"
            />
            <button onClick={handleTest} className="sim-btn" style={{ flexShrink: 0, minWidth: '80px' }}>
              {testing ? '...' : 'Test'}
            </button>
          </div>
          {testResult && (
            <p style={{ color: testResult.ok ? '#16A34A' : '#DC2626', fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", marginTop: '4px' }}>
              {testResult.ok ? `✓ OK (${testResult.latencyMs}ms)` : `✕ ${testResult.error}`}
            </p>
          )}
          <button onClick={() => { updateSettings({ mlEndpoint: endpoint }); onClose(); }} className="sim-btn" style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}>
            Save Endpoint
          </button>
        </div>



        {/* Toggles */}
        {[
          ['Auto-Pause on Conflict', 'autoPauseOnConflict'],
          ['Show Signals on Map',    'showSignals'],
          ['Show Crossings on Map',  'showCrossings'],
          ['Sound Effects',          'soundEnabled'],
        ].map(([label, field]) => (
          <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#475569', fontSize: '0.8rem' }}>{label}</span>
            <label className="rail-toggle">
              <input
                type="checkbox"
                checked={useSimStore.getState()[field]}
                onChange={e => updateSettings({ [field]: e.target.checked })}
              />
              <div className="rail-toggle-track" />
              <div className="rail-toggle-thumb" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// Shortcuts help panel
function ShortcutsPanel({ onClose }) {
  const shortcuts = [
    ['Space',   'Pause / Resume'],
    ['+/-',     'Speed up / slow down'],
    ['M',       'Toggle metrics panel'],
    ['S',       'Add special train'],
    ['R',       'Reset simulation'],
    ['L',       'Toggle event log'],
    ['1/2/3',   'Switch rush level'],
    ['?',       'Toggle shortcuts help'],
    ['Escape',  'Close panels / drawers'],
  ];
  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      backdropFilter: 'blur(4px)', zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" style={{
        background: '#FFFFFF',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        borderRadius: '12px',
        width: '360px',
        padding: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ color: '#0F172A', fontSize: '1rem', fontWeight: 700 }}>Keyboard Shortcuts</h3>
          <button onClick={onClose} className="sim-btn" style={{ padding: '2px 8px', height: '24px', fontSize: '0.7rem' }}>✕</button>
        </div>
        {shortcuts.map(([key, action]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.06)', alignItems: 'center' }}>
            <kbd style={{
              background: '#F8FAFC',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              color: '#B45309',
              fontWeight: 'bold',
            }}>
              {key}
            </kbd>
            <span style={{ color: '#475569', fontSize: '0.8rem' }}>{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
export default function TopBar() {
  const navigate = useNavigate();
  const {
    station, rushLevel, setRushLevel,
    simTime, speed, setSpeed,
    paused, setPaused,
    resetSimulation,
    mlStatus,
    metrics, conflicts,
    toggleSettings, toggleShortcuts,
    settingsOpen, shortcutsOpen,
  } = useSimStore();

  return (
    <>
      <div className="topbar" style={{
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 16px',
        flexShrink: 0,
        zIndex: 20,
      }}>
        {/* Logo + Station */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '8px' }}>
          <span
            onClick={() => window.location.reload()}
            title="Reload Simulator"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 900,
              fontSize: '0.9rem',
              letterSpacing: '0.08em',
              color: '#B45309',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            RAILSIM ML
          </span>
          {station?.metadata && (
            <>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.75rem',
                color: '#475569',
                fontWeight: 500,
              }}>
                {station.metadata.name}
              </span>
              <span style={{
                background: 'rgba(245,158,11,0.1)',
                color: '#B45309',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 700,
              }}>
                {station.metadata.station_code}
              </span>
            </>
          )}
        </div>

        {/* Rush level */}
        <div style={{ display: 'flex', gap: '2px', background: '#E2E8F0', borderRadius: '6px', padding: '2px' }}>
          {RUSH_LEVELS.map(rl => {
            const isSelected = rushLevel === rl.key;
            const selectColor = rl.color === '#22C55E' ? '#16A34A' : rl.color === '#EF4444' ? '#DC2626' : '#D97706';
            return (
              <button
                key={rl.key}
                onClick={() => setRushLevel(rl.key)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  transition: 'all 0.15s',
                  background: isSelected ? '#FFFFFF' : 'transparent',
                  color: isSelected ? selectColor : '#475569',
                  boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
                id={`rush-${rl.key}`}
              >
                {isSelected && <span style={{ marginRight: '4px', color: selectColor }}>●</span>}
                {rl.label}
              </button>
            );
          })}
        </div>

        {/* Sim clock */}
        <SimClock simTime={simTime} />

        {/* Speed scrubber */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <span style={{ color: '#475569', fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace", marginRight: '4px' }}>
            SPD
          </span>
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`speed-pip ${speed === s ? 'active' : ''}`}
              id={`speed-${s}`}
            >
              ×{s}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ flex: 1 }} />

        {/* Health score */}
        <HealthScore metrics={metrics} conflicts={conflicts} />

        {/* ML status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: mlStatus === 'connected' ? '#16A34A' : '#DC2626',
            display: 'inline-block',
            boxShadow: `0 0 6px ${mlStatus === 'connected' ? '#16A34A' : '#DC2626'}`,
          }} />
          <span style={{ color: '#475569', fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            {mlStatus === 'connected' ? 'ML' : 'FALLBACK'}
          </span>
        </div>

        {/* Play / Pause / Start */}
        <button
          onClick={() => {
            if (!useSimStore.getState().simStarted) {
              useSimStore.getState().startSimulation();
            } else {
              setPaused(!paused);
            }
          }}
          className={`sim-btn ${paused || !useSimStore.getState().simStarted ? 'active' : ''}`}
          id="btn-pause-resume"
        >
          {!useSimStore.getState().simStarted ? '▶  Start Simulation' : (paused ? '▶  Resume' : 'Pause')}
        </button>

        {/* Menu Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            className="sim-btn" 
            onClick={() => useSimStore.setState({ menuOpen: !useSimStore.getState().menuOpen })}
            style={{ fontSize: '1.2rem', padding: '4px 10px' }}
            title="Menu"
          >
            ☰
          </button>
          {useSimStore.getState().menuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: '#FFFFFF',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              minWidth: '160px',
              zIndex: 50,
              overflow: 'hidden'
            }}>
              <button 
                onClick={() => { toggleSettings(); useSimStore.setState({ menuOpen: false }); }}
                style={{ padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#475569', borderBottom: '1px solid rgba(15, 23, 42, 0.04)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Settings
              </button>
              <button 
                onClick={() => { toggleShortcuts(); useSimStore.setState({ menuOpen: false }); }}
                style={{ padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#475569', borderBottom: '1px solid rgba(15, 23, 42, 0.04)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Help & Shortcuts
              </button>
              <button 
                onClick={() => { 
                  useSimStore.setState({ menuOpen: false }); 
                  window.location.reload();
                }}
                style={{ padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#B45309', borderBottom: '1px solid rgba(15, 23, 42, 0.04)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFFBEB'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Reload Simulator
              </button>
              <button 
                onClick={() => { 
                  useSimStore.setState({ menuOpen: false }); 
                  if (window.confirm('Reset simulation state?')) resetSimulation(); 
                }}
                style={{ padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#DC2626', borderBottom: '1px solid rgba(15, 23, 42, 0.04)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Reset State
              </button>
              <button 
                onClick={() => { 
                  useSimStore.setState({ menuOpen: false }); 
                  useSimStore.getState().exitSimulation(); // clears session so reload won't resume
                  navigate('/');
                }}
                style={{ padding: '10px 14px', textAlign: 'left', background: '#F8FAFC', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#0F172A' }}
                onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
                onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
              >
                Exit Simulator
              </button>
            </div>
          )}
        </div>
      </div>

      {settingsOpen && <SettingsPanel onClose={toggleSettings} />}
      {shortcutsOpen && <ShortcutsPanel onClose={toggleShortcuts} />}
    </>
  );
}
