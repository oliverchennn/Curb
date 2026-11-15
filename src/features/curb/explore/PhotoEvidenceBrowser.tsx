'use client';
import { useState, type Ref } from 'react';
import { PhotoGlyph } from './PhotoEvidenceLayer';
import { kindLabels } from './model';
import {
  conditionLabels, photoDateText, photoMarkerLabels, photoPin, type PhotoEvidence,
} from './photoEvidence';
import styles from './PhotoEvidence.module.css';

const reviewLabels = { pending: 'Pending', reviewed: 'Reviewed', inconclusive: 'Inconclusive' };

function PhotoMedia({ record }: { record: PhotoEvidence }) {
  const [failed, setFailed] = useState(false);
  const { availability, alt } = record.image;
  if (availability.status === 'unavailable') return <p className={styles.mediaNotice}>{availability.reason}</p>;
  if (failed) return <p className={styles.mediaNotice} role="status">Photo could not load. Source and review details are still available below.</p>;
  // The manifest validates local paths; preserve the original aspect ratio without cropping evidence.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.image} src={availability.path} alt={alt} onError={() => setFailed(true)} />;
}

function PhotoSummary({ record, onLocate }: { record: PhotoEvidence; onLocate: (keyboard: boolean) => void }) {
  const pin = photoPin(record);
  const { finding, image, location } = record;
  return <article className={styles.detail} aria-labelledby="photo-title">
    <h3 id="photo-title">{record.title}</h3>
    <p className={styles.limit}>{kindLabels.archive}</p>
    <p className={styles.symbol}>
      {pin && <svg width="23" height="23" viewBox="-13 -13 26 26" aria-hidden="true"><PhotoGlyph kind={pin.kind} /></svg>}
      {pin ? photoMarkerLabels[pin.kind] : 'Unplaced · location review'}
    </p>
    <PhotoMedia key={image.id} record={record} />
    <p className={styles.condition}>{finding.visibleCondition}</p>
    <dl className={styles.receipt}>
      <div><dt>Condition</dt><dd>{finding.status === 'possible-concern' ? 'Possible · ' : ''}{conditionLabels[finding.condition]}</dd></div>
      <div><dt>Manual review</dt><dd>{reviewLabels[finding.review.status]} · {finding.review.note}</dd></div>
      {finding.modelSuggestion && <div><dt>Model suggestion</dt><dd>{finding.modelSuggestion.description} ({finding.modelSuggestion.source})</dd></div>}
      <div><dt>Captured</dt><dd>{photoDateText(image.source.captured)}{image.source.captureNote && <> · {image.source.captureNote}</>}</dd></div>
      <div><dt>Source</dt><dd>
        {image.source.url ? <a href={image.source.url} target="_blank" rel="noreferrer">{image.source.credit} (opens in a new tab)</a> : image.source.credit}
        {image.source.kind === 'generated-illustration' && ' · Illustration'}
        {image.source.kind === 'unresolved' && ' · Provenance unresolved'}
      </dd></div>
      {image.availability.status === 'available' && <div><dt>Usage</dt><dd>
        {image.availability.permission.licenseUrl
          ? <a href={image.availability.permission.licenseUrl} target="_blank" rel="noreferrer">{image.availability.permission.basis}</a>
          : image.availability.permission.basis}
        {image.availability.permission.changes && <> · {image.availability.permission.changes}</>}
      </dd></div>}
      <div><dt>Retrieved</dt><dd>{photoDateText(image.source.retrieved)}</dd></div>
      <div><dt>Placement</dt><dd>{pin?.note}{location.unplacedReason && <> {location.unplacedReason}</>}</dd></div>
      <div><dt>Evidence ID</dt><dd>{record.id}</dd></div>
    </dl>
    <p className={styles.limit}>Current traversal: Unknown.</p>
    {pin && <button type="button" className={styles.locate} onClick={event => onLocate(event.detail === 0)}>Show on map</button>}
  </article>;
}

export function PhotoEvidenceBrowser({ records, selected, headingRef, onSelect, onClose, onLocate }: {
  records: readonly PhotoEvidence[]; selected: PhotoEvidence | null; headingRef: Ref<HTMLHeadingElement>;
  onSelect: (id: string, keyboard: boolean) => void; onClose: () => void; onLocate: (keyboard: boolean) => void;
}) {
  const lists = { mapped: records.filter(photoPin), unplaced: records.filter(record => !photoPin(record)) };
  const related = selected?.location.camera
    ? lists.mapped.filter(record => record.locationId === selected.locationId && record.id !== selected.id)
    : [];
  return <aside id="campus-photo-browser" className={styles.browser} aria-labelledby="campus-photo-heading"
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className={styles.heading}>
      <h2 id="campus-photo-heading" tabIndex={-1} ref={headingRef}>Photo evidence{selected && <span className={styles.srOnly}>, {selected.title}</span>}</h2>
      <button type="button" onClick={onClose} aria-label="Close photo evidence">×</button>
    </div>
    {selected && <PhotoSummary record={selected} onLocate={onLocate} />}
    {related.length > 0 && <div className={styles.inventory}>
      <h3>More at this viewpoint</h3>
      <ul>{related.map(record => <li key={record.id}>
        <button type="button" onClick={event => onSelect(record.id, event.detail === 0)}>{record.title}</button>
      </li>)}</ul>
    </div>}
    <div className={styles.inventory}>
      <details open={selected ? undefined : true} key={selected ? 'selected' : 'inventory'}>
        <summary>Photo records · {lists.mapped.length} with a map marker · {lists.unplaced.length} unplaced</summary>
        {(['mapped', 'unplaced'] as const).map(group => lists[group].length > 0 && <div key={group}>
          <h3>{group === 'mapped' ? 'Records with a map marker' : 'Unplaced / review'}</h3>
          <ul>{lists[group].map(record => {
            const pin = photoPin(record);
            return <li key={record.id}>
            <button type="button" aria-current={selected?.id === record.id || undefined}
              onClick={event => onSelect(record.id, event.detail === 0)}>
              <strong>{record.title}</strong>
              <small>{pin ? photoMarkerLabels[pin.kind] : 'Unplaced · location review'}</small>
            </button>
          </li>; })}</ul>
        </div>)}
      </details>
    </div>
  </aside>;
}
