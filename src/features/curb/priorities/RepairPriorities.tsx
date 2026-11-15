'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { fetchSurvey } from '../../../client/curb/fetchSurvey';
import type { Finding, Priority, Survey } from '../../../contracts/curb/survey';
import { buildRepairPriorities } from '../../../domain/curb/repairPriorities';
import { formatTime, PRIORITY_LABELS } from '../survey/presentation';
import styles from './RepairPriorities.module.css';

type Priorities = ReturnType<typeof buildRepairPriorities>;
type Item = Priorities['ranked'][number] | Priorities['needsAssessment'][number];
type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; survey: Survey; priorities: Priorities };
const SURVEY_URL = '/curb/surveys/robertson-hall';
const shortLabel = (finding: Finding) => finding.label.replace(/^Defect\s+\d+\s*·\s*/i, '');
const count = (number: number, noun: string) => `${number} ${noun}${number === 1 ? '' : 's'}`;

export function RepairPriorities() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const queueHeading = useRef<HTMLHeadingElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const focusAfterRetry = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => {
      if (!active) return;
      active = false;
      controller.abort();
      setLoad({ status: 'error' });
    }, 15_000);
    fetchSurvey(controller.signal).then(survey => {
      if (!active) return;
      const priorities = buildRepairPriorities(survey);
      setLoad({ status: 'ready', survey, priorities });
    }).catch(() => {
      if (active) setLoad({ status: 'error' });
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [attempt]);

  useEffect(() => {
    if (!focusAfterRetry.current || load.status === 'loading') return;
    focusAfterRetry.current = false;
    if (load.status === 'ready') queueHeading.current?.focus();
    else retryButton.current?.focus();
  }, [load.status]);

  function select(id: string) {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 900px)').matches) {
      requestAnimationFrame(() => {
        detailHeading.current?.focus({ preventScroll: true });
        detailHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    }
  }

  const heading = <header className={styles.header}>
    <div>
      <p className={styles.eyebrow}>Robertson Hall / Repair planning</p>
      <h1>Repair priorities<span aria-hidden="true">.</span></h1>
      <p className={styles.lede}>Start with the most essential damage. See what needs attention, and why.</p>
    </div>
    <Link href={`${SURVEY_URL}#survey-plans-heading`} className={styles.outlineLink}>Compare repair scopes <span aria-hidden="true">↗</span></Link>
  </header>;

  if (load.status !== 'ready') return <div className={styles.page}>
    {heading}
    {load.status === 'loading' ? <p role="status" className={styles.message}>Loading survey findings…</p> : <div role="alert" className={styles.message}>
      <h2>Couldn’t load the survey</h2>
      <p>The findings are unavailable. Retry to load the published Robertson Hall survey.</p>
      <button ref={retryButton} type="button" onClick={() => { focusAfterRetry.current = true; setLoad({ status: 'loading' }); setAttempt(value => value + 1); }}>Retry</button>
    </div>}
  </div>;

  const { survey, priorities } = load;
  const items = [...priorities.ranked, ...priorities.needsAssessment, ...priorities.monitoring];
  const selected = items.find(item => item.workAreaId === selectedId) ?? items[0];
  const activeFindings = survey.findings.filter(finding => finding.review.status !== 'rejected');
  const pending = activeFindings.filter(finding => finding.review.status === 'pending').length;
  const high = priorities.ranked.filter(item => item.priority === 'high').length;
  const selectedArea = survey.workAreas.find(area => area.id === selected?.workAreaId);
  const selectedFindings = selected ? selected.findingIds.flatMap(id => survey.findings.filter(finding => finding.id === id)) : [];

  return <div className={styles.page}>
    {heading}
    <div className={styles.overview} aria-label="Survey summary">
      <span><strong>{items.length}</strong> work areas</span>
      <span><strong>{high}</strong> high priority</span>
      <span><strong>{pending}</strong> awaiting review</span>
      <span className={styles.provisional}>Provisional order · site measurements needed</span>
    </div>
    <p className={styles.sourceNote}>AI-assisted findings from the Robertson Hall video. Field review and measurements pending.</p>

    <details className={styles.rules}>
      <summary>How is this order decided?</summary>
      <ol>
        <li>Recorded accessibility priority: high, then medium, then low.</li>
        <li>Within the same priority, near-term work comes first.</li>
        <li>Equal items use the work-area ID, so the same evidence always gives the same order.</li>
      </ol>
      <p>These are the survey’s qualitative priorities, not measurements of damage severity. Unknown priorities stay in “Needs assessment.” Rejected findings are excluded. Price does not change the order.</p>
    </details>

    <div className={styles.workspace}>
      <div className={styles.queue}>
        <div className={styles.sectionHeader}><h2 ref={queueHeading} tabIndex={-1}>Order of work</h2><span>{count(priorities.ranked.length, 'area')}</span></div>
        {priorities.ranked.length ? <ol className={styles.list}>
          {priorities.ranked.map(item => <li key={item.workAreaId}>
            <AreaButton item={item} survey={survey} selected={selected?.workAreaId === item.workAreaId} onSelect={select} />
          </li>)}
        </ol> : <p className={styles.message}>No assessed repair areas are ready to rank.{priorities.needsAssessment.length ? ' Check the assessment queue below.' : ' Review the survey to determine the next action.'}</p>}
        {priorities.needsAssessment.length ? <section className={styles.secondaryQueue} aria-labelledby="needs-assessment-heading">
          <h2 id="needs-assessment-heading">Needs assessment <span>{priorities.needsAssessment.length}</span></h2>
          <p>Unresolved priority. These concerns are not low priority or cleared.</p>
          <ul className={styles.list}>{priorities.needsAssessment.map(item => <li key={item.workAreaId}><AreaButton item={item} survey={survey} selected={selected?.workAreaId === item.workAreaId} onSelect={select} /></li>)}</ul>
        </section> : null}
        {priorities.monitoring.length ? <section className={styles.secondaryQueue} aria-labelledby="monitoring-heading">
          <h2 id="monitoring-heading">Inspection & monitoring <span>{priorities.monitoring.length}</span></h2>
          <p>No repair scope is currently assigned to these areas.</p>
          <ul className={styles.list}>{priorities.monitoring.map(item => <li key={item.workAreaId}><AreaButton item={item} survey={survey} selected={selected?.workAreaId === item.workAreaId} onSelect={select} /></li>)}</ul>
        </section> : null}
        {priorities.ungroupedFindingIds.length ? <section className={styles.secondaryQueue} aria-labelledby="ungrouped-heading">
          <h2 id="ungrouped-heading">Assign a work area</h2>
          <p>{count(priorities.ungroupedFindingIds.length, 'finding')} cannot be ranked until grouped for inspection or repair.</p>
          <ul>{priorities.ungroupedFindingIds.map(id => <li key={id}><Link href={`${SURVEY_URL}?finding=${encodeURIComponent(id)}`}>{survey.findings.find(finding => finding.id === id)?.label ?? id}</Link></li>)}</ul>
        </section> : null}
      </div>

      {selected && selectedArea && selectedFindings[0] ? <section id="priority-detail" className={styles.detail} aria-labelledby="priority-detail-heading">
        <div className={styles.detailTop}>
          <p className={styles.eyebrow}>{'rank' in selected ? `Priority ${selected.rank} of ${priorities.ranked.length}` : selectedArea.repairWorthy ? 'Needs assessment' : 'Inspection & monitoring'} · {selectedArea.label}</p>
          <h2 id="priority-detail-heading" ref={detailHeading} tabIndex={-1}>{shortLabel(selectedFindings[0])}{selectedFindings.length > 1 ? ` + ${selectedFindings.length - 1} more` : ''}</h2>
          <div className={styles.tags}><PriorityBadge priority={selected.priority} />{selected.nearTerm ? <span className={styles.nearTerm}>Near-term work</span> : null}</div>
        </div>
        <EvidenceImage key={selectedFindings[0].closeupSrc} finding={selectedFindings[0]} />
        <div className={styles.detailBody}>
          <div className={styles.evidenceMeta}>
            <span>{selectedFindings[0].label.split(' · ')[0]} · {formatTime(selectedFindings[0].evidenceTime)}</span>
            <span>{selectedFindings.every(finding => finding.review.status === 'accepted') ? 'Evidence accepted' : 'Review pending'}</span>
          </div>
          <p className={styles.description}>{selectedFindings[0].description}</p>
          <section className={styles.impact}>
            <h3>Why it matters for access</h3>
            <ul>{[...new Set(selectedFindings.map(finding => finding.assessment.accessImpacts[0]))].map(impact => <li key={impact}>{impact}</li>)}</ul>
          </section>
          <section className={styles.nextStep}>
            <span className={styles.stepIcon} aria-hidden="true">↗</span>
            <div><h3>Next step: inspect and measure</h3>
              <p>{selectedArea.repairWorthy ? 'Confirm the condition and treatment suitability on site before commissioning work.' : 'Confirm the condition on site before deciding whether repair is needed.'}</p>
            </div>
          </section>
          {selectedArea.repairWorthy ? <TreatmentNote survey={survey} area={selectedArea} findingId={selectedFindings[0].id} /> : null}
          <details className={styles.evidenceDetails}>
            <summary>Priority reason & measurement checklist</summary>
            <p>{selected.reason}</p>
            <p>{selectedArea.rationale}</p>
            <ul>{[...new Set(selectedFindings.flatMap(finding => finding.assessment.measurementNeeds))].map(need => <li key={need}>{need}</li>)}</ul>
          </details>
          <div className={styles.evidenceActions}>
            {selectedFindings.map(finding => <Link key={finding.id} href={`${SURVEY_URL}?finding=${encodeURIComponent(finding.id)}`} className={styles.primaryLink}>
              Review {finding.label.split(' · ')[0]} at {formatTime(finding.evidenceTime)} <span aria-hidden="true">→</span>
            </Link>)}
          </div>
        </div>
      </section> : <section className={styles.message}><h2>No active work areas</h2><p>Review the survey findings and group them into work areas to build a priority queue.</p><Link href={SURVEY_URL}>Open survey replay →</Link></section>}
    </div>

    <footer className={styles.footer}>
      <p>Published survey · revision {survey.revision}. Review edits remain in the survey workspace for that session.</p>
      <p>Current traversal: Unknown. A priority is an inspection and repair-planning signal, not an ADA determination or proof of a blocked route.</p>
      {priorities.excludedFindingIds.length ? <p>{count(priorities.excludedFindingIds.length, 'rejected finding')} excluded from this order; retained in the survey record.</p> : null}
    </footer>
  </div>;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={styles.priority} data-priority={priority}>{PRIORITY_LABELS[priority]}</span>;
}

function AreaButton({ item, survey, selected, onSelect }: { item: Item; survey: Survey; selected: boolean; onSelect: (id: string) => void }) {
  const finding = survey.findings.find(finding => finding.id === item.findingIds[0]);
  const area = survey.workAreas.find(area => area.id === item.workAreaId);
  if (!finding || !area) return null;
  return <button type="button" className={styles.areaButton} aria-pressed={selected} aria-controls="priority-detail" onClick={() => onSelect(item.workAreaId)}>
    <span className={styles.rank}>{'rank' in item ? String(item.rank).padStart(2, '0') : '—'}</span>
    <span className={styles.thumbnail}><EvidenceImage key={finding.closeupSrc} finding={finding} decorative /></span>
    <span className={styles.areaText}>
      <span className={styles.areaLabel}>{area.label}{item.findingIds.length > 1 ? ` · ${count(item.findingIds.length, 'finding')}` : ''}</span>
      <strong>{shortLabel(finding)}</strong>
      <span className={styles.tags}><PriorityBadge priority={item.priority} />{item.nearTerm ? <span className={styles.nearTerm}>Near-term</span> : null}</span>
    </span>
    <span className={styles.arrow} aria-hidden="true">↗</span>
  </button>;
}

function EvidenceImage({ finding, decorative = false }: { finding: Finding; decorative?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className={styles.imageMissing} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `${finding.label}: photo unavailable`}>{decorative ? 'No photo' : 'Photo unavailable · open the video evidence below'}</span>
    : <img className={styles.evidenceImage} src={finding.closeupSrc} alt={decorative ? '' : `Evidence close-up: ${finding.label}`} onError={() => setFailed(true)} />;
}

function TreatmentNote({ survey, area, findingId }: { survey: Survey; area: Survey['workAreas'][number]; findingId: string }) {
  const treatment = survey.treatments.find(treatment => treatment.id === area.recommendedOptionId);
  if (!treatment) return null;
  return <div className={styles.treatment}>
    <p className={styles.eyebrow}>Treatment to evaluate</p>
    <strong>{treatment.label}</strong>
    <p>{treatment.cost.status === 'quote_required' ? 'Site-specific quote needed.' : 'Estimate uses assumed quantities; confirm scope and full project costs.'} <Link href={`${SURVEY_URL}?finding=${encodeURIComponent(findingId)}#survey-plans-heading`}>See scope & costs →</Link></p>
  </div>;
}
