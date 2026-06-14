# RailSim ML

### Intelligent Railway Station Simulation & Platform Allocation Engine

**Built for FAR AWAY 2026**

[Features](#features) | [Architecture](#architecture) | [Allocation Engine](#allocation-engine) | [Getting Started](#getting-started)

---

## The Problem

Indian Railway stations are among the busiest transit nodes in the world. A major junction can handle 100+ trains daily across 6-10 tracks, with every wrong platform assignment cascading into delays, passenger overcrowding, and freight bottlenecks. Today, platform allocation at most stations is handled manually by Traffic Controllers working off paper timetables -- a process prone to human error, especially during peak hours or disruptions.

**RailSim ML** is a browser-based simulation environment built to model this exact problem and benchmark intelligent routing solutions against real-world station constraints.

---

## Project Objective

RailSim ML serves a dual purpose:

1. **As a Simulation Tool** -- Model any Indian railway station's infrastructure (tracks, platforms, signals, line crossings) and simulate live train traffic across three congestion levels (Basic, Moderate, Extreme), observing how allocation decisions affect throughput, dwell time, and conflict rates.

2. **As an ML Validation Harness** -- Provide a structured environment to plug in, test, and benchmark trained ML models for optimal platform allocation. The simulation generates realistic, constraint-rich train data as input and evaluates the model's decisions against 28 domain-specific routing rules derived from Indian Railways operational standards.

---

## Features

### Station Configuration
- **Dynamic Station Builder** -- 4-step wizard to configure any station: identity, infrastructure counts, per-track settings (type, direction, speed limit, capacity category), and per-platform settings (length, density, coach limit, electrification)
- **Load Sample Station** -- Pre-configured RDM Junction with 10 tracks, 8 platforms, 54 signals, and 27 line crossings loaded instantly for demonstration
- **Randomize Non-Required Fields** -- Auto-generate optional infrastructure parameters with operationally plausible values; manually override any field at any time
- **Export Station JSON** -- Download your station configuration for external use or model training

### Live Simulation
- **Accelerated Simulation Clock** -- 1 real second maps to configurable sim-minutes (default 1:5); run at x1, x2, x5, or x10 speed
- **Three Rush Levels** -- Switch between Basic, Moderate, and Extreme train spawn rates at any point during the simulation without resetting state
- **Animated Track Map** -- SVG-rendered track layout with live train movement, signal states, and occupancy indicators updated in real time
- **Session Persistence** -- Simulation state is preserved across page refreshes via Zustand session storage; no data is lost on reload

### Platform Allocation Engine
- **28-Rule Deterministic Engine** -- Fully implemented constraint-based router covering temporal safety, passenger optimization, freight segregation, signal interlocking, and shunting operations (detailed below)
- **Track Maintenance Controls** -- Mark any track as under temporary maintenance or permanently disabled at runtime; the engine immediately excludes it from all routing candidates
- **Conflict Detection & Resolution** -- Detects overlapping track assignments and resolves them automatically or surfaces a manual override UI

### Special Trains
- **Inject Special Trains Anytime** -- Add VIP, Military, Medical, or custom trains outside the normal schedule with a dedicated modal
- **Priority Overrides** -- Assign a preferred platform or track as a hard constraint; the engine respects forced assignments or alerts on conflicts
- **Visual Priority Badges** -- Special trains rendered distinctly on the track map and timetable queue

### Observability
- **Real-Time Metrics Bar** -- Station occupancy %, average dwell time, conflict count, trains handled, and throughput updated live
- **Congestion Heatmap** -- Per-track color strip showing utilization intensity over the last 60 simulation minutes
- **Scrollable Event Log** -- Timestamped log of every allocation decision, conflict, override, and status change
- **Export Session Log** -- Download the full allocation history as JSON for post-simulation analysis or model training data

---

## Architecture

```
railsim-ml/
├── src/
│   ├── components/
│   │   ├── builder/                 # 4-step station configuration wizard
│   │   ├── LiveTrackMap.jsx         # Live SVG-rendered track layout, trains, & signals
│   │   ├── IncomingTrainsQueue.jsx  # Real-time inbound train queue list
│   │   ├── StationMasterTimeTable.jsx # 24h timetable timeline & allocation viewer
│   │   └── TrainDetailDrawer.jsx    # Manual track re-allocation & constraint overrides
│   ├── hooks/
│   │   ├── useSimulationLoop.js     # Simulation clock loop & async ML prediction coordinator
│   │   └── useTrainSimulation.js    # Simulation controls & state initialization
│   ├── pages/
│   │   ├── MainDashboard.jsx        # Primary layout for simulation control & telemetry
│   │   └── StationBuilder.jsx       # Interface container for custom station building
│   ├── services/
│   │   ├── mlService.js             # API bridge interfacing with the /predict endpoint
│   │   ├── trainAllocationService.js # Core 28-rule deterministic allocation engine
│   │   └── trainAllocationAPI.js    # API service layer for validation and batching
│   ├── store/
│   │   └── useSimStore.js           # Zustand store with session persistence across reloads
│   └── utils/
│       ├── trainGenerator.js        # Schedule injector aware of rush level
│       └── greedyAssign.js          # Hybrid router dispatching to ML or falling back to rules
```

### Data Flow

The simulation routes trains by querying the machine learning model first. If the model fails or has low confidence, the engine falls back to the deterministic 28-rule constraint engine.

```
                  Train Spawned / Arrived
                             |
                             v
               +---------------------------+
               |    ML Allocation Hook     |
               |  (useSimulationLoop.js)   |
               +-------------+-------------+
                             |
                             v
               [Query ML Model (/predict)]
                             |
              +--------------+--------------+
              |                             |
              v (Success)                   v (Error / Timeout)
     +-----------------+           +------------------+
     | Check ML Output |           |  Trigger Rules   |
     |   Confidence    |           |  Fallback path   |
     +--------+--------+           +--------+---------+
              |                             |
       +------+------+                      |
       |             |                      |
       v (>= 80%)    v (< 80%)              v
    [Apply ML]    [Trigger Fallback] ------>|
       |             |                      |
       |             +--------------------->|
       |                                    v
       |                          +-------------------+
       |                          | Deterministic     |
       |                          | Allocation Engine |
       |                          | (28 Rules Engine) |
       |                          +---------+---------+
       |                                    |
       v                                    v
  +----+------------------------------------+----+
  |              Final Track Assignment           |
  +-------------------------+---------------------+
                            |
                            v
             +--------------+--------------+
             v                             v
    Timeline Booking                Signal Interlocking
   (timelineManager.js)            (signalController.js)
             |                             |
             +--------------+--------------+
                            |
                            v
               SVG Track Map & Metrics UI Update
```

### ML Integration & Fallback Logic

To optimize traffic throughput, RailSim ML implements a hybrid decision-making architecture that marries the flexibility of predictive machine learning models with the absolute safety guarantees of a rule-based system.

#### 1. ML Model API Communication
When a train approaches the station approach radius, the simulation loop packages the system state and POSTs to the configured `/predict` endpoint:
- **Payload Schema**:
  - `station`: Metadata, track capabilities, platform attributes (length, density, electrification).
  - `incoming_train`: Complete train specification (type, coaches, standby duration, water requirements).
  - `current_occupancy`: Real-time mapping of track-to-train occupancy.
- **Request Lifecycle**: Managed via `mlService.predictAssignment`. It features an active network timeout threshold of 5000ms. If the model API responds within the window, the predicted `track_id` and `platform_id` are extracted along with the prediction confidence.

#### 2. Deterministic Rule-Based Fallback
To ensure high-availability and prevent collisions, the system routes assignments through a strict safety fallback path in the following conditions:
- **Network Failures**: API server unreachable, DNS lookup fails, or HTTP status error codes (e.g. 500, 502).
- **Timeouts**: The prediction endpoint fails to respond within 5000ms.
- **Low Confidence Predictions**: Predictions returned with a confidence score below the configured threshold (default 80%).
- **Rule Violations**: If the ML prediction violates any hard safety constraints (e.g., routing a non-electrified or too-long train to a restricted platform), the system detects the hazard.

When a fallback triggers:
1. The client-side status flag changes to `fallback` (notifying the Station Master via the UI).
2. The simulation dispatches the allocation request to the local `greedyAssign` logic, which routes it through `trainAllocationService.allocateTrainAdvanced`.
3. The deterministic engine evaluates all 28 operational rules to identify the highest-scoring safe track.

For a comprehensive catalog of all 28 operational rules with their detailed explanations, refer to the [FALLBACK_RULES.txt](file:///d:/Programming/RailSim-ML/FALLBACK_RULES.txt) reference file in the project root.



---

## Allocation Engine

The heart of RailSim ML is a deterministic, constraint-based routing engine implementing 28 domain rules derived from Indian Railways operational standards. These rules span five categories:

### 1. Temporal Safety
The engine maintains a 24-hour time-series occupancy grid for every track. Before any assignment, it checks that the full train_platform_duration or train_stand_by_duration window is unoccupied and pads every booking with a mandatory safety buffer for signal clearance and interlocking release. For trains with missing arrival or departure times (originating/terminating trains), the engine mathematically infers the missing boundary from standby duration fields.

### 2. Passenger & Platform Optimization
Hard constraints enforced before any platform is finalized:
- Passenger trains (non-pass-through) are strictly restricted to tracks with associated_platform (tracks 5 and 8 are excluded entirely)
- High-volume commuter trains are weighted toward passenger_density: "high" platforms (1, 2, 7)
- Coach count is cross-referenced against platform.train_length (a 24-coach train is hard-blocked from a 15-coach platform)
- Water filling requirement (water_filling: true) restricts valid tracks to 0, 1, and 9 only
- All passenger platforms must have electrified: true before assignment is finalized
- Pass-through trains are hard-blocked from platform_type: "terminal" tracks (dead-ends)
- Trains exceeding max_waiting_period trigger automatic shunting to a carshade_line

### 3. Freight Routing
Goods trains follow a fully separate routing matrix:
- Hard-blocked from passenger-only lines; Track 9 is instantly excluded for any goods train
- Non-stopping goods trains are soft-weighted toward platform-less bypass lines (tracks 5 and 8)
- Stopping goods trains require goods_train_stop: true on the assigned track
- Terminating goods trains are exclusively routed to tracks with goods_train_termination: true (4, 5, or 8)
- A 60-coach goods train is weighted toward line_capacity: "Category A" tracks to protect rail infrastructure

### 4. Movement & Traffic Control
- Direction matching: a train's Up/Down route direction is matched strictly against the track's direction property as a primary filter
- SUPERFAST pass-through: routed exclusively to main_line tracks to maintain 130 kmph momentum; loop line assignment is blocked
- Fallback cascade: if primary directional lines are occupied, the engine cascades to bidirectional loop_line tracks
- Junction routing: trains switching rail corridors are directed to tracks where junction_point: true
- Passthrough validation: bypass trains are hard-blocked from tracks with passthrough: false (5, 7, 8, 9)
- Exit alignment: next_destination is mapped to a track physically aligned with the station's exit geometry to minimize diagonal crossing conflicts

### 5. Signal Interlocking & Crossing Safety
- When a train occupies a line_crossing, the engine immediately sets all converging signal_no entries to Danger (red)
- Clearing time is calculated dynamically using distance_between_signal and track_length (Time = Distance / Speed), releasing signals the moment the tail clears the intersection rather than using static timers
- Goods trains are routed only through crossings where goods_line_crossing: true; terminating trains only through terminal_line_crossing: true
- Extended parking trains are routed via carshade_line_crossing: true switches to reach maintenance sidings

### Rule Summary Table

| # | Category | Rule |
|---|---|---|
| 1-3 | Temporal | Timeline check, safety buffer, missing time inference |
| 4-9 | Passenger | Platform association, density, coach length, water, electrification, terminal ban |
| 10-12 | Termination | Terminal track, goods termination, carshade for long standby |
| 13-16 | Movement | Direction match, SUPERFAST line, loop fallback, passthrough validation |
| 17-19 | Freight | Goods line restriction, bypass preference, goods_train_stop |
| 20-22 | Infrastructure | Junction routing, exit alignment, line capacity vs coach weight |
| 23-25 | Signal Safety | Red-on-crossing, dynamic clearing time, overstay shunting |
| 26-28 | Crossing | Goods crossing filter, terminal crossing filter, carshade crossing path |

---

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9
- A desktop or laptop with >= 1280px screen width (the simulator is PC-only by design)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/railsim-ml.git
cd railsim-ml

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Quick Start

1. **Load Sample Station** -- Click `Load Sample Station` on the landing page to instantly boot into RDM Junction (10 tracks, 8 platforms, 27 crossings)
2. **Select Rush Level** -- Choose Basic, Moderate, or Extreme from the top bar
3. **Play** -- Hit the Play button; trains begin arriving and the engine allocates them in real time
4. **Inject Special Trains** -- Use the `+ Special Train` FAB at any point to add priority or custom trains
5. **Toggle Maintenance** -- Click any track on the map to mark it under maintenance and watch the engine reroute live traffic
6. **Export Log** -- Download the full allocation session as JSON from the metrics panel

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Pause / Resume |
| `+` / `-` | Increase / decrease simulation speed |
| `1` / `2` / `3` | Switch to Basic / Moderate / Extreme rush |
| `M` | Toggle metrics panel |
| `S` | Open special train modal |
| `?` | Show shortcut reference |

---

## Train Data Schema

The engine consumes and generates trains in the following format:

```json
{
  "train_no": "12301",
  "train_name": "Rajdhani Express",
  "train_type": "superfast",
  "train_arrival_time": "08:45",
  "train_departure_time": "08:55",
  "train_coaches": 20,
  "water_filling": true,
  "train_stand_by_duration": 10,
  "next_destination": "NDLS",
  "train_pass_through": false,
  "train_terminate": false,
  "train_termination_stand_by_duration": 0,
  "reverse_train_no": null,
  "train_start_from_here": false,
  "train_platform_duration": 8,
  "runs_mon": true,
  "runs_tue": true,
  "runs_wed": false,
  "runs_thu": true,
  "runs_fri": true,
  "runs_sat": false,
  "runs_sun": true
}
```

---

## Team

Built for FAR AWAY 2026 by a cross-functional team of ML engineers, full-stack developers, and domain researchers passionate about improving Indian public infrastructure through intelligent systems.

---

## License

MIT License -- see LICENSE for details.

---

*"The best time to fix a delay is before the train arrives."*

**RailSim ML** -- Simulating smarter railways, one track at a time.
