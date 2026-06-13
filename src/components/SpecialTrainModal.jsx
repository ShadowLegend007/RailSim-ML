import React, { useState } from 'react';
import { useSimStore } from '../store/useSimStore';
import { SPECIAL_TRAIN_TYPES, SPECIAL_PRIORITIES } from '../utils/trainGenerator';

const FIELD = ({ label, children, required }) => (
  <div style={{ marginBottom: '14px' }}>
    <label style={{
      display: 'block',
      color: '#64748B',
      fontSize: '0.65rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '5px',
    }}>
      {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
    </label>
    {children}
  </div>
);

export default function SpecialTrainModal() {
  const { closeSpecialModal, addSpecialTrain, station, trackOccupancy, simTime } = useSimStore();

  const [form, setForm] = useState({
    train_no:         '',
    train_name:       '',
    train_type:       'passenger',
    special_priority: 'HIGH',
    preferred_platform: '',
    preferred_track:    '',
    mode:             'pass_through', // pass_through | terminate | start
    water_filling:    false,
    arrival_time:     '',
    notes:            '',
    train_coaches:    12,
  });

  const platforms = station ? Object.keys(station.platforms || {}) : [];
  const tracks    = station ? Object.keys(station.tracks || {}) : [];

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    if (!form.train_no || !form.train_name) return;

    // Parse arrival time → sim minutes
    let arrivalSimMin = simTime + 5;
    if (form.arrival_time) {
      const [hh, mm] = form.arrival_time.split(':').map(Number);
      arrivalSimMin = (hh * 60) + mm;
    }

    // Check forced platform occupancy
    if (form.preferred_platform) {
      const occ = trackOccupancy[
        Object.values(station.platforms || {})[0]?.track_id?.[0]
      ];
      if (occ) {
        const ok = window.confirm(
          `Platform ${form.preferred_platform} may be occupied.\nOverride? (OK = Force it, Cancel = Let ML decide)`
        );
        if (!ok) {
          update('preferred_platform', '');
        }
      }
    }

    const specialTrain = {
      ...form,
      train_pass_through: form.mode === 'pass_through',
      train_terminate:    form.mode === 'terminate',
      train_start_from_here: form.mode === 'start',
      train_platform_duration: 15,
      train_stand_by_duration: 10,
      train_arrival_time: form.arrival_time || `${String(Math.floor(arrivalSimMin / 60)).padStart(2,'0')}:${String(arrivalSimMin % 60).padStart(2,'0')}`,
      train_departure_time: '',
      _arrivalSimMin: arrivalSimMin,
      _forcedPlatformId: form.preferred_platform || null,
      _forcedTrackId:    form.preferred_track    || null,
      _spawnedAt: simTime,
      next_destination: 'Special Routing',
      reverse_train_no: null,
    };

    addSpecialTrain(specialTrain);
    closeSpecialModal();
  };

  const typeIcons = {
    passenger: 'PAX', goods: 'GDS', superfast: 'SF',
    VIP: 'VIP', military: 'MIL', medical: 'MED',
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) closeSpecialModal(); }}
    >
      <div
        className="modal-panel"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          borderRadius: '12px',
          width: '580px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ color: '#B45309', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 600, marginBottom: '2px' }}>
              SPECIAL ROUTING
            </p>
            <h3 style={{ color: '#0F172A', fontWeight: 800, fontSize: '1.1rem' }}>
              Add Special Train
            </h3>
          </div>
          <button onClick={closeSpecialModal} className="sim-btn" style={{ width: '28px', height: '28px', padding: 0, justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="scroll-dark">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <FIELD label="Train Number" required>
              <input
                className="rail-input"
                placeholder="e.g. VIP-001"
                value={form.train_no}
                onChange={e => update('train_no', e.target.value)}
                id="special-train-no"
              />
            </FIELD>
            <FIELD label="Train Name" required>
              <input
                className="rail-input"
                placeholder="e.g. Presidential Express"
                value={form.train_name}
                onChange={e => update('train_name', e.target.value)}
                id="special-train-name"
              />
            </FIELD>
 
            {/* Type selector */}
            <FIELD label="Train Type" required>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SPECIAL_TRAIN_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => update('train_type', t)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '5px',
                      border: `1px solid ${form.train_type === t ? 'rgba(217,119,6,0.4)' : 'rgba(15,23,42,0.08)'}`,
                      background: form.train_type === t ? 'rgba(217,119,6,0.08)' : 'transparent',
                      color: form.train_type === t ? '#B45309' : '#475569',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {typeIcons[t]} {t}
                  </button>
                ))}
              </div>
            </FIELD>
 
            {/* Priority */}
            <FIELD label="Priority" required>
              <div style={{ display: 'flex', gap: '6px' }}>
                {SPECIAL_PRIORITIES.map(p => {
                  const pColors = { LOW: '#475569', MEDIUM: '#B45309', HIGH: '#B91C1C', CRITICAL: '#B91C1C' };
                  return (
                    <button
                      key={p}
                      onClick={() => update('special_priority', p)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '5px',
                        border: `1px solid ${form.special_priority === p ? pColors[p] : 'rgba(15,23,42,0.08)'}`,
                        background: form.special_priority === p ? `${pColors[p]}10` : 'transparent',
                        color: form.special_priority === p ? pColors[p] : '#475569',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </FIELD>
 
            <FIELD label="Preferred Platform">
              <select
                className="rail-select"
                value={form.preferred_platform}
                onChange={e => update('preferred_platform', e.target.value)}
                id="special-preferred-platform"
              >
                <option value="">ML decides</option>
                {platforms.map(p => <option key={p} value={p}>{p.replace('platform', 'Platform ')}</option>)}
              </select>
            </FIELD>
 
            <FIELD label="Preferred Track">
              <select
                className="rail-select"
                value={form.preferred_track}
                onChange={e => update('preferred_track', e.target.value)}
                id="special-preferred-track"
              >
                <option value="">ML decides</option>
                {tracks.map(t => <option key={t} value={t}>Track {t}</option>)}
              </select>
            </FIELD>
 
            <FIELD label="Coaches">
              <input
                type="number" min={0} max={30}
                className="rail-input"
                value={form.train_coaches}
                onChange={e => update('train_coaches', parseInt(e.target.value) || 0)}
              />
            </FIELD>
 
            <FIELD label="Arrival Time Override">
              <input
                type="time"
                className="rail-input"
                value={form.arrival_time}
                onChange={e => update('arrival_time', e.target.value)}
                id="special-arrival-time"
              />
            </FIELD>
          </div>
 
          {/* Mode radio */}
          <FIELD label="Mode">
            <div style={{ display: 'flex', gap: '10px' }}>
              {[['pass_through', 'Pass Through'], ['terminate', 'Terminate'], ['start', 'Start From Here']].map(([val, label]) => (
                <label key={val} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: form.mode === val ? '#B45309' : '#475569',
                  fontSize: '0.8rem',
                }}>
                  <input
                    type="radio"
                    name="mode"
                    value={val}
                    checked={form.mode === val}
                    onChange={() => update('mode', val)}
                    style={{ accentColor: '#D97706' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </FIELD>
 
          {/* Water filling toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ color: '#475569', fontSize: '0.8rem' }}>Water Filling Required</span>
            <label className="rail-toggle">
              <input type="checkbox" checked={form.water_filling} onChange={e => update('water_filling', e.target.checked)} />
              <div className="rail-toggle-track" />
              <div className="rail-toggle-thumb" />
            </label>
          </div>
 
          <FIELD label="Custom Notes">
            <textarea
              className="rail-input"
              rows={2}
              placeholder="Any special instructions or notes..."
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              style={{ resize: 'vertical', minHeight: '56px' }}
            />
          </FIELD>
        </div>
 
        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(15, 23, 42, 0.08)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          flexShrink: 0,
        }}>
          <button onClick={closeSpecialModal} className="sim-btn">Cancel</button>
          <button
            onClick={handleSubmit}
            className="cta-primary"
            id="btn-add-special-train"
            style={{ padding: '8px 24px', fontSize: '0.875rem' }}
            disabled={!form.train_no || !form.train_name}
          >
            Add to Queue
          </button>
        </div>
      </div>
    </div>
  );
}
