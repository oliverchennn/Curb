'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './SurveyDemoEntry.module.css';

const DURATION_MS = 10_000;
const DESTINATION = '/curb/surveys/robertson-hall';
// Only these already-analyzed bytes may open the prepared Robertson findings.
const PREPARED_HASHES = new Set([
  '30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a',
  '52b364f88dd42f66fe924f2d5a25ef6cf642a8ce272790bc315ee78427831ff6',
]);
const STEPS = ['Prepare survey replay', 'Load tracked findings', 'Connect accessibility checks', 'Assemble repair options'];

export function SurveyDemoEntry() {
  const router = useRouter();
  const [phase, setPhase] = useState<'ready' | 'checking' | 'processing' | 'opening'>('ready');
  const [fileName, setFileName] = useState('IMG_0699.MOV');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const runRef = useRef(0);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const active = phase === 'processing' || phase === 'opening';
  const step = Math.min(STEPS.length - 1, Math.floor(progress / 25));

  function clearTimer() {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  useEffect(() => () => { runRef.current++; clearTimer(); }, []);
  useEffect(() => { if (active) headingRef.current?.focus(); }, [active]);

  function begin(name: string) {
    clearTimer();
    busyRef.current = true;
    const run = ++runRef.current;
    setFileName(name);
    setError('');
    setProgress(0);
    setPhase('processing');
    const started = performance.now();
    timerRef.current = setInterval(() => {
      if (run !== runRef.current) return;
      const percent = Math.min(100, (performance.now() - started) / DURATION_MS * 100);
      setProgress(percent);
      if (percent >= 100) {
        clearTimer();
        setPhase('opening');
        router.push(DESTINATION);
      }
    }, 100);
  }

  async function selectFile(file?: File) {
    if (!file || busyRef.current) return;
    setDragging(false);
    if (file.size === 0 || file.size > 50 * 1024 * 1024) {
      setError('Choose the original Robertson Hall MOV or its prepared MP4 (up to 50 MB), or use the bundled demo.');
      return;
    }
    busyRef.current = true;
    const run = ++runRef.current;
    setPhase('checking');
    setError('');
    try {
      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      if (run !== runRef.current) return;
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      if (!PREPARED_HASHES.has(hash)) {
        setError('This clip has no prepared analysis in this demo. Choose IMG_0699.MOV from Robertson Hall, or use the bundled demo below.');
        setPhase('ready');
        busyRef.current = false;
        return;
      }
      begin(file.name);
    } catch {
      if (run !== runRef.current) return;
      setError('The local file could not be checked. Try again, or use the bundled demo.');
      setPhase('ready');
      busyRef.current = false;
    }
  }

  function cancel() {
    runRef.current++;
    clearTimer();
    busyRef.current = false;
    setPhase('ready');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  return <div className={styles.page}>
    <section className={styles.intro} aria-labelledby="upload-heading">
      <p className={styles.eyebrow}>Curb / Robertson Hall pilot</p>
      <h1 id="upload-heading">A short walk.<br />A clearer repair plan.</h1>
      <p className={styles.lede}>Connect sidewalk evidence to disability access, repair choices, and a budget your facilities team can act on.</p>
      <ol className={styles.workflow}>
        <li><span>01</span>Review the evidence</li>
        <li><span>02</span>Compare repair plans</li>
        <li><span>03</span>Export an actionable brief</li>
      </ol>
      <p className={styles.caption}>One campus walk-through. Measurements and field review still needed.</p>
    </section>

    <section className={styles.card} aria-labelledby="demo-heading">
      <div className={styles.cardHeading}><span className={styles.badge}>Prepared demo</span><span>~14-second field video</span></div>
      {active ? <>
        <h2 ref={headingRef} tabIndex={-1} id="demo-heading">{phase === 'opening' ? 'Your survey is ready' : 'Preparing your survey'}</h2>
        <p className={styles.filename}>{fileName}</p>
        <div className={styles.processing}>
          <img src="/curb/surveys/robertson-hall/poster.jpg" alt="Robertson Hall sidewalk from the prepared survey" />
          <div><p className={styles.simulation}>10-second processing simulation</p>
            <p role="status" aria-live="polite">{phase === 'opening' ? 'Opening the review workspace…' : STEPS[step]}</p>
            <label htmlFor="demo-progress">Demo progress · {Math.floor(progress)}%</label>
            <progress id="demo-progress" value={progress} max={100} />
          </div>
        </div>
        <ol className={styles.stages}>
          {STEPS.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}>
            <span aria-hidden="true">{index < step || progress === 100 ? '✓' : String(index + 1).padStart(2, '0')}</span>{label}
          </li>)}
        </ol>
        <p className={styles.caption}>This walkthrough opens previously prepared findings. It does not run live AI analysis.</p>
        {phase === 'processing' ? <button type="button" className={styles.secondary} onClick={cancel}>Cancel demo</button>
          : <Link href={DESTINATION}>Open survey workspace →</Link>}
      </> : <>
        <h2 id="demo-heading">Start with a sidewalk video</h2>
        <p>Choose your Robertson Hall clip, or replay the bundled example.</p>
        <div className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
          onDragOver={event => { event.preventDefault(); if (phase === 'ready') setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]); }}>
          <span className={styles.uploadIcon} aria-hidden="true">↑</span>
          <strong>Drop the Robertson Hall video here</strong>
          <span className={styles.caption}>Original MOV or prepared MP4 · up to 50 MB</span>
          <input ref={inputRef} id="survey-file" className={styles.fileInput} type="file" accept="video/*,.mov,.mp4"
            disabled={phase === 'checking'} aria-describedby="upload-note"
            onChange={event => { void selectFile(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
          <label className={styles.fileLabel} htmlFor="survey-file">Choose video</label>
        </div>
        {phase === 'checking' ? <p role="status">Checking the selected file locally…</p> : null}
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <button type="button" className={styles.primary} disabled={phase === 'checking'} onClick={() => { if (!busyRef.current) begin('IMG_0699.MOV · bundled demo'); }}>Use Robertson Hall demo <span aria-hidden="true">→</span></button>
        <p id="upload-note" className={styles.caption}>Selected locally; no file is uploaded. A 10-second processing simulation opens the prepared Robertson Hall findings.</p>
        <Link className={styles.skip} href={DESTINATION}>Skip to the prepared survey</Link>
      </>}
    </section>
  </div>;
}
