import { CanadaReadinessSchema } from '../../../../../src/contracts/curb/canada-readiness';
import readiness from '../../../../../src/data/curb/cases/canada-college-readiness.json';

export const dynamic = 'force-dynamic';

export function GET() {
  const snapshot = CanadaReadinessSchema.safeParse(readiness);
  const headers = { 'cache-control': 'no-store' };
  if (!snapshot.success) {
    return Response.json({ ok: false, error: 'INVALID_SNAPSHOT' }, { status: 500, headers });
  }
  return Response.json({ ok: true, data: snapshot.data }, { headers });
}
