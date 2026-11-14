import { SurveySchema, type Survey, type Cost, type Treatment, type RepairPlan, type PlanId, type Finding, type Box } from '../../contracts/curb/survey';

export function validateSurvey(input: unknown): Survey { return SurveySchema.parse(input); }

/** Preserve the decimal quantity recorded in JSON, including exponent notation.
 * Binary multiplication can turn 100 * 1.1 into 110.00000000000001 and reject
 * a repair at its exact budget. Round only the exact decimal product to cents. */
function roundedCost(rateCents: number, quantity: number, up: boolean): number {
  if (!Number.isSafeInteger(rateCents) || rateCents < 0 || !Number.isFinite(quantity) || quantity <= 0) throw new Error('Invalid cost range');
  const [mantissa, exponent = '0'] = quantity.toString().split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  const scale = fraction.length - Number(exponent);
  const digits = BigInt(whole + fraction);
  const numerator = BigInt(rateCents) * digits * (scale < 0 ? 10n ** BigInt(-scale) : 1n);
  const denominator = scale > 0 ? 10n ** BigInt(scale) : 1n;
  const cents = up ? (numerator + denominator - 1n) / denominator : numerator / denominator;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Invalid cost range');
  return Number(cents);
}

export function costRange(cost: Cost): { lowCents: number; highCents: number } | null {
  if (cost.status === 'quote_required') return null;
  const lowCents = roundedCost(cost.rateLowCents, cost.quantityLow, false);
  const highCents = roundedCost(cost.rateHighCents, cost.quantityHigh, true);
  if (![lowCents, highCents].every(Number.isSafeInteger) || lowCents < 0 || highCents < lowCents) throw new Error('Invalid cost range');
  return { lowCents, highCents };
}

const titles = { essential: 'Essential repairs', balanced: 'Balanced plan', durable: 'Durable renewal', budget: 'Your budget' };
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const upper = (t: Treatment) => costRange(t.cost)?.highCents ?? Infinity;
const cheapest = (a: Treatment, b: Treatment) => upper(a) - upper(b) || b.durability - a.durability || lexical(a.id, b.id);

/** Pure, bounded maintenance planning. No visual label changes graph traversal. */
export function buildRepairPlans(input: Survey, budgetCents?: number): RepairPlan[] {
  const s = validateSurvey(input);
  if (budgetCents !== undefined && (!Number.isSafeInteger(budgetCents) || budgetCents < 0 || budgetCents > 100_000_000)) throw new Error('Budget must be whole cents between 0 and 100000000');
  const active = new Set(s.findings.filter(f => f.review.status !== 'rejected').map(f => f.id));
  const areas = s.workAreas.filter(a => a.repairWorthy && a.findingIds.some(id => active.has(id)));
  const areaIds = new Set(areas.map(a => a.id));
  // Inspection can establish scope, but does not itself address a repair need.
  // Keep those needs deferred/pending instead of awarding repair coverage.
  const candidates = s.treatments.filter(t => areaIds.has(t.workAreaId) && t.method !== 'inspect');
  // Each immutable catalog cost is converted once for this evaluation, rather
  // than repeatedly while enumerating up to 4,096 compatible repair scopes.
  const ranges = new Map([...s.treatments, ...s.sharedCosts].map(item => [item.cost, costRange(item.cost)] as const));

  function make(id: PlanId, selected: Treatment[], budget: number | null = null): RepairPlan {
    const selectedAreas = new Set(selected.map(t => t.workAreaId));
    if (selectedAreas.size !== selected.length) throw new Error('Only one treatment may be selected per work area');
    let lowCents = 0, highCents = 0;
    const unpricedItems: string[] = [];
    for (const item of [...selected, ...(selected.length ? s.sharedCosts : [])]) {
      const r = ranges.get(item.cost);
      if (r) { lowCents += r.lowCents; highCents += r.highCents; }
      else {
        const areaLabel = 'workAreaId' in item ? s.workAreas.find(area => area.id === item.workAreaId)?.label : null;
        unpricedItems.push(`${areaLabel ? `${areaLabel} · ` : ''}${item.label} (${item.id}): ${item.cost.status === 'quote_required' ? item.cost.reason : ''}`);
      }
    }
    if (!Number.isSafeInteger(highCents)) throw new Error('Plan total overflow');
    const coverage = { high: 0, medium: 0, low: 0, unassessed: 0 };
    for (const a of areas) if (selectedAreas.has(a.id)) coverage[a.priority]++;
    return {
      id, title: titles[id], optionIds: selected.map(t => t.id).sort(lexical), workAreaIds: [...selectedAreas].sort(lexical),
      deferredWorkAreaIds: areas.filter(a => !selectedAreas.has(a.id)).map(a => a.id),
      excludedFindingIds: s.findings.filter(f => !active.has(f.id)).map(f => f.id),
      pendingChecks: [...new Set(s.findings.filter(f => active.has(f.id)).flatMap(f => f.assessment.measurementNeeds.map(n => `${f.label}: ${n}`)))],
      cost: { lowCents, highCents, isComplete: unpricedItems.length === 0, unpricedItems }, coverage,
      durability: selected.reduce((n, t) => n + t.durability, 0), budgetCents: budget,
      budgetFit: budget === null ? 'not_set' : highCents > budget ? 'over' : unpricedItems.length ? 'partial' : 'within',
      routeImpact: { ...s.routeAssessment },
    };
  }
  const options = (id: string) => candidates.filter(t => t.workAreaId === id);
  const present = (t: Treatment | undefined): t is Treatment => t !== undefined;
  const essential = areas.filter(a => a.nearTerm).map(a => options(a.id).sort(cheapest)[0]).filter(present);
  const balanced = areas.map(a => options(a.id).find(t => t.id === a.recommendedOptionId)).filter(present);
  const durable = areas.map(a => options(a.id).sort((a, b) => b.durability - a.durability || cheapest(a, b))[0]).filter(present);
  const result = [make('essential', essential), make('balanced', balanced), make('durable', durable)];
  if (budgetCents !== undefined) {
    const priced = candidates.filter(t => t.cost.status === 'estimated');
    let best = make('budget', [], budgetCents);
    function better(a: RepairPlan, b: RepairPlan) {
      for (const k of ['high', 'medium', 'low', 'unassessed'] as const) if (a.coverage[k] !== b.coverage[k]) return a.coverage[k] > b.coverage[k];
      if (a.durability !== b.durability) return a.durability > b.durability;
      if (a.cost.highCents !== b.cost.highCents) return a.cost.highCents < b.cost.highCents;
      return lexical(a.optionIds.join('|'), b.optionIds.join('|')) < 0;
    }
    // Build only compatible scopes. The contract bounds the product at 4096;
    // arbitrary treatment subsets would waste work on incompatible choices.
    let scopes: Treatment[][] = [[]];
    for (const area of areas) {
      const choices = priced.filter(t => t.workAreaId === area.id);
      scopes = scopes.flatMap(selected => [selected, ...choices.map(option => [...selected, option])]);
    }
    for (const selected of scopes) {
      const plan = make('budget', selected, budgetCents);
      if (plan.cost.highCents <= budgetCents && better(plan, best)) best = plan;
    }
    result.push(best);
  }
  return result;
}

/** Exact frame lookup. An absent frame never bridges a lost track/occlusion. */
export function getBoxAtTime(finding: Finding, seconds: number, fps: number): Box | null {
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(fps) || fps <= 0 || finding.review.status === 'rejected') return null;
  const frame = Math.floor(seconds * fps + 1e-6);
  let lo = 0, hi = finding.track.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const key = finding.track[mid];
    if (key.frame === frame) return key.box;
    if (key.frame < frame) lo = mid + 1; else hi = mid - 1;
  }
  return null;
}
