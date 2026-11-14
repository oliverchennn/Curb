# Robertson Hall integration evidence

Root owns this record. It records observed checks, not a blanket acceptance of a branch.

## Current checkpoint — 2026-11-14

The implementation gates are complete. [PR #5](https://github.com/oliverchennn/Curb/pull/5) merged to main as `3bcc6f63e49eae883a428c505421851db0125718`; root fetched main and verified its tree equals reviewed head `a6f9a20c12d67d616fb24709a409097b2a29fabd`. The sections below preserve earlier checkpoints and their then-open gates; later evidence supersedes those statuses. Five findings, accessible HTML/PDF/CSV/JSON exports, the bounded budget evaluator and corrected annotated media are integrated. No deployment or field acceptance is implied.

D's final gate at `117175a34f3e8ae8dec87ffe80b131453a3b6771` is integrated from `650640933d744f72668abf5f1bd0e5db29602838`. D found no new P0–P2 blocker and identified D6-01, a direct-API priority attribution gap. Root corrected it in `1ea205d6630eee001e4f827c456cf828567ec9ea`: changed priority/rationale requires the workspace's named, nonblank review format. A priority change cannot reuse its unchanged published rationale. This remains self-reported attribution, not authentication. Root's 104 targeted tests and typecheck passed. D independently closed D6-01 in [6878950138](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6878950138), exercising 16 unmocked HTML/PDF handler cases: unsigned/malformed attribution returned 400, unchanged data and a valid Unicode review returned 200, and the canonical data hash stayed unchanged. The full combined check follows B/C integration; the earlier 674-test run is not claimed for later code.

Root also exercised the actual production `/curb/plans` page: at $2 both policies newly reach 0 destinations; at $4 condition-first reaches 1 and the best combination reaches 2; at $8 both reach 3. Input 1.005 is rejected as fractional cents, without rounding. The selected evidence reads “Synthetic example” and “Observed”; these outcomes remain separate from Robertson Hall's unknown traversal. A screenshot is retained at `.curb-local/release/screenshots/r2-comparison-verified.jpg`.

C's released overlay correction `86cfb2a91d17b787ac22271ac90cb4278b21df92` is integrated as `1dbb59f1ce87c675299973ea3a359f3844254d48`. The combined application passed **676 tests / 23 files, TypeScript and production build**. The refreshed production server passed the real HTTP/export verifier and **14 standalone replay tests**. Root checked every finding's evidence seek, backward selection, mode switching and the final paused crack at actual 1440×900; the three labels at 9.5 seconds have zero box/label overlap. C's independent all-frame sweeps at 1920×1080, 1366×768 and 390×844 account for 724 labels per size with no overlap or overflow. Root's viewport override did not change its measured viewport, so those three sizes are C's evidence, not root reruns.

B's portable verifier/runbook `690bc4ffb0abca0290334444821d8b8d19c8d675` is integrated as `06e0b32`. Root aligned its allowed-review check with the later D6-01 attribution correction, then passed standalone strict TypeScript checking (`--ignoreConfig --types node`). With the production server stopped, it verified the actual 15 saved files, five photo identities in each PDF/HTML, and 12/13/12 report pages. Seven separately copied bundles failed with the intended nonzero diagnostics: missing photo, wrong ID, wrong PDF amount, corrupt CSV, active HTML, stale request and unsigned priority edit. The original 15 hashes stayed unchanged and the original passed again. The verifier has no network calls; this is not a claim that physical Wi-Fi was disabled. No application source changed after the 676-test/build checkpoint.

The final committed backup is `public/curb/surveys/robertson-hall/demo-backup.mp4`: 120 seconds, 1600×1100 H.264, 30fps, 3,600 decoded frames, SHA-256 `fb30922f4e31f42165447230ede7955607eb152c426b1fb2cf3a64730546c20b`. Root visually checked all eight segment snapshots. It includes actual captured app states, the complete annotated clip and a report page; it is not a continuous live recording. The first capture is refreshed for C's final labels. The other unchanged views retain their actual earlier captures. The presenter still needs a live timed rehearsal; physical projector and manual assistive-technology testing remain unclaimed.

## Media and tracking review

The original MOV remains byte-identical to Oliver's upload: SHA-256 `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a`. Both MP4s decode 419 frames at 30 fps, 720 × 1280, with BT.709 primaries/transfer/matrix. No measured dimensions or individual map placements have been added.

On 2026-11-14 root's AI visual review inspected every full-frame thumbnail (419 frames across seven sheets), all 336 original tracked-frame crops across seven larger sheets, the three full-resolution evidence anchors and full-resolution exit regions. The three tracks stay on distinct irregular cracks, rather than assigning IDs to normal straight control joints. No raised slab classification is supported. This is AI review, not human field acceptance or a complete inspection of every visible pavement condition.

That full-clip review found stale box tails after the crack itself had exited: Defect 01 frames 230–231 and Defect 03 frame 371. Their end frames are now 229 and 370. Defect 02 ends at 301 after forward/backward flow loses reliable texture near the image edge. The corrected manifest and burned video use the same retained tracks: 125, 107 and 101 visible frames. Evidence frames remain 210 / 285 / 360 (7 / 9.5 / 12 seconds). Source playback and close-ups are unchanged. The corrected annotated MP4 SHA-256 is `02405bd903771025474d4c8000093d9508591dcf7e15824dd5742c3f936ad2cf`.

Scratch review sheets and media verification receipts are retained locally under `.curb-local/`, not committed. Reproduction inputs, normalized media, anchors and every retained box are committed. `node --import tsx scripts/curb/verify_assets.ts` passes after regeneration.

## Independent review and corrections

D's pinned review at `ae583471dcdd60455ccf1746e3a13459fe03bcac` is preserved in `ROBERTSON_REVIEW.md`. Its recursive area-choice oracle independently compares the bounded optimizer's outcomes; it is structurally different from the production bitmask implementation.

- D1-01: the survey validator formerly accepted a nearby frame when the exact evidence frame was missing. Corrected in `3062e8637e5bb91f33d0e4b135cbfc60761b22e1`; the independent expected-failure marker is now a normal regression assertion.
- Root follow-up: inspection-only catalog options no longer earn repair coverage or remove unmet needs. Those work areas stay deferred and measurement checks remain visible. The independent oracle and a dedicated inspection-only case verify this semantic rule.
- Source URLs are restricted to HTTP(S). No source URL is fetched during report generation.
- A priority edit requires a reviewer and an access rationale. It changes the work-area priority, not the visual finding's classification or route passability.

After these corrections, 63 targeted contract/domain/presentation/independent tests pass. Full integration checks remain pending the API/report lane.

## Browser observations so far

The actual legacy sample replay at `/survey-replay/index.html` produces the expected three graph states on click:

| State | Library | Clinic | Pharmacy | Newly reachable | Distance saved |
| --- | --- | --- | --- | --- | --- |
| Current conditions | 330 m | Blocked | Blocked | 0 | 0 m |
| Repair surface crack | 240 m | Blocked | Blocked | 0 | 90 m |
| Repair raised slab | 330 m | 260 m | 275 m | 2 | 0 m |

Returning to Current conditions restores the baseline. This is explicitly synthetic geography and hypothetical repair, separate from Robertson Hall's unknown route impact.

The locally rendered OSM context SVG was inspected in the browser. It labels Robertson Hall, nearby streets/buildings, the approximate clip GPS, attribution and unverified path access. No per-defect pin is invented.

The complete survey page, real HTTP exports, final keyboard/responsive flow, offline operation and production build still require integrated verification. C's earlier UI harness used stand-ins and is not evidence of the real API/PDF flow.

## Revision 2 — user-identified omissions

The user supplied screenshots of the connected cracked/deteriorated area and the terminal transverse crack missing from the initial inventory. The first three-finding coverage is superseded. Revision 2 retains IDs 01–03 and adds Defect 04 (surface breakup, evidence at 6 s) and Defect 05 (final transverse crack, evidence at frame 418 / 13.933333 s). This correction is not a claim of complete automated detection.

Defect 04 uses explicit visual correction anchors over LK optical flow to address perspective drift, retains frames 0–301, and stops when only an unreliable edge sliver remains. Defect 05 retains frames 330–418. Root checked contact frames across the clip, full-resolution anchors and the right-edge exit sequence. Independent review of the expanded tracks remains pending. The corrected annotated MP4 has 419 frames and SHA-256 `8e31dfab044cfa10788715f83368a75bbe5aa00f124f755d98ef118007ac1d59`; source and normalized media are unchanged. The browser seek clamp now allows the final evidence frame.

The connected damage is grouped as one work area, without crack sealing as an eligible treatment. Fourteen conditional options across five areas fit the revised 18-option / 4,096-compatible-scope bound. Actual domain results: Essential $294–$2,294 plus shared quote; Balanced $216–$1,434 plus two localized-repair quotes and shared quote; Durable $600–$4,906 plus shared quote/exclusions. These are partial benchmarks using assumptions, not measured quantities or contractor quotes.

Observed before integration of B's released API/report source: 56 targeted contract/domain/independent tests passed; the media verifier passed for all five findings and both BT.709, 419-frame MP4s. Final UI/report/offline/build acceptance is still a separate gate.

## Combined API and browser checkpoint

B's released API/report implementation `5aab3c0177684350a26b801fd6f441d86b8d0b88` and pinned QA `14aec0a61322c4304c2280e806dd84ba63349a71` are integrated at `adbbf25b9696519b12403ba626da9703b57cd2e1`. Actual `npm run check` passed TypeScript, 587 tests / 22 files and the production build. Real loopback HTTP checks passed validated GET, strict 400/404 errors, three PDF requests, malformed/untrusted/oversized report rejection and media byte-range seeking. The default, budget and edited PDFs each contain all five photos and evidence IDs across 12 pages. Root rendered and visually inspected all 12 default pages; no clipping/blank pages was observed. Expanded independent B export QA remains separate.

In the actual browser at 1440×900, all five inventory clicks sought to their evidence (7, 9.5, 12, 6, 13.933333 seconds); backward seeking updated overlays and switching video variants preserved time. Keyboard Enter selected the evidence with a visible focus ring. A subsequent root correction clamps the ended playback time to the last displayed frame. This was verified live at `ended=true`, `currentTime=13.966667`: the Defect 05 overlay remains visible. The header provenance now uses a disclosure; duplicate quote descriptions include their work-area/treatment identity. Final C styles, responsive/offline rehearsal and expanded D review are still pending.

## Integrated review corrections and local-only rehearsal

C's released CSS `09e32f457951ef0d717ef253bf36367f5710d7f8` is integrated. Root refined its layout after measuring the real stage: compact header/provenance, map and finding inventory beside each other, shorter version-button text with unchanged accessible names, smaller thin boxes and labels positioned within the video at top/right edges. The decorative backdrop is confined to the workspace so it cannot cover the global navigation or introduce narrow-screen overflow. At 390px the document width and scroll width are both 375px (scrollbar excluded), with no overflowing main elements. At 1366×768 the full video and five finding controls are visible; all stage content fits on one screen after scrolling the page header out of view. The map remains context, not a verified accessible route. Native keyboard selection retains visible focus. Physical projector and manual screen-reader testing are not claimed.

D reviewed all 391 newly retained track frames without reproducing identity switches, duplicate findings or normal-joint substitution. D4-01 is corrected by removing the burned-video header and placing each label outside every retained evidence box and previously placed label; rendering fails instead of accepting a collision. All 419 frames rendered. Source/track geometry and all evidence close-ups remain unchanged. Current annotated SHA-256: `e3dd5a6058a8d809abc2d93037f3021a7c0686da378cde140e321adb73415173`. Poster now shows frame 0 (SHA-256 `2c7333a1d61a208246bb04aed65bd49347fb0c36b9c108b378e15498e819bedc`). Root visually checked early/anchor/last frames and the media verifier passed. D4-02 is corrected in the visible "About the tracks" disclosure: missing boxes do not establish physical absence. Independent correction acceptance remains pending.

A disposable loopback proxy applied a same-origin-only resource policy to the actual production build at adbbf25. Real playback, map, $500 computation and a browser PDF download succeeded. Injected report500 produced an actionable error; injected GET500 produced Retry, and restoring the real endpoint then clicking Retry loaded five findings. This verifies external-resource independence with local networking retained, not a physical Wi-Fi toggle. The proxy and fault controls are ignored scratch; no production policy is changed.

B independently verified all 36 pages of the expanded default/budget/edited reports and exact five image hashes. B/C review findings are preserved in their pinned reports. B now owns accessible HTML report and keyboard-safe export remediation under assignment6877959673; root has released those exact files. Root's label/compact-stage changes address C QA-01/02; mobile toggles now target44px. B handles report priority wording, raw-ID presentation and error punctuation. The tagged-PDF/Unicode limitations will be disclosed with the HTML alternative, not presented as certification.

## Accessible exports and final rehearsal

B released `da70021ff71737c2095d758d3723f31d697ba6f2`; root reviewed all five changed files and integrated them at `eb07a83b4097aaa2c45a7583dad3715e58cd49db`. Actual integrated TypeScript, 596 tests / 22 files and production build passed. Real loopback HTTP checks generated restored, budget and edited PDF **and HTML** reports, with all five evidence photos/IDs, strict request errors and seekable media. HTML is self-contained and has headings, navigation, image alternatives and original Unicode; PDF remains untagged. B reported actual keyboard focus, duplicate-request, offline-file and visual PDF verification on its exact released source, independently of root's integration checks. No manual screen-reader compatibility or PDF/UA certification is claimed.

Root corrected the legacy evidence panel's empty message to work across its callers; the `observedAt` field now reads "Observed", with "Unknown" for a missing value. This does not implement the separate historical Nassau R3 proposal. That documentation-only proposal remains unselected for implementation; its old idle/handoff text is not current team status.

Root's workflow links now position headings below the sticky navigation (actual browser heading top84px), and a concise live budget result sits beside the controls with a link to included/deferred work. These presentation changes do not alter planning results. A second integrated check after this change also passed596 tests and production build. B's next adversarial assignment is pinned to eb07a83; C and D correction reviews remain pinned to f960df5. Exact assignments/ACKs and subsequent acceptance are recorded on the board.


## Independent pre-merge checkpoint

B's released adversarial matrix `3ddf231f6f565dadede98129a6282669dd289865` and C/D correction reviews `0f0fcf51d3cd5e7353790eafecfad27be4f70589` / `e625e6fb57d44d60c5684f9a3334915e6f71c33a` are integrated. The combined source passed TypeScript,674 tests/23 files and production build; exact published follow-up base is117175a34f3e8ae8dec87ffe80b131453a3b6771. The real HTTP verifier now saves corresponding request, JSON, CSV, HTML and PDF inputs for default/budget/edited variants. Root inspected all37 pages of its current12/13/12-page PDF variants; B's different edited specimen has13 pages. Neither count is substituted for the other.

D independently closed the annotated-media occlusion and missing-track-copy findings, with724 encoded label instances accounted for and no evidence overlap; root aligned the remaining implementation-document phrase. C closed the squeezed labels, excessive stage height and small mobile controls, while identifying four small final live-overlay improvements. C owns those two product files under6878700641; root does not edit them during the task. B owns a saved-bundle verifier and portable runbook under the same assignment; D is independently assessing the release gate under6878746888. Root handles all integration and PR/main merges.

The initial offline walkthrough was rendered and decoded as1600×1100 H.264,30fps,3600frames,120.000 seconds. Eight segment snapshots were visually inspected; actual UI states, the full annotated clip and a rendered report page are used. It is an edited fallback, not a claim of a continuous live timed rehearsal. The final first capture will be refreshed after C's overlay update. Root's actual HTML download succeeded and retained button focus, but the browser download-wait tool exceeded its requested timeout; subsequent downloads use the real HTTP verifier. The in-app browser blocks local-file navigation. No workaround was used; independent offline HTML browser evidence is B's, while root verifies files structurally and PDFs visually.
