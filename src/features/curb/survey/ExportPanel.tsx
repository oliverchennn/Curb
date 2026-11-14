'use client';

import { useEffect, useRef, useState } from 'react';
import { SurveySchema, type PlanId, type RepairPlan, type Survey } from '../../../contracts/curb/survey';
import { surveyToCsv } from './services';
import { exportFileName, surveyJson } from './presentation';
import styles from './SurveyWorkspace.module.css';

const REPORT_TIMEOUT_MS = 30_000;

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
    if (typeof error?.message === 'string') return `${error.message} (HTTP ${response.status}).`;
  } catch { /* fall through */ }
  return response.status === 404
    ? 'The report service is not available in this build (HTTP 404). JSON and CSV exports still work.'
    : `The report could not be generated (HTTP ${response.status}).`;
}

export function ExportPanel({ survey, edited, plan, budgetCents }: {
  survey: Survey;
  edited: boolean;
  plan: RepairPlan | undefined;
  budgetCents: number | null;
}) {
  const [status, setStatus] = useState<{ kind: 'idle' | 'working' | 'done' | 'error'; message: string }>({ kind: 'idle', message: '' });
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

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

  async function downloadPdf() {
    const data = validSurvey();
    if (!data || !plan) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);
    setStatus({ kind: 'working', message: `Preparing the PDF for the ${plan.title} plan…` });
    try {
      const planId: PlanId = plan.id;
      const response = await fetch('/api/curb/survey/report', {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey: data, budgetCents, planId }),
      });
      if (controllerRef.current !== controller) return;
      if (!response.ok) {
        setStatus({ kind: 'error', message: await reportError(response) });
        return;
      }
      if (!response.headers.get('content-type')?.includes('application/pdf')) {
        setStatus({ kind: 'error', message: 'The report service returned something other than a PDF. Nothing was saved.' });
        return;
      }
      saveBlob(await response.blob(), exportFileName(data, 'pdf', edited));
      setStatus({ kind: 'done', message: `Saved the PDF report for the ${plan.title} plan.` });
    } catch (error) {
      if (controllerRef.current !== controller) return;
      setStatus({ kind: 'error', message: error instanceof DOMException && error.name === 'AbortError'
        ? 'The report took too long and was cancelled. Try again.'
        : 'Could not reach the report service. Check that the app is running, then try again.' });
    } finally {
      clearTimeout(timer);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  return <section className={styles.card} aria-labelledby="survey-export-heading">
    <h2 id="survey-export-heading"><span className={styles.stepNumber}>3</span> Export report</h2>
    <p className={styles.small}>Downloads happen only when you choose one. JSON, CSV and PDF reflect your current review{edited ? ' edits' : ''}; the videos are fixed files.</p>
    <div className={styles.exportGrid}>
      <div className={styles.exportItem}>
        <h3>PDF report</h3>
        <p className={styles.small}>{plan ? `Plan: ${plan.title}.` : 'Select a plan first.'} Includes all three policies, evidence cards, assumptions and quote-required work. No overall ADA verdict.</p>
        <button type="button" onClick={downloadPdf} disabled={!plan || status.kind === 'working'}>Download PDF</button>
      </div>
      <div className={styles.exportItem}>
        <h3>Data</h3>
        <p className={styles.small}>The reviewed survey, including rejected findings and review notes.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={downloadJson}>Download JSON</button>
          <button type="button" className={styles.secondaryButton} onClick={downloadCsv}>Download CSV</button>
        </div>
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
