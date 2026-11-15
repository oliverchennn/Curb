'use client';
import { useEffect, useState } from 'react';
import { aerial, aerialExtent, campusAerial, tileExtent, type AerialTile } from './aerial';

export type AerialSet = 'corridor' | 'campus';
const CORRIDOR = aerialExtent();
const OVERVIEW = tileExtent(campusAerial.overview);

/** The base image for a set: if it fails, the whole map falls back to Diagram. */
export const baseSrc = (set: AerialSet) => set === 'campus' ? campusAerial.overview.src : aerial.src;

/** Historical aerial context beneath archive geometry. Campus loads the overview always and adds only the
 *  detail tiles the current view needs; a failed tile is dropped, leaving the overview visible beneath it. */
export default function AerialLayer({ set, tiles, failed, onFail }: {
  set: AerialSet; tiles: AerialTile[];
  failed: ReadonlySet<string>; onFail: (src: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  // Wait for React to attach the error handlers before requesting any of these images.
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  if (set === 'corridor') return failed.has(aerial.src) ? null
    : <image href={aerial.src} x={CORRIDOR.x} y={CORRIDOR.y} width={CORRIDOR.width} height={CORRIDOR.height}
      preserveAspectRatio="none" onError={() => onFail(aerial.src)} aria-hidden="true" />;
  return <g aria-hidden="true">
    {!failed.has(campusAerial.overview.src) && <image href={campusAerial.overview.src} x={OVERVIEW.x} y={OVERVIEW.y}
      width={OVERVIEW.width} height={OVERVIEW.height} preserveAspectRatio="none" onError={() => onFail(campusAerial.overview.src)} />}
    {tiles.filter(t => !failed.has(t.src)).map(t => { const e = tileExtent(t);
      return <image key={t.id} href={t.src} data-tile={t.id} x={e.x} y={e.y} width={e.width} height={e.height}
        preserveAspectRatio="none" onError={() => onFail(t.src)} />; })}
  </g>;
}
