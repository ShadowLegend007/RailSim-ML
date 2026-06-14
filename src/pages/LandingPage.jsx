import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore';
import { generateRandomStation } from '../utils/stationGenerator';
import { generateInitialBatch } from '../utils/trainGenerator';

// ─── Animated Train SVG ───────────────────────────────────────────────────────
function AnimatedTrain() {
  return (
    <div style={{
      position: 'absolute',
      bottom: '38%',
      width: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* Track line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #F59E0B40, #F59E0B60, #F59E0B40, transparent)',
      }} />
      {/* Animated train */}
      <div style={{
        animation: 'train-pan 22s linear infinite',
        position: 'absolute',
        bottom: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
      }}>
        {/* Engine */}
        <svg width="80" height="22" viewBox="0 0 80 22" fill="none">
          <rect x="2" y="4" width="72" height="14" rx="3" fill="#1E2A3A" stroke="#F59E0B" strokeWidth="1.5"/>
          <rect x="60" y="6" width="12" height="10" rx="2" fill="#243447"/>
          <rect x="6" y="8" width="8" height="6" rx="1" fill="#0D1117"/>
          <rect x="18" y="8" width="8" height="6" rx="1" fill="#0D1117"/>
          <rect x="30" y="8" width="8" height="6" rx="1" fill="#3B82F6" opacity="0.7"/>
          <circle cx="14" cy="19" r="3" fill="#334155" stroke="#475569" strokeWidth="1"/>
          <circle cx="46" cy="19" r="3" fill="#334155" stroke="#475569" strokeWidth="1"/>
          <circle cx="66" cy="19" r="3" fill="#334155" stroke="#475569" strokeWidth="1"/>
          <rect x="72" y="8" width="6" height="6" rx="1" fill="#F59E0B" opacity="0.8"/>
        </svg>
        {/* Coaches */}
        {[...Array(6)].map((_, i) => (
          <svg key={i} width="48" height="18" viewBox="0 0 48 18" fill="none">
            <rect x="1" y="2" width="46" height="12" rx="2" fill="#1E2A3A" stroke="#243447" strokeWidth="1"/>
            <rect x="5" y="5" width="6" height="6" rx="1" fill="#0D1117"/>
            <rect x="15" y="5" width="6" height="6" rx="1" fill="#0D1117"/>
            <rect x="25" y="5" width="6" height="6" rx="1" fill="#0D1117"/>
            <rect x="35" y="5" width="6" height="6" rx="1" fill="#0D1117"/>
            <circle cx="10" cy="16" r="2.5" fill="#334155" stroke="#475569" strokeWidth="1"/>
            <circle cx="38" cy="16" r="2.5" fill="#334155" stroke="#475569" strokeWidth="1"/>
          </svg>
        ))}
      </div>
    </div>
  );
}

// ─── Scanline grid background ─────────────────────────────────────────────────
function GridBackground() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: `
        linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
      pointerEvents: 'none',
    }} />
  );
}

// ─── Stat Ticker ──────────────────────────────────────────────────────────────
function StatTicker() {
  const stats = [
    'Tracks: 10', 'Platforms: 8', 'Crossings: 27', 'Signals: 52',
    'ML Engine: READY', 'Greedy Fallback: ON', 'Rush Modes: 3',
  ];
  const [idx, setIdx] = React.useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % stats.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.7rem',
      color: '#22C55E',
      letterSpacing: '0.12em',
      opacity: 0.8,
      minHeight: '20px',
      transition: 'opacity 0.3s',
    }}>
      ▶ {stats[idx]}
    </div>
  );
}

// ─── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = React.useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#64748B', fontSize: '0.75rem' }}>
      {time.toLocaleTimeString('en-IN', { hour12: false })}
    </span>
  );
}

// ─── LandingPage ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { station, setStation, enqueueTrains, startSimulation } = useSimStore();

  const [sampleLabel, setSampleLabel] = React.useState('Click Load Sample Station to test random layouts');
  
  const loadSampleStation = () => {
    const data = generateRandomStation();
    const newStation = data.station;
    
    const trackCount = Object.keys(newStation.tracks || {}).length;
    const platformCount = Object.keys(newStation.platforms || {}).length;
    const crossingCount = Object.keys(newStation.line_crossings || {}).length;
    setSampleLabel(`Sample: ${newStation.metadata.name} · ${trackCount} Tracks · ${platformCount} Platforms`);
    
    setStation(newStation);
    const initialTrains = generateInitialBatch('basic', 20);
    enqueueTrains(initialTrains);
    startSimulation();
    // Save source so reload can restore it
    try {
      const prev = JSON.parse(sessionStorage.getItem('railsim_session') || '{}');
      sessionStorage.setItem('railsim_session', JSON.stringify({
        ...prev,
        stationSource: 'sample',
        simStarted: true,
        simTime: 0,
        rushLevel: 'basic',
      }));
    } catch {}
    navigate('/sim');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      fontFamily: "'Inter', sans-serif",
    }}>
      <GridBackground />
      <AnimatedTrain />

      {/* Top status bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '40px',
        background: 'rgba(255, 255, 255, 0.8)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <StatTicker />
        <LiveClock />
      </div>

      {/* Main hero content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        padding: '0 40px',
        maxWidth: '700px',
      }}>
        {/* Logo / Title */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            letterSpacing: '0.4em',
            color: '#F59E0B',
            textTransform: 'uppercase',
            opacity: 0.8,
          }}>
            Station Configuration → Simulation
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 'clamp(3rem, 6vw, 5rem)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #0F172A 0%, #F59E0B 60%, #D97706 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          RAILSIM ML
        </h1>

        <p style={{
          color: '#475569',
          fontSize: '1rem',
          lineHeight: '1.6',
          marginBottom: '48px',
          maxWidth: '500px',
          margin: '16px auto 48px',
        }}>
          A professional railway station simulation tool for stress-testing ML models
          for optimal train routing and platform assignment.
        </p>

        {/* Feature tags */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          marginBottom: '48px',
        }}>
          {['ML API Bridge', '3 Rush Levels', 'Live Track Map', 'Special Trains', 'Conflict Detection', 'Session Export'].map(tag => (
            <span key={tag} style={{
              padding: '4px 12px',
              borderRadius: '20px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              fontSize: '0.75rem',
              color: '#475569',
              fontFamily: "'JetBrains Mono', monospace",
              background: 'rgba(15, 23, 42, 0.03)',
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="cta-primary"
            onClick={() => navigate('/builder')}
            id="btn-build-station"
          >
            Build New Station
          </button>
          <button
            className="cta-secondary"
            onClick={loadSampleStation}
            id="btn-load-sample"
          >
            Load Sample Station
          </button>
        </div>

        {/* Sample station info */}
        <p style={{
          marginTop: '24px',
          color: '#64748B',
          fontSize: '0.75rem',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {sampleLabel}
        </p>
      </div>

      {/* Bottom decoration */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: 0, right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '32px',
      }}>
        {[
          { label: 'ML-OPTIMIZED', color: '#3B82F6' },
          { label: 'REAL-TIME', color: '#10B981' },
          { label: 'CONFLICT-AWARE', color: '#F59E0B' },
        ].map(item => (
          <span key={item.label} style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: item.color,
            opacity: 0.8,
          }}>
            ● {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
