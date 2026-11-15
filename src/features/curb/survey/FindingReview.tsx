'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { PrioritySchema, type Priority, type Survey } from '../../../contracts/curb/survey';
import {
  areaForFinding,
  correctFinding,
  formatTime,
  METHOD_LABELS,
  PRIORITY_LABELS,
  REVIEW_LABELS,
  reviewedAreaPriorityReason,
  setAreaPriority,
  setReviewStatus,
} from './presentation';
import styles from './SurveyWorkspace.module.css';

type WorkArea = Survey['workAreas'][number];
type SavedPriority = { area: WorkArea; reason: string };
type SavePriorityResult =
  | { ok: true }
  | { ok: false; field: 'reviewer' }
  | { ok: false; field: 'rationale'; message: string };

export function FindingReview({ survey, editedIds, selectedFindingId, onSelectFinding, onChange, siteContext }: {
  survey: Survey;
  editedIds: string[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onChange: (survey: Survey, message: string) => void;
  /** Local map context, shown beside the finding list so map and selection stay connected. */
  siteContext?: ReactNode;
}) {
  const [reviewer, setReviewer] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [priorityReviews, setPriorityReviews] = useState<Record<string, SavedPriority>>({});
  const reviewerError = message?.startsWith('Enter a reviewer') ? message : null;
  const finding = survey.findings.find((item) => item.id === selectedFindingId) ?? null;
  const area = finding ? areaForFinding(survey, finding.id) : undefined;
  const sources = new Map(survey.sources.map((source) => [source.id, source]));
  const savedPriority = area && priorityReviews[area.id]?.area === area ? priorityReviews[area.id] : undefined;

  // A message belongs to the finding it was raised for; selecting another finding clears it.
  useEffect(() => setMessage(null), [selectedFindingId]);

  function apply(result: { ok: true; survey: Survey } | { ok: false; message: string }, done: string): boolean {
    if (!result.ok) {
      setMessage(result.message);
      if (result.message.startsWith('Enter a reviewer')) document.getElementById('survey-reviewer')?.focus();
      return false;
    }
    setMessage(null);
    onChange(result.survey, done);
    return true;
  }

  function savePriority(area: WorkArea, priority: Priority, reason: string): SavePriorityResult {
    const result = setAreaPriority(survey, area.id, priority, reviewer, reason);
    if (!result.ok) {
      if (result.message.startsWith('Enter a reviewer')) {
        apply(result, '');
        return { ok: false, field: 'reviewer' };
      }
      return { ok: false, field: 'rationale', message: result.message };
    }
    const reviewedArea = result.survey.workAreas.find(item => item.id === area.id);
    if (reviewedArea) {
      setPriorityReviews(current => ({ ...current, [area.id]: { area: reviewedArea, reason: reason.trim() } }));
    }
    setMessage(null);
    onChange(result.survey, '');
    return { ok: true };
  }

  return <section className={styles.card} aria-labelledby="survey-review-heading">
    <div className={styles.panelHeading}>
      <h2 id="survey-review-heading"><span className={styles.stepNumber}>1</span> Review findings</h2>
      <div>
        <label className={styles.inlineLabel} htmlFor="survey-reviewer">Reviewer
          <input id="survey-reviewer" value={reviewer} autoComplete="name" placeholder="Your name"
            aria-invalid={reviewerError ? true : undefined} aria-describedby={reviewerError ? 'survey-reviewer-error' : undefined}
            onChange={(event) => { setReviewer(event.target.value); if (event.target.value.trim()) setMessage((current) => current?.startsWith('Enter a reviewer') ? null : current); }} />
        </label>
        {reviewerError ? <p id="survey-reviewer-error" role="alert" className={styles.inlineError}>{reviewerError}</p> : null}
      </div>
    </div>
    <p className={styles.small}>Findings are AI-assisted suggestions until a person reviews them. Selecting one jumps the video to its evidence frame. Decisions and corrections are recorded as manual review.</p>

    <div className={styles.reviewLayout}>
      <div className={styles.reviewAside}>
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
      {siteContext}
      </div>

      {finding ? <article className={styles.findingDetail} aria-labelledby="survey-finding-heading">
        <h3 id="survey-finding-heading" tabIndex={-1}>{finding.label}</h3>
        <p className={styles.small}>{finding.kind} · evidence at {formatTime(finding.evidenceTime)} · ID <code>{finding.id}</code></p>
        <Closeup key={finding.closeupSrc} src={finding.closeupSrc} alt={`Close-up of ${finding.label}`} />
        <p>{finding.description}</p>

        <dl className={styles.facts}>
          <div><dt>Review</dt><dd><span className={styles[`review_${finding.review.status}`]}>{REVIEW_LABELS[finding.review.status]}</span> · {METHOD_LABELS[finding.review.method]} · {finding.review.reviewer}</dd></div>
          <div><dt>Review note</dt><dd>{finding.review.note}</dd></div>
          <div><dt>Proposed finding priority</dt><dd>{PRIORITY_LABELS[finding.assessment.priority]} — {finding.assessment.rationale}</dd></div>
          <div><dt>Measurements</dt><dd>{finding.measurements.length === 0
            ? 'None recorded. Dimensions are unknown until measured on site.'
            : finding.measurements.map((m) => `${m.property}: ${m.value} ${m.unit} (${m.method})`).join('; ')}</dd></div>
        </dl>
        <h4>Possible access effects</h4>
        <ul className={styles.plainList}>{finding.assessment.accessImpacts.map((impact) => <li key={impact}>{impact}</li>)}</ul>
        <h4>Needs measuring</h4>
        <ul className={styles.plainList}>{finding.assessment.measurementNeeds.map((need) => <li key={need}>{need}</li>)}</ul>
        <details className={styles.pendingChecks}>
          <summary>Standards checks ({finding.assessment.checks.length}): need measurement or not assessed. Not a compliance verdict.</summary>
          <ul className={styles.plainList}>{finding.assessment.checks.map((check, index) => {
            const source = sources.get(check.sourceId);
            return <li key={index}>
              <strong>{check.status === 'needs_measurement' ? 'Needs measurement' : 'Not assessed'}</strong> · {source?.title ?? check.sourceId} §{check.section}. {check.note}
            </li>;
          })}</ul>
        </details>

        {/* aria-disabled rather than disabled: the used button keeps keyboard focus instead of dropping it to the page. */}
        <div className={styles.actions} role="group" aria-label="Review decision">
          <button type="button" id="survey-accept" className={finding.review.status === 'accepted' ? styles.decided : undefined}
            aria-disabled={finding.review.status === 'accepted'}
            onClick={() => { if (finding.review.status !== 'accepted') apply(setReviewStatus(survey, finding.id, 'accepted', reviewer), `Accepted “${finding.label}”.`); }}>Accept finding</button>
          <button type="button" className={`${styles.secondaryButton} ${finding.review.status === 'rejected' ? styles.decided : ''}`}
            aria-disabled={finding.review.status === 'rejected'}
            onClick={() => { if (finding.review.status !== 'rejected') apply(setReviewStatus(survey, finding.id, 'rejected', reviewer), `Rejected “${finding.label}”. It stays in the record and is excluded from plans.`); }}>Reject finding</button>
          {finding.review.status !== 'pending' ? <button type="button" className={styles.textButton}
            onClick={() => {
              const done = apply(setReviewStatus(survey, finding.id, 'pending', reviewer), `Returned “${finding.label}” to pending.`);
              // This button disappears once the finding is pending; keep focus on the decision group.
              if (done) setTimeout(() => document.getElementById('survey-accept')?.focus(), 0);
            }}>Mark pending</button> : null}
        </div>

        <CorrectionForm key={`${finding.id}:${finding.label}:${finding.kind}:${finding.description}`} finding={finding}
          onSave={(correction) => apply(correctFinding(survey, finding.id, correction, reviewer), `Saved corrections to “${correction.label.trim()}”.`)} />

        {area ? <AreaPriorityForm key={area.id} area={area} savedPriority={savedPriority}
          onSave={(priority, reason) => savePriority(area, priority, reason)} />
          : <p className={styles.small}>This finding is not grouped into a work area.</p>}
        {message && !reviewerError ? <p role="alert" className={styles.inlineError}>{message}</p> : null}
      </article> : <p className={styles.small}>Select a finding to review its evidence.</p>}
    </div>
  </section>;
}

function AreaPriorityForm({ area, savedPriority, onSave }: {
  area: WorkArea;
  savedPriority?: SavedPriority;
  onSave: (priority: Priority, reason: string) => SavePriorityResult;
}) {
  const [draft, setDraft] = useState<{ area: WorkArea; priority: Priority; reason: string } | null>(null);
  const [error, setError] = useState<{ area: WorkArea; message: string } | null>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  // Use the latest area as the baseline when a save or Restore original changes it.
  const activeDraft = draft?.area === area ? draft : null;
  const priority = activeDraft?.priority ?? area.priority;
  const reason = activeDraft?.reason ?? savedPriority?.reason ?? reviewedAreaPriorityReason(area.rationale);
  const rationaleError = error?.area === area ? error.message : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onSave(priority, reason);
    if (result.ok) {
      setDraft(null);
      setError(null);
    } else if (result.field === 'rationale') {
      setError({ area, message: result.message });
      reasonInput.current?.focus();
    }
  }

  return <form className={styles.areaBox} onSubmit={submit}>
    <label htmlFor="survey-area-priority"><strong>{area.label}</strong> priority
      <select id="survey-area-priority" value={priority}
        onChange={(event) => setDraft({ area, priority: event.target.value as Priority, reason })}>
        {PrioritySchema.options.map(value => <option key={value} value={value}>{PRIORITY_LABELS[value]}</option>)}
      </select>
    </label>
    <p className={styles.small}><strong>Current work-area priority: {PRIORITY_LABELS[area.priority]}.</strong> {area.rationale} {area.nearTerm ? 'Flagged for near-term work.' : 'Not flagged for near-term work.'}</p>
    <label htmlFor="survey-area-rationale">Why this priority matters for access
      <textarea ref={reasonInput} id="survey-area-rationale" rows={2} maxLength={3500} value={reason}
        aria-invalid={rationaleError ? true : undefined} aria-describedby={rationaleError ? 'survey-area-rationale-error' : undefined}
        onChange={(event) => { setDraft({ area, priority, reason: event.target.value }); setError(null); }}
        placeholder="Access need, uncertainty, and what the site visit should confirm" />
    </label>
    {rationaleError ? <p id="survey-area-rationale-error" role="alert" className={styles.inlineError}>{rationaleError}</p> : null}
    <button type="submit" className={styles.secondaryButton}>Save accessibility priority</button>
    <p role="status" aria-atomic="true" className={styles.small}>
      {savedPriority && !activeDraft ? `Saved as ${PRIORITY_LABELS[area.priority].toLowerCase()}.` : ''}
    </p>
  </form>;
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
