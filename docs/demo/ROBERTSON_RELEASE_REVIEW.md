# Robertson release audit — Developer D

## Source and decision

Reviewed exact root source `c46ecc2b5434ed91c5d6e2976a8d0b389704e1bc` on 2026-11-14, under [ROBERTSON-RELEASE-AUDIT/1](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877603850), ACK [6877622359](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877622359). Checkout `/workspace/curb-robertson-release-audit`, branch `codex/robertson-release-audit`; only this new review document is writable. Existing product, test, media and other documentation files stayed read-only. No children or preview server were started.

The reviewed exact-frame validation, inspection exclusion, track-tail correction and source-level review controls passed the checks below. No additional reproducible defect was found in those corrections. **This is not final Robertson acceptance.** The three-finding inventory is superseded for coverage, and this pinned source lacks the real B client/export modules required to typecheck and exercise the combined app.

Root subsequently acknowledged two omitted areas—the large cracked patch/right-hand panel and final transverse crack—in [6877637509](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877637509). That is an open release blocker, not a new discovery attributed to this audit. The expanded inventory, tracks, work-area grouping, plan totals and capacity limits need review on their own published source. Existing three-finding totals and the D2 script are historical until their owner updates and verifies them. The original video does not establish dimensions, a raised slab, ADA compliance or route impact.

## Actual checks

Commands ran on the pinned source with Node 24.22.1 and npm 11.9.0. Local receipts and extracted frames are under ignored `.curb-local/robertson-release-review/`.

| Check | Observed result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Passed; 75 packages installed. |
| `npm test -- src/contracts/curb/survey.test.ts src/domain/curb/survey.test.ts src/features/curb/survey/presentation.test.ts tests/integration/robertson/independent.test.ts` | 63 tests passed across four files at 13:02:50 UTC. No expected-failure exemption remains for D1-01. |
| `npm run typecheck` | Exit 2: exactly two unresolved imports in `src/features/curb/survey/services.ts`: `../../../client/curb/fetchSurvey` and `../../../domain/curb/surveyExports`. This is a blocked check, not a pass. |
| `node --import tsx scripts/curb/verify_assets.ts` | Passed after allowing its read-only `ffprobe` child process. The first sandboxed attempt failed with `spawnSync ffprobe EPERM`; that attempt is not counted as a pass. Verified asset presence/hashes, decoded frame counts/dimensions, BT.709 primaries/transfer, retained track equality and evidence anchors. |
| Independent `ffprobe` of annotated MP4 | 720 × 1280, 30/1 fps; BT.709 matrix, transfer and primaries. |
| Boundary-frame inspection | Extracted exact zero-based frames 210, 228, 229, 230, 231, 285, 300, 301, 302, 360, 369, 370, 371 and 372 using `ffmpeg`. Visually inspected all fourteen bottom-edge crops and the three full-frame evidence anchors. |

Full build, real HTTP survey/PDF flow, actual downloads, browser playback/seek, responsive behavior, keyboard navigation and offline use were not run at this source. B's later result `5aab3c0177684350a26b801fd6f441d86b8d0b88` and report QA `14aec0a61322c4304c2280e806dd84ba63349a71` are separate worker evidence, not checks performed by this audit or acceptance of root's future combination. C's later CSS result `09e32f457951ef0d717ef253bf36367f5710d7f8` is likewise outside this pinned source.

## Correction review

**Exact evidence frame.** `SurveySchema` now requires the track key at `floor(evidenceTime * fps + 1e-6)`, matching the displayed-frame lookup. The original D1 counterexample removes the evidence key while retaining neighboring keys; the regular regression now rejects it. This preserves explicit invisible gaps rather than interpolating an unsupported box. The earlier independent 19-check verification of root `3062e8637e5bb91f33d0e4b135cbfc60761b22e1` remains separately recorded in [6877560263](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877560263); it is not relabeled as verification of later media or UI changes.

**Inspection is not repair coverage.** The evaluator removes `method: inspect` before all four policy selections. Filtering missing candidates prevents inspection-only work areas from producing an undefined treatment. The revised recursive per-area oracle excludes inspection choices independently of the production bitmask. The zero-cost inspection-only regression leaves every repair need deferred, keeps measurement checks, selects no work area and awards zero coverage. Shared costs are charged only when actual repair work is selected. A known empty subtotal does not establish that the deferred work is free or complete.

**Track tails and labels.** Analysis, retained tracks and canonical findings agree on the same IDs and labels. The annotated renderer now uses each finding's label directly. Retained keys are:

| Finding | Label | Retained frame range | Keys | Evidence frame |
| --- | --- | --- | --- | --- |
| defect-01 | Defect 01 · Transverse crack | 105–229 | 125 | 210 / 7 s |
| defect-02 | Defect 02 · Branched crack | 195–301 | 107 | 285 / 9.5 s |
| defect-03 | Defect 03 · Diagonal crack | 270–370 | 101 | 360 / 12 s |

The sampled final visible edge fragments remain inside their respective boxes at frames 229, 301 and 370. The corresponding burned box/label is absent at 230, 302 and 371, and remains absent at the additional sampled 231/372 frames. All three full evidence anchors show the intended distinct cracks with consistent IDs. Defect 02's requested analysis end frame 308 is not a retained visibility promise: its track stops at 301 when reliable flow is lost. No stale tail was observed in these samples. This audit did not visually inspect every frame and does not certify complete defect detection.

The original MOV hashes to `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a` (16,661,803 bytes); normalized source MP4 to `52b364f88dd42f66fe924f2d5a25ef6cf642a8ce272790bc315ee78427831ff6` (12,051,199 bytes). Both are unchanged from D1. Corrected annotated MP4 is `02405bd903771025474d4c8000093d9508591dcf7e15824dd5742c3f936ad2cf` (10,324,679 bytes). Both MP4s decode 419 frames at 30 fps. Canonical measurements remain empty, individual map placements null and route impact explicitly unknown.

## UI source review

Reviewed `SurveyWorkspace.tsx`, `FindingReview.tsx`, `PlanCompare.tsx`, `VideoEvidence.tsx`, `SiteContext.tsx`, `ExportPanel.tsx`, `presentation.ts` and the relevant helper tests. These are code observations, not browser claims.

- A manual decision or corrected finding requires a reviewer. A work-area priority change also requires an access rationale, which records the reviewer. The helper returns a new survey, preserves the original, and does not change immutable evidence, finding classification or route status. Near-term selection remains a separate flag, visible next to the edited priority.
- Plan derivation uses the current validated survey. Rejected findings stay in the review record, leave live overlays and are excluded from repair eligibility. A grouped area can still be eligible through another active finding; selection messaging refers to the work area, not an invented per-finding repair. The independent grouped-area tests cover that distinction.
- Selected evidence passes its time to the video component and its work-area ID to plan highlighting. Plan choice is a separate report selection; an unavailable budget choice falls back to Balanced. Exact-cent validation prevents malformed budget text from becoming an optimizer input. Runtime seek behavior still requires a real browser check.
- Each chosen treatment exposes its conditional suitability, source date/scope, quantity assumptions and exclusions. Quote-required components remain separate from the known subtotal; deferred needs and measurement checks stay visible. No UI source path turns unknown dimensions or route impact into a compliance or reachability verdict.
- All current findings remain unplaced on the approximate local context map. Reviewing a finding does not invent a map position. The pre-rendered annotated video explicitly stays the original analysis after manual edits; JSON/PDF are presented as the reviewed artifacts. Restore returns the original analysis; budget input is a separate control and should be cleared separately for a fresh rehearsal.
- PDF generation is wired to an explicit click with the current survey/plan/budget, a timeout and PDF content-type validation. Actual server validation, artifact parity and error rendering require the real integrated modules. This audit used no substitute service or export harness.

## Remaining release gates and ownership

Root owns all product corrections and integration. Before final acceptance, publish the expanded inventory, then independently verify its source/track/close-up correspondence, distinct work areas, treatment capacity, optimizer results and revised demo claims. Run the real combined build and HTTP/PDF/CSV/JSON/browser flow, including manual rejection and priority changes, video switches/backward seeks, keyboard/mobile use and original restoration. Confirm unknown costs and access measurements remain explicit throughout.

Preserve [ROBERTSON_REVIEW.md](ROBERTSON_REVIEW.md) as D1's pinned history. No changes to that report or its now root-owned tests are included here. No deployment, spending, main integration or final R2/standalone replay acceptance is implied. A later explicitly assigned combined-source audit must identify its own full source SHA and actual checks separately.
