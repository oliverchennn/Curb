'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraViews, type FeedCanvases, type SensorButtons } from './CameraViews';
import { activeSensor, CAPTURES, DURATION, poseAt, SENSORS, type Capture, type SensorId, type Transport, type ViewId } from './simulation';
import { StaticDiagram } from './StaticDiagram';
import styles from './collection.module.css';

const Scene = dynamic(() => import('./CollectionScene'), {
  ssr: false,
  loading: () => <div className={styles.loading} role="status">Preparing the local 3D scene…</div>,
});

const views = [
  ['follow', 'Follow'], ['side', 'Side'], ['overhead', 'Overhead'],
] as const satisfies readonly (readonly [ViewId, string])[];

function secondsText(time: number) {
  return time + (time === 1 ? ' second' : ' seconds');
}

export function CollectionDemo() {
  const transport = useRef<Transport>({
    seconds: 0, running: false, speed: 1, manualSensor: 'forward', autoInspect: true,
    reducedMotion: false, coverage: false, view: 'follow', reset: 0,
  });
  const feeds = useRef<FeedCanvases>({ focus: null, previews: {} });
  const sensorButtons = useRef<SensorButtons>({});
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [manualSensor, setManualSensor] = useState<SensorId>('forward');
  const [autoInspect, setAutoInspect] = useState(true);
  const [coverage, setCoverage] = useState(false);
  const [view, setView] = useState<ViewId>('follow');
  const [staticMode, setStaticMode] = useState(false);
  const [message, setMessage] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { inspection, count } = poseAt(seconds);
  const sensor = activeSensor(seconds, manualSensor, autoInspect, reducedMotion);
  const wholeSeconds = Math.floor(seconds);
  const target = inspection ?? CAPTURES.find(item => seconds < item.start);

  const invalidate = useCallback(() => transport.current.invalidate?.(), []);
  const pause = useCallback(() => {
    transport.current.running = false;
    setRunning(false);
    setSeconds(transport.current.seconds);
    invalidate();
  }, [invalidate]);

  const announce = useCallback((text: string) => {
    if (announceTimer.current) clearTimeout(announceTimer.current);
    setAnnouncement('');
    announceTimer.current = setTimeout(() => setAnnouncement(text), 60);
  }, []);
  useEffect(() => () => { if (announceTimer.current) clearTimeout(announceTimer.current); }, []);

  const fail = useCallback((reason: string) => {
    pause();
    setStaticMode(true);
    setMessage(reason);
  }, [pause]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    function change() {
      transport.current.reducedMotion = media.matches;
      setReducedMotion(media.matches);
      if (media.matches) pause();
      invalidate();
    }
    change();
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, [invalidate, pause]);

  const selectSensor = useCallback((id: SensorId) => {
    transport.current.manualSensor = id;
    transport.current.autoInspect = false;
    setManualSensor(id);
    setAutoInspect(false);
    const item = SENSORS.find(entry => entry.id === id)!;
    announce('Camera ' + item.number + ', ' + item.name + '. ' + item.description + ' Auto inspect is off.');
    invalidate();
  }, [announce, invalidate]);

  function toggleAuto() {
    const enabled = !transport.current.autoInspect;
    transport.current.autoInspect = enabled;
    setAutoInspect(enabled);
    announce(enabled ? 'Auto inspect is on.' : 'Auto inspect is off. The selected camera stays open.');
    if (!enabled) {
      transport.current.manualSensor = sensor;
      setManualSensor(sensor);
    }
    invalidate();
  }

  function selectView(id: ViewId) {
    transport.current.view = id;
    transport.current.reset++;
    setView(id);
    invalidate();
  }

  function scrub(time: number) {
    pause();
    transport.current.seconds = time;
    setSeconds(time);
    invalidate();
  }

  function seekToCapture(capture: Capture) {
    scrub(capture.at);
    announce('Paused at ' + secondsText(capture.at) + '. ' + capture.id + ', ' + capture.label + '. All three views are available.');
  }

  function replay() {
    scrub(0);
    if (!staticMode && !reducedMotion) {
      transport.current.running = true;
      setRunning(true);
    }
    announce(staticMode || reducedMotion ? 'Moved to the start.' : 'Replaying from the start.');
    invalidate();
  }

  function togglePlayback() {
    if (transport.current.seconds >= DURATION) {
      transport.current.seconds = 0;
      setSeconds(0);
    }
    if (transport.current.running) {
      pause();
      const time = Math.floor(transport.current.seconds);
      announce('Paused at ' + secondsText(time) + '. ' + poseAt(time).count + ' of ' + CAPTURES.length + ' inspections captured.');
    } else {
      transport.current.running = true;
      setRunning(true);
      announce('Playing.');
      invalidate();
    }
  }

  function chooseMode(diagram: boolean) {
    pause();
    setStaticMode(diagram);
    setMessage('');
    if (diagram !== staticMode) announce(diagram ? 'Static diagram shown. All three modeled views remain available.' : '3D scene shown, paused.');
  }

  const ended = seconds >= DURATION;
  const wasEnded = useRef(false);
  useEffect(() => {
    if (ended && !wasEnded.current) announce('Inspection is complete. Both stops captured. Replay is available.');
    wasEnded.current = ended;
  }, [ended, announce]);

  const focusSensorButton = useCallback((id: SensorId) => {
    sensorButtons.current[id]?.focus();
  }, []);

  return <article className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}><span /> Collection concept · Simulated scene</p>
        <h1>Sidewalk inspection rover</h1>
        <p>Follow a modeled rover on two stops, then inspect the same surface from three camera angles.</p>
      </div>
      <Link className={styles.textLink} href="/curb/upload">Try the real phone survey <span aria-hidden="true">↗</span></Link>
    </header>

    <div className={styles.workspace}>
      <section className={styles.scenePanel} aria-label="Rover inspection">
        <div className={styles.stageHeader}>
          <span><span className={styles.dot} /> {staticMode ? 'Static route diagram' : 'Procedural 3D scene'}</span>
          <span>{inspection ? 'Inspecting ' + inspection.id : target ? 'Approaching ' + target.id : ended ? 'Run complete' : 'Finishing route'}</span>
        </div>
        <div className={styles.stage} data-seconds={seconds.toFixed(2)}>
          {staticMode ? <StaticDiagram seconds={seconds} sensor={sensor} /> :
            <Scene transport={transport} feeds={feeds} onTime={setSeconds} onPause={pause} onFailure={fail}
              selectedSensor={sensor} onSensor={selectSensor} onHiddenSensorFocus={focusSensorButton} />}
          <div className={styles.stageCaption} aria-hidden="true"><span>{inspection ? inspection.label : 'Modeled sidewalk'}</span><span>No live sensing</span></div>
        </div>
        <div className={styles.controls}>
          <div className={styles.transport}>
            <button type="button" className={styles.primary} onClick={togglePlayback} disabled={staticMode}
              aria-label={running ? 'Pause simulation' : ended ? 'Replay simulation' : 'Play simulation'}>{running ? 'Ⅱ Pause' : ended ? '↺ Replay' : '▶ Play'}</button>
            <button type="button" onClick={replay} aria-label="Replay from start">↺ <span>Replay</span></button>
            <label className={styles.scrub}>Simulation progress
              <input type="range" min="0" max={DURATION} step="0.1" value={seconds}
                onChange={event => scrub(Number(event.target.value))} aria-valuetext={wholeSeconds + ' of ' + DURATION + ' seconds; ' + count + ' of ' + CAPTURES.length + ' inspections captured'} />
            </label>
            <span className={styles.time} role="timer" aria-live="off"><span aria-hidden="true">{String(wholeSeconds).padStart(2, '0')} / {DURATION}s</span>
              <span className={styles.srOnly}>Simulation time {wholeSeconds} of {DURATION} seconds</span></span>
            <label className={styles.speed}>Speed<select aria-label="Playback speed" value={speed} onChange={event => {
              const value = Number(event.target.value);
              transport.current.speed = value;
              setSpeed(value);
            }}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
          </div>
          <div className={styles.viewRow}>
            <div className={styles.viewGroup} role="group" aria-label="Rover viewpoint">
              {views.map(([id, label]) => <button type="button" key={id} aria-pressed={view === id}
                onClick={() => selectView(id)} disabled={staticMode}>{label}</button>)}
              <button type="button" onClick={() => selectView(view)} disabled={staticMode}>Reset view</button>
            </div>
            <button type="button" className={styles.coverage} aria-pressed={coverage} disabled={staticMode} onClick={() => {
              transport.current.coverage = !coverage;
              setCoverage(!coverage);
              invalidate();
            }}>Camera coverage: {coverage ? 'on' : 'off'}</button>
          </div>
        </div>
        <div className={styles.modeRow}>
          <div role="group" aria-label="Scene format">
            <button type="button" aria-pressed={!staticMode} onClick={() => chooseMode(false)}>3D scene</button>
            <button type="button" aria-pressed={staticMode} onClick={() => chooseMode(true)}>Static diagram</button>
          </div>
          <p>{staticMode ? 'Scrub to move between inspection stops.' : 'Drag the scene to orbit. Touch swipes scroll.'}</p>
        </div>
        {message ? <p className={styles.notice} role="status">{message} The static views are ready.</p> : null}
        {reducedMotion ? <p className={styles.notice}>Reduced motion starts paused and keeps camera changes manual.</p> : null}
      </section>

      <div className={styles.inspectionSide}>
        <CameraViews feeds={feeds} sensorButtons={sensorButtons} seconds={seconds} selected={sensor}
          autoInspect={autoInspect} reducedMotion={reducedMotion} staticMode={staticMode}
          onSensor={selectSensor} onAuto={toggleAuto} />
        <div className={styles.inspectionNote} data-inspecting={Boolean(inspection)}>
          <div><strong>{inspection ? inspection.id + ' · ' + inspection.label : target ? 'Next: ' + target.label : 'Inspection run complete'}</strong>
            <span>{inspection ? (seconds >= inspection.at ? 'Captured at ' : 'Capture at ') + secondsText(inspection.at) :
              target ? (autoInspect && !reducedMotion ? 'Automatic close-up at ' : 'Scheduled stop at ') + secondsText(target.start) : secondsText(DURATION)}</span></div>
          <p>{inspection?.note ?? 'Open an inspection stop to revisit all three angles.'}</p>
        </div>
      </div>
    </div>

    <section className={styles.sequence} aria-labelledby="capture-heading">
      <div className={styles.sequenceHeading}><h2 id="capture-heading">Inspection stops</h2><span>{count} of {CAPTURES.length} captured</span></div>
      <ol>{CAPTURES.map(capture => {
        const captured = seconds >= capture.at;
        const state = captured ? 'Captured' : 'Upcoming';
        return <li key={capture.id} data-captured={captured}>
          <button type="button" onClick={() => seekToCapture(capture)}
            aria-label={capture.id + ', ' + capture.label + ', ' + secondsText(capture.at) + ', ' + state + '. Seek here.'}>
            <span className={styles.stopNumber}>{capture.id}</span>
            <span><strong>{capture.label}</strong><span>{secondsText(capture.at)} · 3 camera views</span></span>
            <span className={styles.captureState}>{state}</span>
          </button>
        </li>;
      })}</ol>
    </section>
    <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    <footer className={styles.story}>
      <p>These modeled views illustrate evidence collection. The actual Robertson Hall survey was recorded by phone.</p>
      <div><Link href="/curb/upload">Start with the phone survey ↗</Link><Link href="/curb/explore">Explore route evidence ↗</Link></div>
    </footer>
  </article>;
}
