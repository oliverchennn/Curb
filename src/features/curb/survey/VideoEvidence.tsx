'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Finding, Survey } from '../../../contracts/curb/survey';
import { getBoxAtTime } from './services';
import { boxToRect, containedRect, formatTime, type Rect } from './presentation';
import styles from './SurveyWorkspace.module.css';

export type SeekRequest = { seconds: number; nonce: number };
type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export function VideoEvidence({ survey, selectedFindingId, seek, edited }: {
  survey: Survey;
  selectedFindingId: string | null;
  seek: SeekRequest | null;
  edited: boolean;
}) {
  const videoRef = useRef<VideoWithFrameCallback>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const resumeTimeRef = useRef(0);
  const [time, setTime] = useState(0);
  const [picture, setPicture] = useState<Rect>({ left: 0, top: 0, width: 0, height: 0 });
  const [mode, setMode] = useState<'original' | 'live' | 'annotated'>('live');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const { media } = survey;
  const src = mode === 'annotated' ? media.annotatedSrc : media.src;

  // Keep the overlay in the displayed picture's coordinate system.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setPicture(containedRect(frame.clientWidth, frame.clientHeight, media.width, media.height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [media.width, media.height]);

  // Follow presented frames: requestVideoFrameCallback when available,
  // otherwise timeupdate/seeked plus animation frames while playing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let handle = 0;
    let raf = 0;
    let stopped = false;
    if (typeof video.requestVideoFrameCallback === 'function') {
      const onFrame = (_now: number, metadata: { mediaTime: number }) => {
        if (stopped) return;
        setTime(metadata.mediaTime);
        handle = video.requestVideoFrameCallback!(onFrame);
      };
      handle = video.requestVideoFrameCallback(onFrame);
    }
    // Native controls report duration at `ended`, while the picture still shows
    // the final decoded frame. Keep that frame's evidence visible when paused.
    const sync = () => setTime(Math.min(video.currentTime, Math.max(0, media.durationSeconds - 1 / media.fps)));
    const tick = () => {
      if (stopped) return;
      sync();
      if (!video.paused && !video.ended) raf = requestAnimationFrame(tick);
    };
    const onPlay = () => { if (typeof video.requestVideoFrameCallback !== 'function') raf = requestAnimationFrame(tick); };
    video.addEventListener('timeupdate', sync);
    video.addEventListener('seeked', sync);
    video.addEventListener('play', onPlay);
    return () => {
      stopped = true;
      if (handle && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(handle);
      cancelAnimationFrame(raf);
      video.removeEventListener('timeupdate', sync);
      video.removeEventListener('seeked', sync);
      video.removeEventListener('play', onPlay);
    };
  }, [src, media.durationSeconds, media.fps]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !seek) return;
    video.pause();
    resumeTimeRef.current = Math.min(seek.seconds, Math.max(0, media.durationSeconds - 1 / media.fps));
    if (video.readyState >= 1) video.currentTime = resumeTimeRef.current;
    setTime(resumeTimeRef.current);
  }, [seek, media.durationSeconds, media.fps]);

  useEffect(() => setMediaError(null), [src]);

  function switchMode(next: 'original' | 'live' | 'annotated') {
    if (next === mode) return;
    resumeTimeRef.current = videoRef.current?.currentTime ?? time;
    setMode(next);
  }

  const visible = mode === 'live'
    ? survey.findings.flatMap((finding) => {
      if (finding.review.status === 'rejected') return [];
      const box = getBoxAtTime(finding, time, media.fps);
      return box ? [{ finding, rect: boxToRect(box, picture) }] : [];
    })
    : [];
  // Selected evidence is placed first so its label gets the clearest slot.
  const labels = placeLabels(
    [...visible].sort((a, b) => Number(b.finding.id === selectedFindingId) - Number(a.finding.id === selectedFindingId) || a.rect.top - b.rect.top)
      .map(({ finding, rect }) => ({ id: finding.id, rect })),
    picture,
  );

  return <section className={styles.videoPanel} aria-labelledby="survey-video-heading">
    <div className={styles.panelHeading}>
      <h2 id="survey-video-heading">Video</h2>
      <div className={styles.segmented} role="group" aria-label="Video version">
        {/* Accessible names begin with the visible words (WCAG 2.5.3 Label in Name). */}
        <button type="button" aria-label="Original: footage without boxes" aria-pressed={mode === 'original'} onClick={() => switchMode('original')}>Original</button>
        <button type="button" aria-label="Review: editable finding overlays" aria-pressed={mode === 'live'} onClick={() => switchMode('live')}>Review</button>
        <button type="button" aria-label="Annotated: exported video preview" aria-pressed={mode === 'annotated'} onClick={() => switchMode('annotated')}>Annotated</button>
      </div>
    </div>
    <div ref={frameRef} data-video-frame className={styles.videoFrame} style={{ aspectRatio: `${media.width} / ${media.height}` }}>
      <video key={src} ref={videoRef} className={styles.video} src={src} poster={media.posterSrc} controls playsInline preload="metadata"
        aria-describedby="survey-video-note"
        onLoadedMetadata={(event) => { event.currentTarget.currentTime = resumeTimeRef.current; setTime(resumeTimeRef.current); }}
        onError={() => setMediaError(`The ${mode === 'annotated' ? 'annotated' : 'survey'} video could not be loaded. Reload the page, or download the original MOV from Export report.`)} />
      <div className={styles.overlay} aria-hidden="true">
        {visible.map(({ finding, rect }) => <OverlayBox key={finding.id} finding={finding} rect={rect} selected={finding.id === selectedFindingId} />)}
        {visible.map(({ finding }) => {
          const place = labels.get(finding.id);
          return place ? <span key={`${finding.id}-label`} className={styles.boxLabel}
            style={{ left: place.left, top: place.top, width: place.width, borderLeftColor: finding.color }}>
            {place.compact ? shortLabel(finding.label) : finding.label}
          </span> : null;
        })}
      </div>
    </div>
    {mediaError ? <p role="alert" className={styles.inlineError}>{mediaError}</p> : null}
    <div className={styles.videoNotes}>
      <p id="survey-video-note" className={styles.small}>
        <strong>{formatTime(time)}</strong> · {mode === 'original' ? 'Plain footage, no boxes.' : mode === 'live'
          ? `${visible.length} defect${visible.length === 1 ? '' : 's'} in view right now.`
          : edited ? 'Saved copy with the original AI labels drawn in. Your edits are not in this file.' : 'Saved copy with the AI labels drawn in.'}
      </p>
      <details className={styles.pendingChecks}><summary>How to read the boxes</summary>
        <ul className={styles.plainList}>
          <li>Each color follows one defect.</li>
          <li>Dashed box: not checked yet. Solid box: accepted.</li>
          <li>Rejected defects are hidden. No box does not mean no damage.</li>
        </ul>
      </details>
    </div>
  </section>;
}

function OverlayBox({ finding, rect, selected }: { finding: Finding; rect: Rect; selected: boolean }) {
  const pending = finding.review.status === 'pending';
  return <div className={selected ? styles.boxSelected : styles.box}
    style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, borderColor: finding.color, borderStyle: pending ? 'dashed' : 'solid' }} />;
}

/** "Defect 04 · Surface breakup" -> "Defect 04" for narrow pictures. */
function shortLabel(label: string): string {
  return label.split(' · ')[0] ?? label;
}

export type LabelPlacement = { left: number; top: number; width: number; compact: boolean; overlap: number };

const LABEL_HEIGHT = 24; // one line: 13px text, 1.3 line-height, 3px padding, borders
const LABEL_GAP = 4;
const EDGE = 2;
const FULL_WIDTH = 230;
const COMPACT_WIDTH = 92;
const COMPACT_BELOW = 240; // picture width under which labels show only the defect number

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Collision-aware label placement, display only: never moves boxes or tracks.
 * Each label is one line, kept inside the displayed picture, and placed at the
 * candidate slot (above/below/beside its box, left or right aligned) with the
 * least overlap against every visible box and every label placed before it.
 * Ties keep the preferred order, so stable frames keep stable positions. */
export function placeLabels(items: { id: string; rect: Rect }[], picture: Rect): Map<string, LabelPlacement> {
  const result = new Map<string, LabelPlacement>();
  if (picture.width <= 0 || picture.height <= 0) return result;
  const compact = picture.width < COMPACT_BELOW;
  const width = Math.max(0, Math.min(compact ? COMPACT_WIDTH : FULL_WIDTH, picture.width - 2 * EDGE));
  const minX = picture.left + EDGE;
  const maxX = picture.left + picture.width - EDGE - width;
  const minY = picture.top + EDGE;
  const maxY = picture.top + picture.height - EDGE - LABEL_HEIGHT;
  const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high));
  const boxes = items.map(({ rect }) => rect);
  const placed: Rect[] = [];

  for (const { id, rect } of items) {
    const right = rect.left + rect.width;
    const bottom = rect.top + rect.height;
    const candidates: [number, number][] = [
      [rect.left, rect.top - LABEL_HEIGHT - LABEL_GAP], // above, left-aligned
      [right - width, rect.top - LABEL_HEIGHT - LABEL_GAP], // above, right-aligned
      [rect.left, bottom + LABEL_GAP], // below, left-aligned
      [right - width, bottom + LABEL_GAP], // below, right-aligned
      [rect.left - width - LABEL_GAP, rect.top], // beside, left
      [right + LABEL_GAP, rect.top], // beside, right
      [rect.left - width - LABEL_GAP, bottom - LABEL_HEIGHT],
      [right + LABEL_GAP, bottom - LABEL_HEIGHT],
    ];
    let best: { rect: Rect; cost: number } | null = null;
    for (const [x, y] of candidates) {
      const candidate = { left: clamp(x, minX, maxX), top: clamp(y, minY, maxY), width, height: LABEL_HEIGHT };
      const cost = boxes.reduce((sum, box) => sum + overlapArea(candidate, box), 0)
        + placed.reduce((sum, label) => sum + overlapArea(candidate, label), 0);
      if (!best || cost < best.cost) best = { rect: candidate, cost };
      if (cost === 0) break;
    }
    if (!best) continue;
    placed.push(best.rect);
    result.set(id, { left: best.rect.left, top: best.rect.top, width, compact, overlap: best.cost });
  }
  return result;
}
