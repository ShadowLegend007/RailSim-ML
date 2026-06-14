import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore';
import { useSimulationLoop } from '../hooks/useSimulationLoop';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { generateInitialBatch } from '../utils/trainGenerator';
import TopBar from '../components/TopBar';
import LiveTrackMap from '../components/LiveTrackMap';
import IncomingTrainsQueue from '../components/IncomingTrainsQueue';
import UnifiedTrainsTable from '../components/UnifiedTrainsTable';
import CongestionHeatmap from '../components/CongestionHeatmap';
import MetricsSidebar from '../components/MetricsSidebar';
import EventLog from '../components/EventLog';
import ToastManager from '../components/ToastManager';
import ConflictBanner from '../components/ConflictBanner';
import TrainDetailDrawer from '../components/TrainDetailDrawer';
import SpecialTrainModal from '../components/SpecialTrainModal';

// ─── Metrics bar (bottom of map panel) ───────────────────────────────────────
function MetricsBar() {
  const { metrics, conflicts, trains } = useSimStore();
  const active = trains.active?.length || 0;
  const departed = trains.departed?.length || 0;
  const queueTrainNos = new Set((trains.queue || []).map(t => t.train_no));
  const futureConflicts = conflicts.filter(c => !c.resolved && queueTrainNos.has(c.trainNo)).length;

  const items = [
    { label: 'Active',           value: active,                    color: '#3B82F6' },
    { label: 'Departed',         value: departed,                  color: '#22C55E' },
    { label: 'Occupancy',        value: `${metrics.occupancyPct}%`, color: metrics.occupancyPct > 80 ? '#EF4444' : '#F59E0B' },
    { label: 'Future Conflicts', value: futureConflicts,           color: futureConflicts > 0 ? '#EF4444' : '#22C55E' },
    { label: 'Solved Conflicts', value: metrics.conflictsResolved, color: '#22C55E' },
    { label: 'Throughput',       value: metrics.trainsHandled,     color: '#22C55E' },
  ];

  return (
    <div style={{
      height: '40px',
      background: '#FFFFFF',
      borderTop: '1px solid rgba(15, 23, 42, 0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 8px',
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.8rem',
              fontWeight: 700,
              color: item.color,
              lineHeight: 1,
            }}>
              {item.value}
            </span>
            <span style={{
              color: '#64748B',
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              lineHeight: 1,
              marginTop: '2px',
            }}>
              {item.label}
            </span>
          </div>
          {i < items.length - 1 && (
            <div style={{ width: '1px', height: '24px', background: 'rgba(15, 23, 42, 0.08)' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── No Station Guard ─────────────────────────────────────────────────────────
function NoStationGuard() {
  const navigate = useNavigate();
  return (
    <div style={{
      height: '100vh',
      background: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <span style={{ fontSize: '2rem', marginBottom: '8px', color: '#B45309', fontFamily: "'JetBrains Mono', monospace", fontWeight: 900 }}>RAILSIM</span>
      <h2 style={{ color: '#0F172A', fontWeight: 700 }}>No station loaded</h2>
      <p style={{ color: '#64748B' }}>Go back to the landing page to build or load a station.</p>
      <button className="cta-primary" onClick={() => navigate('/')}>
        ← Back to Landing
      </button>
    </div>
  );
}

// ─── Simulator Loading Screen ─────────────────────────────────────────────────
function SimulatorLoading() {
  return (
    <div className="simulator-loader-wrapper">
      <h2 style={{ position: 'relative', zIndex: 1 }}>INITIALIZING SIMULATOR</h2>
      <div className="infinite-track-container">
        <div className="track-mask">
          <div className="infinite-track"></div>
        </div>
        <svg className="engine-svg" width="200" height="70" viewBox="0 0 200 70" fill="none" style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
          {/* Smoke */}
          <g className="smoke-group">
            <circle className="smoke" cx="145" cy="15" r="8" fill="#64748b" style={{ animation: 'smoke-rise 1.5s ease-out infinite' }} />
            <circle className="smoke" cx="145" cy="15" r="10" fill="#94A3B8" style={{ animation: 'smoke-rise 1.6s ease-out infinite 0.3s' }} />
            <circle className="smoke" cx="145" cy="15" r="12" fill="#475569" style={{ animation: 'smoke-rise 1.8s ease-out infinite 0.7s' }} />
            <circle className="smoke" cx="145" cy="15" r="9" fill="#94A3B8" style={{ animation: 'smoke-rise 1.4s ease-out infinite 1.1s' }} />
            <circle className="smoke" cx="145" cy="15" r="11" fill="#64748b" style={{ animation: 'smoke-rise 1.7s ease-out infinite 1.4s' }} />
          </g>

          {/* Locomotive Body */}
          <path d="M 20 60 L 20 25 L 40 20 L 180 20 L 190 30 L 190 60 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="2"/>
          
          {/* Yellow Stripe */}
          <rect x="20" y="45" width="170" height="4" fill="#F59E0B" />

          {/* Cab Windows */}
          <rect x="155" y="25" width="12" height="12" rx="2" fill="#60A5FA" opacity="0.8" />
          <rect x="170" y="25" width="8" height="12" rx="1" fill="#60A5FA" opacity="0.8" />
          <polygon points="180,25 186,31 186,37 180,37" fill="#60A5FA" opacity="0.8" />

          {/* Grill / Vents */}
          <rect x="50" y="28" width="8" height="12" fill="#0F172A" />
          <rect x="62" y="28" width="8" height="12" fill="#0F172A" />
          <rect x="74" y="28" width="8" height="12" fill="#0F172A" />
          <rect x="86" y="28" width="8" height="12" fill="#0F172A" />
          
          {/* Exhaust Stack */}
          <rect x="140" y="16" width="10" height="4" fill="#0F172A" />

          {/* Underframe */}
          <rect x="25" y="60" width="160" height="6" fill="#334155" />
          
          {/* Bogie 1 (Rear) */}
          <g className="bogie">
            <rect x="35" y="60" width="40" height="10" rx="2" fill="#0F172A" />
            <g className="wheel" style={{ transformOrigin: '45px 65px' }}>
              <circle cx="45" cy="65" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
              <line x1="45" y1="60" x2="45" y2="70" stroke="#94A3B8" strokeWidth="1" />
              <line x1="40" y1="65" x2="50" y2="65" stroke="#94A3B8" strokeWidth="1" />
            </g>
            <g className="wheel" style={{ transformOrigin: '65px 65px' }}>
              <circle cx="65" cy="65" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
              <line x1="65" y1="60" x2="65" y2="70" stroke="#94A3B8" strokeWidth="1" />
              <line x1="60" y1="65" x2="70" y2="65" stroke="#94A3B8" strokeWidth="1" />
            </g>
          </g>

          {/* Bogie 2 (Front) */}
          <g className="bogie">
            <rect x="135" y="60" width="40" height="10" rx="2" fill="#0F172A" />
            <g className="wheel" style={{ transformOrigin: '145px 65px' }}>
              <circle cx="145" cy="65" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
              <line x1="145" y1="60" x2="145" y2="70" stroke="#94A3B8" strokeWidth="1" />
              <line x1="140" y1="65" x2="150" y2="65" stroke="#94A3B8" strokeWidth="1" />
            </g>
            <g className="wheel" style={{ transformOrigin: '165px 65px' }}>
              <circle cx="165" cy="65" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
              <line x1="165" y1="60" x2="165" y2="70" stroke="#94A3B8" strokeWidth="1" />
              <line x1="160" y1="65" x2="170" y2="65" stroke="#94A3B8" strokeWidth="1" />
            </g>
          </g>
          
          {/* Coupler */}
          <rect x="10" y="55" width="10" height="4" fill="#0F172A" />
          <rect x="190" y="55" width="6" height="4" fill="#0F172A" />
        </svg>
      </div>
    </div>
  );
}

// ─── SimulationDashboard ──────────────────────────────────────────────────────
export default function SimulationDashboard() {
  const {
    station,
    metricsOpen,
    eventLogOpen,
    specialTrainModalOpen,
    openSpecialModal,
    conflicts,
    setStation,
    enqueueTrains,
    rushLevel,
  } = useSimStore();

  const [isStarting, setIsStarting] = useState(true);

  // Auto-restore and simulation loop are now handled globally in App.jsx

  // Handle loading screen timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStarting(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts(true);

  if (isStarting) return <SimulatorLoading />;
  if (!station) return <NoStationGuard />;

  const hasConflicts = conflicts.some(c => !c.resolved);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      background: '#F8FAFC',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Top Bar */}
      <TopBar />

      {/* Conflict Banner (shows when active conflicts) - REMOVED */}
      {/* {hasConflicts && <ConflictBanner />} */ }

      {/* Body */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Left column: Track Map + Metrics Bar */}
        <div style={{
          flex: '1 1 60%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          borderRight: '1px solid rgba(15, 23, 42, 0.08)',
        }}>
          {/* Live Track Map */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <LiveTrackMap />
          </div>
          {/* Metrics bar */}
          <MetricsBar />
        </div>

        {/* Right column: Queue, Log, Heatmap */}
        <div style={{
          flex: '0 0 380px',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          borderRight: metricsOpen ? '1px solid rgba(15, 23, 42, 0.08)' : 'none',
        }}>
                    {/* Unified Trains Table (Queue + Active) */}
          <div style={{
            flex: '0 0 55%',
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
          }}>
            <UnifiedTrainsTable />
          </div>
          {/* Congestion heatmap */}
          <div style={{
            flex: 1,
            overflow: 'hidden',
          }}>
            <CongestionHeatmap />
          </div>
        </div>

        {/* Metrics Sidebar (collapsible, M key) */}
        {metricsOpen && <MetricsSidebar />}
      </div>

      {/* Event Log (bottom panel, L key) */}
      {eventLogOpen && <EventLog />}

      <button
        className="fab"
        onClick={openSpecialModal}
        id="fab-special-train"
        title="Add Special Train (S)"
        style={{
          bottom: eventLogOpen ? '165px' : '20px',
          transition: 'bottom 0.3s ease',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>ADD TRAIN</span>
      </button>

      {/* Overlays */}
      {/* <ToastManager /> */}
      <TrainDetailDrawer />
      {specialTrainModalOpen && <SpecialTrainModal />}
    </div>
  );
}
