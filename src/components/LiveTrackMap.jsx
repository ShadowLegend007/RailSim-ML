import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useSimStore } from '../store/useSimStore';

// ─── Constants ────────────────────────────────────────────────────────────────
const SVG_WIDTH = 1000;
const SVG_HEIGHT_PER_TRACK = 65;
const PADDING_TOP = 40;
const PADDING_BOTTOM = 40;

// Map sim-distance (meters from station center) to SVG X (0 to 1000)
const toX = (distM) => {
  const x = 500 + (distM / 3000) * 500;
  return Math.max(0, Math.min(1000, x));
};

// ─── Track type abbreviation ──────────────────────────────────────────────────
const typeTag = (type) => {
  if (type === 'main_line')     return 'ML';
  if (type === 'loop_line')     return 'LL';
  if (type === 'terminal_line') return 'TL';
  return '??';
};

// ─── Track colors by type ─────────────────────────────────────────────────────
const trackColor = (type) => {
  if (type === 'main_line')     return '#2563EB'; // Vibrant blue
  if (type === 'loop_line')     return '#D97706'; // Amber/orange
  if (type === 'terminal_line') return '#C2410C'; // Red-orange
  return '#64748B';
};

// ─── Train fill by type ───────────────────────────────────────────────────────
const trainFill = (train) => {
  if (!train) return '#2563EB';
  if (train.train_type === 'VIP')      return '#EAB308';
  if (train.train_type === 'military') return '#65A30D';
  if (train.train_type === 'medical')  return '#EF4444';
  if (train.train_type === 'superfast') return '#16A34A';
  if (train.train_type === 'goods')    return '#D97706';
  return '#2563EB';
};

// ─── Special badge icon ───────────────────────────────────────────────────────
const specialIcon = (type) => {
  if (type === 'VIP')      return 'VIP';
  if (type === 'military') return 'MIL';
  if (type === 'medical')  return 'MED';
  return 'SP';
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({ x, y, data }) {
  if (!data) return null;
  return (
    <div style={{
      position: 'absolute',
      left: Math.min(x + 12, window.innerWidth - 320),
      top: Math.min(y - 10, window.innerHeight - 200),
      background: '#FFFFFF',
      border: '1px solid rgba(15, 23, 42, 0.08)',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 200,
      minWidth: '220px',
      maxWidth: '320px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      pointerEvents: 'none',
    }}>
      <p style={{ color: '#B45309', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', marginBottom: '8px', fontWeight: 700 }}>
        {data.label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {Object.entries(data.content || {}).map(([k, v]) => {
          if (typeof v === 'object' || k.startsWith('_')) return null;
          return (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.7rem' }}>
              <span style={{ color: '#64748B', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span>
              <span style={{ color: '#0F172A', fontWeight: 500, textAlign: 'right' }}>{String(v)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Track Control Overlay ────────────────────────────────────────────────────
function TrackControls({ trackId, x, y, onClose }) {
  const { markMaintenance, clearMaintenance, disableTrack, enableTrack,
          maintenanceTracks, disabledTracks } = useSimStore();
  const isMaint    = maintenanceTracks.has(String(trackId));
  const isDisabled = disabledTracks.has(String(trackId));

  return (
    <div style={{
      position: 'absolute',
      left: Math.min(x, window.innerWidth - 200),
      top: Math.min(y, window.innerHeight - 180),
      background: '#FFFFFF',
      border: '1px solid rgba(15, 23, 42, 0.08)',
      borderRadius: '8px',
      padding: '10px',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      minWidth: '180px',
    }}>
      <p style={{ color: '#B45309', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px', fontWeight: 700 }}>
        Track {trackId} Controls
      </p>
      {!isMaint ? (
        <button onClick={() => { markMaintenance(trackId); onClose(); }} className="sim-btn" style={{ justifyContent: 'flex-start', fontSize: '0.75rem' }}>
          Mark Maintenance
        </button>
      ) : (
        <button onClick={() => { clearMaintenance(trackId); onClose(); }} className="sim-btn success" style={{ justifyContent: 'flex-start', fontSize: '0.75rem' }}>
          Clear Maintenance
        </button>
      )}
      {!isDisabled ? (
        <button onClick={() => { disableTrack(trackId); onClose(); }} className="sim-btn danger" style={{ justifyContent: 'flex-start', fontSize: '0.75rem' }}>
          Disable Track
        </button>
      ) : (
        <button onClick={() => { enableTrack(trackId); onClose(); }} className="sim-btn success" style={{ justifyContent: 'flex-start', fontSize: '0.75rem' }}>
          Re-enable Track
        </button>
      )}
      <button onClick={onClose} className="sim-btn" style={{ justifyContent: 'flex-start', fontSize: '0.75rem', marginTop: '4px' }}>
        Close
      </button>
    </div>
  );
}

// ─── LiveTrackMap ─────────────────────────────────────────────────────────────
export default function LiveTrackMap() {
  const {
    station, trains, simTime, trackOccupancy, maintenanceTracks, disabledTracks,
    showSignals, showCrossings, setSelectedElement,
  } = useSimStore();

  const activeTrains = trains.active || [];
  const isTrackPhysicallyOccupied = (trackId) => {
    return activeTrains.some(train => {
      if (String(train._assignedTrack) !== String(trackId)) return false;
      const duration = train.train_platform_duration ? parseInt(train.train_platform_duration) : 10;
      const totalTransitTime = duration + 10;
      const timeSinceSpawn = simTime - ((train._arrivedAt || simTime) - 5);
      const progress = timeSinceSpawn / totalTransitTime;
      return progress >= 0 && progress <= 1;
    });
  };

  const [tooltip, setTooltip]   = useState(null); // { x, y, data }
  const [controls, setControls] = useState(null); // { trackId, x, y }
  const [zoomLevel, setZoomLevel] = useState(1.0); // 0.5 = zoomed in, 2.0 = zoomed out
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // SVG-space pan offset
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 2.0;
  const ZOOM_STEP = 0.2;

  const handleZoomIn  = () => { setZoomLevel(z => Math.max(MIN_ZOOM, z - ZOOM_STEP)); };
  const handleZoomOut = () => { setZoomLevel(z => Math.min(MAX_ZOOM, z + ZOOM_STEP)); };
  const handleZoomReset = () => { setZoomLevel(1.0); setPanOffset({ x: 0, y: 0 }); };

  // Pan mouse handlers
  const svgRef = useRef(null);
  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      setZoomLevel(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
    } else if (e.deltaY > 0) {
      setZoomLevel(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
    }
  };
  const handleMouseDown = (e) => {
    // Only start panning if zoomed in
    if (zoomLevel >= 1.0) return;
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
    e.preventDefault();
  };
  const handleMouseMove = (e) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    // Scale pixel delta to SVG-space delta
    const svgEl = svgRef.current;
    const scaleX = svgEl ? (1000 * zoomLevel) / svgEl.clientWidth : 1;
    const scaleY = svgEl ? (svgEl.getBoundingClientRect().height * zoomLevel) / svgEl.clientHeight : 1;
    setPanOffset({ x: panStartRef.current.ox - dx * scaleX, y: panStartRef.current.oy - dy * scaleY });
  };
  const handleMouseUp = () => { isPanningRef.current = false; };

  // Compute zoomed+panned viewBox
  const getViewBox = (svgH) => {
    const cx = 500 + panOffset.x;
    const cy = svgH / 2 + panOffset.y;
    const w = 1000 * zoomLevel;
    const h = svgH * zoomLevel;
    const x = cx - w / 2;
    const y = cy - h / 2;
    return `${x} ${y} ${w} ${h}`;
  };

  if (!station) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
        No station loaded.
      </div>
    );
  }

  const tracks    = useMemo(() => Object.values(station.tracks || {}), [station.tracks]);
  const signals   = useMemo(() => Object.values(station.signals || {}), [station.signals]);
  const crossings = useMemo(() => Object.values(station.line_crossings || {}), [station.line_crossings]);
  const platforms = useMemo(() => Object.values(station.platforms || {}), [station.platforms]);

  const svgHeight = PADDING_TOP + tracks.length * SVG_HEIGHT_PER_TRACK + PADDING_BOTTOM;

  // Track Y-level calculator
  const trackY = useCallback((idx) => {
    return PADDING_TOP + idx * SVG_HEIGHT_PER_TRACK + SVG_HEIGHT_PER_TRACK / 2;
  }, []);

  // Helper to find the Y coordinate of the closest main line to map branches to
  const findClosestMainLineY = useCallback((yVal) => {
    const mainLines = tracks.filter(t => t.type === 'main_line');
    if (mainLines.length === 0) return yVal;
    let closestY = trackY(tracks.indexOf(mainLines[0]));
    let minDist = Math.abs(yVal - closestY);
    for (const ml of mainLines) {
      const mlY = trackY(tracks.indexOf(ml));
      if (Math.abs(yVal - mlY) < minDist) {
        minDist = Math.abs(yVal - mlY);
        closestY = mlY;
      }
    }
    return closestY;
  }, [tracks, trackY]);

  // Path string generator for SVG
  const getTrackPath = useCallback((track, idx) => {
    const yVal = trackY(idx);
    const mlY = findClosestMainLineY(yVal);

    if (track.type === 'main_line') {
      return `M -1000,${yVal} L 2000,${yVal}`;
    }
    if (track.type === 'loop_line') {
      return `M -1000,${mlY} L 120,${mlY} L 220,${yVal} L 780,${yVal} L 880,${mlY} L 2000,${mlY}`;
    }
    if (track.type === 'terminal_line') {
      return `M -1000,${mlY} L 120,${mlY} L 220,${yVal} L 750,${yVal}`;
    }
    return `M -1000,${yVal} L 2000,${yVal}`;
  }, [trackY, findClosestMainLineY]);

  // Point on path coordinate calculator
  const getPathXY = useCallback((xVal, track, idx) => {
    const yVal = trackY(idx);
    const mlY = findClosestMainLineY(yVal);

    if (track.type === 'main_line') {
      return { x: xVal, y: yVal };
    }
    if (track.type === 'loop_line') {
      if (xVal <= 120) {
        return { x: xVal, y: mlY };
      } else if (xVal <= 220) {
        const t = (xVal - 120) / 100;
        return { x: xVal, y: mlY + t * (yVal - mlY) };
      } else if (xVal <= 780) {
        return { x: xVal, y: yVal };
      } else if (xVal <= 880) {
        const t = (xVal - 780) / 100;
        return { x: xVal, y: yVal + t * (mlY - yVal) };
      } else {
        return { x: xVal, y: mlY };
      }
    }
    if (track.type === 'terminal_line') {
      if (xVal <= 120) {
        return { x: xVal, y: mlY };
      } else if (xVal <= 220) {
        const t = (xVal - 120) / 100;
        return { x: xVal, y: mlY + t * (yVal - mlY) };
      } else {
        const clampedX = Math.min(xVal, 750);
        return { x: clampedX, y: yVal };
      }
    }
    return { x: xVal, y: yVal };
  }, [trackY, findClosestMainLineY]);

  // Train direction determination
  const getTrainDir = useCallback((train, track) => {
    if (!track) return 'down';
    const trackDir = track.direction;
    if (trackDir === 'both') {
      return parseInt(train.train_no, 10) % 2 === 0 ? 'up' : 'down';
    }
    return trackDir || 'down';
  }, []);

  // Train segments calculator (Engine + 2 Coaches)
  const getTrainSegments = useCallback((p, track, idx, train) => {
    let x = 500;
    const isTerminal = track.type === 'terminal_line';
    const trainDir = train ? getTrainDir(train, track) : getTrainDir({ train_no: '0' }, track);

    if (isTerminal) {
      if (p <= 0.48) {
        const t = p / 0.48;
        x = t * 500;
      } else {
        const t = (p - 0.48) / 0.52;
        x = 500 - t * 500;
      }
    } else {
      if (trainDir === 'up') {
        if (p <= 0.48) {
          const t = p / 0.48;
          x = 1000 - t * 500;
        } else {
          const t = (p - 0.48) / 0.52;
          x = 500 - t * 500;
        }
      } else {
        if (p <= 0.48) {
          const t = p / 0.48;
          x = t * 500;
        } else {
          const t = (p - 0.48) / 0.52;
          x = 500 + t * 500;
        }
      }
    }

    const isMovingLeft = isTerminal ? (p > 0.48) : (trainDir === 'up');
    const offset1 = isMovingLeft ? 24 : -24;
    const offset2 = isMovingLeft ? 44 : -44;

    const p0 = getPathXY(x, track, idx);
    const p1 = getPathXY(x + offset1, track, idx);
    const p2 = getPathXY(x + offset2, track, idx);

    return {
      engine: p0,
      coach1: p1,
      coach2: p2,
      isMovingLeft,
    };
  }, [getTrainDir, getPathXY]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#F8FAFC',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: zoomLevel < 1.0 ? 'grab' : 'default',
      }}
      onClick={() => { setTooltip(null); setControls(null); }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        width="100%"
        viewBox={getViewBox(svgHeight)}
        style={{
          display: 'block',
          userSelect: 'none',
          padding: '10px 20px',
          height: 'auto',
          maxHeight: '100%',
          cursor: isPanningRef.current ? 'grabbing' : (zoomLevel < 1.0 ? 'grab' : 'default'),
        }}
      >
        <defs>
          <pattern id="light-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width={1000} height={svgHeight} fill="url(#light-grid)" rx="8" />

        {/* Station center vertical dashed line */}
        <line x1={500} y1={10} x2={500} y2={svgHeight - 10} stroke="rgba(217, 119, 6, 0.25)" strokeDasharray="6 6" strokeWidth="1.5" />
        <text x={506} y={8} fill="#B45309" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono" opacity="0.8">STATION CENTER</text>
        <text x={20} y={18} fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">← UP DIRECTION</text>
        <text x={980} y={18} fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="end">DOWN DIRECTION →</text>

        {/* Foot Over Bridges (FOB) - Pink overlays */}
        <g opacity="0.85">
          <rect x={430} y={24} width={20} height={svgHeight - 48} fill="rgba(236, 72, 153, 0.15)" stroke="rgba(236, 72, 153, 0.4)" strokeWidth="1" rx="2" />
          <text x={440} y={20} fill="#DB2777" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">FOB</text>
          
          <rect x={570} y={24} width={20} height={svgHeight - 48} fill="rgba(236, 72, 153, 0.15)" stroke="rgba(236, 72, 153, 0.4)" strokeWidth="1" rx="2" />
          <text x={580} y={20} fill="#DB2777" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">FOB</text>
        </g>

        {/* Platforms (Thick Brown Blocks) */}
        {platforms.map((plat) => {
          const platTrackIdxs = (plat.track_id || []).map(tid => tracks.findIndex(t => t.id === tid)).filter(idx => idx >= 0);
          if (platTrackIdxs.length === 0) return null;

          const ySum = platTrackIdxs.reduce((sum, idx) => sum + trackY(idx), 0);
          let y = ySum / platTrackIdxs.length;

          if (platTrackIdxs.length === 1) {
            y = trackY(platTrackIdxs[0]) - 16;
          }

          return (
            <g
              key={`plat-${plat.id}`}
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: { label: `Platform ${plat.id.replace('platform', '')}`, content: plat } })}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Platform block */}
              <rect x={300} y={y - 5} width={400} height={10} fill="#8B5A2B" rx="3" stroke="#5C3D1E" strokeWidth="1" />
              <text x={500} y={y + 3} fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                PLATFORM {plat.id.replace('platform', '')}
              </text>
            </g>
          );
        })}

        {/* Track lanes & paths */}
        {tracks.map((track, idx) => {
          const yVal = trackY(idx);
          const mlY = findClosestMainLineY(yVal);
          const isMaint = maintenanceTracks.has(String(track.id));
          const isDisabled = disabledTracks.has(String(track.id));
          const occ = isTrackPhysicallyOccupied(track.id);
          const pathD = getTrackPath(track, idx);

          let strokeColor = trackColor(track.type);
          if (isDisabled) strokeColor = '#94A3B8';
          else if (isMaint) strokeColor = '#D97706';
          else if (occ) strokeColor = '#EF4444'; // Red for occupied

          const statusColor = isDisabled ? '#94A3B8'
            : isMaint   ? '#D97706'
            : occ       ? '#EF4444'
            : '#16A34A';

          return (
            <g key={`track-${track.id}`} opacity={isDisabled ? 0.4 : 1}>
              {/* Track Bed (Grey backing line) */}
              <path
                d={pathD}
                fill="none"
                stroke={occ ? "rgba(239, 68, 68, 0.2)" : "#E2E8F0"}
                strokeWidth={occ ? "12" : "6"}
                strokeLinecap="round"
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* Rails (Colored overlay line) */}
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeDasharray={track.type === 'main_line' ? 'none' : '8 4'}
                strokeLinecap="round"
                style={{ transition: 'stroke 0.3s ease' }}
              />

              {/* Bumper Block for Terminal Lines */}
              {track.type === 'terminal_line' && (
                <line x1={750} y1={yVal - 8} x2={750} y2={yVal + 8} stroke={strokeColor} strokeWidth="3" strokeLinecap="square" />
              )}

              {/* Transparent Wide Path for Hover & Controls */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth="18"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    data: {
                      label: `Track ${track.id} (${track.type.replace('_', ' ')})`,
                      content: {
                        ...track,
                        status: isDisabled ? 'disabled' : isMaint ? 'maintenance' : occ ? 'occupied' : 'clear'
                      }
                    }
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setControls({ trackId: track.id, x: e.clientX, y: e.clientY });
                }}
              />

              {/* Track ID & Label Tag on Left */}
              <g transform={`translate(10, ${yVal - 10})`}>
                <rect width={55} height={18} rx="4" fill="#FFFFFF" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="1" />
                <text x={6} y={13} fill="#0F172A" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                  T{track.id}
                </text>
                <rect x={28} y={3} width={22} height={12} rx="2" fill={`${trackColor(track.type)}15`} />
                <text x={39} y={12} fill={trackColor(track.type)} fontSize="7" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                  {typeTag(track.type)}
                </text>
              </g>

              {/* Speed limit above track */}
              <text x={80} y={yVal - 14} fill="#94A3B8" fontSize="8" fontFamily="JetBrains Mono">
                {(track.speed_limit || '').replace(' kmph', '')}km/h
              </text>

              {/* Track status light on Right */}
              <circle cx={980} cy={yVal} r="5" fill={statusColor} stroke="#FFFFFF" strokeWidth="1" />
            </g>
          );
        })}

        {/* Signals */}
        {showSignals && signals.map((sig, i) => {
          const tIdx = tracks.findIndex(t => t.id === sig.associated_track);
          if (tIdx < 0) return null;
          const track = tracks[tIdx];
          const yVal = trackY(tIdx);

          const distM = parseInt((sig.position_from_station || '0').replace(/[^\d]/g, ''), 10) || 0;
          const signedDist = sig.signal_direction === 'up' ? -distM : distM;
          const x = toX(signedDist);
          const pos = getPathXY(x, track, tIdx);

          const sigColor = '#16A34A';

          return (
            <g
              key={`sig-${i}`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: { label: `Signal ${sig.signal_no || i}`, content: sig } })}
              onMouseLeave={() => setTooltip(null)}
            >
              <line x1={pos.x} y1={pos.y - 12} x2={pos.x} y2={pos.y + 12} stroke={sigColor} strokeWidth="1.5" opacity="0.6" />
              <circle cx={pos.x} cy={pos.y - 10} r="3.5" fill={sigColor} />
            </g>
          );
        })}

        {/* Line crossings */}
        {showCrossings && crossings.map((cross) => {
          const fromIdx = tracks.findIndex(t => t.id === cross.cross_between?.from?.line_id);
          const toIdx   = tracks.findIndex(t => t.id === cross.cross_between?.to?.line_id);
          if (fromIdx < 0 || toIdx < 0) return null;

          const fromTrack = tracks[fromIdx];
          const toTrack = tracks[toIdx];

          const distM = parseInt((cross.cross_point_from_station || '0').replace(/[^\d]/g, ''), 10) || 0;
          const signedDist = cross.cross_direction === 'up' ? -distM : distM;
          const x = toX(signedDist);

          const pos1 = getPathXY(x, fromTrack, fromIdx);
          const pos2 = getPathXY(x, toTrack, toIdx);

          const crossColor = cross.junction_line_crossing ? '#D97706'
            : cross.carshade_line_crossing ? '#7C3AED'
            : cross.goods_line_crossing ? '#EA580C'
            : '#64748B';

          return (
            <g
              key={`cross-${cross.cross_id}`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: { label: `Crossing ${cross.cross_id}`, content: cross } })}
              onMouseLeave={() => setTooltip(null)}
            >
              <line x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y} stroke={crossColor} strokeWidth="2.5" strokeDasharray="3 3" opacity="0.85" />
              <circle cx={(pos1.x + pos2.x) / 2} cy={(pos1.y + pos2.y) / 2} r="4" fill={crossColor} stroke="#FFFFFF" strokeWidth="1" />
            </g>
          );
        })}

        {/* Active Trains Animation */}
        {activeTrains.map(train => {
          const trackId = train._assignedTrack;
          if (trackId == null) return null;
          const track = tracks.find(t => t.id === trackId);
          if (!track) return null;

          const idx = tracks.indexOf(track);
          const yVal = trackY(idx);

          let p = (train._phys_x !== undefined ? train._phys_x : 0) / 3000;
          // No clamping, allow p < 0 for smooth sliding in

          const dir = getTrainDir(train, track);
          const segments = getTrainSegments(p, track, idx, train);
          const color = trainFill(train);

          // Calculate track angle based on engine position
          const pPrev = getPathXY(segments.engine.x - 1, track, idx);
          const pNext = getPathXY(segments.engine.x + 1, track, idx);
          let angle = Math.atan2(pNext.y - pPrev.y, pNext.x - pPrev.x) * (180 / Math.PI);

          return (
            <g
              key={train.train_no}
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'train', data: train }); }}
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: { label: `Train ${train.train_no}`, content: train } })}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Rotate the train around its engine */}
              <g transform={`translate(${segments.engine.x}, ${segments.engine.y}) rotate(${angle})`}>
                {/* Coach 2 */}
                <rect
                  x={segments.isMovingLeft ? 44 - 10 : -44 - 10}
                  y={-4}
                  width={20}
                  height={8}
                  rx="1.5"
                  fill={color}
                  opacity="0.6"
                  stroke="#FFFFFF"
                  strokeWidth="0.5"
                />
                {/* Coach 1 */}
                <rect
                  x={segments.isMovingLeft ? 24 - 10 : -24 - 10}
                  y={-4}
                  width={20}
                  height={8}
                  rx="1.5"
                  fill={color}
                  opacity="0.8"
                  stroke="#FFFFFF"
                  strokeWidth="0.5"
                />
                {/* Engine */}
                <rect
                  x={-12}
                  y={-5}
                  width={24}
                  height={10}
                  rx="2"
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth="0.5"
                />
                {/* Cabin Glass window */}
                <rect
                  x={segments.isMovingLeft ? -10 : 5}
                  y={-3}
                  width={5}
                  height={6}
                  fill="#FFFFFF"
                  opacity="0.9"
                  rx="0.5"
                />
                {/* Headlight yellow glow */}
                <circle
                  cx={segments.isMovingLeft ? -12 : 12}
                  cy={0}
                  r="1.5"
                  fill="#FBBF24"
                />
              </g>
              {/* Train No Text label above engine (unrotated) */}
              <text
                x={segments.engine.x}
                y={segments.engine.y - 12}
                fill="#0F172A"
                fontSize="8"
                fontWeight="bold"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
                style={{
                  background: '#FFFFFF',
                  paintOrder: 'stroke',
                  stroke: '#FFFFFF',
                  strokeWidth: '2px',
                  strokeLinecap: 'butt',
                  strokeLinejoin: 'miter',
                }}
              >
              {train.train_no}
              {train.isSpecial && ' [SP]'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip Overlay */}
      {tooltip && <Tooltip {...tooltip} />}

      {/* Track Controls Overlay */}
      {controls && (
        <TrackControls
          {...controls}
          onClose={() => setControls(null)}
        />
      )}

      {/* Zoom Controls */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        zIndex: 10,
      }}>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
        >+</button>
        <button
          onClick={handleZoomReset}
          title={`Reset Zoom (${Math.round((1/zoomLevel)*100)}%)`}
          style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', cursor: 'pointer', fontSize: '0.55rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
        >{Math.round((1/zoomLevel)*100)}%</button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
        >−</button>
      </div>

      {/* Schematic Map Legend */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        borderRadius: '6px',
        padding: '6px 12px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        fontSize: '0.65rem',
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <span style={{ color: '#2563EB', fontWeight: 'bold' }}>━ ML (Main)</span>
        <span style={{ color: '#D97706', fontWeight: 'bold' }}>╌ LL (Loop)</span>
        <span style={{ color: '#C2410C', fontWeight: 'bold' }}>╌ TL (Terminal)</span>
        <span style={{ color: '#16A34A', fontWeight: 'bold' }}>● Clear</span>
        <span style={{ color: '#EF4444', fontWeight: 'bold' }}>● Occupied</span>
        <span style={{ color: '#D97706', fontWeight: 'bold' }}>● Maintenance</span>
      </div>
    </div>
  );
}
