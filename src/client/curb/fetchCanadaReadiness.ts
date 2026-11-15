import {
  CANADA_READINESS_API,
  CanadaReadinessResponseSchema,
  type CanadaReadiness,
} from '../../contracts/curb/canada-readiness';

type ErrorCode = 'unavailable' | 'invalid_response' | 'invalid_snapshot';

export class CanadaReadinessError extends Error {
  constructor(readonly code: ErrorCode, readonly status: number) {
    super(code);
    this.name = 'CanadaReadinessError';
  }
}

export async function fetchCanadaReadiness(signal: AbortSignal): Promise<CanadaReadiness> {
  signal.throwIfAborted();
  const response = await fetch(CANADA_READINESS_API, { signal, cache: 'no-store' });
  signal.throwIfAborted();
  if (response.status === 404) throw new CanadaReadinessError('unavailable', 404);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    signal.throwIfAborted();
    throw new CanadaReadinessError('invalid_response', response.status);
  }
  signal.throwIfAborted();

  const envelope = CanadaReadinessResponseSchema.safeParse(body);
  if (!envelope.success || response.status !== (envelope.data.ok ? 200 : 500)) {
    throw new CanadaReadinessError('invalid_response', response.status);
  }
  if (!envelope.data.ok) throw new CanadaReadinessError('invalid_snapshot', response.status);
  return envelope.data.data;
}
