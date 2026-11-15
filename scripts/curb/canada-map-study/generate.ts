import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN_CONTRACT_VERSION, type PlanCoverage } from '../../../src/contracts/curb/plans';
import { STEP_FREE_PROFILE_ID, type TripRouteResult } from '../../../src/contracts/curb/trips';
import { comparePlans, validatePlanScenario } from '../../../src/domain/curb/plans';
import { prepareTripEvaluator } from '../../../src/domain/curb/trips';
import { compareMarginal } from '../metrics/baselines';
import { buildPlan, FREEZE_COMMIT, KERNEL_COMMIT, readInputs, type Inputs, type MappingScenario } from './adapter';

const strategyIds = ['exact', 'cheapest', 'greedy', 'bundleGreedy'] as const;
const comparatorIds = ['cheapest', 'greedy', 'bundleGreedy'] as const;
type Strategy = typeof strategyIds[number];
const studyRoot = fileURLToPath(new URL('../../../', import.meta.url));
const reportPath = join(studyRoot, 'reports/curb/canada-map-study');

const byId = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const bySpendAndId = (left: Action, right: Action) => left.costCents - right.costCents || byId(left.repairId, right.repairId);
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

interface CostVariant {
  id: string;
  projectCostCents: number[];
}

interface Witness {
  destinationId: string;
  nodeIds: string[];
  edgeIds: string[];
}

interface Subset {
  mask: number;
  selectedRepairIds: string[];
  spendCents: number;
  reachableDestinationIds: string[];
  newDestinationIds: string[];
  witnesses: Witness[];
}

interface Action {
  repairId: string;
  repairIds: string[];
  mask: number;
  costCents: number;
}

function costVariants(inputs: Inputs): CostVariant[] {
  const { projects, spec } = inputs;
  const base = projects.map(({ costCents }) => costCents);
  const halfUp = (cents: number, percent: number) => Math.floor((cents * percent + 50) / 100);
  return [
    { id: 'nominal', projectCostCents: base },
    ...['all', ...spec.projectIds].flatMap((target) => spec.sensitivity.costMultipliersPercent.map((percent) => ({
      id: target + '-' + percent,
      projectCostCents: base.map((cents, index) => target === 'all' || target === spec.projectIds[index]
        ? halfUp(cents, percent) : cents),
    }))),
  ];
}

function projectWitness(destinationId: string, route: TripRouteResult): Witness[] {
  return route.status === 'reachable' ? [{ destinationId, nodeIds: route.nodeIds, edgeIds: route.edgeIds }] : [];
}

function coverageWitnesses(coverage: PlanCoverage): Witness[] {
  return coverage.outcomes.flatMap(({ destinationId, route }) => projectWitness(destinationId, route));
}

function selectCheapest(actions: Action[], budgetCents: number): string[] {
  const selectedRepairIds = [];
  let remaining = budgetCents;
  for (const action of [...actions].sort(bySpendAndId)) {
    if (action.costCents <= remaining) {
      selectedRepairIds.push(...action.repairIds);
      remaining -= action.costCents;
    }
  }
  return selectedRepairIds;
}

function selectGreedy(actions: Action[], budgetCents: number, subsets: Subset[]): string[] {
  const selectedRepairIds: string[] = [];
  let mask = 0;
  while (true) {
    const current = subsets[mask];
    const ranked = actions
      .filter((action) => !(mask & action.mask) && current.spendCents + action.costCents <= budgetCents)
      .map((action) => ({
        ...action,
        gain: subsets[mask | action.mask].newDestinationIds.length - current.newDestinationIds.length,
      }))
      .sort(compareMarginal);
    const next = ranked[0];
    if (!next) return selectedRepairIds;
    // A zero gain can be the first half of a useful pair, so continue when affordable.
    selectedRepairIds.push(...next.repairIds);
    mask |= next.mask;
  }
}

function paretoFrontier(subsets: Subset[]): number[] {
  const frontier: number[] = [];
  let bestGain = -1;
  const ordered = [...subsets].sort((left, right) =>
    left.spendCents - right.spendCents
    || right.newDestinationIds.length - left.newDestinationIds.length
    || left.selectedRepairIds.length - right.selectedRepairIds.length
    || byId(left.selectedRepairIds.join('|'), right.selectedRepairIds.join('|')));
  for (const subset of ordered) {
    if (subset.newDestinationIds.length > bestGain) {
      bestGain = subset.newDestinationIds.length;
      frontier.push(subset.mask);
    }
  }
  return frontier;
}

function evaluateVariant(inputs: Inputs, mapping: MappingScenario, variant: CostVariant) {
  const { spec } = inputs;
  const { projectIds, destinationNodeIds } = spec;
  const context = validatePlanScenario(buildPlan(inputs, mapping, variant.projectCostCents));
  const evaluator = prepareTripEvaluator(context);
  const bits = new Map(projectIds.map((id, index) => [id, 1 << index]));
  const barrierIds = new Map(context.repairs.map(({ id, barrierId }) => [id, barrierId]));
  const maskFor = (ids: string[]) => ids.reduce((mask, id) => mask | bits.get(id)!, 0);
  const subsetCount = 2 ** projectIds.length;
  const subsets: Subset[] = Array.from({ length: subsetCount }, (_, mask) => {
    const selectedRepairIds = projectIds.filter((id) => mask & bits.get(id)!);
    const spendCents = variant.projectCostCents.reduce((sum, cents, index) =>
      mask & (1 << index) ? sum + cents : sum, 0);
    const routes = evaluator.evaluateRoutes(
      spec.originNodeId, destinationNodeIds, new Set(selectedRepairIds.map((id) => barrierIds.get(id)!)),
    );
    const witnesses = routes.flatMap((route, index) => projectWitness(destinationNodeIds[index], route));
    return { mask, selectedRepairIds, spendCents, witnesses, reachableDestinationIds: witnesses.map((w) => w.destinationId), newDestinationIds: [] };
  });
  const baselineDestinationIds = subsets[0].reachableDestinationIds;
  for (const subset of subsets) {
    subset.newDestinationIds = subset.reachableDestinationIds.filter((id) => !baselineDestinationIds.includes(id));
  }

  const singletons = projectIds.map((repairId) => ({ repairId, subsetMask: bits.get(repairId)! }));
  const fullSetOmissions = projectIds.map((removedRepairId) => ({
    removedRepairId, subsetMask: (subsetCount - 1) ^ bits.get(removedRepairId)!,
  }));
  const action = (ids: string[]): Action => {
    const repairIds = [...ids].sort(byId);
    const mask = maskFor(repairIds);
    return { repairId: repairIds.join('|'), repairIds, mask, costCents: subsets[mask].spendCents };
  };
  const individualActions = projectIds.map((id) => action([id]));
  const crossings = [...new Set(projectIds.map((id) => spec.projectToEdge[id]))];
  const bundleActions = crossings.map((edge) => action(projectIds.filter((id) => spec.projectToEdge[id] === edge)));
  const reportedSelection = (selectedRepairIds: string[]) => {
    const subset = subsets[maskFor(selectedRepairIds)];
    assert.equal(selectedRepairIds.length, subset.selectedRepairIds.length);
    return {
      selectedRepairIds,
      spendCents: subset.spendCents,
      reachableDestinationIds: subset.reachableDestinationIds,
      newDestinationIds: subset.newDestinationIds,
      subsetMask: subset.mask,
      withoutRepair: selectedRepairIds.map((removedRepairId) => ({
        removedRepairId, subsetMask: subset.mask ^ bits.get(removedRepairId)!,
      })),
    };
  };

  const budgetCentsValues = variant.id === 'nominal' ? spec.budgetCents : spec.budgetCents.slice(1, -1);
  const budgets = budgetCentsValues.map((budgetCents) => {
    const result = comparePlans(context, {
      contractVersion: PLAN_CONTRACT_VERSION,
      scenarioId: context.scenario.id,
      revision: context.scenario.revision,
      profileId: STEP_FREE_PROFILE_ID,
      originNodeId: spec.originNodeId,
      budgetCents,
    });
    const exact = reportedSelection(result.exact.selectedRepairIds);
    assert.deepEqual(coverageWitnesses(result.baseline), subsets[0].witnesses);
    assert.deepEqual(coverageWitnesses(result.exact), subsets[exact.subsetMask].witnesses);
    assert.deepEqual(result.exact.restoredDestinationIds, exact.newDestinationIds);
    assert.equal(result.exact.spendCents, exact.spendCents);
    assert.equal(result.eligibleRepairs.length, projectIds.length);
    assert.deepEqual(result.excludedUnknownCostRepairIds, []);
    assert.equal(result.search.enumeratedSubsetCount, subsetCount);
    assert.equal(result.search.feasibleSubsetCount, subsets.filter((subset) => subset.spendCents <= budgetCents).length);
    const strategies = {
      exact,
      cheapest: reportedSelection(selectCheapest(individualActions, budgetCents)),
      greedy: reportedSelection(selectGreedy(individualActions, budgetCents, subsets)),
      bundleGreedy: reportedSelection(selectGreedy(bundleActions, budgetCents, subsets)),
    };
    for (const selected of Object.values(strategies)) {
      assert.ok(selected.spendCents <= budgetCents);
    }
    return { budgetCents, ...result.search, strategies };
  });

  return {
    ...variant, baselineDestinationIds, subsets, singletons, fullSetOmissions,
    paretoFrontier: paretoFrontier(subsets), budgets,
  };
}

function runStudy(inputs: Inputs) {
  const { spec, inputHashes } = inputs;
  const variants = costVariants(inputs);
  return {
    schemaVersion: 1,
    studyId: spec.studyId,
    disposition: spec.disposition,
    freezeCommit: FREEZE_COMMIT,
    kernelCommit: KERNEL_COMMIT,
    inputHashes,
    originNodeId: spec.originNodeId,
    destinationNodeIds: spec.destinationNodeIds,
    projectIds: spec.projectIds,
    scenarios: spec.scenarios.map((mapping) => ({
      id: mapping.id,
      otherConditionsAssumedResolved: mapping.otherConditionsAssumedResolved,
      historicalMappingAssumed: mapping.historicalMappingAssumed,
      verticalTransferAssumed: mapping.verticalTransferAssumed,
      variants: variants.map((variant) => evaluateVariant(inputs, mapping, variant)),
    })),
  };
}

type Results = ReturnType<typeof runStudy>;
type ScenarioResult = Results['scenarios'][number];

function comparisonSummary(scenarios: ScenarioResult[], tier: 'nominal' | 'stress') {
  const cases = scenarios.flatMap(({ variants }) => variants
    .filter(({ id }) => (id === 'nominal') === (tier === 'nominal'))
    .flatMap(({ budgets }) => budgets));
  const compare = (strategy: Exclude<Strategy, 'exact'>) => {
    const counts = { wins: 0, ties: 0, losses: 0 };
    for (const { strategies } of cases) {
      const difference = strategies.exact.newDestinationIds.length - strategies[strategy].newDestinationIds.length;
      counts[difference > 0 ? 'wins' : difference < 0 ? 'losses' : 'ties'] += 1;
    }
    return counts;
  };
  return { cases: cases.length, cheapest: compare('cheapest'), greedy: compare('greedy'), bundleGreedy: compare('bundleGreedy') };
}

function buildClaims(inputs: Inputs, results: Results) {
  const nominal = comparisonSummary(results.scenarios, 'nominal');
  const stress = comparisonSummary(results.scenarios, 'stress');
  return {
    schemaVersion: 1,
    studyId: results.studyId,
    disposition: results.disposition,
    metric: 'Count of newly connected modeled exterior approach points from the fixed middle Lot 1 origin.',
    favorableAssumptions: inputs.spec.assumptions,
    historicalEstimate: {
      baseYear: inputs.spec.costBaseYear, currency: inputs.spec.currency,
      estimateCents: inputs.spec.nominalTotalCents, projectCount: inputs.projects.length,
      scope: 'Four published curb-ramp replacement assemblies only.',
    },
    scenarios: results.scenarios.map((scenario) => ({
      id: scenario.id,
      nominalMaximumNewDestinationCount: Math.max(...scenario.variants[0].budgets.map(({ strategies }) =>
        strategies.exact.newDestinationIds.length)),
      nominal: comparisonSummary([scenario], 'nominal'),
      stress: comparisonSummary([scenario], 'stress'),
    })),
    comparison: { nominal, stress },
    publishedPriority: 'Unavailable because the ramp 404 priority is unresolved.',
    limitation: inputs.spec.singleOriginLimitation,
    boundary: 'Historical cost inputs and conditional modeled exterior connections. No current access, complete-route price, observed benefit, compliance assessment, campus-wide comparison or human-study claim.',
  };
}

function buildCsv(results: Results) {
  const columns = [
    'scenarioId', 'variantId', 'budgetCents', 'strategy', 'spendCents', 'selectedRepairIds',
    'baselineDestinationIds', 'newDestinationIds', 'reachableDestinationIds',
    'newDestinationCount', 'subsetMask', 'enumeratedSubsetCount', 'feasibleSubsetCount',
  ];
  const cells = (values: (number | string | string[])[]) => values.map((value) =>
    '"' + (Array.isArray(value) ? JSON.stringify(value) : String(value)).replaceAll('"', '""') + '"').join(',');
  const data = results.scenarios.flatMap((scenario) => scenario.variants.flatMap((variant) =>
    variant.budgets.flatMap((budget) => strategyIds.map((strategy) => {
      const plan = budget.strategies[strategy];
      return cells([
        scenario.id, variant.id, budget.budgetCents, strategy, plan.spendCents, plan.selectedRepairIds,
        variant.baselineDestinationIds, plan.newDestinationIds, plan.reachableDestinationIds,
        plan.newDestinationIds.length, plan.subsetMask, budget.enumeratedSubsetCount, budget.feasibleSubsetCount,
      ]);
    }))));
  return [columns.join(','), ...data].join('\n') + '\n';
}


const money = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

function buildReport(inputs: Inputs, results: Results, claims: ReturnType<typeof buildClaims>) {
  const { projects, spec, topology } = inputs;
  const sourceUrl = (id: string) => topology.sources.find((source) => source.id === id)!.url;
  const positiveTransfer = results.scenarios.find(({ id }) => id === 'conditional-with-transfer')!;
  const nominal = positiveTransfer.variants[0];
  const maximum = Math.max(...nominal.budgets.map(({ strategies }) => strategies.exact.newDestinationIds.length));
  const firstAtMaximum = nominal.budgets.find(({ strategies }) => strategies.exact.newDestinationIds.length === maximum)!;
  const choice = firstAtMaximum.strategies.exact;
  const chosenNames = choice.selectedRepairIds.map((id) => 'ramp ' + id.replace('replace-ramp-', ''));
  const targetNames = (ids: string[]) => new Intl.ListFormat('en-US').format(ids.map((id) => spec.destinationLabels[spec.destinationNodeIds.indexOf(id)]));
  const countedNoun = (count: number) => count === 1 ? 'point' : 'points';
  const maximumText = (count: number) => count + ' modeled exterior ' + countedNoun(count);
  const lines = [
    '# Cañada College curb-ramp planning study',
    '',
    'A historical-cost planning example using the public campus map. When the model assumes the ramp locations, a usable Building 9 elevator transfer, and that other barriers and unknown conditions are addressed outside the ramp budget, the exact planner connects **' + maximumText(maximum) + '** from middle Lot 1 with **' + money(choice.spendCents) + '** in published 2020 ramp estimates. The conservative scenario connects **zero**.',
    '',
    '**The result applies to one origin and three exterior approach points.** The southern 404/405 pair has no mapped connection to that origin or those targets. Both southern projects remain in the eligible pool and in the ' + money(spec.nominalTotalCents) + ' nominal cost denominator. This limits what the comparison can say about campus-wide performance.',
    '',
    '![Schematic of the middle Lot 1 origin, three exterior approach points, two historical ramp pairings, and the conditional Building 9 transfer.](topology.svg)',
    '',
    '## What changes under the assumptions',
    '',
    '| Scenario | Exact maximum at the tested nominal budgets |',
    '| --- | ---: |',
    ...claims.scenarios.map(({ id, nominalMaximumNewDestinationCount }) =>
      '| ' + ({
        conservative: 'Unresolved access and known non-ramp conditions retained',
        'mapping-unconfirmed': 'Other conditions assumed resolved, ramp placement unconfirmed',
        'conditional-no-transfer': 'Ramp placement assumed, Building 9 transfer excluded',
        'conditional-with-transfer': 'Ramp placement and Building 9 transfer assumed',
      })[id] + ' | ' + nominalMaximumNewDestinationCount + ' |'),
    '',
    'The favorable scenarios assume that other barriers and unknown conditions on the schematic paths are resolved outside this budget. These include sidewalk and approach defects, roadway conditions, widths, slopes, and assessment coverage. The Building 9 transfer and usable landings require their own explicit assumption. None of this work is observed.',
    '',
    'The transfer scenario’s least-cost plan for its maximum uses ' + chosenNames.join(' and ') + ' and reaches ' + targetNames(choice.newDestinationIds) + '. Its first tested budget at that outcome is ' + money(firstAtMaximum.budgetCents) + '. Removing either middle ramp from the complete four-project selection removes all three modeled connections in this scenario.',
    '',
    '## Same-budget results',
    '',
    'Each cell is **newly connected exterior points / historical ramp spend** for the scenario with the transfer assumed. All strategies used the same fixed origin, targets, costs, and budget at each comparison.',
    '',
    '| Nominal budget | Exact | Cheapest first | Single-repair greedy | Crossing-bundle greedy |',
    '| ---: | ---: | ---: | ---: | ---: |',
    ...nominal.budgets.map(({ budgetCents, strategies }) => '| ' + money(budgetCents) + ' | '
      + strategyIds.map((id) => strategies[id].newDestinationIds.length + ' / ' + money(strategies[id].spendCents)).join(' | ') + ' |'),
    '',
    'Wins count additional modeled exterior points at equal budgets. Ties may differ in spend. The nominal tier covers five budgets in each of four scenarios. The cost stress tier uses the three intermediate budgets and changes all costs together or one project at a time by −25% or +25%. These perturbations test sensitivity and supply no current quotes.',
    '',
    '| Exact versus | Nominal wins / ties / losses (' + claims.comparison.nominal.cases + ' cases) | Stress wins / ties / losses (' + claims.comparison.stress.cases + ' cases) |',
    '| --- | ---: | ---: |',
    ...comparatorIds.map((id, index) => {
      const wtl = (counts: { wins: number; ties: number; losses: number }) => [counts.wins, counts.ties, counts.losses].join(' / ');
      return '| ' + ['Cheapest first', 'Single-repair greedy', 'Crossing-bundle greedy'][index] + ' | '
        + wtl(claims.comparison.nominal[id]) + ' | ' + wtl(claims.comparison.stress[id]) + ' |';
    }),
    '',
    'Both greedy baselines tie exact on endpoint count in all tested cases. The crossing-bundle baseline can buy either crossing as a complete work package. A published-priority comparator is unavailable because ramp 404’s priority is unresolved.',
    '',
    '## Sources and scope',
    '',
    'The campus map supports the schematic paths and approximate crossing locations. Attaching the 2020 ramp IDs to those crossings is a plausible historical alignment. The map does not establish operational elevators, door or landing continuity, or access today. The indoor library link is excluded. Published witness paths list their nodes and edges without measured lengths.',
    '',
    '| Published 2020 assembly | Estimate | Conditional placement |',
    '| --- | ---: | --- |',
    ...projects.map(({ id, costCents }) =>
      '| ' + id.replace('replace-', '').replace('-', ' ') + ' | ' + money(costCents) + ' | '
      + (spec.projectToEdge[id] === 'mid-road-crossing' ? 'Middle Lot 1 crossing' : 'Disconnected southern crossing') + ' |'),
    '',
    'These four figures cover curb ramps and their replacement assemblies only. Other barriers, maintenance, crossings, and complete routes have no estimated totals here. The original historical inventory remains inventory-only. This study measures modeled connections under assumptions and makes no claim about observed benefit, legal compliance, or actual accessibility.',
    '',
    '- [2026 campus map](' + sourceUrl('college-map-2026') + ') and [Building 9 design record](' + sourceUrl('building9-district') + ')',
    '- [November 2020 district accessibility report](' + sourceUrl('official-audit-2020') + ') and [transcribed ramp estimates](../../../research/curb/canada-2020/projects.json)',
    '- [Topology evidence and exclusions](../../../docs/research/canada-case/map-topology.json) and [frozen study policy](../../../research/curb/canada-map-study/study-spec.json)',
    '',
    '## Reproduce',
    '',
    'Run from the repository root with the installed Node dependencies and Python.',
    '',
    '~~~sh',
    'node --import tsx scripts/curb/canada-map-study/generate.ts',
    'node --import tsx scripts/curb/canada-map-study/generate.ts --check',
    'python scripts/curb/canada-map-study/verify.py --check',
    '~~~',
    '',
    'The frozen inputs are SHA-256 checked. [Results JSON](results.json) contains all sixteen selections for each scenario and cost variant, selected-plan omissions, singletons, nondominated alternatives, and path witnesses. [Results CSV](results.csv) lists the budget/strategy outcomes. [Claims JSON](claims.json) carries the comparison counts and evidence boundaries. [Independent verification](verification.json) checks the results with a separate graph oracle.',
    '',
  ];
  assert.ok(claims.comparison.nominal.bundleGreedy.ties === claims.comparison.nominal.cases
    && claims.comparison.stress.bundleGreedy.ties === claims.comparison.stress.cases);
  assert.equal(claims.scenarios[0].nominalMaximumNewDestinationCount, 0);
  assert.equal(claims.scenarios[1].nominalMaximumNewDestinationCount, 0);
  for (const { removedRepairId, subsetMask } of nominal.fullSetOmissions) {
    if (spec.projectToEdge[removedRepairId] === 'mid-road-crossing') {
      assert.deepEqual(nominal.subsets[subsetMask].newDestinationIds, []);
    }
  }
  return lines.join('\n');
}

function buildTopologySvg(inputs: Inputs): string {
  const { spec, topology } = inputs;
  const positions = new Map(topology.nodes.flatMap(({ id, page1Pixel }) => page1Pixel ? [[id, page1Pixel]] : []));
  const xy = ([x, y]: [number, number]) => [(x - 759) * 1.38 + 163, (y - 294) * 1.38 + 139]
    .map((value) => String(Math.round(value * 10) / 10));
  const origin = spec.originNodeId;
  const targetIds = spec.destinationNodeIds;
  const pairedEdges = new Set(Object.values(spec.projectToEdge));
  const edges = topology.edges.filter(({ id }) => !spec.excludedEdgeIds.includes(id));
  const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const drawing = edges.map(({ id, from, to, intermediatePage1Pixels }) => {
    const points = [positions.get(from)!, ...intermediatePage1Pixels, positions.get(to)!]
      .map((position) => xy(position).join(',')).join(' ');
    const style = pairedEdges.has(id) ? 'pair' : id === spec.conditionalTransferEdgeId ? 'transfer' : 'walk';
    return '<polyline class="' + style + '" points="' + points + '"><title>' + escape(id) + '</title></polyline>';
  }).join('\n    ');
  const nodes = topology.nodes.flatMap(({ id, label, page1Pixel }) => {
    if (!page1Pixel) return [];
    const [x, y] = xy(page1Pixel);
    const marker = id === origin ? 'origin' : targetIds.includes(id) ? 'target' : 'junction';
    return ['<circle class="' + marker + '" cx="' + x + '" cy="' + y + '" r="'
      + (marker === 'junction' ? 4 : 8) + '"><title>' + escape(label) + '</title></circle>'];
  }).join('\n    ');

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="720" viewBox="0 0 1040 720" role="img" aria-labelledby="map-title map-desc">',
    '  <title id="map-title">Cañada College conditional curb-ramp study topology</title>',
    '  <desc id="map-desc">Schematic diagram digitized from the 2026 campus map. The middle Lot 1 crossing requires historical ramps 421 and 422 as a conditional pair. A separate assumed elevator transfer connects the north Building 9 approach to the Building 12 and Buildings 18 and 23 approaches. The southern 404 and 405 pair remains disconnected from these study endpoints. The drawing does not measure routes or establish accessibility.</desc>',
    '  <style>',
    '    text{font-family:Inter,Arial,sans-serif;fill:#17332c}',
    '    .heading{font-size:32px;font-weight:700}',
    '    .subhead{font-size:17px;fill:#415f57}',
    '    .label{font-size:14px;font-weight:700}',
    '    .legend{font-size:17px;font-weight:700}',
    '    .detail{font-size:15px;fill:#415f57}',
    '    .walk,.pair,.transfer{fill:none;stroke-linecap:round;stroke-linejoin:round}',
    '    .walk{stroke:#708c81;stroke-width:3.5}',
    '    .pair{stroke:#684395;stroke-width:8}',
    '    .transfer{stroke:#a95716;stroke-width:4;stroke-dasharray:5 5}',
    '    .junction{fill:#f7faf7;stroke:#58786c;stroke-width:1.5}',
    '    .origin{fill:#1e6652;stroke:#fff;stroke-width:2}',
    '    .target{fill:#fff;stroke:#1e6652;stroke-width:3}',
    '    .leader{fill:none;stroke:#8aa296;stroke-width:1.3}',
    '  </style>',
    '  <rect width="1040" height="720" fill="#eef4ef"/>',
    '  <text x="37" y="50" class="heading">Cañada College study topology</text>',
    '  <text x="38" y="77" class="subhead">Public campus map geometry with conditional 2020 ramp associations</text>',
    '  <rect x="36" y="101" width="543" height="570" rx="15" fill="#fff" stroke="#c7d6ce"/>',
    '  <rect x="599" y="101" width="405" height="570" rx="15" fill="#fff" stroke="#c7d6ce"/>',
    '  <g>',
    '    ' + drawing,
    '    ' + nodes,
    '  </g>',
    '  <path class="leader" d="M461 139 H482"/>',
    '  <text x="489" y="144" class="label">Upper Lot 1</text>',
    '  <path class="leader" d="M330 208 H292"/>',
    '  <text x="285" y="213" class="label" text-anchor="end">Buildings 18/23 approach</text>',
    '  <path class="leader" d="M163 510 L135 535 H82"/>',
    '  <text x="81" y="556" class="label">Building 12/13 approach</text>',
    '  <path class="leader" d="M365 376 L382 347 H397"/>',
    '  <text x="403" y="342" class="label">Building 9 north</text>',
    '  <text x="403" y="360" class="label">elevator approach</text>',
    '  <path class="leader" d="M468 525 L481 552 H500"/>',
    '  <text x="543" y="573" class="label" text-anchor="end">Middle Lot 1 origin</text>',
    '  <text x="421" y="637" class="label">Lot 2</text>',
    '  <text x="74" y="639" class="detail">Separate southern component</text>',
    '  <text x="627" y="144" class="legend">How to read the map</text>',
    '  <path class="walk" d="M630 177 H665"/>',
    '  <text x="681" y="182" class="detail">Mapped path or roadway crossing</text>',
    '  <path class="pair" d="M630 216 H665"/>',
    '  <text x="681" y="221" class="detail">Crossing with inferred ramp pair</text>',
    '  <path class="transfer" d="M630 254 H665"/>',
    '  <text x="681" y="259" class="detail">Conditional Building 9 transfer</text>',
    '  <circle class="origin" cx="646" cy="292" r="8"/>',
    '  <text x="681" y="297" class="detail">Fixed study origin</text>',
    '  <circle class="target" cx="646" cy="328" r="8"/>',
    '  <text x="681" y="333" class="detail">Modeled exterior approach point</text>',
    '  <path d="M627 356 H975" stroke="#d6e2da"/>',
    '  <text x="627" y="392" class="legend">Middle crossing · 421 + 422</text>',
    '  <text x="627" y="418" class="detail">Both assemblies are required in the model.</text>',
    '  <text x="627" y="444" class="detail">The far-side points also require the transfer.</text>',
    '  <text x="627" y="492" class="legend">Southern crossing · 404 + 405</text>',
    '  <text x="627" y="518" class="detail">Both projects stay in the budget comparison.</text>',
    '  <text x="627" y="544" class="detail">Their component has no mapped route from</text>',
    '  <text x="627" y="567" class="detail">the middle Lot 1 origin.</text>',
    '  <text x="627" y="624" class="label">The drawing supplies no measured distances.</text>',
    '  <text x="38" y="701" class="detail">Source drawing digitized at schematic scale. Current access and asset-to-edge assignments remain unverified.</text>',
    '</svg>',
    '',
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  assert.ok(!args.length || (args.length === 1 && args[0] === '--check'), 'Expected no arguments or --check');
  const inputs = readInputs(studyRoot);
  const results = runStudy(inputs);
  const claims = buildClaims(inputs, results);
  const files = {
    'results.json': json(results),
    'results.csv': buildCsv(results),
    'claims.json': json(claims),
    'README.md': buildReport(inputs, results, claims),
    'topology.svg': buildTopologySvg(inputs),
  };
  if (!args.length) mkdirSync(reportPath, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    const path = join(reportPath, name);
    if (args.length) assert.ok(readFileSync(path).equals(Buffer.from(contents)), 'Artifact differs: ' + name);
    else writeFileSync(path, contents, 'utf8');
  }
  console.log(JSON.stringify({
    mode: args.length ? 'byte-identical' : 'generated',
    scenarios: results.scenarios.length,
    costVariants: results.scenarios[0].variants.length,
    budgetCases: claims.comparison.nominal.cases + claims.comparison.stress.cases,
    strategyRows: (claims.comparison.nominal.cases + claims.comparison.stress.cases) * strategyIds.length,
    fullyEvaluatedSubsets: results.scenarios.reduce((count, scenario) =>
      count + scenario.variants.reduce((sum, variant) => sum + variant.subsets.length, 0), 0),
  }));
}

main();
