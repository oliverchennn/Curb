# Route explorer v2: implementation result

Task CURB-EXPLORER-IMPLEMENTATION-V2/1. Developer C (Landau). Branch `codex/explorer-implementation-v2`, exact base `16f5444ace90422cac3ef32548ec35b9bed9fc1f`.

## Scope kept

Changed only the assigned paths. Everything below is in `src/features/curb/explore/`:

| File | Change |
|---|---|
| `Explorer.tsx` | Rewrote the layout. The URL-state effects (`readExplorerLocation` / `explorerLocationUrl`, `replaceState`, `popstate`) are unchanged. |
| `MapCanvas.tsx` | Numbered stops, ASSUMED marker, legend, Fit selection, floating tools. |
| `Evidence.tsx` | Stop/record tag, "Archive metadata" row, `?finding=` survey link, optional `hidePhoto`. |
| `Explorer.module.css` | v2 layout. Dead v1 rail/summary rules removed. |
| `model.ts` | Adds `coverage`, `stopNumbers`, `archiveStatus`, `archiveAttributes`. `fitFeatures` gains optional `pad` / `min` arguments; the defaults are unchanged. |
| `model.test.ts` | Four new tests for the helpers above. |
| `EvidenceStage.tsx` (new) | One stage with map, photo, conflict and empty modes. |
| `CollectionCards.tsx` (new) | Overview cards. |

Also new: this report and `public/curb/explore/v2/` (screenshots only).

Not touched: `archive.json`, `data.ts`, `location.ts`, survey files, the backend, the shared shell and any B/D path. No dependencies were added, no new data or geometry was invented, and no external requests are made.

## Before and after composition

| | v1 (base) | v2 |
|---|---|---|
| Left column | Text list of collection names and subtitles | Cards with a preview, "Inspect …" and full-collection counts |
| Centre | Small map (≈715×236 plot at 1366×768), coverage line, collection note, 176px snapshot strip | **Evidence stage** that changes by collection kind (below), then a reel of numbered records |
| Archive collection | Unnumbered features; ASSUMED ramps looked the same as EXISTING | Numbered stops in source order, a dashed hollow marker for ASSUMED, a legend, and a "Not on the map (n)" bar |
| Field collection | "Locations unknown" placeholder in the map area; photo only in the drawer | Large photo with bounded zoom/pan, an on-request clip and the approximate site inset |
| Synthetic collection | Conflict pair squeezed into the 300px drawer | Pair at equal size across the stage, with a "no winner" banner |
| Right column | Record card; the survey link opened the default finding | Record card with stop tag, archive metadata row and a `?finding=<id>` deep link |
| Workspace height | `clamp(740px,80vh,900px)` | `clamp(640px,100dvh − 24px,900px)`; the stage is sized to the viewport |

Measured map plot (the SVG itself), actual browser:

| Viewport | v1 | v2 |
|---|---|---|
| 1366×768 | 715×236 (root's measurement on the checkpoint) | **730×321** with the tray collapsed; 730×267 with it open |
| 1920×1080 | n/a | **1009×534** |
| 390×844 | n/a | **356×295** |

## Evidence rules held

- **Stop numbers** are each record's index in the collection's source `recordIds`.
  - They stay stable under filtering: the test filters by `957434` and Nassau west keeps #03.
  - The legend says "Numbers follow source order, not travel."
  - Field reel copy is "Source order · not a walking route", per root note 6885911490. Field ordinals read "Record NN", never "Frame NN", because defects 01–05 sit at 7, 9.5, 12, 6 and 13.9s.
- **ASSUMED ramps.** The archive has exactly three: `ramps:478465` (Nassau east #07), and `ramps:501839` and `ramps:577885` (Nassau west #07 and #08).
  - Each draws as a hollow ring with a dashed stroke, `data-status=ASSUMED`.
  - Each accessible name ends "archived status assumed".
  - The legend distinguishes "Ramp · archived EXISTING" from "Ramp · archived ASSUMED".
  - The metadata row says "From the DVRPC archive snapshot. Not a field observation, current condition or passability."
  - `ada_comp` / `dws` are never shown (unit-tested).
- **Unplaced records are never drawn.**
  - The tray lists them with their stop numbers. It is collapsed by default with the count always visible, and opens automatically when an unplaced record is selected from the reel, the URL or the list.
  - Field and synthetic records show "location not yet placed".
  - The Robertson inset is captioned "Approximate SITE only: one phone GPS tag. Defects are not placed on this map."
- **Conflicts.** Both synthetic records render at equal width (337px / 337px at 1366). The banner reads "Neither is treated as current; no winner is selected."
- **Coverage counts** always cover the full collection, never the filtered list. When a filter hides records, the stage says "n match the filter. Show all N".
- **Dates and traversal.** Every date label is one of Observed, Photo captured, Source capture or Retrieved, with "Unknown" when missing. "Current traversal: Unknown" stays in the stage header and every record card.

## Root review notes folded in

| Note | Fix | Verified |
|---|---|---|
| 6885911490 (1): field order wording | "Source order · not a walking route"; "Record NN" ordinals | DOM text at 1366 and 390 |
| 6885911490 (2): clip cleanup read a ref React may have cleared | The effect captures the `<video>` element and pauses that element on cleanup. A `ResizeObserver` also pauses it when the Stage is hidden by CSS. | See media lifecycle below |
| 6885934168: plot barely grew (715×236) | Map tools float over the plot; the unplaced tray became a compact expandable bar; the legend got the full width | 730×321 at 1366×768 |
| 6885934168: hidden mobile video kept playing | Same `ResizeObserver` | 390×844: Stage → Evidence gives `paused=true`, 0 client rects; Stage → Collections also gives `paused=true` |

## Verification (actual browser, production build, port 3019)

Run in the Claude desktop browser pane (Chromium) against `next start` of this worktree. The 1366 and 1920 screenshots were downscaled by the pane to 800px wide; the page itself was laid out at the emulated viewport (checked with `innerWidth`).

**Screenshots** (`public/curb/explore/v2/`):

| Width | Files | Shows |
|---|---|---|
| 1366 | `1366-archive-assumed.jpg` | Nassau west, ASSUMED #07 selected |
| 1366 | `1366-archive-tray-open.jpg` | Unplaced tray open |
| 1366 | `1366-field-before.jpg` | Defect 01 at 100%, before selecting a frame |
| 1366 | `1366-field-after-zoom-clip.jpg` | Defect 03 selected, 200% zoom, clip open |
| 1366 | `1366-conflict-equal.jpg` | Equal conflict pair |
| 1366 | `1366-filtered-empty.jpg` | Filtered-empty state |
| 1920 | `1920-archive-assumed-selected.jpg`, `1920-field.jpg` | Archive and field stages |
| 390 | `390-stage-map.jpg`, `390-tray-open.jpg`, `390-collections.jpg`, `390-field-clip.jpg`, `390-evidence.jpg` | Every mobile panel |

**Checks:**

- **Coverage counts.** Witherspoon 8/7/1, Nassau east 10/7/3, Nassau west 12/9/3, Robertson 5/0/5 with 5 photos, Examples 2/0/2 with 2 in conflict. They match the unit tests.
- **Field selection.** Choosing Robertson switches the stage to photo mode with the 720×235 close-up at 100%. Selecting defect 03 updates the badge to "Record 03", the URL and the drawer.
  - The `+ + ArrowLeft ArrowUp` key sequence gives 200% and `translate(12%, 12%)`.
  - Twelve more ArrowLefts and twelve more `+` clamp at the limits: 400%, and Zoom in becomes `aria-disabled`.
  - `0` resets the view.
  - The photo buttons keep focus at their limits (`aria-disabled`, never `disabled`).
- **Media lifecycle.** The clip seeks to the record's time (8.55s after a 1.5s play from 7.0s). It pauses in every one of these cases:
  - Close clip
  - Selecting another record (the element unmounts)
  - Selecting another collection
  - The mobile Stage being hidden by the Evidence or Collections tab
  - Client navigation to `/curb/collection`
- **Broken media.** Forcing the stage image to a missing file shows "Photo unavailable — the local file could not be loaded. This record is unchanged." The badge, drawer, clip button and selection are kept, and zoom is dimmed.
- **Filtered-empty recovery.** Query `zzzz-no-match` (and `no-such-ramp`) shows "No matching evidence … Nothing has been removed." "Show the complete atlas" restores all 5 cards and the map stage. The URL drops `q`; collection and record are kept.
- **Exact URL restoration.**
  - Direct load of `?collection=nassau-west&record=record%3Aramps%3A577885&panel=map` restores the pressed card, the pressed map feature and the drawer.
  - Collection → record → `type=field` → `panel=evidence` → nav away → Back restores `?collection=robertson&record=record%3Arobertson%3Adefect-04&type=field&panel=evidence` exactly, with the same card, reel selection, filter and badge.
- **Keyboard (real key presses).**
  - On the cards, ↓ ↓ Enter selects Nassau west with focus kept on the card.
  - On the map, → pans, Home re-fits exactly, and Tab Tab Enter on a stop selects `lines:957434` and updates the URL and the status text.
  - The tool's real-key path sends an empty `key` for `+`/`−`, so map zoom keys were checked with dispatched `KeyboardEvent`s instead (zoom in 45.8 → 34.4, out to 61.1). The Zoom in button keeps focus.
- **390px targets.**
  - Every button, link, summary and input in the Stage, Collections and Evidence panels is ≥44px tall, apart from map stop hit areas (now 34px line and 40px point targets, each with a ≥44px reel equivalent).
  - The "Open original source site" link was fixed to 44px.
  - No horizontal page scroll at 390.
- **Offline.** All 32 resource requests went to the local origin, with 0 external. Media served: `defect-01…05.jpg`, `site-context.svg`, `survey.mp4`. The console had no errors.
- **Accessibility tree (text, not a screen reader).**
  - Cards: "02 Nassau / east crossing. Aerial or archive record. Inspect 7 mapped archive features. 10 records, 7 on map, 3 not on map." plus `aria-pressed`.
  - Stops: role button, "Stop 7: Eastward archive endpoint, ramps:478465, archived status assumed".
  - Reel: "Record 7: Eastward archive endpoint. Ramp · ASSUMED. Source capture: Unknown."
  - Photo frame: "… Photo inspection: plus and minus zoom, arrow keys pan, 0 resets."
  - The legend is a `note`, and the `status` region announces the selection.

**Commands:**

| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx vitest run src/features/curb/explore` | 34 passed |
| `npm run check` (typecheck, `npm test`, `npm run build`) | exit 0; 28 test files, 751 tests passed; build compiled, `/curb/explore` static |

## Known limits (honest)

- **NVDA was not run** for this implementation; only the browser accessibility-tree text above was checked. An NVDA pass needs a person at the keyboard.
- **Map stop Tab order is drawing order** (paths, then ramps), not stop order. Re-ordering the SVG would let line hit areas cover ramp targets. The map's label says so, and the reel is the source-order keyboard path.
- **Overlapping stops.** At "Fit collection", a few stops overlap where the archive has coincident or very short features: Nassau west's #02 (a 4m corner link) and #07 sit under #06 at both 1366 and 390. Zoom or Fit selection separates them; nothing is moved or invented.
- **`verify_browser.py` is read-only for C.** It still targets the old tab name "Map & snapshots" (now "Stage") and the old card link "Review Robertson survey" (now "Review this finding in the survey"). I kept "Clear filters" and "Previous/Next snapshot". Root said it will reconcile the selectors.

## 85-second demo

1. **0–10s.** "Route explorer: five collections. Each card says what you can inspect and how much of it is on the map." Point at the counts.
2. **10–30s.** Click **Nassau / west crossing**.
   - "The stops are numbered in source order, not travel order. The legend says so."
   - Click stop **7**. "This ramp is archived ASSUMED: dashed and hollow. The metadata row says it is an archive label, not current condition."
3. **30–40s.** Open **Not on the map (3)**. "These records have no verified position, so they are listed, never drawn."
4. **40–60s.** Click **Robertson Hall**.
   - "Actual frames from the supplied clip." Zoom with **+** and pan with the arrows.
   - **Play clip from 0:12.0**, then **Close clip**: it stops.
   - "The inset is only the approximate site. Defects are not placed."
5. **60–70s.** Click **Evidence examples**. "When two records disagree, both appear at equal size and no winner is picked."
6. **70–85s.** Search `no-such-ramp`, then **Show the complete atlas**.
   - Copy the URL, open another page, press **Back**: the same collection, record and filter return.
   - "Current traversal stays Unknown everywhere."
