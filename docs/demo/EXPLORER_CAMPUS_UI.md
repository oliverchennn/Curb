# Route explorer: Princeton campus UI

Task CURB-CAMPUS-EXPLORER-UI/1. Developer C (Landau), session `06a135c3-65bb-4de0-b273-9d48ab953221`, no children.

- **Branch:** `codex/campus-explorer-ui`, from the merge owner's exact base `bb9093c71ce9ae7c2114e61e4e6e64f1805f3e92`.
- **That base contains:** PR #12 `bd84a4c`, root's aerial bundle `0ba4535` and D's data `cde54e6`. No cherry-picks were needed.

## What changed

| Before (base) | After |
|---|---|
| 27 collection chips: the 5 originals plus 22 campus sections | **4 group chips**: Downtown archive · Campus (OSM) · Robertson field · Examples. Downtown keeps its 3 sub-chips. All 5 original IDs and links are unchanged. |
| A campus section opened like any collection, with up to 63 numbered stops, 63 tab stops and every badge forced on screen | **Campus opens on an overview**: all 1,188 ways drawn as 22 aggregated section paths, with 22 section boxes as the only targets and zero stop markers |
| No way to browse 22 sections | **"Campus section"** native select, plus ‹ › and **Back to campus overview** |
| Every stop tabbable | **One roving tab stop** for map stops (and for section boxes). ←/→/↑/↓ move focus in source order, Home/End jump, Enter/Space selects, Esc returns to the map. Arrows on the map background still pan. |
| Dense badges stacked with long leader lines | **Density badges**: in campus sections a badge with no free spot is omitted and counted ("N stop numbers hidden… every way stays drawn"). The selected stop's badge is never hidden. Geometry is never moved. |
| DVRPC-only attribution | **Visible OSM credit** ("Map data © OpenStreetMap contributors · ODbL", linked to the copyright page) in the map corner wherever OSM is drawn, and in the footer |
| One corridor aerial | **Per-group imagery**: downtown keeps the corridor image; campus uses root's overview plus 16 detail tiles, with failures tracked per image |

**Record card** for OSM ways:
- "Source class: Steps / Footway / Path / Cycleway (OpenStreetMap tag)";
- "Source edit: … · OpenStreetMap edit time, not an observation";
- a "Source tags" box (not "Archive metadata", and no longer saying DVRPC).

Source capture and Observed stay Unknown; Retrieved is shown separately. Steps draw with a distinct dotted line and have their own legend entry.

**Imagery rules:**
- The campus overview image always loads.
- Detail tiles load only when the screen resolution exceeds the overview's (×1.25), and only tiles intersecting the visible box.
- A failed tile is dropped with a notice, and the overview stays beneath it.
- If a base image fails, the map switches to Diagram.
- Rasters are placed through the existing `project()` with `preserveAspectRatio="none"`.
- The zoom-out cap is derived from the content (at least 4× the collection fit) instead of a fixed 1,200 units.

**URL state:**
- New `?group=campus` opens the overview; `collection` and `record` are omitted while it's open.
- `?group=campus&collection=<campus section>` opens that section.
- Old `collection` / `record` / `type` / `q` / `panel` links parse unchanged.
- The stage waits for the URL to be read, so a campus link never first requests the downtown image.

**Search:** `way/123…` (the OSM form) matches the feature key `campus-osm-way:123…`.

## Files

All in `src/features/curb/explore/`:
- **New:** `groups.ts`, `campus.ts`, `AerialLayer.tsx`, `OverviewMap.tsx`, `SectionPicker.tsx`, `OsmCredit.tsx`, `campus.test.ts`.
- **Changed:** `Explorer.tsx`, `CollectionCards.tsx` (now `GroupChips` + `CollectionChips`), `MapCanvas.tsx`, `EvidenceStage.tsx` (passes map options), `Evidence.tsx`, `aerial.ts`, `labels.ts`, `location.ts`, `Explorer.module.css`.
- **Tests:** `model.test.ts` and `aerial.test.ts`. Only the two stale global-count assertions (and my aerial test's "three archive collections") were scoped to the original DVRPC archive; nothing was deleted.

Also: this report and screenshots in `public/curb/explore/v4/`.

**Read-only and untouched:** `archive.json`, `data.ts`, `model.ts`, D's data and importer, both aerial folders, survey/navigation/API/config/dependencies.

## Verification (actual browser, production build)

Chromium in the Claude desktop pane, against `next start` of this worktree on port 3022, with viewports emulated at 1366×768, 1920×1080 and 390×844. Screenshots were downscaled by the pane.

| Check | Result |
|---|---|
| Join | 1,188 campus features join through 22 sections exactly once, 0 duplicates, largest 63 (unit test `campus.test.ts`). The overview's aggregated paths contain 1,188 subpaths. |
| Overview at 1366 | 4 groups, Campus pressed. 22 section targets, **1 tab stop**, **0** `[data-feature]` markers. Heading: 1,188 ways · 22 sections · 62 steps · 27 cycleways · width tag on 22 · wheelchair tag on 1 · Current traversal: Unknown. OSM credit in the map corner and the footer. |
| Startup image requests | `?group=campus` loads **only** `overview.jpg` (4,328,282 bytes per manifest). No downtown image and no tiles. (Before the URL-ready fix, the downtown image was also requested; fixed.) |
| Close zoom across a tile corner | At 4.9 px/unit, exactly 4 of 16 tiles requested (`tile-1-1`, `1-2`, `2-1`, `2-2`; 10,748,032 bytes). The whole bundle is 50.4 MB, so far from all of it at startup. Densest section C13 at its default fit: 2 tiles (6,378,228 bytes). |
| One detail-tile failure | Forcing `tile-1-1` to a missing file shows "1 detail tile unavailable — the overview image is shown there." The overview stays, the other 3 tiles stay, and the map stays on Aerial. |
| Densest section C13 (63 ways) | 63 ways drawn, 1 tab stop, 42 numbers shown and 21–22 hidden with the visible count at 1366 (39 hidden at 390). Steps way styled distinctly. |
| Roving keyboard (real keys) | Overview: Tab → first section, → ×12 → C13, Enter opens it. Section: Tab → Stop 1, → → → Stop 3, Enter selects (URL and details update), Esc → map. |
| Detail close | Details show source class and OSM edit time. × returns focus to the details toggle (merge owner's PR #12 behavior kept). |
| Picker, ‹ › and Back to overview | Select C01 updates the URL; › goes to the next section; Back sets `?group=campus`. |
| Source search | `way/284117254` finds 1 of 1 in C13 under the Campus group. Clear filters returns to the overview. |
| Deep link and Back | `?collection=campus-east-b&record=…284117254&panel=evidence` restores the section, the selected way and open details. Navigating to /curb/collection then Back restores the exact URL and selection. |
| Reset demo (B's button, real click) | `/curb/explore?collection=witherspoon&record=record%3Alines%3A889957`: Downtown group, Witherspoon, details closed. |
| Old five collections | witherspoon, nassau-east and nassau-west use the Downtown group with the corridor aerial. robertson shows the photo stage; examples shows the equal conflict pair. None shows an OSM credit. |
| 390×844 | `scrollWidth` 390; 0 overflowing elements; every control in main at least 44px (overview and densest section). |
| 1920×1080 | Section map plot 1254×772 with details open; no overflow. |
| Network | Only local requests. The only console error was my deliberate missing-tile 404. |

**Checks:**

| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx vitest run src/features/curb/explore` | 52 passed (10 new campus tests) |
| `npm run check` (on this exact source) | typecheck pass; **780 passed, 1 failed**; build not reached |

**The one failure is pre-existing on the base, not caused by this change.** `src/data/curb/princeton-campus/importer.test.ts` › "pins the retained source snapshot…" expects SHA-256 `47338cae…` and receives `cc5cf9ea…`. It fails identically with my changes stashed on clean `bb9093c`. This looks like Windows line-ending conversion of D's hashed JSON on checkout (`core.autocrlf`). It's D's read-only file, so I'm reporting it, not changing it. `npm run build` passes separately.

## Honest limits
- Chromium emulation only; no physical phone or screen reader.
- Section codes in dense central campus can sit close together at whole-campus fit. They go through the same collision placer (a hidden code is counted, and every section stays in the picker).
- The 2020 imagery can predate newer paths. Geometry is never bent to match it.
- `verify_browser.py` (the merge owner's maintained verifier) was not updated for the group chips.
- I did not run the replay regression checks named in the assignment. Survey and replay files are untouched, and the full unit suite (which includes the replay tests) passed apart from the importer hash test.
- Campus sections are browsing groups of source geometry, not routes, official boundaries or traversal claims. Current traversal is Unknown everywhere.

**Screenshots** (`public/curb/explore/v4/`):
- `1366-campus-overview.jpg`, `1366-densest-section-details.jpg`, `1366-close-zoom-tile-failure.jpg`
- `1920-densest-section-details.jpg`
- `390-campus-overview.jpg`, `390-densest-section.jpg`
