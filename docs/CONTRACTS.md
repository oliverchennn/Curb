# Foundation contract — curb-v0

Status: **frozen after F0**. Implemented at `7e56583774b9723a6ce8b6c25def915c08e76217`, integrated and independently checked at `d9d2c56b86c1bf7dda6d2d0819d00d7816cc76e1`. Live F1 assignments name the final common base containing this freeze. `schemaVersion: 1` is the data version; `curb-v0` is the interface label.

## Data and public imports

`src/contracts/curb/index.ts` exports Zod schemas and inferred types for Coordinate, Node, Edge, Destination, Barrier, Evidence, Scenario, ScenarioCounts, ScenarioView, BarrierDetail, ScenarioDataset, ScenarioErrorCode, ScenarioFailure and ScenarioResponse. Schema exports append `Schema`. Objects reject unknown fields. IDs are nonempty strings; coordinates are finite `[longitude, latitude]` within geographic bounds.

| Type | Frozen fields |
|---|---|
| Scenario | `schemaVersion: 1`, `id`, nonnegative integer `revision`, nonempty `title`, `dataKind: 'synthetic' \| 'field'`, `nodes`, `edges`, `destinations`, `barriers`, `evidence` |
| Node | `id`, `coordinate`, optional nonempty `label` |
| Edge | `id`, `fromNodeId`, `toNodeId`, `geometry: {type: 'LineString', coordinates: Coordinate[]}` with at least two positions, finite positive `lengthMeters`, boolean `bidirectional`, `barrierIds` |
| Destination | `id`, nonempty `label`, `nodeId` |
| Barrier | `id`, `edgeId`, `kind: 'missing_ramp' \| 'obstruction' \| 'surface_issue' \| 'unknown'`, `reviewStatus: 'pending' \| 'accepted' \| 'rejected'`, `evidenceIds`, string `note` |
| Evidence | `id`, `kind: 'note' \| 'image'`, `origin: 'synthetic' \| 'field'`, nonempty `caption`; optional `note`, local absolute `assetPath` (no protocol-relative path, backslash, query or fragment), ISO `observedAt` with offset, nonempty `attribution` |
| ScenarioCounts | Nonnegative integer `nodes`, `edges`, `destinations`, `barriers`, `evidence` |
| ScenarioView | `{scenario: Scenario, counts: ScenarioCounts}`; schema rejects counts differing from array lengths |
| BarrierDetail | `{barrier: Barrier, evidence: Evidence[]}` |
| ScenarioDataset | `'sample' \| 'empty'` |

IDs are unique within each collection. Every endpoint, destination node, barrier and evidence reference resolves. Edge barrier IDs and barrier edge IDs agree in both directions, with no duplicate link IDs. Visual line intersections do not create nodes. Relationship validation belongs to the pure domain helper in addition to structural Zod parsing. No costs, slopes, compliance, person counts or optimizer fields are part of foundation.

## Frozen seams

| Owner | Public import / endpoint | Contract |
|---|---|---|
| B | `src/domain/curb/index.ts` | `buildScenarioView(input: Scenario): ScenarioView`; validates structure/relationships, derives counts, throws exported `InvalidScenarioError`; no I/O or input mutation |
| B | Same domain entry | `getBarrierDetail(input: Scenario, barrierId: string): BarrierDetail \| null`; validates scenario, returns linked evidence in reference order; valid scenario with missing barrier returns null; invalid scenario still throws |
| B/data | `src/data/curb/sample.json`, `empty.json`, `invalid-reference.json` | Deterministic fixtures below; invalid case is test-only |
| A | `GET /api/curb/scenario?dataset=sample` | F1 implements validated sample/empty views; omitted query defaults to sample; unsupported selector returns 404; no cache or mutable global session |
| A/client | `src/client/curb/fetchScenario.ts` | `fetchScenario(dataset: ScenarioDataset, signal: AbortSignal): Promise<ScenarioView>`; validates envelope/counts and HTTP agreement, forwards cancellation, rejects failures |
| A/client | Same client entry | `ScenarioFetchError` with `code: ScenarioErrorCode \| 'INVALID_RESPONSE'` and HTTP `status` |
| C1 | `src/features/curb/screen/CurbScreen.tsx` | `CurbScreen` owns loading/error/selection/reset and calls the typed client adapter |
| C2 | `src/features/curb/evidence/EvidencePanel.tsx` | `EvidencePanel({detail}: {detail: BarrierDetail \| null})`; linked notes/review status; no fetching or selection ownership |

Success: `{ok: true, data: ScenarioView}` with HTTP 200. Failure: `{ok: false, error: {code, message}}`, with nonempty message. Codes: `DATASET_NOT_FOUND` (404), `INVALID_SERVER_SCENARIO` (500), `SCENARIO_UNAVAILABLE` (501, F0 stub only). F1 replaces sample/empty unavailability with real server fixture loading. Invalid internal data never becomes partial data or fallback sample. Malformed browser responses remain visible failures. Cancellation and newer loads must prevent stale data or selection from winning.

C1 imports C2 directly, with no shared barrel. Browser code may import pure domain helpers and credential-free `GeoMap` from `modules/maps/src/components.tsx`; no server/provider modules. Server uses immutable fixture data. F0's internal server stub return type does not restrict F1A from returning the success envelope.

## Golden fixtures

All have schema version 1, revision 1 and synthetic origin. Consumers derive counts; this table is verification evidence, not UI constants.

| Fixture / scenario ID | Nodes | Edges | Destinations | Barriers | Evidence |
|---|---:|---:|---:|---:|---:|
| sample / `synthetic-campus-quad` | 9 | 12 | 3 | 4 | 5 |
| empty / `synthetic-empty-campus` | 0 | 0 | 0 | 0 | 0 |
| invalid-reference / `synthetic-invalid-reference` | 1 | 1 | 0 | 0 | 0 |

Destinations: `library`, `student-center`, `science-hall`. Barrier → evidence: `library-curb` → `library-curb-note`; `quad-obstruction` → `quad-obstruction-note`, `quad-obstruction-review`; `science-surface` → `science-surface-note`; `east-walk-unknown` → `east-walk-review`. The invalid fixture is structurally valid but `dangling-edge` references `missing-node`. Preserve existing fixture IDs and meaning; no field observations are claimed.

## Change procedure

Post a CHANGE_REQUEST naming file/export, reason, consumers and compatibility impact. Coordinator stops affected writers and assigns a serial A contract task. Publish the new contract/base after checks and update dependent assignments. B/C do not edit frozen schemas, manifests or root configuration.

## R1 trip contract — curb-r1

Serial contract result: `c271c4fee62b3f05e7909df450a66f263db213ea`, reviewed with 23 passing boundary tests and typecheck. New imports are from `src/contracts/curb/trips.ts`; the existing curb-v0 file and fixtures are unchanged. Exact common implementation base is recorded on the live board after this freeze checkpoint.

`TripScenario` wraps the unchanged synthetic `Scenario` with `schemaVersion: 1`, `contractVersion: 'curb-r1'`, a `step-free-demo` profile (`id`, `label`, `description`), nonempty `assumptions`, `edgeAssessments`, `repairs` and `defaults: {originNodeId, destinationId}`. Assessments declare `edgeId`, `kind: walkway|crossing|entrance`, `status: pass|blocked|unknown`, `blockingBarrierIds` and `reason`. A repair has `id`, `label`, `barrierId`, `description` and clears only that barrier in an immutable projection. B owns complete reference/coverage/default validation in addition to structural schemas.

`TripRequest` explicitly includes `contractVersion`, `scenarioId`, `revision`, `profileId`, `originNodeId`, `destinationId` and nullable `repairId`. `TripEvaluation` echoes all these fields and includes `before` and `after`. A reachable result has `status: reachable`, ordered `nodeIds`, `edgeIds`, finite nonnegative `distanceMeters`. A same-node trip has one node, zero edges and zero distance. Failure results have `status: unknown|blocked|disconnected`, `blockedEdgeIds` and `unknownEdgeIds`, and **no route path or distance**. Explanation lists describe one possible directed connection, not every alternative. Prefer an unknown-only potential connection before one needing known blockers; unknown edges with known blockers remain excluded from the unknown-only search until cleared. They remain unknown afterward. With no repair, before and after must agree.

| Lane | Frozen seam |
|---|---|
| B | `src/domain/curb/trips.ts`: `validateTripScenario(input: unknown): TripScenario`; `evaluateTrip(input: TripScenario, request: TripRequest): TripEvaluation` |
| B | `InvalidTripScenarioError extends Error` for invalid context; `TripRequestError extends Error` with `code: INVALID_REQUEST|SCENARIO_NOT_FOUND|STALE_SCENARIO` for request failures |
| B | `src/data/curb/trip-demo.json`: separately authored synthetic graph/context, with complete explicit assessments and no inferred field truth |
| A | `GET /api/curb/trip-scenario`, optional `scenarioId`; omitted selects the single R1 example, unsupported ID fails |
| A | `POST /api/curb/trip`, body `TripRequest`; immutable before/after evaluation |
| A/client | `src/client/curb/fetchTrip.ts`: `fetchTripScenario(signal: AbortSignal, scenarioId?: string): Promise<TripScenario>`; `fetchTrip(request: TripRequest, signal: AbortSignal): Promise<TripEvaluation>`; `TripFetchError` with `code` and `status` |
| C | `app/curb/trips/page.tsx`, `src/features/curb/trips/`; link from `app/curb/page.tsx`; reuse existing EvidencePanel by import |

Both envelopes contain `contractVersion: curb-r1`: success `{ok:true,data}` or failure `{ok:false,error:{code,message}}`. `TRIP_ERROR_HTTP_STATUS` maps `INVALID_REQUEST` to 400, `SCENARIO_NOT_FOUND` to 404, `STALE_SCENARIO` to 409 and `INVALID_SERVER_SCENARIO` to 500. Client validation checks status/envelope agreement and the exact requested result identity; abort/network failure never silently falls back. Unknown schemas/fields fail explicitly. No costs, optimizer, provider or persistence fields are included.

## R2 repair plan contract — curb-r2

Frozen source: `c71310539c762a1d893f6e3b7778bdcdd3258a18`, `src/contracts/curb/plans.ts`. [Released A result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6875814582). Coordinator independently passed typecheck and 40 contract tests on integrated merge `ad5e26340a9e25034d126313f2b02f38e57bda5a`. The live assignment records the published common implementation base. Foundation and R1 interfaces/fixtures remain unchanged.

Exports: `PLAN_CONTRACT_VERSION` (`curb-r2`), `PLAN_SCHEMA_VERSION` (1), `MAX_PLAN_CANDIDATES` (12), `MAX_PLAN_SUBSETS` (4096), `PLAN_ERROR_HTTP_STATUS`; schemas and inferred types for PlanRepairCost, PlanCandidate, PlanScenario, PlanScenarioQuery, PlanRequest, PlanDestinationOutcome, PlanCoverage, PlanEligibleRepair, PlanRepairProjection, PlanSelection, PlanComparison, PlanErrorCode, PlanFailure, PlanScenarioResponse and PlanResponse. `matchesPlanRequest` checks the full parsed request tuple; `matchesPlanScenario` checks parsed context identity, destination order, authoritative candidate costs/severity and graph references. Neither helper proves route choice or global search correctness.

`PlanScenario` composes the R1 synthetic scenario/profile/assumptions/edgeAssessments/repairs schemas with one fixed `originNodeId`, distinct ordered `destinationIds`, `candidates` and `defaultBudgetCents`. A candidate has a declared `repairId`, severity `{score: 1..5, rationale}` (5 most severe), and cost `{status: assumed|quoted, cents, source}` or `{status: unknown, cents: null, source}`. All amounts are authored USD cents, safe nonnegative integers; the known aggregate must remain safe. Known zero is legitimate. Unknown costs are excluded and disclosed. Every destination has weight one. Context and evidence are explicitly synthetic.

`PlanRequest` contains only `contractVersion`, `scenarioId`, `revision`, `profileId: step-free-demo`, `originNodeId` and `budgetCents`. The origin echoes the fixed context origin; client costs, scores, weights and selections are forbidden. `PlanComparison` echoes this tuple, then includes:

- `baseline: {outcomes: [{destinationId, route: TripRouteResult}], reachableCount}`.
- `eligibleRepairs: [{repairId, severityScore, costCents}]` in severity-descending, cost-ascending, code-unit-ID order; all known-cost candidates remain listed, even when individually unaffordable. `excludedUnknownCostRepairIds` uses ascending code-unit IDs.
- `conditionFirst` and `exact`: coverage plus `selectedRepairIds`, `spendCents`, `restoredDestinationIds`, `restoredCount`, and `withoutRepair`. Condition-first scans the eligible order, purchasing each affordable repair and skipping unaffordable ones; selected IDs retain purchase order. Exact selected IDs use ascending code-unit order.
- `withoutRepair`: one `{repairId, outcomes, reachableCount, restoredDestinationIds}` per selected repair, with that repair omitted, in its plan's selected order. `singleRepairs` uses the same shape for each singleton in the sorted union selected by either plan. Every projection compares restoration against the untreated baseline; all outcomes/restored IDs retain context destination order.
- `search: {enumeratedSubsetCount, feasibleSubsetCount}`: all `2^N` masks including empty are counted; every affordable subset receives the same graph evaluator. Cached outcomes may be reused. Exact ranking maximizes newly reachable destinations, then minimizes spend, repair count, and lexicographic ID list. Exactness applies only to these bounded candidates and assumptions.

| Lane | Frozen implementation seam |
|---|---|
| B | `src/domain/curb/plans.ts`: `validatePlanScenario(input: unknown): PlanScenario`; `comparePlans(context: PlanScenario, request: PlanRequest): PlanComparison` |
| B | `InvalidPlanScenarioError extends Error`; `PlanRequestError extends Error` with `code: INVALID_REQUEST|SCENARIO_NOT_FOUND|STALE_SCENARIO`. Invalid request shape/fixed origin is 400, unsupported scenario is 404, stale revision is 409. Complete topology/coverage/repair validation remains B's responsibility. |
| B | `src/data/curb/plan-demo.json`: separately authored synthetic context. Shared multi-clear evaluator may be extracted inside `src/domain/curb/trips.ts` with R1 public behavior and regression tests preserved. |
| A | `GET /api/curb/plan-scenario`, optional `scenarioId` (omitted defaults to the sole authored scenario); `POST /api/curb/plan` with `PlanRequest` |
| A/client | `src/client/curb/fetchPlan.ts`: `fetchPlanScenario(signal: AbortSignal, scenarioId?: string): Promise<PlanScenario>`; `fetchPlan(request: PlanRequest, signal: AbortSignal): Promise<PlanComparison>`; `PlanFetchError` with `code: PlanErrorCode|'INVALID_RESPONSE'` and `status` |
| C | `/curb/plans` consumes typed HTTP transport and context metadata, validates comparison/context agreement and reuses the existing evidence panel by import. |

Strict versioned success envelopes are HTTP 200; failures map `INVALID_REQUEST` → 400, `SCENARIO_NOT_FOUND` → 404, `STALE_SCENARIO` → 409, `INVALID_SERVER_SCENARIO` → 500. All responses use no-store. A validates loaded context, output schema and both matchers; client validates status/envelope/full request agreement and forwards cancellation. Malformed data, network failure or cancellation never trigger a sample fallback. No provider, live data, database, new package or field truth is introduced.

## Survey repair handoff (curb-survey-v1, additive)

`FindingSchema.repair` is an **optional** strict object, so earlier v1 surveys stay valid and the version stays `curb-survey-v1`. Readers use `repairOf()` in `src/domain/curb/repair.ts`, which fills safe defaults: owner unassigned, location confidence unknown, essential destination unknown, no access needs, history starting at submitted.

- Fields: `obstacle`, `location`, `locationConfidence` (`confirmed|approximate|unknown`), `accessNeeds` (`mobility_device|low_vision_cane|walker|stroller`, unique), `owner` (nullable), `essentialDestination` (`yes|no|unknown`, a yes/no answer needs `destinationNote`), `professionalReview`, `workflow`.
- `workflow` is the remediation history `submitted → reviewed → planned → completed → reverified`. Each step records `status`, `action` (`advance|reopen`), `by`, `at`, `note` and `evidence`. `workflowIssue()` in the contract enforces: start at submitted, advance one status at a time, reopen only from planned or later back to reviewed, timestamps in order, and fresh `evidence` for re-verified.
- Reviewer field measurements are stored as `finding.measurements` entries with method `Reviewer field measurement`.
- Report API (`isReviewOf`): reviewers may set owner, location confidence, the essential-destination answer, append workflow steps and add/remove reviewer measurements. The obstacle, location text, access needs, professional-review flag, earlier workflow steps and all other measurements must match the published survey.
- Access-impact priority (`src/domain/curb/measurements.ts`): severity 45% (worst ADA check 80% + CLIP travel impact 20%), essential destination 30% (yes 100, unknown 30, no 0), access needs affected 25%. Confidence (measured share, person-checked, location confidence) is reported beside the score and never lowers severity. No automatic ADA-compliance verdict is produced.
