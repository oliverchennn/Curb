'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collapseGroup,
  GROUP_ROLES,
  orderedGroups,
  type GroupId,
  type IndexEntry,
} from './groups';
import { loadManifest, type ManifestGroup, type RobotManifest } from './manifest';
import { RobotScene, type SceneMode } from './RobotScene';
import styles from './robot.module.css';

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

  // Keep the latest manifest reachable from stable callbacks.
  const manifestRef = useRef<RobotManifest | null>(null);
  manifestRef.current = manifest;

  const openGroup = useCallback((id: string) => {
    const group = manifestRef.current?.groups.find(g => g.id === id);
    if (!group) return;
    const collapsed = collapseGroup(group);
    returnFocusRef.current = { id, element: document.activeElement instanceof HTMLElement ? document.activeElement : null };
    selectedRef.current = id;
    openKeyRef.current = null;
    pendingFocusRef.current = 'back';
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

  const expandGroup = useCallback((indexOnly = false, moveFocus = true) => {
    if (!selectedRef.current || (!indexOnly && !sceneRef.current?.expandGroup())) return;
    if (moveFocus) pendingFocusRef.current = 'firstPart';
    setIndexExpanded(true);
    setMode('exploded');
  }, []);

  const selectEntry = useCallback((key: string) => {
    const next = openKeyRef.current === key ? null : key;
    openKeyRef.current = next;
    setOpenKey(next);
    sceneRef.current?.highlightEntry(next);
    if (next) sceneRef.current?.focusEntry(next);
  }, []);

  const back = useCallback(() => {
    selectedRef.current = null;
    openKeyRef.current = null;
    pendingFocusRef.current = 'group';
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
              if (state === 'ready') sceneRef.current?.highlightEntry(openKeyRef.current);
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

  // Esc returns to the full robot.
  useEffect(() => {
    if (mode === 'overview') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); back(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, back]);

  const selectedGroup: ManifestGroup | null = selectedId
    ? manifest?.groups.find(g => g.id === selectedId) ?? null
    : null;
  const groups = manifest ? orderedGroups(manifest) : [];
  const totalParts = manifest ? manifest.groups.reduce((n, g) => n + g.count, 0) : 0;
  const indexOnly = Boolean(fallback) || detail.state === 'error';

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
            <button ref={backRef} type="button" className={styles.back} onClick={back}>← Back to full robot</button>
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
            {mode === 'overview' && !fallback && (
              <button
                type="button"
                className={styles.orbitToggle}
                aria-pressed={autoOrbit}
                onClick={() => setAutoOrbit(v => !v)}
              >
                {autoOrbit ? '❙❙ Pause orbit' : '▶ Auto-orbit'}
              </button>
            )}
            {mode === 'isolated' && (
              <button
                type="button"
                className={`${styles.orbitToggle} ${styles.expandButton}`}
                disabled={!indexOnly && detail.state !== 'ready'}
                onClick={() => expandGroup(indexOnly)}
              >
                {indexOnly ? 'Show part descriptions' : 'Expand into parts'}
              </button>
            )}
            {mode !== 'overview' && (
              <button type="button" className={styles.orbitToggle} onClick={back}>← Full robot</button>
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

          {!indexOnly && <p className={styles.hint}>
            {mode === 'overview' && 'Drag to orbit · scroll to zoom · click a subsystem to isolate it'}
            {mode === 'isolated' && 'Click the model to expand it · Esc returns to the full robot'}
            {mode === 'exploded' && 'Select a part to see its purpose · Esc returns to the full robot'}
          </p>}
        </div>
        <p className={styles.concept}>{manifest?.note ?? 'Generic prototype concept model — not validated hardware.'}</p>
      </section>
    </div>
  );
}
