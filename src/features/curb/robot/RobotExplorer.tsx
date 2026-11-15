'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  collapseGroup,
  GROUP_ROLES,
  orderedGroups,
  type GroupId,
  type IndexEntry,
} from './groups';
import { loadManifest, type ManifestGroup, type RobotManifest } from './manifest';
import { RobotScene, type SceneMode } from './RobotScene';
import { buildTour, type TourBeat } from './tour';
import styles from './robot.module.css';

// Hands-free demo loop cadence (#5): per-beat dwell, and a longer hold on the
// closing hand-off before the loop restarts.
const TOUR_STEP_MS = 4800;
const TOUR_CLOSE_MS = 6500;

// Where the closing hand-off (#6) sends people into the product flow.
const HANDOFF_LINKS = [
  { href: '/curb/upload', label: 'Start a survey' },
  { href: '/curb/surveys/robertson-hall', label: 'Robertson Hall review' },
  { href: '/curb/plans', label: 'Repair priorities' },
];

type Status = 'loading' | 'ready' | 'error';

function roleFor(id: string): string {
  return GROUP_ROLES[id as GroupId] ?? '';
}

export default function RobotExplorer() {
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RobotScene | null>(null);
  const sceneReadyRef = useRef(false);
  const selectedRef = useRef<string | null>(null);
  const openKeyRef = useRef<string | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const groupButtons = useRef(new Map<string, HTMLButtonElement>());
  const partButtons = useRef(new Map<string, HTMLButtonElement>());
  const returnFocusRef = useRef<{ id: string; element: HTMLElement | null } | null>(null);
  const pendingFocusRef = useRef<'group' | 'back' | 'part' | 'firstPart' | null>(null);
  const tourActiveRef = useRef(false);
  const tourStepRef = useRef(0);
  const explodeOnReadyRef = useRef<string | null>(null);

  const [manifest, setManifest] = useState<RobotManifest | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [fallback, setFallback] = useState('');
  const [progress, setProgress] = useState({ loaded: 0, total: 6 });

  const [mode, setMode] = useState<SceneMode>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<IndexEntry[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ state: 'idle' | 'loading' | 'ready' | 'error'; message?: string }>({ state: 'idle' });

  const [reduced, setReduced] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [indexExpanded, setIndexExpanded] = useState(true);
  const autoOrbitRef = useRef(autoOrbit);
  autoOrbitRef.current = autoOrbit;

  // Guided tour (#2) / hands-free demo loop (#5) and the opening hero card (#1).
  const [showIntro, setShowIntro] = useState(true);
  const [tourActive, setTourActive] = useState(false);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Keep the latest manifest reachable from stable callbacks.
  const manifestRef = useRef<RobotManifest | null>(null);
  manifestRef.current = manifest;

  const openGroup = useCallback((id: string, moveFocus = true) => {
    const group = manifestRef.current?.groups.find(g => g.id === id);
    if (!group) return;
    const collapsed = collapseGroup(group);
    if (moveFocus) {
      returnFocusRef.current = { id, element: document.activeElement instanceof HTMLElement ? document.activeElement : null };
      pendingFocusRef.current = 'back';
    }
    selectedRef.current = id;
    openKeyRef.current = null;
    setIndexExpanded(true);
    setMode('isolated');
    setSelectedId(id);
    setEntries(collapsed);
    setOpenKey(null);
    setHovered(null);
    setDetail({ state: 'idle' });
    sceneRef.current?.setHover(null);
    if (sceneReadyRef.current) void sceneRef.current?.isolateGroup(group, collapsed);
  }, []);

  const expandGroup = useCallback((indexOnly = false, moveFocus = true): boolean => {
    if (!selectedRef.current || (!indexOnly && !sceneRef.current?.expandGroup())) return false;
    if (moveFocus) pendingFocusRef.current = 'firstPart';
    setIndexExpanded(true);
    setMode('exploded');
    return true;
  }, []);

  const selectEntry = useCallback((key: string) => {
    const next = openKeyRef.current === key ? null : key;
    openKeyRef.current = next;
    setOpenKey(next);
    sceneRef.current?.highlightEntry(next);
    if (next) sceneRef.current?.focusEntry(next);
  }, []);

  const back = useCallback((moveFocus = true) => {
    selectedRef.current = null;
    openKeyRef.current = null;
    pendingFocusRef.current = moveFocus ? 'group' : null;
    setIndexExpanded(true);
    setMode('overview');
    setSelectedId(null);
    setEntries([]);
    setOpenKey(null);
    setHovered(null);
    setDetail({ state: 'idle' });
    sceneRef.current?.reset();
  }, []);

  const hoverGroup = useCallback((id: string | null) => {
    setHovered(id);
    sceneRef.current?.setHover(id);
  }, []);

  // ---- Guided tour / demo loop ----
  const beats = useMemo<TourBeat[]>(
    () => (manifest ? buildTour(manifest.groups.map(g => ({ id: g.id, label: g.label }))) : []),
    [manifest],
  );
  const beatsRef = useRef<TourBeat[]>(beats);
  beatsRef.current = beats;

  // Drive the scene for a single beat without moving keyboard focus (the tour
  // controls keep focus so Next/Back stay usable).
  const applyBeat = useCallback((beat: TourBeat) => {
    explodeOnReadyRef.current = null;
    if (beat.kind === 'overview') { back(false); return; }
    if (!beat.groupId) return;
    if (beat.kind === 'isolate') { openGroup(beat.groupId, false); return; }
    // explode: isolate first if needed, then expand once the detail is ready.
    if (selectedRef.current !== beat.groupId) openGroup(beat.groupId, false);
    explodeOnReadyRef.current = beat.groupId;
    if (expandGroup(false, false)) explodeOnReadyRef.current = null;
  }, [back, openGroup, expandGroup]);

  const goToBeat = useCallback((index: number) => {
    const list = beatsRef.current;
    if (!list.length) return;
    const clamped = Math.max(0, Math.min(index, list.length - 1));
    tourStepRef.current = clamped;
    setTourStep(clamped);
    applyBeat(list[clamped]);
  }, [applyBeat]);

  const startTour = useCallback((play: boolean) => {
    if (!beatsRef.current.length) return;
    tourActiveRef.current = true;
    setTourActive(true);
    setShowIntro(false);
    setTourPlaying(play);
    goToBeat(0);
  }, [goToBeat]);

  const exitTour = useCallback(() => {
    tourActiveRef.current = false;
    explodeOnReadyRef.current = null;
    tourStepRef.current = 0;
    setTourActive(false);
    setTourPlaying(false);
    setTourStep(0);
    back(true);
  }, [back]);

  const tourNext = useCallback(() => {
    if (tourStepRef.current >= beatsRef.current.length - 1) return;
    goToBeat(tourStepRef.current + 1);
  }, [goToBeat]);

  const tourPrev = useCallback(() => {
    if (tourStepRef.current <= 0) return;
    goToBeat(tourStepRef.current - 1);
  }, [goToBeat]);

  // Focus must follow controls that are removed when switching views. On mobile,
  // opening the index also makes the destination visible before it receives focus.
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    let target: HTMLElement | undefined | null;
    if (pending === 'back') target = backRef.current;
    if (pending === 'part' && openKey) target = partButtons.current.get(openKey);
    if (pending === 'firstPart') target = partButtons.current.values().next().value ?? backRef.current;
    if (pending === 'group') {
      const origin = returnFocusRef.current;
      const element = origin?.element;
      target = element?.isConnected && element !== document.body && element.getClientRects().length
        ? element : origin ? groupButtons.current.get(origin.id) : undefined;
    }
    if (target) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest' });
    }
    pendingFocusRef.current = null;
  }, [mode, selectedId, openKey, indexExpanded]);

  // Reduced-motion preference.
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduced(media.matches);
      if (media.matches) setAutoOrbit(false);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Build the scene and load the overview once the mount points exist.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    loadManifest(controller.signal)
      .then(data => {
        if (cancelled) return;
        setManifest(data);
        if (!stageRef.current || !labelRef.current) return;
        let scene: RobotScene;
        try {
          scene = new RobotScene(stageRef.current, labelRef.current, {
            onHoverGroup: setHovered,
            onPickGroup: openGroup,
            onExpand: () => expandGroup(false, false),
            onPickEntry: (groupId, key) => {
              if (selectedRef.current !== groupId) return;
              pendingFocusRef.current = 'part';
              setIndexExpanded(true);
              selectEntry(key);
              // A second activation closes the item but still has a visible target.
              if (openKeyRef.current === null) {
                partButtons.current.get(key)?.focus({ preventScroll: true });
                pendingFocusRef.current = null;
              }
            },
            onProgress: (loaded, total) => setProgress({ loaded, total }),
            onDetailState: (groupId, state, message) => {
              if (cancelled || selectedRef.current !== groupId) return;
              setDetail({ state, message });
              if (state === 'ready') {
                sceneRef.current?.highlightEntry(openKeyRef.current);
                // A tour explode beat that was waiting on this geometry fires now.
                if (explodeOnReadyRef.current === groupId) {
                  explodeOnReadyRef.current = null;
                  expandGroup(false, false);
                }
              }
            },
            onContextLost: message => {
              if (cancelled) return;
              sceneReadyRef.current = false;
              setFallback(message);
              setDetail({ state: 'idle' });
              sceneRef.current?.dispose();
              sceneRef.current = null;
            },
          });
        } catch (err) {
          setFallback(err instanceof Error ? err.message : '3D is unavailable on this device.');
          setStatus('ready');
          return;
        }
        sceneRef.current = scene;
        scene.setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        scene.setAutoOrbit(autoOrbitRef.current);
        scene
          .loadOverview(data)
          .then(() => {
            if (cancelled || sceneRef.current !== scene) return;
            sceneReadyRef.current = true;
            setStatus('ready');
            const group = data.groups.find(g => g.id === selectedRef.current);
            if (group) void scene.isolateGroup(group, collapseGroup(group));
          })
          .catch(err => {
            if (cancelled || sceneRef.current !== scene) return;
            sceneReadyRef.current = false;
            scene.dispose();
            sceneRef.current = null;
            setStatus('ready');
            setDetail({ state: 'idle' });
            setFallback(err instanceof Error ? err.message : 'The model failed to load.');
          });
      })
      .catch(err => {
        if (cancelled || controller.signal.aborted) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'The model index failed to load.');
      });

    return () => {
      cancelled = true;
      controller.abort();
      sceneReadyRef.current = false;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [openGroup, expandGroup, selectEntry]);

  useEffect(() => { sceneRef.current?.setReducedMotion(reduced); }, [reduced]);
  useEffect(() => { sceneRef.current?.setAutoOrbit(autoOrbit); }, [autoOrbit]);

  // Esc exits the tour, or returns to the full robot.
  useEffect(() => {
    if (mode === 'overview' && !tourActive) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (tourActiveRef.current) exitTour();
      else back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, tourActive, back, exitTour]);

  // Hands-free demo loop (#5): advance on a timer while playing, looping back to
  // the start after the closing hand-off.
  useEffect(() => {
    if (!tourActive || !tourPlaying) return;
    const list = beatsRef.current;
    if (list.length < 2) return;
    const atEnd = tourStep >= list.length - 1;
    const timer = window.setTimeout(() => {
      if (tourStepRef.current >= beatsRef.current.length - 1) goToBeat(0);
      else goToBeat(tourStepRef.current + 1);
    }, atEnd ? TOUR_CLOSE_MS : TOUR_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [tourActive, tourPlaying, tourStep, goToBeat]);

  const selectedGroup: ManifestGroup | null = selectedId
    ? manifest?.groups.find(g => g.id === selectedId) ?? null
    : null;
  const groups = manifest ? orderedGroups(manifest) : [];
  const totalParts = manifest ? manifest.groups.reduce((n, g) => n + g.count, 0) : 0;
  const indexOnly = Boolean(fallback) || detail.state === 'error';
  const currentBeat = tourActive ? beats[tourStep] : undefined;
  const canTour = beats.length >= 2 && !fallback;
  const showIntroCard = status === 'ready' && !fallback && mode === 'overview' && !tourActive && showIntro;

  if (status === 'error') {
    return (
      <div className={styles.initial} role="alert">
        <p>The robot model index could not load. {error}</p>
      </div>
    );
  }

  return (
    <div className={styles.explorer}>
      <aside className={styles.index} aria-label={mode === 'overview' ? 'Robot subsystems' : 'Parts index'}>
        <button
          type="button"
          className={styles.indexToggle}
          aria-expanded={indexExpanded}
          aria-controls="robot-parts-index"
          onClick={() => setIndexExpanded(value => !value)}
        >
          {mode === 'overview' ? 'Subsystems' : 'Parts index'}
          <span>{indexExpanded ? 'Hide −' : 'Show +'}</span>
        </button>
        <div id="robot-parts-index" className={styles.indexBody} data-expanded={indexExpanded}>
        {mode === 'overview' ? (
          <>
            <div className={styles.indexHead}>
              <h2>Subsystems</h2>
              <p>{totalParts.toLocaleString()} parts · {groups.length} functional groups. Select a group to isolate it.</p>
            </div>
            <ul className={styles.groupList}>
              {groups.map(g => (
                <li key={g.id}>
                  <button
                    type="button"
                    className={styles.groupButton}
                    ref={element => { if (element) groupButtons.current.set(g.id, element); else groupButtons.current.delete(g.id); }}
                    data-hovered={hovered === g.id || undefined}
                    onClick={() => openGroup(g.id)}
                    onPointerEnter={() => hoverGroup(g.id)}
                    onPointerLeave={() => hoverGroup(null)}
                    onFocus={() => hoverGroup(g.id)}
                    onBlur={() => hoverGroup(null)}
                  >
                    <span className={styles.swatch} style={{ background: g.color }} aria-hidden="true" />
                    <span className={styles.groupText}>
                      <strong>{g.label}</strong>
                      <small>{g.count.toLocaleString()} parts</small>
                      <span className={styles.role}>{roleFor(g.id) || g.blurb}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <button ref={backRef} type="button" className={styles.back} onClick={() => back()}>← Back to full robot</button>
            {selectedGroup && (
              <div className={styles.indexHead}>
                <span className={styles.groupTag} style={{ background: selectedGroup.color }}>{selectedGroup.label}</span>
                <p>{roleFor(selectedGroup.id) || selectedGroup.blurb}</p>
                <p className={styles.collapseNote}>
                  {entries.length} item types · {selectedGroup.count.toLocaleString()} parts. Repeated components with the same name and family are listed once with a quantity.
                </p>
              </div>
            )}
            {mode === 'exploded' && <ol className={styles.partList}>
              {entries.map(entry => {
                const open = openKey === entry.key;
                return (
                  <li key={entry.key}>
                    <button
                      type="button"
                      className={styles.partButton}
                      ref={element => { if (element) partButtons.current.set(entry.key, element); else partButtons.current.delete(entry.key); }}
                      aria-expanded={open}
                      data-open={open || undefined}
                      onClick={() => selectEntry(entry.key)}
                    >
                      <span className={styles.partNumber} style={{ borderColor: selectedGroup?.color }}>{entry.number}</span>
                      <span className={styles.partName}>{entry.label}</span>
                      {entry.quantity > 1 && <span className={styles.qty}>×{entry.quantity}</span>}
                      <span className={styles.chevron} aria-hidden="true">{open ? '▾' : '▸'}</span>
                    </button>
                    {open && (
                      <div className={styles.partDetail}>
                        <p>{entry.description}</p>
                        <dl>
                          <div><dt>Family</dt><dd><code>{entry.kind}</code></dd></div>
                          <div><dt>Quantity</dt><dd>{entry.quantity}</dd></div>
                        </dl>
                        <p className={styles.genericNote}>Generic geometry; supplier, material and ratings are unselected.</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>}
          </>
        )}
        </div>
      </aside>

      <section className={styles.stageWrap} aria-label="Robot model">
        <div className={styles.toolbar}>
          {selectedGroup ? (
            <span className={styles.stageTitle}>
              <span className={styles.dot} style={{ background: selectedGroup.color }} aria-hidden="true" />
              {selectedGroup.label}{indexOnly ? '' : mode === 'isolated' ? ' — isolated view' : ' — exploded view'}
            </span>
          ) : (
            <span className={styles.stageTitle}>Curb survey robot — concept model</span>
          )}
          <div className={styles.toolbarActions}>
            {!tourActive && mode === 'overview' && !fallback && (
              <>
                {canTour && (
                  <button
                    type="button"
                    className={`${styles.orbitToggle} ${styles.tourLaunch}`}
                    onClick={() => startTour(false)}
                  >
                    ▶ Guided tour
                  </button>
                )}
                <button
                  type="button"
                  className={styles.orbitToggle}
                  aria-pressed={autoOrbit}
                  onClick={() => setAutoOrbit(v => !v)}
                >
                  {autoOrbit ? '❙❙ Pause orbit' : '▶ Auto-orbit'}
                </button>
              </>
            )}
            {!tourActive && mode === 'isolated' && (
              <button
                type="button"
                className={`${styles.orbitToggle} ${styles.expandButton}`}
                disabled={!indexOnly && detail.state !== 'ready'}
                onClick={() => expandGroup(indexOnly)}
              >
                {indexOnly ? 'Show part descriptions' : 'Expand into parts'}
              </button>
            )}
            {!tourActive && mode !== 'overview' && (
              <button type="button" className={styles.orbitToggle} onClick={() => back()}>← Full robot</button>
            )}
          </div>
        </div>

        <div className={styles.stage}>
          <div ref={stageRef} className={styles.canvasHost} />
          <div
            ref={labelRef}
            className={styles.labelLayer}
            role={mode === 'isolated' ? undefined : 'group'}
            aria-label={mode === 'overview' ? 'On-model subsystems' : mode === 'exploded' ? 'On-model parts' : undefined}
          />

          {fallback ? (
            <div className={styles.fallback} role="status">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/robot/stills/assembled.png" alt="Assembled Curb survey robot concept model" />
              <p>{fallback} The subsystem list and part descriptions remain available.</p>
            </div>
          ) : status === 'loading' ? (
            <div className={styles.loading} role="status">
              Loading model geometry… {progress.loaded}/{progress.total} groups
            </div>
          ) : null}

          {detail.state === 'loading' && (
            <div className={styles.detailLoading} role="status">Loading full detail…</div>
          )}
          {detail.state === 'error' && (
            <div className={styles.detailError} role="alert">Detail failed to load. {detail.message}</div>
          )}

          {showIntroCard && (
            <div className={styles.introCard} role="group" aria-label="Robot demo intro">
              <p className={styles.introEyebrow}>Curb survey robot</p>
              <h3 className={styles.introTitle}>See how the robot feeds the survey</h3>
              <p className={styles.introBody}>
                A concept sidewalk-survey robot. Take a guided tour through its subsystems — or let it play on its own —
                then jump into the survey it would feed.
              </p>
              <div className={styles.introActions}>
                <button type="button" className={styles.introPrimary} onClick={() => startTour(false)}>▶ Start guided tour</button>
                <button type="button" className={styles.introSecondary} onClick={() => startTour(true)}>↻ Play demo loop</button>
                <button type="button" className={styles.introGhost} onClick={() => setShowIntro(false)}>Explore freely</button>
              </div>
            </div>
          )}

          {tourActive && currentBeat && (
            <div className={styles.tourBar} role="group" aria-label="Guided tour">
              <div className={styles.tourText}>
                <span className={styles.tourStep}>Step {tourStep + 1} / {beats.length}</span>
                <strong className={styles.tourTitle}>{currentBeat.title}</strong>
                <span className={styles.tourBody}>{currentBeat.body}</span>
                {currentBeat.cta && (
                  <div className={styles.tourLinks}>
                    {HANDOFF_LINKS.map(link => (
                      <Link key={link.href} href={link.href} className={styles.tourLink}>{link.label} →</Link>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.tourControls}>
                <button type="button" className={styles.tourBtn} onClick={tourPrev} disabled={tourStep === 0} aria-label="Previous step">‹</button>
                <button
                  type="button"
                  className={styles.tourBtn}
                  aria-pressed={tourPlaying}
                  onClick={() => setTourPlaying(p => !p)}
                  aria-label={tourPlaying ? 'Pause demo loop' : 'Play demo loop'}
                >
                  {tourPlaying ? '❙❙' : '▶'}
                </button>
                {tourStep < beats.length - 1 ? (
                  <button type="button" className={`${styles.tourBtn} ${styles.tourNext}`} onClick={tourNext}>Next ›</button>
                ) : (
                  <button type="button" className={`${styles.tourBtn} ${styles.tourNext}`} onClick={() => goToBeat(0)}>↻ Restart</button>
                )}
                <button type="button" className={styles.tourExit} onClick={exitTour}>Exit</button>
              </div>
            </div>
          )}

          {!indexOnly && !tourActive && <p className={styles.hint}>
            {mode === 'overview' && 'Drag to orbit · scroll to zoom · click a subsystem to isolate it'}
            {mode === 'isolated' && 'Click the model to expand it · Esc returns to the full robot'}
            {mode === 'exploded' && 'Zoom in to reveal part numbers · select a part for its purpose · Esc returns'}
          </p>}
        </div>
        <p className={styles.concept}>{manifest?.note ?? 'Generic prototype concept model — not validated hardware.'}</p>
      </section>
    </div>
  );
}
