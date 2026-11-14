import { getTripResponse } from '../../../../src/server/curb/trips';

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    input = null;
  }
  const { status, body } = getTripResponse(input);
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
