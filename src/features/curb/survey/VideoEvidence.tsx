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
  const [mode, setMode] = useState<'live' | 'annotated'>('live');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const { media } = survey;
  const src = mode === 'live' ? media.src : media.annotatedSrc;

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

  function switchMode(next: 'live' | 'annotated') {
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

  return <section className={styles.videoPanel} aria-labelledby="survey-video-heading">
    <div className={styles.panelHeading}>
      <h2 id="survey-video-heading">Survey replay</h2>
      <div className={styles.segmented} role="group" aria-label="Video version">
        <button type="button" aria-label="Live review overlay" aria-pressed={mode === 'live'} onClick={() => switchMode('live')}>Review</button>
        <button type="button" aria-label="Pre-rendered annotations" aria-pressed={mode === 'annotated'} onClick={() => switchMode('annotated')}>Annotated</button>
      </div>
    </div>
    <div ref={frameRef} className={styles.videoFrame} style={{ aspectRatio: `${media.width} / ${media.height}` }}>
      <video key={src} ref={videoRef} className={styles.video} src={src} poster={media.posterSrc} controls playsInline preload="metadata"
        aria-describedby="survey-video-note"
        onLoadedMetadata={(event) => { event.currentTarget.currentTime = resumeTimeRef.current; setTime(resumeTimeRef.current); }}
        onError={() => setMediaError(`The ${mode === 'live' ? 'survey' : 'annotated'} video could not be loaded. Reload the page, or download the original MOV from Export report.`)} />
      <div className={styles.overlay} aria-hidden="true">
        {visible.map(({ finding, rect }) => <OverlayBox key={finding.id} finding={finding} rect={rect} picture={picture} selected={finding.id === selectedFindingId} />)}
      </div>
    </div>
    {mediaError ? <p role="alert" className={styles.inlineError}>{mediaError}</p> : null}
    <p id="survey-video-note" className={styles.small}>
      {mode === 'live'
        ? `${formatTime(time)} · ${visible.length} tracked finding${visible.length === 1 ? '' : 's'}. Dashed boxes await review.`
        : edited
          ? 'This pre-rendered video shows the original analysis. Your review edits are not burned into it; the JSON and PDF exports carry them.'
          : 'Pre-rendered from the original analysis.'}
    </p>
    <details className={styles.pendingChecks}><summary>About the tracks</summary>
      <p className={styles.small}>Boxes appear only on retained tracked frames; missing boxes do not establish that a defect is absent. Rejected findings are hidden in the live overlay. Measurements and field review are still needed.</p>
    </details>
  </section>;
}

function OverlayBox({ finding, rect, picture, selected }: { finding: Finding; rect: Rect; picture: Rect; selected: boolean }) {
  const pending = finding.review.status === 'pending';
  const labelWidth = Math.min(230, Math.max(0, picture.width - 12));
  const labelLeft = Math.min(-3, picture.left + picture.width - rect.left - labelWidth - 6);
  const below = rect.top - picture.top < 65;
  return <div className={selected ? styles.boxSelected : styles.box}
    style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, borderColor: finding.color, borderStyle: pending ? 'dashed' : 'solid' }}>
    <span className={styles.boxLabel} style={{ borderLeftColor: finding.color, width: labelWidth, maxWidth: labelWidth, left: labelLeft,
      ...(below ? { bottom: 'auto', top: 'calc(100% + 6px)', marginBottom: 0 } : {}) }}>
      {finding.label}
    </span>
  </div>;
}
