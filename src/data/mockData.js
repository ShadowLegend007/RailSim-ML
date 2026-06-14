// ─── RDM Sample Station Data ──────────────────────────────────────────────────
// Used by "Load Sample Station" on the landing page.
// This is the Random (RDM) Junction — a realistic test station with:
// 10 tracks, 8 platforms, 27 line crossings, 52 signals.

export const RDM_STATION_DATA = {
  "station": {
    "metadata": {
      "name": "Random",
      "station_code": "RDM",
      "division": "RDM",
      "station_type": "Junction",
      "carshade": true,
      "water_filling": true,
      "track": 10,
      "terminate_terminal_line": true,
      "freight_line": true,
      "platform": 6,
      "terminal_track": 2
    },
    "tracks": {
      "0": { "id": 0, "type": "main_line",     "direction": "down", "associated_platform": ["platform1"],  "train_type": ["passenger","goods","superfast"], "speed_limit": "130 kmph", "water_filling": true,  "terminal": false, "carshade": false, "goods_train_termination": false, "passthrough": true,  "goods_train_stop": false, "line_capacity": "Category A", "junction_point": true,  "carshade_line": false },
      "1": { "id": 1, "type": "main_line",     "direction": "up",   "associated_platform": ["platform2"],  "train_type": ["passenger","goods","superfast"], "speed_limit": "130 kmph", "water_filling": true,  "terminal": false, "carshade": true,  "goods_train_termination": false, "passthrough": true,  "goods_train_stop": false, "line_capacity": "Category A", "junction_point": false, "carshade_line": true  },
      "2": { "id": 2, "type": "loop_line",     "direction": "both", "associated_platform": ["platform3"],  "train_type": ["passenger","goods","superfast"], "speed_limit": "130 kmph", "water_filling": false, "terminal": false, "carshade": true,  "goods_train_termination": false, "passthrough": true,  "goods_train_stop": true,  "line_capacity": "Category A", "junction_point": true,  "carshade_line": true  },
      "3": { "id": 3, "type": "loop_line",     "direction": "both", "associated_platform": ["platform4"],  "train_type": ["passenger","goods"],            "speed_limit": "110 kmph", "water_filling": false, "terminal": true,  "carshade": true,  "goods_train_termination": false, "passthrough": true,  "goods_train_stop": true,  "line_capacity": "Category B", "junction_point": false, "carshade_line": true  },
      "4": { "id": 4, "type": "loop_line",     "direction": "both", "associated_platform": ["platform5"],  "train_type": ["passenger","goods"],            "speed_limit": "110 kmph", "water_filling": false, "terminal": true,  "carshade": true,  "goods_train_termination": true,  "passthrough": true,  "goods_train_stop": true,  "line_capacity": "Category B", "junction_point": true,  "carshade_line": true  },
      "5": { "id": 5, "type": "loop_line",     "direction": "both", "associated_platform": [],            "train_type": ["goods"],                        "speed_limit": "110 kmph", "water_filling": false, "terminal": false, "carshade": true,  "goods_train_termination": true,  "passthrough": false, "goods_train_stop": true,  "line_capacity": "Category B", "junction_point": true,  "carshade_line": true  },
      "6": { "id": 6, "type": "loop_line",     "direction": "both", "associated_platform": ["platform6"],  "train_type": ["passenger","goods"],            "speed_limit": "110 kmph", "water_filling": false, "terminal": true,  "carshade": true,  "goods_train_termination": false, "passthrough": true,  "goods_train_stop": true,  "line_capacity": "Category B", "junction_point": false, "carshade_line": true  },
      "7": { "id": 7, "type": "loop_line",     "direction": "both", "associated_platform": ["platform7"],  "train_type": ["passenger","goods"],            "speed_limit": "110 kmph", "water_filling": false, "terminal": true,  "carshade": true,  "goods_train_termination": false, "passthrough": false, "goods_train_stop": true,  "line_capacity": "Category B", "junction_point": true,  "carshade_line": true  },
      "8": { "id": 8, "type": "loop_line",     "direction": "both", "associated_platform": [],            "train_type": ["goods"],                        "speed_limit": "110 kmph", "water_filling": false, "terminal": true,  "carshade": false, "goods_train_termination": true,  "passthrough": false, "goods_train_stop": true,  "line_capacity": "Category B", "junction_point": false, "carshade_line": false },
      "9": { "id": 9, "type": "terminal_line", "direction": "up",   "associated_platform": ["platform1A"], "train_type": ["passenger"],                    "speed_limit": "110 kmph", "water_filling": true,  "terminal": true,  "carshade": false, "goods_train_termination": false, "passthrough": false, "goods_train_stop": false, "line_capacity": "Category B", "junction_point": false, "carshade_line": false }
    },
    "signals": {
      "L11A":  { "position_from_station": "1600 m", "associated_track": 1, "signal_direction": "up",   "signal_type": "main" },
      "L12A":  { "position_from_station": "1400 m", "associated_track": 0, "signal_direction": "up",   "signal_type": "main" },
      "L31A":  { "position_from_station": "1326 m", "associated_track": 1, "signal_direction": "up",   "signal_type": "main" },
      "L32A":  { "position_from_station": "1126 m", "associated_track": 0, "signal_direction": "up",   "signal_type": "main" },
      "L41A":  { "position_from_station": "619 m",  "associated_track": 3, "signal_direction": "up",   "signal_type": "main" },
      "L42A":  { "position_from_station": "419 m",  "associated_track": 2, "signal_direction": "up",   "signal_type": "main" },
      "L51A":  { "position_from_station": "2618 m", "associated_track": 8, "signal_direction": "down", "signal_type": "main" },
      "L52A":  { "position_from_station": "2418 m", "associated_track": 1, "signal_direction": "down", "signal_type": "main" },
      "L61A":  { "position_from_station": "322 m",  "associated_track": 6, "signal_direction": "down", "signal_type": "main" },
      "L62A":  { "position_from_station": "122 m",  "associated_track": 0, "signal_direction": "down", "signal_type": "main" },
      "L71A":  { "position_from_station": "1152 m", "associated_track": 1, "signal_direction": "up",   "signal_type": "main" },
      "L72A":  { "position_from_station": "952 m",  "associated_track": 3, "signal_direction": "up",   "signal_type": "main" }
    },
    "platforms": {
      "platform1":  { "id": "platform1",  "platform_length": "850 m",  "train_types": ["passenger","goods","superfast"], "train_length": "30 coaches", "electrified": true, "track_id": [0], "termination": false, "goods_train_termination": false, "max_waiting_period": "10 minute", "water_filling": true,  "platform_type": "passthrough", "passenger_density": "high",   "junction_point": false },
      "platform2":  { "id": "platform2",  "platform_length": "850 m",  "train_types": ["passenger","goods","superfast"], "train_length": "30 coaches", "electrified": true, "track_id": [1], "termination": false, "goods_train_termination": false, "max_waiting_period": "10 minute", "water_filling": true,  "platform_type": "passthrough", "passenger_density": "high",   "junction_point": true  },
      "platform3":  { "id": "platform3",  "platform_length": "850 m",  "train_types": ["passenger","goods","superfast"], "train_length": "30 coaches", "electrified": true, "track_id": [2], "termination": true,  "goods_train_termination": false, "max_waiting_period": "30 minute", "water_filling": false, "platform_type": "passthrough", "passenger_density": "medium", "junction_point": true  },
      "platform4":  { "id": "platform4",  "platform_length": "550 m",  "train_types": ["passenger","goods","superfast"], "train_length": "20 coaches", "electrified": true, "track_id": [3], "termination": true,  "goods_train_termination": true,  "max_waiting_period": "50 minute", "water_filling": false, "platform_type": "passthrough", "passenger_density": "medium", "junction_point": false },
      "platform5":  { "id": "platform5",  "platform_length": "550 m",  "train_types": ["passenger","goods"],            "train_length": "20 coaches", "electrified": true, "track_id": [4], "termination": true,  "goods_train_termination": false, "max_waiting_period": "90 minute", "water_filling": false, "platform_type": "passthrough", "passenger_density": "low",    "junction_point": true  },
      "platform6":  { "id": "platform6",  "platform_length": "450 m",  "train_types": ["passenger","goods"],            "train_length": "15 coaches", "electrified": true, "track_id": [6], "termination": true,  "goods_train_termination": false, "max_waiting_period": "90 minute", "water_filling": false, "platform_type": "passthrough", "passenger_density": "low",    "junction_point": true  },
      "platform7":  { "id": "platform7",  "platform_length": "550 m",  "train_types": ["passenger","goods"],            "train_length": "15 coaches", "electrified": true, "track_id": [7], "termination": false, "goods_train_termination": false, "max_waiting_period": "90 minute", "water_filling": false, "platform_type": "passthrough", "passenger_density": "high",   "junction_point": false },
      "platform1A": { "id": "platform1A", "platform_length": "450 m",  "train_types": ["passenger"],                    "train_length": "12 coaches", "electrified": true, "track_id": [9], "termination": true,  "goods_train_termination": false, "max_waiting_period": "90 minute", "water_filling": true,  "platform_type": "terminal",    "passenger_density": "medium", "junction_point": true  }
    },
    "line_crossings": {
      "crossing1":  { "cross_id": 1,  "cross_direction": "up",   "cross_between": { "from": { "line_id": 1 }, "to": { "line_id": 0 } }, "signal_no": ["L11A","L12A"],   "cross_point_from_station": "1500 m", "junction_line_crossing": true,  "carshade_line_crossing": false, "terminal_line_crossing": true,  "goods_line_crossing": false },
      "crossing2":  { "cross_id": 2,  "cross_direction": "up",   "cross_between": { "from": { "line_id": 1 }, "to": { "line_id": 2 } }, "signal_no": ["L21A","L22A"],   "cross_point_from_station": "1200 m", "junction_line_crossing": false, "carshade_line_crossing": true,  "terminal_line_crossing": true,  "goods_line_crossing": false },
      "crossing3":  { "cross_id": 3,  "cross_direction": "up",   "cross_between": { "from": { "line_id": 1 }, "to": { "line_id": 0 } }, "signal_no": ["L31A","L32A"],   "cross_point_from_station": "1226 m", "junction_line_crossing": false, "carshade_line_crossing": false, "terminal_line_crossing": true,  "goods_line_crossing": true  },
      "crossing4":  { "cross_id": 4,  "cross_direction": "up",   "cross_between": { "from": { "line_id": 3 }, "to": { "line_id": 2 } }, "signal_no": ["L41A","L42A"],   "cross_point_from_station": "519 m",  "junction_line_crossing": true,  "carshade_line_crossing": false, "terminal_line_crossing": false, "goods_line_crossing": true  },
      "crossing5":  { "cross_id": 5,  "cross_direction": "down", "cross_between": { "from": { "line_id": 8 }, "to": { "line_id": 1 } }, "signal_no": ["L51A","L52A"],   "cross_point_from_station": "2518 m", "junction_line_crossing": true,  "carshade_line_crossing": true,  "terminal_line_crossing": false, "goods_line_crossing": true  },
      "crossing6":  { "cross_id": 6,  "cross_direction": "down", "cross_between": { "from": { "line_id": 6 }, "to": { "line_id": 0 } }, "signal_no": ["L61A","L62A"],   "cross_point_from_station": "222 m",  "junction_line_crossing": false, "carshade_line_crossing": true,  "terminal_line_crossing": true,  "goods_line_crossing": false }
    }
  }
};

export const CITY_STATION_DATA = {
  "station": {
    "metadata": {
      "name": "City Terminal",
      "station_code": "CTY",
      "division": "CTY",
      "station_type": "Terminal",
      "carshade": false,
      "water_filling": true,
      "track": 4,
      "terminate_terminal_line": true,
      "freight_line": false,
      "platform": 4,
      "terminal_track": 4
    },
    "tracks": {
      "0": { "id": 0, "type": "terminal_line", "direction": "up", "associated_platform": ["platform1"], "train_type": ["passenger","superfast"], "speed_limit": "80 kmph", "water_filling": true, "terminal": true, "carshade": false, "goods_train_termination": false, "passthrough": false, "goods_train_stop": false, "line_capacity": "Category A", "junction_point": false, "carshade_line": false },
      "1": { "id": 1, "type": "terminal_line", "direction": "up", "associated_platform": ["platform2"], "train_type": ["passenger","superfast"], "speed_limit": "80 kmph", "water_filling": true, "terminal": true, "carshade": false, "goods_train_termination": false, "passthrough": false, "goods_train_stop": false, "line_capacity": "Category A", "junction_point": false, "carshade_line": false },
      "2": { "id": 2, "type": "terminal_line", "direction": "down", "associated_platform": ["platform3"], "train_type": ["passenger","superfast"], "speed_limit": "80 kmph", "water_filling": true, "terminal": true, "carshade": false, "goods_train_termination": false, "passthrough": false, "goods_train_stop": false, "line_capacity": "Category A", "junction_point": false, "carshade_line": false },
      "3": { "id": 3, "type": "terminal_line", "direction": "down", "associated_platform": ["platform4"], "train_type": ["passenger","superfast"], "speed_limit": "80 kmph", "water_filling": true, "terminal": true, "carshade": false, "goods_train_termination": false, "passthrough": false, "goods_train_stop": false, "line_capacity": "Category A", "junction_point": false, "carshade_line": false }
    },
    "signals": {
      "L0": { "position_from_station": "1000 m", "associated_track": 0, "signal_direction": "up", "signal_type": "main" },
      "L1": { "position_from_station": "1000 m", "associated_track": 1, "signal_direction": "up", "signal_type": "main" },
      "L2": { "position_from_station": "1000 m", "associated_track": 2, "signal_direction": "down", "signal_type": "main" },
      "L3": { "position_from_station": "1000 m", "associated_track": 3, "signal_direction": "down", "signal_type": "main" }
    },
    "platforms": {
      "platform1": { "id": "platform1", "platform_length": "600 m", "train_types": ["passenger","superfast"], "train_length": "24 coaches", "electrified": true, "track_id": [0], "termination": true, "goods_train_termination": false, "max_waiting_period": "30 minute", "water_filling": true, "platform_type": "terminal", "passenger_density": "high", "junction_point": false },
      "platform2": { "id": "platform2", "platform_length": "600 m", "train_types": ["passenger","superfast"], "train_length": "24 coaches", "electrified": true, "track_id": [1], "termination": true, "goods_train_termination": false, "max_waiting_period": "30 minute", "water_filling": true, "platform_type": "terminal", "passenger_density": "high", "junction_point": false },
      "platform3": { "id": "platform3", "platform_length": "600 m", "train_types": ["passenger","superfast"], "train_length": "24 coaches", "electrified": true, "track_id": [2], "termination": true, "goods_train_termination": false, "max_waiting_period": "30 minute", "water_filling": true, "platform_type": "terminal", "passenger_density": "high", "junction_point": false },
      "platform4": { "id": "platform4", "platform_length": "600 m", "train_types": ["passenger","superfast"], "train_length": "24 coaches", "electrified": true, "track_id": [3], "termination": true, "goods_train_termination": false, "max_waiting_period": "30 minute", "water_filling": true, "platform_type": "terminal", "passenger_density": "high", "junction_point": false }
    },
    "line_crossings": {}
  }
};

export const RURAL_STATION_DATA = {
  "station": {
    "metadata": {
      "name": "Rural Stop",
      "station_code": "RRL",
      "division": "RRL",
      "station_type": "Passthrough",
      "carshade": false,
      "water_filling": false,
      "track": 3,
      "terminate_terminal_line": false,
      "freight_line": true,
      "platform": 2,
      "terminal_track": 0
    },
    "tracks": {
      "0": { "id": 0, "type": "main_line", "direction": "up", "associated_platform": ["platform1"], "train_type": ["passenger","goods"], "speed_limit": "100 kmph", "water_filling": false, "terminal": false, "carshade": false, "goods_train_termination": false, "passthrough": true, "goods_train_stop": false, "line_capacity": "Category C", "junction_point": false, "carshade_line": false },
      "1": { "id": 1, "type": "main_line", "direction": "down", "associated_platform": ["platform2"], "train_type": ["passenger","goods"], "speed_limit": "100 kmph", "water_filling": false, "terminal": false, "carshade": false, "goods_train_termination": false, "passthrough": true, "goods_train_stop": false, "line_capacity": "Category C", "junction_point": false, "carshade_line": false },
      "2": { "id": 2, "type": "loop_line", "direction": "both", "associated_platform": [], "train_type": ["goods"], "speed_limit": "60 kmph", "water_filling": false, "terminal": false, "carshade": false, "goods_train_termination": false, "passthrough": true, "goods_train_stop": true, "line_capacity": "Category C", "junction_point": false, "carshade_line": false }
    },
    "signals": {
      "L0": { "position_from_station": "1200 m", "associated_track": 0, "signal_direction": "up", "signal_type": "main" },
      "L1": { "position_from_station": "1200 m", "associated_track": 1, "signal_direction": "down", "signal_type": "main" }
    },
    "platforms": {
      "platform1": { "id": "platform1", "platform_length": "400 m", "train_types": ["passenger"], "train_length": "12 coaches", "electrified": false, "track_id": [0], "termination": false, "goods_train_termination": false, "max_waiting_period": "10 minute", "water_filling": false, "platform_type": "passthrough", "passenger_density": "low", "junction_point": false },
      "platform2": { "id": "platform2", "platform_length": "400 m", "train_types": ["passenger"], "train_length": "12 coaches", "electrified": false, "track_id": [1], "termination": false, "goods_train_termination": false, "max_waiting_period": "10 minute", "water_filling": false, "platform_type": "passthrough", "passenger_density": "low", "junction_point": false }
    },
    "line_crossings": {}
  }
};

export const SAMPLE_STATIONS = [
  RDM_STATION_DATA,
  CITY_STATION_DATA,
  RURAL_STATION_DATA
];
