# Robertson Hall integration evidence

Root owns this record. It records observed checks, not a blanket acceptance of a branch.

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
