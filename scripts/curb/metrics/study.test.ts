import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { test, type TestContext } from 'node:test';
import {
  allocationSeed, allocate, analyzeStudy, capSeconds, errorFields, freezeStudy, humanAttestation,
  inputRevision, observationColumns, parseCsv, protocolVersion, rubricFields, runStudyCli,
} from './study.js';

type RecordRow = Record<typeof observationColumns[number], string>;
type Disposition = 'completed' | 'timed_out' | 'abandoned' | 'technical_failure' |
  'unfilled' | 'no_show' | 'withdrew_before_start' | 'withdrew_after_start';
type Flag = typeof rubricFields[number] | typeof errorFields[number];
type Options = {
  status?: Disposition;
  seconds?: number;
  hints?: number;
  interruption?: number;
  actualArm?: string;
  scores?: Partial<Record<Flag, 0 | 1>>;
  resolveReview?: boolean;
};

const startedAt = Date.parse('2025-05-01T13:00:00Z');
const now = Date.parse('2025-05-02T13:00:00Z');
const sha = 'a'.repeat(40);
const knownCorrect = Object.fromEntries([
  ...rubricFields.map((key) => [key, 1]),
  ...errorFields.map((key) => [key, 0]),
]);
const isTimed = (status: Disposition) => ['completed', 'timed_out', 'abandoned', 'technical_failure'].includes(status);
const iso = (milliseconds: number) => new Date(milliseconds).toISOString().replace('.000Z', 'Z');
const hash = (contents: string) => createHash('sha256').update(contents).digest('hex');
const escapeCell = (cell: string) => '"' + cell.replaceAll('"', '""') + '"';

async function buildFixture(t: TestContext, size: 6 | 8 = 6) {
  const temp = await realpath(tmpdir());
  const directory = await mkdtemp(join(temp, 'curb-study-test-'));
  t.after(async () => {
    const cleanup = await realpath(directory);
    assert(cleanup.startsWith(join(temp, 'curb-study-test-')) && !cleanup.slice(temp.length + 1).includes(sep));
    await rm(cleanup, { recursive: true, force: true });
  });
  const input = join(directory, 'observations.csv');

  // These files test validation and must never be collected as study observations.
  const acceptance = {
    status: 'accepted',
    app_source_sha: sha,
    app_url: 'http://127.0.0.1:3011/curb/investment-demo',
    environment: 'validated-local',
    verified_at_utc: iso(startedAt - 20_000),
    verification_ref: 'https://example.com/automated-test-fixture',
  };
  const acceptancePath = join(directory, 'acceptance.json');
  await writeFile(acceptancePath, JSON.stringify(acceptance));
  const freeze = await freezeStudy(directory, size, startedAt - 10_000);

  async function privateFile(id: string, filename: string, data: string) {
    const ref = 'proof/' + id + '/' + filename;
    await mkdir(join(directory, 'proof', id), { recursive: true });
    await writeFile(join(directory, ref), data);
    return [ref, hash(data)] as const;
  }

  async function row(slotIndex: number, options: Options = {}): Promise<RecordRow> {
    const slot = freeze.allocation[slotIndex];
    const id = slot.participant_id;
    const status = options.status ?? 'completed';
    const startTime = startedAt + slotIndex * 700_000;
    const seconds = options.seconds ?? (status === 'timed_out' ? capSeconds : slot.assigned_arm === 'manual' ? 360 : 240);
    const timed = isTimed(status);
    const record = Object.fromEntries(observationColumns.map((name) => [name, ''])) as RecordRow;
    Object.assign(record, {
      protocol_version: protocolVersion,
      participant_id: id,
      record_kind: 'observed',
      role: 'student',
      familiarity: 'some',
      assigned_arm: slot.assigned_arm,
      actual_arm: timed ? options.actualArm ?? slot.assigned_arm : '',
      input_revision: inputRevision,
      app_source_sha: sha,
      status,
      start_utc: timed ? iso(startTime) : '',
      end_utc: timed ? iso(startTime + seconds * 1_000) : '',
      duration_seconds: timed ? String(seconds) : '',
      hint_count: timed ? String(options.hints ?? 0) : '',
      interruption_seconds: timed ? String(options.interruption ?? 0) : '',
      observer_id: 'H01',
      observer_attestation: humanAttestation,
    });

    [record.observer_ref, record.observer_sha256] = await privateFile(id, 'observer.json', JSON.stringify({
      participant_id: id,
      observer_id: 'H01',
      attestation: humanAttestation,
      status,
      app_source_sha: sha,
      actual_arm: timed ? record.actual_arm : null,
      recorded_utc: iso(startTime + (timed ? seconds : 0) * 1_000),
      start_utc: record.start_utc || null,
      end_utc: record.end_utc || null,
      hint_count: timed ? Number(record.hint_count) : null,
      interruption_seconds: timed ? Number(record.interruption_seconds) : null,
      notes: 'Test fixture for parser/provenance gates. Not human evidence.',
    }));

    if (status === 'completed') {
      const flags = { ...knownCorrect, ...options.scores };
      const initialPrimary = options.resolveReview ? { ...flags, dependency: 0 } : flags;
      Object.assign(record, {
        scorer_id: 'H02',
        reviewer_id: 'H03',
        review_status: options.resolveReview ? 'resolved' : 'agreed',
        ...Object.fromEntries(Object.entries(flags).map(([key, value]) => [key, String(value)])),
      });
      [record.submission_ref, record.submission_sha256] = await privateFile(id, 'submission.md', '## Test stand-in for ' + id);
      [record.scoring_ref, record.scoring_sha256] = await privateFile(id, 'scoring.json', JSON.stringify({
        participant_id: id,
        scorer_id: record.scorer_id,
        reviewer_id: record.reviewer_id,
        review_status: record.review_status,
        review_notes: 'Test reconciliation record.',
        submission_sha256: record.submission_sha256,
        primary_flags: initialPrimary,
        reviewer_flags: flags,
        final_flags: flags,
      }));
    }
    return record;
  }

  const createRows = (options: Options[] = []) =>
    Promise.all(freeze.allocation.map((_, index) => row(index, options[index])));
  async function writeCsv(records: RecordRow[]) {
    await writeFile(input, [observationColumns.join(','), ...records.map((row) =>
      observationColumns.map((column) => escapeCell(row[column])).join(',')),
    ].join('\r\n') + '\r\n');
  }
  return { directory, input, acceptancePath, acceptance, freeze, createRows, writeCsv, privateFile };
}

test('CSV handles BOM, quoted commas and quotes, embedded newlines, and CRLF', () => {
  assert.deepEqual(parseCsv('\uFEFFid,note\r\n001,"Cited ""Note A"", and\r\nNote B."\r\n002,\r\n'), [
    ['id', 'note'], ['001', 'Cited "Note A", and\r\nNote B.'], ['002', ''],
  ]);
  assert.throws(() => parseCsv('id,"unfinished'), /unclosed/);
  assert.throws(() => parseCsv('"id"x,value'), /invalid quoting/);
  assert.throws(() => parseCsv('id"oops,value'), /invalid quoting/);
});

test('participant CSV and blank observation template parse without displacement', async () => {
  const base = new URL('../../../docs/evaluation/', import.meta.url);
  const [packet, template] = await Promise.all([
    readFile(new URL('HUMAN_STUDY_INPUT.csv', base), 'utf8'),
    readFile(new URL('HUMAN_STUDY_OBSERVATIONS.template.csv', base), 'utf8'),
  ]);
  const [header, ...inputs] = parseCsv(packet);
  assert(inputs.every((row) => row.length === header.length));
  assert.equal(inputs.filter(([type]) => type === 'node').length, 7);
  assert.equal(inputs.filter(([type]) => type === 'edge').length, 6);
  assert.deepEqual(inputs.filter(([type]) => type === 'repair').map((row) => [
    row[1], row[header.indexOf('assumed_cost_usd_cents')],
  ]), [['repair-a', '500000'], ['repair-b', '500000'], ['repair-c', '1000000']]);
  assert.deepEqual(parseCsv(template), [observationColumns]);
});

test('fixed allocation is balanced and freeze requires a pinned acceptance and a new receipt', async (t) => {
  assert.deepEqual(allocate(6).map((r) => r.assigned_arm), ['curb', 'manual', 'curb', 'curb', 'manual', 'manual']);
  assert.deepEqual(allocate(8).map((r) => r.assigned_arm), ['manual', 'curb', 'curb', 'curb', 'manual', 'manual', 'curb', 'manual']);
  const study = await buildFixture(t);
  assert.equal(study.freeze.seed, allocationSeed);
  assert.equal(study.freeze.asset_hashes['docs/evaluation/HUMAN_STUDY_TASK.md'].length, 64);
  await assert.rejects(freezeStudy(study.directory, 8, startedAt), /EEXIST/);
  await writeFile(study.acceptancePath, JSON.stringify({ ...study.acceptance, status: 'candidate' }));
  await assert.rejects(freezeStudy(study.directory, 8, startedAt), /App acceptance/);
});

test('time and correctness summary covers the crossover-free successes and the median', async (t) => {
  const study = await buildFixture(t);
  const records = await study.createRows([
    { seconds: 180 }, { seconds: 300 }, { seconds: 240 }, { seconds: 300, resolveReview: true },
    { seconds: 420 }, { seconds: 600 },
  ]);
  await study.writeCsv(records.reverse());

  const result = await analyzeStudy(study.input, now);
  assert.equal(result.summary.state, 'study_observed');
  assert.deepEqual(result.rows.map((row) => row.participant_id), ['S01', 'S02', 'S03', 'S04', 'S05', 'S06']);
  assert.deepEqual(result.summary.arms.manual.completion, { count: 3, denominator: 3, rate: 1 });
  assert.deepEqual(result.summary.arms.curb.fully_correct, { count: 3, denominator: 3, rate: 1 });
  assert.deepEqual(result.summary.arms.manual.all_completed_times, {
    n: 3, seconds: [300, 420, 600], median_seconds: 420, min_seconds: 300, max_seconds: 600,
  });
  assert.deepEqual(result.summary.descriptive_unassisted_time_comparison, {
    manual_n: 3, curb_n: 3, manual_median_seconds: 420, curb_median_seconds: 240,
    percent_shorter_for_curb: 100 * (420 - 240) / 420,
    quality_tradeoffs: [],
  });
  assert.equal(result.summary.proof_files_checked, 18);
});

test('timeouts, incorrect finals, hints, crossovers, and dropouts stay in roster accounting', async (t) => {
  const study = await buildFixture(t, 8);
  const records = await study.createRows([
    { status: 'timed_out' }, { hints: 1 }, { actualArm: 'mixed', interruption: 5 },
    { scores: { destinations: 0, destination_miscount: 1 } }, { status: 'technical_failure', interruption: 15 },
    { status: 'no_show' }, { status: 'withdrew_after_start' }, { status: 'unfilled' },
  ]);
  await study.writeCsv(records);
  const { summary, rows } = await analyzeStudy(study.input, now);

  assert.equal(summary.descriptive_unassisted_time_comparison, null);
  assert.deepEqual(summary.arms.manual.completion, { count: 0, denominator: 3, rate: 0 });
  assert.equal(summary.arms.manual.dispositions.timed_out, 1);
  assert.equal(rows[0].duration_seconds, 600);
  assert.equal(rows[0].scores, null);
  assert.equal(summary.arms.manual.dispositions.technical_failure, 1);
  assert.equal(summary.arms.manual.dispositions.unfilled, 1);
  assert.equal(summary.arms.manual.dispositions.no_show, 1);
  assert.deepEqual(summary.arms.curb.completion, { count: 3, denominator: 4, rate: 0.75 });
  assert.deepEqual(summary.arms.curb.fully_correct, { count: 2, denominator: 4, rate: 0.5 });
  assert.deepEqual(summary.arms.curb.observed_errors.destination_miscount, { count: 1, denominator: 3, rate: 1 / 3 });
  assert.equal(summary.arms.curb.hinted, 1);
  assert.equal(summary.arms.curb.mismatched_arm, 1);
  assert.equal(summary.arms.curb.dispositions.withdrew_after_start, 1);
  assert.equal(summary.arms.curb.unassisted_correct_times.n, 0);
});

test('keeps a completed brief with independently scored criterion passes and errors', async (t) => {
  const study = await buildFixture(t);
  const records = await study.createRows([
    { scores: { destinations: 1, destination_miscount: 1 } },
    { scores: { provenance: 1, unsupported_field_claim: 1 } },
  ]);
  await study.writeCsv(records);
  const { rows, summary } = await analyzeStudy(study.input, now);

  assert.equal(rows[0].scores?.destinations, 1);
  assert.equal(rows[0].scores?.destination_miscount, 1);
  assert.equal(rows[1].scores?.provenance, 1);
  assert.equal(rows[1].scores?.unsupported_field_claim, 1);
  assert.equal(rows[0].fully_correct, false);
  assert.equal(rows[1].fully_correct, false);
  for (const arm of [summary.arms.curb, summary.arms.manual]) {
    assert.equal(arm.completion.count, 3);
    assert.equal(arm.fully_correct.count, 2);
  }
});

test('keeps same-second abandonments and technical failures as unsuccessful attempts', async (t) => {
  const study = await buildFixture(t);
  const records = await study.createRows([
    { status: 'abandoned', seconds: 0 },
    { status: 'technical_failure', seconds: 0, interruption: 0 },
  ]);
  await study.writeCsv(records);
  const { rows, summary } = await analyzeStudy(study.input, now);

  assert.deepEqual(rows.slice(0, 2).map(({ status, duration_seconds, scores }) =>
    [status, duration_seconds, scores]), [['abandoned', 0, null], ['technical_failure', 0, null]]);
  for (const arm of [summary.arms.curb, summary.arms.manual]) {
    assert.equal(arm.started, 3);
    assert.equal(arm.completion.count, 2);
    assert.equal(arm.all_completed_times.n, 2);
  }

  await study.writeCsv([records[0], { ...records[1], interruption_seconds: '1' }, ...records.slice(2)]);
  await assert.rejects(analyzeStudy(study.input, now), /interruption duration disagrees/);
  const instant = { ...records[2], end_utc: records[2].start_utc, duration_seconds: '0' };
  await study.writeCsv([...records.slice(0, 2), instant, ...records.slice(3)]);
  await assert.rejects(analyzeStudy(study.input, now), /inconsistent start, end, or duration/);
  await study.writeCsv([...records.slice(0, 2), { ...instant, status: 'timed_out' }, ...records.slice(3)]);
  await assert.rejects(analyzeStudy(study.input, now), /disagrees with the time cap/);
});

test('quality deficits are surfaced even if both groups meet the time denominator', async (t) => {
  const study = await buildFixture(t, 8);
  const records = await study.createRows([
    {}, { scores: { destinations: 0, destination_miscount: 1 } }, {}, {}, {}, {}, {}, {},
  ]);
  await study.writeCsv(records);
  const { summary } = await analyzeStudy(study.input, now);
  assert.deepEqual(summary.descriptive_unassisted_time_comparison?.quality_tradeoffs, [
    'lower_curb_fully_correct_rate', 'destination_miscount',
  ]);
  assert.equal(summary.descriptive_unassisted_time_comparison?.curb_n, 3);
});

test('observations reject missing/unknown/duplicate IDs, synthetic records, and wrong revisions', async (t) => {
  const study = await buildFixture(t);
  const records = await study.createRows();
  await study.writeCsv([]);
  await assert.rejects(analyzeStudy(study.input, now), /Missing observation/);
  await study.writeCsv(records.slice(1));
  await assert.rejects(analyzeStudy(study.input, now), /Missing observation.*S01/);
  await study.writeCsv([...records, records[0]]);
  await assert.rejects(analyzeStudy(study.input, now), /Duplicate observation/);
  for (const [patch, pattern] of [
    [{ participant_id: 'demo' }, /unknown or missing participant ID/],
    [{ record_kind: 'synthetic' }, /human-attested/],
    [{ record_kind: 'test' }, /human-attested/],
    [{ observer_attestation: '' }, /human-attested/],
    [{ assigned_arm: 'manual' }, /frozen allocation/],
    [{ input_revision: '' }, /revision mismatch/],
    [{ app_source_sha: 'b'.repeat(40) }, /revision mismatch/],
    [{ duration_seconds: '12' }, /inconsistent start, end, or duration/],
    [{ status: 'timed_out' }, /disagrees with the time cap/],
    [{ start_utc: '2025-04-30T12:00:00Z' }, /before the cohort freeze/],
    [{ start_utc: '2025-04-31T13:00:00Z' }, /start time/],
    [{ review_status: 'pending' }, /review status/],
    [{ reviewer_id: 'H02' }, /independent second reviewer/],
  ] as const) {
    await study.writeCsv([{ ...records[0], ...patch }, ...records.slice(1)]);
    await assert.rejects(analyzeStudy(study.input, now), pattern);
  }
});

test('requires accessible, hashed proof with matching observer and scorer records', async (t) => {
  const study = await buildFixture(t);
  const records = await study.createRows();
  for (const patch of [
    { observer_ref: '' }, { observer_ref: '../observer.json' },
    { submission_ref: '' }, { scoring_ref: '' },
  ]) {
    await study.writeCsv([{ ...records[0], ...patch }, ...records.slice(1)]);
    await assert.rejects(analyzeStudy(study.input, now), /proof reference/);
  }

  await study.writeCsv(records);
  const observer = join(study.directory, records[0].observer_ref);
  const original = await readFile(observer, 'utf8');
  await writeFile(observer, original + '\n');
  await assert.rejects(analyzeStudy(study.input, now), /observer: proof file hash mismatch/);
  const changed = { ...JSON.parse(original), observer_id: 'H09' };
  const [observer_ref, observer_sha256] = await study.privateFile('S01', 'observer.json', JSON.stringify(changed));
  await study.writeCsv([{ ...records[0], observer_ref, observer_sha256 }, ...records.slice(1)]);
  await assert.rejects(analyzeStudy(study.input, now), /observer record disagrees with CSV/);

  await writeFile(observer, original);
  await study.writeCsv([{ ...records[0], actual_arm: 'manual' }, ...records.slice(1)]);
  await assert.rejects(analyzeStudy(study.input, now), /observer record disagrees with CSV/);
  const [submission_ref, submission_sha256] = await study.privateFile('S01', 'submission.md', 'A different brief');
  await study.writeCsv([{ ...records[0], submission_ref, submission_sha256 }, ...records.slice(1)]);
  await assert.rejects(analyzeStudy(study.input, now), /scoring record disagrees with CSV/);
  await study.privateFile('S01', 'submission.md', '## Test stand-in for S01');
  await study.writeCsv([{ ...records[0], dependency: '0' }, ...records.slice(1)]);
  await assert.rejects(analyzeStudy(study.input, now), /scoring record disagrees with CSV/);
  await rm(join(study.directory, records[0].submission_ref));
  await study.writeCsv(records);
  await assert.rejects(analyzeStudy(study.input, now), /submission: proof file missing/);
});

test('fails if source receipt or roster was changed after freeze', async (t) => {
  const study = await buildFixture(t);
  await study.writeCsv(await study.createRows());
  const receipt = JSON.stringify(study.acceptance);
  await writeFile(study.acceptancePath, receipt + '\n');
  await assert.rejects(analyzeStudy(study.input, now), /App acceptance differs/);
  await writeFile(study.acceptancePath, receipt);
  const freezePath = join(study.directory, 'freeze.json');
  const original = await readFile(freezePath, 'utf8');
  await writeFile(freezePath, JSON.stringify({
    ...study.freeze,
    asset_hashes: { ...study.freeze.asset_hashes, 'docs/evaluation/HUMAN_STUDY_TASK.md': 'b'.repeat(64) },
  }));
  await assert.rejects(analyzeStudy(study.input, now), /assets differ/);
  await writeFile(freezePath, JSON.stringify({
    ...study.freeze, allocation: [...study.freeze.allocation].reverse(),
  }));
  await assert.rejects(analyzeStudy(study.input, now), /Frozen allocation differs/);
  await writeFile(freezePath, original);
});

test('administrative-only records stay pending and CLI refuses to overwrite a run', async (t) => {
  const study = await buildFixture(t);
  await study.writeCsv(await study.createRows(Array.from({ length: 6 }, () => ({ status: 'unfilled' }))));
  const output = join(study.directory, 'analysis');

  assert.equal(await runStudyCli(['--input', study.input, '--out', output]), 'Study analysis: observations_pending.');
  const summary = JSON.parse(await readFile(join(output, 'study-summary.json'), 'utf8'));
  assert.equal(summary.state, 'observations_pending');
  assert.deepEqual(summary.arms.manual.fully_correct, { count: 0, denominator: 0, rate: null });
  const accounting = parseCsv(await readFile(join(output, 'study-accounting.csv'), 'utf8'));
  assert.equal(accounting.length, 7);
  assert(!accounting[0].includes('observer_ref'));
  assert(!accounting[0].includes('start_utc'));
  await assert.rejects(runStudyCli(['--input', study.input, '--out', output]), /EEXIST/);
});
