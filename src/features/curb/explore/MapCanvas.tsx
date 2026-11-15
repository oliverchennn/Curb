'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { archiveStatus, fitFeatures, locatedFeatures, project, recordsFor, type Atlas, type Collection, type EvidenceRecord, type Feature } from './model';
import { aerial, campusAerial } from './aerial';
import AerialLayer, { baseSrc, type AerialSet } from './AerialLayer';
import { placeBadges, streetLabel } from './labels';
import { OSM_COPYRIGHT, OsmCredit } from './OsmCredit';
import styles from './Explorer.module.css';

type View = [number, number, number, number];
type Base = 'aerial' | 'diagram';
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
const isSteps = (f: Feature) => 'osm_way_id' in f.properties && f.properties.feat_type === 'steps';

/** Archive map stage. Draws only original archive geometry on the existing projection; unplaced records never appear.
 *  `set` chooses the local aerial (downtown corridor or campus tiles); `context` is faint non-interactive geometry. */
export default function MapCanvas({ atlas, collection, records, selected, onSelect, stops, set = 'corridor', context, osm = false, dense = false }: {
  atlas: Atlas; collection: Collection; records: EvidenceRecord[]; selected: EvidenceRecord | null;
  onSelect: (id: string) => void; stops: Map<string, number>;
  set?: AerialSet; context?: string; osm?: boolean; dense?: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>([-100, -160, 230, 260]);
  const [size, setSize] = useState([900, 520]);
  const [base, setBase] = useState<Base>('aerial');
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const featureRefs = useRef(new Map<string, SVGGElement>());
  const aerialFailed = failed.has(baseSrc(set));
  const tileFailures = [...failed].filter(s => s !== baseSrc(set) && set === 'campus').length;
  const showAerial = base === 'aerial' && !aerialFailed;
  const drag = useRef<{ x: number; y: number; view: View } | null>(null), moved = useRef(false);
  const features = locatedFeatures(atlas, records);
  const unit = Math.max(view[2] / size[0], view[3] / size[1]);
  const targetRadius = STOP_TARGET_DIAMETER / 2 * unit;
  const plotLeft = view[0] + (view[2] - size[0] * unit) / 2;
  const plotTop = view[1] + (view[3] - size[1] * unit) / 2;
  const plotBounds = { left: plotLeft, top: plotTop, right: plotLeft + size[0] * unit, bottom: plotTop + size[1] * unit };
  const visibleView: View = [plotLeft, plotTop, size[0] * unit, size[1] * unit];
  const selectedFeature = selected ? atlas.features.find(f => f.id === selected.featureId && f.geometry) : undefined;
  const collectionFit = useMemo(() => fitFeatures(locatedFeatures(atlas, recordsFor(atlas, collection)), 26, 40), [atlas, collection]);
  // Zoom-out cap derived from the content: the old fixed 1200-unit cap cannot show a whole campus section's context.
  const maxWidth = Math.max(1200, collectionFit[2] * 4, collectionFit[3] * 4);
  const fitCollection = () => setView(collectionFit);
  const fitSelection = () => { if (selectedFeature) setView(fitFeatures([selectedFeature], 30, 30)); };
  // Fit only when changing collections; filtering, selection and zoom keep the current view.
  useEffect(() => { setView(collectionFit); setFocusId(null); }, [collectionFit]);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(entries => { const r = entries[0].contentRect; if (r.width && r.height) setSize([r.width, r.height]); });
    observer.observe(svg.current); return () => observer.disconnect();
  }, []);
  const zoom = (factor: number) => setView(([x, y, w, h]) => {
    const f = Math.max(12 / w, Math.min(maxWidth / w, factor)); return [x + w * (1 - f) / 2, y + h * (1 - f) / 2, w * f, h * f];
  });
  const path = (coordinates: [number, number][]) => coordinates.map((p, i) => `${i ? 'L' : 'M'}${project(p).join(',')}`).join(' ');
  function localPoint(x: number, y: number) {
    const p = svg.current!.createSVGPoint(); p.x = x; p.y = y;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  }
  const anchor = (f: Feature): [number, number] => {
    if (f.geometry?.type === 'Point') return project(f.geometry.coordinates);
    const c = (f.geometry?.coordinates ?? []) as [number, number][];
    if (c.length > 2) return project(c[Math.floor(c.length / 2)]);
    const a = project(c[0]), b = project(c[c.length - 1]);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const entries = features.map(f => ({ f, record: records.find(r => r.featureId === f.id)! }))
    .sort((a, b) => (stops.get(a.record.id) ?? 0) - (stops.get(b.record.id) ?? 0));
  // Place the selected badge first so it gets the nearest available position and is never hidden.
  const order = [...entries].sort((a, b) => Number(b.f.id === selected?.featureId) - Number(a.f.id === selected?.featureId));
  const badges = placeBadges(order.map(({ f, record }) => {
    const [x, y] = anchor(f); return { id: record.id, x, y, dy: -targetRadius };
  }), targetRadius, entries.filter(({ f }) => f.geometry?.type === 'Point').map(({ f, record }) => { const [x, y] = anchor(f); return { id: record.id, x, y }; }),
  plotBounds, { hideCrowded: dense, keep: selected?.id });
  const hidden = entries.length - badges.size;
  // One roving tab stop for all mapped stops: arrows move focus in source order, Enter/Space selects, Escape returns to the map.
  const rovingId = (focusId && entries.some(e => e.f.id === focusId) ? focusId : selected?.featureId && entries.some(e => e.f.id === selected.featureId) ? selected.featureId : entries[0]?.f.id) ?? null;
  const moveFocus = (from: string, delta: number | 'first' | 'last') => {
    const i = entries.findIndex(e => e.f.id === from);
    const n = delta === 'first' ? 0 : delta === 'last' ? entries.length - 1 : (i + delta + entries.length) % entries.length;
    const id = entries[n]?.f.id; if (!id) return;
    setFocusId(id); featureRefs.current.get(id)?.focus();
  };
  const halo = showAerial ? '#13201a' : '#fffef8', ink = showAerial ? '#ffffff' : '#213a2c';
  const imagery = set === 'campus' ? campusAerial : aerial;
  return <div className={styles.mapCanvas} data-base={showAerial ? 'aerial' : 'diagram'}>
    <div className={styles.mapToolbar}>
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
    </div>
    {aerialFailed && <p className={styles.mapNotice} role="status">Aerial image unavailable — showing Diagram. Every record is unchanged.</p>}
    {!aerialFailed && tileFailures > 0 && showAerial && <p className={styles.mapNotice} role="status">{tileFailures} detail {tileFailures === 1 ? 'tile' : 'tiles'} unavailable — the overview image is shown there. Every record is unchanged.</p>}
    {dense && hidden > 0 && <p className={styles.mapHint}>{hidden} stop {hidden === 1 ? 'number' : 'numbers'} hidden where they would overlap. Zoom in, or use the record list; every way stays drawn.</p>}
    <svg ref={svg} className={styles.mapSvg} viewBox={view.join(' ')} tabIndex={0} role="group"
      aria-label={`Archive map on ${showAerial ? 'a 2020 aerial image' : 'a diagram'}. Arrow keys pan. Plus and minus zoom. Home fits the collection. Tab once to reach the mapped stops; arrow keys move between them in source order, Enter selects, Escape returns here.`}
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
      {set === 'corridor' && <g className={styles.contextLines} aria-hidden="true">
        {atlas.context.map(f => f.geometry?.type === 'LineString' && <path key={f.id} d={path(f.geometry.coordinates)} vectorEffect="non-scaling-stroke" />)}
      </g>}
      {showAerial && <AerialLayer set={set} view={visibleView} pixelsPerUnit={1 / unit} failed={failed}
        onFail={src => setFailed(prev => new Set(prev).add(src))} />}
      {context && <path className={styles.campusContext} d={context} data-base={showAerial ? 'aerial' : 'diagram'} vectorEffect="non-scaling-stroke" aria-hidden="true" />}
      {set === 'corridor' && <g aria-hidden="true">{streetLabels(atlas).map(s => <text key={s.text} x={s.x} y={s.y} textAnchor="middle" transform={s.rotate ? `rotate(${s.rotate} ${s.x} ${s.y})` : undefined}
        fontSize={12 * unit} fontWeight={700} letterSpacing=".08em" fill={ink} stroke={halo} strokeWidth={3.5 * unit} paintOrder="stroke" className={styles.streetLabel}>{s.text}</text>)}</g>}
      {entries.map(({ f, record }) => {
        const active = selected?.featureId === f.id;
        const status = archiveStatus(f);
        const stop = stops.get(record.id);
        const steps = isSteps(f);
        const select = () => onSelect(record.id);
        return <g key={f.id} ref={el => { if (el) featureRefs.current.set(f.id, el); else featureRefs.current.delete(f.id); }}
          role="button" tabIndex={f.id === rovingId ? 0 : -1} aria-pressed={active} data-feature={f.id} data-status={status ?? undefined} data-class={steps ? 'steps' : undefined}
          aria-label={`Stop ${stop}: ${f.label}${steps ? ', source class steps' : ''}${status ? `, archived status ${status.toLowerCase()}` : ''}`}
          className={styles.mapFeature} onClick={e => { e.stopPropagation(); if (!moved.current) select(); }} onFocus={() => setFocusId(f.id)}
          onKeyDown={e => {
            const k = e.key;
            if (k === 'Enter' || k === ' ') { e.preventDefault(); e.stopPropagation(); select(); }
            else if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); moveFocus(f.id, 1); }
            else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); moveFocus(f.id, -1); }
            else if (k === 'Home' || k === 'End') { e.preventDefault(); e.stopPropagation(); moveFocus(f.id, k === 'Home' ? 'first' : 'last'); }
            else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); svg.current?.focus(); }
          }}>
          {f.geometry?.type === 'LineString' ? <>
            <path d={path(f.geometry.coordinates)} stroke="transparent" strokeWidth={STOP_TARGET_DIAMETER} fill="none" vectorEffect="non-scaling-stroke" />
            <path d={path(f.geometry.coordinates)} stroke={showAerial ? '#ffffff' : active ? '#fffdf4' : '#f5f4e9'} strokeWidth={active ? 12 : 9} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={path(f.geometry.coordinates)} stroke={collection.color} strokeWidth={active ? 7 : steps ? 6 : 5}
              strokeDasharray={steps ? '2.5 2.5' : f.type === 'crossing' ? '7 5' : undefined} fill="none" vectorEffect="non-scaling-stroke" />
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
        // Flip toward whichever side has room for the label's estimated width (13px bold, ~7.4px per character).
        const width = selectedFeature.label.length * 7.4 * unit, right = plotBounds.right - b.x - 12 * unit, left = b.x - plotBounds.left - 12 * unit;
        const flip = right < width && left > right;
        return <text className={styles.selectedLabel} x={flip ? b.x - 12 * unit : b.x + 12 * unit} y={b.y + 4.5 * unit} textAnchor={flip ? 'end' : 'start'} fontSize={13 * unit} fontWeight={700}
          fill={ink} stroke={halo} strokeWidth={4 * unit} paintOrder="stroke" aria-hidden="true">{selectedFeature.label}</text>; })()}
    </svg>
    <div className={styles.mapCredit}>
      {showAerial && <span>Aerial {imagery.captureYear} · NJ Office of GIS</span>}
      {osm && <OsmCredit />}
    </div>
    <details className={styles.legend}>
      <summary>
        <span><i className={styles.legendPath} style={{ borderColor: collection.color }} />{osm ? 'Footway / path' : 'Path'}</span>
        <span><i className={styles.legendCrossing} style={{ borderColor: collection.color }} />Crossing</span>
        {osm ? <span><i className={styles.legendSteps} style={{ borderColor: collection.color }} />Steps (source class)</span> : <>
          <span><i className={styles.legendRamp} style={{ borderColor: collection.color }} />Ramp · EXISTING</span>
          <span><i className={styles.legendAssumed} style={{ borderColor: collection.color }} />Ramp · ASSUMED</span></>}
        <span className={styles.legendMore}>Map key &amp; sources</span>
      </summary>
      <div>
        <p>Numbers follow source order, not travel.{osm ? ' Line classes are OpenStreetMap tags, not measurements; most ways have no width, incline or wheelchair tag.' : ' EXISTING and ASSUMED are archived labels, not current condition or passability.'}</p>
        {osm && <p><strong>Map data:</strong> © OpenStreetMap contributors, available under the Open Database License (ODbL 1.0). Edit times are source metadata, not observation dates. <a href={OSM_COPYRIGHT} target="_blank" rel="noreferrer">Copyright and license →</a></p>}
        <p><strong>Aerial background:</strong> {imagery.attribution} Capture year {imagery.captureYear}; exact capture date {imagery.capturedAt ?? 'Unknown'}. {imagery.note} <a href={imagery.sourceUrl} target="_blank" rel="noreferrer">Imagery source →</a></p>
        {set === 'corridor' && <p>Street names are approximate orientation labels.</p>}
      </div>
    </details>
  </div>;
}
