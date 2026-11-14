# Final UI delta

`CURB-FINAL-UI-DELTA/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (no children) · 2026-11-14. Assignment [6885402480](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885402480), ACK [6885424321](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885424321).

**Source:** exact **`9ef771bfce52064750d024abef1094115ff04e17`** (product correction `67bf3b5`). Branch `codex/final-ui-delta`; sole tracked write is this report.

**Build and browser:** `npm ci` and `npm run build` (exit 0), then `next start` on 127.0.0.1:3017. Chromium in the Claude desktop app's built-in browser. **NVDA 2026.3.1** with input/output logging (`.curb-local/nvda-delta.log`, git-ignored). Real key events where noted. No deploy and no alias change.

**Delta reviewed** (since `0cd2cd4`):
- The survey status region is always mounted with `aria-atomic`.
- 44px targets in plans, trips, explore and survey-replay.
- The replay overlay is renamed "Start survey playback".
- The legacy map gets bounded pan buttons and keyboard arrows, +, − and Home.
- Mobile brand is 44px.

## Results

| Check | Result |
|---|---|
| **HUA-01: first Accept** (fresh load, real Enter, NVDA focus in the page) | **Pass.** NVDA: "Accepted “Defect 01 · Transverse crack”." |
| **First Reject** (separate fresh load) | **Pass.** "Rejected “Defect 01 · Transverse crack”. It stays in the record and is excluded from plans." |
| Later decision, then Restore | **Pass.** "Accepted “Defect 01…”." then "Restored the original analysis. All review edits were discarded."; summary back to 5 pending |
| Status region before first use | `hidden=false`, `aria-atomic=true`, empty |
| **HUA-05: legacy `/curb` map** | **Pass, with FUD-01 below.** All seven controls are 44×44 (Reset 64×44). Pan buttons are disabled at 1×. At 3×, sweeping the pan grid brings **all 15 features fully into view** at some position. Each direction clamps (left 10, right 20, up 9, down 18 steps). Reset map view and Home restore the original geometry exactly. Keyboard + + + ← ← ↑ on the focused map changes the view; help text is linked. |
| HUA-04: survey-replay | **Pass.** Overlay "Start survey playback" plus control "Play survey" (distinct names). Seek is 44px; seeking to 10.5 gives video at 10.50. Play advances (label "Pause survey"), Pause stops. Step 2 "Compare repairs" sets `aria-current=step` and clears step 1. |
| HUA-03: plans | **Pass.** **All 7** "View evidence" buttons are 44px and resolve their barrier IDs (link-a-curb, link-b-crate, hall-surface, studio-shortcut-crate). Trips "Planning assumptions" summary is 44px. |
| HUA-06: explore Previous/Next at 390 | **Pass** (no longer flagged under 44px) |
| Overflow and targets, 1366 and 390 (`/curb`, trips, plans, explore, survey-replay, survey, upload) | **No overflow.** Under target: shared skip link only at 1366. At 390, `/curb` scenario **Reset 74×42** and survey-replay **repair toggles 99×38** (×3) remain. |
| Synthetic outcomes unchanged | **Pass.** Plans: $0/$2 → 0, **$4 → best 2 vs condition-first 1**, $8 → 3. Trips: arrival → library Blocked, then Reachable with Add library ramp; studio Unknown; archive Disconnected. |
| Real survey export (candidate API) | **Pass.** PDF 200, 13 pages, all 5 defects, "Overall ADA compliance undetermined". HTML 200, 348,384 B, all 5 defects, plan "Your budget". |

## Findings

**FUD-01 (P3, keyboard): focus drops to `<body>` at the map limits.**
- **Repro:** on `/curb`, focus **Zoom in map** and press Enter ×8 (real keys).
- **Result:** at 3× the button becomes `disabled` and `document.activeElement` is `<body>`. The same happens on **Pan map left** after the left limit (Enter ×12), and applies to every pan and zoom button that disables at its bound.
- **What still works:** the next Tab continues ("Pan map right"), so focus isn't trapped, but there's no visible focus at the limit.
- **Fix:** use `aria-disabled` with a guarded handler instead of `disabled`, as was done for survey review buttons (ST-C-01). Scope: `modules/maps/src/components.tsx`.

**FUD-02 (P4): remaining sub-44px targets at 390.**
- `/curb` scenario Reset is 74×42.
- survey-replay repair toggles ("Current conditions", "Repair surface crack", "Repair raised slab") are 99×38.

**HR-01 (P4, from the hardening report) is still open:** "Paused at 1 seconds" wording in `CollectionDemo.tsx`.

## Not tested

- NVDA focus speech for the new map controls.
- Legacy map pan at 390 (sizes only).
- Native video control-bar buttons on survey-replay (I used the page's own Play control).
- Native 200% zoom, other browsers and readers, touch hardware.
- No full-site rerun, as assigned.
