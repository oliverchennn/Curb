import {
  TRIP_CONTRACT_VERSION,
  TRIP_ERROR_HTTP_STATUS,
  TripEvaluationSchema,
  TripFailureSchema,
  TripRequestSchema,
  TripResponseSchema,
  TripScenarioQuerySchema,
  TripScenarioResponseSchema,
  type TripErrorCode,
  type TripFailure,
  type TripResponse,
  type TripScenario,
  type TripScenarioResponse,
} from '../../contracts/curb/trips';
import tripDemo from '../../data/curb/trip-demo.json';
import { evaluateTrip, TripRequestError, validateTripScenario } from '../../domain/curb/trips';

const errorMessages = {
  INVALID_REQUEST: 'The trip request is invalid.',
  SCENARIO_NOT_FOUND: 'The requested trip scenario was not found.',
  STALE_SCENARIO: 'The trip scenario has changed. Reload it and try again.',
  INVALID_SERVER_SCENARIO: 'The trip scenario could not be evaluated.',
} satisfies Record<TripErrorCode, string>;

function failure(code: TripErrorCode): { status: number; body: TripFailure } {
  return {
    status: TRIP_ERROR_HTTP_STATUS[code],
    body: TripFailureSchema.parse({
      contractVersion: TRIP_CONTRACT_VERSION,
      ok: false,
      error: { code, message: errorMessages[code] },
    }),
  };
}

export function getTripScenarioResponse(query: unknown): {
  status: number;
  body: TripScenarioResponse;
} {
  const selected = TripScenarioQuerySchema.safeParse(query);
  if (!selected.success) return failure('INVALID_REQUEST');

  try {
    const scenario = validateTripScenario(tripDemo);
    if (selected.data.scenarioId !== undefined && selected.data.scenarioId !== scenario.scenario.id) {
      return failure('SCENARIO_NOT_FOUND');
    }
    return {
      status: 200,
      body: TripScenarioResponseSchema.parse({
        contractVersion: TRIP_CONTRACT_VERSION, ok: true, data: scenario,
      }),
    };
  } catch {
    return failure('INVALID_SERVER_SCENARIO');
  }
}

export function getTripResponse(input: unknown): {
  status: number;
  body: TripResponse;
} {
  const selected = TripRequestSchema.safeParse(input);
  if (!selected.success) return failure('INVALID_REQUEST');

  // Context failures are server failures even if a domain implementation happens
  // to throw a request-shaped error while reading invalid internal data.
  let scenario: TripScenario;
  try {
    scenario = validateTripScenario(tripDemo);
  } catch {
    return failure('INVALID_SERVER_SCENARIO');
  }

  try {
    const request = selected.data;
    const evaluation = TripEvaluationSchema.parse(evaluateTrip(scenario, request));
    for (const key of Object.keys(request) as (keyof typeof request)[]) {
      if (evaluation[key] !== request[key]) return failure('INVALID_SERVER_SCENARIO');
    }
    return {
      status: 200,
      body: TripResponseSchema.parse({
        contractVersion: TRIP_CONTRACT_VERSION, ok: true, data: evaluation,
      }),
    };
  } catch (error) {
    return failure(error instanceof TripRequestError ? error.code : 'INVALID_SERVER_SCENARIO');
  }
}
