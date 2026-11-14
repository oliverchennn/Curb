import { describe, expect, it } from 'vitest';
import { SurveySchema } from '../../contracts/curb/survey';
import fixture from '../../data/curb/surveys/robertson-hall.json';
import { surveyToCsv } from './surveyExports';

function readRecords(csv: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let consumed = 0;
  for (const [match, cell, separator] of csv.matchAll(/("(?:[^"]|"")*"|[^",\r\n]*)(,|\r\n)/gy)) {
    row.push(cell.startsWith('"') ? cell.slice(1, -1).replaceAll('""', '"') : cell);
    consumed += match.length;
    if (separator === '\r\n') {
      rows.push(row);
      row = [];
    }
  }

  expect(consumed).toBe(csv.length);
  expect(row).toEqual([]);
  const [header, ...data] = rows;
  return data.map((record) => {
    expect(record).toHaveLength(header.length);
    return Object.fromEntries(header.map((column, index) => [column, record[index]]));
  });
}

describe('surveyToCsv', () => {
  it('retains stable finding order, manual edits, rejected evidence and accessibility details', () => {
    const survey = SurveySchema.parse(fixture);
    const [finding] = survey.findings;
    const [area] = survey.workAreas;
    survey.revision += 1;
    finding.label = 'Panel by the north entrance';
    finding.kind = 'Edited discontinuity';
    finding.description = 'North side, "raised lip"\r\nMeasure both approaches.\nCheck both directions.';
    finding.review = {
      status: 'rejected',
      reviewer: 'Facilities reviewer',
      method: 'manual',
      note: 'Duplicate evidence, keep for review history.',
    };
    finding.measurements = [{ property: 'Cross slope', value: -1.5, unit: '%', method: 'Digital level' }];
    area.priority = 'low';
    area.rationale = 'Priority reviewed by Facilities: Confirm both approaches.';

    const csv = surveyToCsv(survey);
    expect(csv).toContain('"North side, ""raised lip""\r\nMeasure both approaches.\nCheck both directions."');
    const rows = readRecords(csv);
    expect(rows.map((row) => row.finding_id)).toEqual(survey.findings.map(({ id }) => id));
    expect(rows[0]).toMatchObject({
      survey_id: survey.id,
      survey_revision: String(survey.revision),
      analysis_created_at: survey.analysis.createdAt,
      finding_id: finding.id,
      work_area_id: area.id,
      work_area_label: area.label,
      label: finding.label,
      kind: finding.kind,
      description: finding.description,
      evidence_time_seconds: String(finding.evidenceTime),
      closeup_src: finding.closeupSrc,
      review_status: finding.review.status,
      reviewer: finding.review.reviewer,
      review_method: finding.review.method,
      review_note: finding.review.note,
      work_area_priority: area.priority,
      work_area_rationale: area.rationale,
      finding_priority: finding.assessment.priority,
      accessibility_rationale: finding.assessment.rationale,
      route_assessment_status: survey.routeAssessment.status,
      route_assessment_note: survey.routeAssessment.note,
    });
    expect(JSON.parse(rows[0].accessibility_impacts)).toEqual(finding.assessment.accessImpacts);
    expect(JSON.parse(rows[0].measurement_needs)).toEqual(finding.assessment.measurementNeeds);
    expect(JSON.parse(rows[0].standards_checks)).toEqual(finding.assessment.checks);
    expect(JSON.parse(rows[0].measurements)).toEqual(finding.measurements);
    expect(JSON.parse(rows[1].measurements)).toEqual([]);
  });

  it.each([
    '=1+1',
    '+1+1',
    '-1+1',
    '@SUM(1,2)',
    '  =1+1',
    '\t+1+1',
    ' \r\n @SUM(1,2)',
    '\ntext that starts on a new line',
    '\u00a0＝1+1',
    '=HYPERLINK("https://example.com","link")',
  ])('prefixes spreadsheet-active text %j', (text) => {
    const survey = SurveySchema.parse(fixture);
    survey.findings[0].review.note = text;

    const records = readRecords(surveyToCsv(survey));
    expect(records).toHaveLength(survey.findings.length);
    expect(records[0].review_note).toBe("'" + text);
  });

  it('returns a CRLF-terminated header for a valid empty survey', () => {
    const survey = SurveySchema.parse({ ...fixture, findings: [], workAreas: [], treatments: [] });
    const csv = surveyToCsv(survey);

    expect(csv).toMatch(/^survey_id,[^\r\n]+\r\n$/);
    expect(readRecords(csv)).toEqual([]);
  });
});
