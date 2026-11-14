# Robertson workspace layout

`ROBERTSON-WORKSPACE-LAYOUT/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (Claude Opus 5.5, approved exception) · 2026-11-14.

**Base:** `1ff75a3467b5ccf7a2554ce53e1b46cafe457c90`. Branch `codex/robertson-workspace-layout`, isolated worktree.

**Writes (as granted):**
- `SurveyWorkspace.tsx`
- `SurveyWorkspace.module.css`
- `FindingReview.tsx`
- `PlanCompare.tsx`
- `SiteContext.tsx`
- this document

`ExportPanel.tsx`, `VideoEvidence.tsx`, `globals.css`, data, contracts, domain, API and report code are unchanged. Route, measurement and price semantics are unchanged: plans still come from the root `buildRepairPlans`.

## What changed

**Before:** the Review findings, Compare repairs and Export report sections were stacked down one page, 5101px tall at 1366×768, with Export starting 4513px down.

**Now:** one desk.

**Evidence column (sticky on desktop):**
- The portrait replay with its live/annotated switch.
- A new **Jump to evidence** row (01–05) under the video. Any pane can seek the video to a finding. Each button's name starts with its visible number, followed by the label, evidence time and review status.
- The column is sized to fit one screen and stays in view while the work pane scrolls.

**Work pane with real tabs** (`role="tablist"`, `tab` and `tabpanel`):
- Tabs: **1 Review findings · 2 Compare repairs · 3 Export report**.
- `aria-selected`, `aria-controls`, roving `tabIndex`, automatic activation, ←/→ with wrap, and Home/End.
- All three panels **stay mounted** and inactive ones are `hidden`. Reviewer name, budget, selected plan and an **in-flight report download** survive tab changes.
- Earlier anchors (`#survey-plans-heading` and so on) open the matching tab, and the visible h2 headings are kept.

**Review tab:**
- The findings list sits beside the detail, with the **local map** (SiteContext) under the list, so map context and selection stay together.
- Unplaced findings are listed in text ("Not placed on the map (5): Defect 01, … Per-defect positions are not verified") rather than as a third set of selection chips.
- Standards checks moved behind a disclosure. Its summary states the count and that they need measurement or were not assessed, not a compliance verdict.
- **Needs measuring** and **Possible access effects** stay visible.

**Compare tab:**
- The budget controls sit directly above the results.
- The **three policies sit side by side** at desktop width; with a budget set there are four cards.
- Each card keeps visible: the cost range, completeness, every **quote-required item by name** (the reasons are behind "Why these need a quote"), the budget fit, the selected-area tag, **Use for report** near the result, coverage and durability, **Deferred**, excluded items, and "Route impact: unknown".
- The per-repair list with its suitability and estimate basis is behind "Repairs in this plan (n)".

**Width:**
- At ≥1100px the workspace uses up to 1640px of the window, breaking out of the 1200px page column from its own CSS, since `globals.css` stays untouched.
- Below 1100px it stacks: video, jump row, tabs, then the pane.
- The tabs stay real tabs on mobile and become 3 equal 74px-tall buttons at 390px.

**Video size:**
- Frame height is `clamp(320px, 100vh − 345px, 420px)`, or `clamp(570px, 100vh − 330px, 720px)` when the viewport is at least 900px tall.
- I chose these so the picture stays in widths whose labels were swept frame by frame: under 240px (compact "Defect NN" labels) or at least 320px.
- A first try at 246px wide put full-width labels over Defect 04's box in frames 270–275 (up to 730px²), so I constrained the height.

**Stress findings from ROBERTSON-STRESS-C, fixed here because the files are in scope:**
- **ST-C-01:** Accept, Reject and Restore original use `aria-disabled` instead of `disabled`, so focus stays on them. Mark pending, which disappears once used, moves focus to Accept.
- **ST-C-02:** while edited, the summary bar says "Edits stay in this browser tab only and are lost on reload. To keep them, use Export report, then Download JSON."
- **ST-C-03:** the reviewer error clears when another finding is selected or a name is typed.
- The route-note summary was 23px tall and is now 32px.

## Measured (production build, real API, no stand-ins)

`npm run build` then `next start` on 127.0.0.1:3011. Each viewport was measured after a fresh load. Chromium in the Claude desktop built-in browser, with emulated viewports; the pane was hidden.

| Viewport | Layout | Picture | Sticky video | Tabs (h) | Review / Compare / Export page height | Overflow |
|---|---|---|---|---|---|---|
| 1920×1080 | desk, 445 + 1135px columns | **405×720** (was 316×562) | column 991px tall; video fully in view while every pane scrolls | 383×48 | 2050 / 1604 / 1415 | none |
| 1366×900 | desk | 321×570 | in view | — | — | none |
| 1366×768 | desk, 360 + 922px columns | **236×420** (was 207×369) | column 713px tall (top 8, bottom 721); in view while Review and Compare scroll | 299×48 | **2182 / 1691 / 1133** (was one 5101px page) | none |
| 960×540 (1920 at 200%) | stacked | 188×335 | — | 281×48 | 4071 / 2399 / 1718 | none; 0 controls off-screen |
| 683×384 (1366 at 200%) | stacked | 134×238 | — | 201×48 | 4037 / 3147 / 2018 | none; 0 off-screen |
| 390×844 | stacked | 294×523 | — | 111×74 | 4845 / 4529 / 2812 | none; **0 controls under 44px** |

**Plan cards:**
- 1366×768: 3 cards in 1 row, 284px each.
- 1920×1080: 3 in a row at 368px (4 with a budget, also one row).
- 683×384: 2 rows.
- 390: one column.

**Label sweeps on the new picture sizes** (every frame 0–418 at frame-centre times):

| Picture | Viewport | Label instances | Outside / multi-line / truncated / box overlap / label overlap |
|---|---|---|---|
| 236×420 (compact 92px labels) | 1366×768 | 724 | **0 / 0 / 0 / 0 / 0** |
| 321×570 (230px labels) | 1366×900 | 724 | **0 / 0 / 0 / 0 / 0** |
| 405×720 (230px labels) | 1920×1080 | 724 | **0 / 0 / 0 / 0 / 0** |

The stacked sizes (188, 134 and 294px wide) are unchanged from `86cfb2a` and [ROBERTSON_STRESS_C](https://github.com/oliverchennn/Curb/blob/e57a37195c89cc794ff7691fe19ed9b850cdbc3e/docs/demo/ROBERTSON_STRESS_C.md), so that evidence is reused.

## Stress on the revised layout (1366×768, bounded)

| Run | Count | Result |
|---|---|---|
| Seeks | 75 clicks: 10 rounds alternating Review-list and jump-row clicks, forward and backward, plus a 25-click burst; **105 tab switches** interleaved | **0 errors.** Each seek is within ½ frame (Defect 05 is the final frame; Chrome may report the duration). One jump button is pressed, the heading matches, boxes match tracks within ±1 frame, labels equal boxes, and the status count is right. **A tab switch never moved the video.** Tab state is valid after every switch: one selected, one visible panel, roving tabindex. Median seek 276ms, max 947ms. |
| Live/annotated during playback | 20 switches, tab changed before each | **0 errors**, drift 0.000s in all 20. |
| Review, selection and reset | 150 seeded operations (seed 11): 135 tab changes, 15 Restore, 15 budget values, 18 plan selections | **0 mismatches** against an independent model of the counts, list status and excluded count on every plan. After every operation the reviewer name, budget text and chosen plan are **intact**. Clicking an `aria-disabled` decision is a no-op, and the session note shows whenever the survey is edited. |
| Budget | 201 values (same 21 edge cases plus 180 seeded) | **0 stale plans.** 178 valid, 12 invalid, 11 empty. In 170 results that include work, no upper estimate exceeds the budget. |
| Exports | 10× JSON and 10× CSV; 5-click bursts on HTML and PDF; injected HTTP 500, network failure and wrong type, each with a retry; **PDF delayed 2.5s while switching to Review then Compare** | Repeats are identical, and JSON carries the rejected Defect 04. Each burst sends **1 request**: HTML 346,509 B, PDF 260,134 B, with real report API. Every fault shows its message, and the retry succeeds. The delayed PDF finished while its panel was `hidden`, downloaded once, and showed "Saved the PDF report for Balanced plan." |

**Keyboard (real key presses):**
- From the last jump button, Tab reaches the selected tab, which is `:focus-visible`.
- → selects Compare and shows only its panel. End selects Export, → wraps to Review, and Home then ← wraps to Export.
- Tab from a tab goes into the visible panel (Download PDF).
- **Accept with no reviewer** shows the alert and moves focus to Reviewer. Selecting another finding clears the alert. Raising it again and then typing one letter clears it.
- **Accept** keeps focus on the button (`aria-disabled=true`, focus visible). A second Enter is a no-op.
- **Mark pending** moves focus to Accept (`#survey-accept`).
- **Restore original** keeps focus (`aria-disabled=true`) and announces "Restored the original analysis…". A second Enter is a no-op.

**Deep links:** `#survey-plans-heading` opens Compare on load, and changing the hash to `#survey-export-heading` switches to Export.

**Reduced motion:**
- The existing workspace rule also covers the new tab buttons (`transition: none`).
- The only scrolling is an instant `scrollIntoView({block: 'start'})`, used when a tab is chosen while the tab bar is above the viewport.
- There is no autoplay or animation.
- I couldn't emulate the OS preference.

**Console errors 0; server errors 0.**

**Checks:** `npm run check` exit 0: typecheck, **23 files / 676 tests**, and production build.

Screenshots (git-ignored, main checkout `.curb-local/layout-shots/`):
- `1920x1080-compare-budget.jpg`: four plans side by side with a $2,500 budget beside the 405×720 replay at 9.5s.
- `1366x768-review-sticky.jpg`: scrolled, with the video sticky beside Review.
- `390x844-tabs.jpg`: the jump row and stacked tabs.

## Limits

- The pane was hidden during runs, so timings aren't device latency and `requestVideoFrameCallback` didn't fire. Report failures were injected client-side, and every success path used the real server.
- The desk breakpoint (1100px) and the 900px height step were chosen from these measurements. Viewports between the measured sizes are reasoned about, not each measured.
- The workspace widening is CSS inside the workspace. The site header remains at 1200px, which is a visual width mismatch on very wide screens. Root could widen `main` instead if preferred.
- Not checked: a projector, a screen reader (tab semantics follow the WAI-ARIA pattern but weren't heard), Safari or Firefox (container queries are needed for the narrow-pane review stacking; without them the review layout still stacks below 960px), and touch hardware.
