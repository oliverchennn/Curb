import type { PlanId, RepairPlan, Survey } from '../../../contracts/curb/survey';
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

export function PlanCompare({ survey, plans, planError, budgetText, budget, sliderMax, selectedFindingId, selectedPlanId, onBudgetText, onSelectPlan }: {
  survey: Survey;
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
    <h2 id="survey-plans-heading"><span className={styles.stepNumber}>2</span> Compare repairs</h2>
    <p className={styles.small}>Plans are recomputed from the reviewed findings. Rejected findings are excluded; pending findings make a plan provisional. Quantities are working assumptions, not site measurements.</p>

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
      {budget.ok ? `Exact cents; never rounded. Slider moves in $100 steps up to ${formatCents(sliderMax)}.` : budget.message}
    </p>

    {budget.ok && budget.cents !== null && budgetPlan && !planError ? <div className={styles.budgetSummary}>
      <p role="status"><strong>Your budget result: </strong>{budgetPlan.workAreaIds.length === 0
        ? (budgetPlan.deferredWorkAreaIds.length ? 'No repair fits the known upper estimates.' : 'No eligible repair work is currently selected.')
        : `${formatCentsRange(budgetPlan.cost.lowCents, budgetPlan.cost.highCents)} for ${budgetPlan.workAreaIds.length} work area${budgetPlan.workAreaIds.length === 1 ? '' : 's'}.`}
        {' '}{budgetPlan.cost.isComplete ? '' : 'Partial estimate; quotes are needed to confirm the full cost.'}
        {' '}{budgetPlan.deferredWorkAreaIds.length} work area{budgetPlan.deferredWorkAreaIds.length === 1 ? '' : 's'} deferred.</p>
      <a href="#plan-budget-heading">See included and deferred work</a>
    </div> : null}

    {planError ? <p role="alert" className={styles.inlineError}>{planError}</p> : <div className={styles.planGrid}>
      {plans.map((plan) => <PlanCard key={plan.id} survey={survey} plan={plan} selected={plan.id === selectedPlanId}
        highlightAreaId={selectedArea?.id ?? null}
        selectedExcluded={selectedFindingId !== null && plan.excludedFindingIds.includes(selectedFindingId)}
        onSelect={() => onSelectPlan(plan.id)} />)}
    </div>}
    <p className={styles.small}>Route impact for every plan: unknown. {survey.routeAssessment.note}</p>
  </section>;
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
      <strong>Not in the total — needs a quote ({cost.unpricedItems.length}):</strong>
      <ul className={styles.plainList}>{cost.unpricedItems.map((item) => <li key={item}>{labelForId(survey, item)}</li>)}</ul>
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
    <dl className={styles.facts}>
      <div><dt>Areas covered</dt><dd>High {coverage.high} · Medium {coverage.medium} · Low {coverage.low} · Unassessed {coverage.unassessed}</dd></div>
      <div><dt>Durability</dt><dd>{plan.durability} total across {plural(treatments.length, 'repair')} (each option rated 0–3)</dd></div>
    </dl>
    {treatments.length === 0 ? <p className={styles.small}>No repairs selected.</p> : <ul className={styles.plainList}>
      {treatments.map((treatment) => <li key={treatment.id} className={treatment.workAreaId === highlightAreaId ? styles.highlightItem : undefined}>
        <strong>{labelForId(survey, treatment.workAreaId)}:</strong> {treatment.label}
        <span className={styles.small}> · {treatment.cost.status === 'quote_required' ? 'quote required' : `${treatment.cost.quantityLow}–${treatment.cost.quantityHigh} ${treatment.cost.unit} (assumed)`}</span>
        <details className={styles.pendingChecks}><summary>Suitability and estimate basis</summary>
          <p className={styles.small}>{treatment.eligibilityNote}</p>
          {treatment.cost.status === 'estimated' ? <>
            <ul className={styles.plainList}>{treatment.cost.assumptions.map(note => <li key={note}>{note}</li>)}</ul>
            <p className={styles.small}>Outside this rate: {treatment.cost.exclusions.join('; ') || 'See the quoted scope.'}</p>
            {treatment.cost.sourceIds.map(id => {const source = survey.sources.find(item => item.id === id); return source ? <p className={styles.small} key={id}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.asOf}. {source.scopeNote}
            </p> : null;})}
          </> : <p className={styles.small}>{treatment.cost.reason}</p>}
        </details>
      </li>)}
    </ul>}
    {plan.deferredWorkAreaIds.length > 0 ? <p className={styles.small}>Deferred: {plan.deferredWorkAreaIds.map((id) => labelForId(survey, id)).join(', ')}</p> : null}
    {plan.excludedFindingIds.length > 0 ? <p className={styles.small}>Excluded (rejected): {plan.excludedFindingIds.map((id) => labelForId(survey, id)).join(', ')}</p> : null}
    {plan.pendingChecks.length > 0 ? <details className={styles.pendingChecks}><summary>Still to check ({plan.pendingChecks.length})</summary>
      <ul className={styles.plainList}>{plan.pendingChecks.map((check) => <li key={check}>{check}</li>)}</ul></details> : null}
    <p className={styles.small}>Route impact: unknown.</p>
    <button type="button" className={selected ? undefined : styles.secondaryButton} aria-pressed={selected} onClick={onSelect}>
      {selected ? 'Selected for report' : 'Use for report'}
    </button>
  </article>;
}
