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
