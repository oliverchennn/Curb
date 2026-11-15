import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const protocolVersion = 'curb-study-v1';
export const inputRevision = 'synthetic-campus-investment@1/packet-v1';
export const allocationSeed = 20261115;
export const capSeconds = 600;
export const humanAttestation = 'observed-by-human';

export const rubricFields = [
  'budget_selection', 'optimal_set', 'destinations', 'dependency', 'provenance', 'verification',
] as const;
export const errorFields = [
  'budget_breach', 'unsupported_field_claim', 'destination_miscount',
] as const;
const scoreFields = [...rubricFields, ...errorFields] as const;

export const observationColumns = [
  'protocol_version', 'participant_id', 'record_kind', 'role', 'familiarity', 'assigned_arm', 'actual_arm',
  'input_revision', 'app_source_sha', 'status', 'start_utc', 'end_utc', 'duration_seconds', 'hint_count',
  'interruption_seconds', 'observer_id', 'observer_attestation', 'observer_ref', 'observer_sha256',
  'submission_ref', 'submission_sha256', 'scorer_id', 'reviewer_id', 'review_status', 'scoring_ref',
  'scoring_sha256', ...scoreFields,
] as const;

const pinnedAssets = [
  'docs/evaluation/METRICS_PROTOCOL.md',
  'docs/evaluation/HUMAN_STUDY_GUIDE.md',
  'docs/evaluation/HUMAN_STUDY_TASK.md',
  'docs/evaluation/HUMAN_STUDY_INPUT.csv',
  'docs/evaluation/HUMAN_STUDY_ANSWER_TEMPLATE.md',
  'docs/evaluation/HUMAN_STUDY_RUBRIC.md',
  'docs/evaluation/HUMAN_STUDY_OBSERVATIONS.template.csv',
  'scripts/curb/metrics/study.ts',
  'src/data/curb/investment-demo.json',
] as const;
const repository = new URL('../../../', import.meta.url);
const frozenSize = z.union([z.literal(6), z.literal(8)]);
const arm = z.enum(['manual', 'curb']);
const actualArm = z.enum(['manual', 'curb', 'mixed']);
const role = z.enum(['facilities', 'student', 'other', 'unknown']);
const familiarity = z.enum(['none', 'some', 'high', 'unknown']);
const status = z.enum([
  'unfilled', 'no_show', 'withdrew_before_start', 'withdrew_after_start',
  'completed', 'timed_out', 'abandoned', 'technical_failure',
]);
const timedStatuses = new Set<z.infer<typeof status>>(['completed', 'timed_out', 'abandoned', 'technical_failure']);
const reviewStatus = z.enum(['agreed', 'resolved']);
const staffId = z.string().regex(/^H[0-9]{2}$/);
const slotId = z.string().regex(/^S0[1-8]$/);
const sourceSha = z.string().regex(/^[0-9a-f]{40}$/);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const proofHash = z.string().regex(/^[0-9a-f]{64}$/i);
const text = z.string().trim().min(1);
const utcSeconds = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString().replace('.000Z', 'Z') === value;
}, 'Use a real UTC date and time at whole-second resolution.');
const wholeNumber = z.string().regex(/^(0|[1-9]\d*)$/).transform(Number).pipe(z.number().int().nonnegative());
const bit = z.union([z.literal(0), z.literal(1)]);
const scoreSchema = z.strictObject(Object.fromEntries(scoreFields.map((key) => [key, bit])) as {
  [Key in typeof scoreFields[number]]: typeof bit;
});

const acceptanceSchema = z.strictObject({
  status: z.literal('accepted'),
  app_source_sha: sourceSha,
  app_url: z.url(),
  environment: z.enum(['hosted', 'validated-local']),
  verified_at_utc: utcSeconds,
  verification_ref: z.url(),
});
const allocationSchema = z.strictObject({ participant_id: slotId, assigned_arm: arm });
const freezeSchema = z.strictObject({
  protocol_version: z.literal(protocolVersion),
  input_revision: z.literal(inputRevision),
  seed: z.literal(allocationSeed),
  cap_seconds: z.literal(capSeconds),
  frozen_at_utc: utcSeconds,
  cohort_size: frozenSize,
  allocation: z.array(allocationSchema),
  accepted_app: acceptanceSchema,
  acceptance_sha256: hash,
  asset_hashes: z.record(z.string(), hash),
});
const observerSchema = z.strictObject({
  participant_id: slotId,
  observer_id: staffId,
  attestation: z.literal(humanAttestation),
  status,
  app_source_sha: sourceSha,
  actual_arm: actualArm.nullable(),
  recorded_utc: utcSeconds,
  start_utc: utcSeconds.nullable(),
  end_utc: utcSeconds.nullable(),
  hint_count: z.number().int().nonnegative().nullable(),
  interruption_seconds: z.number().int().nonnegative().nullable(),
  notes: text,
});
const scoringSchema = z.strictObject({
  participant_id: slotId,
  scorer_id: staffId,
  reviewer_id: staffId,
  review_status: reviewStatus,
  review_notes: text,
  submission_sha256: proofHash,
  primary_flags: scoreSchema,
  reviewer_flags: scoreSchema,
  final_flags: scoreSchema,
});

type Freeze = z.infer<typeof freezeSchema>;
type Size = z.infer<typeof frozenSize>;
type Arm = z.infer<typeof arm>;
type ScoreFlags = z.infer<typeof scoreSchema>;
type RawRow = Record<typeof observationColumns[number], string>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function checked<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const location = parsed.error.issues[0]?.path.join('.');
    throw new Error(location ? `${label}: invalid ${location}.` : `${label} is invalid.`);
  }
  return parsed.data;
}

function parseJson(input: Buffer, label: string): unknown {
  try {
    return JSON.parse(input.toString('utf8').replace(/^\uFEFF/, '')) as unknown;
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

const digest = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const timestamp = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

async function assetHashes() {
  return Object.fromEntries(await Promise.all(pinnedAssets.map(async (path) => [
    path, digest((await readFile(new URL(path, repository), 'utf8')).replace(/\r\n/g, '\n')),
  ] as const)));
}

function sameEntries(expected: Record<string, string | number>, received: Record<string, string | number>) {
  return Object.keys(expected).length === Object.keys(received).length &&
    Object.entries(expected).every(([key, value]) => Object.hasOwn(received, key) && received[key] === value);
}

export function allocate(size: Size) {
  let state = allocationSeed;
  const arms = Array.from({ length: size }, (_, index): Arm => index < size / 2 ? 'manual' : 'curb');
  for (let index = arms.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const pick = Math.floor(state / 2 ** 32 * (index + 1));
    [arms[index], arms[pick]] = [arms[pick], arms[index]];
  }
  return arms.map((assigned_arm, index) => ({
    participant_id: `S${String(index + 1).padStart(2, '0')}`,
    assigned_arm,
  }));
}

async function readAcceptance(directory: string) {
  const bytes = await readFile(resolve(directory, 'acceptance.json'));
  const app = checked(acceptanceSchema, parseJson(bytes, 'acceptance.json'), 'App acceptance');
  const url = new URL(app.app_url);
  const receipt = new URL(app.verification_ref);
  assert(receipt.protocol === 'https:' && !receipt.username && !receipt.password,
    'App acceptance requires an HTTPS verification receipt.');
  assert(url.pathname.replace(/\/$/, '') === '/curb/investment-demo' &&
    !url.username && !url.password && !url.search && !url.hash,
  'App acceptance must pin the Investment demo URL.');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  assert(app.environment === 'hosted'
    ? url.protocol === 'https:' && !loopback
    : loopback && ['http:', 'https:'].includes(url.protocol),
  'App URL does not match the declared environment.');
  return { app, sha256: digest(bytes) };
}

export async function freezeStudy(directory: string, size: Size, now = Date.now()): Promise<Freeze> {
  const cohortSize = checked(frozenSize, size, 'Cohort size');
  const acceptance = await readAcceptance(directory);
  const frozenAt = timestamp(now);
  assert(acceptance.app.verified_at_utc <= frozenAt, 'App acceptance must predate the cohort freeze.');
  const freeze: Freeze = {
    protocol_version: protocolVersion,
    input_revision: inputRevision,
    seed: allocationSeed,
    cap_seconds: capSeconds,
    frozen_at_utc: frozenAt,
    cohort_size: cohortSize,
    allocation: allocate(cohortSize),
    accepted_app: acceptance.app,
    acceptance_sha256: acceptance.sha256,
    asset_hashes: await assetHashes(),
  };
  await writeFile(resolve(directory, 'freeze.json'), json(freeze), { flag: 'wx' });
  return freeze;
}

/** Parse CSV fields with embedded commas, quotes, and line breaks. */
export function parseCsv(source: string): string[][] {
  const input = source.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let state: 'field' | 'quoted' | 'closed' = 'field';

  const finishField = () => {
    row.push(value);
    value = '';
    state = 'field';
  };
  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (state === 'quoted') {
      if (character !== '"') value += character;
      else if (input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else state = 'closed';
    } else if (character === ',') {
      finishField();
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      finishRow();
    } else if (character === '"' && state === 'field' && value === '') {
      state = 'quoted';
    } else {
      assert(character !== '"' && state !== 'closed', `CSV record ${rows.length + 1} has invalid quoting.`);
      value += character;
    }
  }
  assert(state !== 'quoted', `CSV record ${rows.length + 1} has an unclosed quoted field.`);
  if (row.length || value || state === 'closed') finishRow();
  return rows;
}

function observations(source: Buffer) {
  const [header, ...records] = parseCsv(source.toString('utf8'));
  assert(header?.length === observationColumns.length &&
    observationColumns.every((name, index) => name === header[index]),
  'Observations must use the frozen CSV header and column order.');
  return records.map((record, index): RawRow => {
    assert(record.length === observationColumns.length, `CSV record ${index + 2} has the wrong number of fields.`);
    return Object.fromEntries(observationColumns.map((name, col) => [name, record[col]])) as RawRow;
  });
}

async function readProof(directory: string, expected: string, ref: string, sha256: string, label: string) {
  assert(ref === expected, `${label}: missing or unexpected proof reference.`);
  const expectedHash = checked(proofHash, sha256, `${label}: proof hash`);
  let bytes: Buffer;
  try {
    const path = await realpath(resolve(directory, ref));
    const inside = relative(directory, path);
    assert(inside && !isAbsolute(inside) && inside !== '..' && !inside.startsWith('..' + sep),
      'Outside the cohort directory.');
    bytes = await readFile(path);
  } catch {
    throw new Error(`${label}: proof file missing, unreadable, or outside the cohort directory.`);
  }
  assert(digest(bytes) === expectedHash.toLowerCase(), `${label}: proof file hash mismatch.`);
  assert(bytes.toString('utf8').replace(/^\uFEFF/, '').trim(), `${label}: proof file is empty.`);
  return bytes;
}

function parseAttempt(row: RawRow, freeze: Freeze, disposition: z.infer<typeof status>, label: string) {
  const timedFields = ['actual_arm', 'start_utc', 'end_utc', 'duration_seconds', 'hint_count', 'interruption_seconds'] as const;
  if (!timedStatuses.has(disposition)) {
    assert(timedFields.every((key) => row[key] === ''), `${label}: an untimed disposition must omit attempt data.`);
    return { actual_arm: null, start_utc: null, end_utc: null, duration_seconds: null, hint_count: null, interruption_seconds: null };
  }
  const attempt = {
    actual_arm: checked(actualArm, row.actual_arm, `${label}: actual arm`),
    start_utc: checked(utcSeconds, row.start_utc, `${label}: start time`),
    end_utc: checked(utcSeconds, row.end_utc, `${label}: end time`),
    duration_seconds: checked(wholeNumber, row.duration_seconds, `${label}: duration`),
    hint_count: checked(wholeNumber, row.hint_count, `${label}: hint count`),
    interruption_seconds: checked(wholeNumber, row.interruption_seconds, `${label}: interruption duration`),
  };
  const duration = attempt.duration_seconds;
  const minimumDuration = disposition === 'completed' ? 1 : 0;
  assert(attempt.start_utc >= freeze.frozen_at_utc, `${label}: attempt starts before the cohort freeze.`);
  assert(duration >= minimumDuration && duration <= capSeconds &&
    (Date.parse(attempt.end_utc) - Date.parse(attempt.start_utc)) / 1_000 === duration,
  `${label}: inconsistent start, end, or duration.`);
  assert(disposition === 'timed_out' ? duration === capSeconds : disposition === 'completed' || duration < capSeconds,
    `${label}: status disagrees with the time cap.`);
  assert(attempt.interruption_seconds <= duration &&
    (disposition !== 'technical_failure' || duration === 0 || attempt.interruption_seconds > 0),
  `${label}: interruption duration disagrees with attempt.`);
  return attempt;
}

async function validateScoring(directory: string, row: RawRow, disposition: z.infer<typeof status>, label: string) {
  const fields = [
    'submission_ref', 'submission_sha256', 'scorer_id', 'reviewer_id', 'review_status',
    'scoring_ref', 'scoring_sha256', ...scoreFields,
  ] as const;
  if (disposition !== 'completed') {
    assert(fields.every((key) => row[key] === ''), `${label}: only final submissions can be scored.`);
    return null;
  }
  const scorer = checked(staffId, row.scorer_id, `${label}: scorer`);
  const reviewer = checked(staffId, row.reviewer_id, `${label}: reviewer`);
  assert(scorer !== reviewer, `${label}: scoring requires an independent second reviewer.`);
  const review = checked(reviewStatus, row.review_status, `${label}: reconciled review status`);
  const flags = checked(scoreSchema, Object.fromEntries(scoreFields.map((key) => {
    const value = row[key];
    return [key, value === '0' || value === '1' ? Number(value) : null];
  })), `${label}: scored rubric and error flags`);
  assert(!(flags.budget_selection && flags.budget_breach), `${label}: final budget flags contradict one another.`);
  await readProof(directory, `proof/${label}/submission.md`, row.submission_ref, row.submission_sha256, `${label} submission`);
  const scoreBytes = await readProof(directory, `proof/${label}/scoring.json`, row.scoring_ref, row.scoring_sha256, `${label} scoring`);
  const score = checked(scoringSchema, parseJson(scoreBytes, `${label} scoring`), `${label}: scoring record`);
  assert(score.participant_id === label && score.scorer_id === scorer && score.reviewer_id === reviewer &&
    score.review_status === review && score.submission_sha256.toLowerCase() === row.submission_sha256.toLowerCase() &&
    sameEntries(score.final_flags, flags), `${label}: scoring record disagrees with CSV.`);
  const scorersAgree = sameEntries(score.primary_flags, score.reviewer_flags);
  assert(review === 'agreed' ? scorersAgree && sameEntries(score.primary_flags, flags) : !scorersAgree,
    `${label}: reviewer agreement contradicts the retained initial scores.`);
  return flags;
}

async function validateRow(directory: string, row: RawRow, slot: Freeze['allocation'][number], freeze: Freeze, now: string) {
  const label = slot.participant_id;
  assert(row.record_kind === 'observed' && row.observer_attestation === humanAttestation,
    `${label}: only human-attested observed records are accepted.`);
  assert(row.protocol_version === protocolVersion && row.input_revision === inputRevision &&
    row.app_source_sha === freeze.accepted_app.app_source_sha, `${label}: protocol, input, or accepted app revision mismatch.`);
  assert(row.assigned_arm === slot.assigned_arm, `${label}: assignment disagrees with the frozen allocation.`);
  const participantRole = checked(role, row.role, `${label}: role`);
  const experience = checked(familiarity, row.familiarity, `${label}: familiarity`);
  const disposition = checked(status, row.status, `${label}: disposition`);
  const observerId = checked(staffId, row.observer_id, `${label}: observer ID`);
  const attempt = parseAttempt(row, freeze, disposition, label);
  const observerBytes = await readProof(directory, `proof/${label}/observer.json`, row.observer_ref, row.observer_sha256, `${label} observer`);
  const observer = checked(observerSchema, parseJson(observerBytes, `${label} observer`), `${label}: observer record`);
  assert(observer.participant_id === label && observer.observer_id === observerId && observer.status === disposition &&
    observer.app_source_sha === row.app_source_sha && observer.actual_arm === attempt.actual_arm &&
    observer.start_utc === attempt.start_utc && observer.end_utc === attempt.end_utc &&
    observer.hint_count === attempt.hint_count && observer.interruption_seconds === attempt.interruption_seconds,
  `${label}: observer record disagrees with CSV.`);
  assert(observer.recorded_utc >= (attempt.end_utc ?? freeze.frozen_at_utc) && observer.recorded_utc <= now,
    `${label}: observer record timestamp is inconsistent.`);
  const scores = await validateScoring(directory, row, disposition, label);
  const fullyCorrect = scores !== null && rubricFields.every((key) => scores[key] === 1) &&
    errorFields.every((key) => scores[key] === 0);
  return {
    ...slot,
    role: participantRole,
    familiarity: experience,
    status: disposition,
    actual_arm: attempt.actual_arm,
    duration_seconds: attempt.duration_seconds,
    hint_count: attempt.hint_count,
    interruption_seconds: attempt.interruption_seconds,
    scores,
    fully_correct: fullyCorrect,
    unassisted_correct: fullyCorrect && attempt.hint_count === 0 && attempt.interruption_seconds === 0 &&
      attempt.actual_arm === slot.assigned_arm,
  };
}

type Row = Awaited<ReturnType<typeof validateRow>>;
const starts = (row: Row) => row.duration_seconds !== null || row.status === 'withdrew_after_start';
const rate = (count: number, denominator: number) => ({ count, denominator, rate: denominator ? count / denominator : null });

function times(rows: Row[]) {
  const seconds = rows.flatMap((row) => row.duration_seconds === null ? [] : [row.duration_seconds]);
  const ordered = [...seconds].sort((a, b) => a - b);
  const midpoint = Math.floor(ordered.length / 2);
  return {
    n: ordered.length,
    seconds,
    median_seconds: ordered.length === 0 ? null : (ordered[midpoint] + ordered[Math.ceil(ordered.length / 2) - 1]) / 2,
    min_seconds: ordered.at(0) ?? null,
    max_seconds: ordered.at(-1) ?? null,
  };
}

function summarizeArm(rows: Row[]) {
  const enrolled = rows.filter((row) => row.status !== 'unfilled').length;
  const completed = rows.filter((row) => row.status === 'completed');
  const correct = completed.filter((row) => row.fully_correct);
  const tallyFlags = (fields: typeof rubricFields | typeof errorFields) =>
    Object.fromEntries(fields.map((key) => [key, rate(completed.filter((row) => row.scores?.[key] === 1).length, completed.length)]));
  return {
    slots: rows.length,
    enrolled,
    started: rows.filter(starts).length,
    dispositions: Object.fromEntries(status.options.map((value) => [value, rows.filter((row) => row.status === value).length])),
    completion: rate(completed.length, enrolled),
    fully_correct: rate(correct.length, enrolled),
    fully_correct_among_completed: rate(correct.length, completed.length),
    hinted: rows.filter((row) => (row.hint_count ?? 0) > 0).length,
    interrupted: rows.filter((row) => (row.interruption_seconds ?? 0) > 0).length,
    mismatched_arm: rows.filter((row) => row.actual_arm !== null && row.actual_arm !== row.assigned_arm).length,
    rubric_passes: tallyFlags(rubricFields),
    observed_errors: tallyFlags(errorFields),
    all_completed_times: times(completed),
    fully_correct_times: times(correct),
    unassisted_correct_times: times(correct.filter((row) => row.unassisted_correct)),
  };
}

function compareArms(arms: Record<Arm, ReturnType<typeof summarizeArm>>) {
  const manual = arms.manual;
  const curb = arms.curb;
  const m = manual.unassisted_correct_times;
  const c = curb.unassisted_correct_times;
  if (m.n < 3 || c.n < 3 || m.median_seconds === null || c.median_seconds === null) return null;

  const qualityTradeoffs = [
    ...(curb.completion.rate! < manual.completion.rate! ? ['lower_curb_completion_rate'] : []),
    ...(curb.fully_correct.rate! < manual.fully_correct.rate! ||
      curb.fully_correct_among_completed.rate! < manual.fully_correct_among_completed.rate!
      ? ['lower_curb_fully_correct_rate'] : []),
    ...errorFields.filter((key) => curb.observed_errors[key].rate! > manual.observed_errors[key].rate!),
  ];
  return {
    manual_n: m.n,
    curb_n: c.n,
    manual_median_seconds: m.median_seconds,
    curb_median_seconds: c.median_seconds,
    percent_shorter_for_curb: 100 * (m.median_seconds - c.median_seconds) / m.median_seconds,
    quality_tradeoffs: qualityTradeoffs,
  };
}

export async function analyzeStudy(inputPath: string, now = Date.now()) {
  const path = resolve(inputPath);
  const directory = await realpath(dirname(path));
  const [frozen, input] = await Promise.all([readFile(resolve(directory, 'freeze.json')), readFile(path)]);
  const freeze = checked(freezeSchema, parseJson(frozen, 'freeze.json'), 'Study freeze');
  const analysisTime = timestamp(now);
  assert(freeze.frozen_at_utc <= analysisTime && freeze.accepted_app.verified_at_utc <= freeze.frozen_at_utc,
    'Freeze and acceptance timestamps are inconsistent.');
  const acceptance = await readAcceptance(directory);
  assert(acceptance.sha256 === freeze.acceptance_sha256 && sameEntries(acceptance.app, freeze.accepted_app),
    'App acceptance differs from the frozen record.');
  assert(sameEntries(freeze.asset_hashes, await assetHashes()), 'Study assets differ from the frozen record.');
  const allocation = allocate(freeze.cohort_size);
  assert(freeze.allocation.length === allocation.length && allocation.every((slot, index) =>
    sameEntries(slot, freeze.allocation[index])), 'Frozen allocation differs from the predeclared seeded allocation.');

  const byId = new Map<string, RawRow>();
  const raw = observations(input);
  const allowed = new Set(allocation.map((slot) => slot.participant_id));
  for (const row of raw) {
    assert(allowed.has(row.participant_id), 'Observations contain an unknown or missing participant ID.');
    assert(!byId.has(row.participant_id), `Duplicate observation for ${row.participant_id}.`);
    byId.set(row.participant_id, row);
  }
  const rows: Row[] = [];
  for (const slot of allocation) {
    const row = byId.get(slot.participant_id);
    assert(row, `Missing observation or disposition for ${slot.participant_id}.`);
    rows.push(await validateRow(directory, row, slot, freeze, analysisTime));
  }

  const arms = {
    manual: summarizeArm(rows.filter((row) => row.assigned_arm === 'manual')),
    curb: summarizeArm(rows.filter((row) => row.assigned_arm === 'curb')),
  };
  const summary = {
    protocol_version: protocolVersion,
    input_revision: inputRevision,
    state: rows.some((row) => row.duration_seconds !== null) ? 'study_observed' : 'observations_pending',
    app_source_sha: freeze.accepted_app.app_source_sha,
    environment: freeze.accepted_app.environment,
    frozen_at_utc: freeze.frozen_at_utc,
    freeze_sha256: digest(frozen),
    observations_sha256: digest(input),
    cohort_size: freeze.cohort_size,
    proof_files_checked: rows.length + 2 * rows.filter((row) => row.status === 'completed').length,
    cap_seconds: capSeconds,
    elapsed_scope: 'Post-setup recommendation and brief preparation on one synthetic scenario.',
    evidence_scope: 'Human-attested observations with verified retained-file hashes. Independent review is required before claims.',
    arms,
    descriptive_unassisted_time_comparison: compareArms(arms),
    time_comparison_minimum_per_arm: 3,
  };
  return { rows, summary };
}

function csvValue(value: string | number | null) {
  const cell = String(value ?? '');
  return /[,"\r\n]/.test(cell) ? '"' + cell.replaceAll('"', '""') + '"' : cell;
}

function accountingCsv(rows: Row[]) {
  const headings = [
    'participant_id', 'assigned_arm', 'actual_arm', 'role', 'familiarity', 'status',
    'duration_seconds', 'right_censored', 'hint_count', 'interruption_seconds', 'fully_correct', 'unassisted_correct', ...scoreFields,
  ];
  const records = rows.map((row) => [
    row.participant_id, row.assigned_arm, row.actual_arm, row.role, row.familiarity, row.status,
    row.duration_seconds, row.status === 'timed_out' ? 1 : 0, row.hint_count, row.interruption_seconds,
    row.scores ? Number(row.fully_correct) : null, row.scores ? Number(row.unassisted_correct) : null,
    ...scoreFields.map((key) => row.scores?.[key] ?? null),
  ]);
  return [headings, ...records].map((record) => record.map(csvValue).join(',')).join('\n') + '\n';
}

const json = (data: unknown) => JSON.stringify(data, null, 2) + '\n';

export async function runStudyCli(args: string[]) {
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    assert(['--freeze', '--size', '--input', '--out'].includes(key) && value &&
      !value.startsWith('--') && !options.has(key), 'Invalid or duplicate study command option.');
    options.set(key, value);
  }
  const directory = options.get('--freeze');
  const size = options.get('--size');
  if (directory && (size === '6' || size === '8') && options.size === 2) {
    const freeze = await freezeStudy(directory, size === '6' ? 6 : 8);
    return `Frozen ${freeze.cohort_size} study slots.`;
  }
  const input = options.get('--input');
  const output = options.get('--out');
  assert(input && output && options.size === 2, 'Use --freeze <new cohort folder> --size 6|8, or --input <observations.csv> --out <new analysis folder>.');
  const result = await analyzeStudy(input);
  await mkdir(output);
  await Promise.all([
    writeFile(resolve(output, 'study-summary.json'), json(result.summary), { flag: 'wx' }),
    writeFile(resolve(output, 'study-accounting.csv'), accountingCsv(result.rows), { flag: 'wx' }),
  ]);
  return `Study analysis: ${result.summary.state}.`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runStudyCli(process.argv.slice(2)).then(
    (message) => console.log(message),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    },
  );
}
