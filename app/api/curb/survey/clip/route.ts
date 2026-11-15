import { getClipResponse } from '../../../../../src/server/curb/clip';

export const runtime = 'nodejs';

export function GET(): Promise<Response> {
  return getClipResponse();
}
