# Robertson five-finding media and planner review

Developer D, existing cloud session `6af808fa-83dc-8191-bd58-80697dbe50c9`, reviewed published source **`adbbf25b9696519b12403ba626da9703b57cd2e1`** on 2026-11-14. Assignment [6877786855](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877786855), ACK [6877806264](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877806264). Branch `codex/robertson-five-media-review`; isolated checkout `/workspace/curb-robertson-five-media-review`. This report is the sole tracked change. Product, tests, scripts and media were read-only; no children or preview server were started.

The retained source tracks and bounded planner passed the checks below. **The pinned annotated video needs a correction:** its opaque header hides real surface-breakup evidence. A second finding concerns wording that equates missing track keys with physical absence. Neither passing tests nor this AI visual review establishes complete field coverage, measured dimensions, ADA compliance or a usable route.

## Concrete findings

**D4-01 — P2, annotated-video header obscures evidence.** At normalized frame 0, Defect 04 occupies approximately `[447.686, 0, 136.339, 35.740]` pixels. The source visibly contains the damaged surface; the annotated video replaces those pixels with a green title bar and draws the finding box over it. Frame 39 also has evidence hidden by the title/label layout. The entire tracked box lies in the 80-pixel title region for frames 0–24; intersection continues through frame 66. This interval calculation uses all retained boxes; the source/annotated visual reproduction used frames 0 and 39.

Cause at the pinned source: `scripts/curb/process_video.py:141` draws the opaque title rectangle, and lines 151–153 clamp an opaque label to `y >= 82` without avoiding evidence. Move title and labels outside visible evidence, preserve source/track geometry, and inspect the regenerated artifact. Removing truthful keys to accommodate a banner would not fix the rendering defect. Reported in [6877860263](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877860263); root accepted remediation in [6877917478](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877917478). That acknowledgement is not verification of a new render. **Open on the pinned source.**

**D4-02 — P3, missing-track wording overstates visibility.** `src/features/curb/survey/VideoEvidence.tsx` says “a box disappears where the finding is not visible.” The final crack is still visible around vertical pixel 320 at frame 329, immediately before its retained track begins at 330. A narrow fragment of Defect 04 also remains at the right edge at frame 302, after its track ends at 301. Full source and annotated boundary frames were inspected. Missing keys identify tracking/review coverage, not proof of physical absence. Suggested copy: “Boxes appear only on retained tracked frames; missing boxes do not establish that a defect is absent.” Do not extrapolate tracks to satisfy the old copy. Reported in [6877926092](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877926092). **Open on the pinned source.**

## Visual coverage and data agreement

Both videos were decoded independently with FFmpeg into 419 JPEG frames each. Every retained frame for the two additions was inspected in 50 crop sheets: 540 × 360 tiles, eight frames per sheet, source pixels with the manifest rectangle drawn independently and surrounding context retained. Small crops stayed at native resolution; larger crops were reduced only to fit the tile. This is **391 individual source crops**, not a sparse contact-sheet sample:

| Finding | Retained frames, inclusive | Inspected crops | Anchor |
| --- | --- | ---: | --- |
| Defect 04, surface breakup | 0–301 | 302 | 180 / 6 seconds |
| Defect 05, final transverse crack | 330–418 | 89 | 418 / 13.933333 seconds |

Additional full 720 × 1280 source views included frames 0, 180, 301, 302, 329, 330 and 418. Full annotated comparisons included 0, 39, 180, 301, 302, 329, 330 and 418. These comparisons exercise first-frame evidence, the right-edge exit, the final crack's entry, coexistence with Defect 03, and the recording's last decoded frame. The original three tracks were not subjected to a new all-frame visual review here; their earlier pinned review remains separate.

The Defect 04 crop sequence follows the same connected irregular cracking/broken-edge region to the right of the walking strip. Its footprint shrinks at the right image edge near the cutoff; motion blur and clipping limit interpretation there. The final crack remains on a different physical panel from Defect 03, visible simultaneously in frame 330, and has an irregular edge unlike the adjacent straight control joints. Neither added track switched to another finding or to an intact control joint in the inspected retained frames. These qualitative observations do not establish depth, stability, measured repair area or a raised slab.

Programmatic comparison found all five IDs, labels, evidence anchors and manifest tracks consistent with the analysis/tracking files. All retained tracks are contiguous. Existing 01–03 track arrays are unchanged from `c46ecc2b5434ed91c5d6e2976a8d0b389704e1bc`; their retained spans remain 105–229, 195–301 and 270–370. Defect 02's declared analysis end is 308, but its diagnostic records failed forward/backward flow at 301 and its actual retained track ends there. The renderer and manifest use those retained keys. Every authored correction anchor for Defect 04 matched the normalized box within 0.001 pixel. No missing frame was interpolated by the checked lookup.

All findings still have empty measurements and null defect map positions. Standards checks remain `needs_measurement` or `not_assessed`; route impact remains explicitly unknown. Source/capture/retrieval metadata and the context map do not provide a field assessment. Fixed annotations remain the original analysis, independent of subsequent review edits.

## Independent planner check

Ignored review script `check_planner.ts` exhausts treatment subsets using arithmetic bit masks, rejects conflicting work-area choices, and independently ranks eligible plans. This differs from the production evaluator's iterative expansion by work area. The reference computes outward-rounded costs, once-only shared charges, priority counts, durability, upper-bound affordability and lexical tie-breaking without calling the production selector or cost helper.

**474 plan comparisons across 39 cases passed.** Coverage included every canonical affordability boundary at ±1 cent; all 32 rejection masks; edited priorities and reversed input order; fractional known costs plus an unknown shared cost; grouping the new finding with rejected earlier evidence; and an inspection-only new area remaining unresolved. Compared fields included selected options/areas, known totals, unpriced counts, completeness, budget fit, coverage, durability, deferred areas, rejected IDs and unchanged route assessment. Inputs remained unchanged.

Boundary cases accepted 18 repair options distributed over six areas with exactly 4,096 compatible scopes, and 12 one-choice areas with 4,096 scopes. A thirteenth repair option yielding 6,144 scopes was rejected despite being below the option-count cap. Six inspection entries alongside 12 repair entries remained within 18 entries and 4,096 repair scopes; a nineteenth entry was rejected. The canonical nine priced repair choices generate 162 compatible scopes including the empty selection. There was no oracle mismatch.

An additional **2,100 exact-frame lookups** checked all five findings at every integer frame from 419 down to 0, including each missing/present boundary. Frame 418 resolves Defect 05; frame 419 is outside the retained video and resolves no box.

| Policy | Selected treatments | Known subtotal | Still unpriced |
| --- | --- | --- | --- |
| Essential | Seal 01/02; replace 04 | $294–$2,294 | One shared site/setup/access quote |
| Balanced | Seal 01/03/05; patch 02/04 | $216–$1,434 | Two separate patch quotes and one shared quote |
| Durable | Replace all five areas | $600–$4,906 | One shared site/setup/access quote |

All three are partial estimates. Defect 04 has no sealing option; its assumed replacement quantity is 2–6 square yards. Other replacements assume 1.5–4 square yards and sealing assumes 4–8 linear feet. None is a quantity measured from this footage. The retained 2021 sealing and 2026 sidewalk bid benchmarks are historical source context, not current campus small-job quotes; their primary-source check is documented in D1. This task did not obtain new contractor prices.

## Actual checks and artifact identity

Executed with Node 24.22.1/npm 11.9.0 in the isolated pinned checkout:

- `npm ci --no-audit --no-fund`: succeeded after an initial sandbox `esbuild` child-process `EPERM` was resolved by an approved retry; 75 packages installed.
- `npm test -- src/contracts/curb/survey.test.ts src/domain/curb/survey.test.ts src/features/curb/survey/presentation.test.ts tests/integration/robertson/independent.test.ts`: **65 tests passed, four files**, 2026-11-14 13:15:19 UTC.
- `npm run typecheck`: **passed**. The missing B imports recorded by D3 at its older source are present at this pinned source.
- `node --import tsx scripts/curb/verify_assets.ts`: **passed**; five findings, 419 frames, committed hashes, media geometry/color metadata, retained-track agreement and evidence anchors checked.
- `node --import tsx .curb-local/robertson-five-media-review/check_planner.ts`: **passed**, 474 independent comparisons and 2,100 frame lookups as described above.
- Independent Python assertions for labels/tracks/anchors, old track preservation and unknown measurement/location fields: **passed**.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Original `source/IMG_0699.MOV` | 16,661,803 | `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a` |
| Normalized `survey.mp4` | 12,051,199 | `52b364f88dd42f66fe924f2d5a25ef6cf642a8ce272790bc315ee78427831ff6` |
| Pinned `annotated.mp4` | 10,385,255 | `8e31dfab044cfa10788715f83368a75bbe5aa00f124f755d98ef118007ac1d59` |

Receipts and images remain local under `.curb-local/robertson-five-media-review/`: `targeted.log`, `typecheck.log`, `assets.json`, `planner-result.json`, `structure-result.json`, source/annotated frame directories, `sheets.json`, and the 50 `defect-04-*` / `defect-05-*` sheets. They are not published artifacts. No full build, API/PDF export acceptance, browser flow or deployment was performed by D for this task. B and C own their independent export/UI reviews; worker-reported results are not substituted for these checks.

## Separately reviewed later source

At root's explicit request in [6877840558](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877840558), fetched and source-reviewed **`85a3e0c917be346d9f3304fabe64b36ab9ded85b`** without changing this checkout's base. Its product delta adds work-area/treatment identity to unpriced descriptions, clamps native-time synchronization to the last decoded frame, and collapses provenance into a disclosure while removing duplicate navigation. Contract, input data, media and pricing are unchanged.

Exact domain/contract files exported from that commit to ignored scratch passed **27 plan comparisons** against the pinned implementation at seven budget inputs; all non-description fields matched and the balanced plan's three unpriced descriptions were distinct. Evaluating the new synchronization expression with the actual media metadata selects frame 418 at native duration and returns Defect 05. This is source/module verification, **not** a browser event acceptance test. Native ended behavior reported by root and C's ongoing browser review remain separate evidence. The two media/copy findings above are still present in `85a3e0c`; no corrected render has been accepted by this report.

Root owns remediation, integration and final release. D releases this one-file scope through the board RESULT/STOP/RELEASE; any later correction needs an explicit published-source comparison.
