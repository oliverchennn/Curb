# Production hardening: root verification

Application source checked: **5a2d83d9539c4b311c9a850c88d1d421686d88bd**, local compiled production server at `http://127.0.0.1:3004`. Recorded 2026-11-14T22:16:03.461931+00:00. This is candidate evidence, not a claim that the public b010ad0 release already contains these corrections.

## Corrections and checks

- Plan/trip requests previously accepted a 262,144-byte padded valid selection. They now share the report reader, with a 16 KiB selection limit and actual streamed byte counting. Existing report 2 MiB and typed 400/413 behavior remain intact. Tests cover misleading lengths, the exact byte boundary, cancellation that never acknowledges, invalid headers, stream failure and invalid/split UTF-8. No public large-body probes were used.
- Empty or whitespace VERCEL_GIT_COMMIT_SHA now falls back to nonempty APP_REVISION. A hosted deployment lacking both says unknown. Seven environment regressions cover these cases. Direct deployments must supply their full source SHA at build and runtime.
- The integrated baseline passed TypeScript, 744 Vitest tests in 28 files and a production build. After the final focus refinement, a fresh build with the full candidate SHA passed. The standalone deployment script also passed its own explicit TypeScript check (including Node types).
- The compiled local server passed 12 sequential verification requests: four pages, health/readiness with exact revision, canonical survey, HTML/PDF with all five exact evidence images, and three 32-byte media 206 responses. A separate eight-request local boundary check exercised both plan/trip endpoints: exact 16 KiB → 200, one extra byte → 400, wrong Content-Type → 400 and malformed JSON → 400; all matched their response schemas and no-store headers.

- Vincent’s baseline audit identified repeated foundation dataset selectors silently choosing the first value. Candidate 0cd2cd4 preserves all occurrences for schema rejection, retaining typed DATASET_NOT_FOUND/404. Four regressions cover opposing orders, duplicate identical values and an encoded duplicate key; all 13 foundation endpoint tests and TypeScript passed.

## Actual browser checks

Root used the desktop app's browser on the compiled server. These are real UI interactions; no application-state or DOM mutation was injected.

- 1366×768: scene loaded WebGL; timer has role timer and aria-live off; all three callouts have separated, explicit camera names. Pause, capture seek and keyboard backward scrub worked. Seeking 12 s then ArrowLeft produced 11.9 s and reverted Surface detail to Upcoming with one captured record.
- Follow/Side view controls and mouse orbit changed camera visibility. A normal mouse drag moves focus away from the callout before orbit, so that interaction alone is not evidence of automatic focus rescue.
- For the actual rescue test, selected Overhead at 0 s, started 2× playback, then keyboard-activated the visible Forward camera callout. As the robot crossed the scene, the callout became hidden; focus transferred to the matching stable Forward sidebar button. At 24 s, the inspected active element remained that button, the callout was hidden, and all three captures were complete. The frame-owned callback replaces the broad per-style MutationObserver and delayed focusout timer.
- 390×844: Static diagram removed the canvas; keyboard capture selection and Side/curb sensor selection updated 12 s, two captures and the correct sensor explanation. All three capture cards retained visible Captured/Upcoming words; document width 375 px within a 390 px viewport, with no horizontal overflow.
- Returned to 1366 px, remounted 3D, reset the view and keyboard-selected its Side/curb callout. No browser console warnings/errors were recorded. Temporary viewport overrides were reset.

Landau's NVDA result in COLLECTION_ACCESSIBILITY_POLISH.md covers Landau's original polish bytes. Root did not run NVDA on this modified candidate; the independent hosted audit and subsequent targeted follow-up remain separate gates. Root did not force a graphics-context loss during this browser run.

## Reproducible CI and integration

The new Verify Curb workflow at 3fc5d08 runs on pull requests and main pushes, with read-only repository permissions and commit-pinned official actions. It tests Node 22.23.0 (supported floor) and 26.x (actual hosted runtime), then the compiled 12-request flow with an expected source SHA. This workflow does not deploy. Both jobs in [run 43647012303](https://github.com/oliverchennn/Curb/actions/runs/43647012303) completed successfully on source 3fc5d085dc532968b51fe4325eca2abeea43bf5c: install, typecheck/tests/build, synthetic replay tests, and all compiled API/report/media checks. The PR workflow builds its generated merge commit; the verifier confirmed that exact build revision.

Root is the sole merger. The deployed version remains pinned while B/C audit it. Active audit branches are retained; completed histories are archived before removal. The original release branch is already preserved at its exact remote archive tag, and local main/tracking refs have been reconciled.

## Local proof files

These artifacts remain under ignored `.curb-local/hardening/`; hashes bind the receipts to the inspected files.

- `collection-desktop.png`: `4f0202ee82aacbe6efb3888b24651ba430b272e93134289c8921722ef01b0327`
- `collection-mobile.png`: `da68017d1702fc61fb166931c0a7646f971c7340732611da1edf34b0723f3e58`
- `focus-transfer.png`: `bb5d14044327ed8b4743a203e6704009c8f22a6159f63c75c25109ff72086929`
- `deployment-local.json`: `53109f9c3b84b6d0c307be2db1f4e6b57219bad40c01348ec25ab491febb27a4`
- `compiled-body-checks.json`: `a8cfac6cb6628ccf9c8d86202ab6b130365b2c6aedc24b3769837caf0edf72b4`
