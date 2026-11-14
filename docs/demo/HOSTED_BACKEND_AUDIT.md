# Hosted backend audit

Audit of the deployed PR #7 source `b010ad02ce9e0cb905e15e5c7c7109713814b36e`, deployment `dpl_BWzjmy9YwNRuAcRBLTpbJGWRK1x9`. The Vercel deployment and alias inventory confirmed that [curb-taupe.vercel.app](https://curb-taupe.vercel.app) points to this READY production deployment. The [hosting record](https://github.com/oliverchennn/Curb/blob/94838741512dc2efb08e490ff91c7ca886d0970b/docs/demo/VINCENT_HOSTING_RESULT.md) binds the immutable deployment to an archive of the exact Git commit. The production survey and the two synthetic scenario metadata responses also matched the pinned fixtures. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6884877589), [ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6884938624).

No P1 or P2 user-flow failure was observed. All 31 scripted probes met expectations, and all three browser export bundles passed offline verification. Two baseline observations and the existing body-limit gap are recorded below.

## Public API coverage

The [pinned audit script](https://github.com/oliverchennn/Curb/blob/bbafa7a0024b8f2bfa090bafa2b5b81c044f174d/scripts/curb/audit_hosted_backend.ts) sent 31 sequential requests with an 18-second per-request timeout, a 256 KiB request-body ceiling and no redirects or retries. There was one additional GET during a browser harness timeout and eight API calls in its corrected run, for 40 public API requests in this audit. Browser navigation and asset loading were separate from the explicit API probes. Earlier venue media/range checks were reused. All inspected handler JSON had the expected media type, and every scripted handler response included `Cache-Control: no-store`. The scripted JSON failures included structured codes/messages and no matched diagnostic path or stack markers. The generated 405 was checked separately.

| App route and authored method | Consumer and contract | Expected and observed states |
| --- | --- | --- |
| `GET /api/health` | Operations liveness. JSON status, service and revision. | 1. HTTP 200 and `alive/web`. Revision was an empty string, HB-01. |
| `GET /api/ready` | Operations readiness. JSON status, mode and dependencies. | 1. HTTP 200 with `ready/local` and an empty dependency list. |
| `GET /api/curb/scenario` | `/curb` via `fetchScenario`. `curb-v0` view/counts or failure. | 4. Default sample and explicit empty returned 200. Unknown dataset returned 404 `DATASET_NOT_FOUND`. Repeated conflicting selector returned the first value, HB-02. |
| `GET /api/curb/trip-scenario` | `/curb/trips` via `fetchTripScenario`. `curb-r1` context. | 3. Default context 200, unknown ID 404 `SCENARIO_NOT_FOUND`, repeated selector 400 `INVALID_REQUEST`. |
| `POST /api/curb/trip` | `/curb/trips` via `fetchTrip`. Versioned before/after evaluation and errors. | 6. Library repair and disconnected Archive returned 200 with expected route states. Malformed JSON, missing fields and invalid destination returned 400 `INVALID_REQUEST`. Prior revision returned 409 `STALE_SCENARIO`. |
| `GET /api/curb/plan-scenario` | `/curb/plans` via `fetchPlanScenario`. `curb-r2` context. | 3. Default context 200, unknown ID 404 `SCENARIO_NOT_FOUND`, extra query field 400 `INVALID_REQUEST`. |
| `POST /api/curb/plan` | `/curb/plans` via `fetchPlan`. Versioned comparison and errors. | 7. Budgets 0, 400 and 800 cents returned 200 and matched expected policy outcomes. Negative, fractional and string cents returned 400 `INVALID_REQUEST`. Prior revision returned 409 `STALE_SCENARIO`. |
| `GET /api/curb/survey` | Robertson survey workspace. Canonical `curb-survey-v1` data or structured error. | 3 scripted, 3 browser. Canonical JSON 200 and matched the pinned fixture. Unknown ID 404 `SURVEY_NOT_FOUND`; repeated ID 400 `INVALID_REQUEST`. All browser reads returned 200. |
| `POST /api/curb/survey/report` | Survey Export tab. PDF by default, accessible HTML by format, structured JSON errors. | 3 scripted, 6 browser. Unsupported format and missing budget for the budget policy returned 400 `INVALID_REQUEST`. Deliberate GET returned framework 405. Three browser requests per format returned 200 and yielded verified attachments. |

At 400 cents the condition-first policy restored Hall and the exact policy restored Library and Student center. At 0 neither restored a route, and at 800 each restored all three. Studio stayed unknown and its unpriced repair stayed excluded. The R1 library-ramp projection opened the authored 60 m route, with the expected ordered edges. The separate synthetic replay suite verified the crack changes Library from 330 m to 240 m, and the slab opens Clinic and Pharmacy at 260 m and 275 m. Robertson field traversal remained unknown.

## Browser request-to-file verification

At 17:14:29 EST, Chrome 156.0.8078.74 at 1366×768 opened the public Robertson deep link and sought Defect 05 at 13.933333 s, frame 418. Three complete variants were saved through the actual UI. For each, HTML/PDF request bodies agreed, JSON matched the exact submitted survey, all five photos matched in both reports, and the offline verifier compared CSV, plan IDs, selected and deferred work, quote items, and totals. The first browser attempt observed the expected HTTP 200 with an explicit `?id=robertson-hall` query. My response matcher initially required a bare path, which cost one GET and produced a harness timeout. The corrected run passed.

| Variant | UI inputs and observed output |
| --- | --- |
| Default | Balanced, no budget, canonical five findings, PDF 12 pages. |
| Budget | Selected Budget after typing `1500.25` dollars. Both requests used exactly 150,025 cents. PDF 13 pages. Budget known subtotal 21,600–143,400 cents, partial with quote needs. |
| Edited | Rejected Defect 01 using the disposable name “Audit reviewer — É”. JSON/CSV, HTML and PDF agreed on the edit and retained all five findings. PDF 13 pages. Defect 05 evidence and frame 418 remained intact. The UI described the annotated video as fixed to the original analysis, and its link still targeted the canonical MP4. |

After the edit, reloading returned an equal canonical GET body and cleared the local reviewer input. Zero page exceptions were observed in the completed run. This audit tested the request/download path and retained-file semantics in one Chromium viewport. C owns the separate control and accessibility audit.

## Local verification and deployment plumbing

- Locked install and TypeScript passed. The initial `npm run check` stopped at one Windows oracle test timeout under default concurrency, with 717 passes and one timeout. Running `npm.cmd test -- --maxWorkers=2 --testTimeout=20000` on the same source passed all 718 tests / 26 files. `npm.cmd run build` and `npm.cmd run test:replay` passed, with all 14 replay checks. Standalone strict TypeScript for the new audit script also passed.
- `node --import tsx scripts/curb/stress_plans.ts --seed 1129665090 --cases 64` passed against the same product bytes at the script-only checkpoint. The existing independent oracle completed 2,048 plan comparisons, 512 budgets, 80 domain cases and nine rejected boundaries. The local real-handler pass had 88 requests with expected outcomes, 170 embedded photo checks and two canonical GET checks. The domain suite covers direction, blocked/unknown/disconnected states, exact and insufficient budgets, decimal rollup, grouped work areas, compatible options, shared setup once, quote-only and partial estimates, and deferred work. The existing adversarial report/CSV tests cover named-priority attribution, immutable evidence, Unicode, output escaping and spreadsheet-active strings.
- The production deployment reports Node 26 despite its Node 24 project setting, as recorded at hosting handoff. The Windows build's completed survey GET trace contained the canonical JSON. The report trace listed 131 entries, including the canonical JSON and five approved JPGs; one JSON entry appears with forward slashes and once with Windows separators. Both hosted export formats successfully read those five images. The [earlier public verifier](https://github.com/oliverchennn/Curb/blob/94838741512dc2efb08e490ff91c7ca886d0970b/docs/demo/VINCENT_HOSTING_RESULT.md#public-verification) passed exact bytes and ranges with HTTP 206 on the three media files, and this audit verified the final hosted seek.
- On a production server on loopback port 3195, the same ten-request deployment verifier passed. Chrome loaded upload, survey, collection and explorer while all external HTTP(S) was blocked; no external HTTP(S) was attempted. That check covers those initial loads only. The server was stopped and the port refused connections.
- Vercel's error/fatal log query for this deployment during 22:12:00–22:14:31 UTC returned no grouped rows. This is the available scoped log result. The endpoint tests and browser receipts establish the observed statuses directly.
- No public oversized or sustained traffic, concurrent stress, 500 injection, automatic HEAD/OPTIONS matrix, immutable-host protection bypass, redeploy, alias change or settings change. Only the production alias was tested directly.

## Findings on the pinned baseline

| ID | Severity | Evidence and disposition |
| --- | --- | --- |
| HB-01 | P3 | `GET /api/health` returned 200 with `revision: ""` on the manually uploaded release. An empty Vercel SHA wins over the nullish fallback. The endpoint cannot identify the deployed SHA on this baseline. Root published a candidate fix and plans explicit release metadata for the next deployment. |
| HB-02 | P4 | `GET /api/curb/scenario?dataset=empty&dataset=sample` returned 200 for empty. Unlike later selectors, foundation uses `URLSearchParams.get()` and accepts the first occurrence. The UI sends a single selector; this is a compatibility/consistency observation. Root can decide whether to tighten it and document a new failure contract. |
| HB-03 | P3 hardening | Source inspection confirmed plan and trip POST use unbounded route-level `request.json()`, unlike the report reader. This is the known baseline gap from the ownership update. No large-body production test or capacity claim. Root has published a candidate with explicit bounds; baseline results remain scoped to the current deploy. [Root checkpoint](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885002975). |

At that pinned script commit, the audit command was `node --import tsx scripts/curb/audit_hosted_backend.ts https://curb-taupe.vercel.app`. Root subsequently updated the current script to require an explicit origin and full expected source SHA, reject a mismatched health revision, and expect typed404 for repeated foundation selectors. Those changes do not relabel the baseline results above. Keep the hosted request cap when deciding whether to rerun. Browser files and raw receipts stay under ignored `.curb-local/hosted-backend/`. The offline command was `node --import tsx scripts/curb/verify_report_bundle.ts .curb-local/hosted-backend/bundles`.

| Receipt | SHA-256 |
| --- | --- |
| `api-receipt.json` | `c3985da70b5a86c982a4d1735fb0fa64335a0122d2a1fbf26f719d57554dd55f` |
| `browser-receipt.json` | `ea700d7dcc87c69c2f80ba72f8966d7856a3a01e44e9e6397d92b8195bfb70cb` |
| `bundle-verification.json` | `f98dff4cf737446e62cdffaa30fbb1b653e2604f9217a4132b440302119d0e7f` |
