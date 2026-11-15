'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Finding, Survey } from '../../../contracts/curb/survey';
import {
  clipFor,
  ESTIMATES,
  MEASURE_GROUPS,
  measureResults,
  priorityScore,
  STATUS_LABELS,
  type MeasureKey,
  type MeasurementEntries,
} from './measurements';
import { correctFinding, formatTime, REVIEW_LABELS, setReviewStatus } from './presentation';
import styles from './SurveyWorkspace.module.css';

export function FindingReview({ survey, editedIds, selectedFindingId, onSelectFinding, onChange, siteContext, measurements, onMeasure }: {
  survey: Survey;
  measurements: MeasurementEntries;
  onMeasure: (findingId: string, key: MeasureKey, text: string) => void;
  editedIds: string[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onChange: (survey: Survey, message: string) => void;
  /** Local map context, shown beside the finding list so map and selection stay connected. */
  siteContext?: ReactNode;
}) {
  const [reviewer, setReviewer] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const reviewerError = message?.startsWith('Enter a reviewer') ? message : null;
  const finding = survey.findings.find((item) => item.id === selectedFindingId) ?? null;

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
    <p className={styles.small}>Pick a defect to see it in the video. Accept or reject it, and add measurements if you have them.</p>

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
                <span className={styles[`priority_${priorityScore(item, measurements).band}`]}>{PRIORITY_WORDS[priorityScore(item, measurements).band]}</span>
                {' '}<span className={styles[`review_${item.review.status}`]}>{REVIEW_LABELS[item.review.status]}</span>
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
        <p className={styles.small}>Seen at {formatTime(finding.evidenceTime)} in the video</p>
        <Closeup key={finding.closeupSrc} src={finding.closeupSrc} alt={`Close-up of ${finding.label}`} />
        <p>{finding.description}</p>

        <dl className={styles.facts}>
          <div><dt>Review note</dt><dd><Fact {...reviewFact(finding)} /></dd></div>
          <div><dt>Priority</dt><dd><Fact {...priorityFact(finding, measurements)} /></dd></div>
          <div><dt>Measurements</dt><dd><Fact {...measurementFact(finding, measurements)} /></dd></div>
        </dl>
        <h4>Possible access effects</h4>
        <ul className={styles.plainList}>{finding.assessment.accessImpacts.map((impact) => <li key={impact}>{impact}</li>)}</ul>
        <MeasureTable finding={finding} entries={measurements} onMeasure={onMeasure} />

        {/* aria-disabled rather than disabled: the used button keeps keyboard focus instead of dropping it to the page. */}
        <p className={styles.decisionHelp} id="survey-decision-help">
          <strong>Accept</strong> confirms the defect is real: it is marked as checked by you and kept in the repair plan and report.{' '}
          <strong>Reject</strong> removes it from the plan but keeps it in the record. Enter your name above first.
        </p>
        <div className={styles.actions} role="group" aria-label="Review decision" aria-describedby="survey-decision-help">
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

        {message && !reviewerError ? <p role="alert" className={styles.inlineError}>{message}</p> : null}
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

const PRIORITY_WORDS = { high: 'High', medium: 'Medium', low: 'Low', unassessed: 'Not set' } as const;

function Fact({ headline, detail }: { headline: string; detail: string }) {
  return <><strong className={styles.factHeadline}>{headline}</strong><span className={styles.factDetail}>{detail}</span></>;
}

function reviewFact(finding: Finding): { headline: string; detail: string } {
  const { status, method, reviewer } = finding.review;
  if (status === 'accepted') return { headline: 'Accepted', detail: `${reviewer} confirmed this defect, so it is counted in the plan.` };
  if (status === 'rejected') return { headline: 'Rejected', detail: `${reviewer} marked this as not a defect, so it is left out of the plan.` };
  if (method === 'manual') return { headline: 'Reopened', detail: `${reviewer} sent this back for another look.` };
  const clip = clipFor(finding.id);
  return {
    headline: 'Not checked by a person yet',
    detail: clip
      ? `Flagged by the CLIP model, which compared this close-up with sidewalk descriptions and rated it ${Math.round(clip.damageScore * 100)}% likely to be damaged pavement.`
      : 'Flagged by the CLIP model from the walking video.',
  };
}

function priorityFact(finding: Finding, entries: MeasurementEntries): { headline: string; detail: string } {
  const score = priorityScore(finding, entries);
  const clip = clipFor(finding.id);
  return {
    headline: `${PRIORITY_WORDS[score.band]} priority · ${score.score}/100`,
    detail: `Measurements say ${PRIORITY_WORDS[score.reviewer].toLowerCase()} (70%) and CLIP-based travel impact says ${PRIORITY_WORDS[score.clip].toLowerCase()} (30%)${clip ? `, because CLIP rated this ${Math.round(clip.impactScore * 100)}% likely to be hard to walk or roll over` : ''}.`,
  };
}

function measurementFact(finding: Finding, entries: MeasurementEntries): { headline: string; detail: string } {
  const results = measureResults(finding.id, entries);
  const measured = results.filter((r) => r.source === 'measured').length;
  const fails = results.filter((r) => r.status === 'fails').length;
  const almost = results.filter((r) => r.status === 'almost').length;
  const verdict = fails ? `${fails} does not meet ADA` : almost ? `${almost} almost meets ADA` : 'All meet ADA';
  return {
    headline: `${verdict} · ${measured === 0 ? 'estimated' : `${measured} of ${results.length} measured`}`,
    detail: measured === results.length
      ? 'Every value below was entered by a reviewer.'
      : 'Values below start as estimates; type over any of them with a real measurement.',
  };
}

function MeasureTable({ finding, entries, onMeasure }: {
  finding: Finding;
  entries: MeasurementEntries;
  onMeasure: (findingId: string, key: MeasureKey, text: string) => void;
}) {
  const results = new Map(measureResults(finding.id, entries).map((r) => [r.spec.key, r]));
  return <section aria-labelledby="survey-measure-heading">
    <h4 id="survey-measure-heading">Needs measuring</h4>
    <p className={styles.measureIntro}>Each box starts with an <strong>estimate</strong> from the video and standard sidewalk construction. Type over it if you have a real measurement.</p>
    <ul className={styles.measureList}>{MEASURE_GROUPS.map((group) => <li key={group.id}>
      <strong>{group.need}</strong>
      <p className={styles.measureWhy}><span>{group.standard}:</span> {group.why}</p>
      <table className={styles.measureTable}>
        <colgroup><col className={styles.colCheck} /><col className={styles.colNeeds} /><col className={styles.colValue} /><col className={styles.colResult} /></colgroup>
        <thead><tr><th scope="col">Check</th><th scope="col">Needs</th><th scope="col">Value</th><th scope="col">Result</th></tr></thead>
        <tbody>{group.specs.map((spec) => {
          const result = results.get(spec.key)!;
          const estimate = estimateOf(finding.id, spec.key);
          const id = `measure-${finding.id}-${spec.key}`;
          // Untouched boxes show the estimate as their value; the reviewer edits it in place.
          const text = entries[finding.id]?.[spec.key] ?? (estimate === undefined ? '' : String(estimate));
          return <tr key={spec.key}>
            <th scope="row"><label htmlFor={id}>{spec.label}</label></th>
            <td>{spec.rule}</td>
            <td><span className={styles.measureInput}>
              <input id={id} inputMode="decimal" autoComplete="off" value={text}
                placeholder={estimate === undefined ? '—' : String(estimate)} aria-describedby={`${id}-source`}
                aria-invalid={entries[finding.id]?.[spec.key] !== undefined && result.source !== 'measured' && text.trim() !== '' ? true : undefined}
                onChange={(event) => onMeasure(finding.id, spec.key, event.target.value)} />
              <span aria-hidden="true">{spec.unit}</span>
              <span id={`${id}-source`} className={result.source === 'measured' ? styles.sourceMeasured : styles.sourceEstimate}>
                {result.source === 'measured' ? 'Measured' : 'Estimate'}
              </span>
            </span></td>
            <td>{result.status ? <span className={styles[`status_${result.status}`]}>{STATUS_LABELS[result.status]}</span> : '—'}</td>
          </tr>;
        })}</tbody>
      </table>
    </li>)}</ul>
  </section>;
}

function estimateOf(findingId: string, key: MeasureKey): number | undefined {
  return ESTIMATES[findingId]?.[key];
}
