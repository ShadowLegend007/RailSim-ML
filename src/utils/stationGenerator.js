export function generateRandomStation() {
  const numTracks = Math.floor(Math.random() * 10) + 3; // 3 to 12 tracks
  const cityNames = ["Springfield", "Riverton", "Oakhaven", "Metro", "Grand", "Central", "Northside", "Bayside", "Lakeside", "Sunset"];
  const suffixes = ["Junction", "Terminal", "Station", "Hub", "Central", "Crossroads"];
  
  const randomName = `${cityNames[Math.floor(Math.random() * cityNames.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  const stationCode = randomName.substring(0, 3).toUpperCase();
  
  const tracks = {};
  const platforms = {};
  const signals = {};
  
  // Decide how many platforms to generate (at least 2, up to numTracks)
  const numPlatforms = Math.max(2, Math.floor(Math.random() * numTracks) + 1);
  
  for (let i = 0; i < numTracks; i++) {
    const isMainLine = Math.random() > 0.8 && i > 0 && i < numTracks - 1; // 20% chance to be a main line
    tracks[i] = {
      "id": String(i),
      "track_id": i,
      "length": `${Math.floor(Math.random() * 800) + 200} m`,
      "type": isMainLine ? "main_line" : (Math.random() > 0.8 ? "terminal_line" : "loop_line"),
      "speed_limit": isMainLine ? "130 km/h" : "50 km/h",
      "bidirectional": Math.random() > 0.5,
      "electrified": true,
      "connections": {
        "up": i > 0 ? [i - 1] : [],
        "down": i < numTracks - 1 ? [i + 1] : []
      }
    };
    
    // Add signals for this track
    signals[`L${i}`] = { "position_from_station": "1200 m", "associated_track": i, "signal_direction": "up", "signal_type": "main" };
    signals[`R${i}`] = { "position_from_station": "1200 m", "associated_track": i, "signal_direction": "down", "signal_type": "main" };
  }
  
  // Distribute platforms randomly among the tracks
  const trackIndices = Array.from({length: numTracks}, (_, i) => i);
  trackIndices.sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < numPlatforms; i++) {
    const trackId = trackIndices[i];
    platforms[`platform${i + 1}`] = {
      "id": `platform${i + 1}`,
      "platform_length": `${Math.floor(Math.random() * 400) + 200} m`,
      "train_types": ["passenger"],
      "train_length": "24 coaches",
      "electrified": true,
      "track_id": [trackId],
      "termination": Math.random() > 0.8,
      "goods_train_termination": false,
      "max_waiting_period": "10 minute",
      "water_filling": Math.random() > 0.5,
      "platform_type": tracks[trackId].type === "terminal_line" ? "terminal" : "passthrough",
      "passenger_density": Math.random() > 0.5 ? "high" : "low",
      "junction_point": false
    };
  }

  return {
    "station": {
      "metadata": {
        "name": randomName,
        "station_code": stationCode,
        "division": stationCode,
        "station_type": numTracks > 8 ? "Junction" : "Station",
        "carshade": false,
        "locoshed": false
      },
      "tracks": tracks,
      "signals": signals,
      "platforms": platforms,
      "line_crossings": {}
    }
  };
}
