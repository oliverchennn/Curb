import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLAN_CONTRACT_VERSION, type PlanScenario } from '../../../src/contracts/curb/plans';
import { STEP_FREE_PROFILE_ID } from '../../../src/contracts/curb/trips';

export const FREEZE_COMMIT = '53363bcf114abe7c08d062a281d441db806127a3';
export const KERNEL_COMMIT = '2756c4b344a667fbe2e143076b8bde55609db617';

const manifestPath = 'research/curb/canada-map-study/input-manifest.json';
const specPath = 'research/curb/canada-map-study/study-spec.json';
const manifestHash = '680ff922c2bce887bcd65752469525d2a6b6b48d1f968473406088b3456b13ea';

type Point = [number, number];

interface TopologyEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
  intermediatePage1Pixels: Point[];
}

interface Topology {
  coordinateBasis: { widthPx: number; heightPx: number };
  sources: { id: string; url: string }[];
  nodes: { id: string; label: string; page1Pixel: Point | null }[];
  edges: TopologyEdge[];
}

interface Project {
  id: string;
  action: string;
  costCents: number;
  costBasis: string;
  baseYear: number;
  currency: string;
  eligible: boolean;
}

interface InputHash {
  path: string;
  sha256: string;
}

export interface MappingScenario {
  id: string;
  label: string;
  otherConditionsAssumedResolved: boolean;
  historicalMappingAssumed: boolean;
  verticalTransferAssumed: boolean;
}

interface StudySpec {
  schemaVersion: number;
  studyId: string;
  disposition: string;
  title: string;
  baseCommit: string;
  inputPaths: { topology: string; projects: string };
  originNodeId: string;
  destinationNodeIds: string[];
  destinationLabels: string[];
  projectIds: string[];
  projectCostCents: number[];
  nominalTotalCents: number;
  budgetCents: number[];
  currency: string;
  costBaseYear: number;
  projectToEdge: Record<string, string>;
  excludedEdgeIds: string[];
  conditionalTransferEdgeId: string;
  assumptions: { id: string; text: string }[];
  scenarios: MappingScenario[];
  sensitivity: { costMultipliersPercent: number[] };
  singleOriginLimitation: string;
}

export type Inputs = ReturnType<typeof readInputs>;

export function readInputs(root: string) {
  const read = (path: string) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
  const digest = (text: string) => createHash('sha256').update(text).digest('hex');
  const manifestText = read(manifestPath);
  assert.equal(digest(manifestText), manifestHash, 'Frozen input manifest changed');
  const { inputs: inputHashes } = JSON.parse(manifestText) as { inputs: InputHash[] };
  const texts = new Map(inputHashes.map(({ path, sha256 }) => {
    const content = read(path);
    assert.equal(digest(content), sha256, 'Frozen input changed: ' + path);
    return [path, content] as const;
  }));

  const spec = JSON.parse(texts.get(specPath)!) as StudySpec;
  assert.equal(spec.baseCommit, KERNEL_COMMIT);
  assert.deepEqual([...texts.keys()], [specPath, spec.inputPaths.topology, spec.inputPaths.projects]);
  const topology = JSON.parse(texts.get(spec.inputPaths.topology)!) as Topology;
  const { projects } = JSON.parse(texts.get(spec.inputPaths.projects)!) as { projects: Project[] };
  assert.deepEqual(projects.map(({ id }) => id), spec.projectIds);
  assert.deepEqual(projects.map(({ costCents }) => costCents), spec.projectCostCents);
  assert.equal(projects.reduce((sum, project) => sum + project.costCents, 0), spec.nominalTotalCents);
  for (const project of projects) {
    assert.equal(project.eligible, false, 'Inventory-only source must remain ineligible');
    assert.equal(project.currency, spec.currency);
    assert.equal(project.baseYear, spec.costBaseYear);
    assert.equal(project.costBasis, 'published_estimate');
    assert.ok(topology.edges.some(({ id }) => id === spec.projectToEdge[project.id]));
  }
  return { spec, topology, projects, inputHashes };
}

function blockerId(projectId: string) {
  return 'study-blocker-' + projectId;
}

export function buildPlan(inputs: Inputs, mapping: MappingScenario, projectCostCents: number[]): PlanScenario {
  const { topology, spec, projects } = inputs;
  const pixels = new Map(topology.nodes.flatMap(({ id, page1Pixel }) => page1Pixel ? [[id, page1Pixel]] : []));
  const edges = topology.edges.filter(({ id }) => !spec.excludedEdgeIds.includes(id));
  const { widthPx, heightPx } = topology.coordinateBasis;

  // Shape-preserving normalized pixels satisfy the private adapter's graph contract.
  // They are not surveyed coordinates. The one-unit weights represent graph hops.
  const coordinate = ([x, y]: Point): Point => [x / widthPx, -y / heightPx];
  const blockingIds = (edgeId: string) => projects
    .filter(({ id }) => spec.projectToEdge[id] === edgeId)
    .map(({ id }) => blockerId(id));
  const edgeAssessments: PlanScenario['edgeAssessments'] = edges.map(({ id, kind }) => {
    const blockingBarrierIds = blockingIds(id);
    const assumptionsAllow = mapping.otherConditionsAssumedResolved
      && (!blockingBarrierIds.length || mapping.historicalMappingAssumed)
      && (id !== spec.conditionalTransferEdgeId || mapping.verticalTransferAssumed);
    return {
      edgeId: id,
      kind: kind === 'mapped-road-crossing' ? 'crossing' : 'walkway',
      status: assumptionsAllow ? (blockingBarrierIds.length ? 'blocked' : 'pass') : 'unknown',
      blockingBarrierIds,
      reason: assumptionsAllow
        ? 'Conditional planning assumption for this study only.'
        : 'Coverage remains unresolved in this study scenario.',
    };
  });

  // Repair IDs have to target a named adapter blocker to remain eligible. An unknown
  // edge stays unknown when cleared, so these IDs cannot authorize an unconfirmed crossing.
  return {
    schemaVersion: 1,
    contractVersion: PLAN_CONTRACT_VERSION,
    profile: {
      id: STEP_FREE_PROFILE_ID,
      label: 'Conditional modeled connection',
      description: 'Private R1 transport for a schematic study under declared assumptions.',
    },
    assumptions: spec.assumptions.map(({ text }) => text),
    scenario: {
      schemaVersion: 1,
      id: spec.studyId + '-' + mapping.id,
      revision: 1,
      title: mapping.label,
      dataKind: 'synthetic',
      nodes: topology.nodes.flatMap(({ id, label, page1Pixel }) => page1Pixel
        ? [{ id, label, coordinate: coordinate(page1Pixel) }] : []),
      edges: edges.map(({ id, from, to, intermediatePage1Pixels }) => {
        const start = pixels.get(from);
        const end = pixels.get(to);
        assert.ok(start && end, 'Edge is missing a mapped endpoint: ' + id);
        return {
          id, fromNodeId: from, toNodeId: to, bidirectional: true, lengthMeters: 1,
          geometry: {
            type: 'LineString',
            coordinates: [start, ...intermediatePage1Pixels, end].map(coordinate),
          },
          barrierIds: blockingIds(id),
        };
      }),
      destinations: spec.destinationNodeIds.map((id, index) => ({
        id, nodeId: id, label: spec.destinationLabels[index],
      })),
      barriers: projects.map(({ id }) => ({
        id: blockerId(id), edgeId: spec.projectToEdge[id], kind: 'unknown',
        reviewStatus: 'pending', evidenceIds: [],
        note: 'Hypothetical ramp association, no field traversability statement.',
      })),
      evidence: [],
    },
    edgeAssessments,
    repairs: projects.map(({ id, action }) => ({
      id, label: id, barrierId: blockerId(id), description: action,
    })),
    candidates: projects.map(({ id }, index) => ({
      repairId: id,
      severity: { score: 1, rationale: 'Neutral adapter input. No published priority comparison.' },
      cost: {
        status: 'assumed',
        cents: projectCostCents[index],
        source: '2020 published replacement estimate, scaled only for cost sensitivity.',
      },
    })),
    originNodeId: spec.originNodeId,
    destinationIds: spec.destinationNodeIds,
    defaultBudgetCents: spec.budgetCents.at(-1)!,
  };
}
