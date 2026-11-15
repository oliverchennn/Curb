import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DATA_FILES, FINAL_SOURCE_SHA256, FINAL_SOURCE_URL, INPUT_FILES, sha256, validateBundle, validateData, type DataFile } from "./validate-data.ts";

// This fixture exercises the evidence boundary. It is not a second campus dataset.
function fixture() {
  const common = { schemaVersion: 1, caseId: "canada-college-2020" };
  const sourced = { ...common, sourceSha256: FINAL_SOURCE_SHA256 };
  return {
    "sources.json": { ...common, authoritativeSourceId: "smcccd-final-2020", sources: [{
      id: "smcccd-final-2020", role: "authoritative", url: FINAL_SOURCE_URL, title: "Final report",
      publisher: "SMCCCD", reportVersion: "November 2020 final", surveyPeriod: "2019-2020",
      retrievedAt: "2026-11-15T10:18:00Z", bytes: 111675832, sha256: FINAL_SOURCE_SHA256,
      pages: 4399, reuseNote: "Factual transcription only; no image redistribution.",
    }] },
    "observations.json": { ...sourced, records: [{
      id: "obs-421", assetId: "ramp-421", kind: "ramp", source: { sourceId: "smcccd-final-2020", pdfPage: 2827, printedPage: 2826, record: "421" },
      raw: { rightRunningSlope: "9.8%", action: "Replace curb ramp" },
      measurements: [
        { field: "rightRunningSlope", raw: "9.8%", unit: "%", lower: 9.8, upper: 9.8 },
        { field: "leftTopLandingSlope", raw: "5.6%", unit: "%", lower: 5.6, upper: 5.6 },
        { field: "rightTopLandingSlope", raw: "9.4%", unit: "%", lower: 9.4, upper: 9.4 },
        { field: "domeSetback", raw: "6.0", unit: "in", lower: 6, upper: 6 },
      ],
      sourceDefectAnnotations: {
        basis: "historical_source_annotation", style: "bold_red",
        legendSource: { sourceId: "smcccd-final-2020", pdfPage: 2817, printedPage: 2816, record: "Navigation item12" },
        fieldIds: ["rightRunningSlope", "leftTopLandingSlope", "rightTopLandingSlope", "domeSetback"],
        interpretation: "Historical feature annotations only; no journey or passability assessment.",
      },
      replacementAssemblyType: "parallel",
      cost: { raw: "$7,000", cents: 700000, kind: "individual", baseYear: 2020, currency: "USD" },
      assessmentBasis: "surveyed_measurement", status: "recorded_barrier",
      review: { pass1: "author_text", pass2: "author_visual" }, unresolved: ["Connecting crossing not established."],
    }] },
    "coverage.json": { ...sourced, records: [{ id: "lot1", observationIds: ["obs-421"], assessmentBasis: "unresolved", knownBarrierIds: ["obs-421"], unresolved: ["Crossing not established."], notes: "Record only." }], policy: { id: "historical-inventory", description: "No journey inference.", noMissingRecordPass: true } },
    "projects.json": { ...sourced, projects: [{ id: "replace-421", observationIds: ["obs-421"], physicalWorkGroup: "ramp-421", action: "Replace curb ramp", replacementAssemblyType: "parallel", costCents: 700000, eligible: false, exclusionReason: "No supported journey.", clearsObservationIds: ["obs-421"], remainingUnknowns: ["Crossing not established."] }] },
    "graph.json": { ...sourced, nodes: [] as unknown[], edges: [] as unknown[], arrivalNodeId: null, destinationNodeIds: [], candidateEndpoints: [{ id: "lot1-unresolved" }], unresolvedConnections: [{ id: "crossing-421" }] },
    "feasibility.json": { ...sourced, proposedDisposition: "inventory_only", independentReview: { status: "pending", reviewerSession: "independent-reviewer" }, comparisonAllowed: false, missingData: [{ id: "crossing", description: "Establish curb-to-curb crossing coverage." }], inputHashes: {} as Record<string, string> },
  };
}

function encode(data = fixture()): Record<DataFile, string> {
  const bytes = Object.fromEntries(DATA_FILES.map(name => [name, `${JSON.stringify(data[name], null, 2)}\n`])) as Record<DataFile, string>;
  data["feasibility.json"].inputHashes = Object.fromEntries(INPUT_FILES.map(name => [name, sha256(bytes[name])]));
  bytes["feasibility.json"] = `${JSON.stringify(data["feasibility.json"], null, 2)}\n`;
  return bytes;
}

test("validates a hash-bound non-executable inventory through the real file reader", async () => {
  const dir = await mkdtemp(join(tmpdir(), "canada-validate-test-"));
  try {
    const bytes = encode();
    await Promise.all(DATA_FILES.map(name => writeFile(join(dir, name), bytes[name])));
    const result = await validateData(dir);
    assert.equal(result.comparisonAllowed, false);
    assert.equal(result.observations, 1);
    assert.equal(result.inputHashes["observations.json"], sha256(bytes["observations.json"]));
    assert.equal(result.feasibilitySha256, sha256(bytes["feasibility.json"]));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("rejects changed exact bytes even when semantics are unchanged", () => {
  const bytes = encode();
  bytes["observations.json"] += "\n";
  assert.throws(() => validateBundle(bytes), /raw-byte input hash mismatch/);
});

test("rejects rehashed tampering with authoritative source identity and page locators", () => {
  const alteredSource = fixture();
  alteredSource["sources.json"].sources[0].sha256 = "0".repeat(64);
  assert.throws(() => validateBundle(encode(alteredSource)), /source identity/);
  const wrongPage = fixture();
  wrongPage["observations.json"].records[0].source.pdfPage = 2826;
  wrongPage["observations.json"].records[0].source.printedPage = 2825;
  assert.throws(() => validateBundle(encode(wrongPage)), /ramp\/page mapping/);
  const draftSource = fixture();
  draftSource["observations.json"].records[0].source.sourceId = "draft-ramp";
  assert.throws(() => validateBundle(encode(draftSource)), /discovery documents/);
});

test("rejects adjacent subtotal substituted for ramp 421 individual estimate", () => {
  const data = fixture();
  data["observations.json"].records[0].cost.raw = "$20,000";
  data["observations.json"].records[0].cost.cents = 2000000;
  data["projects.json"].projects[0].costCents = 2000000;
  assert.throws(() => validateBundle(encode(data)), /individual estimate is \$7,000/);
});

test("rejects dangling observations, duplicate physical work and unsupported clear effects", () => {
  const dangling = fixture();
  dangling["projects.json"].projects[0].observationIds = ["absent"];
  assert.throws(() => validateBundle(encode(dangling)), /Dangling/);
  const duplicate = fixture();
  duplicate["projects.json"].projects.push({ ...duplicate["projects.json"].projects[0], id: "duplicate" });
  assert.throws(() => validateBundle(encode(duplicate)), /Duplicate physical work group/);
  const wrongClear = fixture();
  wrongClear["observations.json"].records[0].status = "summary_only";
  assert.throws(() => validateBundle(encode(wrongClear)), /cannot clear summary/);
});

test("construction zero remains unavailable and cannot become a free repair", () => {
  const data = fixture();
  const record = data["observations.json"].records[0];
  Object.assign(record, { id: "obs-414", assetId: "ramp-414", status: "under_construction", measurements: [], sourceDefectAnnotations: undefined, replacementAssemblyType: undefined });
  Object.assign(record.source, { pdfPage: 2824, printedPage: 2823, record: "414" });
  Object.assign(record.cost, { raw: "$0", cents: 0, kind: "construction_zero" });
  Object.assign(data["projects.json"].projects[0], { observationIds: ["obs-414"], costCents: 0, clearsObservationIds: [] });
  Object.assign(data["coverage.json"].records[0], { observationIds: ["obs-414"], knownBarrierIds: [] });
  assert.equal(validateBundle(encode(data)).comparisonAllowed, false);
  data["projects.json"].projects[0].eligible = true;
  assert.throws(() => validateBundle(encode(data)), /false/);
});

test("REF cannot be recast as zero and raw normalized amounts must match", () => {
  const data = fixture();
  Object.assign(data["observations.json"].records[0], { assetId: "route40-ref", kind: "sidewalk" });
  Object.assign(data["observations.json"].records[0].cost, { raw: "REF", cents: 0, kind: "overlap_reference" });
  assert.throws(() => validateBundle(encode(data)), /raw cost and cents differ/);
  const wrongCents = fixture();
  wrongCents["observations.json"].records[0].cost.cents = 700001;
  assert.throws(() => validateBundle(encode(wrongCents)), /raw cost and cents differ/);
});

test("rejects missing author passes and fabricated interval midpoint", () => {
  const review = fixture();
  review["observations.json"].records[0].review.pass2 = "pending";
  assert.throws(() => validateBundle(encode(review)), /author_visual/);
  const interval = fixture();
  Object.assign(interval["observations.json"].records[0].measurements[0], { raw: "1.5-3.5%", lower: 2.5, upper: 2.5 });
  assert.throws(() => validateBundle(encode(interval)), /raw measurement and interval differ/);
});

test("rejects overflow, negative costs, executable topology and premature comparison", () => {
  const negative = fixture();
  negative["projects.json"].projects[0].costCents = -1;
  assert.throws(() => validateBundle(encode(negative)));
  const overflow = fixture();
  overflow["projects.json"].projects[0].costCents = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => validateBundle(encode(overflow)));
  const graph = fixture();
  graph["graph.json"].edges.push({ id: "assumed-connector" });
  assert.throws(() => validateBundle(encode(graph)));
  const premature = fixture();
  premature["feasibility.json"].comparisonAllowed = true;
  assert.throws(() => validateBundle(encode(premature)));
  const ready = fixture();
  ready["feasibility.json"].proposedDisposition = "comparison_ready";
  assert.throws(() => validateBundle(encode(ready)), /Non-executable/);
});

test("rejects rehashed loss or reassignment of historical source defect annotations", () => {
  const omitted = fixture();
  omitted["observations.json"].records[0].sourceDefectAnnotations.fieldIds.pop();
  assert.throws(() => validateBundle(encode(omitted)), /source defect annotations differ/);
  const foreign = fixture();
  foreign["observations.json"].records[0].sourceDefectAnnotations.fieldIds[0] = "unrecordedFeature";
  assert.throws(() => validateBundle(encode(foreign)), /Dangling.*source defect field/);
  const verdict = fixture();
  verdict["observations.json"].records[0].sourceDefectAnnotations.basis = "verified_passability";
  assert.throws(() => validateBundle(encode(verdict)), /historical_source_annotation/);
});

test("rejects a different replacement assembly despite the same estimate", () => {
  const observation = fixture();
  observation["observations.json"].records[0].replacementAssemblyType = "perpendicular";
  assert.throws(() => validateBundle(encode(observation)), /replacement assembly differs from source/);
  const project = fixture();
  project["projects.json"].projects[0].replacementAssemblyType = "blended_transition";
  assert.throws(() => validateBundle(encode(project)), /project replacement assembly differs/);
});

test("materialized candidate retains printed ramp415 context and strict byte provenance", async () => {
  const entries = await Promise.all(DATA_FILES.map(async name => [name, await readFile(new URL(`../../../research/curb/canada-2020/${name}`, import.meta.url))] as const));
  const bytes = Object.fromEntries<Uint8Array | string>(entries) as Record<DataFile, Uint8Array | string>;
  assert.equal(validateBundle(bytes).comparisonAllowed, false);
  const crlf = { ...bytes, "observations.json": Buffer.from(bytes["observations.json"]).toString("utf8").replaceAll("\n", "\r\n") };
  assert.throws(() => validateBundle(crlf), /raw-byte input hash mismatch/);
  const observations = JSON.parse(Buffer.from(bytes["observations.json"]).toString("utf8"));
  const ramp415 = observations.records.find((record: { id: string }) => record.id === "ramp-415");
  ramp415.raw.tableContext.verticalCurb = "not recorded";
  bytes["observations.json"] = `${JSON.stringify(observations, null, 2)}\n`;
  const receipt = JSON.parse(Buffer.from(bytes["feasibility.json"]).toString("utf8"));
  receipt.inputHashes["observations.json"] = sha256(bytes["observations.json"]);
  bytes["feasibility.json"] = `${JSON.stringify(receipt, null, 2)}\n`;
  assert.throws(() => validateBundle(bytes), /Vertical/);
});
