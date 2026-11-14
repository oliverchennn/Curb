'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Finding, Survey } from '../../../contracts/curb/survey';
import { getBoxAtTime } from './services';
import { boxToRect, containedRect, formatTime, REVIEW_LABELS, type Rect } from './presentation';
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
    const sync = () => setTime(video.currentTime);
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
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !seek) return;
    video.pause();
    resumeTimeRef.current = Math.min(seek.seconds, Math.max(0, media.durationSeconds - 0.05));
    if (video.readyState >= 1) video.currentTime = resumeTimeRef.current;
    setTime(resumeTimeRef.current);
  }, [seek, media.durationSeconds]);

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
        <button type="button" aria-pressed={mode === 'live'} onClick={() => switchMode('live')}>Live review overlay</button>
        <button type="button" aria-pressed={mode === 'annotated'} onClick={() => switchMode('annotated')}>Pre-rendered annotations</button>
      </div>
    </div>
    <div ref={frameRef} className={styles.videoFrame} style={{ aspectRatio: `${media.width} / ${media.height}` }}>
      <video key={src} ref={videoRef} className={styles.video} src={src} poster={media.posterSrc} controls playsInline preload="metadata"
        aria-describedby="survey-video-note"
        onLoadedMetadata={(event) => { event.currentTarget.currentTime = resumeTimeRef.current; setTime(resumeTimeRef.current); }}
        onError={() => setMediaError(`The ${mode === 'live' ? 'review' : 'annotated'} video could not be loaded from ${src}. Check that the survey media is published under public/curb/surveys/robertson-hall/, then reload.`)} />
      <div className={styles.overlay} aria-hidden="true">
        {visible.map(({ finding, rect }) => <OverlayBox key={finding.id} finding={finding} rect={rect} selected={finding.id === selectedFindingId} />)}
      </div>
    </div>
    {mediaError ? <p role="alert" className={styles.inlineError}>{mediaError}</p> : null}
    <p id="survey-video-note" className={styles.small}>
      {mode === 'live'
        ? `${formatTime(time)} · ${visible.length} finding${visible.length === 1 ? '' : 's'} in view. Boxes follow the analysed track frames; a box disappears where the finding is not visible. Rejected findings are hidden.`
        : edited
          ? 'This pre-rendered video shows the original analysis. Your review edits are not burned into it; the JSON and PDF exports carry them.'
          : 'Pre-rendered from the original analysis.'}
    </p>
  </section>;
}

function OverlayBox({ finding, rect, selected }: { finding: Finding; rect: Rect; selected: boolean }) {
  const pending = finding.review.status === 'pending';
  return <div className={selected ? styles.boxSelected : styles.box}
    style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, borderColor: finding.color, borderStyle: pending ? 'dashed' : 'solid' }}>
    <span className={styles.boxLabel} style={{ borderLeftColor: finding.color }}>
      {finding.label} · {REVIEW_LABELS[finding.review.status]}
    </span>
  </div>;
}
