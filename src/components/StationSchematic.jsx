import React, { useMemo, useState, useEffect, useRef } from 'react';
import { RDM_STATION_DATA } from '../data/mockData';
import { useRailwayStore } from '../store/useRailwayStore';

// Map tracks to explicit Y coordinates and colors based on user's layout
const TRACK_LAYOUT = {
  0: { y: 300, color: '#22c55e', name: 'Main Down Line' }, // Green
  1: { y: 320, color: '#3b82f6', name: 'Main Up Line' },   // Blue
  2: { y: 280, color: '#94a3b8', name: 'Loop Line' },
  3: { y: 260, color: '#ef4444', name: 'Loop Line' },      // Red
  4: { y: 240, color: '#ef4444', name: 'Loop Line' },      // Red
  5: { y: 220, color: '#94a3b8', name: 'Goods Line' },
  6: { y: 340, color: '#94a3b8', name: 'Loop Line' },
  7: { y: 360, color: '#94a3b8', name: 'Loop Line' },
  8: { y: 200, color: '#94a3b8', name: 'Goods Special Line' },
  9: { y: 380, color: '#eab308', name: 'Terminal Line' },  // Yellow
};

const PLATFORM_LAYOUT = {
  platform1: { y: 380, height: 20, trackIds: [0], color: '#78350f' }, // Brown
  platform1A: { y: 400, height: 20, trackIds: [9], color: '#78350f' },
  platform2: { y: 340, height: 20, trackIds: [1], color: '#78350f' },
  platform3: { y: 280, height: 20, trackIds: [2], color: '#78350f' },
  platform4: { y: 240, height: 20, trackIds: [3], color: '#78350f' },
  platform5: { y: 220, height: 20, trackIds: [4], color: '#78350f' },
  platform6: { y: 360, height: 20, trackIds: [6], color: '#78350f' },
  platform7: { y: 380, height: 20, trackIds: [7], color: '#78350f' },
};

export function StationSchematic({ simulatedTrains = [] }) {
  // Zoom state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;
  const ZOOM_STEP = 0.2;

  const zoomIn = () => setScale(prev => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  const zoomOut = () => setScale(prev => Math.max(prev - ZOOM_STEP, MIN_SCALE));
  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTranslate({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY;
      if (delta < 0) {
        setScale(prev => Math.min(prev + ZOOM_STEP, MAX_SCALE));
      } else if (delta > 0) {
        setScale(prev => Math.max(prev - ZOOM_STEP, MIN_SCALE));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const { activeStationDetails } = useRailwayStore();
  const stationData = activeStationDetails || RDM_STATION_DATA;

  const width = 4000;
  const height = 600;

  // Convert real-world distance (-2000m to 2000m) to SVG X
  const toX = (distance) => distance + 2000;

  // Render Tracks
  const renderTracks = () => {
    return Object.values(stationData.station.tracks).map(track => {
      const layout = TRACK_LAYOUT[track.id];
      if (!layout) return null;
      return (
        <g key={`track-${track.id}`}>
          <line 
            x1={0} 
            y1={layout.y} 
            x2={width} 
            y2={layout.y} 
            stroke={layout.color} 
            strokeWidth="3" 
            strokeDasharray={track.type === 'main_line' ? "none" : "6 4"}
            opacity={0.7}
          />
          <text x={20} y={layout.y - 5} fontSize="12" fill={layout.color} opacity={0.8}>{layout.name}</text>
        </g>
      );
    });
  };

  // Render Crossings
  const renderCrossings = () => {
    return Object.values(stationData.station.line_crossings).map(cross => {
      const fromLayout = TRACK_LAYOUT[cross.cross_between.from.line_id];
      const toLayout = TRACK_LAYOUT[cross.cross_between.to.line_id];
      if (!fromLayout || !toLayout) return null;

      // Extract distance number from string e.g. "1500 m" -> 1500
      const distStr = cross.cross_point_from_station;
      let xOffset = 0;
      if (distStr) {
        const val = parseInt(distStr.replace('m', '').trim(), 10);
        // Crossings usually happen on either up or down sides. 
        // For simplicity, we distribute them left/right based on direction
        xOffset = cross.cross_direction === 'down' ? val : -val;
      }

      const xCenter = toX(xOffset);

      return (
        <line 
          key={`cross-${cross.cross_id}`}
          x1={xCenter - 40} 
          y1={fromLayout.y} 
          x2={xCenter + 40} 
          y2={toLayout.y} 
          stroke="#cbd5e1" 
          strokeWidth="2" 
        />
      );
    });
  };

  // Render Platforms
  const renderPlatforms = () => {
    return Object.values(stationData.station.platforms).map(plat => {
      const layout = PLATFORM_LAYOUT[plat.id];
      if (!layout) return null;
      
      const lengthVal = parseInt(plat.platform_length.replace('m','').trim(), 10) || 500;
      const width = lengthVal;
      const x = toX(-lengthVal / 2); // Center around 0

      return (
        <g key={`plat-${plat.id}`}>
          <rect 
            x={x} 
            y={layout.y - layout.height/2} 
            width={width} 
            height={layout.height} 
            fill={layout.color} 
            rx="4"
          />
          <text 
            x={toX(0)} 
            y={layout.y + 4} 
            fontSize="14" 
            fontWeight="bold" 
            fill="white" 
            textAnchor="middle"
          >
            {plat.id.replace('platform', 'PF ')}
          </text>
        </g>
      );
    });
  };

  // Render Trains
  const renderTrains = () => {
    return simulatedTrains.map(train => {
      const layout = TRACK_LAYOUT[train.trackId];
      if (!layout) return null;

      const trainX = toX(train.position);
      const trainLen = 120; // visual train length

      return (
        <g key={`train-${train.id}`} className="transition-all duration-1000 ease-linear">
          <rect 
            x={trainX - (train.direction === 'up' ? trainLen : 0)} 
            y={layout.y - 6} 
            width={trainLen} 
            height={12} 
            fill="#0ea5e9" 
            rx="3"
          />
          <text 
            x={trainX - (train.direction === 'up' ? trainLen/2 : -trainLen/2)} 
            y={layout.y - 10} 
            fontSize="12" 
            fontWeight="bold" 
            fill="#0f172a" 
            textAnchor="middle"
          >
            {train.number}
          </text>
        </g>
      );
    });
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full overflow-hidden bg-slate-50 border border-slate-200 rounded-xl shadow-inner relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 flex gap-1 bg-white/80 backdrop-blur-sm p-1 rounded shadow z-10">
          <button onClick={zoomIn} className="px-2 py-1 text-xs bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors cursor-pointer">Zoom In</button>
          <button onClick={zoomOut} className="px-2 py-1 text-xs bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors cursor-pointer">Zoom Out</button>
          <button onClick={resetZoom} className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors cursor-pointer">Reset</button>
        </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[1200px] w-full h-auto select-none"
        preserveAspectRatio="xMidYMid meet"
        style={{ 
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, 
          transformOrigin: '0 0',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <defs>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Center Line (Station marker) */}
        <line x1={toX(0)} y1={0} x2={toX(0)} y2={height} stroke="#cbd5e1" strokeDasharray="10 10" strokeWidth="2" />
        <text x={toX(0) + 10} y={40} fill="#64748b" fontWeight="bold">Station Center</text>
        <text x={toX(-1000)} y={40} fill="#64748b">-1km</text>
        <text x={toX(1000)} y={40} fill="#64748b">+1km</text>
        <text x={toX(-2000) + 20} y={40} fill="#64748b">2km (Outer Signal)</text>
        <text x={toX(2000) - 150} y={40} fill="#64748b">2km (Outer Signal)</text>

        {renderCrossings()}
        {renderTracks()}
        {renderPlatforms()}
        {renderTrains()}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg border border-slate-200 shadow-sm text-xs space-y-2 backdrop-blur">
        <h4 className="font-bold text-slate-700 mb-2">Track Legend</h4>
        <div className="flex items-center gap-2"><div className="w-4 h-1 bg-green-500"></div> Main Down</div>
        <div className="flex items-center gap-2"><div className="w-4 h-1 bg-blue-500"></div> Main Up</div>
        <div className="flex items-center gap-2"><div className="w-4 h-1 border-b-2 border-dashed border-red-500"></div> Loop Line</div>
        <div className="flex items-center gap-2"><div className="w-4 h-1 border-b-2 border-dashed border-slate-400"></div> Goods/Special</div>
        <div className="flex items-center gap-2"><div className="w-4 h-3 bg-amber-900 rounded-sm"></div> Platform</div>
      </div>
    </div>
  );
}
