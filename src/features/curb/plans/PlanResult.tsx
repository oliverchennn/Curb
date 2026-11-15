import type { PlanComparison, PlanScenario, PlanSelection } from '../../../contracts/curb/plans';
import {
  conditionSteps,
  destinationLabel,
  destinationRows,
  formatCents,
  listNames,
  repairLabel,
  repairRoles,
  ROUTE_STATUS_LABELS,
  type RepairRole,
} from './presentation';
import styles from './PlanPlanner.module.css';

type Props = {
  context: PlanScenario;
  comparison: PlanComparison;
  onViewEvidence: (repairId: string) => void;
};

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

export function PlanResult({ context, comparison, onViewEvidence }: Props) {
  const total = comparison.baseline.outcomes.length;
  const names = (ids: readonly string[]) => listNames(ids.map((id) => destinationLabel(context, id)));
  const { exact, conditionFirst } = comparison;
  const headline = exact.restoredCount === conditionFirst.restoredCount
    ? `With ${formatCents(comparison.budgetCents)}, both plans newly reach ${plural(exact.restoredCount, 'destination')}.`
    : `With ${formatCents(comparison.budgetCents)}, the best set newly reaches ${plural(exact.restoredCount, 'destination')}; condition-first newly reaches ${conditionFirst.restoredCount}.`;

  return <section className={styles.results} aria-labelledby="plan-results-heading">
    <p className={styles.eyebrow}>Synthetic outcome · same example budget</p>
    <h2 id="plan-results-heading">{headline}</h2>
    <div className={styles.winnerExplanation}>
      <h3>{exact.restoredCount > conditionFirst.restoredCount ? 'Why this plan wins' : 'What this comparison shows'}</h3>
      <p>{exact.restoredCount > conditionFirst.restoredCount
        ? `Choosing repairs together newly reaches ${names(exact.restoredDestinationIds)}. Condition-first ${conditionFirst.restoredCount ? `newly reaches ${names(conditionFirst.restoredDestinationIds)}` : 'does not newly reach a destination'} at the same budget.`
        : `Both strategies newly reach ${plural(exact.restoredCount, 'destination')}. ${exact.spendCents < conditionFirst.spendCents ? `The best set uses ${formatCents(conditionFirst.spendCents - exact.spendCents)} less of the illustrative budget.` : 'There is no reachability advantage to claim at this budget.'}`}</p>
      <p className={styles.small}>Best set: {formatCents(exact.spendCents)} of authored cost · Condition-first: {formatCents(conditionFirst.spendCents)}. The named outcomes and repair dependencies below explain the result.</p>
    </div>

    <div className={styles.planGrid}>
      <article className={styles.planCard} aria-labelledby="plan-baseline-heading">
        <h3 id="plan-baseline-heading">Untreated network</h3>
        <p className={styles.bigNumber}>{comparison.baseline.reachableCount}<span> of {total} destinations reachable</span></p>
        <p className={styles.small}>No repairs · {formatCents(0)} spent</p>
        <p className={styles.small}>{comparison.baseline.reachableCount > 0
          ? `Already reachable: ${names(comparison.baseline.outcomes.filter(({ route }) => route.status === 'reachable').map(({ destinationId }) => destinationId))}.`
          : 'No destination is reachable before repairs.'}</p>
      </article>
      <PlanCard id="plan-condition" title="Condition-first" context={context} plan={conditionFirst} total={total}
        orderNote="Purchase order: worst condition first." names={names} onViewEvidence={onViewEvidence} />
      <PlanCard id="plan-exact" title="Best set for this budget" context={context} plan={exact} total={total}
        orderNote="Listed by repair ID." names={names} onViewEvidence={onViewEvidence} highlight />
    </div>

    <section className={styles.card} aria-labelledby="plan-outcomes-heading">
      <h3 id="plan-outcomes-heading">Every named destination</h3>
      <p className={styles.small}>Each destination counts equally (weight one) from {context.scenario.nodes.find(({ id }) => id === comparison.originNodeId)?.label ?? comparison.originNodeId}. “Newly reachable” means reachable after the plan but not before.</p>
      <div className={styles.tableWrap}>
        <table className={styles.outcomeTable}>
          <caption className={styles.visuallyHidden}>Destination outcomes for the untreated network, condition-first plan and best set at {formatCents(comparison.budgetCents)}</caption>
          <thead><tr><th scope="col">Destination</th><th scope="col">Untreated</th><th scope="col">Condition-first</th><th scope="col">Best set</th></tr></thead>
          <tbody>{destinationRows(comparison).map((row) => <tr key={row.destinationId}>
            <th scope="row">{destinationLabel(context, row.destinationId)}</th>
            <td><StatusTag status={row.baseline} /></td>
            <td><StatusTag status={row.conditionFirst} restored={row.conditionFirstRestored} /></td>
            <td><StatusTag status={row.exact} restored={row.exactRestored} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className={styles.small}>Unknown means a possible connection depends on unassessed coverage, which no repair here resolves. Disconnected means the authored network has no directed connection at all.</p>
    </section>

    <section className={styles.card} aria-labelledby="plan-why-heading">
      <h3 id="plan-why-heading">Which repairs depend on each other?</h3>
      <p className={styles.small}>Computed from the server’s evaluation of each repair alone and of each plan with that repair removed, not from a per-repair score.</p>
      <div className={styles.whyGrid}>
        <RoleList title="Condition-first" roles={repairRoles(comparison, conditionFirst)} context={context} names={names} />
        <RoleList title="Best set" roles={repairRoles(comparison, exact)} context={context} names={names} />
      </div>
    </section>

    <section className={styles.card} aria-labelledby="plan-method-heading">
      <h3 id="plan-method-heading">How each plan was chosen</h3>
      <div className={styles.whyGrid}>
        <div>
          <h4>Condition-first</h4>
          <p className={styles.small}>Sort eligible repairs by condition rating (worst first), then lower cost, then repair ID. Take each one that still fits the remaining budget; a repair that does not fit is skipped and later, cheaper ones are still considered.</p>
          {comparison.eligibleRepairs.length === 0 ? <p className={styles.small}>No repairs have a known cost.</p> : <ol className={styles.stepList}>
            {conditionSteps(comparison).map((step) => <li key={step.repairId}>
              <strong>{repairLabel(context, step.repairId)}</strong>
              <span className={styles.small}>Rating {step.severityScore}/5 · {formatCents(step.costCents)} · {step.selected
                ? `selected (${formatCents(step.remainingBeforeCents)} remained)`
                : `skipped: only ${formatCents(step.remainingBeforeCents)} remained`}</span>
            </li>)}
          </ol>}
        </div>
        <div>
          <h4>Best set</h4>
          <p className={styles.small}>The {plural(comparison.eligibleRepairs.length, 'eligible repair')} form {plural(comparison.search.enumeratedSubsetCount, 'combination')} (including no repairs); {comparison.search.feasibleSubsetCount === comparison.search.enumeratedSubsetCount ? 'all of them fit' : `${comparison.search.feasibleSubsetCount} ${comparison.search.feasibleSubsetCount === 1 ? 'fits' : 'fit'}`} the budget and {comparison.search.feasibleSubsetCount === 1 ? 'was' : 'were'} evaluated on the network. The best one newly reaches the most destinations; ties go to lower spend, then fewer repairs, then repair ID.</p>
          <p className={styles.small}>“Best” is exact only among these candidates, costs and authored assumptions. It is not a prediction of real-world outcomes.</p>
        </div>
      </div>
      {comparison.excludedUnknownCostRepairIds.length > 0 ? <p className={styles.notice}>
        Excluded because the cost is unknown (never treated as free): {listNames(comparison.excludedUnknownCostRepairIds.map((id) => repairLabel(context, id)))}.
      </p> : null}
    </section>
  </section>;
}

function StatusTag({ status, restored = false }: { status: keyof typeof ROUTE_STATUS_LABELS; restored?: boolean }) {
  return <span className={styles.statusCell}>
    <span className={styles[status]}>{ROUTE_STATUS_LABELS[status]}</span>
    {restored ? <span className={styles.restored}>Newly reachable</span> : null}
  </span>;
}

function PlanCard({ id, title, context, plan, total, orderNote, names, onViewEvidence, highlight = false }: {
  id: string;
  title: string;
  context: PlanScenario;
  plan: PlanSelection;
  total: number;
  orderNote: string;
  names: (ids: readonly string[]) => string;
  onViewEvidence: (repairId: string) => void;
  highlight?: boolean;
}) {
  return <article className={highlight ? styles.planCardHighlight : styles.planCard} aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>{title}</h3>
    <p className={styles.bigNumber}>+{plan.restoredCount}<span> newly reachable · {plan.reachableCount} of {total} total</span></p>
    <p className={styles.small}>{formatCents(plan.spendCents)} spent · {plural(plan.selectedRepairIds.length, 'repair')}</p>
    <p className={styles.small}>{plan.restoredCount > 0 ? `Newly reaches ${names(plan.restoredDestinationIds)}.` : 'No destination is newly reached.'}</p>
    {plan.selectedRepairIds.length === 0
      ? <p className={styles.small}>No repairs selected for this budget and the destination-reachability objective.</p>
      : <>
        <p className={styles.small}>{orderNote}</p>
        <ol className={styles.repairList}>{plan.selectedRepairIds.map((repairId) => <li key={repairId}>
          <span>{repairLabel(context, repairId)}</span>
          <button type="button" className={styles.linkButton} onClick={() => onViewEvidence(repairId)}
            aria-label={`View evidence for ${repairLabel(context, repairId)}`}>Evidence</button>
        </li>)}</ol>
      </>}
  </article>;
}

function RoleList({ title, roles, context, names }: {
  title: string;
  roles: RepairRole[];
  context: PlanScenario;
  names: (ids: readonly string[]) => string;
}) {
  return <div>
    <h4>{title}</h4>
    {roles.length === 0 ? <p className={styles.small}>No repairs selected.</p> : <ul className={styles.roleList}>
      {roles.map((role) => <li key={role.repairId}>
        <strong>{repairLabel(context, role.repairId)}</strong>
        <span className={styles[`role-${role.kind}`]}>{role.kind === 'companion' ? 'Needs companions' : role.kind === 'independent' ? 'Works alone' : 'No added effect'}</span>
        <p>{role.aloneRestores.length > 0 ? `On its own it restores ${names(role.aloneRestores)}.` : 'On its own it restores nothing.'}{' '}
          {role.kind === 'no-added-effect'
            ? 'Removing it from this plan loses nothing.'
            : `Removing it from this plan loses ${names(role.lostWithout)}.`}
          {role.needsCompanions.length > 0 ? ` ${role.needsCompanions.length === role.lostWithout.length ? (role.needsCompanions.length === 1 ? 'That destination needs' : 'Those destinations need') : `${names(role.needsCompanions)} ${role.needsCompanions.length === 1 ? 'needs' : 'need'}`} this repair together with the other selected repairs.` : ''}</p>
      </li>)}
    </ul>}
  </div>;
}
