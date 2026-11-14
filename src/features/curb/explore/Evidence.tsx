'use client';
import { useState } from 'react';
import { dateText, kindLabels, project, vertices, type Atlas, type EvidenceRecord, type Feature, type EvidenceDate } from './model';
import styles from './Explorer.module.css';

export function Snapshot({ record, feature, compact = false }: { record: EvidenceRecord; feature: Feature; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (record.media.status === 'available' && !failed) return <img className={compact ? styles.thumbPhoto : styles.photo} src={record.media.src} alt={compact ? '' : record.media.alt} loading="lazy" onError={() => setFailed(true)} />;
  if (record.media.status === 'available' || ['unavailable', 'withheld'].includes(record.media.status)) return <div className={styles.photoNotice}>
    <span aria-hidden="true">▧</span><p>{record.media.status === 'available' ? 'Photo unavailable — the local file could not be loaded.' : record.media.reason}</p>
  </div>;
  const points = vertices(feature).map(project);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const x = points.length ? Math.min(...xs) - 12 : 0, y = points.length ? Math.min(...ys) - 12 : 0;
  const w = points.length ? Math.max(...xs) - x + 12 : 100, h = points.length ? Math.max(...ys) - y + 12 : 75;
  return <div className={styles.schematic}>
    {points.length ? <svg viewBox={`${x} ${y} ${w} ${h}`} aria-label={`${feature.label}: archive geometry snapshot`} role="img">
      {feature.geometry?.type === 'LineString' ? <polyline points={points.map(p => p.join(',')).join(' ')} stroke="#6a8470" strokeWidth="3" strokeDasharray={feature.type === 'crossing' ? '5 4' : undefined} vectorEffect="non-scaling-stroke" fill="none" /> : <circle cx={points[0][0]} cy={points[0][1]} r="2" fill="#b67639" />}
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={Math.max(w, h) / 40} fill="#315f4c" />)}
    </svg> : <span className={styles.unplacedSymbol} aria-hidden="true">⌖</span>}
    <span className={styles.schematicCaption}>{points.length ? 'Archive geometry' : 'Unplaced record'}</span>
  </div>;
}
function DateValue({ value }: { value: EvidenceDate }) { return value ? <time dateTime={value.value}>{dateText(value)}</time> : <>Unknown</>; }
export function RecordCard({ atlas, record, comparison = false }: { atlas: Atlas; record: EvidenceRecord; comparison?: boolean }) {
  const feature = atlas.features.find(f => f.id === record.featureId)!, source = atlas.sources.find(s => s.id === record.sourceId)!;
  return <article className={comparison ? styles.comparisonCard : styles.recordCard} data-record={record.id}>
    <span className={styles.provenance} data-kind={record.kind}>{kindLabels[record.kind]}</span>
    <h3>{record.title}</h3>
    <Snapshot key={record.id} record={record} feature={feature} />
    <p className={styles.recordNote}>{record.note}</p>
    <dl className={styles.recordMeta}>
      <div><dt>Location</dt><dd>{feature.geometry ? 'Archive source geometry' : 'Location not yet placed'}</dd></div>
      <div><dt>{record.kind === 'archive' ? 'Source capture' : 'Observed'}</dt><dd><DateValue value={record.kind === 'archive' ? record.captured : record.observed} /></dd></div>
      {record.kind !== 'archive' && <div><dt>Photo captured</dt><dd><DateValue value={record.captured} /></dd></div>}
      <div><dt>Retrieved</dt><dd><DateValue value={record.retrieved} /></dd></div>
      <div><dt>Attachment</dt><dd>{record.attachment === 'source-matched' ? 'Source ID matched' : record.attachment === 'accepted' ? 'Accepted (example only)' : 'Pending review'}</dd></div>
      {record.clipSeconds !== undefined && <div><dt>Clip position</dt><dd>{record.clipSeconds.toFixed(3)} seconds · not a date</dd></div>}
    </dl>
    <p className={styles.unknown}>Current traversal: Unknown</p>
    {record.kind === 'field' && <div className={styles.evidenceLinks}><a className={styles.actionLink} href={`/curb/surveys/robertson-hall/survey.mp4#t=${record.clipSeconds}`}>Open source clip at this frame ↗</a><a href="/curb/surveys/robertson-hall">Review Robertson survey →</a></div>}
    <details className={styles.sourceDetails}><summary>Source & record details</summary>
      <dl className={styles.recordMeta}>
        <div><dt>Feature ID</dt><dd>{feature.id}</dd></div><div><dt>Record ID</dt><dd>{record.id}</dd></div>
        <div><dt>Source</dt><dd>{source.title}</dd></div>
        {source.catalogDate && <div><dt>Catalog snapshot</dt><dd><time dateTime={source.catalogDate}>{source.catalogDate}</time> · not capture or observation</dd></div>}
        {feature.properties.status && <div><dt>Archived status</dt><dd>{feature.properties.status} · not current condition</dd></div>}
        {record.kind === 'archive' && <><div><dt>Dimensions / slope</dt><dd>Unknown · not measured</dd></div><div><dt>ADA determination</dt><dd>Unknown</dd></div></>}
        {source.sha256 && <div><dt>Source SHA-256</dt><dd className={styles.hash}>{source.sha256}</dd></div>}
      </dl>
      <p>{source.credit}</p><a href={source.url} target="_blank" rel="noreferrer">Open original source site ↗</a>
      <p>Attachment review does not establish passability. No automatically selected winner or current condition is inferred.</p>
    </details>
  </article>;
}
