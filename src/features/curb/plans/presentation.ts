import type {
  PlanComparison,
  PlanEligibleRepair,
  PlanScenario,
  PlanSelection,
} from '../../../contracts/curb/plans';
import type { TripRouteResult } from '../../../contracts/curb/trips';

// Display-only helpers. They label and compare outcomes the server already
// evaluated; none of them searches the graph or re-ranks repair plans.

export type BudgetParse = { ok: true; cents: number } | { ok: false; message: string };

const BUDGET_PATTERN = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d*))?$/;

/** Parses a USD amount into exact integer cents. Never rounds: more than two
 * decimal places, negatives, non-numbers and unsafe totals are rejected. */
export function parseBudgetInput(input: string): BudgetParse {
  const text = input.trim();
  if (text === '') return { ok: false, message: 'Enter a budget in US dollars, for example 4.00.' };
  if (text.startsWith('-')) return { ok: false, message: 'The budget cannot be negative.' };
  const match = BUDGET_PATTERN.exec(text);
  if (!match) return { ok: false, message: 'Use a dollar amount such as 4 or 4.00 (digits only).' };
  const fraction = match[2] ?? '';
  if (fraction.length > 2) {
    return { ok: false, message: 'Budgets are in whole cents. Use at most two decimal places; amounts are never rounded.' };
  }
  const cents = BigInt(match[1].replaceAll(',', '')) * 100n + BigInt(fraction.padEnd(2, '0') || '0');
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { ok: false, message: 'That budget is too large to evaluate exactly.' };
  }
  return { ok: true, cents: Number(cents) };
}

/** Exact USD display of nonnegative safe-integer cents, e.g. 400 → "$4.00". */
export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `$${new Intl.NumberFormat('en-US').format(dollars)}.${String(remainder).padStart(2, '0')}`;
}

/** Plain value for the budget field, e.g. 400 → "4.00". */
export function centsToInput(cents: number): string {
  return formatCents(cents).slice(1).replaceAll(',', '');
}

export const ROUTE_STATUS_LABELS: Record<TripRouteResult['status'], string> = {
  reachable: 'Reachable',
  blocked: 'Blocked',
  unknown: 'Unknown',
  disconnected: 'Disconnected',
};

export function repairLabel(context: PlanScenario, repairId: string): string {
  return context.repairs.find((repair) => repair.id === repairId)?.label ?? repairId;
}

export function destinationLabel(context: PlanScenario, destinationId: string): string {
  return context.scenario.destinations.find((destination) => destination.id === destinationId)?.label ?? destinationId;
}

export function nodeLabel(context: PlanScenario, nodeId: string): string {
  return context.scenario.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

export type DestinationRow = {
  destinationId: string;
  baseline: TripRouteResult['status'];
  conditionFirst: TripRouteResult['status'];
  exact: TripRouteResult['status'];
  conditionFirstRestored: boolean;
  exactRestored: boolean;
};

/** One row per destination in the server's baseline order. */
export function destinationRows(comparison: PlanComparison): DestinationRow[] {
  const statusIn = (plan: { outcomes: PlanComparison['baseline']['outcomes'] }, id: string) =>
    plan.outcomes.find((outcome) => outcome.destinationId === id)?.route.status ?? 'disconnected';
  return comparison.baseline.outcomes.map(({ destinationId, route }) => ({
    destinationId,
    baseline: route.status,
    conditionFirst: statusIn(comparison.conditionFirst, destinationId),
    exact: statusIn(comparison.exact, destinationId),
    conditionFirstRestored: comparison.conditionFirst.restoredDestinationIds.includes(destinationId),
    exactRestored: comparison.exact.restoredDestinationIds.includes(destinationId),
  }));
}

export type RepairRole = {
  repairId: string;
  /** Destinations this repair restores when applied on its own. */
  aloneRestores: string[];
  /** Destinations this plan loses if the repair is removed from it. */
  lostWithout: string[];
  /** Lost destinations the repair does not restore alone: they need the other selected repairs too. */
  needsCompanions: string[];
  kind: 'independent' | 'companion' | 'no-added-effect';
};

/** Classifies each selected repair from the server's single-repair and
 * omission evaluations, never from an additive per-item score. */
export function repairRoles(comparison: PlanComparison, plan: PlanSelection): RepairRole[] {
  return plan.selectedRepairIds.map((repairId) => {
    const aloneRestores = comparison.singleRepairs.find((item) => item.repairId === repairId)?.restoredDestinationIds ?? [];
    const without = plan.withoutRepair.find((item) => item.repairId === repairId)?.restoredDestinationIds ?? [];
    const lostWithout = plan.restoredDestinationIds.filter((id) => !without.includes(id));
    const needsCompanions = lostWithout.filter((id) => !aloneRestores.includes(id));
    const kind = lostWithout.length === 0 ? 'no-added-effect' : needsCompanions.length > 0 ? 'companion' : 'independent';
    return { repairId, aloneRestores, lostWithout, needsCompanions, kind };
  });
}

export type ConditionStep = PlanEligibleRepair & {
  selected: boolean;
  /** Budget remaining when this repair was considered, in cents. */
  remainingBeforeCents: number;
};

/** Narrates the server's condition-first selection in its declared order.
 * The selected flags come from the server result; remaining budget is shown for context. */
export function conditionSteps(comparison: PlanComparison): ConditionStep[] {
  let remaining = comparison.budgetCents;
  return comparison.eligibleRepairs.map((repair) => {
    const selected = comparison.conditionFirst.selectedRepairIds.includes(repair.repairId);
    const step = { ...repair, selected, remainingBeforeCents: remaining };
    if (selected) remaining -= repair.costCents;
    return step;
  });
}
