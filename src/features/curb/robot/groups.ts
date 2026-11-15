// Component grouping for the Curb robot explorer.
//
// Every part in the CAD manifest is assigned to exactly one of six functional
// subsystems by the geometry export. This module re-exposes that grouping in a
// typed form and collapses repeated named components (e.g. the 120 rotor
// magnets) into a single numbered index entry with a quantity, so the per-group
// parts index stays readable. The coverage of this grouping is asserted by
// `groups.test.ts`.

import type { ManifestGroup, ManifestPart, RobotManifest, Vec3 } from './manifest';

/** The canonical set of functional groups, in display order. */
export const GROUP_ORDER = [
  'structure',
  'drive',
  'sensing',
  'power',
  'compute',
  'wiring',
] as const;

export type GroupId = (typeof GROUP_ORDER)[number];

export const KNOWN_GROUP_IDS: ReadonlySet<string> = new Set(GROUP_ORDER);

/** Short, functional one-liners shown under each group heading. */
export const GROUP_ROLES: Record<GroupId, string> = {
  structure: 'The chassis, body shell, lid and the hardware that holds the robot together and lets it be serviced.',
  drive: 'The six hub-motor wheels and their motor drivers — everything that moves the robot along the sidewalk.',
  sensing: 'The forward, surface and curb-side camera modules and the mast that carries them.',
  power: 'The battery, power distribution, fusing and the safety cut-offs that store and control power.',
  compute: 'The compute enclosure, communications and cooling that run and connect the robot.',
  wiring: 'The wiring harness that links power, motors, cameras and controls together.',
};

/** A position prefix the geometry attaches to repeated parts (wheel corner / side). */
const POSITION_PREFIX = /^(RL|RR|ML|MR|FL|FR|L|R)\s+/;

// These source labels contain placement coordinates, not part identifiers.
// Keep the rule narrow: numbers in labels such as "sensor pcb c1" identify
// components and must not be stripped as if they were instance counters.
const COORDINATE_LABEL_KINDS: ReadonlySet<string> = new Set([
  'cmp_screw', 'cmp_standoff', 'drv_screw', 'holddown',
]);

/** One collapsed, numbered entry in a group's parts index. */
export interface IndexEntry {
  /** 1-based number shown in the index and on the 3D callout. */
  number: number;
  /** Stable semantic identity, independent of the entry's display number. */
  key: string;
  kind: string;
  /** Family label with any position prefix removed. */
  label: string;
  /** Generic, functional purpose text (from the BOM). */
  description: string;
  /** How many physical parts this entry represents. */
  quantity: number;
  /** The member part node names. */
  members: string[];
  color: string;
  /** Anchor for the 3D number callout: mean of the members' exploded positions. */
  anchor: Vec3;
}

function familyLabel(part: ManifestPart): string {
  let cleaned = part.label.replace(POSITION_PREFIX, '').trim();
  if (COORDINATE_LABEL_KINDS.has(part.kind)) {
    cleaned = cleaned.replace(/(?:\s+-?\d+(?:\.\d+)?)+$/, '');
  }
  // Only these source families use a trailing corner/side as placement.
  if (part.kind === 'fan_screw') cleaned = cleaned.replace(/\s+(BR|TR|BL|TL)$/, '');
  if (part.kind === 'bolt') cleaned = cleaned.replace(/\s+(L|R)$/, '');
  return cleaned || part.kind.replace(/_/g, ' ');
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Collapse only matching named components within a source family. `kind` is
 * often a broad assembly category: for example, bat_bms contains screws, a
 * board, ICs and connectors. Matching kinds alone do not establish identity.
 * Keep source descriptions in the identity too, so differing purpose metadata
 * cannot be silently replaced by the first member's description. This is a
 * model index, not a claim that the parts are physically interchangeable.
 * Entry order follows first appearance, which tracks the build stage.
 */
export function collapseGroup(group: ManifestGroup): IndexEntry[] {
  const order: string[] = [];
  const byIdentity = new Map<string, ManifestPart[]>();
  const labelsByKind = new Map<string, Set<string>>();
  for (const part of group.parts) {
    const label = familyLabel(part);
    const labels = labelsByKind.get(part.kind) ?? new Set<string>();
    labels.add(label);
    labelsByKind.set(part.kind, labels);
    const key = JSON.stringify([group.id, part.kind, label, part.description]);
    let bucket = byIdentity.get(key);
    if (!bucket) {
      bucket = [];
      byIdentity.set(key, bucket);
      order.push(key);
    }
    bucket.push(part);
  }
  return order.map((key, index) => {
    const members = byIdentity.get(key)!;
    const first = members[0];
    let sum: Vec3 = [0, 0, 0];
    for (const p of members) sum = add(sum, add(p.center, p.explode));
    const n = members.length;
    const anchor: Vec3 = [sum[0] / n, sum[1] / n, sum[2] / n];
    return {
      number: index + 1,
      key,
      kind: first.kind,
      label: familyLabel(first),
      // The exporter supplies family-level text. When that family contains
      // several component identities, do not present it as an exact account
      // of this individual item (e.g. a fan nut labelled "Fan mounting screw").
      description: labelsByKind.get(first.kind)!.size > 1
        ? `CAD family context: ${first.description}`
        : first.description,
      quantity: n,
      members: members.map(p => p.name),
      color: first.color,
      anchor,
    };
  });
}

/** Map every part node name in a group to its index entry number. */
export function entryNumberByPart(entries: IndexEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    for (const name of entry.members) map.set(name, entry.number);
  }
  return map;
}

/** Map every part node name in a group to its index entry key. */
export function entryKeyByPart(entries: IndexEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    for (const name of entry.members) map.set(name, entry.key);
  }
  return map;
}

/** Groups sorted into the canonical display order. */
export function orderedGroups(manifest: RobotManifest): ManifestGroup[] {
  const order = new Map<string, number>(GROUP_ORDER.map((id, i) => [id, i]));
  return [...manifest.groups].sort(
    (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99),
  );
}
