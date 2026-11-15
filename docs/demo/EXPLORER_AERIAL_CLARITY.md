# Route explorer: map-first aerial clarity

Task CURB-EXPLORER-AERIAL-CLARITY/1. Developer C (Landau), session `06a135c3-65bb-4de0-b273-9d48ab953221`, no children.

- **Branch:** `codex/explorer-aerial-clarity`, from accepted main `fd697515eecc6e4ba3f8259f7e8cd8b05f78d256`.
- **Aerial assets:** root's commit `0bf88c66730b9d2f54a54665af8826120aeaba78` is cherry-picked here as `decb5c5` (four files under `public/curb/explore/aerial/`, unchanged). My UI work is the commit after it, so integrate only that commit if the assets are already on the integration branch.

## What changed

The user said the explorer still looked like a confusing diagram. The page is now **one dominant aerial map** with **one compact collection selector**. Details open on demand.

| | Before (main `fd69751`) | After |
|---|---|---|
| Desktop layout | Three permanent columns: collection cards, stage, evidence drawer | One map; a 340px details column appears only when asked ("Show details" or selecting a stop) and can be hidden again |
| Collection switching | Five tall preview cards in a side rail | Five compact chips in one row (one click; arrow keys move between them; full counts in each accessible name) |
| Search / type filter | Always-visible toolbar | "Filter" disclosure; opens automatically when a filter is active |
| Map background | Gray diagram only | **Aerial (default) / Diagram toggle**; the NJ OGIS 2020 orthophoto is placed through the existing `project()` |
| Map plot, 1366×768 | 730×321 | **1265×484** with details hidden (stage 578px tall); 1164×686 when the pane widens |
| Map plot, 1920×1080 | 1009×534 | **1254×766** with details open |
| Map plot, 390×844 | 356×295 | **356×484** |
| Record reel | Strip of 12 tiles under the map | Compact navigator: `‹ #07 title · type/status · date · 7/10 ›`; the full source-order list is under "All N records" in details |
| Legend | Permanent two-line block | One-line key; the prose and aerial provenance are under "Map key & sources" |
| Repeated text | Intro paragraph, note line, record counters in several places | One short intro line, one counts line, one "Current traversal: Unknown" |

**Also added:**
- **Overlapping stops:** number badges are offset in screen space, with thin leader lines back to the true anchor. The geometry never moves. A badge also never covers another stop's ramp marker.
- **Selected stop label:** the selected stop is labelled on the map with a halo, and the label flips left near the right edge.
- **Street labels:** these are orientation labels and are now placed beside the archive lines that carry each street. The old fixed diagram positions put "WITHERSPOON ST" on a parallel street and "NASSAU ST" on a campus building over the aerial.
- **Tab order:** map stops now tab in stop-number order.

## Aerial context, as root specified

- **Placement:** the image spans `project([west,north])` to `project([east,south])` with `preserveAspectRatio="none"`. The unit test matches root's `projectionCheck` to 6 decimal places.
- **Coverage:** every located vertex in all three archive collections is inside the image bounds (tested).
- **Labelling:** the corner credit reads "Aerial 2020 · NJ Office of GIS". "Map key & sources" gives:
  - the attribution;
  - capture year 2020, with exact capture date Unknown;
  - Retrieved date, kept separate;
  - the note that this is context only, not a field observation or evidence of passability;
  - the source link.
- **Over the aerial:** the gray context lines are hidden, and markers get white casings.
- **If the image fails:** the map switches to Diagram with "Aerial image unavailable — showing Diagram. Every record is unchanged." The Aerial button is disabled, and every stop and the tray stay.
- **Offline:** no remote calls, keys, libraries or screenshots of other map services. The image is the local JPEG.

## Files

All in `src/features/curb/explore/` unless noted:
- **Rewritten:** `Explorer.tsx` (URL-state effects verbatim), `MapCanvas.tsx`, `CollectionCards.tsx` (now chips), `Explorer.module.css`.
- **New:** `aerial.ts`, `labels.ts`, `aerial.test.ts`.
- **Unchanged:** `archive.json`, `data.ts`, `model.ts`, `location.ts`, `Evidence.tsx` and `EvidenceStage.tsx`.
- **Outside explorer:** screenshots in `public/curb/explore/v3/` and this report. No survey, navigation, contracts, domain, API, catalog, global CSS or config writes.

## Verification (actual browser, production build)

Chromium in the Claude desktop browser pane, against `next start` of this worktree on port 3021, with viewports emulated at 1366×768, 1920×1080 and 390×844. Screenshots were downscaled by the pane; the page was laid out at the emulated viewport.

**Layout:** no horizontal overflow at any size (`scrollWidth` 1351 at 1366, 1905 at 1920, 390 at 390).

**Alignment:** all three archive collections line up with visible streets in the aerial. The Witherspoon chain runs along Witherspoon Street; Nassau east and west crossings sit on painted crosswalks.

**Toggle and fallback:**
- Diagram shows 46 context lines and no image, with `aria-pressed` swapped.
- Breaking the image source triggers the Diagram fallback and notice. The Aerial button is disabled, and all 7 stops and "Not on the map (3)" stay.

**Records:**
- **Unplaced:** never drawn (0 `unplaced:*` features), with the tray count always visible.
- **Robertson:** 348px photo frame, "Record 01 · Actual clip frame · location not yet placed", clip button, and the `?finding=defect-01` survey link.
- **Examples:** equal conflict pair (443 / 443).

**Filters and links:**
- Search `zz-no-match` shows the empty state and 0 chips; "Show the complete atlas" restores 5 chips and the URL.
- Deep link `?collection=nassau-west&record=record%3Aramps%3A577885` restores the selection.
- `panel=evidence` opens details; selecting a stop on the map sets it.

**Keyboard (real key presses):**
- Chip → → Enter selects Nassau west.
- Tab order: chips → Filter → Zoom in / Zoom out / Fit collection / Fit selection → Aerial / Diagram → map → Stop 1 → Stop 2 → ….

**Click targets:**
- At 1366, none of the 13 ramp markers across the three collections is covered by another stop's badge; the one remaining hit is stop 5's own leader line, which is now click-through.
- At 390, every control is at least 44px; the "Imagery source" link was fixed to 44px.

**Offline:** 16 resources, 0 external. The aerial is served locally.

**Console:** no product errors. The only 404 was my deliberate broken-image test.

**Checks:**

| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx vitest run src/features/curb/explore` | 41 passed, including 7 new aerial and badge tests |
| `npm run check` | exit 0; 29 files / 758 tests; build compiled, `/curb/explore` static |

**Screenshots** (`public/curb/explore/v3/`):
- `1366-default-page.jpg`, `1366-witherspoon-aerial.jpg`, `1366-nassau-west-badges.jpg`, `1366-nassau-east-assumed-details.jpg`
- `1920-nassau-east-details.jpg`
- `390-nassau-west-aerial.jpg`, `390-field-details.jpg`

## Honest limits

- **Browser:** Chromium emulation in the desktop pane, not Google Chrome or a phone. No screen-reader pass.
- **Street labels:** orientation only, placed beside the archive lines. They are approximate; each label's text halo keeps it readable.
- **`verify_browser.py`:** the maintained explorer verifier, in my path but not rewritten. It still targets the old three-panel names (mobile "Stage"/"Collections"/"Evidence" tabs and "Open selected evidence"). Kept: "Previous/Next snapshot", "Clear filters", "Show the complete atlas", "Zoom in/out", "Fit collection". I'm leaving the selector update to the merge owner, as before.
- **B's reset:** not exercised here; B's reset is not on this base. The explorer keeps all its state in the URL (`collection`, `record`, `type`, `q`, `panel`) and has no local storage, so a reset that clears the query string restores the defaults.
- **Cherry-pick:** this branch includes root's asset commit as `decb5c5`. Don't integrate the assets twice.
