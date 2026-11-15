'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { fetchPlan, fetchPlanScenario, PlanFetchError } from '../../../client/curb/fetchPlan';
import { matchesPlanScenario, type PlanComparison, type PlanScenario } from '../../../contracts/curb/plans';
import { centsToInput, destinationLabel, listNames, parseBudgetInput } from '../plans/presentation';
import { InvestmentDiagram } from './InvestmentDiagram';
import { InvestmentComparison, InvestmentSummary } from './InvestmentSummary';
import { money, projectInvestment, shortRepairLabel, type InvestmentMode } from './presentation';
import styles from './InvestmentDemo.module.css';

const SCENARIO_ID = 'synthetic-campus-investment';
const DEFAULT_BUDGET_CENTS = 1_000_000;
const PRESETS = [0, 500_000, 1_000_000, 1_500_000, 2_000_000];
const REQUEST_TIMEOUT_MS = 10_000;
const MODES: { value: InvestmentMode; label: string }[] = [
  { value: 'before', label: 'Before repairs' },
  { value: 'conditionFirst', label: 'Condition-first' },
  { value: 'exact', label: 'Curb recommendation' },
];

type ScenarioState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; scenario: PlanScenario };
type ComparisonState =
  | { status: 'idle'; message: string }
  | { status: 'loading'; budgetCents: number }
  | { status: 'error'; message: string; budgetCents: number; reload: boolean }
  | { status: 'done'; comparison: PlanComparison };
type PendingRequest = { controller: AbortController; timer: ReturnType<typeof setTimeout> };

function requestError(error: unknown, loadingScenario = false): string {
  if (error instanceof PlanFetchError) {
    switch (error.code) {
      case 'STALE_SCENARIO': return 'The scenario has changed. Reload its current revision and compare again.';
      case 'SCENARIO_NOT_FOUND': return 'This investment scenario is unavailable. Please retry.';
      case 'INVALID_REQUEST': return 'This budget could not be evaluated. Check the amount and try again.';
      case 'INVALID_RESPONSE': return 'The server returned an unreadable or mismatched result. Please retry.';
      case 'INVALID_SERVER_SCENARIO': return 'The scenario could not be validated. Please retry later.';
    }
  }
  return loadingScenario
    ? 'The investment scenario could not be loaded. Check your connection and retry.'
    : 'The comparison could not be completed. Check your connection and retry.';
}

export function InvestmentDemo() {
  const [scenarioState, setScenarioState] = useState<ScenarioState>({ status: 'loading' });
  const [analysis, setAnalysis] = useState<ComparisonState>({ status: 'idle', message: '' });
  const [budgetText, setBudgetText] = useState('10000');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [mode, setMode] = useState<InvestmentMode>('before');
  const [omittedRepairId, setOmittedRepairId] = useState<string | null>(null);
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const pending = useRef<PendingRequest | null>(null);
  const generation = useRef(0);
  const budgetInput = useRef<HTMLInputElement>(null);

  const cancelPending = useCallback(() => {
    generation.current += 1;
    const current = pending.current;
    pending.current = null;
    if (current) {
      clearTimeout(current.timer);
      current.controller.abort();
    }
  }, []);

  const runComparison = useCallback((scenario: PlanScenario, budgetCents: number) => {
    cancelPending();
    setOmittedRepairId(null);
    setSelectedRepairId(null);
    setAnalysis({ status: 'loading', budgetCents });
    const controller = new AbortController();
    const requestGeneration = generation.current;
    const isCurrent = () => generation.current === requestGeneration && !controller.signal.aborted;
    const timer = setTimeout(() => {
      if (!isCurrent()) return;
      cancelPending();
      setAnalysis({ status: 'error', budgetCents, reload: false, message: 'The comparison took too long. Retry when you are ready.' });
    }, REQUEST_TIMEOUT_MS);
    pending.current = { controller, timer };
    void fetchPlan({
      contractVersion: scenario.contractVersion,
      scenarioId: scenario.scenario.id,
      revision: scenario.scenario.revision,
      profileId: scenario.profile.id,
      originNodeId: scenario.originNodeId,
      budgetCents,
    }, controller.signal).then((comparison) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pending.current = null;
      if (!matchesPlanScenario(comparison, scenario)) {
        setAnalysis({ status: 'error', budgetCents, reload: true, message: 'The result does not match this scenario. Reload the scenario and retry.' });
        return;
      }
      setAnalysis({ status: 'done', comparison });
    }, (error: unknown) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pending.current = null;
      setAnalysis({
        status: 'error', budgetCents, message: requestError(error),
        reload: error instanceof PlanFetchError && error.code === 'STALE_SCENARIO',
      });
    });
  }, [cancelPending]);

  const loadScenario = useCallback((budgetCents = DEFAULT_BUDGET_CENTS) => {
    cancelPending();
    setScenarioState({ status: 'loading' });
    setAnalysis({ status: 'idle', message: '' });
    setBudgetText(centsToInput(budgetCents));
    setBudgetError(null);
    setMode('before');
    setOmittedRepairId(null);
    setSelectedRepairId(null);
    const controller = new AbortController();
    const requestGeneration = generation.current;
    const isCurrent = () => generation.current === requestGeneration && !controller.signal.aborted;
    const timer = setTimeout(() => {
      if (!isCurrent()) return;
      cancelPending();
      setScenarioState({ status: 'error', message: 'Loading the scenario took too long. Please retry.' });
    }, REQUEST_TIMEOUT_MS);
    pending.current = { controller, timer };
    void fetchPlanScenario(controller.signal, SCENARIO_ID).then((scenario) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pending.current = null;
      setScenarioState({ status: 'ready', scenario });
      runComparison(scenario, budgetCents);
    }, (error: unknown) => {
      if (!isCurrent()) return;
      clearTimeout(timer);
      pending.current = null;
      setScenarioState({ status: 'error', message: requestError(error, true) });
    });
  }, [cancelPending, runComparison]);

  useEffect(() => {
    loadScenario();
    return cancelPending;
  }, [loadScenario, cancelPending]);

  const scenario = scenarioState.status === 'ready' ? scenarioState.scenario : null;
  const comparison = analysis.status === 'done' ? analysis.comparison : null;
  const projection = comparison ? projectInvestment(comparison, mode, omittedRepairId) : null;
  const selectedRepair = scenario?.repairs.find(({ id }) => id === selectedRepairId);
  const selectedCandidate = scenario?.candidates.find(({ repairId }) => repairId === selectedRepairId);
  const singleton = comparison?.singleRepairs.find(({ repairId }) => repairId === selectedRepairId);
  const enteredBudget = parseBudgetInput(budgetText);

  function changeBudget(text: string) {
    cancelPending();
    setBudgetText(text);
    setBudgetError(null);
    setOmittedRepairId(null);
    setSelectedRepairId(null);
    setAnalysis({ status: 'idle', message: 'Budget changed. Select Compare plans to see the new result.' });
  }

  function compare(event?: FormEvent<HTMLFormElement>, text = budgetText) {
    event?.preventDefault();
    if (!scenario) return;
    const parsed = parseBudgetInput(text);
    if (!parsed.ok) {
      cancelPending();
      setBudgetError(parsed.message);
      setOmittedRepairId(null);
      setSelectedRepairId(null);
      setAnalysis({ status: 'idle', message: 'Check the budget before comparing.' });
      budgetInput.current?.focus();
      return;
    }
    setBudgetError(null);
    runComparison(scenario, parsed.cents);
  }

  function preset(cents: number) {
    const text = centsToInput(cents);
    setBudgetText(text);
    compare(undefined, text);
  }

  function chooseMode(nextMode: InvestmentMode) {
    setMode(nextMode);
    setOmittedRepairId(null);
  }

  return <div className={styles.demo} data-investment-demo>
    <section className={styles.hero} aria-labelledby="investment-heading">
      <div>
        <p className={styles.eyebrow}>Campus investment lab</p>
        <h1 id="investment-heading">Which repairs should we fund?</h1>
        <p>One budget. Connected repairs. Compare the destinations each plan opens.</p>
        <p className={styles.disclosure}>Synthetic scenario · assumed costs and route conditions</p>
      </div>
      <div className={styles.heroActions}>
        <Link className={styles.textLink} href="/curb/surveys/robertson-hall">View Robertson evidence <span aria-hidden="true">↗</span></Link>
        <button className={styles.resetButton} type="button" onClick={() => loadScenario()}>Reset scenario</button>
      </div>
    </section>

    <div className={styles.workspace}>
      <section className={styles.controls} aria-labelledby="investment-budget-heading">
        <form className={styles.budgetForm} onSubmit={compare} noValidate>
          <label className={styles.budgetLabel} htmlFor="investment-budget" id="investment-budget-heading">Repair budget <span>USD</span></label>
          <div className={styles.budgetInput}>
            <span aria-hidden="true">$</span>
            <input id="investment-budget" ref={budgetInput} value={budgetText} inputMode="decimal" autoComplete="off"
              disabled={!scenario} aria-invalid={budgetError ? true : undefined}
              aria-describedby={`investment-budget-help${budgetError ? ' investment-budget-error' : ''}`}
              onChange={(event) => changeBudget(event.target.value)} />
          </div>
          <button className={styles.primaryButton} type="submit" disabled={!scenario || analysis.status === 'loading'}>Compare plans</button>
          <div className={styles.presets} role="group" aria-label="Budget presets">
            {PRESETS.map((cents) => <button key={cents} type="button" className={styles.presetButton} disabled={!scenario}
              aria-pressed={enteredBudget.ok && enteredBudget.cents === cents} onClick={() => preset(cents)}>{money(cents)}</button>)}
          </div>
          <p id="investment-budget-help">Assumed complete repair costs. Enter at most two decimal places; then compare.</p>
          {budgetError ? <p id="investment-budget-error" className={styles.error} role="alert">{budgetError}</p> : null}
        </form>
      </section>

      {scenario ? <section className={styles.mapPanel} aria-labelledby="investment-map-heading">
        <div className={styles.mapHeader}>
          <div><p className={styles.eyebrow}>The campus network</p><h2 id="investment-map-heading">Connected repairs, shared access</h2></div>
          <span>Schematic · not to scale</span>
        </div>
        <div className={styles.mapControls} role="group" aria-label="Map strategy">
          {MODES.map(({ value, label }) => <button className={styles.strategyButton} key={value} type="button"
            aria-pressed={mode === value && !omittedRepairId} disabled={!comparison && value !== 'before'}
            onClick={() => chooseMode(value)}>{label}</button>)}
        </div>
        <InvestmentDiagram scenario={scenario} projection={projection} selectedRepairId={selectedRepairId} onSelectRepair={setSelectedRepairId} />
        {projection ? <p className={styles.mapStatus} role="status">
          <strong>{projection.title}</strong> · {projection.restoredDestinationIds.length} newly reachable {projection.restoredDestinationIds.length === 1 ? 'destination' : 'destinations'}
          {mode !== 'before' ? ` · ${money(projection.spendCents)} assumed spend` : ''}
          {projection.restoredDestinationIds.length ? ` · ${listNames(projection.restoredDestinationIds.map((id) => destinationLabel(scenario, id)))}` : ''}
        </p> : <p className={styles.mapStatus}>Coverage appears after a completed comparison. No route result is being shown.</p>}

        {comparison && comparison.exact.selectedRepairIds.length ? <section className={styles.omissionPanel} aria-labelledby="investment-test-heading">
          <h3 id="investment-test-heading">Test this combination</h3>
          <p>Remove one repair from the recommendation. This previews the remaining set; it does not reoptimize.</p>
          <div className={styles.omissionControls}>
            {comparison.exact.withoutRepair.filter(({ repairId }) => comparison.exact.selectedRepairIds.includes(repairId)).map(({ repairId }) =>
              <button type="button" className={styles.secondaryButton} key={repairId} aria-pressed={omittedRepairId === repairId}
                onClick={() => { setMode('exact'); setOmittedRepairId(repairId); setSelectedRepairId(null); }}>Omit {shortRepairLabel(repairId)}</button>)}
            <button type="button" className={styles.secondaryButton} disabled={!omittedRepairId} onClick={() => chooseMode('exact')}>Restore recommendation</button>
          </div>
          {omittedRepairId && projection ? <p><strong>{projection.title}:</strong> remaining repairs {projection.selectedRepairIds.map(shortRepairLabel).join(' + ') || 'none'}; {money(projection.spendCents)} assumed spend. The recommendation card and printable plan remain unchanged.</p> : null}
        </section> : null}

        {selectedRepair && selectedCandidate ? <section className={styles.selectedRepair} aria-labelledby="investment-repair-heading">
          <h3 id="investment-repair-heading">{selectedRepair.label}</h3>
          <p>{selectedRepair.description}</p>
          <p><strong>{selectedCandidate.cost.status === 'unknown' ? 'Cost unknown' : `${money(selectedCandidate.cost.cents)} assumed cost`}</strong> · Authored condition {selectedCandidate.severity.score}/5</p>
          <p>{selectedCandidate.severity.rationale}</p>
          <p>Cost source: {selectedCandidate.cost.source}</p>
          {singleton ? <p><strong>{shortRepairLabel(singleton.repairId)} alone:</strong> {singleton.restoredDestinationIds.length} newly reachable destinations{singleton.restoredDestinationIds.length ? ` — ${listNames(singleton.restoredDestinationIds.map((id) => destinationLabel(scenario, id)))}` : ''}. This is the server’s evaluated single-repair outcome.</p> : null}
          <button type="button" className={styles.secondaryButton} onClick={() => {
            document.getElementById(`investment-repair-${selectedRepairId}`)?.focus();
            setSelectedRepairId(null);
          }}>Close repair details</button>
        </section> : null}
      </section> : null}

      {scenario && comparison ? <InvestmentComparison scenario={scenario} comparison={comparison} /> : <section className={styles.comparisonPanel} aria-label="Comparison status">
        <div className={styles.notice} role="status" aria-live="polite">
          {scenarioState.status === 'loading' ? 'Loading the synthetic campus scenario…' : null}
          {analysis.status === 'loading' ? `Comparing plans for submitted budget ${money(analysis.budgetCents)}…` : null}
          {analysis.status === 'idle' ? analysis.message : null}
        </div>
        {scenarioState.status === 'error' ? <div className={styles.error} role="alert"><p>{scenarioState.message}</p><button className={styles.primaryButton} type="button" onClick={() => loadScenario()}>Retry loading scenario</button></div> : null}
        {analysis.status === 'error' && scenario ? <div className={styles.error} role="alert">
          <p>{analysis.message}</p>
          <button className={styles.primaryButton} type="button" onClick={() => analysis.reload ? loadScenario(analysis.budgetCents) : runComparison(scenario, analysis.budgetCents)}>Retry comparison</button>
        </div> : null}
      </section>}
    </div>

    {scenario ? <details className={styles.assumptions}>
      <summary>How this model works · assumptions and limits</summary>
      <p>Each newly reachable destination counts once and equally. Cafe is baseline access and is excluded from new benefits. Condition-first is an authored comparison rule, not a claim about campus practice.</p>
      <p>The recommendation maximizes newly reachable destinations, then prefers lower spend, fewer repairs, and stable repair IDs. Partial progress and hazard reduction are outside this objective.</p>
      <ul>{scenario.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
      <p>Robertson footage is a separate real evidence example. It does not establish the route conditions or modeled gains in this synthetic network.</p>
    </details> : null}

    <div className={styles.briefHeader}>
      <div><p className={styles.eyebrow}>The decision brief</p><p>Print exports the canonical Curb recommendation, including while an omission is displayed.</p></div>
      <button type="button" className={styles.printButton} disabled={!comparison} onClick={() => { if (comparison) window.print(); }}>Print recommended plan</button>
    </div>
    {scenario && comparison ? <InvestmentSummary scenario={scenario} comparison={comparison} /> : <p className={styles.notice}>Recommended investment is available after a fresh comparison.</p>}
  </div>;
}
