/**
 * Random train generator for RailSim ML simulation.
 * Produces trains matching the Phase 3 schema.
 * All fields required by the 28 allocation rules are generated.
 */

const TRAIN_NAMES_PASSENGER = [
  'Rajdhani Express', 'Shatabdi Express', 'Duronto Express', 'Jan Shatabdi',
  'Garib Rath', 'Humsafar Express', 'Vande Bharat Express', 'Tejas Express',
  'Intercity Express', 'Mail Express', 'Sampark Kranti', 'Navjeevan Express',
];

const TRAIN_NAMES_SUPERFAST = [
  'Superfast Express', 'SF Mail', 'Premium SF', 'Double Decker SF',
  'Yuva Express', 'Suvidha Express', 'Antyodaya Express',
];

const TRAIN_NAMES_GOODS = [
  'Box N', 'BCNA Goods', 'BTPN Tanker', 'BOXN-HL Goods',
  'Container Special', 'Parcel Express', 'Freight Carrier',
];

const DESTINATIONS = [
  'Howrah Junction', 'New Delhi', 'Mumbai CST', 'Chennai Central',
  'Sealdah', 'Bengaluru City', 'Hyderabad', 'Ahmedabad',
  'Pune Junction', 'Kolkata', 'Lucknow', 'Patna Junction',
  'Bhopal', 'Nagpur', 'Visakhapatnam', 'Bhubaneswar',
  'Jaipur', 'Chandigarh', 'Amritsar', 'Surat',
];

const SPEED_LEVELS = [1, 2, 5, 10];

let _counter = 10000;
const nextTrainNo = () => String(++_counter);

/**
 * Randomize a time string within [startMin, endMin] sim-minutes from now.
 */
function randArrivalTime(simTime, minOffset, maxOffset) {
  const base = Math.floor(simTime); // always work in whole minutes
  const arrMin = base + minOffset + Math.floor(Math.random() * (maxOffset - minOffset));
  const hh = String(Math.floor(arrMin / 60) % 24).padStart(2, '0');
  const mm = String(arrMin % 60).padStart(2, '0');
  return { timeStr: `${hh}:${mm}`, simMinute: arrMin };
}

/**
 * Spawn interval (sim-minutes) for each rush level.
 */
export function getSpawnInterval(rushLevel) {
  switch (rushLevel) {
    case 'extreme':  return { min: 1,  max: 4  };
    case 'moderate': return { min: 4,  max: 8  };
    default:         return { min: 8,  max: 15 };
  }
}

/**
 * Generate a single random train.
 *
 * @param {string} rushLevel    - 'basic' | 'moderate' | 'extreme'
 * @param {number} simTime      - current sim-time in minutes
 * @param {number} [arrivalOffset] - override arrival offset (sim-min from now)
 */
export function generateTrain(rushLevel = 'basic', simTime = 0, arrivalOffset = null) {
  const rand = Math.random;

  const typeRoll = rand();
  let train_type;
  if (typeRoll < 0.55)      train_type = 'passenger';
  else if (typeRoll < 0.80) train_type = 'superfast';
  else                      train_type = 'goods';

  const namePool = train_type === 'passenger' ? TRAIN_NAMES_PASSENGER
    : train_type === 'superfast' ? TRAIN_NAMES_SUPERFAST
    : TRAIN_NAMES_GOODS;

  const interval = getSpawnInterval(rushLevel);
  const offset = arrivalOffset ?? (interval.min + Math.floor(rand() * (interval.max - interval.min)));
  const { timeStr: arrivalTime, simMinute: arrivalSimMin } = randArrivalTime(simTime, offset, offset + 1);

  let pass_through = false;
  if (train_type === 'goods') {
    pass_through = rand() > 0.15; // 85% chance goods pass through without stopping
  } else {
    pass_through = rand() > 0.65; // 35% chance others pass through
  }

  const terminate     = !pass_through && rand() > 0.8;
  const start_here    = !pass_through && !terminate && rand() > 0.8;

  let platformDuration = 0;
  if (!pass_through) {
    if (train_type === 'passenger') {
      platformDuration = Math.floor(rand() * 5) + 1; // 1 to 5 mins (Local)
    } else if (train_type === 'superfast' || train_type === 'VIP') {
      platformDuration = Math.floor(rand() * 10) + 10; // 10 to 20 mins (Express)
    } else if (train_type === 'goods') {
      platformDuration = Math.floor(rand() * 30) + 15; // 15 to 45 mins (Goods shed loading)
    } else {
      platformDuration = Math.floor(rand() * 10) + 5;
    }
  }

  const departure = arrivalSimMin + platformDuration;
  const dhh = String(Math.floor(departure / 60) % 24).padStart(2, '0');
  const dmm = String(departure % 60).padStart(2, '0');

  let delay_mins = 0;
  if (rand() < 0.25) { // 25% chance of delay
    delay_mins = Math.floor(rand() * 30) + 5;
  }

  // Rule 13: Generate random train direction (up or down)
  const train_direction = rand() > 0.5 ? 'up' : 'down';

  // Rule 16: Day-of-week operating flags (default all true for simulation)
  // Generated trains always run; CSV-imported trains may have partial flags
  const runs_mon = 1;
  const runs_tue = 1;
  const runs_wed = 1;
  const runs_thu = 1;
  const runs_fri = 1;
  const runs_sat = 1;
  const runs_sun = 1;

  // Rule 10: Water filling as integer (1/0) — only for non-goods stopping trains
  const water_filling = (train_type !== 'goods' && !pass_through && rand() > 0.5) ? 1 : 0;

  // Rule 19: Goods trains get realistic coach counts (20-60), passengers 8-22
  let train_coaches;
  if (train_type === 'goods') {
    train_coaches = Math.floor(rand() * 41) + 20; // 20 to 60 coaches
  } else {
    train_coaches = Math.floor(rand() * 14) + 8; // 8 to 22 coaches
  }

  // Rule 20: Corridor switch requirement (10% chance)
  const requires_corridor_switch = rand() > 0.9 ? 1 : 0;

  // Rule 17/27: Termination standby duration as string format for parseDuration()
  const terminationStandbyMins = terminate ? Math.floor(rand() * 45) + 15 : 0;
  const train_termination_stand_by_duration = terminate
    ? `${terminationStandbyMins} minute`
    : '0 minute';

  // Rule 27: Platform duration as string format for parseDuration()
  const train_platform_duration_str = `${platformDuration} minute`;

  return {
    train_no:   nextTrainNo(),
    train_name: `${DESTINATIONS[Math.floor(rand() * DESTINATIONS.length)]} ${namePool[Math.floor(rand() * namePool.length)]}`,
    train_type,
    train_arrival_time: arrivalTime,
    train_departure_time: `${dhh}:${dmm}`,
    train_coaches,
    water_filling,
    delay_mins,
    train_stand_by_duration: '10 minute',
    next_destination: DESTINATIONS[Math.floor(rand() * DESTINATIONS.length)],
    train_pass_through: pass_through ? 1 : 0,
    train_terminate: terminate ? 1 : 0,
    train_termination_stand_by_duration,
    reverse_train_no: start_here ? nextTrainNo() : null,
    train_start_from_here: start_here ? 1 : 0,
    train_platform_duration: train_platform_duration_str,
    preferred_track: String(Math.floor(rand() * 5) + 1),

    // Rule 13: Direction
    train_direction,

    // Rule 16: Day-of-week operating flags
    runs_mon,
    runs_tue,
    runs_wed,
    runs_thu,
    runs_fri,
    runs_sat,
    runs_sun,

    // Rule 20: Corridor switch
    requires_corridor_switch,

    // Timing in minutes (for direct numeric access)
    arrival_time_mins: arrivalSimMin,
    departure_time_mins: departure,

    // Internal simulation fields
    _arrivalSimMin: arrivalSimMin,
    _spawnedAt: simTime,
    isSpecial: false,
  };
}

/**
 * Generate a batch of pre-queued trains for simulation start.
 *
 * @param {string} rushLevel
 * @param {number} count
 */
export function generateInitialBatch(rushLevel = 'basic', count = 15, currentSimTime = 0) {
  const trains = [];
  let cursor = 0;
  const interval = getSpawnInterval(rushLevel);

  for (let i = 0; i < count; i++) {
    if (i === 0) {
      trains.push(generateTrain(rushLevel, currentSimTime, 0));
    } else if (i === 1) {
      trains.push(generateTrain(rushLevel, currentSimTime, 1));
    } else {
      const offset = interval.min + Math.floor(Math.random() * (interval.max - interval.min));
      cursor += offset;
      trains.push(generateTrain(rushLevel, currentSimTime, cursor));
    }
  }
  return trains;
}

/**
 * Special train types for the modal.
 */
export const SPECIAL_TRAIN_TYPES = ['passenger', 'goods', 'superfast', 'VIP', 'military', 'medical'];
export const SPECIAL_PRIORITIES  = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
