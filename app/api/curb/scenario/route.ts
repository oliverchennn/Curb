import { getScenarioResponse } from '../../../../src/server/curb/scenario';

export function GET(request: Request): Response {
  const datasets = new URL(request.url).searchParams.getAll('dataset');
  // Preserve repeated values so validation rejects an ambiguous selection.
  const { status, body } = getScenarioResponse(datasets.length > 1 ? datasets : datasets[0] ?? null);
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
