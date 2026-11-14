import { describe, expect, it } from 'vitest';
import { advance, boundedTime, CAPTURES, DURATION, poseAt, WHEEL_RADIUS } from './simulation';

describe('collection simulation timeline', () => {
  it('keeps every scrub inside the scene and safely handles non-finite input', () => {
    for (const input of [-100, -1, 0, 8, 24, 100, Infinity, NaN]) {
      const pose = poseAt(input);
      expect(pose.x).toBeGreaterThanOrEqual(-6);
      expect(pose.x).toBeLessThanOrEqual(6);
      expect(Number.isFinite(pose.wheelAngle)).toBe(true);
    }
    expect(boundedTime(NaN)).toBe(0);
    expect(poseAt(DURATION).x).toBe(6);
  });
  it('rolls wheels without slip, including backward scrubs and replay', () => {
    for (const time of [0, 19, 6, 24, 12, 0]) {
      const pose = poseAt(time);
      expect(pose.wheelAngle * WHEEL_RADIUS).toBeCloseTo(pose.x + 6, 12);
    }
    expect(poseAt(0)).toEqual({ time: 0, x: -6, wheelAngle: 0, count: 0 });
  });
  it('derives the capture sequence at exact boundaries and reverses on scrub', () => {
    for (const [index, capture] of CAPTURES.entries()) {
      expect(poseAt(capture.at - 0.001).count).toBe(index);
      expect(poseAt(capture.at).count).toBe(index + 1);
    }
    expect(poseAt(24).count).toBe(3);
    expect(poseAt(3).count).toBe(0);
  });
  it('advances consistently at supported speeds and stops at the end', () => {
    for (const speed of [0.5, 1, 2]) {
      expect(advance(2, 4, speed)).toBe(2 + 4 * speed);
      expect(advance(23, 10, speed)).toBe(24);
    }
    expect(advance(10, -2, 1)).toBe(10);
  });
});
