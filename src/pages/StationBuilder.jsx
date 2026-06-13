import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore';
import { generateInitialBatch } from '../utils/trainGenerator';
import BuilderStep1 from '../components/builder/BuilderStep1';
import BuilderStep2 from '../components/builder/BuilderStep2';
import BuilderStep3 from '../components/builder/BuilderStep3';
import BuilderStep4 from '../components/builder/BuilderStep4';

const STEPS = ['Station Identity', 'Infrastructure', 'Track & Platform Config', 'Review & Launch'];

// ─── Progress Indicator ────────────────────────────────────────────────────────
function ProgressBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '40px' }}>
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              background: i < current ? '#10B981' : i === current ? '#F59E0B' : '#E2E8F0',
              color: i <= current ? '#FFFFFF' : '#94A3B8',
              border: i === current ? '2px solid #F59E0B' : '2px solid transparent',
              boxShadow: i === current ? '0 0 12px rgba(245,158,11,0.2)' : 'none',
              transition: 'all 0.3s',
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{
              marginTop: '6px',
              fontSize: '0.65rem',
              color: i === current ? '#F59E0B' : i < current ? '#10B981' : '#94A3B8',
              textAlign: 'center',
              fontFamily: "'Inter', sans-serif",
              fontWeight: i === current ? 600 : 400,
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1,
              height: '2px',
              background: i < current ? '#10B981' : '#E2E8F0',
              marginTop: '-18px',
              transition: 'background 0.3s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── StationBuilder ────────────────────────────────────────────────────────────
export default function StationBuilder() {
  const navigate = useNavigate();
  const { setStation, enqueueTrains, startSimulation } = useSimStore();

  const [step, setStep] = useState(0);
  const [stationData, setStationData] = useState({
    // Step 1
    name: '',
    station_code: '',
    division: '',
    station_type: 'Junction',
    // Step 2
    num_tracks: 4,
    num_platforms: 3,
    num_terminal_tracks: 0,
    has_carshade: false,
    has_water_filling: false,
    has_freight_line: false,
    terminate_terminal_line: false,
    // Step 3 — populated by wizard
    tracks: {},
    platforms: {},
  });

  const update = (patch) => setStationData(prev => ({ ...prev, ...patch }));

  const handleLaunch = () => {
    // Build final station object in the expected schema
    const station = {
      metadata: {
        name: stationData.name,
        station_code: stationData.station_code.toUpperCase(),
        division: stationData.division,
        station_type: stationData.station_type,
        carshade: stationData.has_carshade,
        water_filling: stationData.has_water_filling,
        track: stationData.num_tracks,
        terminate_terminal_line: stationData.terminate_terminal_line,
        freight_line: stationData.has_freight_line,
        platform: stationData.num_platforms,
        terminal_track: stationData.num_terminal_tracks,
      },
      tracks: stationData.tracks,
      platforms: stationData.platforms,
      signals: {},
      line_crossings: {},
    };

    setStation(station);
    const trains = generateInitialBatch('basic', 20);
    enqueueTrains(trains);
    startSimulation();
    navigate('/sim');
  };

  const canGoNext = () => {
    if (step === 0) return stationData.name && stationData.station_code && stationData.division && stationData.station_type;
    if (step === 1) return stationData.num_tracks >= 1 && stationData.num_platforms >= 1;
    return true;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: '#F59E0B',
            fontWeight: 700,
            fontSize: '1.1rem',
            letterSpacing: '0.1em',
          }}>
            RAILSIM ML
          </span>
          <span style={{ color: '#E2E8F0' }}>|</span>
          <span style={{ color: '#475569', fontSize: '0.875rem' }}>Station Builder</span>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: '1px solid #CBD5E1',
            color: '#475569',
            borderRadius: '6px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          ← Back to Landing
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <ProgressBar current={step} />

          {/* Step panel */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '12px',
            padding: '32px',
            minHeight: '400px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          }}>
            {step === 0 && <BuilderStep1 data={stationData} update={update} />}
            {step === 1 && <BuilderStep2 data={stationData} update={update} />}
            {step === 2 && <BuilderStep3 data={stationData} update={update} />}
            {step === 3 && <BuilderStep4 data={stationData} onLaunch={handleLaunch} />}
          </div>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '24px',
          }}>
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="sim-btn"
              style={{ opacity: step === 0 ? 0.4 : 1 }}
            >
              ← Back
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canGoNext()}
                className="cta-primary"
                style={{
                  padding: '10px 28px',
                  fontSize: '0.9rem',
                  opacity: canGoNext() ? 1 : 0.5,
                  cursor: canGoNext() ? 'pointer' : 'not-allowed',
                }}
              >
                Next Step →
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
