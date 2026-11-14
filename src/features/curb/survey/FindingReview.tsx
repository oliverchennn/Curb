'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PrioritySchema, type Priority, type Survey } from '../../../contracts/curb/survey';
import {
  areaForFinding,
  correctFinding,
  formatTime,
  METHOD_LABELS,
  PRIORITY_LABELS,
  REVIEW_LABELS,
  setAreaPriority,
  setReviewStatus,
} from './presentation';
import styles from './SurveyWorkspace.module.css';

export function FindingReview({ survey, editedIds, selectedFindingId, onSelectFinding, onChange }: {
  survey: Survey;
  editedIds: string[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onChange: (survey: Survey, message: string) => void;
}) {
  const [reviewer, setReviewer] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const finding = survey.findings.find((item) => item.id === selectedFindingId) ?? null;
  const area = finding ? areaForFinding(survey, finding.id) : undefined;
  const sources = new Map(survey.sources.map((source) => [source.id, source]));

  function apply(result: { ok: true; survey: Survey } | { ok: false; message: string }, done: string) {
    if (!result.ok) {
      setMessage(result.message);
      if (result.message.startsWith('Enter a reviewer')) document.getElementById('survey-reviewer')?.focus();
      return;
    }
    setMessage(null);
    onChange(result.survey, done);
  }

  return <section className={styles.card} aria-labelledby="survey-review-heading">
    <div className={styles.panelHeading}>
      <h2 id="survey-review-heading"><span className={styles.stepNumber}>1</span> Review findings</h2>
      <label className={styles.inlineLabel} htmlFor="survey-reviewer">Reviewer
        <input id="survey-reviewer" value={reviewer} autoComplete="name" placeholder="Your name"
          onChange={(event) => setReviewer(event.target.value)} />
      </label>
    </div>
    <p className={styles.small}>Findings are AI-assisted suggestions until a person reviews them. Selecting one jumps the video to its evidence frame. Decisions and corrections are recorded as manual review.</p>

    <div className={styles.reviewLayout}>
      <ol className={styles.findingList} aria-label="Findings">
        {survey.findings.map((item, index) => {
          const selected = item.id === selectedFindingId;
          return <li key={item.id}>
            <button type="button" className={selected ? styles.findingButtonSelected : styles.findingButton} aria-pressed={selected}
              onClick={() => onSelectFinding(item.id)}>
              <span className={styles.findingTitle}>
                <span className={styles.swatch} style={{ background: item.color }} aria-hidden="true" />
                {index + 1}. {item.label}
              </span>
              <span className={styles.findingMeta}>
                {formatTime(item.evidenceTime)} · <span className={styles[`review_${item.review.status}`]}>{REVIEW_LABELS[item.review.status]}</span>
                {editedIds.includes(item.id) ? ' · edited' : ''}
              </span>
            </button>
          </li>;
        })}
      </ol>

      {finding ? <article className={styles.findingDetail} aria-labelledby="survey-finding-heading">
        <h3 id="survey-finding-heading" tabIndex={-1}>{finding.label}</h3>
        <p className={styles.small}>{finding.kind} · evidence at {formatTime(finding.evidenceTime)} · ID <code>{finding.id}</code></p>
        <Closeup key={finding.closeupSrc} src={finding.closeupSrc} alt={`Close-up of ${finding.label}`} />
        <p>{finding.description}</p>

        <dl className={styles.facts}>
          <div><dt>Review</dt><dd><span className={styles[`review_${finding.review.status}`]}>{REVIEW_LABELS[finding.review.status]}</span> · {METHOD_LABELS[finding.review.method]} · {finding.review.reviewer}</dd></div>
          <div><dt>Review note</dt><dd>{finding.review.note}</dd></div>
          <div><dt>Finding priority</dt><dd>{PRIORITY_LABELS[finding.assessment.priority]} — {finding.assessment.rationale}</dd></div>
          <div><dt>Measurements</dt><dd>{finding.measurements.length === 0
            ? 'None recorded. Dimensions are unknown until measured on site.'
            : finding.measurements.map((m) => `${m.property}: ${m.value} ${m.unit} (${m.method})`).join('; ')}</dd></div>
        </dl>
        <h4>Possible access effects</h4>
        <ul className={styles.plainList}>{finding.assessment.accessImpacts.map((impact) => <li key={impact}>{impact}</li>)}</ul>
        <h4>Needs measuring</h4>
        <ul className={styles.plainList}>{finding.assessment.measurementNeeds.map((need) => <li key={need}>{need}</li>)}</ul>
        <h4>Standards checks (not a compliance verdict)</h4>
        <ul className={styles.plainList}>{finding.assessment.checks.map((check, index) => {
          const source = sources.get(check.sourceId);
          return <li key={index}>
            <strong>{check.status === 'needs_measurement' ? 'Needs measurement' : 'Not assessed'}</strong> · {source?.title ?? check.sourceId} §{check.section}. {check.note}
          </li>;
        })}</ul>

        <div className={styles.actions} role="group" aria-label="Review decision">
          <button type="button" disabled={finding.review.status === 'accepted'}
            onClick={() => apply(setReviewStatus(survey, finding.id, 'accepted', reviewer), `Accepted “${finding.label}”.`)}>Accept finding</button>
          <button type="button" className={styles.secondaryButton} disabled={finding.review.status === 'rejected'}
            onClick={() => apply(setReviewStatus(survey, finding.id, 'rejected', reviewer), `Rejected “${finding.label}”. It stays in the record and is excluded from plans.`)}>Reject finding</button>
          {finding.review.status !== 'pending' ? <button type="button" className={styles.textButton}
            onClick={() => apply(setReviewStatus(survey, finding.id, 'pending', reviewer), `Returned “${finding.label}” to pending.`)}>Mark pending</button> : null}
        </div>

        <CorrectionForm key={`${finding.id}:${finding.label}:${finding.kind}:${finding.description}`} finding={finding}
          onSave={(correction) => apply(correctFinding(survey, finding.id, correction, reviewer), `Saved corrections to “${correction.label.trim()}”.`)} />

        {area ? <div className={styles.areaBox}>
          <label htmlFor="survey-area-priority">Work area <strong>{area.label}</strong> priority
            <select id="survey-area-priority" value={area.priority}
              onChange={(event) => onChange(setAreaPriority(survey, area.id, event.target.value as Priority), `Set ${area.label} to ${PRIORITY_LABELS[event.target.value as Priority].toLowerCase()}.`)}>
              {PrioritySchema.options.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}
            </select>
          </label>
          <p className={styles.small}>{area.rationale} {area.nearTerm ? 'Flagged for near-term work.' : 'Not flagged for near-term work.'} {area.repairWorthy ? '' : 'Marked not repair-worthy.'}</p>
        </div> : <p className={styles.small}>This finding is not grouped into a work area.</p>}
        {message ? <p role="alert" className={styles.inlineError}>{message}</p> : null}
      </article> : <p className={styles.small}>Select a finding to review its evidence.</p>}
    </div>
  </section>;
}

function Closeup({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed
    ? <p className={styles.mediaMissing}>Close-up unavailable — {src} could not be loaded. The finding and its video evidence are still reviewable.</p>
    : <img className={styles.closeup} src={src} alt={alt} onError={() => setFailed(true)} />;
}

function CorrectionForm({ finding, onSave }: {
  finding: Survey['findings'][number];
  onSave: (correction: { label: string; kind: string; description: string }) => void;
}) {
  const [label, setLabel] = useState(finding.label);
  const [kind, setKind] = useState(finding.kind);
  const [description, setDescription] = useState(finding.description);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ label, kind, description });
  }
  return <details className={styles.correction}>
    <summary>Correct label, kind or description</summary>
    <form onSubmit={submit}>
      <label htmlFor="survey-fix-label">Label<input id="survey-fix-label" value={label} maxLength={4000} onChange={(event) => setLabel(event.target.value)} /></label>
      <label htmlFor="survey-fix-kind">Kind<input id="survey-fix-kind" value={kind} maxLength={4000} onChange={(event) => setKind(event.target.value)} /></label>
      <label htmlFor="survey-fix-description">Description<textarea id="survey-fix-description" rows={3} value={description} maxLength={4000} onChange={(event) => setDescription(event.target.value)} /></label>
      <button type="submit">Save correction</button>
    </form>
  </details>;
}
