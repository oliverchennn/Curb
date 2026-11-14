# Robertson independent review — Developer D / attempt 1

Reviewed on 2026-11-14 by Oliver's existing cloud session `6af808fa-83dc-8191-bd58-80697dbe50c9`, under [assignment 6877377911](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877377911) and [ACK 6877392092](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877392092). Pinned source: **`9b4e2c056930d97c0603f3566b3df135bb269dc4`**, contract `curb-survey-v1`. Branch `codex/robertson-independent-review`; checkout `/workspace/curb-robertson-review`. Only this report and `tests/integration/robertson/independent.test.ts` are new tracked writes. Existing product, media, data and contracts were read-only. No children.

The tested budget selections match the independent work-area oracle. One input-boundary defect remains open below. This is source/media/domain review, **not combined UI/API/PDF/browser acceptance**.

## D1-01 — P2: accepted evidence time can have no visible track

Location: [src/contracts/curb/survey.ts:69](https://github.com/oliverchennn/Curb/blob/9b4e2c056930d97c0603f3566b3df135bb269dc4/src/contracts/curb/survey.ts#L69). The validator accepts any track key within 0.15 seconds of `evidenceTime`, while the display helper requires the exact displayed frame and deliberately does not bridge a missing frame.

Reproduction against the pinned source:

```ts
const s = structuredClone(canonicalSurvey);
const f = s.findings[0]; // defect-01, evidenceTime=7, fps=30
f.track = f.track.filter(k => k.frame !== 210);
SurveySchema.safeParse(s).success; // true — should reject the missing anchor
getBoxAtTime(f, 7, 30);            // null
```

Impact: an edited/imported survey accepted by the shared boundary can seek to its evidence time without showing the defect box. The current three canonical anchors exist, so this does not break their default playback. Root should validate the actual display-frame anchor while preserving missing-frame invisibility. The new suite has an ordinary passing test that requires no invented overlay, plus an explicitly named `it.fails` for the rejection requirement. That expected failure is an **open finding**, not a passing acceptance gate; after an owned correction, convert it to an ordinary regression. The expected-failure marker will fail on an unexpected pass. Reported to root in [6877472037](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877472037).

## Independent plan verification

The test oracle recursively chooses zero or one priced treatment for each eligible work area. It does not import production cost/scoring helpers or copy its treatment-bitmask search. It independently sums outward-rounded item bounds and one set of shared fees, then ranks high/medium/low/unassessed coverage, durability, lower upper-bound cost and stable option IDs.

Coverage includes all authored affordability boundaries ±1 cent, 27 default area combinations, known and unknown shared fees, fractional quantities, every rejection mask, multiple findings grouped into one area, non-repair-worthy exclusions, changed priorities, all-unpriced options, genuine zero prices, candidate reordering, 16 deterministic edited scenarios, and the 12-treatment limit. It compares selected/deferred areas, excluded findings, totals/completeness, coverage, durability, budget-fit semantics, route uncertainty and source immutability. No mismatch was found in those cases.

Authored policy outcomes at the pinned source (dollars; **partial priced subtotals**):

| Policy | Selected scope | Priced subtotal | Additional quote-required items |
|---|---|---:|---|
| Essential | Seal areas 01 and 02 | $144–$956 | Shared site verification/setup/access provision |
| Balanced | Seal 01 and 03; patch 02 | $144–$956 | Patch 02 **and** shared setup |
| Durable | Replace areas 01, 02 and 03 | $337.50–$2,676 | Shared setup, plus listed estimate exclusions |

Equal essential/balanced subtotals do not mean equal total prices. At $478 the budget plan selects one high-priority sealing option and remains `partial`; at $956 it selects both high-priority sealing options and remains `partial`. Unpriced patches never become free budget candidates. Shared charges occur once for nonempty work; an empty plan has no setup charge. Neither a review decision nor a maintenance plan establishes a route opening.

## Actual media and evidence inspection

`ffprobe -count_frames` independently decoded 419 video frames from the original and both published MP4s. Original HEVC storage is 1920×1080 with a −90° display rotation, about 13.965 seconds; normalized and annotated H.264 files are portrait 720×1280, 30 fps, 419 frames, 13.966667 seconds, no audio. The original remains 16,661,803 bytes, SHA-256 `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a`, matching both manifest and retained analysis.

I viewed all three full evidence JPEGs and all three close-ups, and a contact sheet sampled at 2 fps throughout the annotated clip (28 samples). The visible irregular transverse/branched/diagonal cracks correspond to the three retained IDs. Sampled boxes follow those features through the walking sequence and disappear after the tracked interval; no ID swap was observed in the inspected samples. This is sampled visual review, not continuous frame-by-frame human playback, physical measurement, or a claim of complete defect detection. Camera movement and blur limit detail.

| Finding | Visible frame interval | Keys | Evidence time / frame |
|---|---:|---:|---:|
| defect-01 | 105–231 | 127 | 7.0 s / 210 |
| defect-02 | 195–301 | 107 | 9.5 s / 285 |
| defect-03 | 270–371 | 102 | 12.0 s / 360 |

Tests compare all canonical track keys/boxes with retained tracking provenance, verify anchor identity and source hash, and check exact lookup for frames 419 down to 0 for each finding: **1,260 frame/time comparisons**, including absent intervals and backward seeking. All map positions remain null, measurements remain empty, reviews remain pending/AI, and ADA checks remain `needs_measurement` or `not_assessed`. Qualitative wheel/cane/footing implications are presented as possibilities; the images cannot establish crack width, vertical displacement, slope, clear width, route passability or ADA compliance.

**Separately inspected root delta `0ff03c771b49238974076229515811eedbf17c89`:** fetched after [6877431431](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877431431). The contract, evaluator, canonical data, retained tracks and original MOV are unchanged from the pinned review. Extracted corrected annotated MP4 into ignored scratch, verified 10,342,241 bytes and SHA-256 `0633f0bfbced95a75b1e484db39ba0af032d9d78087cc05541bbf1b1eac69af6`; independently decoded all 419 frames and confirmed 720×1280, 30 fps and BT.709 matrix/transfer/primaries. Viewed another 28-sample contact sheet. This confirms the reported metadata correction; it is not whole-commit/browser acceptance. The legacy replay click delta invokes `compareRoutes` on each selection; the new navigation intentionally depends on C's not-yet-integrated route. Neither flow was browser-tested here.

## Primary-source verification

Retrieved the following directly on 2026-11-14 at about 07:41 EST (12:41 UTC); HTTP 200, actual contents inspected. Local receipts, PDFs/text and page renders are in ignored scratch. Retrieval date is not a field-observation date.

| Source | What was independently verified | Limits |
|---|---|---|
| [Palmyra bid summary](https://erinj.com/wp-content/uploads/2026/04/44538-00-2026-03-24-bid-summary.pdf), page 1, A1.6 | 03/24/2026 opening; four-inch concrete sidewalk, 20 SY; first four bidders $223/$200/$200/$75 per SY | $75–$223 is the selected first-four range, not all bids. Page 2 includes $359/SY. The program title says 2025, but the bid opening is in 2026. No campus small-job quote or measured quantity is established. |
| [NJDOT contract 21132](https://nj.gov/transportation/contribute/business/procurement/ConstrServ/documents/BidTabsDP21132_Redacted.pdf), page 74, item 0083 / 456006M | Visually rendered image-only row: 200 LF, Carbro $18/LF and JPC $59.75/LF; tabulation 10/5/2021, letting 9/30/2021 | These are selected bidders 4/5. Page 12 lists other bidders at $20/$3.35/$74. Text extraction alone omits page 74's row. The selected historical range is not an all-bid spread, inflation-adjusted estimate or current sidewalk quote. |
| [U.S. Access Board ADA standards](https://www.access-board.gov/ada/) | Sections 302.3 openings, 303.2 vertical changes, 303.3 bevels, 403.3 running/cross slopes exist and concern measurable conditions | No measurements or site-applicability decision were supplied; the fixture appropriately leaves checks unresolved. |
| [FHWA maintenance guide](https://highways.dot.gov/sites/fhwa.dot.gov/files/2024-10/Guide_for_Maintaining_Active_Transportation_FHWA-SA-23-005.pdf) | Retrieved actual FHWA-SA-23-005 guide, including its nonbinding-guidance notice | This is treatment context, not a site-specific design or guaranteed treatment suitability. No engineering prescription is inferred. |

PDF SHA-256: Palmyra `719646867cb8a4df66c3ed3b195838bf626ad420dde0d040d90a4ba65fb652a2`; NJDOT `2c72b982ff2e1b75d0be14efbc4188cf0c0d8de1d984969346bfa30d9bc4f4bf`; FHWA `9c15fc9f9b4a447113a5c3ddb2325335377137d763328182ab3a32346bb94073`. The two numeric rates used for sealing are supported by the selected source row; no rate correction is requested. Adding page 74 and bidder names would make the source easier to audit. Assumed treatment lengths/areas, conditional treatment eligibility, historical pricing, unpriced patching/setup and estimate exclusions must remain visible in downstream UI/report outputs.

## Checks, artifacts and remaining gates

Environment: Node `v24.22.1`, npm `11.9.0`. Locked `npm ci --no-audit --no-fund` completed. `npm run typecheck` passed. `npm test -- tests/integration/robertson/independent.test.ts src/domain/curb/survey.test.ts src/contracts/curb/survey.test.ts` reports **49 passed, 1 expected fail, 3 files** after separating the missing-overlay safeguard from D1-01. Scope and `git diff --check` are checked before publication. No product correction was made.

Ignored `.curb-local/robertson-review/` holds `media-probe.json`, `source-receipts.json`, downloaded source PDFs/text, `njdot-page-{12,43,74,105}.png`, original/corrected annotated contact sheets, `delta-media.json`, extracted corrected MP4, targeted logs and TypeScript log. These are local review artifacts, not additional published paths; primary-source URLs/hashes and the committed test make the principal checks reproducible.

Full application build, integrated browser interaction, UI accessibility/offline behavior, API/report/CSV behavior, every PDF page, field measurements, and independent acceptance of the earlier scout map are outside this checkpoint. Existing worker/full-check claims are not relabeled as D's checks. Root owns D1-01 correction and final serialized acceptance. Remote result SHA and STOP/RELEASE are recorded in the board RESULT after publication.
