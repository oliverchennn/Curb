# Robertson survey UI corrections check

`ROBERTSON-UI-CORRECTIONS/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (Claude Opus 5.5, approved exception) · 2026-11-14.

**Tested source:** root's published integration base `f960df5c17db51947529e08374c4bc4dc1440c89` on `codex/robertson-access-repair`. It contains my CSS `09e32f4` plus root's later edits (`SurveyWorkspace.module.css` +29/−13 since `09e32f4`, plus `VideoEvidence.tsx` label placement). This document is the only tracked change; product files were read-only.

**Method:**
- `npm ci`, `npm run build` (exit 0), then `next start` on `127.0.0.1:3008`.
- Real API and exports, no stand-ins.
- In-app browser at emulated 1920×1080, 1366×768 and 390×844.
- Geometry measured in page script with `getBoundingClientRect`, plus real Tab and Enter key presses and screenshots.
- Export and report semantics are B's lane and were not retested.

## Verdict

| Finding (from `ROBERTSON_UI_QA.md`) | Status at `f960df5` | Evidence |
|---|---|---|
| QA-01: overlay labels crushed to box width | **Closed** | Every label is one line at 0, 6, 9.5 and 13.933333s: **230×23px** at 1920×1080 and 195×23px at 1366×768. The exception is Defect 05 at 1366×768 and 13.933s: 195×40px, two short lines. All labels are fully inside the picture, including Defect 04 at the right and top edges (box at x=181–236, y=0, label moved below). No label overlaps its own box or another label, and none overlaps another box at 1080p. |
| QA-02: stage taller than one screen | **Closed** | 1920×1080: the stage is **705px**, and the page header plus stage fit from the top of the page (stage bottom at y=1001). 1366×768: the stage is **575px** and fits the screen once scrolled to (it starts at y=296, so the header plus stage need one scroll). |
| QA-04: small touch targets | **Closed** | At 390px every `<summary>` and button is at least **44px**, including the segmented Review and Annotated buttons. The remaining sub-44px items are links: the inline "© OpenStreetMap contributors" link (exempt as inline text) and the step-nav links at 39px, which pass the WCAG 2.2 AA 24px minimum. |

**Remaining findings, all new and small:**

| ID | Severity | Where | Finding | Suggested fix |
|---|---|---|---|---|
| CR-01 | P3 | `VideoEvidence.tsx` `OverlayBox` placement | At **1366×768, 9.50s**, Defect 02's label covers **164px²** of Defect 04's box. The 207px-wide picture leaves little room. There's no overlap at 1080p. | Before placing a label, test it against the other visible boxes and flip it above or below, or shorten it to the defect number when the picture is under about 240px wide. |
| CR-02 | P3 | `VideoEvidence.tsx` segmented buttons | The visible text "Annotated" isn't contained in the accessible name "Pre-rendered annotations" (WCAG 2.5.3 Label in Name). "Review" is contained in "Live review overlay", so that one passes. | Use the accessible name "Annotated video (pre-rendered)" or similar, or drop the `aria-label` and keep the visible text. |
| CR-03 | P3 | `SurveyWorkspace.module.css` `.videoFrame` (`min(48vh, 560px)`) | The compact stage shrinks the evidence video to **292×518px** at 1920×1080 (down from 371×660 with `09e32f4`) and **207×369px** at 1366×768. That's legible on a laptop, but small for a projector walk-through of crack evidence. It's a trade-off for QA-02 rather than a defect. | If the demo is projected, consider `min(56vh, 620px)` at 1080p and above, which still fits (about 790px stage), or let presenters scroll to the stage. |
| CR-04 | P4 | `VideoEvidence.tsx` note | The explanation that missing boxes don't prove a defect is absent is legible (15px, #3e4c45, about 8.9:1), but it's now inside a **collapsed** "About the tracks" disclosure. The always-visible line only says "3 tracked findings. Dashed boxes await review." | Append "No box ≠ no defect." to the visible status line, and keep the details collapsed. |

## Other required checks

| Check | Result |
|---|---|
| Global navigation | `body > header` is visible at all sizes, with "Curb", "Survey workspace" and "Sample network". |
| Overflow | `scrollWidth` equals `clientWidth` at 1920×1080 (1905), 1366×768 (1351) and 390×844 (390). No element extends past the edge at 390px. |
| 390px video and labels | The video is 294×523 (9:16). Labels at 9.5s are 230×23 and inside the picture. |
| Keyboard | Real Tab presses visit the "Analysis and review status" summary, the Review and Annotated buttons, the video, "About the tracks", the site summary, the OSM link and then the finding chips, all `:focus-visible` with a solid `#8a5606` outline. Enter on the Defect 01 chip seeks to **7.00s**, sets `aria-pressed=true` and updates "Selected evidence: Work area 01." |
| Disclosures | All 21 `<summary>` elements are 15–17px with contrast of **9.30:1 or better**. "Route impact: unknown" is 9.40:1. The smallest visible text anywhere is 13px. |
| Network | The resource timing list has **0** off-origin entries during the session. |

## Not verified

- A physical projector.
- A screen reader.
- Reduced motion set in the operating system.
- Safari or Firefox.
- Real touch devices.
- Annotated-MP4 burned-in labels (D's lane).
- Export, report and focus fixes (B's lane).

## Artifacts (git-ignored)

- `.curb-local/corr-build.log` in the main checkout: the `npm run build` output.
- Browser screenshots in the local Claude tool capture store: the 1080p stage at 9.5s, and the 1366×768 header and stage. They are not published.
