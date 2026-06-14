import React, { useEffect } from 'react';
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
  const unresolved = conflicts.filter(c => !c.resolved).length;

  const items = [
    { label: 'Active',      value: active,                    color: '#3B82F6' },
    { label: 'Departed',    value: departed,                  color: '#22C55E' },
    { label: 'Occupancy',   value: `${metrics.occupancyPct}%`, color: metrics.occupancyPct > 80 ? '#EF4444' : '#F59E0B' },
    { label: 'Conflicts',   value: unresolved,                color: unresolved > 0 ? '#EF4444' : '#22C55E' },
    { label: 'Avg Dwell',   value: `${metrics.avgDwellTime || 0}m`, color: '#64748B' },
    { label: 'Throughput',  value: metrics.trainsHandled,     color: '#22C55E' },
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

  // Auto-restore station from session if page was reloaded mid-simulation
  useEffect(() => {
    if (!station) {
      try {
        const session = JSON.parse(sessionStorage.getItem('railsim_session') || '{}');
        if (session.simStarted) {
          // Re-load the session station
          if (session.station) {
            setStation(session.station);
          }
          
          // Only generate an initial batch if the session didn't have saved trains
          if (!session.fullTrains || session.fullTrains.queue.length === 0 && session.fullTrains.active.length === 0 && session.fullTrains.departed.length === 0) {
            const trains = generateInitialBatch(session.rushLevel || 'basic', 15, session.simTime || 0);
            enqueueTrains(trains);
          }
        }
      } catch {}
    }
  }, [station, setStation, enqueueTrains]);

  // Start simulation loop
  useSimulationLoop();

  // Keyboard shortcuts
  useKeyboardShortcuts(true);

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

      {/* FAB — Add Special Train */}
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
        <span style={{ fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>+</span>
      </button>

      {/* Overlays */}
      {/* <ToastManager /> */}
      <TrainDetailDrawer />
      {specialTrainModalOpen && <SpecialTrainModal />}
    </div>
  );
}
