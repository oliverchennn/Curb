import { getTripScenarioResponse } from '../../../../src/server/curb/trips';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const params = new URL(request.url).searchParams;
  // Repeated selectors are ambiguous and must not silently collapse to one ID.
  const query = params.size === new Set(params.keys()).size ? Object.fromEntries(params) : null;
  const { status, body } = getTripScenarioResponse(query);
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
