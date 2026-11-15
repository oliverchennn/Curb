'use client';
import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { type Atlas, type Collection, type EvidenceRecord } from './model';
import MapCanvas from './MapCanvas';
import { RecordCard } from './Evidence';
import styles from './Explorer.module.css';

const SITE_CONTEXT = '/curb/surveys/robertson-hall/site-context.svg';
const CLIP = '/curb/surveys/robertson-hall/survey.mp4';
const MAX_SCALE = 4;

const clipTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

/** One stage, three evidence modes: archive map, field photograph, synthetic conflict pair. */
export default function EvidenceStage({ atlas, collection, records, record, stops, onSelect, onReset, mapOptions }: {
  atlas: Atlas; collection: Collection | null; records: EvidenceRecord[]; record: EvidenceRecord | null;
  stops: Map<string, number>; onSelect: (id: string) => void; onReset: () => void;
  mapOptions?: Pick<ComponentProps<typeof MapCanvas>, 'set' | 'context' | 'osm' | 'dense' | 'pointLayer'>;
}) {
  if (!collection) return <div className={styles.stageEmpty} data-mode="empty">
    <h3>No matching evidence</h3><p>Search and type filters hide every collection. Nothing has been removed.</p>
    <button type="button" onClick={onReset}>Show the complete atlas</button>
  </div>;
  const unplaced = records.filter(r => !atlas.features.find(f => f.id === r.featureId)?.geometry);
  if (collection.kind === 'archive') return <div className={styles.stage} data-mode="map">
    <MapCanvas atlas={atlas} collection={collection} records={records} selected={record} onSelect={onSelect} stops={stops} {...mapOptions} />
    {unplaced.length > 0 && <UnplacedTray key={collection.id} unplaced={unplaced} record={record} stops={stops} onSelect={onSelect} />}
  </div>;
  if (collection.kind === 'field') return <div className={styles.stage} data-mode="photo">
    {record ? <FieldPhoto key={record.id} record={record} stop={stops.get(record.id)} /> : null}
  </div>;
  const pair = record?.conflictGroup ? recordsInGroup(atlas, collection, record.conflictGroup) : records;
  return <div className={styles.stage} data-mode="conflict">
    <div className={styles.conflictBanner}><strong>Records disagree.</strong> Both are synthetic examples shown at equal size. Neither is treated as current; no winner is selected.</div>
    <div className={styles.stagePair}>{pair.map(r => <RecordCard key={r.id} atlas={atlas} record={r} comparison />)}</div>
  </div>;
}

/** Compact, expandable list of records with no verified position. The count is always visible;
 *  selecting an unplaced record (reel, URL, list) opens it. Records are listed, never drawn. */
function UnplacedTray({ unplaced, record, stops, onSelect }: {
  unplaced: EvidenceRecord[]; record: EvidenceRecord | null; stops: Map<string, number>; onSelect: (id: string) => void;
}) {
  const selectedHere = Boolean(record && unplaced.some(r => r.id === record.id));
  const [open, setOpen] = useState(selectedHere);
  useEffect(() => { if (selectedHere) setOpen(true); }, [selectedHere, record?.id]);
  return <details className={styles.tray} open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary><strong>Not on the map ({unplaced.length})</strong><span>Listed, never drawn: no verified position.</span><span className={styles.trayHint} aria-hidden="true">{open ? 'Hide' : 'Show'}</span></summary>
    <div>{unplaced.map(r => <button key={r.id} type="button" aria-pressed={record?.id === r.id} onClick={() => onSelect(r.id)}>
      <b>{String(stops.get(r.id)).padStart(2, '0')}</b> {r.title}</button>)}</div>
  </details>;
}

function recordsInGroup(atlas: Atlas, c: Collection, group: string) {
  return c.recordIds.map(id => atlas.records.find(r => r.id === id)!).filter(r => r.conflictGroup === group);
}

/** Large field photograph with bounded zoom/pan, an on-request clip and approximate site context. */
function FieldPhoto({ record, stop }: { record: EvidenceRecord; stop: number | undefined }) {
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const [clip, setClip] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const limit = (s: number) => (s - 1) / 2 * 100;
  // Functional updates: repeated keys within one frame must each apply, and every result is clamped.
  const update = (next: (v: typeof view) => typeof view) => setView(v => {
    const n = next(v), s = Math.max(1, Math.min(MAX_SCALE, n.s)), l = limit(s);
    return { s, x: Math.max(-l, Math.min(l, n.x)), y: Math.max(-l, Math.min(l, n.y)) };
  });
  const zoom = (d: number) => update(v => ({ ...v, s: v.s + d }));
  const pan = (dx: number, dy: number) => update(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
  const reset = () => setView({ s: 1, x: 0, y: 0 });
  // Capture the mounted clip element: on unmount React may already have cleared the ref.
  // Leaving the record, the collection or the page pauses it; so does hiding the Stage
  // (mobile panels hide it with CSS only, which the observer sees as a zero-size box).
  useEffect(() => {
    const el = video.current;
    if (!clip || !el) return;
    const observer = new ResizeObserver(([entry]) => { if (!entry.contentRect.width || !el.getClientRects().length) el.pause(); });
    observer.observe(el);
    return () => { observer.disconnect(); el.pause(); };
  }, [clip]);
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = 12;
    const map: Record<string, () => void> = { '+': () => zoom(.5), '=': () => zoom(.5), '-': () => zoom(-.5), '0': reset,
      ArrowLeft: () => pan(step, 0), ArrowRight: () => pan(-step, 0), ArrowUp: () => pan(0, step), ArrowDown: () => pan(0, -step) };
    if (map[e.key]) { e.preventDefault(); map[e.key](); }
  };
  const available = record.media.status === 'available' && !failed;
  const canPan = view.s > 1;
  return <div className={styles.photoStage}>
    <div className={styles.photoFrame} tabIndex={0} role="group" onKeyDown={keys}
      aria-label={`${record.title}. Photo inspection: plus and minus zoom, arrow keys pan, 0 resets.`}>
      {available
        ? <img src={(record.media as { src: string }).src} alt={(record.media as { alt: string }).alt} onError={() => setFailed(true)}
          style={{ transform: `translate(${view.x}%, ${view.y}%) scale(${view.s})` }} draggable={false} />
        : <div className={styles.photoNotice}><span aria-hidden="true">▧</span><p>{record.media.status === 'available' ? 'Photo unavailable — the local file could not be loaded. This record is unchanged.' : record.media.reason}</p></div>}
      <span className={styles.photoBadge}>{stop !== undefined ? `Record ${String(stop).padStart(2, '0')} · ` : ''}Actual clip frame · location not yet placed</span>
    </div>
    <div className={styles.photoTools} role="group" aria-label="Photo inspection controls">
      <button type="button" aria-label="Zoom in on photo" aria-disabled={!available || view.s >= MAX_SCALE} onClick={() => available && zoom(.5)}>+</button>
      <button type="button" aria-label="Zoom out of photo" aria-disabled={!available || view.s <= 1} onClick={() => available && zoom(-.5)}>−</button>
      <button type="button" aria-disabled={!available || (view.s === 1 && !view.x && !view.y)} onClick={reset}>Reset</button>
      <button type="button" aria-label="Pan photo left" aria-disabled={!canPan} onClick={() => pan(12, 0)}>←</button>
      <button type="button" aria-label="Pan photo right" aria-disabled={!canPan} onClick={() => pan(-12, 0)}>→</button>
      <button type="button" aria-label="Pan photo up" aria-disabled={!canPan} onClick={() => pan(0, 12)}>↑</button>
      <button type="button" aria-label="Pan photo down" aria-disabled={!canPan} onClick={() => pan(0, -12)}>↓</button>
      <span className={styles.zoomReadout} aria-live="off">{Math.round(view.s * 100)}%</span>
      {record.clipSeconds !== undefined && <button type="button" className={styles.clipButton} aria-expanded={clip}
        onClick={() => { if (clip) video.current?.pause(); setClip(!clip); }}>
        {clip ? 'Close clip' : `Play clip from ${clipTime(record.clipSeconds)}`}</button>}
    </div>
    <div className={styles.photoSide}>
      {clip && record.clipSeconds !== undefined && <figure className={styles.clip}>
        <video ref={video} src={CLIP} controls playsInline preload="metadata"
          onLoadedMetadata={e => {
            const element = e.currentTarget;
            element.currentTime = record.clipSeconds!;
            // The user can leave the mobile Stage before metadata becomes available.
            if (element.getClientRects().length) void element.play().catch(() => undefined);
          }} />
        <figcaption>Actual supplied footage from {clipTime(record.clipSeconds)}. Clip time is not a capture date.</figcaption>
      </figure>}
      <figure className={styles.siteInset}>
        <img src={SITE_CONTEXT} alt="Robertson Hall and nearby campus streets. One approximate phone GPS tag; no defect is placed." />
        <figcaption>Approximate SITE only: one phone GPS tag. Defects are not placed on this map.</figcaption>
      </figure>
    </div>
  </div>;
}
