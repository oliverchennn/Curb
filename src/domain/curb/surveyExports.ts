import type { Survey } from '../../contracts/curb/survey';

const columns = [
  'survey_id',
  'survey_revision',
  'analysis_created_at',
  'finding_id',
  'work_area_id',
  'work_area_label',
  'label',
  'kind',
  'description',
  'evidence_time_seconds',
  'closeup_src',
  'review_status',
  'reviewer',
  'review_method',
  'review_note',
  'work_area_priority',
  'work_area_rationale',
  'finding_priority',
  'accessibility_rationale',
  'accessibility_impacts',
  'measurement_needs',
  'standards_checks',
  'measurements',
  'route_assessment_status',
  'route_assessment_note',
] as const;

type FindingRow = Record<(typeof columns)[number], string | number>;

function escapeCsvCell(value: string | number): string {
  if (typeof value === 'number') return String(value);

  // Prefix spreadsheet formula characters and control characters, even after whitespace.
  const text = /^\s*[=+@＝＋－＠\t\r\n-]/u.test(value) ? "'" + value : value;
  return '"' + text.replaceAll('"', '""') + '"';
}

/** Exports one record per finding. Lists and measurements retain their structure as JSON cells. */
export function surveyToCsv(survey: Survey): string {
  const records = survey.findings.map((finding) => {
    const area = survey.workAreas.find((workArea) => workArea.findingIds.includes(finding.id));
    const { assessment, review } = finding;
    const row: FindingRow = {
      survey_id: survey.id,
      survey_revision: survey.revision,
      analysis_created_at: survey.analysis.createdAt,
      finding_id: finding.id,
      work_area_id: area?.id ?? '',
      work_area_label: area?.label ?? '',
      label: finding.label,
      kind: finding.kind,
      description: finding.description,
      evidence_time_seconds: finding.evidenceTime,
      closeup_src: finding.closeupSrc,
      review_status: review.status,
      reviewer: review.reviewer,
      review_method: review.method,
      review_note: review.note,
      work_area_priority: area?.priority ?? '',
      work_area_rationale: area?.rationale ?? '',
      finding_priority: assessment.priority,
      accessibility_rationale: assessment.rationale,
      accessibility_impacts: JSON.stringify(assessment.accessImpacts),
      measurement_needs: JSON.stringify(assessment.measurementNeeds),
      standards_checks: JSON.stringify(assessment.checks),
      measurements: JSON.stringify(finding.measurements),
      route_assessment_status: survey.routeAssessment.status,
      route_assessment_note: survey.routeAssessment.note,
    };
    return columns.map((column) => escapeCsvCell(row[column])).join(',');
  });

  return [columns.join(','), ...records, ''].join('\r\n');
}
