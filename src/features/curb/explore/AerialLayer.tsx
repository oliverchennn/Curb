'use client';
import { aerial, aerialExtent, campusAerial, tileExtent, visibleTiles } from './aerial';

export type AerialSet = 'corridor' | 'campus';
const CORRIDOR = aerialExtent();
const OVERVIEW = tileExtent(campusAerial.overview);

/** The base image for a set: if it fails, the whole map falls back to Diagram. */
export const baseSrc = (set: AerialSet) => set === 'campus' ? campusAerial.overview.src : aerial.src;

/** Historical aerial context beneath archive geometry. Campus loads the overview always and adds only the
 *  detail tiles the current view needs; a failed tile is dropped, leaving the overview visible beneath it. */
export default function AerialLayer({ set, view, pixelsPerUnit, failed, onFail }: {
  set: AerialSet; view: [number, number, number, number]; pixelsPerUnit: number;
  failed: ReadonlySet<string>; onFail: (src: string) => void;
}) {
  if (set === 'corridor') return failed.has(aerial.src) ? null
    : <image href={aerial.src} x={CORRIDOR.x} y={CORRIDOR.y} width={CORRIDOR.width} height={CORRIDOR.height}
      preserveAspectRatio="none" onError={() => onFail(aerial.src)} aria-hidden="true" />;
  const tiles = visibleTiles(view, pixelsPerUnit).filter(t => !failed.has(t.src));
  return <g aria-hidden="true">
    {!failed.has(campusAerial.overview.src) && <image href={campusAerial.overview.src} x={OVERVIEW.x} y={OVERVIEW.y}
      width={OVERVIEW.width} height={OVERVIEW.height} preserveAspectRatio="none" onError={() => onFail(campusAerial.overview.src)} />}
    {tiles.map(t => { const e = tileExtent(t);
      return <image key={t.id} href={t.src} data-tile={t.id} x={e.x} y={e.y} width={e.width} height={e.height}
        preserveAspectRatio="none" onError={() => onFail(t.src)} />; })}
  </g>;
}
