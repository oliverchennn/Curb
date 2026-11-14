import type { BarrierDetail } from '../../../contracts/curb';
import styles from './EvidencePanel.module.css';

type Barrier = BarrierDetail['barrier'];
type Evidence = BarrierDetail['evidence'][number];

const HEADING_ID = 'curb-evidence-heading';

const KIND_LABELS: Record<Barrier['kind'], string> = {
  missing_ramp: 'Missing ramp',
  obstruction: 'Obstruction',
  surface_issue: 'Surface issue',
  unknown: 'Unclassified',
};

const STATUS_LABELS: Record<Barrier['reviewStatus'], string> = {
  pending: 'Pending review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const STATUS_CLASSES: Record<Barrier['reviewStatus'], string | undefined> = {
  pending: styles.statusPending,
  accepted: styles.statusAccepted,
  rejected: styles.statusRejected,
};

const ORIGIN_LABELS: Record<Evidence['origin'], string> = {
  synthetic: 'Synthetic example',
  field: 'Field observation',
};

const EVIDENCE_KIND_LABELS: Record<Evidence['kind'], string> = {
  note: 'Note',
  image: 'Image',
};

// Fixed locale and UTC so server and client render identical text.
const OBSERVED_AT_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function formatObservedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${OBSERVED_AT_FORMAT.format(date)} UTC`;
}

function classNames(...names: Array<string | undefined | false>): string {
  return names.filter(Boolean).join(' ');
}

function EvidenceItem({ item }: { item: Evidence }) {
  return (
    <li className={styles.evidenceItem}>
      <h4 className={styles.evidenceCaption}>{item.caption}</h4>
      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>Type</dt>
          <dd>{EVIDENCE_KIND_LABELS[item.kind]}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>Origin</dt>
          <dd>
            <span
              className={classNames(
                styles.origin,
                item.origin === 'synthetic' ? styles.originSynthetic : styles.originField,
              )}
            >
              {ORIGIN_LABELS[item.origin]}
            </span>
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt>Observed</dt>
          <dd>
            {item.observedAt !== undefined
              ? <time dateTime={item.observedAt}>{formatObservedAt(item.observedAt)}</time>
              : 'Unknown'}
          </dd>
        </div>
        {item.attribution !== undefined && (
          <div className={styles.metaRow}>
            <dt>Attribution</dt>
            <dd className={styles.wrap}>{item.attribution}</dd>
          </div>
        )}
      </dl>
      {item.kind === 'image' &&
        (item.assetPath !== undefined ? (
          <img className={styles.image} src={item.assetPath} alt={item.caption} loading="lazy" />
        ) : (
          <p className={styles.muted}>Image not available.</p>
        ))}
      {item.note !== undefined && item.note !== '' && <p className={styles.note}>{item.note}</p>}
    </li>
  );
}

export function EvidencePanel({ detail }: { detail: BarrierDetail | null }) {
  if (detail === null) {
    return (
      <section className={styles.panel} aria-labelledby={HEADING_ID} aria-live="polite">
        <h2 id={HEADING_ID} className={styles.heading}>
          Evidence
        </h2>
        <p className={styles.muted}>No evidence selected. Linked evidence appears here when available for the selected item.</p>
      </section>
    );
  }

  const { barrier, evidence } = detail;

  return (
    <section className={styles.panel} aria-labelledby={HEADING_ID} aria-live="polite">
      <h2 id={HEADING_ID} className={styles.heading}>
        Evidence
      </h2>
      <div className={styles.barrier}>
        <h3 className={styles.barrierTitle}>{KIND_LABELS[barrier.kind]}</h3>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt>Barrier ID</dt>
            <dd>
              <code className={styles.wrap}>{barrier.id}</code>
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt>Review status</dt>
            <dd>
              <span className={classNames(styles.status, STATUS_CLASSES[barrier.reviewStatus])}>
                {STATUS_LABELS[barrier.reviewStatus]}
              </span>
            </dd>
          </div>
        </dl>
        {barrier.note === '' ? (
          <p className={styles.muted}>No barrier note recorded.</p>
        ) : (
          <p className={styles.note}>{barrier.note}</p>
        )}
      </div>

      <h3 className={styles.subheading}>Linked evidence ({evidence.length})</h3>
      {evidence.length === 0 ? (
        <p className={styles.muted}>No evidence is linked to this barrier.</p>
      ) : (
        <ul className={styles.evidenceList}>
          {evidence.map((item) => (
            <EvidenceItem key={item.id} item={item} />
          ))}
        </ul>
      )}
      <p className={styles.disclaimer}>
        Evidence is shown for repair planning review only. It is not a compliance determination,
        a navigation guarantee, or a record of completed repairs.
      </p>
    </section>
  );
}
