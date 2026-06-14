import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import StationBuilder from './pages/StationBuilder';
import SimulationDashboard from './pages/SimulationDashboard';
import ThankYou from './pages/ThankYou';

import { generateInitialBatch } from './utils/trainGenerator';
import { useSimStore } from './store/useSimStore';
import { useSimulationLoop } from './hooks/useSimulationLoop';

// ─── Screen Guard (min 1280px) ────────────────────────────────────────────────
function ScreenGuard({ children }) {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (width < 1280) {
    return (
      <div className="screen-blocker">
        <div style={{ marginBottom: '24px' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '2rem',
          fontWeight: 900,
          color: '#F59E0B',
          letterSpacing: '0.1em',
        }}>RAILSIM</span>
      </div>
        <h1 style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '1.5rem',
          color: '#F59E0B',
          marginBottom: '16px',
          letterSpacing: '0.1em',
        }}>
          RAILSIM ML
        </h1>
        <p style={{
          color: '#64748B',
          fontSize: '1rem',
          maxWidth: '400px',
          lineHeight: '1.6',
          fontFamily: "'Inter', sans-serif",
        }}>
          RailSim ML requires a minimum screen width of <strong style={{ color: '#F1F5F9' }}>1280px</strong>.
          <br />Please open on a desktop or laptop.
        </p>
        <p style={{
          marginTop: '24px',
          color: '#334155',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
        }}>
          Current width: {width}px
        </p>
      </div>
    );
  }

  return children;
}

// ─── Global Simulation Runner ─────────────────────────────────────────────────
function GlobalSimulation() {
  const { station, setStation, enqueueTrains } = useSimStore();
  
  useEffect(() => {
    if (!station) {
      try {
        const session = JSON.parse(sessionStorage.getItem('railsim_session') || '{}');
        if (session.simStarted) {
          if (session.station) setStation(session.station);
          if (!session.fullTrains || (session.fullTrains.queue.length === 0 && session.fullTrains.active.length === 0 && session.fullTrains.departed.length === 0)) {
            const trains = generateInitialBatch(session.rushLevel || 'basic', 15, session.simTime || 0);
            enqueueTrains(trains);
          }
        }
      } catch {}
    }
  }, [station, setStation, enqueueTrains]);

  useSimulationLoop();

  return null;
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ScreenGuard>
      <GlobalSimulation />
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<LandingPage />} />
          <Route path="/builder" element={<StationBuilder />} />
          <Route path="/sim"     element={<SimulationDashboard />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ScreenGuard>
  );
}

export default App;
