import { getPlanScenarioResponse } from '../../../../src/server/curb/plans';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const params = new URL(request.url).searchParams;
  // Reject duplicate selectors instead of silently keeping the last value.
  const query = params.size === new Set(params.keys()).size ? Object.fromEntries(params) : null;
  const { status, body } = getPlanScenarioResponse(query);
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
