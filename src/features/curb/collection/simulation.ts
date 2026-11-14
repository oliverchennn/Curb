export const DURATION = 24;
export const WHEEL_RADIUS = 0.24;
export type SensorId = 'forward' | 'surface' | 'curb';
export type ViewId = 'follow' | 'side' | 'overhead';

export const SENSORS = [
  { id: 'forward', number: '01', name: 'Forward context camera', short: 'Context', purpose: 'Keep the wider scene.', description: 'A forward view could connect each observation to the surrounding sidewalk, approaching joints and other visible context.', limit: 'A view of a path does not establish that it is passable. Location and observations need review.', color: '#28765e' },
  { id: 'surface', number: '02', name: 'Downward surface camera', short: 'Surface', purpose: 'Look closer at the surface.', description: 'A downward view could retain detail of a crack or rough patch for a person to inspect alongside the context frame.', limit: 'Reliable dimensions need a calibrated, validated sensing workflow and field measurements.', color: '#98621a' },
  { id: 'curb', number: '03', name: 'Side / curb camera', short: 'Curb', purpose: 'Keep the edge in view.', description: 'A side view could document the relationship between the sidewalk edge, curb and planted verge.', limit: 'The illustration does not measure curb height, slope or accessibility compliance.', color: '#237487' },
] as const;

export const CAPTURES = [
  { at: 5, label: 'Context frame', note: 'Sidewalk ahead', x: -3.5 },
  { at: 12, label: 'Surface detail', note: 'Illustrative crack', x: 0 },
  { at: 20, label: 'Reviewer queue', note: 'Paired views to inspect', x: 4 },
] as const;

export function boundedTime(seconds: number): number {
  return Number.isFinite(seconds) ? Math.min(DURATION, Math.max(0, seconds)) : 0;
}

export function poseAt(seconds: number) {
  const time = boundedTime(seconds);
  // Constant linear speed makes wheel angle exactly proportional to travel.
  const distance = time / DURATION * 12;
  return { time, x: -6 + distance, wheelAngle: distance / WHEEL_RADIUS,
    count: CAPTURES.filter(capture => capture.at <= time).length };
}

export function advance(seconds: number, elapsed: number, speed: number) {
  return boundedTime(seconds + Math.max(0, elapsed) * speed);
}

export type Transport = {
  seconds: number;
  running: boolean;
  speed: number;
  sensor: SensorId;
  coverage: boolean;
  view: ViewId;
  reset: number;
};
