'use client';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { FeatureCollectionSchema, type Coordinate, type FeatureCollection } from './index';
/** Dependency-free schematic GeoJSON map. Does not request tiles or represent navigational accuracy. */
export function GeoMap({
  data,
  mode = 'fixture',
  attribution = 'Local schematic · no basemap requested',
}: {
  data: FeatureCollection;
  mode?: 'fixture' | 'live' | 'local';
  attribution?: string;
}) {
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const helpId = useId();
  const { zoom, x, y } = view;
  const canZoomOut = zoom > 0.5;
  const canZoomIn = zoom < 3;
  const canPanLeft = zoom > 1 && x < 300 * (zoom - 1);
  const canPanRight = zoom > 1 && x > -300 * (zoom - 1);
  const canPanUp = zoom > 1 && y < 180 * (zoom - 1);
  const canPanDown = zoom > 1 && y > -180 * (zoom - 1);
  const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
  function changeZoom(delta: number) {
    setView(previous => {
      const next = Math.max(0.5, Math.min(3, previous.zoom + delta));
      return { zoom: next, x: clamp(previous.x, 300 * Math.max(0, next - 1)), y: clamp(previous.y, 180 * Math.max(0, next - 1)) };
    });
  }
  function pan(dx: number, dy: number) {
    setView(previous => ({ ...previous,
      x: clamp(previous.x + dx, 300 * Math.max(0, previous.zoom - 1)),
      y: clamp(previous.y + dy, 180 * Math.max(0, previous.zoom - 1)),
    }));
  }
  function reset() { setView({ zoom: 1, x: 0, y: 0 }); }
  function navigate(event: KeyboardEvent<SVGSVGElement>) {
    const moves: Record<string, [number, number]> = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] };
    if (moves[event.key]) pan(...moves[event.key]);
    else if (event.key === '+' || event.key === '=') changeZoom(0.25);
    else if (event.key === '-') changeZoom(-0.25);
    else if (event.key === 'Home') reset();
    else return;
    event.preventDefault();
  }
  const parsed = useMemo(() => FeatureCollectionSchema.safeParse(data), [data]);
  if (!parsed.success)
    return (
      <p role="alert">Invalid GeoJSON: supported geometries are Point, LineString and Polygon.</p>
    );
  const features = parsed.data.features;
  if (!features.length) return <p>No locations to display.</p>;
  const all: Coordinate[] = features.flatMap((f) =>
    f.geometry.type === 'Point'
      ? [f.geometry.coordinates]
      : f.geometry.type === 'LineString'
        ? f.geometry.coordinates
        : f.geometry.coordinates.flat(),
  );
  if (!all.length) return <p>No coordinates to display.</p>;
  const minLon = Math.min(...all.map((p) => p[0])),
    maxLon = Math.max(...all.map((p) => p[0])),
    minLat = Math.min(...all.map((p) => p[1])),
    maxLat = Math.max(...all.map((p) => p[1]));
  const spanLon = Math.max(maxLon - minLon, 0.001),
    spanLat = Math.max(maxLat - minLat, 0.001),
    midLon = (minLon + maxLon) / 2,
    midLat = (minLat + maxLat) / 2;
  const point = ([lon, lat]: Coordinate) => [
    300 + x + ((lon - midLon) / spanLon) * 480 * zoom,
    180 + y - ((lat - midLat) / spanLat) * 240 * zoom,
  ];
  return (
    <figure>
      <figcaption>{mode} · GeoJSON schematic map</figcaption>
      <div>
        <button
          type="button"
          aria-label="Zoom out map"
          aria-disabled={!canZoomOut}
          onClick={() => { if (canZoomOut) changeZoom(-0.25); }}
        >
          −
        </button>
        <button type="button" aria-label="Reset map view" onClick={reset}>
          Reset
        </button>
        <button
          type="button"
          aria-label="Zoom in map"
          aria-disabled={!canZoomIn}
          onClick={() => { if (canZoomIn) changeZoom(0.25); }}
        >
          +
        </button>
        <button type="button" aria-label="Pan map left" aria-disabled={!canPanLeft} onClick={() => { if (canPanLeft) pan(60, 0); }}>←</button>
        <button type="button" aria-label="Pan map right" aria-disabled={!canPanRight} onClick={() => { if (canPanRight) pan(-60, 0); }}>→</button>
        <button type="button" aria-label="Pan map up" aria-disabled={!canPanUp} onClick={() => { if (canPanUp) pan(0, 40); }}>↑</button>
        <button type="button" aria-label="Pan map down" aria-disabled={!canPanDown} onClick={() => { if (canPanDown) pan(0, -40); }}>↓</button>
      </div>
      <svg
        viewBox="0 0 600 360"
        role="img"
        aria-label="Locations and route schematic"
        aria-describedby={helpId}
        tabIndex={0}
        onKeyDown={navigate}
        style={{ width: '100%', background: '#edf5f1', borderRadius: 12 }}
      >
        <path
          d="M0 90H600 M0 180H600 M0 270H600 M150 0V360 M300 0V360 M450 0V360"
          fill="none"
          stroke="#d6e4dd"
        />
        {features.map((f, i) => {
          const name = String(f.properties?.name ?? f.id ?? `Feature ${i + 1}`);
          const g = f.geometry;
          if (g.type === 'Point') {
            const [x, y] = point(g.coordinates);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="7" fill="#166d62">
                  <title>
                    {name}: {g.coordinates.join(', ')}
                  </title>
                </circle>
                <text x={x + 12} y={y - 8} fontSize="12" fill="#173d35">
                  {name}
                </text>
              </g>
            );
          }
          if (g.type === 'LineString')
            return (
              <polyline
                key={i}
                points={g.coordinates.map((p) => point(p).join(',')).join(' ')}
                stroke="#167a9b"
                strokeWidth="4"
                fill="none"
              >
                <title>{name}</title>
              </polyline>
            );
          return (
            <path
              key={i}
              d={g.coordinates
                .map((ring) => `M${ring.map((p) => point(p).join(',')).join(' L')}Z`)
                .join(' ')}
              fill="#74b5a855"
              fillRule="evenodd"
              stroke="#398c79"
            >
              <title>{name}</title>
            </path>
          );
        })}
      </svg>
      <small id={helpId}>Zoom in, then use the arrow buttons or arrow keys on the map to pan. + / − zoom; Home resets the view.</small>
      <small>
        {attribution}. Projection is schematic; straight-line distance is not travel distance.
      </small>
    </figure>
  );
}
