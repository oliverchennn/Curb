import { describe, expect, it } from 'vitest';
import { buildTour, type TourGroupLite } from './tour';

const ALL: TourGroupLite[] = [
  { id: 'structure', label: 'Chassis & enclosure' },
  { id: 'drive', label: 'Drive & mobility' },
  { id: 'sensing', label: 'Sensing' },
  { id: 'power', label: 'Power & safety' },
  { id: 'compute', label: 'Compute, comms & cooling' },
  { id: 'wiring', label: 'Wiring harness' },
];

describe('buildTour', () => {
  it('opens on an intro overview and closes on a CTA overview', () => {
    const beats = buildTour(ALL);
    expect(beats.length).toBeGreaterThanOrEqual(3);
    expect(beats[0]).toMatchObject({ kind: 'overview', key: 'intro' });
    expect(beats[0].cta).toBeUndefined();
    const last = beats[beats.length - 1];
    expect(last).toMatchObject({ kind: 'overview', key: 'close', cta: true });
  });

  it('only references subsystems that exist in the manifest', () => {
    const ids = new Set(ALL.map(g => g.id));
    for (const beat of buildTour(ALL)) {
      if (beat.groupId) expect(ids.has(beat.groupId)).toBe(true);
    }
  });

  it('gives every beat non-empty caption copy', () => {
    for (const beat of buildTour(ALL)) {
      expect(beat.title.trim().length).toBeGreaterThan(0);
      expect(beat.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('includes at least one isolate and one explode beat', () => {
    const beats = buildTour(ALL);
    expect(beats.some(b => b.kind === 'isolate')).toBe(true);
    expect(beats.some(b => b.kind === 'explode')).toBe(true);
  });

  it('skips beats for groups absent from the manifest but keeps intro and close', () => {
    const beats = buildTour(ALL.filter(g => g.id !== 'structure'));
    expect(beats.some(b => b.groupId === 'structure')).toBe(false);
    expect(beats[0].key).toBe('intro');
    expect(beats[beats.length - 1].key).toBe('close');
  });

  it('does not invent a closing beat when no subsystems are present', () => {
    // Only the intro overview survives; it must not be marked as the CTA.
    const beats = buildTour([]);
    expect(beats).toHaveLength(1);
    expect(beats[0].key).toBe('intro');
    expect(beats[0].cta).toBeFalsy();
  });
});
