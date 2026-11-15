/** Input construction only. This module never invokes a comparison or route evaluator. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PlanScenario } from '../../../src/contracts/curb/plans';
import { validatePlanScenario } from '../../../src/domain/curb/plans';
import {
  FAMILIES, SEEDS, PRICE_SET_CENTS, POLICY_RULES, LIMITATIONS,
  METRICS_VERSION, SUITE_VERSION, budgetsFor, eligibleCost, validateSuite,
  stableStringify, sha256, cliArgs, isMain, type Family, type Network, type Suite,
} from './spec';

const GENERATOR_RULES = [
  'Construction frozen before policy measurements. No seed search, outcome filtering, retries, or invalid-case regeneration.',
  'Exactly eight repairs and eight distinct destination nodes per network. Destination 0 has a direct known-pass baseline edge; additional baseline access is allowed.',
  'Destination roles 1–7 use a seeded Fisher-Yates permutation. Fixed topology templates use 12–17 nodes. No real coordinates or observations are used.',
  'Each edge length is 10 + nextUint32 modulo 41 synthetic meters. At repair creation draw price index modulo 6, then severity 1 + nextUint32 modulo 5. All known costs are positive assumed cents from the declared price set.',
  'Independent: seven separately blocked destination spokes, each with its own known approach, and one separately blocked alternative entrance to the first permuted destination.',
  'Serial: disjoint chains of 3, 2, 2, and 1 blockers feed destination groups of 2, 2, 2, and 1 respectively.',
  'Shared: two singly blocked shared hubs feed three destinations each; each hub has two blocked destination branches and one pass branch. A final two-blocker chain feeds the seventh destination.',
  'Alternatives: a four-junction directed pass ring has two separately blocked entrances, six singly blocked destination exits, a pass seventh exit, and one direct known-pass bypass to a seeded destination among the first six. Exit direction is a seeded Boolean; entrances are directed into the ring.',
  'Mixed: a two-blocker chain feeds two destinations; a one-blocker shared hub feeds one pass and one blocked destination; one independent blocked destination; two separately blocked alternative approaches feed destination six, with a blocked branch to destination seven. Two additional directed pass crosslinks are independently included when nextUint32 modulo 2 is 1.',
  'Incomplete uses the alternatives template. Entrance A remains unknown even after its blocker is cleared, the seventh destination exit is unknown, and repair 6 has unknown cost. Entrance B, the ring and the other preauthored alternatives remain known. Exactly two unknown assessments and one unknown-cost candidate are retained.',
  'Budgets are floor(K/4), floor(K/2), floor(3K/4), and K, where K sums eligible known costs. All four must be distinct positive integers or generation fails.',
] as const;

/** FNV-1a over ASCII family ID, XOR seed, followed by xorshift32. */
export function familyPrng(family: Family, seed: number): () => number {
  let familyHash = 2166136261;
  for (let i = 0; i < family.length; i += 1) familyHash = Math.imul(familyHash ^ family.charCodeAt(i), 16777619) >>> 0;
  let state = (familyHash ^ seed) >>> 0;
  if (state === 0) throw new Error('Zero PRNG state is invalid; do not regenerate');
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

export function generateNetwork(family: Family, seed: number): Network {
  if (!FAMILIES.includes(family) || !(SEEDS as readonly number[]).includes(seed)) throw new Error('Undeclared family/seed');
  const next = familyPrng(family, seed);
  const roles = [1, 2, 3, 4, 5, 6, 7];
  for (let i = roles.length - 1; i > 0; i -= 1) {
    const j = next() % (i + 1);
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  const destination = (role: number) => `destination-node-${roles[role - 1]}`;
  const scenarioId = `${family}-${seed}`;
  const plan: PlanScenario = {
    schemaVersion: 1, contractVersion: 'curb-r2',
    scenario: { schemaVersion: 1, id: scenarioId, revision: 1, title: `Synthetic ${family} network, seed ${seed}`, dataKind: 'synthetic', nodes: [], edges: [], destinations: [], barriers: [], evidence: [] },
    profile: { id: 'step-free-demo', label: 'Synthetic step-free profile', description: 'Known access requires known edge assessments and every named blocker cleared. No legal compliance or real navigation claim.' },
    assumptions: [
      'All topology, coordinates, lengths, severities, costs and repair effects are synthetic authored inputs, not field measurements.',
      'Every destination has weight one. Unknown routes provide no demonstrated access; unknown costs are not zero.',
      'Repairs clear only their named blocker. Unknown assessments remain unknown after blocker removal.',
      'Known costs are assumed USD cents. This objective omits hazard reduction, partial progress and mandatory-work constraints.',
    ],
    edgeAssessments: [], repairs: [], originNodeId: 'origin', destinationIds: [], candidates: [], defaultBudgetCents: 0,
  };
  const addNode = (id: string) => {
    if (plan.scenario.nodes.some(n => n.id === id)) throw new Error(`Duplicate node ${id}`);
    const index = plan.scenario.nodes.length;
    plan.scenario.nodes.push({ id, coordinate: [index % 5 / 1000, Math.floor(index / 5) / 1000], label: id });
    return id;
  };
  addNode('origin');
  for (let i = 0; i < 8; i += 1) {
    addNode(`destination-node-${i}`);
    plan.scenario.destinations.push({ id: `destination-${i}`, label: `Synthetic destination ${i}`, nodeId: `destination-node-${i}` });
    plan.destinationIds.push(`destination-${i}`);
  }
  let repairCount = 0;
  const addEdge = (id: string, from: string, to: string, options: { repair?: boolean; bidirectional?: boolean; unknown?: boolean; unknownCost?: boolean } = {}) => {
    const fromNode = plan.scenario.nodes.find(n => n.id === from);
    const toNode = plan.scenario.nodes.find(n => n.id === to);
    if (!fromNode || !toNode) throw new Error(`Missing endpoint for ${id}`);
    const barrierIds: string[] = [];
    const lengthMeters = 10 + next() % 41;
    if (options.repair) {
      repairCount += 1;
      const suffix = String(repairCount).padStart(2, '0');
      const barrierId = `barrier-${suffix}`;
      const repairId = `repair-${suffix}`;
      const evidenceId = `evidence-${suffix}`;
      const assumedCost = PRICE_SET_CENTS[next() % PRICE_SET_CENTS.length];
      const severity = 1 + next() % 5;
      barrierIds.push(barrierId);
      plan.scenario.barriers.push({ id: barrierId, edgeId: id, kind: 'obstruction', reviewStatus: 'accepted', evidenceIds: [evidenceId], note: 'Synthetic modeled blocker; review status does not establish field access.' });
      plan.scenario.evidence.push({ id: evidenceId, kind: 'note', origin: 'synthetic', caption: `Authored blocker ${suffix}`, note: 'Generated synthetic assumption; no campus observation, photograph or measurement.' });
      plan.repairs.push({ id: repairId, label: `Synthetic repair ${suffix}`, barrierId, description: 'Hypothetically clear this named blocker only; unknown coverage remains unknown.' });
      plan.candidates.push({ repairId, severity: { score: severity, rationale: 'Seeded authored condition score, independent of destination access.' }, cost: options.unknownCost ? { status: 'unknown', cents: null, source: 'Deliberately unknown synthetic cost; candidate excluded from every policy.' } : { status: 'assumed', cents: assumedCost, source: 'Fixed generator price-set draw in assumed USD cents; not a contractor quote.' } });
    }
    plan.scenario.edges.push({ id, fromNodeId: from, toNodeId: to, geometry: { type: 'LineString', coordinates: [fromNode.coordinate, toNode.coordinate] }, lengthMeters, bidirectional: options.bidirectional ?? true, barrierIds });
    plan.edgeAssessments.push({ edgeId: id, kind: 'walkway', status: options.unknown ? 'unknown' : barrierIds.length ? 'blocked' : 'pass', blockingBarrierIds: [...barrierIds], reason: options.unknown ? 'Deliberately unknown synthetic assessment; removing any named blocker does not establish a known route.' : barrierIds.length ? 'Synthetic known assessment names every modeled blocker on this edge.' : 'Synthetic authored known-pass edge.' });
  };
  addEdge('baseline', 'origin', 'destination-node-0');

  if (family === 'independent') {
    for (let i = 1; i <= 7; i += 1) {
      const approach = addNode(`approach-${i}`);
      addEdge(`approach-${i}-pass`, 'origin', approach);
      addEdge(`approach-${i}-blocked`, approach, destination(i), { repair: true });
    }
    addEdge('alternative-entrance', 'origin', destination(1), { repair: true });
  } else if (family === 'serial') {
    const chainLengths = [3, 2, 2, 1];
    let nextRole = 1;
    for (let group = 0; group < chainLengths.length; group += 1) {
      let previous = 'origin';
      for (let step = 1; step <= chainLengths[group]; step += 1) {
        const node = addNode(`chain-${group + 1}-${step}`);
        addEdge(`chain-${group + 1}-edge-${step}`, previous, node, { repair: true });
        previous = node;
      }
      const branches = group === 3 ? 1 : 2;
      for (let branch = 0; branch < branches; branch += 1) addEdge(`chain-${group + 1}-destination-${branch + 1}`, previous, destination(nextRole++));
    }
  } else if (family === 'shared') {
    for (let group = 0; group < 2; group += 1) {
      const hub = addNode(`shared-hub-${group + 1}`);
      addEdge(`shared-gate-${group + 1}`, 'origin', hub, { repair: true });
      for (let branch = 1; branch <= 3; branch += 1) addEdge(`shared-${group + 1}-branch-${branch}`, hub, destination(group * 3 + branch), { repair: branch < 3 });
    }
    const midpoint = addNode('serial-midpoint');
    addEdge('serial-start', 'origin', midpoint, { repair: true });
    addEdge('serial-end', midpoint, destination(7), { repair: true });
  } else if (family === 'alternatives' || family === 'incomplete') {
    for (let i = 1; i <= 4; i += 1) addNode(`ring-${i}`);
    for (let i = 1; i <= 4; i += 1) addEdge(`ring-arc-${i}`, `ring-${i}`, `ring-${i % 4 + 1}`, { bidirectional: false });
    addEdge('entrance-a', 'origin', 'ring-1', { repair: true, bidirectional: false, unknown: family === 'incomplete' });
    addEdge('entrance-b', 'origin', 'ring-3', { repair: true, bidirectional: false });
    for (let role = 1; role <= 6; role += 1) {
      const bidirectional = next() % 2 === 1;
      addEdge(`ring-exit-${role}`, `ring-${(role - 1) % 4 + 1}`, destination(role), { repair: true, bidirectional, unknownCost: family === 'incomplete' && role === 4 });
    }
    addEdge('ring-exit-7', 'ring-4', destination(7), { unknown: family === 'incomplete', bidirectional: false });
    addEdge('known-bypass', 'origin', destination(1 + next() % 6), { bidirectional: false });
  } else {
    const serial1 = addNode('mixed-serial-1');
    const serial2 = addNode('mixed-serial-2');
    const hub = addNode('mixed-shared');
    const alternate1 = addNode('mixed-alternate-1');
    const alternate2 = addNode('mixed-alternate-2');
    addEdge('mixed-serial-start', 'origin', serial1, { repair: true });
    addEdge('mixed-serial-end', serial1, serial2, { repair: true });
    addEdge('mixed-serial-destination-1', serial2, destination(1));
    addEdge('mixed-serial-destination-2', serial2, destination(2));
    addEdge('mixed-shared-gate', 'origin', hub, { repair: true });
    addEdge('mixed-shared-pass', hub, destination(3));
    addEdge('mixed-shared-blocked', hub, destination(4), { repair: true });
    addEdge('mixed-independent', 'origin', destination(5), { repair: true });
    addEdge('mixed-alternative-a', 'origin', alternate1, { repair: true });
    addEdge('mixed-alternative-a-exit', alternate1, destination(6));
    addEdge('mixed-alternative-b', 'origin', alternate2, { repair: true });
    addEdge('mixed-alternative-b-exit', alternate2, destination(6));
    addEdge('mixed-last-branch', alternate2, destination(7), { repair: true });
    if (next() % 2 === 1) addEdge('mixed-alternative-crosslink', alternate1, alternate2, { bidirectional: false });
    if (next() % 2 === 1) addEdge('mixed-destination-crosslink', destination(2), destination(5), { bidirectional: false });
  }
  if (repairCount !== 8) throw new Error(`Construction produced ${repairCount} repairs`);
  plan.defaultBudgetCents = Math.floor(eligibleCost(plan) / 2);
  const validated = validatePlanScenario(plan);
  return { id: scenarioId, family, seed, authoredBaselineDestinationId: 'destination-0', plan: validated, eligibleCostCents: eligibleCost(validated), budgets: budgetsFor(validated) };
}

export function generateSuite(): Suite {
  return validateSuite({
    schemaVersion: METRICS_VERSION, suiteVersion: SUITE_VERSION,
    generator: { version: 1, prng: 'xorshift32: x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0', derivation: 'FNV-1a 32-bit of ASCII family ID starting at 2166136261 with multiplier 16777619; initial xorshift state = (familyHash XOR integer seed) >>> 0. A zero initial state fails. Every bounded draw uses unsigned output modulo bound; no redraw.', rules: [...GENERATOR_RULES], priceSetCents: [...PRICE_SET_CENTS], seeds: [...SEEDS] },
    policies: { ...POLICY_RULES },
    metric: 'G(S) = size(R(S) minus R(empty)), where R contains only destinations with known traversable routes. All eight destinations have equal weight; unknown access earns no credit.',
    limitations: [...LIMITATIONS],
    networks: FAMILIES.flatMap(family => SEEDS.map(seed => generateNetwork(family, seed))),
  });
}

export function writeSuite(output: string): { sha256: string; networks: number; cases: number } {
  const suite = generateSuite();
  const bytes = stableStringify(suite);
  if (existsSync(output) && readFileSync(output, 'utf8') !== bytes) throw new Error('Refusing to overwrite different frozen inputs; use a new suite revision and retain the failed receipt');
  mkdirSync(dirname(output), { recursive: true });
  if (!existsSync(output)) writeFileSync(output, bytes, { flag: 'wx' });
  return { sha256: sha256(bytes), networks: suite.networks.length, cases: suite.networks.reduce((sum, network) => sum + network.budgets.length, 0) };
}

if (isMain(import.meta.url)) {
  try {
    const args = cliArgs();
    if (Object.keys(args).some(key => key !== '--output')) throw new Error('Usage: generate.ts --output <suite.json>');
    console.log(JSON.stringify(writeSuite(args['--output'] ?? 'benchmarks/curb-metrics/suite-v1.json')));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
