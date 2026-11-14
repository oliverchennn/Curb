'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SurveySchema, type PlanId, type RepairPlan, type Survey } from '../../../contracts/curb/survey';
import { buildRepairPlans, costRange, fetchSurvey } from './services';
import { ExportPanel } from './ExportPanel';
import { FindingReview } from './FindingReview';
import { PlanCompare } from './PlanCompare';
import { editedFindingIds, isEdited, parseBudgetInput, PLAN_ORDER, sliderMaxCents } from './presentation';
import { SiteContext } from './SiteContext';
import { VideoEvidence, type SeekRequest } from './VideoEvidence';
import styles from './SurveyWorkspace.module.css';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; original: Survey };
const LOAD_TIMEOUT_MS = 15_000;

function loadErrorMessage(error: unknown): string {
  if (error instanceof Error && /fetchSurvey|is not a function|Cannot find module/i.test(error.message)) {
    return 'The survey client is not available in this build yet. The survey data service must be integrated before this page can load.';
  }
  if (error instanceof TypeError) return 'Could not reach the survey service. Check that the app is running, then retry.';
  if (error instanceof Error && error.message) return `The survey could not be loaded: ${error.message} Retry, or check that the Robertson Hall survey data is published.`;
  return 'The survey could not be loaded. Retry, or check that the Robertson Hall survey data is published.';
}

export function SurveyWorkspace() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [seek, setSeek] = useState<SeekRequest | null>(null);
  const [budgetText, setBudgetText] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('balanced');
  const [notice, setNotice] = useState('');
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const loadSurvey = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const generation = ++generationRef.current;
    const isCurrent = () => generation === generationRef.current && !controller.signal.aborted;
    setLoad({ status: 'loading' });
    const timer = setTimeout(() => {
      if (!isCurrent()) return;
      controller.abort();
      setLoad({ status: 'error', message: 'Loading the survey took too long. Retry when ready.' });
    }, LOAD_TIMEOUT_MS);
    Promise.resolve().then(() => fetchSurvey(controller.signal)).then((data) => {
      clearTimeout(timer);
      if (!isCurrent()) return;
      setLoad({ status: 'ready', original: data });
      setSurvey(data);
      setSelectedFindingId(data.findings[0]?.id ?? null);
    }, (error: unknown) => {
      clearTimeout(timer);
      if (!isCurrent() || (error instanceof DOMException && error.name === 'AbortError')) return;
      setLoad({ status: 'error', message: loadErrorMessage(error) });
    });
  }, []);

  useEffect(() => {
    loadSurvey();
    return () => {
      generationRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [loadSurvey]);

  const budget = parseBudgetInput(budgetText);
  const budgetCents = budget.ok ? budget.cents : null;

  // Plans always come from the root evaluator over the current validated survey.
  const planResult = useMemo((): { plans: RepairPlan[]; error: string | null } => {
    if (!survey) return { plans: [], error: null };
    if (!SurveySchema.safeParse(survey).success) return { plans: [], error: 'The reviewed survey failed validation, so no plans were computed. Restore the original survey.' };
    try {
      const plans = buildRepairPlans(survey, budgetCents ?? undefined);
      return { plans: [...plans].sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id)), error: null };
    } catch (error) {
      return { plans: [], error: `Repair plans could not be computed${error instanceof Error ? `: ${error.message}` : '.'}` };
    }
  }, [survey, budgetCents]);

  const effectivePlanId: PlanId = planResult.plans.some((plan) => plan.id === selectedPlanId) ? selectedPlanId : 'balanced';
  const selectedPlan = planResult.plans.find((plan) => plan.id === effectivePlanId);

  if (load.status !== 'ready' || !survey) {
    return <div className={styles.workspace}>
      <Header />
      {load.status === 'loading' ? <p role="status" className={styles.card}>Loading the Robertson Hall survey…</p> : null}
      {load.status === 'error' ? <div role="alert" className={styles.errorBox}>
        <p>{load.message}</p>
        <button type="button" onClick={loadSurvey}>Retry</button>
      </div> : null}
    </div>;
  }

  const original = load.original;
  const edited = isEdited(original, survey);
  const editedIds = editedFindingIds(original, survey);
  let sliderMax = 100_000;
  try { sliderMax = sliderMaxCents(survey, costRange); } catch { /* keep default */ }

  function selectFinding(findingId: string) {
    const finding = survey!.findings.find((item) => item.id === findingId);
    if (!finding) return;
    setSelectedFindingId(findingId);
    setSeek({ seconds: finding.evidenceTime, nonce: Date.now() });
  }

  function restore() {
    setSurvey(original);
    setNotice('Restored the original analysis. All review edits were discarded.');
  }

  const counts = {
    accepted: survey.findings.filter((f) => f.review.status === 'accepted').length,
    pending: survey.findings.filter((f) => f.review.status === 'pending').length,
    rejected: survey.findings.filter((f) => f.review.status === 'rejected').length,
  };

  return <div className={styles.workspace}>
    <Header survey={survey} />
    <div className={styles.summaryBar}>
      <p><strong>{survey.findings.length}</strong> findings · {counts.accepted} accepted · {counts.pending} pending · {counts.rejected} rejected · {survey.workAreas.length} work areas</p>
      <p className={styles.small}>Analysis: {survey.analysis.method} ({survey.analysis.model}). {survey.analysis.note}</p>
      <div className={styles.actions}>
        {edited ? <span className={styles.editedTag}>Edited — {editedIds.length} finding{editedIds.length === 1 ? '' : 's'} changed</span> : <span className={styles.small}>Original analysis</span>}
        <button type="button" className={styles.secondaryButton} disabled={!edited} onClick={restore}>Restore original</button>
      </div>
      <p role="status" aria-live="polite" className={styles.small}>{notice}</p>
    </div>

    <div className={styles.stage}>
      <VideoEvidence survey={survey} selectedFindingId={selectedFindingId} seek={seek} edited={edited} />
      <SiteContext survey={survey} selectedFindingId={selectedFindingId} onSelectFinding={selectFinding} />
    </div>

    <nav className={styles.steps} aria-label="Workflow">
      <a href="#survey-review-heading">1 Review findings</a>
      <a href="#survey-plans-heading">2 Compare repairs</a>
      <a href="#survey-export-heading">3 Export report</a>
    </nav>

    <FindingReview survey={survey} editedIds={editedIds} selectedFindingId={selectedFindingId} onSelectFinding={selectFinding}
      onChange={(next, message) => { setSurvey(next); setNotice(message); }} />
    <PlanCompare survey={survey} plans={planResult.plans} planError={planResult.error} budgetText={budgetText} budget={budget}
      sliderMax={sliderMax} selectedFindingId={selectedFindingId} selectedPlanId={effectivePlanId}
      onBudgetText={setBudgetText} onSelectPlan={setSelectedPlanId} />
    <ExportPanel survey={survey} edited={edited} plan={selectedPlan} budgetCents={budgetCents} />

    <p className={styles.footerNote}>AI-assisted findings from one walk-through video. Not a measured survey, an ADA compliance determination, a cost quote or a record of completed repairs. Route impact is unknown because no reviewed route graph exists for this site.</p>
  </div>;
}

function Header({ survey }: { survey?: Survey }) {
  return <header className={styles.header}>
    <nav className={styles.navLinks} aria-label="Curb pages">
      <Link href="/curb">← Campus barrier review</Link>
      <Link href="/curb/plans">Budget comparison (synthetic)</Link>
    </nav>
    <p className={styles.eyebrow}>Survey replay · field video</p>
    <h1>{survey ? survey.title : 'Robertson Hall access survey'}</h1>
    <p className={styles.lede}>Review what the walk-through video shows, compare repair policies, and export a report that keeps unknowns visible.</p>
  </header>;
}
