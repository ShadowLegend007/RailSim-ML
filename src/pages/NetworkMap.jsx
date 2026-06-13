import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useRailwayStore } from '../store/useRailwayStore';

const redIcon = L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="width:16px; height:16px; border-radius:50%; background-color:var(--color-rail-red); box-shadow: 0 0 15px var(--color-rail-red); border: 2px solid #ffffff; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

const yellowIcon = L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="width:16px; height:16px; border-radius:50%; background-color:var(--color-rail-yellow); box-shadow: 0 0 15px var(--color-rail-yellow); border: 2px solid #ffffff; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

const greenIcon = L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="width:16px; height:16px; border-radius:50%; background-color:var(--color-rail-green); box-shadow: 0 0 15px var(--color-rail-green); border: 2px solid #ffffff; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

const getStationIcon = (score) => {
  if (score > 85) return redIcon;
  if (score > 70) return yellowIcon;
  return greenIcon;
};

const trainIcon = L.divIcon({
  className: 'custom-train-icon',
  html: `<div style="width:10px; height:10px; border-radius:2px; background-color:cyan; box-shadow: 0 0 10px cyan; border: 1px solid white;"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

export default function NetworkMap() {
  const navigate = useNavigate();
  const { stations, setSelectedStation, activeTrains } = useRailwayStore();

  const handleStationClick = (station) => {
    setSelectedStation(station);
    navigate('/dashboard');
  };

  // Create mock connections between stations
  const connections = useMemo(() => {
    const lines = [];
    if (stations.length > 1) {
      for (let i = 0; i < stations.length - 1; i++) {
        lines.push([
          [stations[i].lat, stations[i].lng],
          [stations[i+1].lat, stations[i+1].lng]
        ]);
        // random cross connections
        if (i % 2 === 0 && i + 2 < stations.length) {
          lines.push([
            [stations[i].lat, stations[i].lng],
            [stations[i+2].lat, stations[i+2].lng]
          ]);
        }
      }
    }
    return lines;
  }, [stations]);

  // Create mock train positions along connections
  const trainPositions = useMemo(() => {
    const pos = [];
    if (connections.length > 0) {
      activeTrains.slice(0, 30).forEach((train, i) => {
        const line = connections[i % connections.length];
        // pseudo-random stable position
        const t = ((i + 1) * 13 % 100) / 100;
        const lat = line[0][0] + (line[1][0] - line[0][0]) * t;
        const lng = line[0][1] + (line[1][1] - line[0][1]) * t;
        pos.push({ ...train, lat, lng });
      });
    }
    return pos;
  }, [connections, activeTrains]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-6 left-6 z-[1000] max-w-sm pointer-events-none">
        <Card className="pointer-events-auto bg-white/90 backdrop-blur-xl border-slate-200 shadow-lg">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-lg text-slate-800">Live Network Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
                  Congested
                </span>
                <span className="text-slate-800 font-medium">&gt; 85%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_#eab308]"></div>
                  Moderate
                </span>
                <span className="text-slate-800 font-medium">70% - 85%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_#10b981]"></div>
                  Free
                </span>
                <span className="text-slate-800 font-medium">&lt; 70%</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200 mt-2">
                 <span className="flex items-center gap-2 text-cyan-600 font-medium">
                  <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500 shadow-[0_0_8px_cyan]"></div>
                  Trains in transit
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MapContainer 
        center={[22.5937, 78.9629]} 
        zoom={5} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* OpenRailwayMap Overlay */}
        <TileLayer
          url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>'
        />

        {/* Network connections */}
        {connections.map((line, idx) => (
          <Polyline 
            key={`line-${idx}`} 
            positions={line} 
            pathOptions={{ color: 'rgba(0,0,0,0.1)', weight: 2, dashArray: '4 4' }} 
          />
        ))}

        {/* Train Positions */}
        {trainPositions.map((train) => (
          <Marker 
            key={train.id}
            position={[train.lat, train.lng]}
            icon={trainIcon}
          >
             <Popup className="bg-white border-slate-200" closeButton={false}>
                <div className="p-1">
                  <h4 className="font-bold text-slate-800 text-xs">{train.number}</h4>
                  <p className="text-slate-500 text-[10px]">{train.name}</p>
                </div>
             </Popup>
          </Marker>
        ))}

        {/* Station Markers */}
        {stations.slice(0, 500).map((station) => (
          <Marker 
            key={station.id} 
            position={[station.lat, station.lng]}
            icon={getStationIcon(station.congestionScore)}
          >
            <Popup className="bg-white border-slate-200" closeButton={false}>
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-base truncate max-w-[130px]">{station.name}</h4>
                  <Badge variant={station.congestionScore > 85 ? 'danger' : station.congestionScore > 70 ? 'warning' : 'success'}>
                    {station.code}
                  </Badge>
                </div>
                <div className="space-y-1 mb-3">
                  <p className="text-slate-500 text-xs">Platforms: <span className="text-slate-800 font-medium">{station.platforms}</span></p>
                  <p className="text-slate-500 text-xs">Congestion: <span className="text-slate-800 font-medium">{station.congestionScore}%</span></p>
                </div>
                <button 
                  onClick={() => handleStationClick(station)}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 rounded text-sm transition-colors"
                >
                  View Dashboard
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
