import { getPlanResponse } from '../../../../src/server/curb/plans';
import { MAX_SELECTION_BODY_BYTES, readJsonBody } from '../../../../src/server/curb/readJsonBody';

export async function POST(request: Request): Promise<Response> {
  const input = await readJsonBody(request, MAX_SELECTION_BODY_BYTES);
  // Preserve the existing typed INVALID_REQUEST / 400 response contract.
  const { status, body } = getPlanResponse(input.ok ? input.value : null);
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
