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

## Final audit-driven corrections and Chrome pass

The full hosted baseline audits are integrated in [HOSTED_BACKEND_AUDIT](HOSTED_BACKEND_AUDIT.md) and [HOSTED_UI_AUDIT](HOSTED_UI_AUDIT.md). Their limits remain explicit; neither reported a broken primary flow or P1/P2. B's independent [backend regression](HARDENING_BACKEND_REGRESSION.md) passed 233 focused tests and 41 local checks on Node 24.12.0, including compiled exact/over-limit report bodies, recovery after failures, duplicate selectors and rejection of unknown release identity. C's [collection regression](HARDENING_UI_REGRESSION.md) verified actual desktop/mobile focus rescue, context-loss recovery and quiet NVDA autoplay on 0cd2cd4.

Root 67bf3b5 addressed HUA-01 by keeping the first review announcement region mounted and atomic; enlarged the reported links, buttons and summaries; gave the static replay overlay a distinct name; and added bounded keyboard/button panning to the zoomed legacy schematic. TypeScript, 748 tests and a production build passed on 9ef771b, as did all 14 replay tests. The initial sandboxed replay-server run could not bind loopback (EPERM); the authorized rerun passed 14/14. Both Node 22.23.0 and 26.x [CI jobs](https://github.com/oliverchennn/Curb/actions/runs/43649793155) passed the complete check and both compiled verification scripts.

Root used **Chrome** for the actual browser pass (the user selected Chrome; Safari was opened but no app flow was tested there):

- Native video Play and Pause were clicked directly: playback advanced to 10.7773 s and paused. The native scrubber's End key reached 13.966667 s. Selecting Defect 05 sought 13.933333 s with its visible final-frame box and evidence card. First Accept and Restore worked; the initially empty status region remained present. Root checked DOM/live-region behavior, not spoken NVDA output.
- All seven plans evidence buttons selected their matching repair and focused the evidence section. At 390 px, both page links, all evidence buttons and the assumptions summary measured 44px tall. Explorer Previous/Next measured 44×44px. Document width 375 px within the 390 px viewport showed no horizontal overflow.
- The legacy map reached 3×, disabled further zoom, moved in all four directions, clamped repeated keyboard panning, and Home restored the original coordinates exactly. Every map control measured at least 44×44px at 390 px.
- The static replay's second workflow step activated. All three repair controls retained the expected outcomes: Library 330 m → 240 m / 90 m saved for the crack, or two newly reachable destinations at 260 m and 275 m for the slab. The native range reached 21 s. The first sizing pass caught a specific repair-button CSS rule overriding the generic minimum; root 81e46f2 corrected it.
- On the freshly built **a21ffdb76d15350a807abc766003bdf36139e4d2** product, all three repair controls measured 44px tall at 390 px. Root 0c927f8 fixed HR-01; actual Play/Pause at 1.13 s yielded the status text “Paused at 1 second. 0 of 3 illustrative captures.”. Collection camera selection and capture seeking still worked. No console warnings/errors were recorded. Viewport overrides were reset.
- The exact a21ffdb compiled server passed all 12 release checks and all 31 bounded API checks (zero failures) at 22:52:48–49 UTC on 2026-11-14. HTML/PDF retained all five exact photos, and all three media ranges passed. This is local evidence; the final public release must still be independently identified and checked after deployment.

C's final first-decision NVDA and map/target delta report is now integrated; see the closure below. Physical touch/projector checks, native zoom on this final candidate, other browser engines/readers, measured inspection and contractor quotes are not claimed. Historical backup media retain their original source metadata; these UI changes do not rewrite that recorded presentation.

Final local evidence hashes:
- `chrome-final-evidence.png`: `b9a1365aec0780e096a8251602327ed0c042770d612322a0b27c27e4cd6994fe`
- `chrome-mobile-map.png`: `3a284af1f061f5e589dca6b4f7320d9cbff67ebb73886cc415626da57e60c2c2`
- `chrome-mobile-replay.png`: `eeaca1939d70a4c1ff741990ea9386256b0d9f4d2fc2fc289a01d68404248b74`
- `chrome-final-collection.png`: `7ca0b9b647d3a53f34546d3d4a7eaad9156b47110e21477b514d27fae2f2c0aa`
- `final-local-flow.json`: `9b6feeb82a93407496e05dfd4972e8f26e62e9e17282c3c764598fbe8ae6893c`
- `final-local-api.json`: `d9185951e5bd09221e8b74ab5e1f98e11c56cc18fac41eb9a87346f10406cf14`

## Final keyboard closure

C released [FINAL_UI_DELTA.md](FINAL_UI_DELTA.md) at 0816330, integrated as 2fb49f7. Its actual NVDA first Accept, first Reject and later Restore checks passed. FUD-01 identified focus loss when native disabled map buttons reached a limit; root 056e1cc changes them to guarded aria-disabled buttons and keeps a visible focus outline. The scenario Reset now has a 44px minimum. Earlier repair-target and grammar findings were already fixed after C's pinned base.

On the freshly compiled 2fb49f7 product, root used real Chrome Enter events repeatedly on Zoom in and Pan left until each limit: focus remained on the correct button, aria-disabled became true, further actions did not move the geometry, and the outline remained 3px. At 390px, Pan right still worked and both Reset controls measured 44px tall; document width was 375px. Viewport overrides were reset. `npm run check` passed all 748 tests, TypeScript and the production build. Receipt: `.curb-local/hardening/final-focus-check.txt`; actual screenshot: `chrome-final-map-focus.png`. Root did not claim spoken NVDA verification of this last focus correction.

The user then requested a richer rover/camera experience and a collaborative explorer redesign. Those newly assigned scopes do not invalidate this hardening acceptance; their product work requires its own integration and verification before the next feature release.
