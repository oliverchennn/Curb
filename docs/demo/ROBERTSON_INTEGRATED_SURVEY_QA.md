# Robertson integrated survey QA

`ROBERTSON-INTEGRATED-SURVEY-QA/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (Claude Opus 5.5, approved exception) · 2026-11-14.

**Exact base:** `28b0b1b0b2ab5d9e8051468493155122db91fc39` (`codex/robertson-release-final`). Branch `codex/robertson-integrated-survey-qa`, isolated worktree. **Sole write:** this report. Product files were read-only, and `git status` was clean after testing.

**Setup:**
- `npm ci`, `npm run check`, then `next start` on 127.0.0.1:3012 with the real API and media and no stand-ins.
- Chromium in the Claude desktop built-in browser with emulated viewports.
- Real key presses were used where the pane was drawing. Where it wasn't, I used scripted events and say so below.

## Result

**Pass, with no failures in scope.** There's one P4 robustness observation (INT-01) and nothing that blocks release. The known 404s for the pending Collection and Route explorer links are out of scope and were not filed.

`npm run check` at the exact base: **exit 0**. Typecheck, **23 files / 683 tests**, and the production build ("Compiled successfully"). Console errors read: 0. Server log: no errors.

## (1) Intake `/curb/upload`

| Case | How | Result |
|---|---|---|
| Original `IMG_0699.MOV`, 16,661,803 B, SHA-256 `30af8768…` | file input (DataTransfer) | Hash check 24ms, then "Preparing your survey", file name "IMG_0699.MOV", **"10-second processing simulation"** label, and the note "does not run live AI analysis". **One** navigation to `/curb/surveys/robertson-hall` at **10.05s**. |
| Prepared `survey.mp4`, 12,051,199 B, `52b364f8…` | drop on the drop zone | Hash 21ms, file name "survey.mp4", one navigation at **10.23s**. |
| Bundled demo button | click | Progress steps advance (29% at 3s); one navigation at about 10.06s. |
| Empty file (0 B) | input | Rejected: "Choose the original Robertson Hall MOV or its prepared MP4 (up to 50 MB)…". No navigation. |
| Arbitrary bytes (4 KB `.mov`), text file, 1 KB dropped `.mp4` | input, drop | Rejected: "This clip has no prepared analysis in this demo…". No navigation. |
| Oversized (50 MiB + 1 B) | input | Rejected before hashing (346ms), same size message. No navigation. |
| The real `annotated.mp4` (a valid video, not on the allowlist) | input | Rejected as having no prepared analysis. |
| **Cancel** at 3s (29%) | click | Returns to "Start with a sidewalk video" and **stays on `/curb/upload` 11s later** (past the 10s mark), with 0 navigations. |
| **Restart** after cancelling at 2s | click, cancel, click | Exactly **one** navigation, **10.08s after the second start**. The cancelled run never fires. |
| **Double Enter** on "Use Robertson Hall demo" | real keys (Enter ×2) | Focus moves to the "Preparing your survey" heading (`:focus-visible`), so the second Enter lands there. One navigation at about 10.1s. |
| **Double click** by position | pointer events at the button's coordinates, 120ms apart (real mouse unavailable, pane not drawing) | The second click lands on the progress list item, not a control. One navigation (12.9s in the hidden pane, where timers are throttled). |
| **Navigate away** mid-run | at 4s, click "Sample network" | Lands on `/curb/plans` and **stays there** 12s later, with no late redirect. |
| Cancel with the keyboard | real Enter on "Cancel demo" | Focus stays on the same button, now "Use Robertson Hall demo →" (`:focus-visible`), and the next Tab reaches "Skip to the prepared survey". |
| Layout | 1366×768, 683×384, 390×844 | No horizontal overflow. At 390, the only controls under 44px are the global skip link and brand, plus the visually hidden file input (`Choose video` is its label, with a focus ring). |

**INT-01 (P4, observation, no failure reproduced):**
- **What happens:** the "Use Robertson Hall demo" button and "Cancel demo" are the same DOM node, because React reuses the element at the same child index across the two branches. A scripted second `.click()` on the original element reference after the re-render therefore cancels the run.
- **What's safe:** real double Enter (focus moves to the heading first), a positional double-click (the Cancel button sits elsewhere) and real keyboard cancel all behaved correctly.
- **Suggested hardening:** give the two buttons distinct `key`s so a stale reference or very fast input can't cross from start to cancel.

## (2) Video modes and seeks (1366×768, metadata ready)

Three modes: **Original** ("Original: footage without boxes"), **Review** ("Review: editable finding overlays"), **Annotated** ("Annotated: exported video preview"). Each accessible name starts with its visible word.

**Seeks:**
- **30 seeks:** each mode with 01→05, then each mode with 05→01, using the jump row.
- **21 mode switches**, including Original→Annotated→Review at each of Defect 04, 05, 01, 03 and 02.
- **Result: 0 errors.**
  - Each seek lands within ½ frame of its evidence time, including Defect 04 at 6.0s and the final Defect 05 at 13.933s. Chrome may report the duration for the final frame, as before.
  - Switching modes keeps the position (≤0.05s; 0.000 measured).

**DOM boxes per seek:**
- Original: **0** at all five.
- Review: **3 / 3 / 2 / 2 / 1** for 01–05, each matching a track keyframe within ±1 frame, with the selected box highlighted and labels equal to boxes.
- Annotated: **0** (no duplicate DOM boxes).

**Sources:** Original and Review use `survey.mp4`, and Annotated uses `annotated.mp4`. Both decode at 720×1280 and 13.967s.

**Burned-in labels:** comparing frames drawn to a canvas, `annotated.mp4` differs strongly from `survey.mp4` in **3,382 / 3,263 / 1,264 of 57,600** sampled pixels at 7.0 / 9.5 / 13.9s. That's consistent with rendered boxes and labels, not just a re-encode. The status note reads "Export preview: original finding labels are permanently rendered into this video."

**Label sweeps:** the picture sizes are **identical** to those already swept frame by frame in [ROBERTSON_WORKSPACE_LAYOUT](https://github.com/oliverchennn/Curb/blob/d32074ad22449d55d2b8ca1ea87edd0ee5f84b84/docs/demo/ROBERTSON_WORKSPACE_LAYOUT.md) and earlier (236×420, 405×720, 188×335, 134×238, 294×523). Review overlay code is unchanged apart from the mode union, so those sweeps are reused rather than repeated.

## (3) Review / Compare / Export state

- **Setup:** reviewer "Integrated QA C", Defect 04 rejected, budget $2,500, plan "Durable renewal".
- **30 tab switches:** reviewer, budget, selected plan and "1 rejected" were preserved after every one.
- **In-flight report:** a PDF delayed 2.5s on purpose started as "Preparing the PDF report for Durable renewal…". I switched to Review (the export panel was `hidden`) and then Compare. It finished with **1 request, 1 download** (`curb-robertson-hall-r2-reviewed.pdf`, 261,411 B) and the status "Saved the PDF report for Durable renewal."

## (4) Header, mode buttons and keyboard

Measured after a fresh load at each size.

| Viewport | Header | Nav links | Mode buttons | Video picture / evidence column | Overflow |
|---|---|---|---|---|---|
| 1920×1080 | 1680×77 | 5 on one row, 40px tall | Original 75 · Review 69 · Annotated 92 (×40), one row, inside the panel, not truncated | 405×720; column 1013px (sticky, ends at 1021 ≤ 1080) | none |
| 1366×768 | 1351×77 | one row | same | 236×420; column 713px | none |
| 960×540 (1920 at 200%) | 945×77 | one row | 83/77/100 ×40, one row | 188×335, stacked | none |
| 683×384 (1366 at 200%) | 683×110 | one row, 44px tall | one row | 134×238, stacked | none |
| 390×844 | 390×160 | **two rows**, 44px tall | 83/77/100 **×44**, one row under the heading | 294×523 | none; **0 controls under 44px** |

**Keyboard (real keys):**
- → moves from Review to Compare.
- End selects Export, showing only its panel, with focus visible.
- → wraps to Review, ← wraps to Export, and Home goes back to Review.
- Enter on **Original** sets `aria-pressed` and leaves 0 DOM boxes, with focus kept and visible.
- Tab, Tab, then Space on **Annotated** loads `annotated.mp4` with 0 DOM boxes, focus kept.

## Limits

- Real mouse and some real key input were unavailable while the pane wasn't drawing. Double-click was therefore modelled with positional pointer events, and those runs are labelled in the table. Timings are from this environment, not device latency.
- I didn't watch Annotated playback frame by frame by eye. The burn-in evidence is the pixel comparison plus the earlier media reviews.
- Not checked: a projector, a screen reader, Safari or Firefox, touch hardware, OS reduced motion, the hosted deployment, and the pending Collection and Route explorer pages (known 404s, out of scope).

## Artifacts (git-ignored, main checkout `.curb-local/`)

- `intqa-check.log`
- `intqa-shots/1366x768-survey-review-6s.jpg`: the three mode buttons, Review boxes for Defect 01 and 04 at 0:06, and the wide header.
- `intqa-shots/1366x768-upload-simulation-41pct.jpg`: the labelled simulation at 41%.
