'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Finding, RepairPlan, Survey } from '../../../contracts/curb/survey';
import type { Repair } from '../../../contracts/curb/survey';
import { WORKFLOW_ORDER } from '../../../contracts/curb/survey';
import {
  ACCESS_NEED_SHORT,
  appendedWorkflowIssue,
  canReopen,
  LOCATION_CONFIDENCE_LABELS,
  markReviewed,
  moveWorkflow,
  nextWorkflowStatus,
  repairOf,
  setEssentialDestination,
  setLocationConfidence,
  setOwner,
  WORKFLOW_LABELS,
  workflowStatus,
} from '../../../domain/curb/repair';
import {
  clipFor,
  ESTIMATES,
  formatMeasure,
  parseMeasureInput,
  type Basis,
  type MeasureResult,
  UNCERTAINTY_LABELS,
  uncertaintyTags,
  type PriorityScore,
  MEASURE_GROUPS,
  measureResults,
  priorityScore,
  STATUS_LABELS,
  type MeasureKey,
} from './measurements';
import { correctFinding, formatTime, REVIEW_LABELS, setReviewStatus } from './presentation';
import styles from './SurveyWorkspace.module.css';

export function FindingReview({ survey, original, editedIds, selectedFindingId, onSelectFinding, onChange, siteContext, plan, onMeasure }: {
  survey: Survey;
  /** Published baseline shared with JSON import and report validation, never a loaded review. */
  original: Pick<Survey, 'findings'>;
  /** The plan shown and exported, so cost tags match it. */
  plan: RepairPlan | undefined;
  onMeasure: (findingId: string, key: MeasureKey, input: MeasureInput) => void;
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
  const repair = finding ? repairOf(finding, survey) : null;
  const score = finding ? priorityScore(finding) : null;
  const pendingIssue = finding && appendedWorkflowIssue(
    { ...finding, review: { ...finding.review, status: 'pending', method: 'manual' } },
    original.findings.find((item) => item.id === finding.id),
  ) ? 'This finding has new repair steps, so it cannot be marked pending. Keep it accepted to continue repairs, or rejected to exclude it from plans. Its history is preserved.' : null;

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
    <p className={styles.small}>Pick a defect to see it in the video. Accept or reject it, and edit the assumed dimensions if you know better.</p>

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
                <span className={styles[`priority_${priorityScore(item).band}`]}>{PRIORITY_WORDS[priorityScore(item).band]}</span>
                {' '}<span className={styles[`review_${item.review.status}`]}>{REVIEW_LABELS[item.review.status]}</span>
                {editedIds.includes(item.id) ? ' · edited' : ''}
              </span>
            </button>
          </li>;
        })}
      </ol>
      {siteContext}
      </div>

      {finding && repair && score ? <article className={styles.findingDetail} aria-labelledby="survey-finding-heading">
        <h3 id="survey-finding-heading" tabIndex={-1}>{finding.label}</h3>
        <p className={styles.small}>Seen at {formatTime(finding.evidenceTime)} in the video</p>
        <Closeup key={finding.closeupSrc} src={finding.closeupSrc} alt={`Close-up of ${finding.label}`} />
        <p>{finding.description}</p>

        <ul className={styles.tagRow} aria-label="Open questions">
          {uncertaintyTags(survey, finding, plan).map((tag) => <li key={tag} className={styles.uncertainTag}>{UNCERTAINTY_LABELS[tag]}</li>)}
        </ul>
        <dl className={styles.facts}>
          <div><dt>Obstacle</dt><dd><Fact headline={repair.obstacle} detail={finding.description} /></dd></div>
          <div><dt>Location</dt><dd><Fact headline={repair.location} detail={`Location confidence: ${LOCATION_CONFIDENCE_LABELS[repair.locationConfidence]}.`} /></dd></div>
          <div><dt>Impact</dt><dd><Fact headline={repair.accessNeeds.length ? repair.accessNeeds.map((need) => ACCESS_NEED_SHORT[need]).join(' · ') : 'Not recorded'}
            detail={finding.assessment.accessImpacts[0] ?? 'No access effect recorded.'} /></dd></div>
          <div><dt>Evidence</dt><dd><Fact {...evidenceFact(finding)} /></dd></div>
          <div><dt>Owner</dt><dd><Fact headline={repair.owner ?? 'Unassigned'} detail={repair.owner ? 'Responsible for this repair.' : 'Set the person or department responsible below.'} /></dd></div>
          <div><dt>Review status</dt><dd><Fact {...reviewFact(finding)} /></dd></div>
          <div><dt>Priority</dt><dd><PriorityFact score={score} /></dd></div>
          <div><dt>Measurements</dt><dd><Fact {...measurementFact(finding)} /></dd></div>
        </dl>
        <p className={styles.notVerdict}>Checks compare values with stated ADA limits. This is not an ADA compliance determination.</p>
        <MeasureTable finding={finding} onMeasure={onMeasure} />

        {/* aria-disabled rather than disabled: the used button keeps keyboard focus instead of dropping it to the page. */}
        <p className={styles.decisionHelp} id="survey-decision-help">
          <strong>Accept</strong> confirms the defect is real: it is marked as checked by you, moves to “Reviewed”, and stays in the repair plan and report.{' '}
          <strong>Reject</strong> removes it from the plan and the repair workflow but keeps it in the record. Enter your name above first.
        </p>
        <div className={styles.actions} role="group" aria-label="Review decision" aria-describedby="survey-decision-help">
          <button type="button" id="survey-accept" className={finding.review.status === 'accepted' ? styles.decided : undefined}
            aria-disabled={finding.review.status === 'accepted'}
            onClick={() => {
              if (finding.review.status === 'accepted') return;
              const result = setReviewStatus(survey, finding.id, 'accepted', reviewer);
              apply(result.ok ? { ok: true, survey: markReviewed(result.survey, finding.id, reviewer) } : result, `Accepted “${finding.label}”. Repair status: reviewed.`);
            }}>Accept finding</button>
          <button type="button" className={`${styles.secondaryButton} ${finding.review.status === 'rejected' ? styles.decided : ''}`}
            aria-disabled={finding.review.status === 'rejected'}
            onClick={() => { if (finding.review.status !== 'rejected') apply(setReviewStatus(survey, finding.id, 'rejected', reviewer), `Rejected “${finding.label}”. It stays in the record and is excluded from plans.`); }}>Reject finding</button>
          {finding.review.status !== 'pending' ? <button type="button" className={styles.textButton}
            aria-disabled={pendingIssue !== null} aria-describedby={pendingIssue ? 'survey-pending-help' : undefined}
            onClick={() => {
              if (pendingIssue) { setMessage(pendingIssue); return; }
              const result = setReviewStatus(survey, finding.id, 'pending', reviewer);
              const done = apply(result, `Returned “${finding.label}” to pending.`);
              // This button disappears once the finding is pending; keep focus on the decision group.
              if (done) setTimeout(() => document.getElementById('survey-accept')?.focus(), 0);
            }}>Mark pending</button> : null}
        </div>
        {finding.review.status !== 'pending' && pendingIssue ? <p id="survey-pending-help" className={styles.small}>{pendingIssue}</p> : null}

        <RepairPanel key={`${finding.id}:${repair.owner}:${repair.essentialDestination}:${repair.destinationNote}`} survey={survey} finding={finding} reviewer={reviewer}
          onChange={(result, done) => apply(result, done)} />

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

function PriorityFact({ score }: { score: PriorityScore }) {
  return <>
    <strong className={styles.factHeadline}>{PRIORITY_WORDS[score.band]} priority · {score.score}/100 <span className={styles[`confidence_${score.confidence.level}`]}>Confidence: {score.confidence.level}</span></strong>
    <span className={styles.factDetail}>Ranked by access impact. Confidence: {score.confidence.reasons.join(', ')}.</span>
    <table className={styles.factorTable}>
      <caption className={styles.srOnly}>Priority factors</caption>
      <thead><tr><th scope="col">Factor</th><th scope="col">Weight</th><th scope="col">Points</th><th scope="col">Why</th></tr></thead>
      <tbody>{score.factors.map((factor) => <tr key={factor.key}>
        <th scope="row">{factor.label}</th><td>{Math.round(factor.weight * 100)}%</td><td>{factor.points}</td><td>{factor.detail}</td>
      </tr>)}</tbody>
    </table>
  </>;
}

function evidenceFact(finding: Finding): { headline: string; detail: string } {
  const clip = clipFor(finding.id);
  const measured = measureResults(finding).filter((r) => r.basis === 'measured').length;
  return {
    headline: `Video at ${formatTime(finding.evidenceTime)} · close-up photo${clip ? ` · CLIP ${Math.round(clip.damageScore * 100)}% damage` : ''}`,
    detail: `${measured ? `${measured} field measurement${measured === 1 ? '' : 's'} entered` : 'No field measurements yet; dimensions are assumed'}${clip ? `; CLIP travel impact ${Math.round(clip.impactScore * 100)}%` : ''}.`,
  };
}

function measurementFact(finding: Finding): { headline: string; detail: string } {
  const results = measureResults(finding);
  const measured = results.filter((r) => r.basis === 'measured').length;
  const fails = results.filter((r) => r.status === 'fails').length;
  const almost = results.filter((r) => r.status === 'almost').length;
  const verdict = fails ? `${fails} check${fails === 1 ? '' : 's'} over the ADA limit` : almost ? `${almost} check${almost === 1 ? '' : 's'} close to the limit` : 'All checks within the limits';
  return {
    headline: `${verdict} · ${measured === 0 ? 'all assumed' : `${measured} of ${results.length} measured`}`,
    detail: measured === results.length
      ? 'Every value below was measured on site.'
      : 'Assumed values are planning estimates. Edit them below, and tick “Measured on site” only for real measurements.',
  };
}

type MeasureInput = { value: number; unit: string; basis: Basis } | null;

function MeasureTable({ finding, onMeasure }: {
  finding: Finding;
  onMeasure: (findingId: string, key: MeasureKey, input: MeasureInput) => void;
}) {
  const results = new Map(measureResults(finding).map((r) => [r.spec.key, r]));
  return <section aria-labelledby="survey-measure-heading">
    <h4 id="survey-measure-heading">Dimensions</h4>
    <p className={styles.measureIntro}>Each box starts with an <strong>assumed</strong> value from the video and standard sidewalk construction, used for planning. Edit any value. Tick <strong>Measured on site</strong> only when it is a real measurement. Lengths are in inches (you can type mm, cm, m or ft); slopes are in percent.</p>
    <ul className={styles.measureList}>{MEASURE_GROUPS.map((group) => <li key={group.id}>
      <strong>{group.need}</strong>
      <p className={styles.measureWhy}><span>{group.standard}:</span> {group.why}</p>
      <table className={styles.measureTable}>
        <colgroup><col className={styles.colCheck} /><col className={styles.colNeeds} /><col className={styles.colValue} /><col className={styles.colResult} /></colgroup>
        <thead><tr><th scope="col">Check</th><th scope="col">Needs</th><th scope="col">Value</th><th scope="col">Result</th></tr></thead>
        <tbody>{group.specs.map((spec) => <MeasureRow key={`${finding.id}:${spec.key}`} finding={finding} result={results.get(spec.key)!} onMeasure={onMeasure} />)}</tbody>
      </table>
    </li>)}</ul>
  </section>;
}

function storedText(result: MeasureResult): string {
  if (result.value === null) return '';
  return result.recorded && !result.recorded.endsWith(` ${result.spec.unit}`) ? result.recorded : String(result.value);
}

function MeasureRow({ finding, result, onMeasure }: {
  finding: Finding;
  result: MeasureResult;
  onMeasure: (findingId: string, key: MeasureKey, input: MeasureInput) => void;
}) {
  const { spec } = result;
  const [text, setText] = useState(() => storedText(result));
  const [error, setError] = useState<string | null>(null);
  const id = `measure-${finding.id}-${spec.key}`;
  const parsed = parseMeasureInput(text, spec.key);
  // Follow outside changes (restore, load JSON) without fighting the reviewer's typing.
  useEffect(() => {
    if (!(parsed.ok && parsed.canonical === result.value) && !(text.trim() === '' && result.isDefault)) { setText(storedText(result)); setError(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.value, result.recorded, result.isDefault]);

  function change(next: string, basis: Basis = result.basis) {
    setText(next);
    if (next.trim() === '') { setError(null); onMeasure(finding.id, spec.key, null); return; }
    const value = parseMeasureInput(next, spec.key);
    if (!value.ok) { setError(value.message); return; }
    setError(null);
    onMeasure(finding.id, spec.key, { value: value.value, unit: value.unit, basis });
  }

  return <tr>
    <th scope="row"><label htmlFor={id}>{spec.label}</label></th>
    <td>{spec.rule}</td>
    <td>
      <span className={styles.measureInput}>
        <input id={id} inputMode="decimal" autoComplete="off" value={text}
          placeholder={String(ESTIMATES[finding.id]?.[spec.key] ?? '')} aria-describedby={`${id}-source${error ? ` ${id}-error` : ''}`}
          aria-invalid={error ? true : undefined} onChange={(event) => change(event.target.value)} />
        <span aria-hidden="true">{spec.unit}</span>
      </span>
      <span id={`${id}-source`} className={result.basis === 'measured' ? styles.sourceMeasured : styles.sourceEstimate}>
        {result.basis === 'measured' ? 'Measured' : result.isDefault ? 'Assumed' : 'Assumed (edited)'}
        {parsed.ok && parsed.unit !== spec.unit && result.value !== null ? ` · = ${formatMeasure(result.value, spec)}` : ''}
      </span>
      <label className={styles.measuredToggle}>
        <input type="checkbox" checked={result.basis === 'measured'} disabled={!parsed.ok}
          onChange={(event) => change(text, event.target.checked ? 'measured' : 'assumed')} /> Measured on site
      </label>
      {error ? <span id={`${id}-error`} className={styles.inlineError}>{error}</span> : null}
    </td>
    <td>{result.status ? <span className={styles[`status_${result.status}`]}>{STATUS_LABELS[result.status]}</span> : '—'}</td>
  </tr>;
}

type EditResult = { ok: true; survey: Survey } | { ok: false; message: string };

/** Owner, essential destination, location confidence and the remediation workflow. */
function RepairPanel({ survey, finding, reviewer, onChange }: {
  survey: Survey;
  finding: Finding;
  reviewer: string;
  onChange: (result: EditResult, done: string) => boolean;
}) {
  const repair = repairOf(finding, survey);
  const [owner, setOwnerText] = useState(repair.owner ?? '');
  const [destination, setDestination] = useState<Repair['essentialDestination']>(repair.essentialDestination);
  const [destinationNote, setDestinationNote] = useState(repair.destinationNote ?? '');
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState('');
  const status = workflowStatus(finding);
  const next = nextWorkflowStatus(finding);
  const rejected = finding.review.status === 'rejected';

  function step(action: 'advance' | 'reopen') {
    const done = onChange(moveWorkflow(survey, finding.id, { action, by: reviewer, note, evidence }),
      action === 'reopen' ? `Reopened “${finding.label}”.` : `Moved “${finding.label}” to ${next ? WORKFLOW_LABELS[next].toLowerCase() : ''}.`);
    if (done) { setNote(''); setEvidence(''); }
  }

  return <section className={styles.repairPanel} aria-labelledby="survey-repair-heading">
    <h4 id="survey-repair-heading">Repair handoff</h4>
    <div className={styles.repairGrid}>
      <label htmlFor="survey-owner">Owner
        <span className={styles.inlineField}>
          <input id="survey-owner" value={owner} placeholder="Unassigned" maxLength={200} onChange={(event) => setOwnerText(event.target.value)} />
          <button type="button" className={styles.secondaryButton}
            onClick={() => onChange({ ok: true, survey: setOwner(survey, finding.id, owner) }, owner.trim() ? `Owner set to ${owner.trim()}.` : 'Owner cleared.')}>Save</button>
        </span>
      </label>
      <label htmlFor="survey-location-confidence">Location confidence
        <select id="survey-location-confidence" value={repair.locationConfidence}
          onChange={(event) => onChange({ ok: true, survey: setLocationConfidence(survey, finding.id, event.target.value as Repair['locationConfidence']) }, 'Location confidence updated.')}>
          {(Object.keys(LOCATION_CONFIDENCE_LABELS) as Repair['locationConfidence'][]).map((value) => <option key={value} value={value}>{LOCATION_CONFIDENCE_LABELS[value]}</option>)}
        </select>
      </label>
      <label htmlFor="survey-destination">Blocks the main route to an essential place?
        <select id="survey-destination" value={destination} onChange={(event) => setDestination(event.target.value as Repair['essentialDestination'])}>
          <option value="unknown">Unknown (not checked)</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
      {destination !== 'unknown' ? <label htmlFor="survey-destination-note">Which place, and why?
        <input id="survey-destination-note" value={destinationNote} maxLength={400} placeholder="e.g. only step-free route to the main entrance"
          onChange={(event) => setDestinationNote(event.target.value)} />
      </label> : null}
    </div>
    {destination !== repair.essentialDestination || (destination !== 'unknown' && destinationNote !== (repair.destinationNote ?? ''))
      ? <button type="button" className={styles.secondaryButton}
        onClick={() => onChange(setEssentialDestination(survey, finding.id, destination, destinationNote), 'Essential destination updated.')}>Save destination answer</button> : null}

    <h4>Repair status: {rejected ? 'Rejected (out of workflow)' : WORKFLOW_LABELS[status]}</h4>
    <ol className={styles.workflowSteps} aria-label="Repair workflow">
      {WORKFLOW_ORDER.map((item) => <li key={item} className={item === status && !rejected ? styles.stepCurrent : WORKFLOW_ORDER.indexOf(item) < WORKFLOW_ORDER.indexOf(status) ? styles.stepDone : styles.stepTodo}
        aria-current={item === status && !rejected ? 'step' : undefined}>{WORKFLOW_LABELS[item]}</li>)}
    </ol>
    <ol className={styles.timeline} aria-label="Repair history">
      {repair.workflow.map((entry, index) => <li key={index}>
        <strong>{entry.action === 'reopen' ? 'Reopened → ' : ''}{WORKFLOW_LABELS[entry.status]}</strong> · {entry.by} · <time dateTime={entry.at}>{new Date(entry.at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</time>
        <span className={styles.factDetail}>{entry.note}{entry.evidence ? ` Evidence: ${entry.evidence}` : ''}</span>
      </li>)}
    </ol>
    {rejected ? null : status === 'submitted'
      ? <p className={styles.small}>Accept the finding to mark it reviewed.</p>
      : finding.review.status !== 'accepted' || finding.review.method !== 'manual'
      ? <p className={styles.small}>Accept the finding by manual review before changing its repair status. Its existing repair history is kept.</p>
      : <div className={styles.workflowForm}>
        <label htmlFor="survey-workflow-note">{next === 'completed' ? 'Completion note (what was done)' : 'Note for this step'}
          <input id="survey-workflow-note" value={note} maxLength={400} onChange={(event) => setNote(event.target.value)}
            placeholder={next === 'planned' ? 'e.g. scheduled with Grounds for May' : next === 'completed' ? 'e.g. panel replaced on 3 May' : 'Short note'} />
        </label>
        {next === 'reverified' ? <label htmlFor="survey-workflow-evidence">Fresh evidence (new measurement, photo or video)
          <input id="survey-workflow-evidence" value={evidence} maxLength={400} onChange={(event) => setEvidence(event.target.value)}
            placeholder="e.g. height difference now 0.1 in; photo IMG_0815" />
        </label> : null}
        <div className={styles.actions}>
          {next ? <button type="button" onClick={() => step('advance')}>Move to {WORKFLOW_LABELS[next]}</button> : <span className={styles.small}>Fully re-verified.</span>}
          {canReopen(finding) ? <button type="button" className={styles.secondaryButton} onClick={() => step('reopen')}>Reopen</button> : null}
        </div>
      </div>}
  </section>;
}
