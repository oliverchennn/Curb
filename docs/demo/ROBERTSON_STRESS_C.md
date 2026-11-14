# Robertson interaction stress (Dev C)

`ROBERTSON-STRESS-C/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (Claude Opus 5.5, approved exception) · 2026-11-14.

**Base:** `1ff75a3467b5ccf7a2554ce53e1b46cafe457c90` (`origin/main`). Branch `codex/robertson-stress-c`, isolated worktree. **Sole write:** this document. Product, data, media, tests and scripts are unchanged; `git status` was clean after every run.

**Setup:**
- `npm ci`, `npm run build` (exit 0), then `next start` on 127.0.0.1:3010.
- Real `/api/curb/survey` and `/api/curb/survey/report`, with no API stand-ins.
- Browser: the Claude desktop built-in browser (Chromium) with emulated viewports. The pane was hidden during the runs (see Limits).
- In-page scripts drove real button clicks and input events. Real key presses were used for the keyboard checks.

Exhaustive frame/label evidence (every frame 0–418 at three sizes) is reused from [ROBERTSON_OVERLAY_FINISH](ROBERTSON_OVERLAY_FINISH.md) (`86cfb2a`, integrated unchanged) and was not repeated.

## Summary

| Area | Bounded run | Result |
|---|---|---|
| Seeks across the five findings | 10 rounds alternating forward 01→05 and backward 05→01 (50 clicks), plus a 25-click burst 15ms apart (75 total) | **0 overlay errors.** Every seek lands within ½ frame of the evidence time (Defect 05 clamps to the final frame). The selected box is highlighted. Every visible box matches a track keyframe within ±1 frame. The label count equals the box count, and the status count matches the boxes. Labels stay in the picture with no truncation or overlap. The burst settles on its last click (`defect-03`, 12.000s). Median click-to-settled seek is 334ms, max 1077ms. |
| Live/annotated switching during playback | 20 switches while playing muted, 600ms apart, from 6.0s through the end and a restart | **0 errors.** The source matches the mode, `aria-pressed` is correct, there is no media-error alert, the resume time equals the pre-switch time exactly (drift 0.000s in all 20), and the live overlay is consistent after each switch. Switching pauses playback by design, so the user presses Play again. |
| Review, selection and reset | 150 seeded operations (seed 7): random finding plus Accept/Reject/Mark pending, 25 budget changes and 9 Restore original, all with reviewer "Stress Reviewer C" | **0 errors.** After every operation the summary counts, the per-finding list status and every plan card's "Excluded (rejected)" count match an independent model. Restore returns to 5 pending. Rejected findings stay in the list and record and are hidden from the live overlay: Defect 04 and 05 were rejected and checked at 6.0, 7.0, 9.5, 12.0 and 13.933s. |
| Rapid budget changes | 201 values: 21 fixed edge cases (empty, `0`, `0.01`, `999999.99`, `1000000`, `1000000.01`, `-5`, `abc`, `1e5`, `12.345`, `$100`, `1,000`, `.5`, `5.`, 20 digits, …) plus 180 seeded values, applied back-to-back (1.3s total) | **0 stale plans.** For 178 valid values the budget plan appears and its "· $X" exactly equals the typed amount. For 12 invalid and 11 empty values there is no budget plan and no fit line, and invalid values set `aria-invalid` with the error text. In 170 results that include work, **no upper estimate exceeds the budget**. The other 8 say "No repair fits the known upper estimates". |
| Exports | 10× JSON and 10× CSV clicks; 5 rapid HTML clicks; 5 rapid PDF clicks plus 1 HTML click while busy; injected HTTP 500, network failure and wrong content type, each followed by a retry | **0 errors.** JSON and CSV are byte-identical across repeats, and the JSON statuses equal the on-screen review. Each 5-click burst sends **exactly 1** report request and 1 download: HTML 347,696 B, PDF 261,379 B. The edited HTML report carries the reviewer and the rejected/accepted states. Every injected failure shows a specific, error-styled message with no download, and the next retry succeeds. Filenames gain `-reviewed` only while edited. |
| Viewports and zoom | Fresh load at each size; seek to all five evidence frames | **0 label/box errors and no horizontal overflow** at all eight sizes (table below). |
| Keyboard with errors | Real Tab/Enter/typing | Errors are reachable and recoverable, with one focus issue (ST-C-01). |
| Reduced motion | CSSOM and code inspection | No motion that needs removing (details below). OS-level emulation was not available. |

Console errors: **0**. Server error log: **0**. Off-origin requests were not re-measured; QA reported 0 at `f960df5` and nothing network-related changed since.

## Viewports (fresh load each; all five evidence frames)

| Viewport | What it represents | Picture | Labels | Stage | Overflow / controls |
|---|---|---|---|---|---|
| 1920×1080 | desktop / projector | 316×562 | 230×24, full text | 296→1069 (fits from top) | none; 0 controls off-screen |
| 2560×1440 | tall desktop | **405×720** (cap) | 230×24 | 296→1228 (fits) | none; 0 |
| 1080×1920 | tall portrait monitor | 315×560 | 230×24 | 296→1064 | none; 0 |
| 1366×768 | laptop | 207×369 | 92×24 "Defect NN" | 576px tall | none; 0 |
| 960×540 | 1920×1080 at **200% zoom** | 188×335 | 92×24 | 1152px tall (scrolls) | none; 0 |
| 683×384 | 1366×768 at **200% zoom** | 134×238 CSS px (268×476 device px) | 92×24 | 1057px tall (scrolls) | none; 0 |
| 390×844 | phone | 294×523 | 230×24 | — | none; 0; only the skip link, nav text links and step links are under 44px tall |
| 320×568 | 1280px at 400% (reflow) | 198×352 | 92×24 | — | none; 0 |

At 200% zoom the video is shorter in CSS pixels, but physically larger than at 100% on the same laptop (268 vs 207 device px wide). In the 683×384 screenshot, the native controls sit just below Defect 05's final-frame box without covering it. I did not check this at the other sizes.

## Keyboard with errors (real key presses, 1366×768)

**Reviewer missing:**
- Tab from the finding heading to **Accept finding** shows `:focus-visible` and a 3px solid outline.
- Enter without a reviewer shows the alert "Enter a reviewer name before recording a decision." and moves focus to **Reviewer**, which is visible, `:focus-visible` and in view.
- After typing a name, Tab and Enter accept the finding, and the status announces "Accepted “Defect 01 · Transverse crack”."

**Report failure (injected HTTP 500):**
- Enter on **Download accessible HTML** shows "Injected stress failure (HTTP 500)." in the polite status region.
- Focus stays on the button (`:focus-visible`, `aria-disabled=false`), so pressing Enter again retries. The retry succeeds with "Saved the HTML report for Balanced plan."

**Invalid budget:**
- Typing `12.345` sets `aria-invalid=true`, shows "Use at most two decimal places; cents are never rounded." through `aria-describedby`, and removes the budget plan. Focus stays in the field.
- Backspace to `12.34` clears the error and restores the budget plan.

## Findings (actionable; product files are root-owned)

**ST-C-01 (P3), focus drops to `<body>` after a decision or restore:**
- **Repro:** at 1366×768, select Defect 01, enter a reviewer, Tab to **Accept finding**, press Enter.
- **Result:** the button becomes `disabled`, and `document.activeElement === document.body`, with no visible focus indicator.
- **Scope:** the same happens with **Restore original**: Tab to it while edited, press Enter, and it becomes disabled with focus on `<body>`. The same mechanism applies to **Reject finding** (disabled) and to **Mark pending**, which is removed when the status returns to pending; I found these two by reading the code, not by testing them.
- **What still works:** Chrome keeps the sequential-focus point, so the next Tab reaches the following control ("Reject finding"). Keyboard users aren't sent to the top of the page, but they briefly have no visible focus (WCAG 2.4.7), and screen readers get no focus target.
- **Suggested fix:** use `aria-disabled` and ignore activation instead of `disabled` for these buttons, or move focus to the next enabled control or the updated status.

**ST-C-02 (P3), review edits are silently lost on reload or close:**
- **Repro:** accept one finding and reject two (summary "1 accepted · 2 pending · 2 rejected"), then reload.
- **Result:** the summary is back to "0 accepted · 5 pending · 0 rejected". No `beforeunload` prompt appears, and nothing is in local or session storage.
- **Context:** this is disclosed session-only behavior ([ROBERTSON_FINAL_GATE](ROBERTSON_FINAL_GATE.md) says "browser-session edits are not persistent storage"), but the page itself never says so.
- **Suggested fix:** one visible line next to the "Edited" tag or in Export, for example "Edits stay in this tab only. Download JSON to keep them."

**ST-C-03 (P4), reviewer error persists across findings:**
- **Repro:** select Defect 01, clear Reviewer, click Accept, then select Defect 03.
- **Result:** the alert "Enter a reviewer name…" is still shown under Defect 03, and typing a name doesn't clear it until the next successful action. The text stays accurate, so this is cosmetic.
- **Suggested fix:** clear the message when the selected finding changes or the reviewer field gets a value.

**ST-C-04 (P4, observation), repeat-selecting the final-frame finding:**
- **Repro:** select Defect 05 when it's already selected at 13.933s.
- **Result:** Chrome reports `ended` and snaps `currentTime` to the duration (13.967). The app clamps its overlay time, so the final-frame box and label remain correct (verified). The native scrubber shows the end, and Play restarts from 0:00.
- No fix is needed for the demo. A presenter should select another finding before replaying.

No data loss beyond the disclosed session-only behavior, no stale plan, no false loading state, no duplicate report request, and no write to canonical data was found.

## Reduced motion

- The workspace's `@media (prefers-reduced-motion: reduce)` rule is present in the built CSS. It sets `scroll-behavior: auto`, `transition: none` and `animation: none` on all workspace descendants.
- Without reduced motion, the only motion is a 0.15s background and shadow transition on buttons.
- `document.getAnimations()` is 0. The video has no `autoplay` or `loop`. Seeks jump with no smooth scrolling, and `html` uses `scroll-behavior: auto`.
- Not run: emulating the OS preference itself, because the browser tool can't set `prefers-reduced-motion`.

## Method notes and limits

- **Harness correction:** the first seek run reported mismatches only at Defect 05 and during back-to-back seeks. Two harness issues caused them:
  - The checker required the exact frame, but Chrome rounds `currentTime` to microseconds (13.933333 → frame 417), while the app may compute frame 418. Both frames have tracked boxes.
  - The checker read before a delayed `seeked`.

  The final checker accepts ±1 frame, still flags any box that matches no track, and waits for seeking to finish. The results above are from that checker. A deliberate check confirmed no persistent stale overlay.
- **Hidden pane:** `requestVideoFrameCallback` didn't fire, and seeks took up to about 1s. The overlay therefore updated from the seek and `seeked` paths. A visible tab adds frame callbacks, which should only make updates sooner. Timings are from this hidden pane and are not projector or real-device latency.
- **Fault injection:** report failures were injected by wrapping `window.fetch` in the page for one call each. Every success path used the real server. The 30s timeout path was not exercised.
- **Downloads:** captured by intercepting the blob anchor click, so no files were written to disk.
- **Screenshots** (git-ignored, main checkout `.curb-local/stress-shots/`): `1920x1080-9.5s.jpg`, showing three labels each beside its own box with the caveat visible, and `683x384-200pct-13.933s.jpg`.
- **Not checked:** a physical projector, a screen reader, Safari or Firefox, touch hardware, OS reduced-motion emulation, missing-media recovery (B's server-side scope), and the public hosted site (no load testing of hosting).
