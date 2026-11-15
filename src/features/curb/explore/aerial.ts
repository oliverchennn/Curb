import { z } from 'zod';
import metadata from '../../../../public/curb/explore/aerial/princeton-2020.json';
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
