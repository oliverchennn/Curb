'use client';

import { CATEGORY_LABELS, POINT_CATEGORIES, mapCampusPoints, type CampusPoint, type PointCategory } from '../../../data/curb/princeton-campus-points/adapter';
import { project } from './model';
import type { BadgeBounds } from './labels';
import styles from './Explorer.module.css';

export type MapPosition = { x: number; y: number };
type MapView = [number, number, number, number];
type PointMarker = MapPosition & { point: CampusPoint; interactive: boolean; selected: boolean };

export type CampusPointLayer = {
  records: readonly CampusPoint[];
  selected: CampusPoint | null;
  request: { coordinates: [number, number]; focusMap: boolean } | null;
  onSelect: (point: CampusPoint) => void;
};

export const CAMPUS_POINT_TARGET = 44;
const MAX_INTERACTIVE_POINTS = 24;

export function layoutCampusPointMarkers(
  records: readonly CampusPoint[],
  selected: CampusPoint | null,
  bounds: BadgeBounds,
  unitsPerPixel: number,
  closeZoom: boolean,
  reserved: readonly MapPosition[],
) {
  const onPlot = ({ x, y }: MapPosition) => x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  const position = (coordinates: [number, number]) => {
    const [x, y] = project(coordinates);
    return { x, y };
  };
  const eligible = mapCampusPoints(records)
    .map(point => ({ point, ...position(point.geometry.coordinates) }))
    .filter(onPlot);
  const selectedPosition = selected?.geometry ? { point: selected, ...position(selected.geometry.coordinates) } : null;
  const candidates: (MapPosition & { point: CampusPoint })[] = eligible.filter(item => item.point.sourceFeatureId !== selected?.sourceFeatureId);
  if (selectedPosition && onPlot(selectedPosition)) candidates.unshift(selectedPosition);

  const markers: PointMarker[] = [];
  const occupied = [...reserved];
  const diameter = CAMPUS_POINT_TARGET * unitsPerPixel;
  const radius = diameter / 2;
  let interactiveCount = 0;
  for (const candidate of candidates) {
    const { x, y } = candidate;
    const active = candidate.point.sourceFeatureId === selected?.sourceFeatureId;
    const fits = x - radius >= bounds.left && x + radius <= bounds.right
      && y - radius >= bounds.top && y + radius <= bounds.bottom;
    const interactive = closeZoom && interactiveCount < MAX_INTERACTIVE_POINTS && fits
      && occupied.every(other => Math.abs(x - other.x) >= diameter || Math.abs(y - other.y) >= diameter);
    if (!interactive && !active) continue;
    markers.push({ ...candidate, interactive, selected: active });
    if (interactive) {
      occupied.push(candidate);
      interactiveCount += 1;
    }
  }
  return { eligible: eligible.length, markers, closeZoom };
}

export function viewForCampusPoint(coordinates: [number, number]): MapView {
  const [x, y] = project(coordinates);
  return [x - 80, y - 60, 160, 120];
}

function CategoryGlyph({ category }: { category: PointCategory }) {
  switch (category) {
    case 'crossing': return <path d="M-4 -4v8 M0 -4v8 M4 -4v8" />;
    case 'entrance': return <path d="M0 -5 5 4 -5 4Z" />;
    case 'kerb': return <rect x="-4" y="-4" width="8" height="8" rx=".5" />;
    case 'transit': return <circle r="4" />;
  }
}

export function CampusPointLegend() {
  return <ul className={styles.pointLegend} aria-label="Archive feature symbols">
    {POINT_CATEGORIES.map(category => <li key={category}>
      <svg viewBox="-8 -8 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
        <CategoryGlyph category={category} />
      </svg>
      {CATEGORY_LABELS[category]}
    </li>)}
  </ul>;
}

export function CampusPointMapStatus({ layout }: { layout: ReturnType<typeof layoutCampusPointMarkers> }) {
  return <p className={styles.pointMapStatus} data-point-map-count>
    {layout.eligible} eligible in view · {layout.markers.length} shown.
    {layout.closeZoom ? ' Browse features for the full results.' : ' Zoom in for symbols or browse features.'}
  </p>;
}

/** The HTML feature list provides the keyboard equivalent for every symbol. */
export default function CampusPointMarkers({ markers, unit, onSelect }: {
  markers: readonly PointMarker[]; unit: number; onSelect: CampusPointLayer['onSelect'];
}) {
  return <g aria-hidden="true">
    {markers.map(({ point, x, y, interactive, selected }) => <g
      key={point.sourceFeatureId} transform={'translate(' + x + ' ' + y + ') scale(' + unit + ')'}
      className={styles.pointMarker} data-point-marker={point.sourceFeatureId} data-selectable={interactive}
      pointerEvents={interactive ? undefined : 'none'} onClick={interactive ? () => onSelect(point) : undefined}>
      {interactive && <rect data-point-hit-area x={-CAMPUS_POINT_TARGET / 2} y={-CAMPUS_POINT_TARGET / 2}
        width={CAMPUS_POINT_TARGET} height={CAMPUS_POINT_TARGET} fill="transparent" />}
      {selected && <circle r="12" fill="none" stroke="#f0b46c" strokeWidth="3" />}
      <circle r="8.5" fill="#fffef8" stroke="#244b3a" strokeWidth="1.5" />
      <g fill="none" stroke="#244b3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <CategoryGlyph category={point.categories[0]} />
      </g>
      {point.categories.length > 1 && <circle cx="7" cy="-7" r="2.5" fill="#244b3a" stroke="#fffef8" />}
    </g>)}
  </g>;
}
