'use client';
import { useState } from 'react';
import { archiveAttributes, dateText, kindLabels, project, vertices, type Atlas, type EvidenceRecord, type Feature, type EvidenceDate } from './model';
import { sourceClass } from './groups';
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
export function RecordCard({ atlas, record, comparison = false, stop, hidePhoto = false }: { atlas: Atlas; record: EvidenceRecord; comparison?: boolean; stop?: number; hidePhoto?: boolean }) {
  const feature = atlas.features.find(f => f.id === record.featureId)!, source = atlas.sources.find(s => s.id === record.sourceId)!;
  const attributes = archiveAttributes(feature);
  const osm = 'osm_way_id' in feature.properties;
  // Root's survey deep link: validated canonical finding ID from the field record's feature.
  const reviewHref = record.kind === 'field' && feature.sourceFeatureId ? `/curb/surveys/robertson-hall?finding=${encodeURIComponent(feature.sourceFeatureId)}` : '/curb/surveys/robertson-hall';
  return <article className={comparison ? styles.comparisonCard : styles.recordCard} data-record={record.id}>
    <span className={styles.provenance} data-kind={record.kind}>{kindLabels[record.kind]}</span>{stop !== undefined && <span className={styles.stopTag}>{record.kind === 'field' ? 'Record' : 'Stop'} {String(stop).padStart(2, '0')} · source order</span>}
    <h3>{record.title}</h3>
    <p className={styles.featureKey}>{feature.id}</p>
    {!hidePhoto && <Snapshot key={record.id} record={record} feature={feature} />}
    <p className={styles.recordNote}>{record.note}</p>
    <dl className={styles.recordMeta}>
      <div><dt>Location</dt><dd>{feature.geometry ? 'Archive source geometry' : 'Location not yet placed'}</dd></div>
      <div><dt>{record.kind === 'archive' ? 'Source capture' : 'Observed'}</dt><dd><DateValue value={record.kind === 'archive' ? record.captured : record.observed} /></dd></div>
      {osm && <div><dt>Observed</dt><dd><DateValue value={record.observed} /></dd></div>}
      {record.kind !== 'archive' && <div><dt>Photo captured</dt><dd><DateValue value={record.captured} /></dd></div>}
      <div><dt>Retrieved</dt><dd><DateValue value={record.retrieved} /></dd></div>
      <div><dt>Attachment</dt><dd>{record.attachment === 'source-matched' ? 'Source ID matched' : record.attachment === 'accepted' ? record.kind === 'synthetic' ? 'Accepted (example only)' : 'Accepted attachment' : 'Pending review'}</dd></div>
      {record.clipSeconds !== undefined && <div><dt>Clip position</dt><dd>{record.clipSeconds.toFixed(3)} seconds · not a date</dd></div>}
      {osm && <div><dt>Source class</dt><dd>{sourceClass(feature.properties, feature.type)} (OpenStreetMap tag)</dd></div>}
      {osm && <div><dt>Source edit</dt><dd>{String(feature.properties.osm_edited_at ?? 'Unknown')} · OpenStreetMap edit time, not an observation</dd></div>}
    </dl>
    {attributes.length > 0 && <div className={styles.attributes}><h4>{osm ? 'Source tags' : 'Archive metadata'}</h4><dl>{attributes.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p>{osm ? `From the OpenStreetMap snapshot (way ${feature.properties.osm_way_id}, version ${feature.properties.osm_version}). Tags are contributor assertions, not field measurements, current condition or passability.` : 'From the DVRPC archive snapshot. Not a field observation, current condition or passability.'}</p></div>}
    <p className={styles.unknown}>Current traversal: Unknown</p>
    {record.kind === 'field' && <div className={styles.evidenceLinks}><a className={styles.actionLink} href={`/curb/surveys/robertson-hall/survey.mp4#t=${record.clipSeconds}`}>Open source clip at this frame →</a><a href={reviewHref}>Review this finding in the survey →</a></div>}
    <details className={styles.sourceDetails}><summary>Source & record details</summary>
      <dl className={styles.recordMeta}>
        <div><dt>Feature ID</dt><dd>{feature.id}</dd></div><div><dt>Record ID</dt><dd>{record.id}</dd></div>
        <div><dt>Source</dt><dd>{source.title}</dd></div>
        {source.catalogDate && <div><dt>Catalog snapshot</dt><dd><time dateTime={source.catalogDate}>{source.catalogDate}</time> · not capture or observation</dd></div>}
        {feature.properties.status && <div><dt>Archived status</dt><dd>{feature.properties.status} · not current condition</dd></div>}
        {record.kind === 'archive' && <><div><dt>Dimensions / slope</dt><dd>Unknown · not measured</dd></div><div><dt>ADA determination</dt><dd>Unknown</dd></div></>}
        {source.sha256 && <div><dt>Source SHA-256</dt><dd className={styles.hash}>{source.sha256}</dd></div>}
      </dl>
      <p>{source.credit}</p><a href={source.url} target="_blank" rel="noreferrer">Open original source site →</a>
      <p>Attachment review does not establish passability. No automatically selected winner or current condition is inferred.</p>
    </details>
  </article>;
}
