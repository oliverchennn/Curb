import { getPlanResponse } from '../../../../src/server/curb/plans';

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    input = null;
  }
  const { status, body } = getPlanResponse(input);
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
