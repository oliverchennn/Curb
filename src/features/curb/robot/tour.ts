// Scripted guided tour for the robot explorer.
//
// A tour is an ordered list of "beats". Each beat names a scene action
// (show the whole robot, isolate a subsystem, or explode it) plus the caption
// shown while that action is on screen. The beats are pure data so the sequence
// can be unit-tested and so both the manual walkthrough (#2) and the hands-free
// demo loop (#5) replay the exact same narrative.
//
// Copy stays within the project's evidence boundary: the robot is a concept
// model, so captions describe generic roles only — no part numbers, ratings,
// measurements or performance claims.

export type TourBeatKind = 'overview' | 'isolate' | 'explode';

export interface TourBeat {
  /** Stable key for React lists and tests. */
  key: string;
  kind: TourBeatKind;
  /** Subsystem id for isolate/explode beats; absent for overview beats. */
  groupId?: string;
  title: string;
  body: string;
  /** The closing beat offers the hand-off into the product flow (#6). */
  cta?: boolean;
}

export interface TourGroupLite {
  id: string;
  label: string;
}

/** Generic, spec-free role copy per subsystem id. */
const GROUP_COPY: Record<string, { title: string; body: string }> = {
  sensing: {
    title: 'Sensing payload',
    body: 'The cameras and range sensors that would capture sidewalk and ramp geometry — the evidence a survey is built on.',
  },
  drive: {
    title: 'Drive & mobility',
    body: 'A six-wheel drive concept sized to clear curbs, ramps and broken paving along a route.',
  },
  structure: {
    title: 'Chassis & enclosure',
    body: 'The frame that would carry the payload and shield it while working in the field.',
  },
  compute: {
    title: 'Compute, comms & cooling',
    body: 'Where the capture would be processed on board and relayed back for review.',
  },
  power: {
    title: 'Power & safety',
    body: 'Onboard power and safety hardware for untended operation.',
  },
  wiring: {
    title: 'Wiring harness',
    body: 'The connections that tie every subsystem together.',
  },
};

// Preferred narrative order. Steps whose group is absent from the manifest are
// skipped, so the tour degrades gracefully if the model changes.
const SCRIPT: Array<{ kind: TourBeatKind; groupId?: string }> = [
  { kind: 'overview' },
  { kind: 'isolate', groupId: 'sensing' },
  { kind: 'explode', groupId: 'sensing' },
  { kind: 'isolate', groupId: 'drive' },
  { kind: 'isolate', groupId: 'structure' },
  { kind: 'overview' }, // closing hand-off
];

const INTRO = {
  title: 'Meet the survey robot',
  body: 'A concept sidewalk-survey robot. It would drive a route and capture the geometry that Curb turns into accessibility repair plans.',
};

const CLOSING = {
  title: 'From capture to repair plan',
  body: 'Everything this robot captures flows into the Curb survey — review the findings, compare repairs and export the report.',
};

/**
 * Build the tour for the subsystems actually present in the manifest.
 * The result always opens on an intro overview beat and ends on a CTA overview
 * beat; isolate/explode beats appear only for groups that exist.
 */
export function buildTour(groups: TourGroupLite[]): TourBeat[] {
  const byId = new Map(groups.map(g => [g.id, g]));
  const beats: TourBeat[] = [];

  SCRIPT.forEach((step, index) => {
    if (step.kind === 'overview') {
      // The first overview is the intro; a later overview becomes the closing
      // CTA only once at least one subsystem beat exists between them.
      if (beats.length === 0) {
        beats.push({ key: 'intro', kind: 'overview', title: INTRO.title, body: INTRO.body });
        return;
      }
      const hasContent = beats.some(beat => beat.kind !== 'overview');
      if (index === SCRIPT.length - 1 && hasContent) {
        beats.push({ key: 'close', kind: 'overview', cta: true, title: CLOSING.title, body: CLOSING.body });
      }
      return;
    }
    const group = step.groupId ? byId.get(step.groupId) : undefined;
    if (!group) return;
    const copy = GROUP_COPY[group.id] ?? { title: group.label, body: '' };
    beats.push({
      key: `${step.kind}:${group.id}`,
      kind: step.kind,
      groupId: group.id,
      title: copy.title,
      body: step.kind === 'explode'
        ? `${copy.body} Here it is exploded into its individual parts.`
        : copy.body,
    });
  });

  return beats;
}
