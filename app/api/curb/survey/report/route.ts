import { postSurveyReportResponse } from '../../../../../src/server/curb/survey';

export const runtime = 'nodejs';

export function POST(request: Request): Promise<Response> {
  return postSurveyReportResponse(request);
}
