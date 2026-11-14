import {
  TRIP_ERROR_HTTP_STATUS,
  TripRequestSchema,
  TripResponseSchema,
  TripScenarioResponseSchema,
  type TripErrorCode,
  type TripEvaluation,
  type TripFailure,
  type TripRequest,
  type TripScenario,
} from '../../contracts/curb/trips';
import { validateTripScenario } from '../../domain/curb/trips';

export class TripFetchError extends Error {
  constructor(
    message: string,
    public readonly code: TripErrorCode | 'INVALID_RESPONSE',
    public readonly status: number,
  ) {
    super(message);
    this.name = 'TripFetchError';
  }
}

async function readResponse(response: Response, signal: AbortSignal): Promise<unknown> {
  signal.throwIfAborted();

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    signal.throwIfAborted();
    throw new TripFetchError('The trip response was not JSON.', 'INVALID_RESPONSE', response.status);
  }
  signal.throwIfAborted();
  return body;
}

function unwrapResponse<T>(
  envelope: { ok: true; data: T } | TripFailure,
  status: number,
): T {
  const expectedStatus = envelope.ok ? 200 : TRIP_ERROR_HTTP_STATUS[envelope.error.code];
  if (status !== expectedStatus) {
    throw new TripFetchError(
      'The trip response status did not match its body.',
      'INVALID_RESPONSE',
      status,
    );
  }
  if (!envelope.ok) {
    throw new TripFetchError(envelope.error.message, envelope.error.code, status);
  }
  return envelope.data;
}

export async function fetchTripScenario(
  signal: AbortSignal,
  scenarioId?: string,
): Promise<TripScenario> {
  signal.throwIfAborted();

  const query = scenarioId === undefined ? '' : `?${new URLSearchParams({ scenarioId })}`;
  const response = await fetch(`/api/curb/trip-scenario${query}`, { signal, cache: 'no-store' });
  const body = await readResponse(response, signal);
  signal.throwIfAborted();
  const result = TripScenarioResponseSchema.safeParse(body);
  if (!result.success) {
    throw new TripFetchError('The trip scenario response was invalid.', 'INVALID_RESPONSE', response.status);
  }

  const scenario = unwrapResponse(result.data, response.status);
  if (scenarioId !== undefined && scenario.scenario.id !== scenarioId) {
    throw new TripFetchError(
      'The trip scenario response did not match the requested scenario.',
      'INVALID_RESPONSE',
      response.status,
    );
  }
  try {
    return validateTripScenario(scenario);
  } catch {
    throw new TripFetchError(
      'The trip scenario response contained invalid relationships.',
      'INVALID_RESPONSE',
      response.status,
    );
  }
}

export async function fetchTrip(
  request: TripRequest,
  signal: AbortSignal,
): Promise<TripEvaluation> {
  signal.throwIfAborted();

  // Capture the exact posted selection before awaiting a response. A caller may
  // change its own selection object while this request is in flight.
  const postedRequest = TripRequestSchema.parse(request);
  const response = await fetch('/api/curb/trip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postedRequest),
    signal,
    cache: 'no-store',
  });
  const body = await readResponse(response, signal);
  signal.throwIfAborted();
  const result = TripResponseSchema.safeParse(body);
  if (!result.success) {
    throw new TripFetchError('The trip evaluation response was invalid.', 'INVALID_RESPONSE', response.status);
  }

  const evaluation = unwrapResponse(result.data, response.status);
  const identityFields = [
    'contractVersion', 'scenarioId', 'revision', 'profileId',
    'originNodeId', 'destinationId', 'repairId',
  ] as const;
  if (identityFields.some((field) => evaluation[field] !== postedRequest[field])) {
    throw new TripFetchError(
      'The trip evaluation response did not match the requested selection.',
      'INVALID_RESPONSE',
      response.status,
    );
  }
  return evaluation;
}
