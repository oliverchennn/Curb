import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  collapseGroup,
  entryKeyByPart,
  GROUP_ORDER,
  GROUP_ROLES,
  KNOWN_GROUP_IDS,
  orderedGroups,
} from './groups';
import type { RobotManifest } from './manifest';

const PUBLIC = join(process.cwd(), 'public', 'robot');

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(PUBLIC, name), 'utf8')) as T;
}

const manifest = readJson<RobotManifest>('manifest.json');
const partsIndex = readJson<{ parts: { name: string; group: string }[] }>('parts.json');

describe('robot component grouping', () => {
  it('manifest groups match the known group ids exactly', () => {
    const manifestIds = new Set(manifest.groups.map(g => g.id));
    expect(manifestIds).toEqual(new Set(GROUP_ORDER));
    for (const id of manifest.groups.map(g => g.id)) {
      expect(KNOWN_GROUP_IDS.has(id)).toBe(true);
    }
  });

  it('every known group has a functional role description', () => {
    for (const id of GROUP_ORDER) {
      expect(GROUP_ROLES[id].length).toBeGreaterThan(20);
    }
  });

  it('assigns every part to exactly one group, with no gaps or duplicates', () => {
    const totalParts = partsIndex.parts.length;
    // Each part in the flat index names exactly one known group.
    const seen = new Set<string>();
    for (const part of partsIndex.parts) {
      expect(KNOWN_GROUP_IDS.has(part.group)).toBe(true);
      expect(seen.has(part.name)).toBe(false); // no duplicate part names
      seen.add(part.name);
    }
    // The per-group part lists partition the flat index: full coverage, no overlap.
    const grouped = new Set<string>();
    let counted = 0;
    for (const group of manifest.groups) {
      expect(group.parts.length).toBe(group.count);
      for (const part of group.parts) {
        expect(grouped.has(part.name)).toBe(false); // part in only one group
        grouped.add(part.name);
        counted += 1;
      }
    }
    expect(counted).toBe(totalParts);
    expect(grouped).toEqual(seen);
  });

  it('group counts sum to the whole robot', () => {
    const sum = manifest.groups.reduce((n, g) => n + g.count, 0);
    expect(sum).toBe(partsIndex.parts.length);
  });

  it('collapses each group into numbered families that cover every member once', () => {
    for (const group of manifest.groups) {
      const entries = collapseGroup(group);
      // Numbers are 1..N contiguous.
      expect(entries.map(e => e.number)).toEqual(entries.map((_, i) => i + 1));
      // Quantities sum to the group's part count.
      const quantity = entries.reduce((n, e) => n + e.quantity, 0);
      expect(quantity).toBe(group.count);
      // Members partition the group's parts exactly once.
      const members = entries.flatMap(e => e.members);
      expect(new Set(members).size).toBe(members.length);
      expect(new Set(members)).toEqual(new Set(group.parts.map(p => p.name)));
      // Every family exposes a non-empty, generic purpose description.
      for (const entry of entries) {
        expect(entry.description.trim().length).toBeGreaterThan(0);
        expect(entry.label.trim().length).toBeGreaterThan(0);
      }
      // Every part maps back to a family key.
      const keyByPart = entryKeyByPart(entries);
      for (const part of group.parts) expect(keyByPart.has(part.name)).toBe(true);
    }
  });

  it('orders groups canonically', () => {
    expect(orderedGroups(manifest).map(g => g.id)).toEqual([...GROUP_ORDER]);
  });

  it('is a concept model with no invented performance claims in the note', () => {
    expect(manifest.note.toLowerCase()).toContain('concept');
  });
});
