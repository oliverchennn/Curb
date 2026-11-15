'use client';
import { useEffect, useRef, useState } from 'react';
import type { Collection } from './model';
import AerialLayer, { baseSrc } from './AerialLayer';
import { campusAerial, countFailedTiles, visibleTiles } from './aerial';
import { campusOverviewBounds, campusWayStyles, campusWayTypes, fitProjectedView, sectionExtent, type campusPaths, type CampusSection, type ProjectedView } from './campus';
import { placeSectionTargets, SECTION_TARGET_SIZE } from './labels';
import { OSM_COPYRIGHT, OsmCredit } from './OsmCredit';
import CampusPointMarkers, { CampusPointMapStatus, layoutCampusPointMarkers, viewForCampusPoint, type CampusPointLayer } from './CampusPointMarkers';
import styles from './Explorer.module.css';

const overviewBounds = campusOverviewBounds();
type View = ProjectedView;

type CampusPaths = ReturnType<typeof campusPaths>;

export function CampusWayLegend({ ways }: { ways?: CampusPaths['ways'] }) {
  return <section aria-label="Campus path legend" className={styles.campusWayLegend}>
    <p><strong>{ways ? 'Whole campus' : 'Section paths'}</strong> · OpenStreetMap tags</p>
    <ul>
      {campusWayTypes.map((type, index) => {
        const { label, color, dash } = campusWayStyles[type];
        const count = ways?.[index].count;
        return <li key={type}>
          <svg width="30" height="12" aria-hidden="true"><path d="M0 6H30" stroke={color} strokeWidth="3" strokeDasharray={dash} /></svg>
          <span>{label}{count !== undefined && <> <b>{count}</b></>}</span>
        </li>;
      })}
      <li><i className={styles.legendSection} aria-hidden="true" />{ways ? 'Study area bounds' : 'Selected study area'}</li>
    </ul>
  </section>;
}

/** Campus overview with aggregated source ways and keyboard-accessible section codes. */
export default function OverviewMap({ paths, sections, collections, onPick, pointLayer }: {
  paths: CampusPaths; sections: CampusSection[]; collections: Collection[]; onPick: (collectionId: string) => void;
  pointLayer?: CampusPointLayer;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState([900, 900]);
  const [manualView, setManualView] = useState<View | null>(null);
  const fit = fitProjectedView(overviewBounds, size);
  const view = manualView ?? fit;
  const updateView = (update: (view: View) => View) => setManualView(previous => update(previous ?? fit));
  const [base, setBase] = useState<'aerial' | 'diagram'>('aerial');
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const refs = useRef(new Map<string, SVGGElement>());
  const drag = useRef<{ x: number; y: number } | null>(null), moved = useRef(false);
  const aerialFailed = failed.has(baseSrc('campus'));
  const showAerial = base === 'aerial' && !aerialFailed;
  const unit = Math.max(view[2] / size[0], view[3] / size[1]);
  const plotLeft = view[0] + (view[2] - size[0] * unit) / 2, plotTop = view[1] + (view[3] - size[1] * unit) / 2;
  const visibleView: View = [plotLeft, plotTop, size[0] * unit, size[1] * unit];
  const shown = new Set(collections.map(c => c.id));
  const plotBounds = { left: plotLeft, top: plotTop, right: plotLeft + visibleView[2], bottom: plotTop + visibleView[3] };
  const tiles = showAerial ? visibleTiles(visibleView, 1 / unit) : [];
  const tileFailures = countFailedTiles(tiles, failed);
  const anchors = sections.flatMap(s => {
    const e = sectionExtent(s);
    return shown.has(s.collectionId) && e.x + e.width > plotBounds.left && e.x < plotBounds.right
      && e.y + e.height > plotBounds.top && e.y < plotBounds.bottom
      ? [{ id: s.collectionId, x: e.x + e.width / 2, y: e.y + e.height / 2 }] : [];
  });
  const labelSpots = placeSectionTargets(anchors, plotBounds, unit);
  const targets = sections.filter(s => labelSpots.has(s.collectionId));
  const targetSize = SECTION_TARGET_SIZE * unit;
  const pointLayout = pointLayer && layoutCampusPointMarkers(pointLayer.records, pointLayer.selected,
    plotBounds, unit, view[2] < fit[2] / 2 && unit <= 1.25, [...labelSpots.values()]);
  const rovingId = focusId && targets.some(s => s.collectionId === focusId) ? focusId : targets[0]?.collectionId;
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(entries => { const r = entries[0].contentRect; if (r.width && r.height) setSize([r.width, r.height]); });
    observer.observe(svg.current); return () => observer.disconnect();
  }, []);
  const pointRequest = pointLayer?.request;
  useEffect(() => {
    if (!pointRequest) return;
    setManualView(viewForCampusPoint(pointRequest.coordinates));
    if (pointRequest.focusMap) svg.current?.focus();
  }, [pointRequest]);
  const zoom = (factor: number) => updateView(([x, y, w, h]) => {
    const f = Math.max(80 / w, Math.min((fit[2] * 1.6) / w, factor)); return [x + w * (1 - f) / 2, y + h * (1 - f) / 2, w * f, h * f];
  });
  const local = (x: number, y: number) => { const p = svg.current!.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(svg.current!.getScreenCTM()!.inverse()); };
  const move = (from: string, delta: number | 'first' | 'last') => {
    const i = targets.findIndex(s => s.collectionId === from), next = targets[delta === 'first' ? 0 : delta === 'last' ? targets.length - 1 : (i + delta + targets.length) % targets.length];
    if (next) { setFocusId(next.collectionId); refs.current.get(next.collectionId)?.focus(); }
  };
  return <div className={styles.mapCanvas} data-base={showAerial ? 'aerial' : 'diagram'} data-overview="true">
    <div className={styles.mapToolbar}>
      <div className={styles.mapTools} role="group" aria-label="Map controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoom(.6)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoom(1.666667)}>−</button>
        <button type="button" onClick={() => setManualView(null)}>Fit campus</button>
      </div>
      <div className={styles.baseToggle} role="group" aria-label="Map background">
        <button type="button" aria-pressed={showAerial} aria-disabled={aerialFailed} onClick={() => { if (!aerialFailed) setBase('aerial'); }}
          title={aerialFailed ? 'Aerial image could not be loaded' : undefined}>Aerial</button>
        <button type="button" aria-pressed={!showAerial} onClick={() => setBase('diagram')}>Diagram</button>
      </div>
      <div className={styles.north} aria-hidden="true"><span>↑</span>N</div>
    </div>
    {aerialFailed && <p className={styles.mapNotice} role="status">Aerial image unavailable — showing Diagram. Every way is unchanged.</p>}
    {!aerialFailed && showAerial && tileFailures > 0 && <p className={styles.mapNotice} role="status">{tileFailures} detail {tileFailures === 1 ? 'tile' : 'tiles'} unavailable — the overview image is shown there.</p>}
    <CampusWayLegend ways={paths.ways} />
    {pointLayout && <CampusPointMapStatus layout={pointLayout} />}
    <svg ref={svg} className={styles.mapSvg} viewBox={view.join(' ')} tabIndex={0} role="group"
      aria-label={`Princeton campus overview on ${showAerial ? 'a 2020 aerial image' : 'a diagram'}: ${targets.length} sections of OpenStreetMap ways. Arrow keys pan, plus and minus zoom, Home fits the campus. Tab once to reach the sections; arrow keys move between them, Home and End jump to the first and last, Enter opens one, Escape returns here.`}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) {
          e.preventDefault(); if (e.key === 'Home') setManualView(null); else if (['+', '=', '-'].includes(e.key)) zoom(e.key === '-' ? 1.666667 : .6);
          else updateView(([x, y, w, h]) => [x + (e.key === 'ArrowRight' ? w / 8 : e.key === 'ArrowLeft' ? -w / 8 : 0), y + (e.key === 'ArrowDown' ? h / 8 : e.key === 'ArrowUp' ? -h / 8 : 0), w, h]);
        }
      }}
      onPointerDown={e => { if (e.button !== 0) return; const p = local(e.clientX, e.clientY); drag.current = { x: p.x, y: p.y }; moved.current = false; }}
      onPointerMove={e => { if (!drag.current) return; const p = local(e.clientX, e.clientY), d = drag.current, dx = p.x - d.x, dy = p.y - d.y;
        if (Math.abs(dx) + Math.abs(dy) > unit * 3) moved.current = true;
        if (moved.current) { svg.current?.setPointerCapture(e.pointerId); updateView(([x, y, w, h]) => [x - dx, y - dy, w, h]); } }}
      onPointerUp={e => { drag.current = null; if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId); }}
      onPointerCancel={() => { drag.current = null; }}>
      <title>Princeton campus OpenStreetMap ways · current traversal unknown</title>
      {showAerial && <AerialLayer set="campus" tiles={tiles} failed={failed} onFail={src => setFailed(p => new Set(p).add(src))} />}
      <g className={styles.overviewWays} aria-hidden="true" data-base={showAerial ? 'aerial' : 'diagram'}>
        {[...paths.ways].reverse().map(({ type, path }) => path && <path key={type} data-way-type={type} d={path} fill="none"
          stroke={campusWayStyles[type].color} strokeDasharray={campusWayStyles[type].dash}
          strokeWidth={type === 'footway' ? 2 : 3} vectorEffect="non-scaling-stroke" />)}
      </g>
      <g className={styles.sectionBounds} aria-hidden="true">{sections.map(s => {
        const e = sectionExtent(s);
        return <g key={s.collectionId}>
          <rect x={e.x} y={e.y} width={e.width} height={e.height} fill="none" stroke="#fffef8" strokeOpacity={.55} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          <rect x={e.x} y={e.y} width={e.width} height={e.height} fill="none" stroke="#414b3d" strokeOpacity={.6} strokeWidth={1.2} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        </g>;
      })}{targets.map(s => {
        const a = anchors.find(a => a.id === s.collectionId)!, t = labelSpots.get(s.collectionId)!;
        return Math.hypot(a.x - t.x, a.y - t.y) > 22 * unit && <line key={s.collectionId} x1={a.x} y1={a.y} x2={t.x} y2={t.y}
          stroke={showAerial ? "#faf9f3" : "#414b3d"} strokeOpacity={.65} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />;
      })}</g>
      {pointLayout && pointLayer && <CampusPointMarkers markers={pointLayout.markers} unit={unit}
        onSelect={point => { if (!moved.current) pointLayer.onSelect(point); }} />}
      {targets.map(s => { const t = labelSpots.get(s.collectionId)!;
        return <g key={s.collectionId} ref={el => { if (el) refs.current.set(s.collectionId, el); else refs.current.delete(s.collectionId); }}
          role="button" tabIndex={s.collectionId === rovingId ? 0 : -1} data-section={s.collectionId} className={styles.sectionTarget}
          aria-label={`${s.code}: ${s.areaLabel}, section ${s.section} of ${s.sectionsInArea}, ${s.wayCount} ways`}
          onFocus={() => setFocusId(s.collectionId)} onClick={() => { if (!moved.current) onPick(s.collectionId); }}
          onKeyDown={ev => {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(s.collectionId); }
            else if (['ArrowRight', 'ArrowDown'].includes(ev.key)) { ev.preventDefault(); move(s.collectionId, 1); }
            else if (['ArrowLeft', 'ArrowUp'].includes(ev.key)) { ev.preventDefault(); move(s.collectionId, -1); }
            else if (ev.key === 'Home' || ev.key === 'End') { ev.preventDefault(); move(s.collectionId, ev.key === 'Home' ? 'first' : 'last'); }
            else if (ev.key === 'Escape') { ev.preventDefault(); svg.current?.focus(); }
          }}>
          <title>{s.code} · {s.areaLabel} · {s.section}/{s.sectionsInArea}</title>
          <rect data-hit-area x={t.x - targetSize / 2} y={t.y - targetSize / 2} width={targetSize} height={targetSize} fill="transparent" />
          <rect x={t.x - 19 * unit} y={t.y - 12 * unit} width={38 * unit} height={24 * unit} rx={4 * unit} fill="#fffef8" stroke="#414b3d" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <text x={t.x} y={t.y + 5 * unit} textAnchor="middle" fontSize={14 * unit} fontWeight={800} fill="#213a2c">{s.code}</text>
        </g>; })}
    </svg>
    <div className={styles.mapCredit} data-campus="true">{showAerial && <span>Aerial {campusAerial.captureYear} · NJ Office of GIS</span>}<OsmCredit offerDownload /></div>
    <details className={styles.legend}>
      <summary><span className={styles.legendMore}>Map key &amp; sources</span></summary>
      <div>
        <p>Use a map code or the Campus section picker to browse. Path types come from OpenStreetMap tags. Current traversal is Unknown.</p>
        <p>Sections divide source geometry into groups of at most 63 ways for inspection. They are not routes, official neighborhood boundaries, or proof of complete coverage. Every way appears in exactly one section.</p>
        <p><strong>Map data:</strong> © OpenStreetMap contributors, available under the Open Database License (ODbL 1.0). Edit times are source metadata, not observation dates. <a href={OSM_COPYRIGHT} target="_blank" rel="noreferrer">Copyright and license →</a></p>
        <p><strong>Aerial background:</strong> {campusAerial.attribution} Capture year {campusAerial.captureYear}; exact capture date {campusAerial.capturedAt ?? 'Unknown'}. {campusAerial.note} <a href={campusAerial.sourceUrl} target="_blank" rel="noreferrer">Imagery source →</a></p>
      </div>
    </details>
  </div>;
}
