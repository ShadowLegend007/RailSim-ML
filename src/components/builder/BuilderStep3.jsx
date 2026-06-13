import React, { useEffect, useState } from 'react';

const TRACK_TYPES   = ['main_line', 'loop_line', 'terminal_line'];
const DIRECTIONS    = ['up', 'down', 'both'];
const TRAIN_TYPES   = ['passenger', 'goods', 'superfast'];
const SPEED_LIMITS  = ['60 kmph', '80 kmph', '110 kmph', '130 kmph'];
const CAPACITIES    = ['Category A', 'Category B', 'Category C'];
const DENSITIES     = ['low', 'medium', 'high'];
const PLAT_TYPES    = ['passthrough', 'terminal'];

function randomTrack(id, platforms) {
  const assoc = [];
  const pid = `platform${id + 1}`;
  if (platforms[pid]) assoc.push(pid);
  return {
    id,
    type: TRACK_TYPES[Math.floor(Math.random() * TRACK_TYPES.length)],
    direction: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
    associated_platform: assoc,
    train_type: ['passenger', ...Math.random() > 0.5 ? ['goods'] : [], ...Math.random() > 0.5 ? ['superfast'] : []],
    speed_limit: SPEED_LIMITS[Math.floor(Math.random() * SPEED_LIMITS.length)],
    water_filling: Math.random() > 0.5,
    terminal: Math.random() > 0.6,
    carshade: Math.random() > 0.6,
    goods_train_termination: Math.random() > 0.7,
    passthrough: Math.random() > 0.4,
    goods_train_stop: Math.random() > 0.6,
    line_capacity: CAPACITIES[Math.floor(Math.random() * CAPACITIES.length)],
    junction_point: Math.random() > 0.5,
    carshade_line: Math.random() > 0.7,
  };
}

function randomPlatform(id) {
  const coaches = Math.floor(Math.random() * 15) + 8;
  return {
    id: `platform${id + 1}`,
    platform_length: `${coaches * 25} m`,
    train_types: ['passenger', ...Math.random() > 0.4 ? ['goods'] : [], ...Math.random() > 0.5 ? ['superfast'] : []],
    train_length: `${coaches} coaches`,
    electrified: Math.random() > 0.3,
    track_id: [id],
    termination: Math.random() > 0.6,
    goods_train_termination: Math.random() > 0.7,
    max_waiting_period: `${[10,20,30,45,60,90][Math.floor(Math.random()*6)]} minute`,
    water_filling: Math.random() > 0.5,
    platform_type: PLAT_TYPES[Math.floor(Math.random() * PLAT_TYPES.length)],
    passenger_density: DENSITIES[Math.floor(Math.random() * DENSITIES.length)],
    junction_point: Math.random() > 0.6,
  };
}

// Track editor row
function TrackRow({ track, platforms, onChange }) {
  const update = (k, v) => onChange({ ...track, [k]: v });
  const toggleType = (t) => {
    const cur = track.train_type || [];
    onChange({ ...track, train_type: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] });
  };
  const togglePlat = (pid) => {
    const cur = track.associated_platform || [];
    onChange({ ...track, associated_platform: cur.includes(pid) ? cur.filter(x => x !== pid) : [...cur, pid] });
  };
  const BoolChip = ({ label, field }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', color: track[field] ? '#22C55E' : '#475569' }}>
      <input type="checkbox" checked={!!track[field]} onChange={e => update(field, e.target.checked)} style={{ accentColor: '#22C55E' }} />
      {label}
    </label>
  );

  return (
    <div style={{
      background: '#F8FAFC',
      border: '1px solid rgba(15, 23, 42, 0.08)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          background: 'rgba(59, 130, 246, 0.1)',
          color: '#1D4ED8',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 700,
        }}>TRACK {track.id}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ color: '#64748B', fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>TYPE</label>
          <select className="rail-select" value={track.type} onChange={e => update('type', e.target.value)}>
            {TRACK_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#64748B', fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>DIRECTION</label>
          <select className="rail-select" value={track.direction} onChange={e => update('direction', e.target.value)}>
            {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#64748B', fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>SPEED LIMIT</label>
          <select className="rail-select" value={track.speed_limit} onChange={e => update('speed_limit', e.target.value)}>
            {SPEED_LIMITS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#64748B', fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>CAPACITY</label>
          <select className="rail-select" value={track.line_capacity} onChange={e => update('line_capacity', e.target.value)}>
            {CAPACITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: '#64748B', fontSize: '0.65rem', marginBottom: '6px' }}>TRAIN TYPES</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {TRAIN_TYPES.map(t => (
              <label key={t} style={{
                cursor: 'pointer', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px',
                background: track.train_type?.includes(t) ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.03)',
                color: track.train_type?.includes(t) ? '#1D4ED8' : '#64748B',
                border: '1px solid ' + (track.train_type?.includes(t) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.08)'),
              }}>
                <input type="checkbox" checked={!!track.train_type?.includes(t)} onChange={() => toggleType(t)} style={{ display: 'none' }} />
                {t}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p style={{ color: '#64748B', fontSize: '0.65rem', marginBottom: '6px' }}>PLATFORMS</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.keys(platforms).map(pid => (
              <label key={pid} style={{
                cursor: 'pointer', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px',
                background: track.associated_platform?.includes(pid) ? 'rgba(245, 158, 11, 0.1)' : 'rgba(15, 23, 42, 0.03)',
                color: track.associated_platform?.includes(pid) ? '#B45309' : '#64748B',
                border: '1px solid ' + (track.associated_platform?.includes(pid) ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.08)'),
              }}>
                <input type="checkbox" checked={!!track.associated_platform?.includes(pid)} onChange={() => togglePlat(pid)} style={{ display: 'none' }} />
                {pid.replace('platform', 'P')}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
          <BoolChip label="Junction Point"  field="junction_point" />
          <BoolChip label="Terminal"        field="terminal" />
          <BoolChip label="Passthrough"     field="passthrough" />
          <BoolChip label="Water Filling"   field="water_filling" />
          <BoolChip label="Carshade"        field="carshade" />
          <BoolChip label="Goods Termin."   field="goods_train_termination" />
        </div>
      </div>
    </div>
  );
}

// Platform editor row
function PlatformRow({ platform, onChange }) {
  const update = (k, v) => onChange({ ...platform, [k]: v });
  const toggleType = (t) => {
    const cur = platform.train_types || [];
    onChange({ ...platform, train_types: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] });
  };
  const BoolChip = ({ label, field }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', color: platform[field] ? '#10B981' : '#64748B' }}>
      <input type="checkbox" checked={!!platform[field]} onChange={e => update(field, e.target.checked)} style={{ accentColor: '#10B981' }} />
      {label}
    </label>
  );

  return (
    <div style={{
      background: '#F8FAFC',
      border: '1px solid rgba(15, 23, 42, 0.08)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          background: 'rgba(245,158,11,0.1)',
          color: '#B45309',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 700,
        }}>{platform.id.replace('platform', 'PLATFORM ')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ color: '#64748B', fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>LENGTH (m)</label>
          <input
            type="text"
            className="rail-input"
            value={platform.platform_length}
            onChange={e => update('platform_length', e.target.value)}
            placeholder="e.g. 600 m"
          />
        </div>
        <div>
          <label style={{ color: '#64748B', fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>MAX COACHES</label>
          <input
            type="text"
            className="rail-input"
            value={platform.train_length}
            onChange={e => update('train_length', e.target.value)}
            placeholder="e.g. 24 coaches"
          />
        </div>
        <div>
          <label style={{ color: '#64748B', fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>MAX WAIT</label>
          <input
            type="text"
            className="rail-input"
            value={platform.max_waiting_period}
            onChange={e => update('max_waiting_period', e.target.value)}
            placeholder="e.g. 30 minute"
          />
        </div>
        <div>
          <label style={{ color: '#64748B', fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>TYPE</label>
          <select className="rail-select" value={platform.platform_type} onChange={e => update('platform_type', e.target.value)}>
            {PLAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: '#64748B', fontSize: '0.65rem', marginBottom: '6px' }}>TRAIN TYPES</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {TRAIN_TYPES.map(t => (
              <label key={t} style={{
                cursor: 'pointer', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px',
                background: platform.train_types?.includes(t) ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.03)',
                color: platform.train_types?.includes(t) ? '#1D4ED8' : '#64748B',
                border: '1px solid ' + (platform.train_types?.includes(t) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.08)'),
              }}>
                <input type="checkbox" checked={!!platform.train_types?.includes(t)} onChange={() => toggleType(t)} style={{ display: 'none' }} />
                {t}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p style={{ color: '#64748B', fontSize: '0.65rem', marginBottom: '6px' }}>DENSITY</p>
          <select className="rail-select" style={{ width: 'auto' }} value={platform.passenger_density} onChange={e => update('passenger_density', e.target.value)}>
            {DENSITIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
          <BoolChip label="Electrified"       field="electrified" />
          <BoolChip label="Termination"       field="termination" />
          <BoolChip label="Goods Termin."     field="goods_train_termination" />
          <BoolChip label="Water Filling"     field="water_filling" />
        </div>
      </div>
    </div>
  );
}

export default function BuilderStep3({ data, update }) {
  // Initialize tracks and platforms if empty
  useEffect(() => {
    const tracks = {};
    const platforms = {};

    // Create platforms first
    for (let i = 0; i < data.num_platforms; i++) {
      const p = randomPlatform(i);
      platforms[p.id] = p;
    }

    // Create tracks, referencing platforms
    for (let i = 0; i < data.num_tracks; i++) {
      tracks[i] = randomTrack(i, platforms);
    }

    update({ tracks, platforms });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // init once

  const randomizeAllTracks = () => {
    const newTracks = {};
    Object.values(data.tracks).forEach(t => {
      newTracks[t.id] = randomTrack(t.id, data.platforms);
    });
    update({ tracks: newTracks });
  };

  const randomizeAllPlatforms = () => {
    const newPlats = {};
    Object.values(data.platforms).forEach((p, i) => {
      const r = randomPlatform(i);
      newPlats[p.id] = { ...r, id: p.id };
    });
    update({ platforms: newPlats });
  };

  const updateTrack = (id, track) => update({ tracks: { ...data.tracks, [id]: track } });
  const updatePlatform = (id, platform) => update({ platforms: { ...data.platforms, [id]: platform } });

  if (!data.tracks || Object.keys(data.tracks).length === 0) {
    return <div style={{ color: '#475569', padding: '40px', textAlign: 'center' }}>Initializing configuration...</div>;
  }

  return (
    <div>
      {/* Tracks Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#0F172A', fontWeight: 700, fontSize: '1rem' }}>
            Tracks ({data.num_tracks})
          </h3>
          <button onClick={randomizeAllTracks} className="sim-btn" style={{ color: '#F59E0B', borderColor: 'rgba(245,158,11,0.2)' }}>
            Randomize All Tracks
          </button>
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="scroll-dark">
          {Object.values(data.tracks).map(track => (
            <TrackRow key={track.id} track={track} platforms={data.platforms} onChange={t => updateTrack(track.id, t)} />
          ))}
        </div>
      </div>

      {/* Platforms Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#0F172A', fontWeight: 700, fontSize: '1rem' }}>
            Platforms ({data.num_platforms})
          </h3>
          <button onClick={randomizeAllPlatforms} className="sim-btn" style={{ color: '#F59E0B', borderColor: 'rgba(245,158,11,0.2)' }}>
            Randomize All Platforms
          </button>
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="scroll-dark">
          {Object.values(data.platforms).map(platform => (
            <PlatformRow key={platform.id} platform={platform} onChange={p => updatePlatform(platform.id, p)} />
          ))}
        </div>
      </div>
    </div>
  );
}
