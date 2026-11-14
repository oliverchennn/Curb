'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CAPTURES, DURATION, poseAt, SENSORS, type SensorId, type Transport, type ViewId } from './simulation';
import { StaticDiagram } from './StaticDiagram';
import styles from './collection.module.css';

const Scene = dynamic(() => import('./CollectionScene'), {
  ssr: false,
  loading: () => <div className={styles.loading} role="status">Preparing the local scene…<span>The static diagram is available below.</span></div>,
});

export function CollectionDemo() {
  const transport = useRef<Transport>({ seconds: 0, running: false, speed: 1, sensor: 'forward', coverage: true, view: 'follow', reset: 0 });
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sensor, setSensor] = useState<SensorId>('forward');
  const [coverage, setCoverage] = useState(true);
  const [view, setView] = useState<ViewId>('follow');
  const [staticMode, setStaticMode] = useState(false);
  const [message, setMessage] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);
  const current = SENSORS.find(item => item.id === sensor)!;
  const captures = poseAt(seconds).count;

  const pause = useCallback(() => { transport.current.running = false; setRunning(false); }, []);
  const fail = useCallback((reason: string) => {
    transport.current.running = false;
    setRunning(false);
    setStaticMode(true);
    setMessage(reason);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    function change() {
      setReducedMotion(media.matches);
      if (media.matches) pause();
    }
    change();
    if (!media.matches) { transport.current.running = true; setRunning(true); }
    media.addEventListener('change', change);
    return () => { media.removeEventListener('change', change); transport.current.running = false; };
  }, [pause]);

  const selectSensor = useCallback((id: SensorId) => { transport.current.sensor = id; setSensor(id); }, []);
  function selectView(id: ViewId) { transport.current.view = id; transport.current.reset++; setView(id); }
  function scrub(time: number) { pause(); transport.current.seconds = time; setSeconds(time); }
  function replay() {
    transport.current.seconds = 0; setSeconds(0);
    transport.current.running = !staticMode; setRunning(!staticMode);
  }
  function togglePlayback() {
    if (seconds >= DURATION) { replay(); return; }
    transport.current.running = !transport.current.running;
    setRunning(transport.current.running);
  }
  function chooseMode(diagram: boolean) {
    pause(); setStaticMode(diagram); setMessage('');
  }

  return <article className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}><span /> COLLECTION CONCEPT · SIMULATED SCENE</p>
        <h1>A closer look, from the sidewalk.</h1>
        <p>A proposed camera robot, illustrated here. Footage becomes evidence for people to review.</p>
      </div>
      <Link className={styles.textLink} href="/curb/upload">Try the real phone survey <span aria-hidden="true">↗</span></Link>
    </header>

    <div className={styles.workspace}>
      <section className={styles.scenePanel} aria-label="Collection visualization">
        <div className={styles.stageHeader}>
          <span><span className={styles.dot} /> {staticMode ? 'Static diagram' : 'Procedural 3D scene'}</span>
          <span>Illustration, not deployed hardware</span>
        </div>
        <div className={styles.stage} data-seconds={seconds.toFixed(2)}>
          {staticMode ? <StaticDiagram seconds={seconds} sensor={sensor} /> : <Scene transport={transport} onTime={setSeconds} onPause={pause} onFailure={fail} selectedSensor={sensor} onSensor={selectSensor} />}
          <div className={styles.stageCaption} aria-hidden="true">SIDEWALK STUDY <span>Local scene · no live sensing</span></div>
        </div>
        <div className={styles.controls}>
          <div className={styles.transport}>
            <button className={styles.primary} onClick={togglePlayback} disabled={staticMode} aria-label={running ? 'Pause simulation' : seconds >= DURATION ? 'Replay simulation' : 'Play simulation'}>{running ? 'Ⅱ Pause' : seconds >= DURATION ? '↺ Replay' : '▶ Play'}</button>
            <button onClick={replay} aria-label="Replay from start">↺ <span>Replay</span></button>
            <label className={styles.scrub}>Simulation progress
              <input aria-label="Simulation progress" type="range" min="0" max={DURATION} step="0.1" value={seconds} onChange={event => scrub(Number(event.target.value))} aria-valuetext={`${seconds.toFixed(1)} of ${DURATION} seconds; ${captures} illustrative captures`} />
            </label>
            <output className={styles.time} aria-label="Simulation time">{Math.floor(seconds).toString().padStart(2, '0')} / 24s</output>
            <label className={styles.speed}>Speed<select aria-label="Playback speed" value={speed} onChange={event => { const value = Number(event.target.value); transport.current.speed = value; setSpeed(value); }}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
          </div>
          <div className={styles.viewRow}>
            <div className={styles.viewGroup} role="group" aria-label="Viewpoint">
              {(['follow', 'side', 'overhead'] as const).map(id => <button key={id} aria-pressed={view === id} onClick={() => selectView(id)} disabled={staticMode}>{id === 'follow' ? '◈ Follow' : id === 'side' ? '▱ Side' : '⊞ Overhead'}</button>)}
              <button onClick={() => selectView(view)} disabled={staticMode}>Reset view</button>
            </div>
            <button className={styles.coverage} aria-pressed={coverage} disabled={staticMode} onClick={() => { transport.current.coverage = !coverage; setCoverage(!coverage); }}>Camera coverage: {coverage ? 'on' : 'off'}</button>
          </div>
        </div>
        <div className={styles.modeRow}>
          <div role="group" aria-label="Scene format"><button aria-pressed={!staticMode} onClick={() => chooseMode(false)}>3D scene</button><button aria-pressed={staticMode} onClick={() => chooseMode(true)}>Static diagram</button></div>
          <p>{staticMode ? 'Scrub to move the illustration. All sensor details remain available.' : 'Mouse drag to orbit · swipe to scroll · buttons offer touch and keyboard views'}</p>
        </div>
        {message ? <p className={styles.notice} role="status">{message} The static diagram is ready; you can still inspect every sensor.</p> : null}
        {reducedMotion ? <p className={styles.notice}>Reduced motion: playback starts paused. Scrub or choose Play when you are ready.</p> : null}
      </section>

      <aside className={styles.details} aria-label="Proposed sensors">
        <div className={styles.detailHeading}><p className={styles.eyebrow}>THREE VIEWS. ONE REVIEWABLE RECORD.</p><h2>What could we capture?</h2><p>Select a camera to see its proposed view.</p></div>
        <div className={styles.sensors} role="group" aria-label="Choose a camera">
          {SENSORS.map(item => <button key={item.id} aria-pressed={sensor === item.id} onClick={() => selectSensor(item.id)}><span className={styles.sensorNumber}>{item.number}</span><span>{item.name}<small>{item.purpose}</small></span><span aria-hidden="true">{sensor === item.id ? '●' : '○'}</span></button>)}
        </div>
        <div className={styles.sensorDetail} aria-live="polite"><p className={styles.eyebrow}>PROPOSED VIEW {current.number}</p><h3>{current.purpose}</h3><p>{current.description}</p><div className={styles.limit}><strong>What still needs checking</strong><p>{current.limit}</p></div></div>
        <div className={styles.count}><span>Illustrative captures</span><strong>{captures}<span> / 3</span></strong><small>Simulation progress, not AI inference</small></div>
      </aside>
    </div>

    <section className={styles.sequence} aria-labelledby="capture-heading">
      <div className={styles.sequenceHeading}><h2 id="capture-heading">Simulated capture sequence</h2><span>Schematic examples · not camera output</span></div>
      <ol>{CAPTURES.map((capture, index) => <li key={capture.label} data-captured={seconds >= capture.at}>
        <button onClick={() => scrub(capture.at)} aria-label={`Inspect ${capture.label.toLowerCase()} at ${capture.at} seconds`}>
          <span className={styles.thumbnail} aria-hidden="true"><svg viewBox="0 0 120 64"><path d="M16 64 42 5H78L104 64Z" fill="#d0d4c4" /><path d="M21 49H99M30 29H90" stroke="#fcfaf1" strokeWidth="2" />{index === 1 ? <path d="m61 18-6 9 9 8-8 10 5 8" fill="none" stroke="#97652b" strokeWidth="3" /> : null}{index === 2 ? <g fill="#28765e"><rect x="46" y="16" width="29" height="34" rx="3" /><path d="m53 32 5 5 11-12" fill="none" stroke="white" strokeWidth="3" /></g> : null}</svg></span>
          <span><small>{String(index + 1).padStart(2, '0')} / {capture.at}s</small><strong>{capture.label}</strong><span>{capture.note}</span></span>
          <span className={styles.captureState}>{seconds >= capture.at ? 'Captured' : 'Upcoming'}</span>
        </button>
      </li>)}</ol>
    </section>
    <footer className={styles.story}>
      <p><strong>Collect footage</strong><span aria-hidden="true">→</span><strong>Review proposed findings</strong><span aria-hidden="true">→</span><strong>Plan repairs</strong></p>
      <p>Reliable dimensions require calibrated sensing and field checks. The actual Robertson Hall evidence was collected by phone.</p>
      <div><Link href="/curb/upload">Start with the phone survey ↗</Link><Link href="/curb/explore">Explore route evidence ↗</Link></div>
    </footer>
  </article>;
}
