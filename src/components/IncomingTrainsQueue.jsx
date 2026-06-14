import React from 'react';
import { useSimStore } from '../store/useSimStore';
import { generateTrain } from '../utils/trainGenerator';

const TYPE_COLORS = {
  passenger:  '#3B82F6',
  superfast:  '#22C55E',
  goods:      '#F59E0B',
  VIP:        '#EAB308',
  military:   '#65A30D',
  medical:    '#EF4444',
};

const PRIORITY_COLORS = {
  LOW:      '#475569',
  MEDIUM:   '#F59E0B',
  HIGH:     '#EF4444',
  CRITICAL: '#EF4444',
};

function TrainCard({ train, onClick }) {
  const color = TYPE_COLORS[train.train_type] || '#64748B';
  const isSpecial = train.isSpecial;
  const priority  = train._priority;

  return (
    <div
      style={{
        background: isSpecial ? 'rgba(234, 179, 8, 0.08)' : '#FFFFFF',
        border: `1px solid ${isSpecial ? 'rgba(234, 179, 8, 0.3)' : 'rgba(15, 23, 42, 0.08)'}`,
        borderRadius: '6px',
        padding: '10px',
        marginBottom: '6px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onClick={() => onClick(train)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isSpecial ? 'rgba(234, 179, 8, 0.3)' : 'rgba(15, 23, 42, 0.08)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isSpecial && (
            <span style={{
              fontSize: '0.6rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              color: '#B45309',
              background: 'rgba(245,158,11,0.1)',
              padding: '1px 5px',
              borderRadius: '3px',
              letterSpacing: '0.04em',
            }}>
              SPECIAL
            </span>
          )}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#0F172A',
          }}>
            {train.train_no}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {isSpecial && priority && (
            <span style={{
              fontSize: '0.6rem',
              padding: '1px 5px',
              borderRadius: '3px',
              background: `${PRIORITY_COLORS[priority]}15`,
              color: PRIORITY_COLORS[priority] === '#EF4444' ? '#B91C1C'
                   : PRIORITY_COLORS[priority] === '#F59E0B' ? '#B45309'
                   : '#334155',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
            }}>
              {priority}
            </span>
          )}
          <span style={{
            fontSize: '0.65rem',
            padding: '2px 6px',
            borderRadius: '3px',
            background: `${color}10`,
            color: color === '#3B82F6' ? '#1D4ED8'
                 : color === '#22C55E' ? '#047857'
                 : color === '#F59E0B' ? '#B45309'
                 : color,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
          }}>
            {train.train_type}
          </span>
        </div>
      </div>
      <p style={{ color: '#475569', fontSize: '0.7rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {train.train_name}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#B45309', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 600 }}>
          ETA: {train.train_arrival_time}
        </span>
        <span style={{ color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem' }}>
          {train.train_coaches > 0 ? `${train.train_coaches}c` : 'GOODS'}
          {train.water_filling ? ' [W]' : ''}
        </span>
      </div>
      {train._preAssignedTrack && (
        <div style={{ marginTop: '4px' }}>
          <span style={{
            color: '#047857',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            fontWeight: 600,
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            PRE-ASSIGNED: T{train._preAssignedTrack}
          </span>
        </div>
      )}
      {train.delay_mins > 0 && (
        <div style={{ marginTop: '4px' }}>
          <span style={{
            color: '#EF4444',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            fontWeight: 600,
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            +{train.delay_mins}m DELAY
          </span>
        </div>
      )}
    </div>
  );
}

export default function IncomingTrainsQueue() {
  const { trains, setSelectedElement, enqueueTrains, rushLevel, simTime, simStarted } = useSimStore();
  const queue = trains.queue || [];

  // Sort: special trains first, then by arrival time
  const sorted = [...queue].sort((a, b) => {
    if (a.isSpecial && !b.isSpecial) return -1;
    if (!a.isSpecial && b.isSpecial) return  1;
    return (a._arrivalSimMin || 0) - (b._arrivalSimMin || 0);
  });

  const handleGenerateTrain = () => {
    const newTrain = generateTrain(rushLevel, simTime, 0);
    enqueueTrains([newTrain]);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Incoming Trains
          </span>
          <span style={{
            background: 'rgba(59,130,246,0.1)',
            color: '#1D4ED8',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            padding: '1px 7px',
            borderRadius: '10px',
            fontWeight: 600,
          }}>
            {sorted.length}
          </span>
        </div>
        {simStarted && (
          <button
            onClick={handleGenerateTrain}
            title="Generate one train immediately"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: '#B45309',
              borderRadius: '5px',
              padding: '3px 10px',
              fontSize: '0.65rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; }}
          >
            + TRAIN
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }} className="scroll-dark">
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8', fontSize: '0.8rem' }}>
            No trains in queue
          </div>
        ) : (
          sorted.map(train => (
            <TrainCard
              key={train.train_no}
              train={train}
              onClick={(t) => setSelectedElement({ type: 'train', data: t })}
            />
          ))
        )}
      </div>
    </div>
  );
}
