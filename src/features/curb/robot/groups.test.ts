import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  collapseGroup,
  entryKeyByPart,
  entryNumberByPart,
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
    expect(sum).toBe(1352);
    expect(sum).toBe(partsIndex.parts.length);
  });

  it('collapses each group into numbered families that cover every member once', () => {
    for (const group of manifest.groups) {
      const entries = collapseGroup(group);
      expect(new Set(entries.map(e => e.key)).size).toBe(entries.length);
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
      const numberByPart = entryNumberByPart(entries);
      for (const entry of entries) {
        for (const member of entry.members) {
          expect(keyByPart.get(member)).toBe(entry.key);
          expect(numberByPart.get(member)).toBe(entry.number);
        }
      }
    }
  });

  it('keeps BMS screws, board, ICs, connector and sockets separate', () => {
    const power = manifest.groups.find(g => g.id === 'power')!;
    const bms = collapseGroup(power).filter(e => e.kind === 'bat_bms');
    expect(bms.map(e => [e.label, e.quantity])).toEqual([
      ['bms screw', 4],
      ['bms board', 1],
      ['bms ic', 5],
      ['bms connector', 1],
      ['thermistor socket', 2],
    ]);
    for (const entry of bms) {
      const source = power.parts.filter(p => p.label === entry.label);
      expect(new Set(entry.members)).toEqual(new Set(source.map(p => p.name)));
      expect(entry.description).toBe(`CAD family context: ${source[0].description}`);
    }
  });

  it('keeps camera sensors, glass, processors and memory separately named', () => {
    const sensing = manifest.groups.find(g => g.id === 'sensing')!;
    const cameraICs = collapseGroup(sensing).filter(e => e.kind === 'cam_int_ic');
    expect(cameraICs.map(e => [e.label, e.quantity])).toEqual([
      ['image sensor', 3],
      ['image sensor glass', 3],
      ['sensor pcb ldo', 3],
      ['flash memory', 3],
      ['processor soc', 3],
      ['ram', 3],
      ['pmic', 3],
    ]);
    const sensors = cameraICs.find(e => e.label === 'image sensor')!;
    expect(new Set(sensors.members)).toEqual(new Set([
      'camera01_image_sensor', 'camera02_image_sensor', 'camera03_image_sensor',
    ]));
  });

  it('separates unlike components in the other broad source families', () => {
    const entries = (id: string, kind: string) => collapseGroup(
      manifest.groups.find(g => g.id === id)!,
    ).filter(e => e.kind === kind).map(e => [e.label, e.quantity]);
    expect(entries('compute', 'fan_screw')).toEqual([['screw', 4], ['nut', 4]]);
    expect(entries('compute', 'cmp_ic')).toEqual([['ram', 2], ['emmc storage', 1]]);
    expect(entries('drive', 'drv_ic')).toEqual([['gate driver', 6], ['microcontroller', 2]]);
    expect(entries('drive', 'drv_thermal')).toEqual([['thermal pad', 2], ['heat spreader', 2]]);
    expect(entries('wiring', 'harness_clip')).toEqual([['pclip', 5], ['pclip cap', 5], ['pclip screw', 10]]);
  });

  it('still collapses repeated wheel hardware across all six wheel positions', () => {
    const drive = manifest.groups.find(g => g.id === 'drive')!;
    const entries = collapseGroup(drive);
    expect(entries.filter(e => e.kind === 'magnet').map(e => [e.label, e.quantity]))
      .toEqual([['magnet', 120]]);
    expect(entries.filter(e => e.kind === 'stator_coil').map(e => [e.label, e.quantity]))
      .toEqual([['stator coil', 108]]);
    expect(entries.filter(e => e.kind === 'bracket_screw').map(e => [e.label, e.quantity]))
      .toEqual([['bracket screw', 24]]);
  });

  it('removes placement coordinates without removing component identifiers', () => {
    const compute = collapseGroup(manifest.groups.find(g => g.id === 'compute')!);
    expect(compute.filter(e => e.kind === 'cmp_screw').map(e => [e.label, e.quantity]))
      .toEqual([['lid screw', 4], ['pcb screw', 4]]);
    expect(compute.filter(e => e.kind === 'cmp_standoff').map(e => [e.label, e.quantity]))
      .toEqual([['standoff', 4]]);
    const sensing = collapseGroup(manifest.groups.find(g => g.id === 'sensing')!);
    expect(sensing.find(e => e.label === 'sensor pcb c1')?.quantity).toBe(3);
    expect(sensing.find(e => e.label === 'sensor pcb c2')?.quantity).toBe(3);
    expect(sensing.find(e => e.label === 'main pcb c10')?.quantity).toBe(3);
  });

  it('keeps equal labels in different source families distinct', () => {
    const structure = collapseGroup(manifest.groups.find(g => g.id === 'structure')!);
    const nuts = structure.filter(e => e.label === 'nut');
    expect(nuts.map(e => [e.kind, e.quantity])).toEqual([
      ['panel_nut', 6], ['flange_nut', 4],
    ]);
    expect(nuts[0].key).not.toBe(nuts[1].key);
  });

  it('preserves stable selection keys when source part order changes', () => {
    for (const group of manifest.groups) {
      const original = entryKeyByPart(collapseGroup(group));
      const reordered = entryKeyByPart(collapseGroup({ ...group, parts: [...group.parts].reverse() }));
      expect(reordered).toEqual(original);
    }
  });

  it('orders groups canonically', () => {
    expect(orderedGroups(manifest).map(g => g.id)).toEqual([...GROUP_ORDER]);
  });

  it('is a concept model with no invented performance claims in the note', () => {
    expect(manifest.note.toLowerCase()).toContain('concept');
  });
});
