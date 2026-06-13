export async function fetchDatameetStations() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/datameet/railways/master/stations.json');
    const data = await response.json();
    
    // Filter and map valid features
    const mappedStations = data.features
      .filter(f => f.geometry && f.geometry.coordinates && f.properties?.name)
      .map(f => ({
        id: f.properties.code || `STN-${Math.random().toString(36).substr(2, 9)}`,
        name: f.properties.name,
        code: f.properties.code || 'UNK',
        zone: f.properties.zone || 'IR',
        platforms: Math.floor(Math.random() * 12) + 2, // Simulated platform count
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        congestionScore: Math.floor(Math.random() * 50) + 40, // Simulated real-time load
      }));

    // For map performance, we might just return the top 500 or major ones, but let's return all and let the map handle it.
    // Actually, Leaflet with 8000 markers without clustering can lag. Let's pick 500 random or major ones.
    return mappedStations.slice(0, 800); 
  } catch (error) {
    console.error("Failed to fetch Datameet stations", error);
    return [];
  }
}

export async function fetchLiveTrainData(stations) {
  // Attempt to hit a railradar/NTES endpoint. If CORS blocks or it fails, fallback to simulation.
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const response = await fetch('https://railradar.in/api/v1/trains', { signal: controller.signal }).catch(() => null);
    clearTimeout(id);
    
    if (response && response.ok) {
       return await response.json();
    }
    throw new Error('Live API unreachable or CORS blocked');
  } catch(e) {
    console.warn("RailRadar Live API unreachable (expected in browser). Falling back to dynamic simulation using real station coordinates.");
    return generateTrainsSimulation(stations);
  }
}

function generateTrainsSimulation(stations) {
  if (!stations || stations.length === 0) return [];
  const trains = [];
  const types = ['Rajdhani', 'Shatabdi', 'Duronto', 'Express', 'Superfast', 'Vande Bharat'];
  const statuses = ['On Time', 'Delayed', 'Arriving', 'Waiting Outside'];
  
  // Pick some major stations for destinations
  const majorStations = stations.slice(0, 50);
  
  for (let i = 1; i <= 60; i++) {
    const isDelayed = Math.random() > 0.6;
    const delayMinutes = isDelayed ? Math.floor(Math.random() * 120) + 5 : 0;
    const status = isDelayed ? 'Delayed' : statuses[Math.floor(Math.random() * statuses.length)];
    const assignedPlatform = Math.floor(Math.random() * 8) + 1;
    const destination = majorStations[Math.floor(Math.random() * majorStations.length)] || stations[0];
    
    trains.push({
      id: `TRN-120${i.toString().padStart(2, '0')}`,
      number: `120${i.toString().padStart(2, '0')}`,
      name: `${destination.name} ${types[Math.floor(Math.random() * types.length)]}`,
      eta: new Date(Date.now() + Math.random() * 7200000).toISOString(),
      platform: assignedPlatform,
      delayMinutes,
      status: status,
      destinationStation: destination.name,
      priority: Math.random() > 0.8 ? 'High' : 'Normal',
      occupancy: Math.floor(Math.random() * 40) + 60,
    });
  }
  return trains;
}
