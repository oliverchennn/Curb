# Hardening UI regression

`CURB-HARDENING-UI-REGRESSION/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (approved exception, no children) · 2026-11-14. Assignment [6885103179](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885103179), ACK [6885191765](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885191765).

**Source:** exact candidate **`0cd2cd4757ac38919c5db54a7d1672ceecd16138`** (root PR8). Branch `codex/hardening-ui-regression`, new isolated worktree. Sole tracked write: this report.

**Build:** `npm ci`, `npm run build` (exit 0), then `next start` on 127.0.0.1:3016. This is a local compiled production build; the public baseline (`b010ad0`) is unchanged and was not touched.

**Environment:**
- Chromium in the Claude desktop app's built-in browser, with viewports emulated at 1366×768 and 390×844.
- Real key events for keyboard rows.
- **NVDA 2026.3.1** with input/output speech logging (`.curb-local/nvda-hardening.log`, excerpt `nvda-hardening-excerpt.log`, git-ignored).

## Source reviewed

Root's `5a2d83d` replaces my `CollectionDemo` MutationObserver/focusout rescue with a scene-owned callback:
- In the render loop, `CollectionScene` calls `onHiddenSensorFocus(id)` *before* setting a focused callout to `visibility: hidden`, and again on `webglcontextlost`.
- The parent focuses a ref'd sidebar camera button.
- Callouts get `aria-label="Camera 01, Forward context camera"`, which fixes the run-together "CAMERA 01Forward…" name I reported.

My announcer, timer, card names and CSS from `d5c1f78` are unchanged.

## Results

| Check | 1366×768 | 390×844 |
|---|---|---|
| **Root's focus-rescue repro:** Overhead at 0s, 2× speed, Space to play (real key), focus and Enter on the visible **Forward** callout (real key), robot crosses | **Pass.** The callout hides at 10.70 sim-s; focus moves to the **sidebar Forward camera** button, `:focus-visible`, 3px solid outline | **Pass.** Hidden at 10.70; focus on sidebar Forward (336×62, scrolled into view, `:focus-visible`) |
| **Graphics-context loss** with the Curb callout focused (`WEBGL_lose_context`) | not repeated | **Pass.** Static diagram plus notice; focus moves to **sidebar Curb** (`:focus-visible`) |
| Capture cards 5 / 12 / 20s | Pass (NVDA quotes below) | **Pass.** Names "Context frame, 5 seconds, Captured. Sidewalk ahead. Seek here." etc.; count 1/2/3; visible "✓ Captured / ○ Upcoming" agrees |
| Backward scrub to 11.9s | Pass (real ←) | **Pass.** Card 2 name and visible text both "Upcoming"; count 1/3; slider value text "11 of 24 seconds; 1 of 3 illustrative captures"; timer "11 / 24s" with readable "Simulation time 11 of 24 seconds" |
| All 3 canvas callouts and all 3 sidebar buttons | Pass | **Pass.** Canvas ↔ sidebar `aria-pressed` agree; callout names "Camera 0N, …" |
| Static ↔ 3D | Pass (announcements below) | **Pass.** Diagram shown, focus stays on the pressed button, "Static diagram shown…"; 3D remount gives 1 canvas, "3D scene shown, paused." |
| Quiet autoplay | **Pass:** see NVDA | — |

**NVDA 2026.3.1 on the candidate.** Live-region speech was quoted from the log. NVDA's focus was not inside the page for this run (the page reported `document.hasFocus() === false`), so focus-change speech was not captured.

- **Ordinary autoplay:** a full 0 → 24s run after reload produced **no time announcements**. The log has **0** "Simulation time" / "NN / 24s" utterances from the page, compared with one per second on the public baseline.
- **End of run:** "Simulation finished at 24 seconds. 3 of 3 illustrative captures. Replay is available." (once per run).
- **Deliberate actions:**
  - "Replaying from the start."
  - "Paused at 12 seconds. Surface detail captured. 2 of 3 illustrative captures."
  - "Paused at 5 seconds. Context frame captured. 1 of 3…", "…20 seconds. Reviewer queue captured. 3 of 3…"
  - "Camera 02, Downward surface camera. Look closer at the surface. A downward view could…"
  - "Camera 01, Forward context camera. Keep the wider scene…"

**Short shared-UI regression (1366, candidate build):**
- `/` redirects to upload.
- An arbitrary file is rejected ("This clip has no prepared analysis…").
- The bundled demo navigates once to the survey at 10.07s.
- Reviewer plus Accept gives "1 accepted · 4 pending".
- Compare with $2,500 and Durable renewal: "$294.00–$2,294.00 for 3 work areas. Partial estimate…".
- The HTML export (intercepted) contains all five defects, the reviewer and "Durable renewal"; JSON saved.
- Upload, survey, collection, explore and plans all return 200.

## Findings

- **No regression and no new P1–P3.**
- **HUA-01 is still present (P3):** the first survey review decision is not announced. `SurveyWorkspace.tsx` is unchanged in this candidate, so the summary-bar status still uses `hidden={!notice}` on first use. See [HOSTED_UI_AUDIT](https://github.com/oliverchennn/Curb/blob/7409514bdc93f5c87b6882140c6cc4a540a1b1a3/docs/demo/HOSTED_UI_AUDIT.md).
- **HR-01 (P4, wording):** the pause announcement says "Paused at 1 seconds" when paused at one second. It comes from my `togglePlayback` template in `CollectionDemo.tsx` and needs singular/plural handling.

## Not tested

- **NVDA focus speech:** reading of focused callouts, sidebar buttons and the slider value on ← was not captured (only live regions).
- Context loss was not repeated at 1366; it was run at 390 only.
- **Reduced motion on the candidate:** passed on `d5c1f78`; the announcer and transport code are unchanged.
- Native 200% zoom, other browsers and readers, and touch hardware were not checked.
- The full baseline matrix was not repeated.
