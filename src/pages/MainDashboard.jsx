import React, { useState, useEffect, useMemo } from 'react';
import { useRailwayStore } from '../store/useRailwayStore';
import { AI_RECOMMENDATIONS } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Train, AlertCircle, Clock, CheckCircle2, ArrowRight, Activity, Map, X, Bell, Plus, Zap, ArrowUpRight, History } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AlertPanel } from '../components/AlertPanel';
import { SpecialTrainScheduler } from '../components/SpecialTrainScheduler';
import Analytics from './Analytics';
import NetworkMap from './NetworkMap';
import { StationSchematic } from '../components/StationSchematic';
import { useTrainSimulation } from '../hooks/useTrainSimulation';

const ModalWrapper = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-10">
    <div className="bg-white rounded-2xl w-full h-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-600" />
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50">
        {children}
      </div>
    </div>
  </div>
);

export default function MainDashboard() {
  const { stations, activeTrains, selectedStation, setSelectedStation, isLoading, activeStationDetails, pastTrains, aiOptimization, specialTrains } = useRailwayStore();
  
  const { simulatedTrains } = useTrainSimulation(true);
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'analytics' or 'map'
  
  const station = selectedStation || (stations.length > 0 ? stations[0] : null);
  const stationTrains = station ? activeTrains.filter(t => t.destinationStation === station.name).slice(0, 15) : [];
  
  useEffect(() => {
    if (!selectedStation && stations.length > 0) {
      setSelectedStation(stations[0]);
    }
  }, [selectedStation, setSelectedStation, stations]);

  // Calculate platform status from simulatedTrains
  const getPlatformStatus = (platformId) => {
    const trainOnPlatform = simulatedTrains.find(train => train.targetPlatform === platformId);
    if (!trainOnPlatform) return 'free';

    if (trainOnPlatform.status === 'Docked') return 'occupied';
    if (trainOnPlatform.status === 'Approaching') return 'approaching';
    return 'free';
  };

  const getPlatformTrain = (platformId) => {
    return simulatedTrains.find(train => train.targetPlatform === platformId);
  };

  const platformData = useMemo(() => {
    if (!activeStationDetails || !activeStationDetails.station || !activeStationDetails.station.platforms) return [];
    const platforms = activeStationDetails.station.platforms;
    return Object.values(platforms).map(p => ({
      id: p.id,
      number: p.id.replace('platform', ''),
      length: p.platform_length,
      types: p.train_types.join(', '),
      type: p.platform_type,
      status: getPlatformStatus(p.id),
      train: getPlatformTrain(p.id)
    }));
  }, [activeStationDetails, simulatedTrains]);

  if (isLoading || !station) {
    return (
      <div className="h-screen w-full bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }



  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Train className="w-7 h-7 text-cyan-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight tracking-tight">Rail-AI Copilot</h1>
            <p className="text-xs text-slate-500 font-medium">Smart Station Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setActiveModal('analytics')} className="hidden sm:flex gap-2">
            <Activity className="w-4 h-4" /> Analytics
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveModal('map')} className="hidden sm:flex gap-2">
            <Map className="w-4 h-4" /> Network Map
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsSchedulerOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Special Train
          </Button>
          <button onClick={() => setIsAlertOpen(true)} className="relative p-2 text-slate-500 hover:text-cyan-600 hover:bg-slate-100 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        {/* Station Overview Banner */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-slate-900">
                {activeStationDetails ? activeStationDetails.station.metadata.name : station.name} Junction
              </h2>
              <Badge variant="warning" className="text-sm px-2">{activeStationDetails ? activeStationDetails.station.metadata.station_code : station.code}</Badge>
            </div>
            <p className="text-slate-500">
              {activeStationDetails ? `${activeStationDetails.station.metadata.division} Division` : station.zone} • {platformData.length || station.platforms} Platforms
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="text-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-2xl font-bold text-cyan-600">{stationTrains.length}</p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Trains</p>
            </div>
            <div className="text-center px-4 py-2 bg-rose-50 rounded-lg border border-rose-100">
              <p className="text-2xl font-bold text-rose-600">{stationTrains.filter(t => t.delayMinutes > 0).length}</p>
              <p className="text-xs text-rose-500 font-medium uppercase tracking-wider">Delayed</p>
            </div>
          </div>
        </div>

        {/* Visual Architecture */}
        <div className="mb-6">
          <Card className="shadow-sm overflow-hidden border-indigo-100">
            <CardHeader className="bg-white border-b border-indigo-100 py-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-slate-800 flex items-center gap-2 text-base">
                  <Map className="w-5 h-5 text-indigo-600" />
                  {activeStationDetails ? activeStationDetails.station.metadata.name : station.name} Station Architecture
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <StationSchematic simulatedTrains={simulatedTrains} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column 1: Live Platforms & AI Interventions */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Live Platforms */}
            <Card className="flex-1 shadow-sm">
              <CardHeader className="bg-white border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-slate-800">Live Platform Occupancy</CardTitle>
                  <div className="flex gap-3 text-sm">
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Free</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Occupied</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Overloaded</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {(platformData.length > 0 ? platformData : Array.from({ length: 5 }).map((_, i) => ({ number: i + 1, id: `platform${i+1}`, status: 'free', train: null }))).map((plat) => {
                    const platNumInt = parseInt(plat.number.replace('A', ''), 10);
                    const train = plat.train;
                    const isOccupied = plat.status === 'occupied';
                    const isApproaching = plat.status === 'approaching';
                    const isOverloaded = isOccupied && train && train.delayMinutes > 30;

                    let indicatorColor = 'bg-emerald-500';
                    let rowBg = 'bg-white';
                    if (isOccupied) {
                      indicatorColor = isOverloaded ? 'bg-rose-500' : 'bg-amber-500';
                      rowBg = isOverloaded ? 'bg-rose-50/30' : 'bg-amber-50/30';
                    } else if (isApproaching) {
                      indicatorColor = 'bg-cyan-500';
                      rowBg = 'bg-cyan-50/30';
                    }

                    return (
                      <div key={plat.id} className={`flex items-stretch ${rowBg} hover:bg-slate-50 transition-colors`}>
                        <div className={`w-1.5 ${indicatorColor}`} />
                        <div className="p-4 w-32 shrink-0 border-r border-slate-100 flex flex-col justify-center">
                          <p className="text-sm font-bold text-slate-700">Platform {plat.number}</p>
                          {plat.length && <p className="text-xs text-slate-500 mt-0.5">{plat.length}</p>}
                        </div>
                        <div className="flex-1 p-4 flex items-center justify-between">
                          {isOccupied && train ? (
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOverloaded ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                <Train className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{train.number} - {train.name}</h4>
                                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                  ETA: {new Date(train.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {train.delayMinutes > 0 && <span className="text-rose-600 font-medium ml-1 flex items-center"><Clock className="w-3 h-3 mr-1" />+{train.delayMinutes}m</span>}
                                </p>
                              </div>
                            </div>
                          ) : isApproaching && train ? (
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-cyan-100 text-cyan-600">
                                <Train className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{train.number} - {train.name}</h4>
                                <p className="text-xs text-slate-500">Approaching | ETA: {train.etaMins}m</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="text-sm font-medium">Ready for next train</span>
                            </div>
                          )}
                          {isOccupied && <Badge variant={isOverloaded ? 'danger' : 'warning'}>{isOverloaded ? 'CRITICAL' : 'BOARDING'}</Badge>}
                          {isApproaching && <Badge variant="info">APPROACHING</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI Suggested Routes */}
            <Card className="shadow-sm border-indigo-100 bg-indigo-50/30">
              <CardHeader className="bg-transparent border-b border-indigo-100/50 pb-3">
                <CardTitle className="text-indigo-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  AI Suggested Track Routes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {AI_RECOMMENDATIONS.map((rec) => (
                  <div key={rec.id} className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm flex items-start gap-4">
                    <div className="mt-0.5">
                      {rec.action === 'Reassign' ? <ArrowRight className="w-5 h-5 text-indigo-500" /> : 
                       rec.action === 'Hold' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : 
                       <ArrowUpRight className="w-5 h-5 text-emerald-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{rec.action}: {rec.type}</p>
                      <p className="text-sm text-slate-600 mt-1">{rec.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={rec.impact === 'Critical' ? 'danger' : 'info'} className="mb-1">{rec.impact}</Badge>
                      <p className="text-xs font-mono text-indigo-600 font-medium">{rec.confidence}% Conf.</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>

          {/* Column 2: Queues */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Future Trains / Incoming Queue */}
            <Card className="flex-1 shadow-sm flex flex-col max-h-[400px]">
              <CardHeader className="bg-white border-b border-slate-100 py-3 shrink-0">
                <CardTitle className="text-slate-800 flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4 text-cyan-600" /> Future Trains (Incoming)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {simulatedTrains
                    .filter(train => train.status === 'Approaching')
                    .sort((a, b) => a.etaMins - b.etaMins)
                    .map((train, idx) => (
                      <div key={train.id || `sim-${idx}`} className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-cyan-300 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <Train className="w-3.5 h-3.5 text-cyan-600" />
                            {train.number || train.name}
                          </div>
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            ETA {train.etaMins}m
                          </Badge>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                          <p className="text-xs text-slate-500">{train.name}</p>
                          <p className="text-xs font-medium text-slate-700">Target: {train.targetPlatform.replace('platform', 'PF ')}</p>
                        </div>
                        <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${Math.max(5, 100 - (Math.abs(train.position)/2000)*100)}%` }}></div>
                        </div>
                      </div>
                    ))}
                  {simulatedTrains.filter(train => train.status === 'Approaching').length === 0 && (
                    <div className="text-center p-6 text-sm text-slate-400">No approaching trains.</div>
                  )}
                  {[...stationTrains, ...specialTrains].slice(0, 5).map((train, idx) => (
                    <div key={train.id || `special-${idx}`} className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-cyan-300 transition-colors opacity-60">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          {train.isSpecial && <Zap className="w-3.5 h-3.5 text-purple-600" />}
                          {train.number || train.name}
                        </div>
                        <Badge variant={train.status === 'Delayed' ? 'danger' : train.isSpecial ? 'purple' : 'default'} className="text-[10px] px-1.5 py-0">
                          {train.status || 'Routing'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <p className="text-xs text-slate-500">{train.name}</p>
                        <p className="text-xs font-medium text-slate-700">Plat: {train.platform || 'TBD'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Past Trains */}
            <Card className="flex-1 shadow-sm flex flex-col max-h-[400px]">
              <CardHeader className="bg-white border-b border-slate-100 py-3 shrink-0">
                <CardTitle className="text-slate-800 flex items-center gap-2 text-base">
                  <History className="w-4 h-4 text-slate-500" /> Past Trains (Departed)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {pastTrains && pastTrains.length > 0 ? pastTrains.map((train) => (
                    <div key={train.id} className="p-3 bg-white border border-slate-100 rounded-lg opacity-70">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700 text-sm">{train.number}</span>
                        <span className="text-xs font-mono text-slate-500">{train.time}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-500 truncate max-w-[150px]">{train.name}</p>
                        <Badge variant="success" className="text-[10px] bg-slate-100 text-slate-500 border-slate-200">
                          {train.status}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center p-6 text-sm text-slate-400">No recently departed trains.</div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      {/* Global Modals & Overlays */}
      {isAlertOpen && <AlertPanel onClose={() => setIsAlertOpen(false)} />}
      {isSchedulerOpen && <SpecialTrainScheduler onClose={() => setIsSchedulerOpen(false)} />}
      
      {activeModal === 'analytics' && (
        <ModalWrapper title="Network Analytics & Flow" onClose={() => setActiveModal(null)}>
          <div className="p-4 md:p-8"><Analytics /></div>
        </ModalWrapper>
      )}
      
      {activeModal === 'map' && (
        <ModalWrapper title="Live Network Map" onClose={() => setActiveModal(null)}>
          <div className="w-full h-[600px]"><NetworkMap /></div>
        </ModalWrapper>
      )}
      
    </div>
  );
}
