import { z } from 'zod';
import metadata from '../../../../public/curb/explore/aerial/princeton-2020.json';
import campusMetadata from '../../../../public/curb/explore/aerial-campus/campus-2020.json';
import { project } from './model';

/** Root-supplied offline aerial cutout. Context only: never a field observation or proof of passability. */
const aerialSchema = z.object({
  src: z.string().regex(/^\/curb\/explore\/aerial\/[a-z0-9-]+\.jpg$/),
  crs: z.literal('EPSG:4326'),
  bounds: z.object({ west: z.number(), south: z.number(), east: z.number(), north: z.number() })
    .refine(b => b.west < b.east && b.south < b.north, 'Invalid aerial bounds'),
  captureYear: z.number().int(),
  capturedAt: z.string().nullable(),
  retrievedAt: z.string(),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  attribution: z.string().min(1),
  note: z.string().min(1),
});
export type AerialContext = z.infer<typeof aerialSchema>;
export const aerial: AerialContext = aerialSchema.parse(metadata);

/** SVG-space extent of the degree raster, through the explorer's existing affine project(). */
export function aerialExtent(a: AerialContext = aerial) {
  const [x1, y1] = project([a.bounds.west, a.bounds.north]);
  const [x2, y2] = project([a.bounds.east, a.bounds.south]);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function insideAerial([lon, lat]: [number, number], a: AerialContext = aerial) {
  return lon >= a.bounds.west && lon <= a.bounds.east && lat >= a.bounds.south && lat <= a.bounds.north;
}

/** Root's campus bundle: one overview plus 16 detail tiles. Only the overview loads at campus scale. */
const boundsSchema = z.object({ west: z.number(), south: z.number(), east: z.number(), north: z.number() })
  .refine(b => b.west < b.east && b.south < b.north, 'Invalid tile bounds');
const tileSchema = z.object({
  id: z.string().min(1), src: z.string().regex(/^\/curb\/explore\/aerial-campus\/[a-z0-9-]+\.jpg$/),
  width: z.number().int().positive(), height: z.number().int().positive(), bytes: z.number().int().positive(),
  bounds: boundsSchema, crs: z.literal('EPSG:4326'), retrievedAt: z.string(),
});
const campusSchema = z.object({
  id: z.string(), captureYear: z.number().int(), capturedAt: z.string().nullable(), sourceName: z.string().min(1),
  sourceUrl: z.url(), attribution: z.string().min(1), note: z.string().min(1), overview: tileSchema, tiles: z.array(tileSchema).min(1),
});
export type AerialTile = z.infer<typeof tileSchema>;
export const campusAerial = campusSchema.parse(campusMetadata);

export function tileExtent(t: { bounds: { west: number; south: number; east: number; north: number } }) {
  const [x1, y1] = project([t.bounds.west, t.bounds.north]);
  const [x2, y2] = project([t.bounds.east, t.bounds.south]);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function countFailedTiles(visible: AerialTile[], failed: ReadonlySet<string>): number {
  return visible.filter(tile => failed.has(tile.src)).length;
}

/** Screen pixels per SVG unit the overview can supply; detail tiles are only worth loading beyond it. */
export function overviewResolution(c = campusAerial) {
  return c.overview.width / tileExtent(c.overview).width;
}

/** Detail tiles needed for a view: none until the screen resolution exceeds the overview's (with 25% slack),
 *  then only tiles whose extent intersects the visible box. Pure, so the request budget is testable. */
export function visibleTiles(view: [number, number, number, number], pixelsPerUnit: number, c = campusAerial): AerialTile[] {
  if (pixelsPerUnit <= overviewResolution(c) * 1.25) return [];
  const [vx, vy, vw, vh] = view;
  return c.tiles.filter(t => {
    const e = tileExtent(t);
    return e.x < vx + vw && e.x + e.width > vx && e.y < vy + vh && e.y + e.height > vy;
  });
}
