import {
  ScenarioResponseSchema,
  type ScenarioDataset,
  type ScenarioErrorCode,
  type ScenarioView,
} from '../../contracts/curb';

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
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    signal.throwIfAborted();
    throw new ScenarioFetchError('The scenario response was not JSON.', 'INVALID_RESPONSE', response.status);
  }
  signal.throwIfAborted();

  const result = ScenarioResponseSchema.safeParse(body);
  if (!result.success || result.data.ok !== response.ok) {
    throw new ScenarioFetchError('The scenario response was invalid.', 'INVALID_RESPONSE', response.status);
  }
  if (!result.data.ok) {
    const { code, message } = result.data.error;
    throw new ScenarioFetchError(message, code, response.status);
  }

  return result.data.data;
}
