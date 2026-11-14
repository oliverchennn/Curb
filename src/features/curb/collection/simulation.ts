export const DURATION = 36;
export const WHEEL_RADIUS = 0.24;
export type SensorId = 'forward' | 'surface' | 'curb';
export type ViewId = 'follow' | 'side' | 'overhead';

export const SENSORS = [
  { id: 'forward', number: '01', name: 'Forward context', short: 'Forward', description: 'Keeps the sidewalk and nearby joints in context.', limit: 'A camera view does not establish passability.', color: '#29735a' },
  { id: 'surface', number: '02', name: 'Downward surface', short: 'Downward', description: 'Frames an illustrative surface change for close review.', limit: 'Reliable dimensions need calibration and field measurements.', color: '#98621a' },
  { id: 'curb', number: '03', name: 'Side / curb', short: 'Side / curb', description: 'Shows where the pavement meets the curb and road.', limit: 'The view does not measure curb height or slope.', color: '#237487' },
] as const;

export const CAPTURES = [
  { id: 'SIM-01', start: 9, at: 12, end: 15, fraction: 0.37, label: 'Transverse crack', kind: 'crack',
    note: 'An irregular break crosses the modeled slab.' },
  { id: 'SIM-02', start: 23, at: 26, end: 29, fraction: 0.71, label: 'Rough patch', kind: 'patch',
    note: 'A worn area sits apart from the straight panel joint.' },
] as const;

export type Capture = (typeof CAPTURES)[number];

const ROUTE_START = -6.8;
const ROUTE_SPAN = 13.6;
const TABLE_SIZE = 256;
const tau = Math.PI * 2;

// A low-amplitude bend stays within the level sidewalk. The distance table lets
// the timeline and wheel angle use the same length, including the bend.
export function routeAt(fraction: number) {
  const u = Math.min(1, Math.max(0, fraction));
  const phase = tau * (u - 0.1);
  return {
    x: ROUTE_START + ROUTE_SPAN * u,
    z: 0.52 * Math.sin(phase) + 0.04,
    heading: Math.atan2(0.52 * tau * Math.cos(phase), ROUTE_SPAN),
  };
}

const lengths = [0];
for (let i = 1; i <= TABLE_SIZE; i++) {
  const a = routeAt((i - 1) / TABLE_SIZE);
  const b = routeAt(i / TABLE_SIZE);
  lengths.push(lengths[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
}

function distanceAt(fraction: number) {
  const offset = fraction * TABLE_SIZE;
  const low = Math.floor(offset);
  const high = Math.min(low + 1, TABLE_SIZE);
  return lengths[low] + (lengths[high] - lengths[low]) * (offset - low);
}

function fractionAt(distance: number) {
  let low = 0;
  let high = TABLE_SIZE;
  while (high - low > 1) {
    const middle = (low + high) >>> 1;
    if (lengths[middle] <= distance) low = middle;
    else high = middle;
  }
  return (low + (distance - lengths[low]) / (lengths[high] - lengths[low])) / TABLE_SIZE;
}

function ease(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

const travel = [
  { from: 0, until: CAPTURES[0].start, start: 0, finish: distanceAt(CAPTURES[0].fraction) },
  { from: CAPTURES[0].end, until: CAPTURES[1].start, start: distanceAt(CAPTURES[0].fraction), finish: distanceAt(CAPTURES[1].fraction) },
  { from: CAPTURES[1].end, until: DURATION, start: distanceAt(CAPTURES[1].fraction), finish: lengths[TABLE_SIZE] },
] as const;

export function boundedTime(seconds: number): number {
  return Number.isFinite(seconds) ? Math.min(DURATION, Math.max(0, seconds)) : 0;
}

export function localGround(fraction: number, ahead: number, across: number) {
  const { x, z, heading } = routeAt(fraction);
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  return { x: x + c * ahead - s * across, z: z + s * ahead + c * across };
}

export function defectPosition(capture: Capture) {
  return localGround(capture.fraction, 1.06, 0.43);
}

export function poseAt(seconds: number) {
  const time = boundedTime(seconds);
  const segment = travel.find(item => time <= item.until) ?? travel[2];
  const progress = ease((time - segment.from) / (segment.until - segment.from));
  const distance = segment.start + (segment.finish - segment.start) * progress;
  const inspection = CAPTURES.find(item => item.start <= time && time < item.end);
  const count = CAPTURES.filter(capture => capture.at <= time).length;
  const fraction = fractionAt(distance);
  return {
    time, fraction, distance, ...routeAt(fraction), wheelAngle: distance / WHEEL_RADIUS, count, inspection,
    zoom: inspection ? ease((time - inspection.start) / 1.8) * ease((inspection.end - time) / 1.1) : 0,
  };
}

export function activeSensor(seconds: number, manual: SensorId, autoInspect: boolean, reducedMotion: boolean): SensorId {
  return autoInspect && !reducedMotion && poseAt(seconds).inspection ? 'surface' : manual;
}

export function advance(seconds: number, elapsed: number, speed: number) {
  return boundedTime(seconds + Math.max(0, elapsed) * speed);
}

export type Transport = {
  seconds: number;
  running: boolean;
  speed: number;
  manualSensor: SensorId;
  autoInspect: boolean;
  reducedMotion: boolean;
  coverage: boolean;
  view: ViewId;
  reset: number;
  invalidate?: () => void;
};
