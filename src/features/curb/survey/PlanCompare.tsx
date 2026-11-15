import type { PlanId, RepairPlan, Survey } from '../../../contracts/curb/survey';
import { suggestPlan, type MeasurementEntries } from './measurements';
import {
  areaForFinding,
  BUDGET_FIT_LABELS,
  centsToInput,
  formatCents,
  formatCentsRange,
  labelForId,
  type BudgetParse,
} from './presentation';
import styles from './SurveyWorkspace.module.css';

const PLAN_BLURBS: Record<PlanId, string> = {
  essential: 'Near-term areas with the cheapest suitable option.',
  balanced: 'Each eligible area with its recommended option.',
  durable: 'Each eligible area with its most durable option.',
  budget: 'Best fit within your budget using known upper estimates. Unpriced work cannot be optimised.',
};

export function PlanCompare({ survey, plans, planError, budgetText, budget, sliderMax, selectedFindingId, selectedPlanId, onBudgetText, onSelectPlan, measurements, onSelectFinding }: {
  survey: Survey;
  measurements: MeasurementEntries;
  onSelectFinding: (findingId: string) => void;
  plans: RepairPlan[];
  planError: string | null;
  budgetText: string;
  budget: BudgetParse;
  sliderMax: number;
  selectedFindingId: string | null;
  selectedPlanId: PlanId;
  onBudgetText: (text: string) => void;
  onSelectPlan: (planId: PlanId) => void;
}) {
  const selectedArea = selectedFindingId ? areaForFinding(survey, selectedFindingId) : undefined;
  const sliderValue = budget.ok && budget.cents !== null ? Math.min(budget.cents, sliderMax) : 0;
  const budgetPlan = plans.find(plan => plan.id === 'budget');

  return <section className={styles.card} aria-labelledby="survey-plans-heading">
    <h2 id="survey-plans-heading"><span className={styles.stepNumber}>2</span> Repair plan</h2>
    <p className={styles.small}>Set a budget. Curb suggests what to fix first.</p>

    <div className={styles.budgetRow}>
      <label htmlFor="survey-budget" className={styles.budgetLabel}>Budget (US dollars, optional)
        <span className={styles.moneyInput}>
          <span aria-hidden="true">$</span>
          <input id="survey-budget" inputMode="decimal" autoComplete="off" value={budgetText} placeholder="No budget"
            aria-invalid={budget.ok ? undefined : true} aria-describedby="survey-budget-help"
            onChange={(event) => onBudgetText(event.target.value)} />
        </span>
      </label>
      <label htmlFor="survey-budget-slider" className={styles.sliderLabel}>Adjust
        <input id="survey-budget-slider" type="range" min={0} max={sliderMax} step={10_000} value={sliderValue}
          aria-valuetext={budget.ok && budget.cents !== null ? formatCents(budget.cents) : 'No budget'}
          onChange={(event) => onBudgetText(centsToInput(Number(event.target.value)))} />
      </label>
      {budgetText !== '' ? <button type="button" className={styles.textButton} onClick={() => onBudgetText('')}>Clear budget</button> : null}
    </div>
    <p id="survey-budget-help" className={budget.ok ? styles.small : styles.inlineError}>
      {budget.ok ? 'Leave blank to see every repair.' : budget.message}
    </p>

    <SuggestedPlanView survey={survey} measurements={measurements} budgetCents={budget.ok ? budget.cents : null} onSelectFinding={onSelectFinding} />

    <details className={styles.otherPlans}>
    <summary>Other plan options (used for the downloadable report)</summary>
    {budget.ok && budget.cents !== null && budgetPlan && !planError ? <div className={styles.budgetSummary}>
      <p role="status"><strong>Your budget result: </strong>{budgetPlan.workAreaIds.length === 0
        ? (budgetPlan.deferredWorkAreaIds.length ? 'No repair fits the known upper estimates.' : 'No eligible repair work is currently selected.')
        : `${formatCentsRange(budgetPlan.cost.lowCents, budgetPlan.cost.highCents)} for ${budgetPlan.workAreaIds.length} work area${budgetPlan.workAreaIds.length === 1 ? '' : 's'}.`}
        {' '}{budgetPlan.cost.isComplete ? '' : 'Partial estimate; quotes are needed to confirm the full cost.'}
        {' '}{budgetPlan.deferredWorkAreaIds.length} work area{budgetPlan.deferredWorkAreaIds.length === 1 ? '' : 's'} deferred.</p>
    </div> : null}

    {planError ? <p role="alert" className={styles.inlineError}>{planError}</p> : <div className={styles.planGrid}>
      {plans.map((plan) => <PlanCard key={plan.id} survey={survey} plan={plan} selected={plan.id === selectedPlanId}
        highlightAreaId={selectedArea?.id ?? null}
        selectedExcluded={selectedFindingId !== null && plan.excludedFindingIds.includes(selectedFindingId)}
        onSelect={() => onSelectPlan(plan.id)} />)}
    </div>}
    </details>
  </section>;
}

/** "Name (id): reason" -> "Name" for the always-visible quote list. */
function quoteItemName(text: string): string {
  const head = text.split(/:\s/, 1)[0].replace(/\s*\([a-z0-9-]+\)\s*$/i, '').trim();
  return head || text;
}

function plural(count: number, one: string) {
  return `${count} ${one}${count === 1 ? '' : 's'}`;
}

function PlanCard({ survey, plan, selected, highlightAreaId, selectedExcluded, onSelect }: {
  survey: Survey;
  plan: RepairPlan;
  selected: boolean;
  highlightAreaId: string | null;
  selectedExcluded: boolean;
  onSelect: () => void;
}) {
  const { cost, coverage } = plan;
  const treatments = plan.optionIds.map((id) => survey.treatments.find((treatment) => treatment.id === id)).filter((t) => t !== undefined);
  const includesSelected = highlightAreaId !== null && plan.workAreaIds.includes(highlightAreaId);
  return <article className={selected ? styles.planCardSelected : styles.planCard} aria-labelledby={`plan-${plan.id}-heading`}>
    <h3 id={`plan-${plan.id}-heading`}>{plan.title}</h3>
    <p className={styles.small}>{PLAN_BLURBS[plan.id]}</p>
    <p className={styles.planCost}>
      {formatCentsRange(cost.lowCents, cost.highCents)}
      <span>{cost.isComplete ? 'estimated range' : 'partial — known items only'}</span>
    </p>
    {!cost.isComplete ? <div className={styles.quoteNote}>
      {/* Every quote-required item stays listed by name; the longer reason is one disclosure away. */}
      <strong>Not in the total — needs a quote ({cost.unpricedItems.length}):</strong>
      <ul className={styles.plainList}>{cost.unpricedItems.map((item) => <li key={item}>{quoteItemName(labelForId(survey, item))}</li>)}</ul>
      {cost.unpricedItems.some((item) => quoteItemName(labelForId(survey, item)) !== labelForId(survey, item)) ? <details className={styles.pendingChecks}>
        <summary>Why these need a quote</summary>
        <ul className={styles.plainList}>{cost.unpricedItems.map((item) => <li key={item}>{labelForId(survey, item)}</li>)}</ul>
      </details> : null}
    </div> : null}
    {plan.budgetCents !== null ? <p className={styles[`fit_${plan.optionIds.length === 0 ? 'not_set' : plan.budgetFit}`]}>
      {plan.optionIds.length === 0 ? (plan.deferredWorkAreaIds.length ? 'No priced repair fits this budget' : 'No eligible repair areas in this review') : BUDGET_FIT_LABELS[plan.budgetFit]} · {formatCents(plan.budgetCents)}
    </p> : null}
    {highlightAreaId !== null ? <p className={includesSelected ? styles.tagIn : styles.tagOut}>
      {includesSelected
        ? 'Includes the selected evidence’s work area'
        : selectedExcluded
          ? 'Selected finding is rejected and excluded from this plan'
          : plan.deferredWorkAreaIds.includes(highlightAreaId)
            ? 'Defers the selected evidence’s work area'
            : 'Does not include the selected evidence’s work area'}
    </p> : null}
    <button type="button" className={selected ? styles.planSelect : `${styles.secondaryButton} ${styles.planSelect}`} aria-pressed={selected} onClick={onSelect}>
      {selected ? 'Selected for report' : 'Use for report'}
    </button>
    <dl className={styles.planFacts}>
      <div><dt>Areas covered</dt><dd>High {coverage.high} · Medium {coverage.medium} · Low {coverage.low} · Unassessed {coverage.unassessed}</dd></div>
      <div><dt>Durability</dt><dd>{plan.durability} across {plural(treatments.length, 'repair')} (each rated 0–3)</dd></div>
    </dl>
    {plan.deferredWorkAreaIds.length > 0 ? <p className={styles.deferredNote}><strong>Deferred:</strong> {plan.deferredWorkAreaIds.map((id) => labelForId(survey, id)).join(', ')}</p> : null}
    {plan.excludedFindingIds.length > 0 ? <p className={styles.small}>Excluded (rejected): {plan.excludedFindingIds.map((id) => labelForId(survey, id)).join(', ')}</p> : null}
    {treatments.length === 0 ? <p className={styles.small}>No repairs selected.</p> : <details className={styles.pendingChecks}>
      <summary>Repairs in this plan ({treatments.length})</summary>
      <ul className={styles.plainList}>
      {treatments.map((treatment) => <li key={treatment.id} className={treatment.workAreaId === highlightAreaId ? styles.highlightItem : undefined}>
        <strong>{labelForId(survey, treatment.workAreaId)}:</strong> {treatment.label}
        <span className={styles.small}> · {treatment.cost.status === 'quote_required' ? 'quote required' : `${treatment.cost.quantityLow}–${treatment.cost.quantityHigh} ${treatment.cost.unit} (assumed)`}</span>
        <details className={styles.pendingChecks}><summary>Price details</summary>
          <PriceBasis survey={survey} treatment={treatment} />
        </details>
      </li>)}
      </ul>
    </details>}
    {plan.pendingChecks.length > 0 ? <details className={styles.pendingChecks}><summary>Still to check ({plan.pendingChecks.length})</summary>
      <ul className={styles.plainList}>{plan.pendingChecks.map((check) => <li key={check}>{check}</li>)}</ul></details> : null}
  </article>;
}

const PRIORITY_WORDS = { high: 'High', medium: 'Medium', low: 'Low', unassessed: 'Not set' } as const;

function SuggestedPlanView({ survey, measurements, budgetCents, onSelectFinding }: {
  survey: Survey;
  measurements: MeasurementEntries;
  budgetCents: number | null;
  onSelectFinding: (findingId: string) => void;
}) {
  const plan = suggestPlan(survey, measurements, budgetCents);
  const included = plan.steps.filter((step) => step.included);
  const left = plan.steps.filter((step) => !step.included);
  return <section className={styles.suggested} aria-labelledby="survey-suggested-heading">
    <h3 id="survey-suggested-heading">Suggested plan</h3>
    <p className={styles.suggestedTotal} role="status">
      {plan.included === 0 ? 'Nothing fits this budget yet.' : <>{formatCentsRange(plan.lowCents, plan.highCents)} <span>to fix {plan.included} of {plan.steps.length} defects</span></>}
    </p>
    <p className={styles.small}>Ranked by priority: 70% measurements, 30% CLIP-based travel impact.{left.length ? ` ${left.length} left out to stay within budget.` : ''}</p>

    {included.length > 0 ? <details className={styles.collapsible} open>
      <summary>Included work ({included.length})</summary>
      <ol className={styles.stepList}>{included.map((step) => <PlanStepItem key={step.finding.id} step={step} onSelectFinding={onSelectFinding} />)}</ol>
    </details> : null}
    {left.length > 0 ? <details className={styles.collapsible}>
      <summary>Left out for now ({left.length})</summary>
      <ul className={styles.stepList}>{left.map((step) => <PlanStepItem key={step.finding.id} step={step} onSelectFinding={onSelectFinding} />)}</ul>
    </details> : null}
    {plan.sharedQuote.length > 0 ? <p className={styles.small}>Plus a site quote for: {plan.sharedQuote.join(', ').toLowerCase()}.</p> : null}

    <div className={styles.readPrices}>
      <strong>How to read these prices</strong>
      <p>Each price is a low–high range from recent public bids. A contractor quote sets the final cost.</p>
      <details className={styles.pendingChecks}>
        <summary>Price sources</summary>
        <ul className={styles.plainList}>{survey.sources.filter((source) => source.kind === 'cost').map((source) => <li key={source.id}>
          <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.asOf}
        </li>)}</ul>
      </details>
    </div>
  </section>;
}

function PlanStepItem({ step, onSelectFinding }: { step: ReturnType<typeof suggestPlan>['steps'][number]; onSelectFinding: (findingId: string) => void }) {
  return <li className={styles.stepItem}>
    <button type="button" className={styles.textButton} onClick={() => onSelectFinding(step.finding.id)}>{step.finding.label}</button>
    <span className={styles[`priority_${step.score.band}`]}>{PRIORITY_WORDS[step.score.band]} · {step.score.score}</span>
    <span className={styles.stepRepair}>{step.treatment.label} · {formatCentsRange(step.lowCents, step.highCents)}</span>
  </li>;
}

function PriceBasis({ survey, treatment }: { survey: Survey; treatment: Survey['treatments'][number] }) {
  if (treatment.cost.status === 'quote_required') return <p className={styles.small}>Needs a contractor quote.</p>;
  const { rateLowCents, rateHighCents, quantityLow, quantityHigh, unit, sourceIds } = treatment.cost;
  return <>
    <p className={styles.small}>{formatCentsRange(rateLowCents, rateHighCents)} per {unit} × {quantityLow}–{quantityHigh} {unit}s (estimated size).</p>
    <details className={styles.pendingChecks}><summary>Source and date</summary>
      <ul className={styles.plainList}>{sourceIds.map((id) => { const source = survey.sources.find((item) => item.id === id); return source ? <li key={id}>
        <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.asOf}
      </li> : null; })}</ul>
    </details>
  </>;
}
