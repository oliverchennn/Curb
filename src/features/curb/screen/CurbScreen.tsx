'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Barrier, BarrierDetail, Scenario, ScenarioDataset, ScenarioView } from '../../../contracts/curb';
import { fetchScenario, ScenarioFetchError } from '../../../client/curb/fetchScenario';
import { getBarrierDetail } from '../../../domain/curb/index';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CurbMap } from '../map/CurbMap';
import { barrierKindLabel, describeEdge, nodeLabeler } from './labels';
import styles from './CurbScreen.module.css';

const DATASET: ScenarioDataset = 'sample';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: string; httpStatus: number | null }
  | { status: 'ready'; view: ScenarioView };

const REVIEW_STATUS_LABELS: Record<Barrier['reviewStatus'], string> = {
  pending: 'Review pending',
  accepted: 'Review accepted',
  rejected: 'Review rejected',
};

const ERROR_MESSAGES: Record<ScenarioFetchError['code'], string> = {
  SCENARIO_UNAVAILABLE: 'Scenario data is not available right now.',
  DATASET_NOT_FOUND: 'The requested scenario dataset was not found on the server.',
  INVALID_SERVER_SCENARIO: 'The server scenario data failed validation and was not shown.',
  INVALID_RESPONSE: 'The server response did not match the expected format.',
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function describeLoadError(error: unknown): Extract<LoadState, { status: 'error' }> {
  if (error instanceof ScenarioFetchError) {
    return { status: 'error', message: ERROR_MESSAGES[error.code], code: error.code, httpStatus: error.status };
  }
  if (error instanceof TypeError) {
    return {
      status: 'error',
      message: 'Could not reach the server to load the scenario.',
      code: 'NETWORK_ERROR',
      httpStatus: null,
    };
  }
  return { status: 'error', message: 'The scenario could not be loaded.', code: 'UNKNOWN_ERROR', httpStatus: null };
}

type DetailResult = { ok: true; detail: BarrierDetail | null } | { ok: false };

export function CurbScreen() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  // Starts a new request generation. Only the latest generation may write state;
  // earlier requests are aborted and their results (or errors) are discarded.
  const startRequest = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const generation = ++generationRef.current;
    const isCurrent = () => generation === generationRef.current && !controller.signal.aborted;

    fetchScenario(DATASET, controller.signal).then(
      (view) => {
        if (!isCurrent()) return;
        setSelectedId(null);
        setState({ status: 'ready', view });
      },
      (error: unknown) => {
        if (!isCurrent() || isAbortError(error)) return;
        setSelectedId(null);
        setState(describeLoadError(error));
      },
    );
  }, []);

  useEffect(() => {
    startRequest();
    return () => {
      // Invalidate the in-flight generation on unmount (and Strict Mode re-mount).
      generationRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [startRequest]);

  const handleReset = () => {
    setSelectedId(null);
    setState({ status: 'loading' });
    startRequest();
  };

  const scenario = state.status === 'ready' ? state.view.scenario : null;

  const detailResult = useMemo<DetailResult>(() => {
    if (!scenario || !selectedId) return { ok: true, detail: null };
    try {
      return { ok: true, detail: getBarrierDetail(scenario, selectedId) };
    } catch {
      return { ok: false };
    }
  }, [scenario, selectedId]);

  return (
    <div className={styles.screen}>
      <section className={styles.intro} aria-labelledby="curb-screen-heading">
        <h1 id="curb-screen-heading" className={styles.title}>
          {scenario ? scenario.title : 'Campus barrier review'}
        </h1>
        {scenario ? <DataOriginBadge dataKind={scenario.dataKind} /> : null}
        <p className={styles.disclaimer}>Schematic only — not navigation guidance or a compliance assessment.</p>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.resetButton}
            onClick={handleReset}
            disabled={state.status === 'loading'}
          >
            {state.status === 'error' ? 'Try again' : 'Reset'}
          </button>
        </div>
      </section>

      {state.status === 'loading' ? (
        <p role="status" className={styles.statusMessage}>
          Loading scenario…
        </p>
      ) : null}

      {state.status === 'error' ? (
        <div role="alert" className={styles.errorBox}>
          {/* Code and HTTP status stay in state for diagnostics but are not shown to facilities staff. */}
          <p className={styles.errorMessage}>{state.message}</p>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <ReadyView view={state.view} selectedId={selectedId} onSelect={setSelectedId} detailResult={detailResult} />
      ) : null}
    </div>
  );
}

function DataOriginBadge({ dataKind }: { dataKind: Scenario['dataKind'] }) {
  return (
    <p className={dataKind === 'synthetic' ? styles.badgeSynthetic : styles.badgeField}>
      {dataKind === 'synthetic' ? 'Synthetic data — authored example, not field observations' : 'Field data'}
    </p>
  );
}

function ReadyView({
  view,
  selectedId,
  onSelect,
  detailResult,
}: {
  view: ScenarioView;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  detailResult: DetailResult;
}) {
  const { scenario, counts } = view;
  const labelFor = useMemo(() => nodeLabeler(scenario), [scenario]);
  const edgesById = useMemo(() => new Map(scenario.edges.map((edge) => [edge.id, edge])), [scenario]);
  const hasNetwork = counts.nodes > 0 && counts.edges > 0;

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    const current = buttons.findIndex((button) => button === document.activeElement);
    if (current === -1) return;
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? Math.min(buttons.length - 1, current + 1) : Math.max(0, current - 1);
    buttons[next]?.focus();
  };

  return (
    <div className={styles.layout}>
      <div className={styles.primary}>
        <section aria-labelledby="curb-counts-heading" className={styles.card}>
          <h2 id="curb-counts-heading" className={styles.sectionHeading}>
            Scenario summary
          </h2>
          <dl className={styles.counts}>
            <div>
              <dt>Nodes</dt>
              <dd>{counts.nodes}</dd>
            </div>
            <div>
              <dt>Paths</dt>
              <dd>{counts.edges}</dd>
            </div>
            <div>
              <dt>Destinations</dt>
              <dd>{counts.destinations}</dd>
            </div>
            <div>
              <dt>Barriers</dt>
              <dd>{counts.barriers}</dd>
            </div>
            <div>
              <dt>Evidence items</dt>
              <dd>{counts.evidence}</dd>
            </div>
          </dl>
          {!hasNetwork ? <p className={styles.emptyNote}>This scenario has no recorded path network.</p> : null}
        </section>

        <section aria-labelledby="curb-barriers-heading" className={styles.card}>
          <h2 id="curb-barriers-heading" className={styles.sectionHeading}>
            Barriers
          </h2>
          {scenario.barriers.length === 0 ? (
            <p className={styles.emptyNote}>This scenario has no recorded barriers.</p>
          ) : (
            <>
              <p className={styles.hint}>
                Select a barrier to view its evidence. Up and Down arrow keys move between items.
              </p>
              <ul className={styles.barrierList} onKeyDown={handleListKeyDown}>
                {scenario.barriers.map((barrier) => {
                  const selected = barrier.id === selectedId;
                  return (
                    <li key={barrier.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        className={selected ? styles.barrierButtonSelected : styles.barrierButton}
                        onClick={() => onSelect(selected ? null : barrier.id)}
                      >
                        <span className={styles.barrierKind}>{barrierKindLabel(barrier.kind)}</span>
                        <span className={styles.barrierMeta}>{REVIEW_STATUS_LABELS[barrier.reviewStatus]}</span>
                        <span className={styles.barrierMeta}>
                          {describeEdge(edgesById.get(barrier.edgeId), barrier.edgeId, labelFor)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="curb-map-heading" className={styles.card}>
          <h2 id="curb-map-heading" className={styles.sectionHeading}>
            Network schematic
          </h2>
          {hasNetwork || counts.destinations > 0 ? (
            <CurbMap scenario={scenario} selectedBarrierId={selectedId} />
          ) : (
            <p className={styles.emptyNote}>No network to display for this scenario.</p>
          )}
        </section>

        <section aria-labelledby="curb-destinations-heading" className={styles.card}>
          <h2 id="curb-destinations-heading" className={styles.sectionHeading}>
            Destinations
          </h2>
          {scenario.destinations.length === 0 ? (
            <p className={styles.emptyNote}>This scenario has no recorded destinations.</p>
          ) : (
            <ul className={styles.destinationList}>
              {scenario.destinations.map((destination) => {
                const nodeLabel = labelFor(destination.nodeId);
                return (
                  <li key={destination.id}>
                    <span className={styles.destinationLabel}>{destination.label}</span>
                    {nodeLabel !== destination.label ? (
                      <span className={styles.barrierMeta}> · at {nodeLabel}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className={styles.secondary}>
        {detailResult.ok ? (
          <EvidencePanel detail={detailResult.detail} />
        ) : (
          <div role="alert" className={styles.errorBox}>
            <p className={styles.errorMessage}>
              The selected barrier&apos;s evidence could not be resolved because the scenario data is inconsistent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
