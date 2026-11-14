import type { BarrierDetail } from '../../../contracts/curb';

export function EvidencePanel({ detail }: { detail: BarrierDetail | null }) {
  return (
    <section aria-labelledby="curb-evidence-heading">
      <h2 id="curb-evidence-heading">Evidence</h2>
      <p>{detail ? 'Evidence display is unavailable in this build.' : 'No barrier selected.'}</p>
    </section>
  );
}
