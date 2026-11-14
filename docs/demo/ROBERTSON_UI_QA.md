# Robertson survey UI QA

`ROBERTSON-UI-QA/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (Claude Opus 5.5, approved exception) · 2026-11-14.

**Tested source:** root's published integration checkpoint `85a3e0c917be346d9f3304fabe64b36ab9ded85b` on `codex/robertson-access-repair`. It includes B's API, report and exports (`5aab3c0`), with **no stand-ins**. This document is the only tracked change, and product files were read-only. My separate CSS result `09e32f4`, which is not in `85a3e0c`, is assessed only where it changes a finding ([CSS delta](#css-delta-09e32f4)).

**Method:**
- `npm ci`, then `npm run check`, in an isolated worktree.
- `next start` (the production build) on `127.0.0.1:3007`.
- The in-app browser at emulated 1920×1080, 1366×768 and 390×844.
- Assertions in page script, real Tab key presses, screenshots, and direct HTTP calls to the API with Node `fetch`.
- Report failure states were **injected in devtools only** (`window.fetch` override), and are labelled as such below.

## Verdict

The real flow passes for loading, seeking, tracked overlays, review edits and restore, plan totals, budget validation, all three exports, API errors, keyboard order and focus, network isolation, and the 390px layout. There are **2 P2 and 3 lower-severity defects**. None blocks a demo. P2-1 is visible during the evidence walk-through.

| ID | Severity | Where | Defect | Suggested fix |
|---|---|---|---|---|
| QA-01 | P2 | `SurveyWorkspace.module.css` `.boxLabel`; `VideoEvidence.tsx` `OverlayBox` | An overlay label can be no wider than its box. At 9.50s, Defect 04's box is 69px wide, so its label wraps to **66×156px** and covers video next to the evidence. | `.boxLabel { width: max-content; max-width: min(240px, 90%) }` relative to the frame. For boxes in the right third of the frame, anchor the label to the right edge (`right:-3px; left:auto`). That needs a small TSX change to pass a side class. |
| QA-02 | P2 | `SurveyWorkspace.module.css` `.videoFrame`/`.stage` at `85a3e0c` | Replay plus site context is **1151px** tall at both 1920×1080 and 1366×768, so it doesn't fit one presentation screen. | `09e32f4` brings 1080p to **970px** (it fits). 1366×768 has not been measured with `09e32f4`. Expect it still to exceed 768px; consider capping the video at `min(56vh, 660px)` below 820px height, then re-measure. |
| QA-03 | P3 | B report (`src/server/curb/surveyReport.ts`, plan sections) | The PDF prints raw IDs to facilities readers: "Selected treatment IDs panel-01-seal, panel-02-patch…", "Items requiring quotes panel-02-patch, panel-04-patch, site-setup". | Print treatment and shared-cost **labels**, keeping IDs as secondary text if needed. B's export accessibility review may already cover this. |
| QA-04 | P3 | `SurveyWorkspace.module.css` (`summary`, `.segmented button`) | At 390px, `<summary>` toggles are 32px tall and the video-version buttons 40px. That passes WCAG 2.2 AA target size (24px) but falls short of 44px for touch and projector pointer use. | `summary { min-height: 44px; display: flex; align-items: center }`; segmented buttons `min-height: 44px`. |
| QA-05 | P4 | `ExportPanel.tsx` `reportError` | Server error copy has doubled punctuation: "Report rendering failed. (HTTP 500)." | Strip a trailing period from the server message, or format it as "… failed (HTTP 500)." |

## Checks

| Area | Result at `85a3e0c` |
|---|---|
| Build | `npm run check` exit 0: typecheck, **22 files / 587 tests**, production build including `/curb/surveys/[id]`. |
| Load | Title "Curb · Survey replay", h1 "Survey replay", "5 findings · 0 accepted · 5 pending · 0 rejected · 5 work areas", 0 alerts. `survey.mp4` is 720×1280, 13.966667s, readyState 4. |
| Seek and overlays | Each finding seeks to its evidence time: **7, 9.5, 12, 6 and 13.933s**, with `aria-pressed` true. The selected finding's own box is present at each, and Defect 05 is visible at 13.933s. A backward seek to 6.5s updates boxes to Defects 01, 02 and 04. A screenshot at 9.5s was inspected (the QA-01 label was seen there). |
| Video variants | Live overlay → pre-rendered at 13.933s keeps **13.933s**. The annotated MP4 decodes (readyState 4), shows no live overlays, and states that review edits are not burned in. Switching back keeps 13.933s and the Defect 05 box. |
| Review | Accept without a reviewer is refused, with the message shown and focus moved to the reviewer field. Accept on Defect 01 and reject on Defect 03 give "1 accepted · 3 pending · 1 rejected". Root's `AreaPriorityForm` (priority plus rationale) saved "Recorded accessibility priority for Work area 03." Restore original gives "0 accepted · 5 pending", with the button disabled. |
| Plans (defaults) | Essential **$294.00–$2,294.00**, partial, 1 quote. Balanced **$216.00–$1,434.00**, partial, 3 quotes (two patch plus site setup). Durable **$600.00–$4,906.00**, partial, 1 quote. These match root's published expectations in 6877763962. |
| Plans (after rejecting Defect 03) | Balanced $144.00–$956.00 and Durable $487.50–$4,014.00. Essential is unchanged because Area 03 isn't near-term. All three cards list "Excluded (rejected): Defect 03 · Diagonal crack". |
| Budget | "1.005", "-5", "abc" and "1000000.01" each set `aria-invalid` with a specific message, and the budget card is hidden. $0 and $300 give "No priced repair fits this budget". $1,500 gives $216.00–$1,434.00, partly priced. $10,000 gives $487.50–$4,014.00, partly priced. The slider (max $6,900, step $100) set "2500.00" with aria-valuetext "$2,500.00". |
| JSON export | `curb-robertson-hall-r2-reviewed.json`, 177,712 bytes. Reviews `defect-01 accepted/manual`, `defect-03 rejected/manual`, others `pending/ai`. Area 03 priority is `low`, matching the edit. |
| CSV export (B) | `text/csv`, 9,657 bytes, 7 lines, stable ID/revision/review columns. It keeps the rejected finding, and **0** cells start with `=`, `+`, `-` or `@`. |
| PDF export (B) | From the UI: `application/pdf`, `%PDF-1.7`, 260,083 bytes, status "Saved the PDF report for the Essential repairs plan." Direct POSTs of the default survey (balanced, and budget $1,500): 200, `attachment; filename="robertson-hall-repair-report.pdf"`, `cache-control: no-store`, **12 pages** each by `pdftotext`. The text includes "Overall ADA compliance undetermined", all three policies, partial estimates matching the UI, and the budget-fit wording. |
| API errors (B) | Malformed body: **400** `INVALID_REQUEST`. A 2.1 MB body: **413** `BODY_TOO_LARGE`. `GET ?id=nowhere`: **404** `SURVEY_NOT_FOUND`. All return a structured `{error:{code,message}}`. `/curb/surveys/nowhere` returns a 404 page. |
| UI failure states (devtools-injected) | Report 500: "Report rendering failed. (HTTP 500)." (see QA-05). Network failure: "Could not reach the report service…". A non-PDF 200: "…returned something other than a PDF. Nothing was saved." |
| Keyboard | 14 real Tab presses in logical order: reviewer, Findings 1–5, Accept, Reject, Correct (summary), area priority select, rationale, Save priority, budget, slider, Clear budget. **Every stop matched `:focus-visible` with a solid outline.** |
| Network | Over the whole session, the resource timing list has **0** entries off the page origin. Media, the map (`site-context.svg`) and the PDF are all local. The only off-site link (© OpenStreetMap) is opened by the user and is not loaded automatically. |
| 390×844 | `scrollWidth` 390 equals `clientWidth`, with no element past the right edge. The video is 304×540 (exactly 0.5625). For targets, see QA-04. |
| Projector sizes | 1920×1080 and 1366×768: no horizontal overflow, h1 56px, smallest text 13px and 10th-percentile 14px. Stage height: see QA-02. |
| Reduced motion | The `prefers-reduced-motion` rule is present in the shipped CSS (1 rule). Not emulated in the browser. |

## CSS delta 09e32f4

Root acknowledged `09e32f4` (6877917478) and is integrating it.
- **QA-02:** measured earlier on root `8eff97c` markup, it brings 1080p to 970px.
- **Amber contrast:** it raises the eyebrow amber to 5.51:1 on cream and the focus outline to 3.07:1 or better, on a markup-compatible tree (6877884802).
- **Other defects:** it does not fix QA-01, QA-04 or the 1366×768 height.

After root's integration, re-measure QA-02 at 1366×768 and recheck QA-01 on the integrated CSS.

## Not verified

- A physical projector or TV.
- A screen reader (NVDA or VoiceOver).
- Reduced motion or reduced transparency set in the operating system.
- A true offline run with the network disabled; only network origins were checked.
- Safari or Firefox.
- Real touch devices.
- The integrated CSS result (`09e32f4` merged by root).
- PDF visual layout. Root and B inspected the pages; this QA only checked the extracted text, the 12-page count and transport.

## Artifacts (git-ignored)

- `.curb-local/robertson-ui-qa/default-balanced.pdf` (259,615 bytes) and `budget-1500.pdf` (259,995 bytes), in the QA worktree.
- `.curb-local/qa-check.log`, in the main checkout: full `npm run check` output.
- Browser screenshots (the 9.5s overlay frame and the QA-01 label zoom) in the local Claude tool capture store. They are not published.
