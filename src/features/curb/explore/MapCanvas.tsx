'use client';
import { useEffect, useRef, useState } from 'react';
import { fitFeatures, locatedFeatures, project, recordsFor, type Atlas, type Collection, type EvidenceRecord } from './model';
import styles from './Explorer.module.css';

export default function MapCanvas({ atlas, collection, records, selected, onSelect }: {
  atlas: Atlas; collection: Collection | null; records: EvidenceRecord[]; selected: EvidenceRecord | null; onSelect: (id: string) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<[number, number, number, number]>([-100, -160, 230, 260]);
  const [size, setSize] = useState([700, 460]);
  const drag = useRef<{ x: number; y: number; view: typeof view } | null>(null), moved = useRef(false);
  const features = locatedFeatures(atlas, records), hasMap = collection?.kind === 'archive';
  const unit = Math.max(view[2] / size[0], view[3] / size[1]);
  const fit = () => setView(fitFeatures(collection ? locatedFeatures(atlas, recordsFor(atlas, collection)) : []));
  // Fit only when changing collections; filtering and zoom retain record identity and view.
  useEffect(() => { setView(fitFeatures(collection ? locatedFeatures(atlas, recordsFor(atlas, collection)) : [])); }, [atlas, collection]);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(entries => { const r = entries[0].contentRect; if (r.width && r.height) setSize([r.width, r.height]); });
    observer.observe(svg.current); return () => observer.disconnect();
  }, []);
  const zoom = (factor: number) => { if (hasMap) setView(([x, y, w, h]) => {
    const f = Math.max(25 / w, Math.min(1200 / w, factor)); return [x + w * (1 - f) / 2, y + h * (1 - f) / 2, w * f, h * f];
  }); };
  const path = (coordinates: [number, number][]) => coordinates.map((p, i) => `${i ? 'L' : 'M'}${project(p).join(',')}`).join(' ');
  function localPoint(x: number, y: number) {
    const p = svg.current!.createSVGPoint(); p.x = x; p.y = y;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  }
  return <div className={styles.mapCanvas}>
    <div className={styles.mapTools} aria-label="Map controls">
      <button type="button" aria-label="Zoom in" aria-disabled={!hasMap} onClick={() => zoom(.75)}>+</button>
      <button type="button" aria-label="Zoom out" aria-disabled={!hasMap} onClick={() => zoom(1.333333)}>−</button>
      <button type="button" aria-disabled={!hasMap} onClick={() => { if (hasMap) fit(); }}>Fit collection</button>
    </div>
    <div className={styles.north} aria-label="North is up"><span aria-hidden="true">↑</span>N</div>
    <svg ref={svg} className={styles.mapSvg} viewBox={view.join(' ')} tabIndex={0} role="group"
      aria-label="Archive map. Arrow keys pan. Plus and minus zoom. Home fits the collection. Every marker is also in the evidence list."
      onKeyDown={e => {
        if (e.target !== e.currentTarget || !hasMap) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) {
          e.preventDefault(); if (e.key === 'Home') fit(); else if ('+=-'.includes(e.key)) zoom(e.key === '-' ? 1.333333 : .75);
          else setView(([x, y, w, h]) => [x + (e.key === 'ArrowRight' ? w / 8 : e.key === 'ArrowLeft' ? -w / 8 : 0), y + (e.key === 'ArrowDown' ? h / 8 : e.key === 'ArrowUp' ? -h / 8 : 0), w, h]);
        }
      }}
      onPointerDown={e => { if (!hasMap || e.button !== 0) return; const p = localPoint(e.clientX, e.clientY); drag.current = { x: p.x, y: p.y, view }; moved.current = false; }}
      onPointerMove={e => { if (!drag.current || !hasMap) return; const p = localPoint(e.clientX, e.clientY), d = drag.current;
        const dx = p.x - d.x, dy = p.y - d.y;
        if (Math.abs(dx) + Math.abs(dy) > unit * 3) moved.current = true;
        if (moved.current) { svg.current?.setPointerCapture(e.pointerId); setView(([x, y, w, h]) => [x - dx, y - dy, w, h]); }
      }}
      onPointerUp={e => { drag.current = null; if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId); }}
      onPointerCancel={() => { drag.current = null; }} onPointerLeave={() => { if (!moved.current) drag.current = null; }}>
      <title>Princeton source geometry · current traversal unknown</title>
      {hasMap && <>
        <g className={styles.contextLines} aria-hidden="true">{atlas.context.map(f => f.geometry?.type === 'LineString' && <path key={f.id} d={path(f.geometry.coordinates)} vectorEffect="non-scaling-stroke" />)}</g>
        <g className={styles.streetLabels} aria-hidden="true">
          <text x={-43} y={-50} transform="rotate(-72 -43 -50)" fontSize={12 * unit}>WITHERSPOON ST</text>
          <text x={48} y={72} transform="rotate(17 48 72)" fontSize={12 * unit}>NASSAU ST</text>
          <text x={-60} y={-105} fontSize={11 * unit}>SPRING ST</text>
          <text x={60} y={118} fontSize={11 * unit}>CAMPUS CONTEXT</text>
        </g>
        {features.map(f => {
          const record = records.find(r => r.featureId === f.id)!;
          const active = selected?.featureId === f.id;
          const select = () => onSelect(record.id);
          return <g key={f.id} role="button" tabIndex={0} aria-label={`Select ${f.label}, ${f.id}`} aria-pressed={active}
            data-feature={f.id} className={styles.mapFeature} onClick={e => { e.stopPropagation(); if (!moved.current) select(); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(); } }}>
            {f.geometry?.type === 'LineString' ? <>
              <path d={path(f.geometry.coordinates)} stroke="transparent" strokeWidth="22" fill="none" vectorEffect="non-scaling-stroke" />
              <path d={path(f.geometry.coordinates)} stroke={active ? '#fffdf4' : '#f5f4e9'} strokeWidth={active ? 10 : 7} fill="none" vectorEffect="non-scaling-stroke" />
              <path d={path(f.geometry.coordinates)} stroke={collection!.color} strokeWidth={active ? 6 : 4} strokeDasharray={f.type === 'crossing' ? '7 5' : undefined} fill="none" vectorEffect="non-scaling-stroke" />
            </> : f.geometry?.type === 'Point' ? <g transform={`translate(${project(f.geometry.coordinates).join(',')})`}>
              <circle r={13 * unit} fill="transparent" />
              {active && <circle r={11 * unit} fill="#f3d796" stroke="#8a551a" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
              <circle r={5.5 * unit} fill={active ? collection!.color : '#fffdf7'} stroke={collection!.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </g> : null}
          </g>;
        })}
      </>}
    </svg>
    {!hasMap && <div className={styles.unplacedMap}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 53S13 33 13 22a19 19 0 0 1 38 0c0 11-19 31-19 31Z" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/><circle cx="32" cy="23" r="6" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
      <h3>{collection ? 'Evidence without a pin' : 'No matching records'}</h3>
      <p>{collection?.kind === 'field' ? 'These five actual photographs have no verified finding coordinates. Explore them in Snapshots.' : collection ? 'Illustrative records stay separate from real geography.' : 'Clear the search or change the evidence type to explore the atlas.'}</p>
      {collection && <span>Location not yet placed · no markers drawn</span>}
    </div>}
    <div className={styles.mapFooter}><span>{hasMap ? 'Archive geometry · traversal unknown' : 'No inferred locations'}</span><span>{hasMap ? 'Drag to pan · + / − to zoom' : 'Records remain in the evidence list'}</span></div>
  </div>;
}
