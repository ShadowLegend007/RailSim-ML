import { useState, useEffect, useRef } from 'react';
import { useRailwayStore } from '../store/useRailwayStore';

const findBestPlatform = (trainDirection, trainType, platforms, tracks, simulatedTrains) => {
  // Find which platforms are currently targeted or docked by simulated trains
  const occupiedPlatformIds = simulatedTrains
    .filter(t => t.status !== 'Departed')
    .map(t => t.targetPlatform);

  // Filter valid platforms
  const validPlatforms = Object.values(platforms).filter(p => {
    // Check train type
    if (!p.train_types.includes(trainType || 'passenger')) return false;
    
    // Check direction
    const trackId = p.track_id[0];
    const trackInfo = tracks[trackId];
    if (!trackInfo) return false;
    
    if (trackInfo.direction !== 'both' && trackInfo.direction !== trainDirection) return false;

    // Check if unoccupied
    if (occupiedPlatformIds.includes(p.id)) return false;

    return true;
  });

  // Return the first valid one, or if none, fallback to a random one just to keep simulation running
  if (validPlatforms.length > 0) {
    return validPlatforms[Math.floor(Math.random() * validPlatforms.length)];
  }
  return Object.values(platforms)[0]; 
};

export function useTrainSimulation(isActive) {
  const { activeTrains, activeStationDetails } = useRailwayStore();
  const [simTime, setSimTime] = useState(0); 
  const [simulatedTrains, setSimulatedTrains] = useState([]);
  const initialized = useRef(false);
  
  // Initialize trains in the simulation exactly once, or spawn continuously
  useEffect(() => {
    if (!activeStationDetails || initialized.current) return;
    
    const platforms = activeStationDetails.station.platforms;
    const tracks = activeStationDetails.station.tracks;

    const incoming = activeTrains.slice(0, 5).map((train, idx) => {
      const direction = idx % 2 === 0 ? 'down' : 'up';
      const startPos = direction === 'down' ? -2000 - (idx * 500) : 2000 + (idx * 500); 
      
      const targetPlatform = findBestPlatform(direction, train.type, platforms, tracks, []);
      const targetTrackId = targetPlatform.track_id[0];
      const mainTrackId = direction === 'down' ? 0 : 1;

      return {
        ...train,
        direction,
        position: startPos,
        targetPlatform: targetPlatform.id,
        targetTrackId: targetTrackId,
        mainTrackId: mainTrackId,
        trackId: mainTrackId, // Starts on main line
        speed: 25, 
        status: 'Approaching',
        dwellTicks: 0
      };
    });

    setSimulatedTrains(incoming);
    initialized.current = true;
  }, [activeTrains, activeStationDetails]);

  // Simulation Tick
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSimTime(prev => prev + 1);
      
      setSimulatedTrains(prevTrains => {
        let activeSims = prevTrains.map(train => {
          let newPos = train.position;
          let newStatus = train.status;
          let newTrackId = train.trackId;
          let newDwellTicks = train.dwellTicks || 0;

          // Movement logic based on status
          if (newStatus === 'Approaching') {
            if (train.direction === 'down') {
              newPos += train.speed;
              if (newPos >= 0) {
                newPos = 0;
                newStatus = 'Docked';
              }
            } else {
              newPos -= train.speed;
              if (newPos <= 0) {
                newPos = 0;
                newStatus = 'Docked';
              }
            }

            // Switch to target loop line at 1000m mark
            if (Math.abs(newPos) < 1000) {
              newTrackId = train.targetTrackId;
            }
          } 
          else if (newStatus === 'Docked') {
            newDwellTicks += 1;
            // Dwell for ~15 simulation ticks (150 simulated seconds)
            if (newDwellTicks > 15) {
              newStatus = 'Departing';
            }
          }
          else if (newStatus === 'Departing') {
            if (train.direction === 'down') {
              newPos += train.speed;
            } else {
              newPos -= train.speed;
            }

            // Switch back to main line at 1000m mark after station
            if (Math.abs(newPos) > 1000) {
              newTrackId = train.mainTrackId;
            }

            if (Math.abs(newPos) > 2500) {
              newStatus = 'Departed';
            }
          }

          return {
            ...train,
            position: newPos,
            status: newStatus,
            trackId: newTrackId,
            dwellTicks: newDwellTicks,
            etaMins: newStatus === 'Approaching' ? Math.ceil(Math.abs(newPos) / (train.speed * 6)) : 0
          };
        });

        // Filter out departed trains
        activeSims = activeSims.filter(t => t.status !== 'Departed');

        return activeSims;
      });
    }, 1000); 

    return () => clearInterval(interval);
  }, [isActive]);

  return {
    simTime,
    simulatedTrains
  };
}
