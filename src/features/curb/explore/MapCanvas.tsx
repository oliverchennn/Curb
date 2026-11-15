'use client';
import { useEffect, useRef, useState } from 'react';
import { archiveStatus, fitFeatures, locatedFeatures, project, recordsFor, type Atlas, type Collection, type EvidenceRecord, type Feature } from './model';
import styles from './Explorer.module.css';

type View = [number, number, number, number];

/** Archive map stage. Draws only original archive geometry; unplaced records never appear here. */
export default function MapCanvas({ atlas, collection, records, selected, onSelect, stops }: {
  atlas: Atlas; collection: Collection; records: EvidenceRecord[]; selected: EvidenceRecord | null;
  onSelect: (id: string) => void; stops: Map<string, number>;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>([-100, -160, 230, 260]);
  const [size, setSize] = useState([700, 460]);
  const drag = useRef<{ x: number; y: number; view: View } | null>(null), moved = useRef(false);
  const features = locatedFeatures(atlas, records);
  const unit = Math.max(view[2] / size[0], view[3] / size[1]);
  const selectedFeature = selected ? atlas.features.find(f => f.id === selected.featureId && f.geometry) : undefined;
  // Tighter than the overview default, leaving room above the top stop for its number badge.
  const fit = (f: Feature[]) => fitFeatures(f, 26, 40);
  const fitCollection = () => setView(fit(locatedFeatures(atlas, recordsFor(atlas, collection))));
  const fitSelection = () => { if (selectedFeature) setView(fit([selectedFeature])); };
  // Fit only when changing collections; filtering, selection and zoom keep the current view.
  useEffect(() => { setView(fitFeatures(locatedFeatures(atlas, recordsFor(atlas, collection)), 26, 40)); }, [atlas, collection]);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(entries => { const r = entries[0].contentRect; if (r.width && r.height) setSize([r.width, r.height]); });
    observer.observe(svg.current); return () => observer.disconnect();
  }, []);
  const zoom = (factor: number) => setView(([x, y, w, h]) => {
    const f = Math.max(25 / w, Math.min(1200 / w, factor)); return [x + w * (1 - f) / 2, y + h * (1 - f) / 2, w * f, h * f];
  });
  const path = (coordinates: [number, number][]) => coordinates.map((p, i) => `${i ? 'L' : 'M'}${project(p).join(',')}`).join(' ');
  function localPoint(x: number, y: number) {
    const p = svg.current!.createSVGPoint(); p.x = x; p.y = y;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  }
  const anchor = (f: Feature): [number, number] => {
    if (f.geometry?.type === 'Point') return project(f.geometry.coordinates);
    const c = (f.geometry?.coordinates ?? []) as [number, number][]; const a = project(c[0]), b = project(c[c.length - 1]);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  return <div className={styles.mapCanvas}>
    <div className={styles.mapTools} role="group" aria-label="Map controls">
      <button type="button" aria-label="Zoom in" onClick={() => zoom(.75)}>+</button>
      <button type="button" aria-label="Zoom out" onClick={() => zoom(1.333333)}>−</button>
      <button type="button" onClick={fitCollection}>Fit collection</button>
      <button type="button" aria-disabled={!selectedFeature} onClick={fitSelection}
        title={selectedFeature ? undefined : 'The selected record has no archive geometry'}>Fit selection</button>
    </div>
    <div className={styles.north} aria-hidden="true"><span>↑</span>N</div>
    <svg ref={svg} className={styles.mapSvg} viewBox={view.join(' ')} tabIndex={0} role="group"
      aria-label="Archive map. Arrow keys pan. Plus and minus zoom. Home fits the collection. Tab reaches paths, then ramps; the evidence reel lists every stop in source order."
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) {
          e.preventDefault(); if (e.key === 'Home') fitCollection(); else if ('+=-'.includes(e.key)) zoom(e.key === '-' ? 1.333333 : .75);
          else setView(([x, y, w, h]) => [x + (e.key === 'ArrowRight' ? w / 8 : e.key === 'ArrowLeft' ? -w / 8 : 0), y + (e.key === 'ArrowDown' ? h / 8 : e.key === 'ArrowUp' ? -h / 8 : 0), w, h]);
        }
      }}
      onPointerDown={e => { if (e.button !== 0) return; const p = localPoint(e.clientX, e.clientY); drag.current = { x: p.x, y: p.y, view }; moved.current = false; }}
      onPointerMove={e => { if (!drag.current) return; const p = localPoint(e.clientX, e.clientY), d = drag.current;
        const dx = p.x - d.x, dy = p.y - d.y;
        if (Math.abs(dx) + Math.abs(dy) > unit * 3) moved.current = true;
        if (moved.current) { svg.current?.setPointerCapture(e.pointerId); setView(([x, y, w, h]) => [x - dx, y - dy, w, h]); }
      }}
      onPointerUp={e => { drag.current = null; if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId); }}
      onPointerCancel={() => { drag.current = null; }} onPointerLeave={() => { if (!moved.current) drag.current = null; }}>
      <title>Princeton archive geometry · current traversal unknown</title>
      <g className={styles.contextLines} aria-hidden="true">{atlas.context.map(f => f.geometry?.type === 'LineString' && <path key={f.id} d={path(f.geometry.coordinates)} vectorEffect="non-scaling-stroke" />)}</g>
      <g className={styles.streetLabels} aria-hidden="true">
        <text x={-77} y={-20} transform="rotate(-72 -77 -20)" fontSize={11 * unit}>WITHERSPOON ST</text>
        <text x={48} y={72} transform="rotate(17 48 72)" fontSize={12 * unit}>NASSAU ST</text>
        <text x={10} y={-95} fontSize={11 * unit}>SPRING ST</text>
        <text x={60} y={118} fontSize={11 * unit}>CAMPUS CONTEXT</text>
      </g>
      {features.map(f => {
        const record = records.find(r => r.featureId === f.id)!;
        const active = selected?.featureId === f.id;
        const status = archiveStatus(f);
        const stop = stops.get(record.id);
        const select = () => onSelect(record.id);
        return <g key={f.id} role="button" tabIndex={0} aria-pressed={active} data-feature={f.id} data-status={status ?? undefined}
          aria-label={`Stop ${stop}: ${f.label}, ${f.id}${status ? `, archived status ${status.toLowerCase()}` : ''}`}
          className={styles.mapFeature} onClick={e => { e.stopPropagation(); if (!moved.current) select(); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(); } }}>
          {f.geometry?.type === 'LineString' ? <>
            <path d={path(f.geometry.coordinates)} stroke="transparent" strokeWidth="34" fill="none" vectorEffect="non-scaling-stroke" />
            <path d={path(f.geometry.coordinates)} stroke={active ? '#fffdf4' : '#f5f4e9'} strokeWidth={active ? 11 : 8} fill="none" vectorEffect="non-scaling-stroke" />
            <path d={path(f.geometry.coordinates)} stroke={collection.color} strokeWidth={active ? 6 : 4} strokeDasharray={f.type === 'crossing' ? '7 5' : undefined} fill="none" vectorEffect="non-scaling-stroke" />
          </> : f.geometry?.type === 'Point' ? <g transform={`translate(${project(f.geometry.coordinates).join(',')})`}>
            <circle r={20 * unit} fill="transparent" />
            {active && <circle r={12 * unit} fill="#f3d796" stroke="#8a551a" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
            <circle r={6.5 * unit} fill={status === 'ASSUMED' ? '#fffdf7' : active ? collection.color : '#fffdf7'}
              stroke={collection.color} strokeWidth={status === 'ASSUMED' ? 2.5 : 3} strokeDasharray={status === 'ASSUMED' ? '3 2.4' : undefined} vectorEffect="non-scaling-stroke" />
          </g> : null}
          {stop !== undefined && (() => { const [x, y] = anchor(f); const dy = f.geometry?.type === 'Point' ? -15 * unit : -11 * unit;
            return <g transform={`translate(${x},${y + dy})`} aria-hidden="true">
              <circle r={8.5 * unit} fill={active ? '#213a2c' : '#fffef8'} stroke={collection.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <text y={3.6 * unit} fontSize={10 * unit} fontWeight={700} textAnchor="middle" fill={active ? '#fffef8' : '#213a2c'}>{stop}</text>
            </g>; })()}
        </g>;
      })}
    </svg>
    <div className={styles.legend} role="note" aria-label="Map legend">
      <span><i className={styles.legendPath} style={{ borderColor: collection.color }} />Path</span>
      <span><i className={styles.legendCrossing} style={{ borderColor: collection.color }} />Crossing</span>
      <span><i className={styles.legendRamp} style={{ borderColor: collection.color }} />Ramp · archived EXISTING</span>
      <span><i className={styles.legendAssumed} style={{ borderColor: collection.color }} />Ramp · archived ASSUMED</span>
      <small>Numbers follow source order, not travel. Archive labels are not current condition or passability.</small>
    </div>
  </div>;
}
