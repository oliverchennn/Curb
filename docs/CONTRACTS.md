# Foundation contract — curb-v0

Status: **draft to be implemented and frozen by F0**. No schemas or functions exist yet. `schemaVersion: 1` is the data version; `curb-v0` is the team interface label. F0 reports exact public imports, golden fixtures and checks before F1 dispatch.

## Data

Use the fields in implementation-plan section 6. F0 fixes field spelling in Zod and inferred TypeScript types in `src/contracts/curb/`; do not maintain separately drifting types.

| Type | Required content |
|---|---|
| Scenario | Version 1, stable ID, revision, title, synthetic/field origin, nodes/edges/destinations/barriers/evidence arrays |
| Node | ID; `[longitude, latitude]`; optional label |
| Edge | ID; from/to node IDs; explicit GeoJSON LineString; positive length in meters; bidirectional flag; barrier IDs |
| Destination | ID; label; node ID |
| Barrier | ID; edge ID; missing_ramp/obstruction/surface_issue/unknown; pending/accepted/rejected review status; evidence IDs; note |
| Evidence | ID; note/image kind; synthetic/field origin; caption/note; optional public asset path, ISO timestamp and attribution |
| ScenarioView | Proposed `{ scenario: Scenario, counts: { nodes, edges, destinations, barriers, evidence } }`; counts derive from array lengths |
| BarrierDetail | Proposed `{ barrier: Barrier, evidence: Evidence[] }`; missing barrier returns `null` |

Coordinates have valid longitude/latitude bounds. IDs are unique within each record collection. Every endpoint, destination node, barrier and evidence reference resolves. An edge's barrier IDs and each barrier's edge ID agree. Visual line intersections do not create nodes. Unknown measurements stay absent/null. No costs, slopes, compliance, person counts or optimizer fields in foundation.

## Imports and seams to freeze

| Owner | Proposed public import | Contract |
|---|---|---|
| A/shared | `src/contracts/curb/index.ts` | Scenario/ScenarioView/BarrierDetail schemas/types; response envelope; shared fixture expectations |
| B | `src/domain/curb/index.ts` | `buildScenarioView(scenario): ScenarioView`; relationship validation, derived counts, no I/O |
| B | Same domain entry | `getBarrierDetail(scenario, barrierId): BarrierDetail \| null`; referenced evidence only |
| B/data | `src/data/curb/sample.json`, `empty.json`, `invalid-reference.json` | Deterministic synthetic/empty/invalid cases; invalid fixture only for tests |
| A | `GET /api/curb/scenario?dataset=sample` | Validated view; `empty` selects empty fixture; no query defaults to sample; unsupported dataset 404 |
| A/client | `src/client/curb/fetchScenario.ts` | `fetchScenario(dataset, signal): Promise<ScenarioView>`; envelope validation, explicit HTTP/schema errors, AbortSignal forwarded |
| C1 | `src/features/curb/screen/CurbScreen.tsx` | Screen owns loading/error/selection/reset; calls typed client adapter |
| C2 | `src/features/curb/evidence/EvidencePanel.tsx` | `EvidencePanel({detail}: {detail: BarrierDetail \| null})`; renders note/review status; no fetch or selection ownership |

Success envelope: `{ok:true,data:ScenarioView}`. Failure: `{ok:false,error:{code,message}}`. Freeze exact error codes in F0, including dataset-not-found and invalid-server-scenario cases. Invalid internal data returns an explicit 500 envelope, never a partial or fallback sample. Browser schema mismatch is a visible failure. Cancellation must not leave stale successful data replacing a newer load.

C1 imports C2 directly; C2 has no shared barrel to edit. Browser code can use B's pure domain helpers, but imports no server or provider SDK. Server loads immutable fixture data; no mutable global session.

F0 establishes a valid sample with roughly 8–12 nodes, 10–16 edges, 3–4 destinations and 4 barriers, an empty scenario, and a dangling-reference test case. Record actual IDs/counts; consumers must not hardcode those counts. C1/C2 integration props and A1/A2 wire envelopes must compile together at F0.

## Change procedure

Post a CHANGE_REQUEST naming the file/export, reason, consumers and compatibility impact. Coordinator stops affected writers and assigns an A contract task. Publish the new contract/base only after its checks pass; update dependent assignments. No B/C edits to frozen schemas or manifests.
