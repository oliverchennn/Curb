'use client';

import { useEffect, useRef, useState } from 'react';
import { SurveySchema, type PlanId, type RepairPlan, type Survey } from '../../../contracts/curb/survey';
import { surveyToCsv } from './services';
import { appendedWorkflowIssue } from '../../../domain/curb/repair';
import { exportFileName, surveyJson } from './presentation';
import styles from './SurveyWorkspace.module.css';

const REPORT_TIMEOUT_MS = 30_000;
const reportFormats = {
  pdf: { label: 'PDF', contentType: 'application/pdf' },
  html: { label: 'HTML', contentType: 'text/html' },
} as const;

type ReportFormat = keyof typeof reportFormats;

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function reportError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const error = (body as { error?: { code?: unknown; message?: unknown } })?.error;
    if (typeof error?.message === 'string') {
      const message = error.message.trim().replace(/[.!?]+$/, '');
      if (message) return `${message} (HTTP ${response.status}).`;
    }
  } catch { /* fall through */ }
  return response.status === 404
    ? 'The report service is not available in this build (HTTP 404). JSON and CSV exports still work.'
    : `The report could not be generated (HTTP ${response.status}).`;
}

export function ExportPanel({ survey, original, edited, plan, budgetCents, onLoad }: {
  survey: Survey;
  original: Survey;
  onLoad: (survey: Survey) => void;
  edited: boolean;
  plan: RepairPlan | undefined;
  budgetCents: number | null;
}) {
  const [status, setStatus] = useState<{ kind: 'idle' | 'working' | 'done' | 'error'; message: string }>({ kind: 'idle', message: '' });
  const [activeFormat, setActiveFormat] = useState<ReportFormat | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => {
    const controller = controllerRef.current;
    controllerRef.current = null;
    controller?.abort();
  }, []);
  const reportUnavailable = !plan || activeFormat !== null;

  function validSurvey(): Survey | null {
    const parsed = SurveySchema.safeParse(survey);
    if (!parsed.success) {
      setStatus({ kind: 'error', message: 'The reviewed survey no longer passes validation, so it was not exported. Restore the original or undo the last change.' });
      return null;
    }
    return parsed.data;
  }

  function downloadJson() {
    const data = validSurvey();
    if (!data) return;
    saveBlob(new Blob([surveyJson(data)], { type: 'application/json' }), exportFileName(data, 'json', edited));
    setStatus({ kind: 'done', message: 'Saved the current reviewed survey as JSON.' });
  }

  async function loadJson(file: File | undefined) {
    if (!file) return;
    let data: unknown;
    try { data = JSON.parse(await file.text()); } catch {
      setStatus({ kind: 'error', message: 'That file is not valid JSON.' });
      return;
    }
    const parsed = SurveySchema.safeParse(data);
    if (!parsed.success) {
      setStatus({ kind: 'error', message: 'That file is not a valid Curb survey export.' });
      return;
    }
    const loaded = parsed.data;
    if (loaded.id !== original.id || loaded.revision !== original.revision || loaded.media.originalSha256 !== original.media.originalSha256) {
      setStatus({ kind: 'error', message: 'That export belongs to a different survey or revision, so it was not loaded.' });
      return;
    }
    const workflowProblem = loaded.findings.map((finding) => appendedWorkflowIssue(finding, original.findings.find((item) => item.id === finding.id))).find(Boolean);
    if (workflowProblem) {
      setStatus({ kind: 'error', message: `Not loaded. ${workflowProblem}.` });
      return;
    }
    onLoad(loaded);
    setStatus({ kind: 'done', message: `Loaded ${file.name}. Review edits, measurements and repair history are restored.` });
  }

  function downloadCsv() {
    const data = validSurvey();
    if (!data) return;
    try {
      saveBlob(new Blob([surveyToCsv(data)], { type: 'text/csv;charset=utf-8' }), exportFileName(data, 'csv', edited));
      setStatus({ kind: 'done', message: 'Saved findings as CSV.' });
    } catch {
      setStatus({ kind: 'error', message: 'The CSV export is not available in this build. The JSON export contains the same reviewed data.' });
    }
  }

  async function downloadReport(format: ReportFormat) {
    if (!plan || controllerRef.current) return;
    const data = validSurvey();
    if (!data) return;

    const { label, contentType } = reportFormats[format];
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);
    setActiveFormat(format);
    setStatus({ kind: 'working', message: `Preparing the ${label} report for ${plan.title}…` });
    try {
      const planId: PlanId = plan.id;
      const query = format === 'html' ? '?format=html' : '';
      const response = await fetch(`/api/curb/survey/report${query}`, {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey: data, budgetCents, planId }),
      });
      controller.signal.throwIfAborted();
      if (controllerRef.current !== controller) return;
      if (!response.ok) {
        const message = await reportError(response);
        controller.signal.throwIfAborted();
        setStatus({ kind: 'error', message });
        return;
      }
      const responseType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
      if (responseType !== contentType) {
        setStatus({ kind: 'error', message: `The report service returned an unexpected file type. Try downloading the ${label} report again.` });
        return;
      }
      const blob = await response.blob();
      controller.signal.throwIfAborted();
      const fileName = exportFileName(data, 'pdf', edited).replace(/\.pdf$/, `.${format}`);
      saveBlob(blob, fileName);
      setStatus({ kind: 'done', message: `Saved the ${label} report for ${plan.title}.` });
    } catch {
      if (controllerRef.current !== controller) return;
      setStatus({ kind: 'error', message: controller.signal.aborted
        ? 'The report took too long and was cancelled. Try again.'
        : 'Could not reach the report service. Check that the app is running, then try again.' });
    } finally {
      clearTimeout(timer);
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setActiveFormat(null);
      }
    }
  }

  return <section className={styles.card} aria-labelledby="survey-export-heading">
    <h2 id="survey-export-heading"><span className={styles.stepNumber}>3</span> Export report</h2>
    <p className={styles.small}>Report and data downloads reflect your current review{edited ? ' edits' : ''}.</p>
    <div className={styles.exportGrid}>
      <div className={styles.exportItem}>
        <h3>Repair reports</h3>
        <p className={styles.small}>{plan ? `Plan: ${plan.title}.` : 'Select a plan first.'} Starts with a facilities handoff: each finding's photo, video link, owner, proposed action, priority rationale and unknown costs. No ADA compliance verdict.</p>
        <p id="survey-report-formats" className={styles.small}>The PDF is untagged. Choose accessible HTML for screen-reader use.</p>
        <div className={styles.actions}>
          <button type="button" aria-describedby="survey-report-formats" aria-disabled={reportUnavailable}
            aria-busy={activeFormat === 'pdf'} onClick={() => downloadReport('pdf')}>Download PDF</button>
          <button type="button" className={styles.secondaryButton} aria-describedby="survey-report-formats"
            aria-disabled={reportUnavailable} aria-busy={activeFormat === 'html'}
            onClick={() => downloadReport('html')}>Download accessible HTML</button>
        </div>
      </div>
      <div className={styles.exportItem}>
        <h3>Data</h3>
        <p className={styles.small}>The reviewed survey, including rejected findings, measurements, owners and repair history.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={downloadJson}>Download JSON</button>
          <button type="button" className={styles.secondaryButton} onClick={downloadCsv}>Download CSV</button>
        </div>
        <label htmlFor="survey-load-json" className={styles.small}>Continue a saved review (JSON)
          <input id="survey-load-json" type="file" accept="application/json,.json"
            onChange={(event) => { void loadJson(event.target.files?.[0]); event.target.value = ''; }} />
        </label>
      </div>
      <div className={styles.exportItem}>
        <h3>Video</h3>
        <p className={styles.small}>{edited ? 'The annotated video shows the original analysis; your review edits are not burned into it.' : 'Annotated video from the original analysis.'}</p>
        <div className={styles.actions}>
          <a className={styles.linkButton} href={survey.media.annotatedSrc} download>Annotated MP4</a>
          <a className={styles.linkButton} href={survey.media.sourceSrc} download>Original MOV</a>
        </div>
        <p className={styles.small}>Original SHA-256 <code className={styles.hash}>{survey.media.originalSha256}</code></p>
      </div>
    </div>
    <p role="status" aria-live="polite" className={status.kind === 'error' ? styles.inlineError : styles.small}>{status.message}</p>
  </section>;
}
