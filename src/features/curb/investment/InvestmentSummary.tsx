import type { PlanComparison, PlanScenario, PlanSelection } from '../../../contracts/curb/plans';
import { destinationLabel, listNames, nodeLabel, repairLabel } from '../plans/presentation';
import { dependencyNotes, money, newlyReachableDestinationIds, shortRepairLabel } from './presentation';
import styles from './InvestmentDemo.module.css';

type Props = { scenario: PlanScenario; comparison: PlanComparison };

function names(scenario: PlanScenario, ids: readonly string[]): string {
  return listNames(ids.map((id) => destinationLabel(scenario, id))) || 'None';
}

function repairs(ids: readonly string[]): string {
  return ids.length ? ids.map(shortRepairLabel).join(' + ') : 'No repairs';
}

function StrategyCard({ scenario, comparison, plan, recommended }: Props & { plan: PlanSelection; recommended: boolean }) {
  const newIds = newlyReachableDestinationIds(comparison.baseline, plan);
  return <article className={`${styles.comparisonCard} ${recommended ? styles.recommendedCard : ''}`}>
    <p className={styles.strategyEyebrow}>{recommended ? 'Maximize new connections' : 'Highest condition score first'}</p>
    <h3>{recommended ? 'Curb recommendation' : 'Condition-first'}</h3>
    <p className={styles.strategyMetric}><strong>{newIds.length}</strong><span>newly reachable {newIds.length === 1 ? 'destination' : 'destinations'}</span></p>
    <p className={styles.strategyDestinations}>{names(scenario, newIds)}</p>
    <p className={styles.strategyRepairs}><strong>{repairs(plan.selectedRepairIds)}</strong><span>{money(plan.spendCents)} assumed spend</span></p>
    <p className={styles.strategyMeta}>Submitted budget {money(comparison.budgetCents)}</p>
  </article>;
}

export function InvestmentComparison({ scenario, comparison }: Props) {
  const exactCount = newlyReachableDestinationIds(comparison.baseline, comparison.exact).length;
  const conditionCount = newlyReachableDestinationIds(comparison.baseline, comparison.conditionFirst).length;
  const baselineIds = comparison.baseline.outcomes.filter(({ route }) => route.status === 'reachable').map(({ destinationId }) => destinationId);
  const difference = exactCount - conditionCount;
  const lowerSpend = comparison.exact.spendCents < comparison.conditionFirst.spendCents;
  return <section className={styles.comparisonPanel} aria-labelledby="investment-comparison-heading">
    <div className={styles.comparisonHeading}><h2 id="investment-comparison-heading">Two ways to use the same budget</h2></div>
    <div className={styles.comparisonCards}>
      <StrategyCard scenario={scenario} comparison={comparison} plan={comparison.conditionFirst} recommended={false} />
      <StrategyCard scenario={scenario} comparison={comparison} plan={comparison.exact} recommended />
    </div>
    <p className={styles.comparisonNote}>
      {difference > 0
        ? `Curb reaches ${difference} more new ${difference === 1 ? 'destination' : 'destinations'} within this budget.`
        : lowerSpend ? 'Both restore the same number of destinations. Curb selects the lower spend.'
          : 'Both restore the same number of destinations at the same spend.'}
      {' '}{names(scenario, baselineIds)} {baselineIds.length === 1 ? 'is' : 'are'} already reachable and excluded from new benefits.
    </p>
    {comparison.exact.selectedRepairIds.length === 0 && comparison.conditionFirst.selectedRepairIds.length > 0 && exactCount === 0
      ? <p className={styles.comparisonNote}>No affordable combination adds a destination. This objective favors lower spend when reachability ties; it assigns no credit for partial progress or hazard reduction.</p>
      : null}
  </section>;
}

/** The brief deliberately accepts no displayed map or omission state. */
export function InvestmentSummary({ scenario, comparison }: Props) {
  const exact = comparison.exact;
  const restoredIds = newlyReachableDestinationIds(comparison.baseline, exact);
  const conditionIds = newlyReachableDestinationIds(comparison.baseline, comparison.conditionFirst);
  const baselineIds = comparison.baseline.outcomes.filter(({ route }) => route.status === 'reachable').map(({ destinationId }) => destinationId);
  const notes = dependencyNotes(comparison).filter(({ companionDestinationIds }) => companionDestinationIds.length > 0);
  const costs = new Map(comparison.eligibleRepairs.map(({ repairId, costCents }) => [repairId, costCents]));
  return <section className={styles.printBrief} data-investment-brief aria-labelledby="investment-brief-heading">
    <div className={styles.briefHeader}>
      <div><p className={styles.briefEyebrow}>Curb · Decision brief</p><h2 id="investment-brief-heading">Recommended investment</h2></div>
      <p className={styles.briefDisclosure}>Synthetic scenario · assumed costs and route conditions</p>
    </div>
    <p className={styles.briefIdentity}>{scenario.scenario.title} · {comparison.scenarioId} · Revision {comparison.revision}<br />
      {scenario.profile.label} ({comparison.profileId}) · From {nodeLabel(scenario, comparison.originNodeId)}</p>
    <div className={styles.briefGrid}>
      <p className={styles.briefMetric}><span>Submitted budget</span><strong>{money(comparison.budgetCents)}</strong></p>
      <p className={styles.briefMetric}><span>Assumed spend</span><strong>{money(exact.spendCents)}</strong></p>
      <p className={styles.briefMetric}><span>New destinations</span><strong>{restoredIds.length}</strong></p>
    </div>
    <p><strong>Newly reachable:</strong> {names(scenario, restoredIds)}. {names(scenario, baselineIds)} remains baseline access and is not counted as a new benefit.</p>
    {exact.selectedRepairIds.length ? <table className={styles.briefRepairs}>
      <caption>Recommended repairs and assumed costs</caption>
      <thead><tr><th scope="col">Repair</th><th scope="col">Assumed cost</th></tr></thead>
      <tbody>{exact.selectedRepairIds.map((id) => <tr key={id}><th scope="row">{repairLabel(scenario, id)}</th><td>{costs.has(id) ? money(costs.get(id)!) : 'Unavailable'}</td></tr>)}</tbody>
    </table> : <p className={styles.briefRepairs}>No repairs are recommended at this budget under the new-destination objective.</p>}
    <p className={styles.briefComparison}><strong>Condition-first comparison:</strong> {repairs(comparison.conditionFirst.selectedRepairIds)}, {money(comparison.conditionFirst.spendCents)} assumed spend, {conditionIds.length} newly reachable {conditionIds.length === 1 ? 'destination' : 'destinations'} ({names(scenario, conditionIds)}). This is a simple authored comparator, not a claim about campus practice.</p>
    {notes.length ? <div className={styles.briefDependency}><h3>Why the combination matters</h3>
      {notes.map((note) => <p key={note.repairId}>Repair {shortRepairLabel(note.repairId)} needs other recommended repairs to restore {names(scenario, note.companionDestinationIds)}. On its own, it restores {note.aloneRestoredDestinationIds.length ? names(scenario, note.aloneRestoredDestinationIds) : 'no new destinations'}; omitting it loses {names(scenario, note.lostDestinationIds)}.</p>)}
    </div> : null}
    <div className={styles.briefAssumptions}><h3>Scenario assumptions</h3><ul>{scenario.assumptions.map((assumption, index) => <li key={`${index}-${assumption}`}>{assumption}</li>)}</ul></div>
    <p className={styles.briefNext}><strong>Next field inputs:</strong> verified route assessments, user destination priorities, measured repair scopes, and current prices. These modeled gains are not measured repair outcomes or a finding of legal compliance.</p>
    <p className={styles.briefIdentity}>This brief always presents the canonical recommendation, even while the map displays an omission preview.</p>
  </section>;
}
