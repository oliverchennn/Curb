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

## Vincent successor: reconciliation

- Landau’s exact release is `50484d26738d50a588bbe1d954f32034d8fe6d1b` from `bb9093c71ce9ae7c2114e61e4e6e64f1805f3e92`. The six captures and original report above remain Landau’s evidence.
- Corrected integration base `a561892fc443e2c87eddb3676fccbac70c31ee23` contains both PR12 fixes. The successor fast-forwarded to the merge owner’s explicitly approved `5e86dd95ce9f765bf130060eac0b96a35d077d1a` before applying Landau’s commit.
- Explorer keeps PR12’s in-flow Filter button and panel, alongside the group chips and source search text. The post-hydration image guard now lives in the shared aerial layer, so it covers the corridor, campus overview and detail tiles. Landau’s per-image failure tracking remains in both map views.
- The source snapshot Git blob SHA-256 is `47338cae35eb146e063cc7c0d458123ffde2873ba7ce291ee584ebabb3e5d959`. Converting just its LF endings to CRLF gives `cc5cf9ea4881d14a9177d24d090d4596d183ea03f9c887692d93d9acbb43a22d`, identical to the pre-fix Windows checkout. Refreshed the four clean snapshots from the pinned Git blobs after checking the index; no data blobs or verifier assertions changed.

## Vincent successor: final acceptance

Vincent / vzhu08, Dev B UI successor, chat `01a1dcec-4ded-78b1-96a5-9131989adcf8`. Canonical branch `codex/campus-explorer-vincent`. No children. Executable checkpoint `1b7a43528882cc4a8864aa8229c4ee39b1184353` was built and served unchanged. The handoff commit adds this report and the five named screenshots only.

The merge owner’s approved attachment route `6786b47e65cbd7eb7125f6d467eb8149c3391c7f` and its revalidation checkpoint `b9da817d94557d553a9ace418939fa3bfe32053e` are exact ancestors. OSM attribution in both campus views includes a plain “Download OSM campus data (JSON)” link. The five legacy collections do not offer that download.

| Check | Verified on the successor |
|---|---|
| Overview and coverage | 1,188 original ways in 22 aggregated SVG paths; all six study areas present; no individual overview stops; 22 section codes and one roving tab stop at each tested viewport. |
| CAMPUS-QA-01 | Actual Downtown → Archive filter → Campus shows the full campus overview with `type=archive`. Refresh and browser Back from a related page restore the same group and URL. Drilling into a filtered section and using Back to campus overview keeps the Archive filter. A search that narrows the atlas is cleared only by the explicitly labeled Back action. |
| CAMPUS-QA-02 | Section bounds are visual only. The hit area for each code occupies an independent 44 CSS px square; only the code moves when boxes overlap. Chrome hit-testing checked five points per code × 22 codes × three widths. C01 and C04 opened by mouse at 1366/1920 and by touch emulation at 390. Native picker and roving keys both work. |
| Dense section and state | C13 renders 63 source ways with one roving span of focus and counted hidden badge numbers, while keeping each way available. Real Home/End, arrow, Enter/Space and Escape worked. Exact search `way/284117254` located one source way; opening details, a section/record/panel deep link, browser Back, and Reset demo worked. No viewport overflow at 1366, 1920 or 390. |
| QA-C-05 and ROOT-UI-01 | At 390 touch emulation, tapped stops 4 and 5 in Nassau west. Stop 5’s map label stayed inside the plot with 2.94 CSS px left clearance and retained “Witherspoon east landing” in the accessible marker and detail heading. Geometry matched before/after. Filter and Clear filters hover measured 8.01:1. |
| Aerial budget and CAMPUS-QA-03 | Wide overview requested only the 4,328,282-byte local JPEG at each viewport. Zooming across a tile corner requested precisely 4 of 16 detail tiles (10,748,032 bytes in their manifest; the entire bundle is 50,373,514 bytes). With one forced 404, three tiles stayed over the overview and the warning cleared at full-campus fit. A failed corridor image followed by direct search to C13 did not produce a campus tile warning; four campus tiles loaded after zoom. |
| Cold-image fallback | Immediate and delayed failures for both the corridor JPEG and campus overview, at all three widths, switched to Diagram, kept records/sections, and disabled the unavailable Aerial button. No raster was requested by the pre-hydration markup. |
| Download | No attachment request before activation. Actual click saved `princeton-campus-osm.json` (620,807 bytes). All three decoded objects equal the source database, browse index and provenance from the checkout whose revision matched `/api/health`. Dataset SHA-256 `8bb4b8cdd2b5e89548195f33df5fa09e23c0e16b44c2e47f2059b47f858da6e1`. HTTP attachment, ODbL license link, and `public, max-age=0, must-revalidate` headers verified. |
| Evidence boundaries | Campus shows OpenStreetMap class and edit date as archive source tags, with Source capture and Observed both Unknown and Retrieved separately. Historical DVRPC, unplaced Robertson field evidence, and the equal synthetic disagreement pair retain their own presentations. All five legacy routes tested. Current traversal remains Unknown. |

**Coverage ledger.** North 84 ways / 2 sections; Graduate College and west 56 / 1; central 443 / 8; east and athletics 125 / 2; south 440 / 8; Meadows 40 / 1. The historical snapshot has width on 22 ways, incline on 19, wheelchair on 1, surface on 299, and lighting on 29. Present tags do not represent field measurements or known accessible traversal. The UI covers the pinned university study geography; this is not a complete sidewalk inventory. No new point layer was included.

**Commands and receipts (Nov 14, 2026 EST).** `npm.cmd test -- src/features/curb/explore src/data/curb/princeton-campus/importer.test.ts`: 62/62 including the unmodified hash test. `npm.cmd run check`: TypeScript, 784 tests across 32 files, and production webpack build passed; Next generated the static download. `npm.cmd run test:replay`: 14/14. `git diff --check b9da817d HEAD` and the protected-path comparison passed. Local `npm.cmd run start -- --port 3076` with `APP_REVISION=1b7a43528882cc4a8864aa8229c4ee39b1184353` was checked in installed Google Chrome 156.0.8078.74 at 1366×768, 1920×1080 and 390×844. 25 grouped browser cases passed across the initial run and two same-source harness retests. No page errors or external runtime requests; deliberate image 404s account for the console errors. Initial and retest JSON, merged browser receipt, and command logs are in this chat’s local evidence directory.

**Limits and review handoff.** No physical phone or screen reader run; 390 touch is emulated in Chrome. `src/features/curb/explore/verify_browser.py` remains the merge owner’s legacy verifier; its collection selectors predate group chips. The successor ran the separate Chrome harness instead. The production PR12 site was not changed. Integration, independent final review, and any deployment belong to the merge owner/orchestrator.

**Successor captures** (in `public/curb/explore/v4/`, alongside Landau’s six unchanged captures):
- `vincent-1366-campus-overview.jpg` — overview codes at 1366.
- `vincent-1920-dense-section.jpg` — the dense section and evidence at 1920.
- `vincent-390-campus-overview.jpg` — overview codes at 390.
- `vincent-390-nassau-west-stop-5.jpg` — selected Nassau west #5 at 390.
- `vincent-1366-campus-detail-tile-failure.jpg` — overview retained under a failed tile.


## Scoped mobile sizing and focus correction

CURB-CAMPUS-UI-FIX/1 was tested on `9fadc080ff0768e7401613f0564359cd9cc3fd70` from `d1265c4d07a010dd318f5dc192139c3e63b85b69`. The selector wrapper and native control now shrink within the available width. At narrow widths the label can wrap onto its own line. The picker remains mounted across campus views, so keyboard activation moves focus to it before the activated map control or Back button disappears. Pointer activation keeps the current scroll position.

Installed Chrome 156.0.8078.74 used classic 15 px vertical scrollbars. Independent QA measured x401 against a 375 px document width on the released base. On this workstation the exact base reached x378 with the same 375 px client width. The correction reaches x359 and document scrollWidth equals clientWidth.

| Chrome viewport | Document client / scroll width | Native picker right edge |
|---|---|---|
| 390×844 | 375 / 375 px | 359.00 px |
| 1366×768 | 1351 / 1351 px | 512.20 px |
| 1920×1080 | 1905 / 1905 px | 624.70 px |

Each width was measured with Archive filtering open in the overview, the 63-way C13 section, and the longest selected option (C03, Graduate College / west campus). The picker retained all 22 options and its controls measured at least 44 px. Document overflow is visible and the remaining 15 px gutter is the vertical scrollbar.

At every width, real Tab, End or arrow keys, and Enter opened C22 and C04. After each Enter and each keyboard Back to campus overview, `document.activeElement` was the labeled `select#campus-section` with `:focus-visible` and a 3 px solid outline on screen. On the base both transitions returned focus to BODY. The Chrome run also verified pointer open/return, the existing C13 source-record deep link, browser Back, Archive state and Reset demo at all three widths.

`npm.cmd run typecheck` and `npm.cmd run build` passed. The before and after Chrome geometry and focus receipts are `correction-base-chrome.json` and `correction-final-chrome.json` in the chat’s local evidence directory. The [390 px keyboard focus capture](../../public/curb/explore/v4/vincent-correction-390-focus.jpg) shows the corrected picker. Chrome used desktop viewport emulation. A physical phone and a screen reader were outside this check.
