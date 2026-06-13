import { create } from 'zustand';
import { useSimStore } from './useSimStore';

export const useRailwayStore = create((set) => ({
  selectedStation: null,
  stations: [],
  activeTrains: [],
  alerts: [],
  isLoading: true,
  
  // New States
  specialTrains: [],
  aiOptimization: null,
  activeStationDetails: null,
  pastTrains: [],
  
  setSelectedStation: (station) => set({ selectedStation: station }),
  setStations: (stations) => set({ stations }),
  setActiveTrains: (trains) => set({ activeTrains: trains }),
  setAlerts: (alerts) => set({ alerts }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // New Setters
  addSpecialTrain: (train) => set((state) => ({
    specialTrains: [...state.specialTrains, {
      ...train,
      // Ensure special trains enter the queue with a 10‑minute buffer from now
      _arrivalSimMin: Math.floor(useSimStore.getState().simTime) + 10,
    }]
  })),
  setAiOptimization: (results) => set({ aiOptimization: results }),
  setActiveStationDetails: (details) => set({ activeStationDetails: details }),
  setPastTrains: (trains) => set({ pastTrains: trains }),
  
  // Real-time actions mock
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 50) })),
  updateTrainDelay: (trainId, delayMins) => set((state) => ({
    activeTrains: state.activeTrains.map(t => t.id === trainId ? { ...t, delayMinutes: delayMins, status: delayMins > 0 ? 'Delayed' : 'On Time' } : t)
  })),
}));

