import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { normalizeMeasurement, normalizeUsd } from "./normalize.ts";

export const FINAL_SOURCE_SHA256 = "01e6d86bc0535a925a1f26172c808a22b80fc000797d5fc441ea1b9714f4d2f8";
export const FINAL_SOURCE_URL = "https://smccd.edu/ada2020/19029%20SMCCCD%20ADA%20Self-Evaluation%20and%20Transition%20Plan%20FINAL%20Nov2020%20sm.pdf";
export const INPUT_FILES = ["sources.json", "observations.json", "coverage.json", "projects.json", "graph.json"] as const;
export const DATA_FILES = [...INPUT_FILES, "feasibility.json"] as const;
export type DataFile = typeof DATA_FILES[number];

const text = z.string().min(1);
const amount = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const strings = z.array(text);
const basis = z.enum(["surveyed_measurement", "source_assessment", "inventory_coverage_assumption", "unresolved"]);
const common = { schemaVersion: z.literal(1), caseId: z.literal("canada-college-2020") };
const sourced = { ...common, sourceSha256: z.literal(FINAL_SOURCE_SHA256) };
const sourceSchema = z.object({
  id: text, role: z.enum(["authoritative", "discovery_only"]), url: z.url(), title: text,
  publisher: text, reportVersion: text, surveyPeriod: text, retrievedAt: text,
  bytes: amount.positive(), sha256: hash, pages: amount.positive(), reuseNote: text,
}).passthrough();
const sourcesSchema = z.object({ ...common, authoritativeSourceId: z.literal("smcccd-final-2020"), sources: z.array(sourceSchema).min(1) }).passthrough();
const measurementSchema = z.object({ field: text, raw: z.string(), unit: text, lower: z.number().finite().nonnegative().nullable(), upper: z.number().finite().nonnegative().nullable() }).passthrough();
const observationSchema = z.object({
  id: text, assetId: text, kind: z.enum(["ramp", "sidewalk", "route_summary", "legend", "methodology"]),
  source: z.object({ sourceId: text, pdfPage: amount.positive(), printedPage: z.union([z.string(), amount, z.null()]), record: text }).passthrough(),
  raw: z.record(z.string(), z.unknown()), measurements: z.array(measurementSchema),
  cost: z.object({ raw: z.string(), cents: amount.nullable(), kind: z.enum(["individual", "subtotal", "route_total", "overlap_reference", "construction_zero", "maintenance_zero", "unknown"]), baseYear: z.literal(2020), currency: z.literal("USD") }).passthrough(),
  assessmentBasis: basis,
  status: z.enum(["recorded_barrier", "assessed_features_compliant", "under_construction", "summary_only", "context_only"]),
  review: z.object({ pass1: z.literal("author_text"), pass2: z.literal("author_visual") }).passthrough(),
  unresolved: strings,
}).passthrough();
const observationsSchema = z.object({ ...sourced, records: z.array(observationSchema).min(1) }).passthrough();
const projectsSchema = z.object({ ...sourced, projects: z.array(z.object({
  id: text, observationIds: strings.min(1), physicalWorkGroup: text, action: text,
  costCents: amount.nullable(), eligible: z.literal(false), exclusionReason: text,
  clearsObservationIds: strings, remainingUnknowns: strings,
}).passthrough()).max(12) }).passthrough();
const graphSchema = z.object({ ...sourced,
  nodes: z.array(z.unknown()).length(0), edges: z.array(z.unknown()).length(0), arrivalNodeId: z.null(),
  destinationNodeIds: z.array(z.unknown()).length(0), candidateEndpoints: z.array(z.record(z.string(), z.unknown())),
  unresolvedConnections: z.array(z.record(z.string(), z.unknown())),
}).passthrough();
const coverageSchema = z.object({ ...sourced, records: z.array(z.object({
  id: text, observationIds: strings, assessmentBasis: basis, knownBarrierIds: strings, unresolved: strings,
  notes: z.union([z.string(), strings]),
}).passthrough()), policy: z.object({ id: text, description: text, noMissingRecordPass: z.literal(true) }).passthrough() }).passthrough();
const feasibilitySchema = z.object({ ...sourced,
  proposedDisposition: z.enum(["inventory_only", "conditional_only", "comparison_ready"]),
  independentReview: z.object({ status: z.literal("pending"), reviewerSession: text }).passthrough(),
  comparisonAllowed: z.literal(false),
  missingData: z.array(z.object({ id: text, description: text }).passthrough()).min(1),
  inputHashes: z.object({ "sources.json": hash, "observations.json": hash, "coverage.json": hash, "projects.json": hash, "graph.json": hash }).strict(),
}).passthrough();

function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function unique(values: string[], label: string): Set<string> {
  requireThat(new Set(values).size === values.length, `Duplicate ${label}`);
  return new Set(values);
}
function references(values: string[], known: Set<string>, label: string): void {
  unique(values, label);
  for (const value of values) requireThat(known.has(value), `Dangling ${label}: ${value}`);
}
export function sha256(bytes: Uint8Array | string): string { return createHash("sha256").update(bytes).digest("hex"); }

/** Validates the released inventory format. It deliberately cannot authorize comparison. */
export function validateBundle(bytes: Record<DataFile, Uint8Array | string>) {
  const parse = (name: DataFile): unknown => {
    try { return JSON.parse(typeof bytes[name] === "string" ? bytes[name] : Buffer.from(bytes[name]).toString("utf8")); }
    catch (error) { throw new Error(`${name}: invalid JSON`, { cause: error }); }
  };
  const sources = sourcesSchema.parse(parse("sources.json"));
  const observations = observationsSchema.parse(parse("observations.json"));
  const coverage = coverageSchema.parse(parse("coverage.json"));
  const projects = projectsSchema.parse(parse("projects.json"));
  graphSchema.parse(parse("graph.json"));
  const feasibility = feasibilitySchema.parse(parse("feasibility.json"));
  const inputHashes = Object.fromEntries(INPUT_FILES.map(name => [name, sha256(bytes[name])])) as Record<typeof INPUT_FILES[number], string>;
  for (const name of INPUT_FILES) requireThat(inputHashes[name] === feasibility.inputHashes[name], `${name}: raw-byte input hash mismatch`);
  const sourceIds = unique(sources.sources.map(source => source.id), "source ID");
  const authoritative = sources.sources.filter(source => source.role === "authoritative");
  requireThat(authoritative.length === 1 && authoritative[0].id === sources.authoritativeSourceId, "Exactly one named authoritative source is required");
  const final = authoritative[0];
  requireThat(final.sha256 === FINAL_SOURCE_SHA256 && final.bytes === 111675832 && final.pages === 4399 && final.url === FINAL_SOURCE_URL, "Authoritative source identity differs from frozen final PDF; version review required");
  for (const source of sources.sources) requireThat(/Z$/.test(source.retrievedAt) && Number.isFinite(Date.parse(source.retrievedAt)), `${source.id}: retrieval must be an actual UTC timestamp`);
  const observationIds = unique(observations.records.map(record => record.id), "observation ID");
  const byId = new Map(observations.records.map(record => [record.id, record]));
  const rampPages: Record<string, number> = { "413": 2824, "414": 2824, "415": 2825, "404": 2826, "405": 2826, "421": 2827, "422": 2827 };
  for (const record of observations.records) {
    requireThat(sourceIds.has(record.source.sourceId) && record.source.sourceId === final.id, `${record.id}: discovery documents cannot supply final observations`);
    requireThat(record.source.pdfPage <= final.pages, `${record.id}: PDF page outside source`);
    requireThat(record.source.printedPage === null || String(record.source.printedPage) === String(record.source.pdfPage - 1), `${record.id}: printed/viewer page mismatch`);
    const rampId = record.kind === "ramp" ? /(?:^|\D)(\d{3})$/.exec(record.assetId)?.[1] : undefined;
    if (rampId && rampPages[rampId]) requireThat(record.source.pdfPage === rampPages[rampId], `${record.id}: known ramp/page mapping mismatch`);
    unique(record.measurements.map(measurement => measurement.field), `${record.id} measurement field`);
    for (const measurement of record.measurements) {
      const normalized = normalizeMeasurement(measurement.raw, measurement.unit);
      requireThat(measurement.lower === normalized.lower && measurement.upper === normalized.upper, `${record.id}/${measurement.field}: raw measurement and interval differ`);
    }
    const cost = record.cost;
    requireThat(normalizeUsd(cost.raw) === cost.cents, `${record.id}: raw cost and cents differ`);
    if (cost.cents === null) requireThat(cost.kind === "unknown" || cost.kind === "overlap_reference", `${record.id}: null cost requires unknown or overlap_reference`);
    if (cost.kind === "unknown" || cost.kind === "overlap_reference") requireThat(cost.cents === null, `${record.id}: unknown/REF work must not become a free repair`);
    if (cost.kind === "construction_zero" || cost.kind === "maintenance_zero") requireThat(cost.cents === 0, `${record.id}: zero cost kind must retain zero`);
    if (record.status === "under_construction") requireThat((cost.kind === "construction_zero" || cost.kind === "unknown") && record.unresolved.length > 0, `${record.id}: construction must remain unresolved`);
    if (record.status === "assessed_features_compliant") requireThat(record.unresolved.length > 0, `${record.id}: surveyed-feature compliance must retain journey unknowns`);
    if (rampId === "421") requireThat(cost.kind === "individual" && cost.cents === 700000, `${record.id}: ramp 421 individual estimate is $7,000, not the adjacent subtotal`);
    if (rampId === "422") requireThat(cost.kind === "individual" && cost.cents === 350000, `${record.id}: ramp 422 individual estimate is $3,500`);
  }
  unique(projects.projects.map(project => project.id), "project ID");
  unique(projects.projects.map(project => project.physicalWorkGroup), "physical work group");
  for (const project of projects.projects) {
    references(project.observationIds, observationIds, `${project.id} observation`);
    references(project.clearsObservationIds, new Set(project.observationIds), `${project.id} cleared observation`);
    for (const id of project.clearsObservationIds) requireThat(byId.get(id)?.status === "recorded_barrier", `${project.id}: cannot clear summary/construction/compliance evidence`);
    if (project.observationIds.length === 1) {
      const record = byId.get(project.observationIds[0])!;
      requireThat(project.costCents === record.cost.cents, `${project.id}: single-record estimate differs from source`);
    }
  }
  unique(coverage.records.map(record => record.id), "coverage ID");
  for (const record of coverage.records) {
    references(record.observationIds, observationIds, `${record.id} observation`);
    references(record.knownBarrierIds, new Set(record.observationIds), `${record.id} known barrier`);
    for (const id of record.knownBarrierIds) requireThat(byId.get(id)?.status === "recorded_barrier", `${record.id}: known barrier must identify recorded barrier evidence`);
    if (record.assessmentBasis === "unresolved") requireThat(record.unresolved.length > 0, `${record.id}: unresolved coverage requires reasons`);
  }
  unique(feasibility.missingData.map(item => item.id), "missing data ID");
  requireThat(feasibility.proposedDisposition !== "comparison_ready", "Non-executable Stage A inventory cannot be marked comparison_ready");
  return {
    schemaVersion: 1, caseId: "canada-college-2020", sourceSha256: FINAL_SOURCE_SHA256,
    proposedDisposition: feasibility.proposedDisposition, comparisonAllowed: false,
    independentReview: "pending", observations: observations.records.length,
    projects: projects.projects.length, coverageRecords: coverage.records.length, inputHashes,
    feasibilitySha256: sha256(bytes["feasibility.json"]),
    limitation: "Structural/byte validation is author verification, not independent source review or evidence of passability.",
  };
}

export async function validateData(directory: string) {
  const [sources, observations, coverage, projects, graph, feasibility] = await Promise.all(DATA_FILES.map(name => readFile(resolve(directory, name))));
  return validateBundle({
    "sources.json": sources, "observations.json": observations, "coverage.json": coverage,
    "projects.json": projects, "graph.json": graph, "feasibility.json": feasibility,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--data") {
    process.stderr.write("Usage: node --import tsx scripts/curb/canada-case/validate-data.ts --data <directory>\n");
    process.exitCode = 1;
  } else {
    validateData(args[1]).then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)).catch(error => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
  }
}
