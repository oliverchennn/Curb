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
import { RobotScene } from './RobotScene';
import styles from './robot.module.css';

type Mode = 'overview' | 'exploded';
type Status = 'loading' | 'ready' | 'error';

function roleFor(id: string): string {
  return GROUP_ROLES[id as GroupId] ?? '';
}

export default function RobotExplorer() {
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RobotScene | null>(null);

  const [manifest, setManifest] = useState<RobotManifest | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [fallback, setFallback] = useState('');
  const [progress, setProgress] = useState({ loaded: 0, total: 6 });

  const [mode, setMode] = useState<Mode>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<IndexEntry[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ state: 'idle' | 'loading' | 'ready' | 'error'; message?: string }>({ state: 'idle' });

  const [reduced, setReduced] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(true);

  // Keep the latest manifest reachable from stable callbacks.
  const manifestRef = useRef<RobotManifest | null>(null);
  manifestRef.current = manifest;

  const openGroup = useCallback((id: string) => {
    const group = manifestRef.current?.groups.find(g => g.id === id);
    if (!group) return;
    const collapsed = collapseGroup(group);
    setMode('exploded');
    setSelectedId(id);
    setEntries(collapsed);
    setOpenKey(null);
    setDetail({ state: 'idle' });
    sceneRef.current?.explodeGroup(group, collapsed);
  }, []);

  const selectEntry = useCallback((key: string) => {
    setOpenKey(prev => {
      const next = prev === key ? null : key;
      sceneRef.current?.highlightEntry(next);
      if (next) sceneRef.current?.focusEntry(next);
      return next;
    });
  }, []);

  const back = useCallback(() => {
    setMode('overview');
    setSelectedId(null);
    setEntries([]);
    setOpenKey(null);
    setDetail({ state: 'idle' });
    sceneRef.current?.reset();
  }, []);

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
            onPickEntry: (_g, key) => selectEntry(key),
            onProgress: (loaded, total) => setProgress({ loaded, total }),
            onDetailState: (_g, state, message) => setDetail({ state, message }),
            onContextLost: message => setFallback(message),
          });
        } catch (err) {
          setFallback(err instanceof Error ? err.message : '3D is unavailable on this device.');
          setStatus('ready');
          return;
        }
        sceneRef.current = scene;
        scene.setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        scene
          .loadOverview(data)
          .then(() => { if (!cancelled) setStatus('ready'); })
          .catch(err => { if (!cancelled) setFallback(err instanceof Error ? err.message : 'The model failed to load.'); });
      })
      .catch(err => {
        if (cancelled || controller.signal.aborted) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'The model index failed to load.');
      });

    return () => {
      cancelled = true;
      controller.abort();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [openGroup, selectEntry]);

  useEffect(() => { sceneRef.current?.setReducedMotion(reduced); }, [reduced]);
  useEffect(() => { sceneRef.current?.setAutoOrbit(autoOrbit); }, [autoOrbit]);

  // Esc returns to the full robot.
  useEffect(() => {
    if (mode !== 'exploded') return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') back(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, back]);

  const selectedGroup: ManifestGroup | null = selectedId
    ? manifest?.groups.find(g => g.id === selectedId) ?? null
    : null;
  const groups = manifest ? orderedGroups(manifest) : [];
  const totalParts = manifest ? manifest.groups.reduce((n, g) => n + g.count, 0) : 0;

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
        {mode === 'overview' ? (
          <>
            <div className={styles.indexHead}>
              <h2>Subsystems</h2>
              <p>{totalParts.toLocaleString()} parts · {groups.length} functional groups. Hover the robot to highlight a group, then open it to explode its parts.</p>
            </div>
            <ul className={styles.groupList}>
              {groups.map(g => (
                <li key={g.id}>
                  <button
                    type="button"
                    className={styles.groupButton}
                    data-hovered={hovered === g.id || undefined}
                    onClick={() => openGroup(g.id)}
                    onPointerEnter={() => setHovered(g.id)}
                    onPointerLeave={() => setHovered(null)}
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
            <button type="button" className={styles.back} onClick={back}>← Back to full robot</button>
            {selectedGroup && (
              <div className={styles.indexHead}>
                <span className={styles.groupTag} style={{ background: selectedGroup.color }}>{selectedGroup.label}</span>
                <p>{roleFor(selectedGroup.id) || selectedGroup.blurb}</p>
                <p className={styles.collapseNote}>
                  {entries.length} item types · {selectedGroup.count.toLocaleString()} parts. Identical repeated hardware is listed once with a quantity (e.g. ×{Math.max(...entries.map(e => e.quantity))}).
                </p>
              </div>
            )}
            <ol className={styles.partList}>
              {entries.map(entry => {
                const open = openKey === entry.key;
                return (
                  <li key={entry.key}>
                    <button
                      type="button"
                      className={styles.partButton}
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
            </ol>
          </>
        )}
      </aside>

      <section className={styles.stageWrap} aria-label="Robot model">
        <div className={styles.toolbar}>
          {mode === 'exploded' && selectedGroup ? (
            <span className={styles.stageTitle}><span className={styles.dot} style={{ background: selectedGroup.color }} aria-hidden="true" />{selectedGroup.label} — exploded view</span>
          ) : (
            <span className={styles.stageTitle}>Curb survey robot — concept model</span>
          )}
          <div className={styles.toolbarActions}>
            {mode === 'overview' && !fallback && (
              <button
                type="button"
                className={styles.orbitToggle}
                aria-pressed={autoOrbit}
                disabled={reduced}
                onClick={() => setAutoOrbit(v => !v)}
              >
                {autoOrbit ? '❙❙ Pause orbit' : '▶ Auto-orbit'}
              </button>
            )}
            {mode === 'exploded' && (
              <button type="button" className={styles.orbitToggle} onClick={back}>← Full robot</button>
            )}
          </div>
        </div>

        <div className={styles.stage}>
          <div ref={stageRef} className={styles.canvasHost} />
          <div ref={labelRef} className={styles.labelLayer} aria-hidden="true" />

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

          <p className={styles.hint}>
            {mode === 'overview'
              ? 'Drag to orbit · scroll to zoom · hover a group then click to explode it'
              : 'Click a numbered part or an index item for its purpose · Esc returns'}
          </p>
        </div>
        <p className={styles.concept}>{manifest?.note ?? 'Generic prototype concept model — not validated hardware.'}</p>
      </section>
    </div>
  );
}
