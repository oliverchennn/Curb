'use client';
import { useEffect, useRef, useState } from 'react';
import { archiveStatus, fitFeatures, locatedFeatures, project, recordsFor, type Atlas, type Collection, type EvidenceRecord, type Feature } from './model';
import { aerial, aerialExtent } from './aerial';
import { placeBadges, streetLabel } from './labels';
import styles from './Explorer.module.css';

type View = [number, number, number, number];
type Base = 'aerial' | 'diagram';
const EXTENT = aerialExtent();
const STOP_TARGET_DIAMETER = 44;
// Street names are orientation labels placed beside the archive lines that carry them; they are not data.
function streetLabels(atlas: Atlas) {
  const ends = (id: string): [[number, number], [number, number]] | null => {
    const g = atlas.features.find(f => f.id === id)?.geometry;
    if (g?.type !== 'LineString') return null;
    return [project(g.coordinates[0]), project(g.coordinates[g.coordinates.length - 1])];
  };
  const out: { text: string; x: number; y: number; rotate: number }[] = [];
  const w = ends('lines:809875'), n = ends('lines:951724'), s = ends('lines:834112');
  if (w) out.push({ text: 'WITHERSPOON ST', ...streetLabel(w[0], w[1], [-1, 0], 9) });
  if (n) out.push({ text: 'NASSAU ST', ...streetLabel(n[0], n[1], [0, -1], 11) });
  // The Spring Street crossing spans the street, so the label runs perpendicular to it, east of the crossing.
  if (s) {
    const [a, b] = s, mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    // Street axis is perpendicular to the crossing; point it east and slide the label along it.
    let tx = -(b[1] - a[1]), ty = b[0] - a[0]; if (tx < 0) { tx = -tx; ty = -ty; }
    const axisEnd: [number, number] = [mid[0] + tx, mid[1] + ty];
    out.push({ text: 'SPRING ST', ...streetLabel(mid, axisEnd, [0, -1], 0, 28) });
  }
  return out;
}

/** Archive map stage. Draws only original archive geometry on the existing projection; unplaced records never appear. */
export default function MapCanvas({ atlas, collection, records, selected, onSelect, stops }: {
  atlas: Atlas; collection: Collection; records: EvidenceRecord[]; selected: EvidenceRecord | null;
  onSelect: (id: string) => void; stops: Map<string, number>;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>([-100, -160, 230, 260]);
  const [size, setSize] = useState([900, 520]);
  const [base, setBase] = useState<Base>('aerial');
  const [aerialFailed, setAerialFailed] = useState(false);
  const showAerial = base === 'aerial' && !aerialFailed;
  const drag = useRef<{ x: number; y: number; view: View } | null>(null), moved = useRef(false);
  const features = locatedFeatures(atlas, records);
  const unit = Math.max(view[2] / size[0], view[3] / size[1]);
  const targetRadius = STOP_TARGET_DIAMETER / 2 * unit;
  const selectedFeature = selected ? atlas.features.find(f => f.id === selected.featureId && f.geometry) : undefined;
  // Tighter than the overview default, leaving room above the top stop for its number badge.
  const fit = (f: Feature[]) => fitFeatures(f, 26, 40);
  const fitCollection = () => setView(fit(locatedFeatures(atlas, recordsFor(atlas, collection))));
  const fitSelection = () => { if (selectedFeature) setView(fitFeatures([selectedFeature], 30, 30)); };
  // Fit only when changing collections; filtering, selection and zoom keep the current view.
  useEffect(() => { setView(fitFeatures(locatedFeatures(atlas, recordsFor(atlas, collection)), 26, 40)); }, [atlas, collection]);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(entries => { const r = entries[0].contentRect; if (r.width && r.height) setSize([r.width, r.height]); });
    observer.observe(svg.current); return () => observer.disconnect();
  }, []);
  const zoom = (factor: number) => setView(([x, y, w, h]) => {
    const f = Math.max(12 / w, Math.min(1200 / w, factor)); return [x + w * (1 - f) / 2, y + h * (1 - f) / 2, w * f, h * f];
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
  const entries = features.map(f => ({ f, record: records.find(r => r.featureId === f.id)! }))
    .sort((a, b) => (stops.get(a.record.id) ?? 0) - (stops.get(b.record.id) ?? 0));
  // Selected badge is placed first so it always keeps its natural position.
  const order = [...entries].sort((a, b) => Number(b.f.id === selected?.featureId) - Number(a.f.id === selected?.featureId));
  const badges = placeBadges(order.map(({ f, record }) => {
    const [x, y] = anchor(f); return { id: record.id, x, y, dy: -targetRadius };
  }), targetRadius, entries.filter(({ f }) => f.geometry?.type === 'Point').map(({ f, record }) => { const [x, y] = anchor(f); return { id: record.id, x, y }; }));
  const halo = showAerial ? '#13201a' : '#fffef8', ink = showAerial ? '#ffffff' : '#213a2c';
  return <div className={styles.mapCanvas} data-base={showAerial ? 'aerial' : 'diagram'}>
    <div className={styles.mapTools} role="group" aria-label="Map controls">
      <button type="button" aria-label="Zoom in" onClick={() => zoom(.75)}>+</button>
      <button type="button" aria-label="Zoom out" onClick={() => zoom(1.333333)}>−</button>
      <button type="button" onClick={fitCollection}>Fit collection</button>
      <button type="button" aria-disabled={!selectedFeature} onClick={fitSelection}
        title={selectedFeature ? undefined : 'The selected record has no archive geometry'}>Fit selection</button>
    </div>
    <div className={styles.baseToggle} role="group" aria-label="Map background">
      <button type="button" aria-pressed={showAerial} aria-disabled={aerialFailed} onClick={() => { if (!aerialFailed) setBase('aerial'); }}
        title={aerialFailed ? 'Aerial image could not be loaded' : undefined}>Aerial</button>
      <button type="button" aria-pressed={!showAerial} onClick={() => setBase('diagram')}>Diagram</button>
    </div>
    <div className={styles.north} aria-hidden="true"><span>↑</span>N</div>
    {aerialFailed && <p className={styles.mapNotice} role="status">Aerial image unavailable — showing Diagram. Every record is unchanged.</p>}
    <svg ref={svg} className={styles.mapSvg} viewBox={view.join(' ')} tabIndex={0} role="group"
      aria-label={`Archive map on ${showAerial ? 'a 2020 aerial image' : 'a diagram'}. Arrow keys pan. Plus and minus zoom. Home fits the collection. Tab reaches mapped stops in source order. The record navigator includes unplaced records.`}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) {
          e.preventDefault(); if (e.key === 'Home') fitCollection(); else if (['+', '=', '-'].includes(e.key)) zoom(e.key === '-' ? 1.333333 : .75);
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
      <g className={styles.contextLines} aria-hidden="true">
        {atlas.context.map(f => f.geometry?.type === 'LineString' && <path key={f.id} d={path(f.geometry.coordinates)} vectorEffect="non-scaling-stroke" />)}
      </g>
      {showAerial && <image href={aerial.src} x={EXTENT.x} y={EXTENT.y} width={EXTENT.width} height={EXTENT.height}
        preserveAspectRatio="none" onError={() => setAerialFailed(true)} aria-hidden="true" />}
      <g aria-hidden="true">{streetLabels(atlas).map(s => <text key={s.text} x={s.x} y={s.y} textAnchor="middle" transform={s.rotate ? `rotate(${s.rotate} ${s.x} ${s.y})` : undefined}
        fontSize={12 * unit} fontWeight={700} letterSpacing=".08em" fill={ink} stroke={halo} strokeWidth={3.5 * unit} paintOrder="stroke" className={styles.streetLabel}>{s.text}</text>)}</g>
      {entries.map(({ f, record }) => {
        const active = selected?.featureId === f.id;
        const status = archiveStatus(f);
        const stop = stops.get(record.id);
        const select = () => onSelect(record.id);
        return <g key={f.id} role="button" tabIndex={0} aria-pressed={active} data-feature={f.id} data-status={status ?? undefined}
          aria-label={`Stop ${stop}: ${f.label}, ${f.id}${status ? `, archived status ${status.toLowerCase()}` : ''}`}
          className={styles.mapFeature} onClick={e => { e.stopPropagation(); if (!moved.current) select(); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(); } }}>
          {f.geometry?.type === 'LineString' ? <>
            <path d={path(f.geometry.coordinates)} stroke="transparent" strokeWidth={STOP_TARGET_DIAMETER} fill="none" vectorEffect="non-scaling-stroke" />
            <path d={path(f.geometry.coordinates)} stroke={showAerial ? '#ffffff' : active ? '#fffdf4' : '#f5f4e9'} strokeWidth={active ? 12 : 9} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={path(f.geometry.coordinates)} stroke={collection.color} strokeWidth={active ? 7 : 5} strokeDasharray={f.type === 'crossing' ? '7 5' : undefined} fill="none" vectorEffect="non-scaling-stroke" />
          </> : f.geometry?.type === 'Point' ? <g transform={`translate(${project(f.geometry.coordinates).join(',')})`}>
            <circle r={targetRadius} fill="transparent" />
            {active && <circle r={12 * unit} fill="#f3d796" stroke="#8a551a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
            <circle r={7 * unit} fill={status === 'ASSUMED' || !active ? '#fffdf7' : collection.color}
              stroke={collection.color} strokeWidth={status === 'ASSUMED' ? 2.5 : 3.5} strokeDasharray={status === 'ASSUMED' ? '3 2.4' : undefined} vectorEffect="non-scaling-stroke" />
          </g> : null}
        </g>;
      })}
      <g aria-hidden="true">{entries.map(({ f, record }) => {
        const b = badges.get(record.id), stop = stops.get(record.id); if (!b || stop === undefined) return null;
        const active = selected?.featureId === f.id, [ax, ay] = anchor(f);
        return <g key={record.id} className={styles.badge} onClick={() => { if (!moved.current) onSelect(record.id); }}>
          {b.moved && <line x1={ax} y1={ay} x2={b.x} y2={b.y} stroke={showAerial ? '#ffffff' : '#4b5d4f'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
          <circle cx={b.x} cy={b.y} r={targetRadius} fill="transparent" />
          <circle cx={b.x} cy={b.y} r={8.5 * unit} fill={active ? '#213a2c' : '#fffef8'} stroke={collection.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <text x={b.x} y={b.y + 3.6 * unit} fontSize={10 * unit} fontWeight={700} textAnchor="middle" fill={active ? '#fffef8' : '#213a2c'}>{stop}</text>
        </g>;
      })}</g>
      {selectedFeature && (() => { const b = selected && badges.get(selected.id); if (!b) return null;
        const flip = b.x > view[0] + view[2] * .62;
        return <text className={styles.selectedLabel} x={flip ? b.x - 12 * unit : b.x + 12 * unit} y={b.y + 4.5 * unit} textAnchor={flip ? 'end' : 'start'} fontSize={13 * unit} fontWeight={700}
          fill={ink} stroke={halo} strokeWidth={4 * unit} paintOrder="stroke" aria-hidden="true">{selectedFeature.label}</text>; })()}
    </svg>
    {showAerial && <span className={styles.mapCredit}>Aerial {aerial.captureYear} · NJ Office of GIS</span>}
    <details className={styles.legend}>
      <summary>
        <span><i className={styles.legendPath} style={{ borderColor: collection.color }} />Path</span>
        <span><i className={styles.legendCrossing} style={{ borderColor: collection.color }} />Crossing</span>
        <span><i className={styles.legendRamp} style={{ borderColor: collection.color }} />Ramp · EXISTING</span>
        <span><i className={styles.legendAssumed} style={{ borderColor: collection.color }} />Ramp · ASSUMED</span>
        <span className={styles.legendMore}>Map key &amp; sources</span>
      </summary>
      <div>
        <p>Numbers follow source order, not travel. EXISTING and ASSUMED are archived labels, not current condition or passability.</p>
        <p><strong>Aerial background:</strong> {aerial.attribution} Capture year {aerial.captureYear}; exact capture date {aerial.capturedAt ?? 'Unknown'}. Retrieved {aerial.retrievedAt.slice(0, 10)}. {aerial.note} <a href={aerial.sourceUrl} target="_blank" rel="noreferrer">Imagery source →</a></p>
        <p>Street names are approximate orientation labels.</p>
      </div>
    </details>
  </div>;
}
