import { getSurveyResponse } from '../../../../src/server/curb/survey';

export const runtime = 'nodejs';

export function GET(request: Request): Promise<Response> {
  return getSurveyResponse(request);
}
