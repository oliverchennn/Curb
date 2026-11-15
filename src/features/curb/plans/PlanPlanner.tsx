'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { fetchPlan, fetchPlanScenario, PlanFetchError } from '../../../client/curb/fetchPlan';
import type { BarrierDetail } from '../../../contracts/curb';
import { matchesPlanScenario, type PlanComparison, type PlanRequest, type PlanScenario } from '../../../contracts/curb/plans';
import { getBarrierDetail } from '../../../domain/curb';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { centsToInput, formatCents, nodeLabel, parseBudgetInput, repairLabel } from './presentation';
import { PlanResult } from './PlanResult';
import styles from './PlanPlanner.module.css';

type ContextState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; context: PlanScenario };
type AnalysisState =
  | { status: 'idle'; message: string }
  | { status: 'loading'; budgetCents: number }
  | { status: 'error'; message: string; budgetCents: number }
  | { status: 'done'; comparison: PlanComparison };
type PendingRequest = { controller: AbortController; timer: ReturnType<typeof setTimeout> };

const REQUEST_TIMEOUT_MS = 10_000;
const COST_STATUS_LABELS = { assumed: 'Assumed cost', quoted: 'Quoted cost', unknown: 'Unknown cost' } as const;

function errorMessage(error: unknown, action: 'load' | 'compare'): string {
  if (error instanceof PlanFetchError) {
    switch (error.code) {
      case 'STALE_SCENARIO': return 'This example changed on the server. Reload the example, then compare again.';
      case 'SCENARIO_NOT_FOUND': return 'The repair-plan example is unavailable. Try loading it again.';
      case 'INVALID_REQUEST': return 'This budget could not be evaluated. Check the amount, or reload the example.';
      case 'INVALID_RESPONSE': return 'The response could not be read. Please try again.';
      case 'INVALID_SERVER_SCENARIO': return 'The repair-plan example could not be validated. Please try again later.';
    }
  }
  return action === 'load'
    ? 'The repair-plan example could not be loaded. Check your connection and try again.'
    : 'The comparison could not be completed. Check your connection and try again.';
}

export function PlanPlanner() {
  const [state, setState] = useState<ContextState>({ status: 'loading' });
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: 'idle', message: '' });
  const [budgetText, setBudgetText] = useState('');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [evidenceRepairId, setEvidenceRepairId] = useState<string | null>(null);
  const pendingRef = useRef<PendingRequest | null>(null);
  const generationRef = useRef(0);
  const budgetRef = useRef<HTMLInputElement>(null);
  const evidenceHeadingRef = useRef<HTMLHeadingElement>(null);

  // Any new action invalidates the previous request: late responses cannot win.
  const cancelPending = useCallback(() => {
    generationRef.current += 1;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) {
      clearTimeout(pending.timer);
      pending.controller.abort();
    }
  }, []);

  const runComparison = useCallback((context: PlanScenario, budgetCents: number) => {
    cancelPending();
    setAnalysis({ status: 'loading', budgetCents });
    const request: PlanRequest = {
      contractVersion: context.contractVersion,
      scenarioId: context.scenario.id,
      revision: context.scenario.revision,
      profileId: context.profile.id,
      originNodeId: context.originNodeId,
      budgetCents,
    };
    const controller = new AbortController();
    const generation = generationRef.current;
    const isCurrent = () => generation === generationRef.current && !controller.signal.aborted;
    const timer = setTimeout(() => {
      if (!isCurrent()) return;
      cancelPending();
      setAnalysis({ status: 'error', budgetCents, message: 'The comparison took too long. You can try it again.' });
    }, REQUEST_TIMEOUT_MS);
    pendingRef.current = { controller, timer };
    fetchPlan(request, controller.signal).then((comparison) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pendingRef.current = null;
      if (!matchesPlanScenario(comparison, context)) {
        setAnalysis({ status: 'error', budgetCents, message: 'The comparison did not match the loaded example. Reload the example and try again.' });
        return;
      }
      setAnalysis({ status: 'done', comparison });
    }, (error: unknown) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pendingRef.current = null;
      setAnalysis({ status: 'error', budgetCents, message: errorMessage(error, 'compare') });
    });
  }, [cancelPending]);

  const loadContext = useCallback(() => {
    cancelPending();
    setState({ status: 'loading' });
    setAnalysis({ status: 'idle', message: '' });
    setEvidenceRepairId(null);
    setBudgetError(null);
    const controller = new AbortController();
    const generation = generationRef.current;
    const isCurrent = () => generation === generationRef.current && !controller.signal.aborted;
    const timer = setTimeout(() => {
      if (!isCurrent()) return;
      cancelPending();
      setState({ status: 'error', message: 'Loading took too long. You can retry the repair-plan example.' });
    }, REQUEST_TIMEOUT_MS);
    pendingRef.current = { controller, timer };
    fetchPlanScenario(controller.signal).then((context) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pendingRef.current = null;
      setState({ status: 'ready', context });
      setBudgetText(centsToInput(context.defaultBudgetCents));
      runComparison(context, context.defaultBudgetCents);
    }, (error: unknown) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pendingRef.current = null;
      setState({ status: 'error', message: errorMessage(error, 'load') });
    });
  }, [cancelPending, runComparison]);

  useEffect(() => {
    loadContext();
    return cancelPending;
  }, [cancelPending, loadContext]);

  const context = state.status === 'ready' ? state.context : null;

  function changeBudget(text: string) {
    setBudgetText(text);
    setBudgetError(null);
    // A changed budget hides the obsolete comparison immediately.
    cancelPending();
    setAnalysis({ status: 'idle', message: 'Budget changed. Compare to see plans for the new amount.' });
  }

  function compare(event?: FormEvent<HTMLFormElement>, text = budgetText) {
    event?.preventDefault();
    if (!context) return;
    const parsed = parseBudgetInput(text);
    if (!parsed.ok) {
      cancelPending();
      setBudgetError(parsed.message);
      setAnalysis({ status: 'idle', message: 'Fix the budget to compare plans.' });
      budgetRef.current?.focus();
      return;
    }
    setBudgetError(null);
    runComparison(context, parsed.cents);
  }

  function choosePreset(cents: number) {
    const text = centsToInput(cents);
    setBudgetText(text);
    compare(undefined, text);
  }

  function reset() {
    if (!context) return;
    setEvidenceRepairId(null);
    choosePreset(context.defaultBudgetCents);
  }

  function viewEvidence(repairId: string) {
    setEvidenceRepairId(repairId);
    requestAnimationFrame(() => evidenceHeadingRef.current?.focus());
  }

  let detail: BarrierDetail | null = null;
  let evidenceError = false;
  const evidenceRepair = context?.repairs.find((repair) => repair.id === evidenceRepairId);
  if (context && evidenceRepair) {
    try {
      detail = getBarrierDetail(context.scenario, evidenceRepair.barrierId);
    } catch {
      evidenceError = true;
    }
  }

  const presets = context ? [...new Set([0, context.defaultBudgetCents / 2, context.defaultBudgetCents, context.defaultBudgetCents * 2])]
    .filter((cents) => Number.isSafeInteger(cents)) : [];

  return <div className={styles.planner}>
    <nav className={styles.navLinks} aria-label="Curb pages">
      <Link href="/curb">← Campus barrier review</Link>
      <Link href="/curb/trips">One-trip repair comparison</Link>
    </nav>
    <section className={styles.intro} aria-labelledby="plan-heading">
      <p className={styles.eyebrow}>Learning lab · Synthetic network</p>
      <h1 id="plan-heading">Why the combination of repairs matters.</h1>
      <p className={styles.lede}>Explore how the same example budget can open different connections: fix the worst condition first, or choose repairs together to reach more destinations.</p>
      <div className={styles.teachingNote}>
        <strong>These tiny amounts are teaching numbers, not repair prices.</strong>
        <p>The authored $4 and $8 budgets make the algorithm easy to compare. Costs, ratings and route assessments belong to this synthetic network; they cannot estimate a contractor’s work.</p>
        <Link href="/curb/surveys/robertson-hall#survey-plans-heading">Plan real Robertson Hall work <span aria-hidden="true">→</span></Link>
        <p className={styles.small}>Use the actual findings, sourced unit-rate references and quote checklist to develop a repair budget.</p>
      </div>
    </section>

    {state.status === 'loading' ? <section className={styles.card} aria-label="Loading repair-plan example">
      <p role="status">Loading repair-plan example…</p>
      <button type="button" className={styles.secondaryButton} onClick={() => {
        cancelPending();
        setState({ status: 'error', message: 'Loading cancelled. Retry when you are ready.' });
      }}>Cancel loading</button>
    </section> : null}
    {state.status === 'error' ? <section className={styles.error} role="alert">
      <p>{state.message}</p>
      <button type="button" onClick={loadContext}>Retry loading</button>
    </section> : null}

    {context ? <>
      <div className={styles.workspace}>
        <section className={styles.card} aria-labelledby="plan-budget-heading">
          <div className={styles.sectionHeading}>
            <h2 id="plan-budget-heading">Try an example budget</h2>
            <button type="button" className={styles.textButton} onClick={reset}>Reset</button>
          </div>
          <p className={styles.small}>{context.scenario.title} · From {nodeLabel(context, context.originNodeId)} (fixed origin) · {context.profile.label}</p>
          <form onSubmit={compare} noValidate>
            <label htmlFor="plan-budget" className={styles.budgetLabel}>Example budget (illustrative US dollars)
              <span className={styles.budgetInput}>
                <span aria-hidden="true">$</span>
                <input id="plan-budget" ref={budgetRef} inputMode="decimal" autoComplete="off" value={budgetText}
                  aria-invalid={budgetError ? true : undefined}
                  aria-describedby={budgetError ? 'plan-budget-error plan-budget-help' : 'plan-budget-help'}
                  onChange={(event) => changeBudget(event.target.value)} />
              </span>
            </label>
            <p id="plan-budget-help" className={styles.small}>Whole cents only; amounts are never rounded. Default {formatCents(context.defaultBudgetCents)}.</p>
            {budgetError ? <p id="plan-budget-error" className={styles.fieldError}>{budgetError}</p> : null}
            <div className={styles.presets} role="group" aria-label="Example budgets">
              {presets.map((cents) => <button type="button" key={cents} className={styles.secondaryButton}
                onClick={() => choosePreset(cents)}>{formatCents(cents)}</button>)}
            </div>
            <div className={styles.actions}>
              <button type="submit" disabled={analysis.status === 'loading'}>Compare plans</button>
              {analysis.status === 'loading' ? <button type="button" className={styles.secondaryButton} onClick={() => {
                cancelPending();
                setAnalysis({ status: 'idle', message: 'Comparison cancelled. Your budget is ready to compare again.' });
              }}>Cancel comparison</button> : null}
            </div>
          </form>
        </section>

        <section className={styles.profileCard} aria-labelledby="plan-assumptions-heading">
          <h2 id="plan-assumptions-heading">What is being compared</h2>
          <p>{context.profile.description}</p>
          <p>Destinations, each weighted equally: {context.destinationIds.map((id) => context.scenario.destinations.find((item) => item.id === id)?.label ?? id).join(', ')}.</p>
          <details><summary>Planning assumptions ({context.assumptions.length})</summary>
            <ul>{context.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
          </details>
        </section>
      </div>

      <section className={styles.card} aria-labelledby="plan-candidates-heading">
        <h2 id="plan-candidates-heading">The pieces in this teaching example</h2>
        <p className={styles.small}>Authored candidate costs let you inspect the trade-off. A cheap repair can matter only when its companion is also selected. Condition ratings run from 1 (least severe) to 5 (most severe); none of these amounts is a construction quote.</p>
        <ul className={styles.candidateList}>{context.candidates.map((candidate) => <li key={candidate.repairId}>
          <div className={styles.candidateHead}>
            <strong>{repairLabel(context, candidate.repairId)}</strong>
            <span className={candidate.cost.status === 'unknown' ? styles.unknown : styles.costTag}>
              {candidate.cost.status === 'unknown' ? 'Cost unknown · excluded' : `${formatCents(candidate.cost.cents)} · ${COST_STATUS_LABELS[candidate.cost.status]}`}
            </span>
          </div>
          <p className={styles.small}>Condition rating {candidate.severity.score}/5. {candidate.severity.rationale}</p>
          <p className={styles.small}>{COST_STATUS_LABELS[candidate.cost.status]} source: {candidate.cost.source}</p>
          <button type="button" className={styles.linkButton} onClick={() => viewEvidence(candidate.repairId)}
            aria-label={`View evidence for ${repairLabel(context, candidate.repairId)}`}>View evidence</button>
        </li>)}</ul>
      </section>

      <div className={styles.analysisStatus} role="status" aria-live="polite">
        {analysis.status === 'loading' ? `Comparing plans for ${formatCents(analysis.budgetCents)}…` : null}
        {analysis.status === 'idle' ? analysis.message : null}
        {analysis.status === 'done' ? `Comparison ready for ${formatCents(analysis.comparison.budgetCents)}.` : null}
      </div>
      {analysis.status === 'error' ? <div className={styles.error} role="alert">
        <p>{analysis.message}</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => runComparison(context, analysis.budgetCents)}>Try comparison again</button>
          <button type="button" className={styles.secondaryButton} onClick={loadContext}>Reload example</button>
        </div>
      </div> : null}

      {analysis.status === 'done'
        ? <PlanResult context={context} comparison={analysis.comparison} onViewEvidence={viewEvidence} />
        : null}

      <section className={styles.evidenceSection} aria-labelledby="plan-evidence-heading">
        <div>
          <h2 id="plan-evidence-heading" ref={evidenceHeadingRef} tabIndex={-1}>Review the source</h2>
          <p className={styles.small}>Repairs are hypothetical. Comparing plans leaves barrier records, review status and linked evidence unchanged.</p>
          <label htmlFor="plan-evidence-repair">Repair evidence
            <select id="plan-evidence-repair" value={evidenceRepairId ?? ''} onChange={(event) => setEvidenceRepairId(event.target.value || null)}>
              <option value="">Choose a repair</option>
              {context.candidates.map(({ repairId }) => <option key={repairId} value={repairId}>{repairLabel(context, repairId)}</option>)}
            </select>
          </label>
          {evidenceRepair ? <p className={styles.small}>{evidenceRepair.description}</p> : null}
        </div>
        {evidenceError
          ? <p role="alert" className={styles.error}>The linked evidence could not be resolved for this example.</p>
          : <EvidencePanel detail={detail} />}
      </section>
    </> : null}

    <p className={styles.footerNote}>This separate synthetic scenario illustrates repair planning. It is not field observation, navigation guidance, a compliance assessment, a cost estimate or a record of completed work.</p>
  </div>;
}
