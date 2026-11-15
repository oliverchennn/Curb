import { describe, expect, it } from 'vitest';
import { activeSensor, advance, boundedTime, CAPTURES, defectPosition, DURATION, poseAt, WHEEL_RADIUS } from './simulation';

describe('rover inspection timeline', () => {
  it('clamps time and follows one continuous, gently changing heading', () => {
    expect(boundedTime(NaN)).toBe(0);
    expect(poseAt(-1)).toEqual(poseAt(0));
    expect(poseAt(90)).toEqual(poseAt(DURATION));
    for (let i = 1; i <= 360; i++) {
      const a = poseAt((i - 1) / 10);
      const b = poseAt(i / 10);
      expect(b.distance).toBeGreaterThanOrEqual(a.distance);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(0.13);
      expect(Math.abs(b.heading - a.heading)).toBeLessThan(0.04);
      expect(Math.abs(b.z)).toBeLessThan(0.6);
    }
    expect(poseAt(0).heading).not.toBeCloseTo(poseAt(18).heading);
  });

  it('stops at each modeled defect, with the defect in front of the camera mount', () => {
    for (const capture of CAPTURES) {
      const start = poseAt(capture.start);
      const center = poseAt(capture.at);
      const end = poseAt(capture.end);
      expect(start.fraction).toBeCloseTo(capture.fraction, 10);
      expect(start.distance).toBe(center.distance);
      expect(center.distance).toBe(end.distance);
      expect(center.zoom).toBe(1);
      expect(end.inspection).toBeUndefined();
      expect(poseAt(capture.start - 0.2).distance).toBeLessThan(start.distance);
      expect(poseAt(capture.end + 0.2).distance).toBeGreaterThan(end.distance);
      const defect = defectPosition(capture);
      expect(Math.hypot(defect.x - center.x, defect.z - center.z)).toBeCloseTo(Math.hypot(1.06, 0.43), 8);
    }
  });

  it('reconstructs wheel travel, captures and camera selection after backward seeks', () => {
    expect(new Set(CAPTURES.map(capture => capture.id)).size).toBe(CAPTURES.length);
    for (const [index, capture] of CAPTURES.entries()) {
      expect(poseAt(capture.at - 0.001).count).toBe(index);
      expect(poseAt(capture.at).count).toBe(index + 1);
    }
    for (const time of [36, 26, 12, 4, 0, 26]) {
      const pose = poseAt(time);
      expect(pose.wheelAngle * WHEEL_RADIUS).toBeCloseTo(pose.distance, 12);
      expect(poseAt(time)).toEqual(pose);
    }
    expect(activeSensor(12, 'curb', true, false)).toBe('surface');
    expect(activeSensor(12, 'curb', false, false)).toBe('curb');
    expect(activeSensor(12, 'curb', true, true)).toBe('curb');
    expect(activeSensor(30, 'curb', true, false)).toBe('curb');
    expect(poseAt(4).count).toBe(0);
  });

  it('advances consistently at supported speeds and stops at the end', () => {
    for (const speed of [0.5, 1, 2]) expect(advance(2, 4, speed)).toBe(2 + 4 * speed);
    expect(advance(DURATION - 1, 10, 2)).toBe(DURATION);
    expect(advance(10, -2, 1)).toBe(10);
  });
});
