import { getTripResponse } from '../../../../src/server/curb/trips';
import { MAX_SELECTION_BODY_BYTES, readJsonBody } from '../../../../src/server/curb/readJsonBody';

export async function POST(request: Request): Promise<Response> {
  const input = await readJsonBody(request, MAX_SELECTION_BODY_BYTES);
  const { status, body } = getTripResponse(input.ok ? input.value : null);
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
