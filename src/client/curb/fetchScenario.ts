import {
  ScenarioResponseSchema,
  type ScenarioDataset,
  type ScenarioErrorCode,
  type ScenarioView,
} from '../../contracts/curb';

const statusByErrorCode = {
  DATASET_NOT_FOUND: 404,
  INVALID_SERVER_SCENARIO: 500,
  SCENARIO_UNAVAILABLE: 501,
} satisfies Record<ScenarioErrorCode, number>;

export class ScenarioFetchError extends Error {
  constructor(
    message: string,
    public readonly code: ScenarioErrorCode | 'INVALID_RESPONSE',
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ScenarioFetchError';
  }
}

export async function fetchScenario(
  dataset: ScenarioDataset,
  signal: AbortSignal,
): Promise<ScenarioView> {
  signal.throwIfAborted();

  const query = new URLSearchParams({ dataset });
  const response = await fetch(`/api/curb/scenario?${query}`, { signal });
  signal.throwIfAborted();

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    signal.throwIfAborted();
    throw new ScenarioFetchError('The scenario response was not JSON.', 'INVALID_RESPONSE', response.status);
  }
  signal.throwIfAborted();

  const result = ScenarioResponseSchema.safeParse(body);
  if (!result.success) {
    throw new ScenarioFetchError('The scenario response was invalid.', 'INVALID_RESPONSE', response.status);
  }

  const envelope = result.data;
  const expectedStatus = envelope.ok ? 200 : statusByErrorCode[envelope.error.code];
  if (response.status !== expectedStatus) {
    throw new ScenarioFetchError(
      'The scenario response status did not match its body.',
      'INVALID_RESPONSE',
      response.status,
    );
  }
  if (!envelope.ok) {
    const { code, message } = envelope.error;
    throw new ScenarioFetchError(message, code, response.status);
  }

  return envelope.data;
}
