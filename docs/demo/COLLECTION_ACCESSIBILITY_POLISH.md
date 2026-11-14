# Collection accessibility polish

`COLLECTION-ACCESSIBILITY-POLISH/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (approved Claude exception; no children) · 2026-11-14.

**Exact base:** `b010ad02ce9e0cb905e15e5c7c7109713814b36e` (`origin/main`). Branch `codex/collection-accessibility-polish`, new isolated worktree.

**Writes:** `src/features/curb/collection/CollectionDemo.tsx` and `collection.module.css` (+120/−47 together), plus this report. CollectionScene, StaticDiagram, simulation, explorer, survey, navigation, dependencies, data, media and hosting are untouched.

Read first: AGENTS.md, COLLECTION_ROBOT_BRIEF, COLLECTION_ROBOT_RESULT, COLLECTION_INDEPENDENT_QA and CURB_COMBINED_ACCEPTANCE.json.

## What was wrong (measured on the base production build)

1. **Time announced every second.**
   - The visible clock was an `<output>`, whose implicit status role is a polite live region.
   - During autoplay its text changed every whole second, a stream of unsolicited "NN / 24s" updates.
   - The slider's `aria-valuetext` used tenths of a second, so it changed each time the scene published time (every ~120ms in source).
2. **Sensor choice read the whole panel.** The sensor detail block was `aria-live="polite"`, so each choice re-read the eyebrow, heading, description and the "What still needs checking" text as separate changes.
3. **Capture cards hid their state.**
   - The aria-label "Inspect surface detail at 12 seconds" replaced the card content, so the visible Captured/Upcoming word was not exposed.
   - Below 1100px wide, the word was also `display: none`. That covers 960×540 and 683×384, i.e. 1920 and 1366 at 200%.
4. **Small or low-contrast key text** at 1366 and 1920:
   - Card time 10px at **4.32:1** and sensor number 11px at **4.49:1** (both under 4.5:1).
   - Slider and speed labels 10px, capture state 10px, "Simulation progress, not AI inference" 10px.
   - Mode hint 11px, limit text 12px.
   - The selected sensor and view borders were pale (#b8c8ae and #a7b99d on near-white).
5. **Focus dropped when a callout hid.**
   - The scene hides canvas callouts with `visibility: hidden` when their anchor isn't visible.
   - Repro: with Follow view, Tab to **CAMERA 01 Forward context camera**, then choose Side (or let the robot move in Overhead). Focus fell to `<body>`, so it wasn't trapped but it was lost.
   - The hiding lives in `CollectionScene.tsx` (read-only). See "Root follow-up".
6. **Small standalone targets:** "Try the real phone survey" 19px, footer links 18px, slider 20px (under 24px desktop and 44px at 390).

## Changes (two files)

**Timer:**
- The `<output>` is now `role="timer" aria-live="off"`. The visible "05 / 24s" is `aria-hidden`, with readable text "Simulation time 5 of 24 seconds".
- The slider's value text uses whole seconds and "N of 3 illustrative captures", so it changes once per second instead of per frame.
- The timeline is not hidden from assistive technology.

**One polite announcer** (`role="status"`, atomic, visually hidden) for deliberate actions only:

| Action | Announcement |
|---|---|
| Play | "Playing." |
| Pause | "Paused at N seconds. N of 3 illustrative captures." |
| Capture card | "Paused at 12 seconds. Surface detail captured. 2 of 3 illustrative captures." |
| Sensor, from the sidebar or a canvas callout | "Camera 02, Downward surface camera. Look closer at the surface. A downward view could…" (just the explanation, not the panel) |
| Static / 3D | "Static diagram shown. Scrub to move the illustration." / "3D scene shown, paused." |
| Replay | "Replaying from the start." |
| End of run, once | "Simulation finished at 24 seconds. 3 of 3 illustrative captures. Replay is available." |

Autoplay ticks and capture thresholds crossed during playback are not announced. The sensor panel's `aria-live` is removed.

**Capture cards:**
- The name is now identity, time, state and note, using the same word as the visible card: "Surface detail, 12 seconds, Captured. Illustrative crack. Seek here."
- It's computed from the same `seconds >= capture.at` threshold as the visible state and the count, so it updates on backward seeks.
- The visible state reads **✓ Captured** / **○ Upcoming** (word plus shape, the glyph `aria-hidden`), and now shows at every width.

**Focus rescue:** if a focused canvas callout becomes hidden, focus moves to the matching sidebar camera button (same sensor, same action) instead of `<body>`. This is done with a focusout/MutationObserver in `CollectionDemo.tsx`.

**Readability and contrast** (no new cards, paragraphs or vertical padding):
- Time 15px/600. Slider and speed labels 12px. Mode hint 13px.
- Sensor number 13px (6.66:1), sensor detail 15px, limit 14px. Card time 12px/600 (6.24–6.88:1), capture state 12px/700, count note 12px.
- Stage header 13px. Callout tag 11px. Sequence heading 17px.
- **All measured key text is now ≥ 6.2:1.**

**Selected states and focus:**
- Selected sensor: 2px #305e45 border plus bold. Selected view and mode: dark border plus bold. Captured cards get a stronger border.
- Focus: a 3px #1d4a34 outline with a soft amber halo.
- Standalone links and the slider are ≥24px tall on desktop. At ≤500px, the slider and footer links are 44px.

## Verified (production build, real API and media, Chromium in the Claude desktop built-in browser)

`npm run build`, then `next start` on 127.0.0.1:3014. Real key presses were used for the keyboard rows.

**Autoplay silence:**
- With the base build, the `<output>` text changed during autoplay.
- On the candidate, 4s of autoplay changed **0** live-region nodes.
- Playing from 4.6s across the 5s second boundary and the 5s capture threshold produced only "Playing." and, on my pause, "Paused at 5 seconds. 1 of 3…".
- The slider value text was "11 of 24 seconds; 1 of 3 illustrative captures" after a back step.

**Keyboard only (real keys):**
- From the last callout, Tab reaches **Pause simulation** (`:focus-visible`), and Space pauses it to "▶ Play".
- Enter on the **Surface detail** card gives 12 / 24s, count 2 / 3 and states ✓ Captured | ✓ Captured | ○ Upcoming. Its name is "Surface detail, 12 seconds, Captured…", announced, with focus kept.
- **← on the slider** to 11.9 gives count **1 / 3**, card 2 "Upcoming" in both the name and visible text, with value text matching.
- Tab/Enter on sensor **02**, then Space on **03**: each `aria-pressed`, the panel heading changes, the canvas callout `aria-pressed` agrees, and one explanation is announced each time.
- Enter on **Side**, then **Overhead**: `aria-pressed` moves, focus is kept.
- Enter on **Static diagram**: diagram shown, Play disabled, focus stays on the pressed button. Shift+Tab and Enter on **3D scene**: canvas returns, paused, focus stays.
- Tab from the heading reaches **Try the real phone survey ↗** (`:focus-visible`), and Enter opens `/curb/upload`.

**Focus rescue:**
- Follow view, focus the CAMERA 01 callout, choose Side: the callout hides and focus lands on the sidebar **Forward context camera** button (`:focus-visible`).
- Base behavior was `<body>`.

**End of run:** from 23.6s, Play runs to "↺ Replay". One end announcement, all three cards ✓ Captured.

**Reduced motion** (pane can't emulate the media query): I overrode `matchMedia('(prefers-reduced-motion: reduce)')` and remounted the page by client navigation.
- Entry: paused at 0.00 with the notice "Reduced motion: playback starts paused…".
- Sensor choice, card seek (to 12s), Static→3D and Overhead: the button stays **▶ Play**, time stays at 12.00 for 2s, and **autoplay doesn't restart**.

**Layout** (fresh load per size):

| Viewport | Overflow | Play at first load | Callouts (3 visible) | Captured/Upcoming visible | Targets under 24px (desktop) / 44px (390) |
|---|---|---|---|---|---|
| 1366×768 | none | bottom 665 ≤ 768 (base 666) | 0 overlaps, 0 outside the stage | yes (yes in base) | skip link only (shared) |
| 1920×1080 | none | 770 ≤ 1080 | 0 / 0 | yes | skip link only |
| 960×540 (simulated 200% of 1920) | none | 584 (base 585, below the fold in both) | 0 / 0 | **yes (base: hidden)** | skip link only |
| 683×384 (simulated 200% of 1366) | none | 729 (base 730) | 0 / 0 | **yes (base: hidden)** | skip link only |
| 390×844 | none | 799 ≤ 844 (base 789) | 0 / 0 | yes | skip link, brand (shared) |

- **200% zoom** was simulated by CSS viewport, not native browser zoom. D's QA recorded native 200% on the base.
- **Wide composition is kept:** at 1920 the stage is 1234×440 beside a 340px details column; at 1366 it's 945×338.

**Console errors:** 0 on the final build. `npm run check` on the final candidate exits 0, with typecheck, **26 files / 718 tests** and the production build.

**Screenshots** (actual rendered UI, git-ignored, main checkout `.curb-local/colla11y-shots/`):
- Before: `before-1366x768.jpg`, `before-1920x1080-12s.jpg`, `before-390-sequence.jpg`.
- After: `after-1366x768.jpg`, `after-1920x1080-12s-surface.jpg` (sensor 02 selected, ✓ Captured cards), `after-390-sequence.jpg`, `after-390-controls.jpg`.

## Screen reader: NVDA (added after the first RESULT)

**Setup:**
- **NVDA 2026.3.1** (AMD64) on Windows 11 Pro 10.0.26200.
- Page: the Claude desktop app's built-in browser (Chromium), with the pane visible and in front, and keyboard focus inside the page after Landau clicked into it.
- NVDA ran with `--log-level=12` (input/output), so every utterance was written to a log.
- Keys were real key events sent to the page. Speech below is quoted from that log, with the Claude app's own status messages left out.
- Production builds served locally: candidate `e4d2510` (same product bytes as the release under test) and the base `b010ad0` for comparison.

**Result: the intended behavior holds in NVDA.**

| Check | NVDA speech |
|---|---|
| **Base autoplay**, 12s with focus on the heading | "Simulation time" / "03 / 24s", "Simulation time" / "04 / 24s" … through "14 / 24s": **one announcement every second** |
| **Candidate autoplay**, 12s, 2.3s → ~17s, crossing the 5s and 12s captures | **nothing** |
| End of run | "Simulation finished at 24 seconds. 3 of 3 illustrative captures. Replay is available." (once) |
| Tab to Play / Replay, then Enter | "Collection visualization, region, Replay simulation, button", then "Replaying from the start." |
| Space during playback | "Play simulation", then "Paused at 4 seconds. 0 of 3 illustrative captures." |
| Tab to the capture list | "Simulated capture sequence, region, list, with 3 items, Context frame, 5 seconds, Upcoming. Sidewalk ahead. Seek here., button" |
| Enter on the 12s card | "Surface detail, 12 seconds, Captured. Illustrative crack. Seek here." (focused name updates), then "Paused at 12 seconds. Surface detail captured. 2 of 3 illustrative captures." |
| ← on the slider (12 → 11.9) | "Simulation progress, slider, 11 of 24 seconds; 1 of 3 illustrative captures" |
| Back to the 12s card | "Surface detail, 12 seconds, **Upcoming**. Illustrative crack. Seek here., button" (state follows the backward seek) |
| Tab, Enter on camera 02 | "02 Downward surface camera, toggle button, not pressed", then just the explanation: "Camera 02, Downward surface camera. Look closer at the surface. A downward view could…" |
| Enter on Static diagram, then Shift+Tab, Enter on 3D scene | "Static diagram, toggle button, not pressed" → "pressed" → "Static diagram shown. Scrub to move the illustration."; then "3D scene, toggle button" → "pressed" → "3D scene shown, paused." |
| Focused CAMERA 01 callout hidden by switching to Side | "CAMERA 01Forward context camera, toggle button", then after the hide "Proposed sensors, complementary landmark, Choose a camera, grouping, 01 Forward context camera, toggle button": focus is rescued and announced |

**Observations (not blockers):**
- After choosing camera 02, NVDA spoke the pre-press state ("not pressed") before the explanation and didn't re-speak "pressed". The pressed state is exposed (verified by `aria-pressed`); the explanation simply takes the speech.
- The canvas callout's name runs words together: "CAMERA 01Forward context camera". The two parts are separate spans in `CollectionScene.tsx` (read-only for me). Root follow-up: add a space or separator in that name.

**Evidence** (git-ignored, main checkout `.curb-local/`):
- `nvda-speech-2.log`: the full NVDA input/output log.
- `nvda-collection-excerpt.log`: speech lines only, 181 lines.

After the run, NVDA was restarted with its normal settings (no speech logging).

**Scope of this acceptance:** one screen reader (NVDA), in Chromium inside the Claude desktop app. JAWS, VoiceOver, Narrator, Firefox and Safari were not tested. Browse-mode reading of the whole page was not exhaustively reviewed; the checks covered the task's specific flows.

## Not verified / limits

- **Other screen readers and browsers:** see the NVDA scope above.
- The pane's animation frames were throttled (about 1.5/s), so the scene advanced slowly. Timing claims are functional, not frame-rate.
- Native 200% zoom, a projector, Safari or Firefox, and touch hardware were not checked.

## Root follow-up (outside my two files)

**`CollectionScene.tsx`** sets `visibility: hidden` on a focused callout. My rescue moves focus to the sidebar equivalent, but the cleaner fix belongs in the scene. Two options:
- Keep the focused callout visible (and its leader hidden) until it blurs.
- Or skip hiding when `document.activeElement` is that callout.

Proposed scope: `CollectionScene.tsx` only, a few lines near the visibility update. In the same file, separate "CAMERA 01" from the camera name in the callout's accessible name (NVDA reads "CAMERA 01Forward context camera").
