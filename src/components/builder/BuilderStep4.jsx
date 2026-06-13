import React, { useState } from 'react';

function StatCard({ label, value, color = '#475569' }) {
  return (
    <div style={{
      background: '#F8FAFC',
      border: '1px solid rgba(15, 23, 42, 0.08)',
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center',
    }}>
      <p style={{ color, fontSize: '1.75rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
      <p style={{ color: '#64748B', fontSize: '0.7rem', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
    </div>
  );
}

export default function BuilderStep4({ data, onLaunch }) {
  const [jsonOpen, setJsonOpen] = useState(false);

  const station = {
    metadata: {
      name: data.name,
      station_code: data.station_code,
      division: data.division,
      station_type: data.station_type,
      carshade: data.has_carshade,
      water_filling: data.has_water_filling,
      track: data.num_tracks,
      terminate_terminal_line: data.terminate_terminal_line,
      freight_line: data.has_freight_line,
      platform: data.num_platforms,
      terminal_track: data.num_terminal_tracks,
    },
    tracks: data.tracks,
    platforms: data.platforms,
  };

  // Report card stats
  const tracks = Object.values(data.tracks || {});
  const platforms = Object.values(data.platforms || {});

  const catACount     = tracks.filter(t => t.line_capacity === 'Category A').length;
  const catBCount     = tracks.filter(t => t.line_capacity === 'Category B').length;
  const junctionCount = tracks.filter(t => t.junction_point).length;
  const passengerPlats = platforms.filter(p => p.train_types?.includes('passenger')).length;
  const highDensity    = platforms.filter(p => p.passenger_density === 'high').length;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ station }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.station_code || 'station'}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2 style={{ color: '#0F172A', fontSize: '1.25rem', marginBottom: '4px', fontWeight: 700 }}>
        Review & Launch
      </h2>
      <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '24px' }}>
        Confirm your station configuration before launching the simulation.
      </p>

      {/* Station header */}
      <div style={{
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: '10px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '1.5rem',
          fontWeight: 900,
          color: '#B45309',
          letterSpacing: '0.05em',
        }}>STN</span>
        <div>
          <h3 style={{ color: '#0F172A', fontSize: '1.4rem', fontWeight: 800 }}>{data.name}</h3>
          <p style={{ color: '#B45309', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', letterSpacing: '0.1em' }}>
            {data.station_code} · {data.station_type} · {data.division}
          </p>
        </div>
      </div>

      {/* Report card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Total Tracks"    value={data.num_tracks}    color="#3B82F6" />
        <StatCard label="Cat A + B"       value={`${catACount}+${catBCount}`} color="#10B981" />
        <StatCard label="Platforms"       value={data.num_platforms} color="#F59E0B" />
        <StatCard label="Passenger Plats" value={passengerPlats}     color="#3B82F6" />
        <StatCard label="Junction Points" value={junctionCount}      color="#F59E0B" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="High Density Plats" value={highDensity}  color="#EF4444" />
        <StatCard label="Terminal Tracks"    value={data.num_terminal_tracks || 0} color="#64748B" />
        <StatCard label="Carshade"           value={data.has_carshade ? 'YES' : 'NO'} color={data.has_carshade ? '#10B981' : '#64748B'} />
      </div>

      {/* JSON collapsible */}
      <div style={{ marginBottom: '28px' }}>
        <button
          onClick={() => setJsonOpen(o => !o)}
          className="sim-btn"
          style={{ marginBottom: '8px', width: '100%', justifyContent: 'space-between' }}
        >
          <span>Station JSON Configuration</span>
          <span>{jsonOpen ? '▲' : '▼'}</span>
        </button>
        {jsonOpen && (
          <pre style={{
            background: '#F8FAFC',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '6px',
            padding: '16px',
            color: '#047857',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            maxHeight: '240px',
            overflowY: 'auto',
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}>
            {JSON.stringify(station, null, 2)}
          </pre>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={exportJSON} className="sim-btn" id="btn-export-json">
          Export JSON
        </button>
        <button
          onClick={onLaunch}
          className="cta-primary"
          id="btn-launch-simulation"
          style={{ padding: '12px 36px', fontSize: '1rem' }}
        >
          Launch Simulation
        </button>
      </div>
    </div>
  );
}
