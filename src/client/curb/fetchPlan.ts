import {
  matchesPlanRequest,
  PLAN_ERROR_HTTP_STATUS,
  PlanRequestSchema,
  PlanResponseSchema,
  PlanScenarioQuerySchema,
  PlanScenarioResponseSchema,
  type PlanComparison,
  type PlanErrorCode,
  type PlanFailure,
  type PlanRequest,
  type PlanScenario,
} from '../../contracts/curb/plans';

export class PlanFetchError extends Error {
  constructor(
    message: string,
    public readonly code: PlanErrorCode | 'INVALID_RESPONSE',
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PlanFetchError';
  }
}

async function fetchJson(
  url: string,
  signal: AbortSignal,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal, cache: 'no-store' });
  } catch (error) {
    signal.throwIfAborted();
    throw error;
  }
  signal.throwIfAborted();

  const { status } = response;
  try {
    return { status, body: await response.json() };
  } catch {
    signal.throwIfAborted();
    throw new PlanFetchError('The plan response contained invalid JSON.', 'INVALID_RESPONSE', status);
  }
}

function unwrapResponse<T>(envelope: { ok: true; data: T } | PlanFailure, status: number): T {
  const expectedStatus = envelope.ok ? 200 : PLAN_ERROR_HTTP_STATUS[envelope.error.code];
  if (status !== expectedStatus) {
    throw new PlanFetchError(
      'The plan response status did not match its body.',
      'INVALID_RESPONSE',
      status,
    );
  }
  if (!envelope.ok) {
    const { code, message } = envelope.error;
    throw new PlanFetchError(message, code, status);
  }
  return envelope.data;
}

export async function fetchPlanScenario(
  signal: AbortSignal,
  scenarioId?: string,
): Promise<PlanScenario> {
  signal.throwIfAborted();

  const { scenarioId: requestedId } = PlanScenarioQuerySchema.parse({ scenarioId });
  const query = requestedId === undefined ? '' : `?${new URLSearchParams({ scenarioId: requestedId })}`;
  const { status, body } = await fetchJson(`/api/curb/plan-scenario${query}`, signal);
  signal.throwIfAborted();

  const result = PlanScenarioResponseSchema.safeParse(body);
  if (!result.success) {
    throw new PlanFetchError('The plan scenario response was invalid.', 'INVALID_RESPONSE', status);
  }

  const scenario = unwrapResponse(result.data, status);
  if (requestedId !== undefined && scenario.scenario.id !== requestedId) {
    throw new PlanFetchError(
      'The plan scenario response did not match the requested scenario.',
      'INVALID_RESPONSE',
      status,
    );
  }
  return scenario;
}

export async function fetchPlan(request: PlanRequest, signal: AbortSignal): Promise<PlanComparison> {
  signal.throwIfAborted();

  // Capture the submitted selection before the caller can change it in flight.
  const postedRequest = PlanRequestSchema.parse(request);
  const { status, body } = await fetchJson('/api/curb/plan', signal, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postedRequest),
  });
  signal.throwIfAborted();

  const result = PlanResponseSchema.safeParse(body);
  if (!result.success) {
    throw new PlanFetchError('The plan comparison response was invalid.', 'INVALID_RESPONSE', status);
  }

  const comparison = unwrapResponse(result.data, status);
  if (!matchesPlanRequest(comparison, postedRequest)) {
    throw new PlanFetchError(
      'The plan comparison response did not match the requested selection.',
      'INVALID_RESPONSE',
      status,
    );
  }
  return comparison;
}
