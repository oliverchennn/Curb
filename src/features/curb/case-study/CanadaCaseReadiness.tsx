'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CanadaReadinessError, fetchCanadaReadiness } from '../../../client/curb/fetchCanadaReadiness';
import type { CanadaReadiness } from '../../../contracts/curb/canada-readiness';
import styles from './CanadaCaseReadiness.module.css';

const defaultRecordId = 'ramp-421';
const timeoutMs = 10_000;
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

type RampRecord = CanadaReadiness['records'][number];
type LoadState =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; snapshot: CanadaReadiness };

function reportUrl(snapshot: CanadaReadiness, record: RampRecord) {
  return snapshot.source.url + '#page=' + record.locator.viewerPage;
}

function reviewUrl(snapshot: CanadaReadiness) {
  return 'https://github.com/oliverchennn/Curb/blob/' + snapshot.review.reviewSha + '/docs/research/canada-case/DATA_REVIEW.md';
}

function formatMeasurement({ raw, unit }: RampRecord['measurement']) {
  return raw + (unit === 'in' ? ' in' : '%');
}

function messageFor(error: unknown) {
  if (error instanceof CanadaReadinessError) {
    if (error.code === 'unavailable') return 'This audit inventory is unavailable. Please retry.';
    if (error.code === 'invalid_snapshot') return 'The audit inventory did not pass validation. Please retry later.';
    return 'The audit response was unreadable or did not match this case. Please retry.';
  }
  return 'The audit inventory could not be loaded. Check your connection and retry.';
}

function downloadSnapshot(snapshot: CanadaReadiness) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = snapshot.caseId + '-readiness-r' + snapshot.revision + '.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function Inventory({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: CanadaReadiness;
  selectedId: RampRecord['id'];
  onSelect: (id: RampRecord['id']) => void;
}) {
  const record = snapshot.records.find(({ id }) => id === selectedId)!;
  const total = snapshot.records.reduce((sum, item) => sum + item.estimateCents, 0);

  return <>
    <div className={styles.inventoryGrid}>
      <section className={styles.panel} aria-labelledby="canada-inventory-heading">
        <h2 id="canada-inventory-heading">Ramp records</h2>
        <fieldset className={styles.selector}>
          <legend>Choose a source record</legend>
          <div className={styles.choices}>
            {snapshot.records.map((item) => <label key={item.id} className={styles.choice}>
              <input name="canada-ramp" type="radio" value={item.id}
                checked={item.id === selectedId} onChange={() => onSelect(item.id)} />
              <span>Ramp {item.id.slice(5)}</span>
            </label>)}
          </div>
        </fieldset>
        <div aria-live="polite" aria-atomic="true" className={styles.liveRecord}>
          <h3>Ramp {record.id.slice(5)} <span>· {record.area}</span></h3>
          <dl className={styles.recordData}>
            <div>
              <dt>{record.measurement.label}</dt>
              <dd>{formatMeasurement(record.measurement)}</dd>
            </div>
            <div>
              <dt>Published 2020 estimate</dt>
              <dd>{currency.format(record.estimateCents / 100)}</dd>
            </div>
          </dl>
          <p><strong>Proposed work.</strong> {record.action}.</p>
          <a href={reportUrl(snapshot, record)} target="_blank" rel="noreferrer">
            Final report · PDF viewer p. {record.locator.viewerPage} (printed p. {record.locator.printedPage})
          </a>
        </div>
        <table className={styles.printRecords}>
          <thead><tr><th>Ramp</th><th>Recorded feature</th><th>Assembly</th><th>2020 estimate</th><th>Final report</th></tr></thead>
          <tbody>{snapshot.records.map((item) => <tr key={item.id}>
            <th scope="row">{item.id.slice(5)}</th>
            <td>{item.measurement.label} {formatMeasurement(item.measurement)}</td>
            <td>{item.assemblyType.replace('_', ' ')}</td>
            <td>{currency.format(item.estimateCents / 100)}</td>
            <td><a href={reportUrl(snapshot, item)}>Viewer {item.locator.viewerPage} / printed {item.locator.printedPage}</a></td>
          </tr>)}</tbody>
        </table>
      </section>
      <aside className={styles.costPanel} aria-labelledby="canada-cost-heading">
        <h2 id="canada-cost-heading">Published 2020 estimates</h2>
        <strong className={styles.total}>{currency.format(total / 100)}</strong>
        <p>Four proposed whole ramp replacements, priced in 2020 USD.</p>
        <ul className={styles.estimateList}>
          {snapshot.records.map((item) => <li key={item.id}>
            <span>Ramp {item.id.slice(5)}</span>
            <strong>{currency.format(item.estimateCents / 100)}</strong>
          </li>)}
        </ul>
        <p className={styles.costLimit}>Current prices and the cost of a complete route remain unverified.</p>
      </aside>
    </div>

    <section className={styles.requirements} aria-labelledby="canada-requirements-heading">
      <h2 id="canada-requirements-heading">What the audit leaves open</h2>
      <p>These {snapshot.requirements.length} evidence requirements must be resolved before comparing repair packages.</p>
      <ol className={styles.requirementList}>
        {snapshot.requirements.map((item) => <li key={item.id}>
          <span className={styles.requirementId}>{item.id}</span>
          <div><h3>{item.title}</h3><p>{item.description}</p></div>
        </li>)}
      </ol>
      <p className={styles.complete}>
        <strong>{snapshot.review.completedRequirementId} complete.</strong>{' '}
        Independent source review accepted {snapshot.review.observationCount} historical observations for the inventory.{' '}
        <a href={reviewUrl(snapshot)} target="_blank" rel="noreferrer">Read the independent review</a>.
      </p>
    </section>

    <section className={styles.provenance} aria-labelledby="canada-source-heading">
      <h2 id="canada-source-heading">Source and review</h2>
      <p><a href={snapshot.source.url} target="_blank" rel="noreferrer">{snapshot.source.title} (PDF)</a>
        {' · '}{snapshot.source.publisher} · {snapshot.source.version}</p>
      <details>
        <summary>Snapshot identity and source hash</summary>
        <dl className={styles.digests}>
          <div><dt>Snapshot</dt><dd>{snapshot.caseId} · revision {snapshot.revision}</dd></div>
          <div><dt>Official PDF SHA-256</dt><dd><code>{snapshot.source.sha256}</code></dd></div>
          <div><dt>Accepted data commit</dt><dd><code>{snapshot.review.candidateSha}</code></dd></div>
          <div><dt>Independent review commit</dt><dd><code>{snapshot.review.reviewSha}</code></dd></div>
        </dl>
      </details>
    </section>
  </>;
}

export function CanadaCaseReadiness() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [selectedId, setSelectedId] = useState<RampRecord['id']>(defaultRecordId);
  const active = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    active.current?.abort();
    const request = new AbortController();
    active.current = request;
    setSelectedId(defaultRecordId);
    setState({ kind: 'loading' });

    const isCurrent = () => active.current === request && !request.signal.aborted;
    const timeout = window.setTimeout(() => {
      if (!isCurrent()) return;
      request.abort();
      setState({ kind: 'failed', message: 'Loading the audit inventory took too long. Please retry.' });
    }, timeoutMs);

    try {
      const snapshot = await fetchCanadaReadiness(request.signal);
      if (isCurrent()) setState({ kind: 'ready', snapshot });
    } catch (error) {
      if (isCurrent()) setState({ kind: 'failed', message: messageFor(error) });
    } finally {
      window.clearTimeout(timeout);
      if (active.current === request) active.current = null;
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [load]);

  const snapshot = state.kind === 'ready' ? state.snapshot : null;
  return <article className={styles.casePage} aria-labelledby="canada-title">
    <header className={styles.hero}>
      <p className={styles.kicker}>2020 accessibility audit</p>
      <h1 id="canada-title">Cañada College</h1>
      <p className={styles.lede}>A historical inventory of curb-ramp work around Lot 1 and Building 9. The audit records measurements and estimated costs. Current conditions remain unverified.</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => { if (snapshot) window.print(); }} disabled={!snapshot}>Print evidence brief</button>
        <button type="button" onClick={() => { if (snapshot) downloadSnapshot(snapshot); }}
          disabled={!snapshot}>Download snapshot JSON</button>
        <button type="button" onClick={() => { void load(); }}>Reset case</button>
      </div>
    </header>

    {!snapshot && <div className={styles.state} aria-busy={state.kind === 'loading'}>
      {state.kind === 'loading' ? <p role="status">Loading the historical audit inventory…</p> : null}
      {state.kind === 'failed' && <>
        <p role="alert">{state.message}</p>
        <button type="button" onClick={() => { void load(); }}>Retry</button>
      </>}
    </div>}

    {snapshot && <>
      <section className={styles.disposition} aria-labelledby="canada-disposition-heading">
        <div>
          <p className={styles.statusTag}>Inventory only</p>
          <h2 id="canada-disposition-heading">No supported route comparison</h2>
        </div>
        <p>The 2020 report shows historical crossing markings. It leaves the matched crossings, routes to entrances, and full repair scope unresolved.</p>
      </section>
      <Inventory snapshot={snapshot} selectedId={selectedId} onSelect={setSelectedId} />
    </>}
  </article>;
}
