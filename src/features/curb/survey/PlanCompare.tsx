import type { Cost, PlanId, RepairPlan, Survey, Treatment } from '../../../contracts/curb/survey';
import { areaForFinding, centsToInput, formatCents, formatCentsRange, labelForId, type BudgetParse } from './presentation';
import { costRange } from './services';
import styles from './PlanCompare.module.css';

const POLICY: Record<PlanId, { name: string; purpose: string }> = {
  essential: { name: 'Essential', purpose: 'Start with near-term work and the lowest priced options. Confirm treatment suitability on site before proceeding.' },
  balanced: { name: 'Balanced', purpose: 'Address every eligible area with its recommended treatment, including repairs that need quotes.' },
  durable: { name: 'Durable', purpose: 'Address every eligible area with its most durable suitable option. Confirm the renewal scope on site.' },
  budget: { name: 'Budget scenario', purpose: 'Prioritize areas within the priced upper bound, then durability. Unpriced treatments cannot be selected by this comparison.' },
};
const METHODS = { inspect: 'Inspection', seal: 'Sealing', patch: 'Local repair', replace: 'Panel renewal' };
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
const names = (survey: Survey, ids: string[]) => ids.map(id => labelForId(survey, id)).join(', ');
const treatmentsFor = (survey: Survey, plan: RepairPlan) => plan.optionIds.flatMap(id => {
  const treatment = survey.treatments.find(item => item.id === id);
  return treatment ? [treatment] : [];
});

export function PlanCompare({ survey, plans, planError, budgetText, budget, sliderMax, selectedFindingId, selectedPlanId, onBudgetText, onSelectPlan }: {
  survey: Survey; plans: RepairPlan[]; planError: string | null; budgetText: string; budget: BudgetParse;
  sliderMax: number; selectedFindingId: string | null; selectedPlanId: PlanId;
  onBudgetText: (text: string) => void; onSelectPlan: (planId: PlanId) => void;
}) {
  const selectedArea = selectedFindingId ? areaForFinding(survey, selectedFindingId) : undefined;
  const selected = plans.find(plan => plan.id === selectedPlanId);
  const budgetPlan = plans.find(plan => plan.id === 'budget');
  const balanced = plans.find(plan => plan.id === 'balanced');
  const essential = plans.find(plan => plan.id === 'essential');
  const unpricedBalanced = balanced ? treatmentsFor(survey, balanced).filter(t => t.cost.status === 'quote_required').length : 0;
  const sliderValue = budget.ok && budget.cents !== null ? Math.min(budget.cents, sliderMax) : 0;
  const pending = survey.findings.filter(f => f.review.status === 'pending').length;

  return <section className={styles.planner} aria-labelledby="survey-plans-heading">
    <header className={styles.intro}>
      <p className={styles.eyebrow}>Robertson Hall · Repair planning</p>
      <h2 id="survey-plans-heading">What work should we fund?</h2>
      <p>Choose a scope, understand the missing costs, then build a budget with facilities and a contractor.</p>
      <p className={styles.reviewNote}>{pending ? `${plural(pending, 'finding')} pending review — these plans are provisional. ` : ''}Rejected findings are excluded. Site measurements and treatment suitability still need confirmation.</p>
    </header>
    <div className={styles.sectionHeading}><span aria-hidden="true">1</span><h3>Choose the work</h3></div>
    {planError ? <p role="alert" className={styles.error}>{planError}</p> : <>
      <div className={styles.policyGrid}>
        {plans.filter(plan => plan.id !== 'budget').map(plan => <PolicyCard key={plan.id} survey={survey} plan={plan}
          selected={plan.id === selectedPlanId} onSelect={() => onSelectPlan(plan.id)} />)}
      </div>
      <p className={styles.comparisonNote}><strong>Compare scope before price.</strong>{' '}
        {balanced && essential && unpricedBalanced > 0 && balanced.cost.highCents < essential.cost.highCents
          ? `Balanced includes ${plural(unpricedBalanced, 'unpriced treatment')}. Its lower priced subtotal does not mean the whole project is cheaper. `
          : 'Each subtotal covers only the work that has a price. '}
        Partial subtotals cannot rank the full cost of these plans.</p>
    </>}

    <section className={styles.budgetSection} aria-labelledby="optional-budget-heading">
      <div className={styles.sectionHeading}><span aria-hidden="true">2</span><h3 id="optional-budget-heading">Have a budget in mind? <small>Optional</small></h3></div>
      <p className={styles.small}>Leave this empty to develop a scope first. An amount adds a fourth scenario using priced work; quotes may put the full project over that amount.</p>
      <div className={styles.budgetRow}>
        <label htmlFor="survey-budget">Budget (US dollars)
          <span className={styles.moneyInput}><span aria-hidden="true">$</span>
            <input id="survey-budget" inputMode="decimal" autoComplete="off" value={budgetText} placeholder="No budget yet"
              aria-invalid={budget.ok ? undefined : true} aria-describedby="survey-budget-help"
              onChange={event => onBudgetText(event.target.value)} />
          </span>
        </label>
        <label htmlFor="survey-budget-slider">Adjust amount
          <input id="survey-budget-slider" type="range" min={0} max={sliderMax} step={10_000} value={sliderValue}
            aria-valuetext={budget.ok && budget.cents !== null ? formatCents(budget.cents) : 'No budget'}
            onChange={event => onBudgetText(centsToInput(Number(event.target.value)))} />
        </label>
        {budgetText !== '' ? <button type="button" className={styles.secondaryButton} onClick={() => onBudgetText('')}>Clear budget</button> : null}
      </div>
      <p id="survey-budget-help" className={budget.ok ? styles.small : styles.error}>
        {budget.ok ? `Type exact dollars and cents. The slider moves in $100 steps, up to ${formatCents(sliderMax)}.` : budget.message}
      </p>
      <div role="status" aria-live="polite" aria-atomic="true" className={styles.budgetStatus}>
        {budget.ok && budget.cents !== null && budgetPlan && !planError ? <>
          <strong>{budgetPlan.optionIds.length ? `${plural(budgetPlan.workAreaIds.length, 'area')} in the ${formatCents(budget.cents)} scenario` : 'No repair work selected for this amount'}</strong>
          <p>{budgetPlan.optionIds.length
            ? `Priced upper bound: ${formatCents(budgetPlan.cost.highCents)}. ${budgetPlan.cost.isComplete ? 'The selected priced scope fits this amount.' : 'Full budget fit is unconfirmed until the missing costs are quoted.'}`
            : budgetPlan.deferredWorkAreaIds.length ? 'No eligible repair fits the known upper estimates. This does not make the deferred work free.' : 'There are no eligible repairs in this review.'}</p>
          {selectedPlanId !== 'budget' ? <p>This is a preview. Choose Budget scenario below to use it in the report.</p> : null}
          {budgetPlan.workAreaIds.length ? <p><strong>Proposed work:</strong> {names(survey, budgetPlan.workAreaIds)}.</p> : null}
          <p><strong>Deferred:</strong> {budgetPlan.deferredWorkAreaIds.length ? names(survey, budgetPlan.deferredWorkAreaIds) : 'No eligible areas deferred'}.</p>
          {budgetPlan.cost.unpricedItems.length ? <p><strong>Not yet priced:</strong> {budgetPlan.cost.unpricedItems.map(item => item.replace(/\s\([a-z0-9-]+\):[\s\S]*$/, '')).join('; ')}.</p> : null}
        </> : null}
      </div>
      {budget.ok && budget.cents !== null && budgetPlan && !planError ? <PolicyCard survey={survey} plan={budgetPlan}
        selected={selectedPlanId === 'budget'} onSelect={() => onSelectPlan('budget')} /> : null}
    </section>

    {selected && !planError ? <PlanBreakdown survey={survey} plan={selected} highlightAreaId={selectedArea?.id ?? null} selectedFindingId={selectedFindingId} /> : null}
    <p className={styles.routeNote}><strong>Route impact: unknown.</strong> {survey.routeAssessment.note}</p>
  </section>;
}

function Price({ survey, plan }: { survey: Survey; plan: RepairPlan }) {
  const hasWork = plan.optionIds.length > 0;
  const hasPricedWork = hasWork && [...treatmentsFor(survey, plan), ...survey.sharedCosts].some(item => item.cost.status === 'estimated');
  return <div className={styles.price}>
    <strong>{!hasWork ? 'No work selected' : plan.cost.isComplete ? 'Full selected-scope estimate' : 'Full project cost: quote needed'}</strong>
    {hasWork ? <><span>Priced work subtotal</span><b>{hasPricedWork ? formatCentsRange(plan.cost.lowCents, plan.cost.highCents) : 'Not yet priced'}</b></> : null}
  </div>;
}

function PolicyCard({ survey, plan, selected, onSelect }: { survey: Survey; plan: RepairPlan; selected: boolean; onSelect: () => void }) {
  const treatments = treatmentsFor(survey, plan);
  const mix = (Object.keys(METHODS) as Treatment['method'][]).flatMap(method => {
    const count = treatments.filter(t => t.method === method).length;
    return count ? [`${count} ${METHODS[method].toLowerCase()}`] : [];
  });
  return <article className={`${styles.policyCard} ${selected ? styles.selected : ''}`} aria-labelledby={`plan-${plan.id}-heading`}>
    <div className={styles.policyTop}>
      <div><h4 id={`plan-${plan.id}-heading`}>{POLICY[plan.id].name}</h4><p>{POLICY[plan.id].purpose}</p></div>
      <Price survey={survey} plan={plan} />
    </div>
    <p className={styles.scopeLine}><strong>{plural(plan.workAreaIds.length, 'area')} included</strong>{mix.length ? ` · ${mix.join(' · ')}` : ''}</p>
    <div className={styles.policyBottom}>
      <p>{plan.deferredWorkAreaIds.length ? `${plural(plan.deferredWorkAreaIds.length, 'area')} deferred` : 'No eligible areas deferred'}</p>
      <button type="button" aria-pressed={selected} aria-label={`${selected ? 'Selected' : 'Select'} ${POLICY[plan.id].name} for report`} onClick={onSelect}>
        {selected ? '✓ Selected for report' : `Choose ${POLICY[plan.id].name}`}
      </button>
    </div>
  </article>;
}

function Estimate({ cost }: { cost: Cost }) {
  const range = costRange(cost);
  if (cost.status === 'quote_required' || !range) return <><strong className={styles.quote}>Quote needed</strong><p>{cost.status === 'quote_required' ? cost.reason : 'Price unavailable.'}</p></>;
  return <><strong>{formatCentsRange(range.lowCents, range.highCents)}</strong>
    <p>{formatCentsRange(cost.rateLowCents, cost.rateHighCents)} / {cost.unit}</p>
    <p>× {cost.quantityLow === cost.quantityHigh ? cost.quantityLow : `${cost.quantityLow}–${cost.quantityHigh}`} {cost.quantityHigh === 1 ? cost.unit : cost.unit === 'linear foot' ? 'linear feet' : `${cost.unit}s`} <em>(assumed)</em></p>
  </>;
}

function PlanBreakdown({ survey, plan, highlightAreaId, selectedFindingId }: { survey: Survey; plan: RepairPlan; highlightAreaId: string | null; selectedFindingId: string | null }) {
  const treatments = treatmentsFor(survey, plan);
  const items = [...treatments, ...(treatments.length ? survey.sharedCosts : [])];
  const estimates = items.flatMap(item => item.cost.status === 'estimated' ? [item.cost] : []);
  const sourceIds = new Set(estimates.flatMap(cost => cost.sourceIds));
  const exclusions = [...new Set(estimates.flatMap(cost => cost.exclusions))];
  const suitability = [...new Map(treatments.map(t => [t.eligibilityNote, t])).values()];
  const deferred = survey.workAreas.filter(area => plan.deferredWorkAreaIds.includes(area.id));
  return <section className={styles.breakdown} aria-labelledby="selected-plan-heading" data-plan-id={plan.id}>
    <div className={styles.sectionHeading}><span aria-hidden="true">3</span><h3 id="selected-plan-heading">{plan.title} · selected for report</h3></div>
    <p className={styles.small}>This scope and the current review decisions carry into Export report. Changing a policy does not change the findings.</p>
    {highlightAreaId ? <p className={styles.evidenceNote}>{plan.workAreaIds.includes(highlightAreaId)
      ? `${labelForId(survey, highlightAreaId)} from the selected evidence is included.`
      : selectedFindingId && plan.excludedFindingIds.includes(selectedFindingId)
        ? 'The selected finding is rejected and excluded from this plan.'
        : `${labelForId(survey, highlightAreaId)} from the selected evidence is not included.`}</p> : null}
    <Price survey={survey} plan={plan} />
    {treatments.length ? <table className={styles.breakdownTable}>
      <caption>Included work and its pricing basis</caption>
      <thead><tr><th scope="col">Included work</th><th scope="col">Priced portion</th></tr></thead>
      <tbody>{treatments.map(t => <tr key={t.id} className={t.workAreaId === highlightAreaId ? styles.highlightRow : undefined}>
        <th scope="row"><strong>{labelForId(survey, t.workAreaId)}</strong><p>{t.label}</p>
          <span className={styles.method}>{METHODS[t.method]} · durability {t.durability}/3</span></th>
        <td><Estimate cost={t.cost} /></td>
      </tr>)}
      {survey.sharedCosts.map(item => <tr key={item.id} className={styles.sharedRow}>
        <th scope="row"><strong>Shared job cost · once per project</strong><p>{item.label}</p></th>
        <td><Estimate cost={item.cost} /></td>
      </tr>)}</tbody>
    </table> : <p className={styles.empty}>There is no selected repair scope to price. Review the deferred areas below.</p>}

    <section className={styles.deferred} aria-labelledby="deferred-needs-heading">
      <h4 id="deferred-needs-heading">Deferred needs · {plural(deferred.length, 'area')}</h4>
      {deferred.length ? <ul>{deferred.map(area => <li key={area.id}><strong>{area.label} · {area.priority} priority</strong>
        <p>{area.findingIds.filter(id => !plan.excludedFindingIds.includes(id)).map(id => labelForId(survey, id)).join('; ')}</p>
        <p>{plan.id === 'essential' && !area.nearTerm ? 'Outside the near-term scope.' : plan.id === 'budget' ? 'Not selected within the priced upper bound.' : 'No repair treatment selected by this policy.'} Access needs remain unresolved.</p>
      </li>)}</ul> : <p>All eligible areas have a proposed treatment. Their effect on accessibility still needs site verification.</p>}
      {plan.excludedFindingIds.length ? <p><strong>Rejected and excluded:</strong> {names(survey, plan.excludedFindingIds)}.</p> : null}
    </section>

    <section className={styles.estimateGuide} aria-labelledby="estimate-guide-heading">
      <h4 id="estimate-guide-heading">How to read these estimates</h4>
      <p>Each priced row multiplies a published unit-rate range by an <strong>assumed quantity</strong>. These are planning references, not a current campus-job quote. Durability is a relative 0–3 catalog rating, not years of service.</p>
      {suitability.length ? <><h4>Confirm treatment suitability</h4><ul>{suitability.map(t => <li key={t.eligibilityNote}><strong>{METHODS[t.method]}:</strong> {t.eligibilityNote}</li>)}</ul></> : null}
      {survey.sources.filter(source => sourceIds.has(source.id)).map(source => <div key={source.id} className={styles.source}>
        <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>
        <p><strong>Source date: {source.asOf}.</strong> {source.scopeNote}</p>
      </div>)}
      {estimates.length ? <p>The quantities above are not measurements from the video. Confirm the area boundaries, treatment lengths, panel thickness and suitability before requesting prices.</p> : <p>No priced quantities are available for this selected scope.</p>}
      {treatments.length ? <>
        <h4>Before approving funds</h4>
        <ul className={styles.checklist}>
          <li>Measure the work and confirm each conditional treatment with a site professional.</li>
          <li>Get current, itemized quotes for every “Quote needed” row. Reconcile shared setup once across the job.</li>
          {exclusions.map(item => <li key={item}><strong>Outside the selected unit rates:</strong> {item}.</li>)}
        </ul>
      </> : null}
      {plan.pendingChecks.length ? <details><summary>Site measurement checklist ({plan.pendingChecks.length})</summary>
        <ul>{plan.pendingChecks.map(check => <li key={check}>{check}</li>)}</ul>
      </details> : null}
    </section>
    <a className={styles.exportLink} href="#survey-export-heading" onClick={() => {
      // Tab clicks preserve the URL. Re-open Export even when its hash is already current.
      if (window.location.hash === '#survey-export-heading') window.dispatchEvent(new HashChangeEvent('hashchange'));
    }}>Continue to Export report <span aria-hidden="true">→</span></a>
  </section>;
}
