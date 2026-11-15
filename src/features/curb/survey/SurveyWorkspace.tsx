'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { SurveySchema, type PlanId, type RepairPlan, type Survey } from '../../../contracts/curb/survey';
import { costRange, fetchSurvey } from './services';
import { ExportPanel } from './ExportPanel';
import { FindingReview } from './FindingReview';
import { PlanCompare } from './PlanCompare';
import { editedFindingIds, formatTime, isEdited, parseBudgetInput, PLAN_ORDER, sliderMaxCents } from './presentation';
import { buildAllPlans, clipSummary, withMeasurement, type Basis, type MeasureKey } from './measurements';
import { workflowSummary } from '../../../domain/curb/repair';
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

type WorkTab = 'review' | 'plans' | 'export';
const WORK_TABS: { id: WorkTab; number: number; label: string; heading: string }[] = [
  { id: 'review', number: 1, label: 'Review findings', heading: 'survey-review-heading' },
  { id: 'plans', number: 2, label: 'Repair plan', heading: 'survey-plans-heading' },
  { id: 'export', number: 3, label: 'Export report', heading: 'survey-export-heading' },
];

/** Tab for an earlier in-page anchor such as #survey-plans-heading, so old links still open the right pane. */
function tabForHash(hash: string): WorkTab | null {
  let id = hash.replace(/^#/, '');
  try { id = decodeURIComponent(id); } catch { /* keep raw */ }
  return WORK_TABS.find((item) => item.heading === id)?.id ?? null;
}

export function SurveyWorkspace() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [seek, setSeek] = useState<SeekRequest | null>(null);
  const [budgetText, setBudgetText] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('suggested');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<WorkTab>('review');
  const scrollRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  useFitVideoToScreen(deskRef, load.status === 'ready');
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
      // Explorer links identify a finding in this validated survey, never an arbitrary seek time.
      const requestedId = new URLSearchParams(window.location.search).get('finding');
      const linkedFinding = data.findings.find((finding) => finding.id === requestedId);
      setSelectedFindingId(linkedFinding?.id ?? data.findings[0]?.id ?? null);
      if (linkedFinding) setSeek({ seconds: linkedFinding.evidenceTime, nonce: Date.now() });
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

  // Earlier in-page anchors (#survey-plans-heading and so on) open the matching tab.
  useEffect(() => {
    const follow = () => { const next = tabForHash(window.location.hash); if (next) setTab(next); };
    follow();
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);

  const budget = parseBudgetInput(budgetText);
  const budgetCents = budget.ok ? budget.cents : null;

  // One computation feeds the page and the report: the suggested plan plus the root evaluator's plans.
  const planResult = useMemo((): { plans: RepairPlan[]; error: string | null } => {
    if (!survey) return { plans: [], error: null };
    if (!SurveySchema.safeParse(survey).success) return { plans: [], error: 'The reviewed survey failed validation, so no plans were computed. Restore the original survey.' };
    try {
      const plans = buildAllPlans(survey, budgetCents);
      return { plans: [...plans].sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id)), error: null };
    } catch (error) {
      return { plans: [], error: `Repair plans could not be computed${error instanceof Error ? `: ${error.message}` : '.'}` };
    }
  }, [survey, budgetCents]);

  const effectivePlanId: PlanId = planResult.plans.some((plan) => plan.id === selectedPlanId) ? selectedPlanId : 'suggested';
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

  /** Dimensions are stored on the survey with their basis, so plans, exports and reloads agree. */
  function setMeasure(findingId: string, key: MeasureKey, input: { value: number; unit: string; basis: Basis } | null) {
    setSurvey((current) => current ? withMeasurement(current, findingId, key, input) : current);
  }

  function loadReviewed(next: Survey) {
    setSurvey(next);
    setNotice('Loaded the reviewed survey from JSON.');
  }

  function changeTab(next: WorkTab) {
    setTab(next);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function restore() {
    if (!edited) return;
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
      <p><strong>{survey.findings.length} possible defects</strong> · {counts.accepted + counts.rejected} of {survey.findings.length} checked by a person · <span className={styles.workflowSummary}>Repairs: {workflowSummary(survey).text}</span></p>
      <details className={styles.pendingChecks}>
        <summary>Analysis and review status</summary>
        <dl className={styles.statusList}>
          <div><dt>Tools</dt><dd>CLIP · AI vision assistant · optical-flow tracking · human review</dd></div>
          <div><dt>Analysis</dt><dd>Found {survey.findings.length} possible defects in a {Math.round(survey.media.durationSeconds)}-second walking video. CLIP agrees on {clipSummary(survey).confirmed} of {clipSummary(survey).total}.</dd></div>
          <div><dt>Review</dt><dd>{counts.accepted} accepted · {counts.rejected} rejected · {counts.pending} waiting. Measurements are estimates until someone measures on site.</dd></div>
        </dl>
      </details>
      <div className={styles.actions}>
        {edited ? <span className={styles.editedTag}>Edited — {editedIds.length} finding{editedIds.length === 1 ? '' : 's'} changed</span> : <span className={styles.small}>Original analysis</span>}
        {/* aria-disabled (not disabled) so keyboard focus stays on the button after it is used. */}
        <button type="button" className={styles.secondaryButton} aria-disabled={!edited} onClick={restore}>Restore original</button>
      </div>
      {edited ? <p className={styles.sessionNote}>Edits stay in this browser tab only and are lost on reload. To keep them, use Export report, then Download JSON.</p> : null}
      <p role="status" aria-live="polite" aria-atomic="true" className={styles.small}>{notice}</p>
    </div>

    <div ref={deskRef} className={styles.desk}>
      <div className={styles.evidenceColumn} data-evidence-column>
        <VideoEvidence survey={survey} selectedFindingId={selectedFindingId} seek={seek} edited={edited} />
        <EvidenceJump survey={survey} selectedFindingId={selectedFindingId} onSelectFinding={selectFinding} />
      </div>

      <div className={styles.workColumn}>
        <div className={styles.workFrame}>
        <WorkTabs active={tab} onChange={changeTab} />
        <div ref={scrollRef} className={styles.workScroll}>
        {/* All panes stay mounted while hidden: review input, budget and an in-flight report survive tab changes. */}
        <div role="tabpanel" id="survey-panel-review" aria-labelledby="survey-tab-review" hidden={tab !== 'review'} className={styles.tabPanel}>
          <FindingReview survey={survey} original={original} editedIds={editedIds} selectedFindingId={selectedFindingId} onSelectFinding={selectFinding}
            plan={selectedPlan} onMeasure={setMeasure}
            onChange={(next, message) => { setSurvey(next); setNotice(message); }}
            siteContext={<SiteContext survey={survey} selectedFindingId={selectedFindingId} onSelectFinding={selectFinding} />} />
        </div>
        <div role="tabpanel" id="survey-panel-plans" aria-labelledby="survey-tab-plans" hidden={tab !== 'plans'} className={styles.tabPanel}>
          <PlanCompare survey={survey} plans={planResult.plans} planError={planResult.error} budgetText={budgetText} budget={budget}
            sliderMax={sliderMax} selectedFindingId={selectedFindingId} selectedPlanId={effectivePlanId}
            onBudgetText={setBudgetText} onSelectPlan={setSelectedPlanId}
            onSelectFinding={selectFinding} />
        </div>
        <div role="tabpanel" id="survey-panel-export" aria-labelledby="survey-tab-export" hidden={tab !== 'export'} className={styles.tabPanel}>
          <ExportPanel survey={survey} original={original} edited={edited} plan={selectedPlan} budgetCents={budgetCents} onLoad={loadReviewed} />
        </div>
        </div>
        </div>
      </div>
    </div>

  </div>;
}

/** Size the video so the whole evidence column (video, notes, jump bar) fits the
 * window below the page header without scrolling. Sets --desk-top (where the desk
 * starts on the page) and --column-chrome (column height that is not the video). */
function useFitVideoToScreen(deskRef: RefObject<HTMLDivElement | null>, ready: boolean) {
  useLayoutEffect(() => {
    const desk = deskRef.current;
    const workspace = desk?.parentElement;
    if (!desk || !workspace) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const column = desk.querySelector<HTMLElement>('[data-evidence-column]');
        const frame = desk.querySelector<HTMLElement>('[data-video-frame]');
        if (!column || !frame) return;
        const top = Math.round(desk.getBoundingClientRect().top + window.scrollY);
        const chrome = Math.round(column.getBoundingClientRect().height - frame.getBoundingClientRect().height);
        const set = (name: string, value: number) => {
          if (Math.abs(parseFloat(workspace.style.getPropertyValue(name) || '0') - value) > 1) workspace.style.setProperty(name, `${value}px`);
        };
        set('--desk-top', top);
        set('--column-chrome', chrome);
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [workspace, ...Array.from(workspace.children)]) observer.observe(element);
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [deskRef, ready]);
}

/** WAI-ARIA tabs with automatic activation: arrow keys, Home and End move focus and select. */
function WorkTabs({ active, onChange }: { active: WorkTab; onChange: (tab: WorkTab) => void }) {
  const refs = useRef<Partial<Record<WorkTab, HTMLButtonElement | null>>>({});

  function select(id: WorkTab, focus: boolean) {
    onChange(id);
    if (focus) refs.current[id]?.focus();
  }

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const index = WORK_TABS.findIndex((item) => item.id === active);
    const next = event.key === 'ArrowRight' ? (index + 1) % WORK_TABS.length
      : event.key === 'ArrowLeft' ? (index + WORK_TABS.length - 1) % WORK_TABS.length
        : event.key === 'Home' ? 0
          : event.key === 'End' ? WORK_TABS.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    select(WORK_TABS[next].id, true);
  }

  return <div className={styles.tabList} role="tablist" aria-label="Survey workflow" onKeyDown={move}>
    {WORK_TABS.map((item) => <button key={item.id} ref={(node) => { refs.current[item.id] = node; }} type="button" role="tab"
      id={`survey-tab-${item.id}`} aria-controls={`survey-panel-${item.id}`} aria-selected={active === item.id}
      tabIndex={active === item.id ? 0 : -1} onClick={() => select(item.id, false)}>
      <span className={styles.tabNumber} aria-hidden="true">{item.number}</span> {item.label}
    </button>)}
  </div>;
}

/** Compact evidence selector under the video, so any pane can jump the replay to a finding. */
function EvidenceJump({ survey, selectedFindingId, onSelectFinding }: {
  survey: Survey;
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
}) {
  return <nav className={styles.jumpBar} aria-label="Jump to finding evidence">
    <p className={styles.jumpTitle} aria-hidden="true">Jump to evidence</p>
    <ul>{survey.findings.map((finding, index) => {
      const selected = finding.id === selectedFindingId;
      const status = finding.review.status === 'pending' ? 'pending' : finding.review.status;
      return <li key={finding.id}>
        <button type="button" className={selected ? styles.jumpSelected : styles.jump} aria-pressed={selected}
          aria-label={`${String(index + 1).padStart(2, '0')} ${finding.label}, evidence at ${formatTime(finding.evidenceTime)}, ${status}`}
          title={`${finding.label} · ${formatTime(finding.evidenceTime)}`} onClick={() => onSelectFinding(finding.id)}>
          <span className={styles.swatch} style={{ background: finding.color }} aria-hidden="true" />
          <span className={finding.review.status === 'rejected' ? styles.jumpRejected : undefined}>{String(index + 1).padStart(2, '0')}</span>
        </button>
      </li>;
    })}</ul>
  </nav>;
}

function Header({ survey }: { survey?: Survey }) {
  return <header className={styles.header}>
    <p className={styles.eyebrow}>{survey?.site.name ?? 'Robertson Hall'} · field video</p>
    <h1>Survey replay</h1>
  </header>;
}
