'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { fetchTrip, fetchTripScenario, TripFetchError } from '../../../client/curb/fetchTrip';
import type { BarrierDetail } from '../../../contracts/curb';
import type { TripEvaluation, TripRequest, TripScenario } from '../../../contracts/curb/trips';
import { getBarrierDetail } from '../../../domain/curb';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { nodeName } from './presentation';
import { TripResult } from './TripResult';
import styles from './TripPlanner.module.css';

type Selection = Pick<TripRequest, 'originNodeId' | 'destinationId' | 'repairId'>;
type ContextState = { status: 'loading' } | { status: 'error'; message: string } | {
  status: 'ready'; context: TripScenario; selection: Selection;
};
type AnalysisState = { status: 'idle'; message?: string } | { status: 'loading' } | {
  status: 'error'; message: string;
} | { status: 'done'; evaluation: TripEvaluation };
type PendingRequest = { controller: AbortController; timer: ReturnType<typeof setTimeout> };
const REQUEST_TIMEOUT_MS = 10_000;

function errorMessage(error: unknown, action: 'load' | 'compare'): string {
  if (error instanceof TripFetchError) {
    switch (error.code) {
      case 'STALE_SCENARIO': return 'This example changed. Reload the example before comparing again.';
      case 'SCENARIO_NOT_FOUND': return 'The trip example is unavailable. Try loading it again.';
      case 'INVALID_REQUEST': return 'These trip choices could not be evaluated. Reload the example and choose again.';
      case 'INVALID_RESPONSE': return 'The response could not be read. Please try again.';
      case 'INVALID_SERVER_SCENARIO': return 'The trip example could not be validated. Please try again later.';
    }
  }
  return action === 'load'
    ? 'The trip example could not be loaded. Check your connection and try again.'
    : 'The comparison could not be completed. Check your connection and try again.';
}

export function TripPlanner() {
  const [state, setState] = useState<ContextState>({ status: 'loading' });
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: 'idle' });
  const [selectedBarrierId, setSelectedBarrierId] = useState<string | null>(null);
  const pendingRef = useRef<PendingRequest | null>(null);
  const generationRef = useRef(0);

  const cancelPending = useCallback(() => {
    generationRef.current += 1;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) {
      clearTimeout(pending.timer);
      pending.controller.abort();
    }
  }, []);

  const loadContext = useCallback(() => {
    cancelPending();
    setState({ status: 'loading' });
    setAnalysis({ status: 'idle' });
    setSelectedBarrierId(null);
    const controller = new AbortController();
    const generation = generationRef.current;
    const isCurrent = () => generation === generationRef.current && !controller.signal.aborted;
    const timer = setTimeout(() => {
      if (!isCurrent()) return;
      cancelPending();
      setState({ status: 'error', message: 'Loading took too long. You can retry the trip example.' });
    }, REQUEST_TIMEOUT_MS);
    pendingRef.current = { controller, timer };
    fetchTripScenario(controller.signal).then((context) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pendingRef.current = null;
      setState({ status: 'ready', context, selection: { ...context.defaults, repairId: null } });
    }, (error: unknown) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pendingRef.current = null;
      setState({ status: 'error', message: errorMessage(error, 'load') });
    });
  }, [cancelPending]);

  useEffect(() => {
    loadContext();
    return cancelPending;
  }, [cancelPending, loadContext]);

  function updateSelection(update: Partial<Selection>) {
    cancelPending();
    setAnalysis({ status: 'idle' });
    setState((current) => current.status === 'ready'
      ? { ...current, selection: { ...current.selection, ...update } } : current);
    if (update.repairId !== undefined && state.status === 'ready') {
      setSelectedBarrierId(state.context.repairs.find((repair) => repair.id === update.repairId)?.barrierId ?? null);
    }
  }

  function reset() {
    cancelPending();
    setAnalysis({ status: 'idle', message: 'Reset to the example trip. No repair selected.' });
    setSelectedBarrierId(null);
    setState((current) => current.status === 'ready'
      ? { ...current, selection: { ...current.context.defaults, repairId: null } } : current);
  }

  function compare(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (state.status !== 'ready') return;
    cancelPending();
    setAnalysis({ status: 'loading' });
    const { context, selection } = state;
    const request: TripRequest = {
      contractVersion: context.contractVersion,
      scenarioId: context.scenario.id,
      revision: context.scenario.revision,
      profileId: context.profile.id,
      ...selection,
    };
    const controller = new AbortController();
    const generation = generationRef.current;
    const isCurrent = () => generation === generationRef.current && !controller.signal.aborted;
    const timer = setTimeout(() => {
      if (!isCurrent()) return;
      cancelPending();
      setAnalysis({ status: 'error', message: 'The comparison took too long. You can try it again.' });
    }, REQUEST_TIMEOUT_MS);
    pendingRef.current = { controller, timer };
    fetchTrip(request, controller.signal).then((evaluation) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pendingRef.current = null;
      setAnalysis({ status: 'done', evaluation });
    }, (error: unknown) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pendingRef.current = null;
      setAnalysis({ status: 'error', message: errorMessage(error, 'compare') });
    });
  }

  let detail: BarrierDetail | null = null;
  let evidenceError = false;
  if (state.status === 'ready' && selectedBarrierId) {
    try {
      detail = getBarrierDetail(state.context.scenario, selectedBarrierId);
    } catch {
      evidenceError = true;
    }
  }

  const context = state.status === 'ready' ? state.context : null;
  const selectedRepair = state.status === 'ready'
    ? state.context.repairs.find((repair) => repair.id === state.selection.repairId) : undefined;

  return <div className={styles.planner}>
    <Link href="/curb" className={styles.backLink}>← Campus barrier review</Link>
    <section className={styles.intro} aria-labelledby="trip-heading">
      <p className={styles.eyebrow}>One trip. One hypothetical repair.</p>
      <h1 id="trip-heading">See what a repair changes.</h1>
      <p className={styles.lede}>Choose a trip, compare the current network with one repair, and inspect the evidence behind the connection.</p>
      <p className={styles.synthetic}>Synthetic example · Authored planning assumptions</p>
    </section>

    {state.status === 'loading' ? <section className={styles.card} aria-label="Loading trip example">
      <p role="status">Loading trip example…</p>
      <button type="button" className={styles.secondaryButton} onClick={() => {
        cancelPending();
        setState({ status: 'error', message: 'Loading cancelled. Retry when you are ready.' });
      }}>Cancel loading</button>
    </section> : null}
    {state.status === 'error' ? <section className={styles.error} role="alert">
      <p>{state.message}</p>
      <button type="button" onClick={loadContext}>Retry loading</button>
    </section> : null}

    {state.status === 'ready' && context ? <>
      <div className={styles.workspace}>
        <section className={styles.card} aria-labelledby="trip-choices-heading">
          <div className={styles.sectionHeading}><h2 id="trip-choices-heading">Choose your trip</h2><button type="button" className={styles.textButton} onClick={reset}>Reset</button></div>
          <p className={styles.small}>{context.scenario.title}</p>
          <form onSubmit={compare}>
            <div className={styles.fields}>
              <label htmlFor="trip-origin">Origin<select id="trip-origin" value={state.selection.originNodeId}
                onChange={(event) => updateSelection({ originNodeId: event.target.value })}>
                {context.scenario.nodes.map((node) => <option key={node.id} value={node.id}>{nodeName(context, node.id)}</option>)}
              </select></label>
              <label htmlFor="trip-destination">Destination<select id="trip-destination" value={state.selection.destinationId}
                onChange={(event) => updateSelection({ destinationId: event.target.value })}>
                {context.scenario.destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.label}</option>)}
              </select></label>
              <label htmlFor="trip-repair" className={styles.repairField}>Hypothetical repair<select id="trip-repair" value={state.selection.repairId ?? ''}
                aria-describedby="trip-repair-note" onChange={(event) => updateSelection({ repairId: event.target.value || null })}>
                <option value="">No repair</option>
                {context.repairs.map((repair) => <option key={repair.id} value={repair.id}>{repair.label}</option>)}
              </select></label>
            </div>
            <p id="trip-repair-note" className={styles.small}>{selectedRepair?.description ?? 'Choose at most one repair to compare, or evaluate the trip as it is.'}</p>
            <div className={styles.actions}>
              <button type="submit" disabled={analysis.status === 'loading'}>Compare trip</button>
              {analysis.status === 'loading' ? <button type="button" className={styles.secondaryButton} onClick={() => {
                cancelPending();
                setAnalysis({ status: 'idle', message: 'Comparison cancelled. Your choices are ready to compare again.' });
              }}>Cancel comparison</button> : null}
            </div>
          </form>
        </section>
        <section className={styles.profileCard} aria-labelledby="trip-profile-heading">
          <h2 id="trip-profile-heading">{context.profile.label}</h2>
          <p>{context.profile.description}</p>
          <details><summary>Planning assumptions ({context.assumptions.length})</summary>
            <ul>{context.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
          </details>
          <p className={styles.small}>Walkway, crossing and entrance assessments are authored independently of evidence review status. Unknown connections stay excluded after a repair.</p>
        </section>
      </div>

      <div className={styles.analysisStatus} role="status" aria-live="polite">
        {analysis.status === 'loading' ? 'Comparing the selected trip…' : null}
        {analysis.status === 'idle' ? analysis.message ?? 'Your trip is ready. Compare to see before and after.' : null}
        {analysis.status === 'done' ? 'Comparison ready for the selected trip.' : null}
      </div>
      {analysis.status === 'error' ? <div className={styles.error} role="alert">
        <p>{analysis.message}</p><div className={styles.actions}>
          <button type="button" onClick={() => compare()}>Try comparison again</button>
          <button type="button" className={styles.secondaryButton} onClick={loadContext}>Reload example</button>
        </div>
      </div> : null}

      {analysis.status === 'done' ? <section aria-labelledby="trip-results-heading" className={styles.results}>
        <div className={styles.comparisonHeader}>
          <div><p className={styles.eyebrow}>Trip comparison</p><h2 id="trip-results-heading">
            {nodeName(context, analysis.evaluation.originNodeId)} → {context.scenario.destinations.find((destination) => destination.id === analysis.evaluation.destinationId)?.label}
          </h2></div>
          <p className={styles.small}>{selectedRepair ? selectedRepair.label : 'No repair selected; both results use the current network.'}</p>
        </div>
        <div className={styles.resultGrid}>
          <TripResult context={context} result={analysis.evaluation.before} repairId={null} title="Before repair" onSelectBarrier={setSelectedBarrierId} />
          <TripResult context={context} result={analysis.evaluation.after} repairId={analysis.evaluation.repairId}
            title={analysis.evaluation.repairId ? 'After hypothetical repair' : 'Without a repair'} onSelectBarrier={setSelectedBarrierId} />
        </div>
      </section> : null}

      <section className={styles.evidenceSection} aria-labelledby="trip-evidence-heading">
        <div className={styles.evidenceIntro}><h2 id="trip-evidence-heading">Review the source</h2>
          <p className={styles.small}>The comparison leaves barrier records and linked evidence unchanged.</p>
          <label htmlFor="trip-evidence-barrier">Barrier evidence<select id="trip-evidence-barrier" value={selectedBarrierId ?? ''}
            onChange={(event) => setSelectedBarrierId(event.target.value || null)}>
            <option value="">Choose a barrier</option>
            {context.scenario.barriers.map((barrier) => <option key={barrier.id} value={barrier.id}>
              {context.repairs.find((repair) => repair.barrierId === barrier.id)?.label || barrier.note || barrier.id}
            </option>)}
          </select></label>
        </div>
        {evidenceError ? <p role="alert" className={styles.error}>The linked evidence could not be resolved for this example.</p> : <EvidencePanel detail={detail} />}
      </section>
    </> : null}
    <p className={styles.footerNote}>This separate synthetic scenario illustrates repair planning. It is not field observation, navigation guidance, or a record of completed work.</p>
  </div>;
}
