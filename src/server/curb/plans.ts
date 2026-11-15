import {
  PLAN_CONTRACT_VERSION,
  PLAN_ERROR_HTTP_STATUS,
  PlanFailureSchema,
  PlanRequestSchema,
  PlanResponseSchema,
  PlanScenarioQuerySchema,
  PlanScenarioResponseSchema,
  PlanScenarioSchema,
  matchesPlanRequest,
  matchesPlanScenario,
  type PlanErrorCode,
  type PlanFailure,
  type PlanResponse,
  type PlanScenario,
  type PlanScenarioResponse,
} from '../../contracts/curb/plans';
import investmentDemo from '../../data/curb/investment-demo.json';
import planDemo from '../../data/curb/plan-demo.json';
import { comparePlans, PlanRequestError, validatePlanScenario } from '../../domain/curb/plans';

const DEFAULT_SCENARIO_ID = 'synthetic-campus-repair-plans';
const planFixtures = new Map<string, unknown>([
  [DEFAULT_SCENARIO_ID, planDemo],
  ['synthetic-campus-investment', investmentDemo],
]);

const errorMessages = {
  INVALID_REQUEST: 'The repair plan request is invalid.',
  SCENARIO_NOT_FOUND: 'The requested repair plan scenario was not found.',
  STALE_SCENARIO: 'The repair plan scenario has changed. Reload it and try again.',
  INVALID_SERVER_SCENARIO: 'The repair plan scenario could not be evaluated.',
} satisfies Record<PlanErrorCode, string>;

function failure(code: PlanErrorCode): { status: number; body: PlanFailure } {
  return {
    status: PLAN_ERROR_HTTP_STATUS[code],
    body: PlanFailureSchema.parse({
      contractVersion: PLAN_CONTRACT_VERSION,
      ok: false,
      error: { code, message: errorMessages[code] },
    }),
  };
}

function loadPlanScenario(scenarioId: string): PlanScenario {
  const scenario = PlanScenarioSchema.parse(validatePlanScenario(planFixtures.get(scenarioId)));
  if (scenario.scenario.id !== scenarioId) throw new Error('Plan fixture does not match its scenario ID.');
  return scenario;
}

export function getPlanScenarioResponse(query: unknown): {
  status: number;
  body: PlanScenarioResponse;
} {
  const selected = PlanScenarioQuerySchema.safeParse(query);
  if (!selected.success) return failure('INVALID_REQUEST');

  const scenarioId = selected.data.scenarioId ?? DEFAULT_SCENARIO_ID;
  if (!planFixtures.has(scenarioId)) return failure('SCENARIO_NOT_FOUND');

  try {
    const scenario = loadPlanScenario(scenarioId);
    return {
      status: 200,
      body: PlanScenarioResponseSchema.parse({
        contractVersion: PLAN_CONTRACT_VERSION, ok: true, data: scenario,
      }),
    };
  } catch {
    return failure('INVALID_SERVER_SCENARIO');
  }
}

export function getPlanResponse(input: unknown): {
  status: number;
  body: PlanResponse;
} {
  const selected = PlanRequestSchema.safeParse(input);
  if (!selected.success) return failure('INVALID_REQUEST');

  const request = selected.data;
  if (!planFixtures.has(request.scenarioId)) return failure('SCENARIO_NOT_FOUND');

  // A failure while loading the authoritative fixture is always a server error.
  let scenario: PlanScenario;
  try {
    scenario = loadPlanScenario(request.scenarioId);
  } catch {
    return failure('INVALID_SERVER_SCENARIO');
  }

  try {
    // Retain the submitted tuple for independent output validation.
    const body = PlanResponseSchema.parse({
      contractVersion: PLAN_CONTRACT_VERSION, ok: true, data: comparePlans(scenario, { ...request }),
    });
    if (!body.ok || !matchesPlanRequest(body.data, request) || !matchesPlanScenario(body.data, scenario)) {
      return failure('INVALID_SERVER_SCENARIO');
    }
    return { status: 200, body };
  } catch (error) {
    return failure(error instanceof PlanRequestError ? error.code : 'INVALID_SERVER_SCENARIO');
  }
}
