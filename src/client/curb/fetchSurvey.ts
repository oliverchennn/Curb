import { z } from 'zod';
import { SurveyResponseSchema, type Survey } from '../../contracts/curb/survey';

const surveyId: Survey['id'] = 'robertson-hall';
const failureSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(['INVALID_REQUEST', 'SURVEY_NOT_FOUND', 'SURVEY_UNAVAILABLE']),
    message: z.string().trim().min(1),
  }),
});
type SurveyErrorCode = z.infer<typeof failureSchema>['error']['code'];

const statusByErrorCode: Record<SurveyErrorCode, number> = {
  INVALID_REQUEST: 400,
  SURVEY_NOT_FOUND: 404,
  SURVEY_UNAVAILABLE: 500,
};

export class SurveyFetchError extends Error {
  constructor(
    message: string,
    public readonly code: SurveyErrorCode | 'INVALID_RESPONSE',
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SurveyFetchError';
  }
}

export async function fetchSurvey(signal?: AbortSignal): Promise<Survey> {
  signal?.throwIfAborted();

  let response: Response;
  try {
    response = await fetch(`/api/curb/survey?id=${surveyId}`, { signal, cache: 'no-store' });
  } catch (error) {
    signal?.throwIfAborted();
    throw error;
  }
  signal?.throwIfAborted();

  const { status } = response;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    signal?.throwIfAborted();
    throw new SurveyFetchError('The survey response was not JSON.', 'INVALID_RESPONSE', status);
  }
  signal?.throwIfAborted();

  if (status === 200) {
    const result = SurveyResponseSchema.safeParse(body);
    if (result.success && result.data.data.id === surveyId) return result.data.data;
  } else {
    const result = failureSchema.safeParse(body);
    if (result.success) {
      const { code, message } = result.data.error;
      if (status === statusByErrorCode[code]) throw new SurveyFetchError(message, code, status);
    }
  }

  throw new SurveyFetchError('The survey response was invalid.', 'INVALID_RESPONSE', status);
}
