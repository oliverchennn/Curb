import { getScenarioResponse } from '../../../../src/server/curb/scenario';

export function GET(request: Request): Response {
  const dataset = new URL(request.url).searchParams.get('dataset');
  const { status, body } = getScenarioResponse(dataset);
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
