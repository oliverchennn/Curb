# Robertson overlay finish

`ROBERTSON-OVERLAY-FINISH/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (Claude Opus 5.5, approved exception) · 2026-11-14.

**Base:** `117175a34f3e8ae8dec87ffe80b131453a3b6771`, as assigned. The remote `codex/robertson-access-repair` has since advanced; this branch was not rebased.

**Writes:**
- `src/features/curb/survey/VideoEvidence.tsx`
- `src/features/curb/survey/SurveyWorkspace.module.css`
- this document

There are no changes to evidence, boxes, tracks, data, contracts or B/report files. Root's `.budgetSummary` and heading `scroll-margin-top` rules are untouched, and I confirmed both are present in the built page.

## Changes

| Finding | Change |
|---|---|
| CR-01: labels collide on narrow pictures | Labels are now overlay siblings placed by a pure, exported `placeLabels(items, picture)` in `VideoEvidence.tsx`. Each label is one line (fixed 24px height, `nowrap`), clamped inside the displayed picture. It takes the first of 8 candidate slots (above, below or beside its box, left- or right-aligned) with **zero** overlap against every visible box and every label already placed; if none is clear, it takes the slot with the least overlap. The selected finding is placed first. When the picture is under 240px wide (the 1366×768 compact stage), labels show only the defect number, e.g. "Defect 02", at 92px. This is display only: boxes, tracks and timing are unchanged. |
| CR-02: Label in Name | Accessible names now begin with the visible words: **"Review: live overlay"** and **"Annotated: pre-rendered video"** (WCAG 2.5.3). |
| CR-04: hidden caveat | The always-visible status line now ends: **"A missing box does not mean there is no defect."** The longer "About the tracks" details are unchanged. |
| CR-03: small video on tall screens | `@media (min-width: 1200px) and (min-height: 1000px)` sets `.videoFrame` to `min(52vh, 720px)`. The 1366×768 compact height, the ≤1080/960/480px rules and the mobile 44px controls are untouched. I measured `54vh` first and rejected it, because the stage bottom landed at 1090px, past a 1080px screen. |

## Measured results (production build of this branch, real API, no stand-ins)

Method:
- `npm run build`, then `next start` on 127.0.0.1:3009, with a fresh page load at each viewport.
- An in-page sweep seeks every displayed frame **0–418** (at frame-centre times), then measures each live label against the displayed picture rectangle (accounting for `object-fit: contain`), every visible box, and every other label.

| Viewport | Picture | Labels at 0 / 6 / 9.5 / 13.933s | All-frame sweep (419 frames) | Layout |
|---|---|---|---|---|
| 1920×1080 | **316×562** (was 292×518 at `f960df5`) | 1 / 2 / 3 / 1 labels, each **230×24**, full text, not truncated, in picture, 0 box overlap, 0 label overlap | **724** label instances (max 3 in a frame): 0 outside, 0 multi-line, 0 truncated, **0 box overlaps, 0 label overlaps** | Stage 773px from y=296 to **1069 ≤ 1080**, so header plus stage fit from the top of the page. No horizontal overflow (1905/1905). |
| 1366×768 | 207×369 (compact, unchanged) | Same counts, each **92×24** with the number only ("Defect 02"), in picture, 0/0 overlap | **724** instances: 0 outside, 0 multi-line, 0 truncated, **0 box, 0 label overlaps**. Previously Defect 02 covered 164px² of Defect 04 at 9.5s. | Stage 576px, which fits once scrolled to (unchanged). No overflow (1351/1351). |
| 390×844 | 294×523 (9:16) | Same counts, each 230×24 full text, in picture, 0/0 overlap | **724** instances: 0 outside, 0 multi-line, 0 truncated, **0 box, 0 label overlaps** | No overflow (390/390). **No** summary, button, select or input under 44px. |

**Visual check:** a 1920×1080 screenshot at 9.5s shows each label beside its own crack. Defect 04's label sits to the left of its tall right-edge box, and the plain-words caveat is under the video.

**Keyboard:** real Tab presses from "Analysis and review status" reach "Review: live overlay" and then "Annotated: pre-rendered video", each `:focus-visible` with a solid outline. Enter on Annotated sets `aria-pressed=true` and loads `annotated.mp4`.

**Checks:** `npm run check` exit 0, with typecheck, **23 files / 674 tests**, and the production build.

## Limits

- `placeLabels` is verified by the browser sweep, not by a unit test. The colocated `presentation.test.ts` is outside this task's write scope; a small root-owned test would be cheap to add.
- In a hidden or background tab, `ResizeObserver` may not fire until the tab is shown. Labels then use the last measured picture size until the next resize. Visible browsers re-measure normally, and each measurement above used a fresh load at that size.
- Not checked: a physical projector, a screen reader, Safari or Firefox, touch hardware, and viewports taller than 1080px (the 720px cap is untested at 1440p and above).

## Artifacts (git-ignored)

- `.curb-local/overlay-check.log` and `overlay-build.log` in the main checkout.
- The 1920×1080 screenshot at 9.5s, in the local Claude tool capture store.
