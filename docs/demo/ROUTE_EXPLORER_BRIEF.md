# Route and evidence explorer — Developer D assignment

Task `CURB-ROUTE-EXPLORER/1`, Oliver's existing cloud chat / Developer D (`6af808fa-83dc-8191-bd58-80697dbe50c9`). User explicitly selected this separate page on November 14. Exact base `6b2b11040eed8d3d620743bc4e12e112f9ebfa90`; new branch `codex/route-evidence-explorer` in an isolated checkout. Previous stress task is STOPPED/RELEASED; preserve its original and corrected results. Root owns integration, navigation, dependencies and main merges.

Exclusive new writes: `app/curb/explore/page.tsx`, `src/features/curb/explore/**`, `public/curb/explore/**`, `docs/demo/ROUTE_EXPLORER_RESULT.md`. No existing contract/domain/API/data/survey/global CSS/config edits. Build a local, self-contained explorer dataset/validator within this feature. No new libraries or map provider keys. Use SVG or existing offline map primitives with local data; do not load remote tiles or use a paid map service.

## Product and visual direction

Create a **Route explorer** that feels like an evidence atlas: a dominant map, a compact list of survey corridors/routes, and an evidence drawer with photographic or schematic snapshots. It should invite inspection, not resemble a raw JSON viewer. Use the cream/forest/amber Curb palette, crisp thin street/sidewalk lines, route colors with a matching textual ID, subtle building/park context, and clear selection outlines. Keep route badges and key labels readable on a projector. Aim for a dense but calm desktop control room, not a vertical stack of giant cards.

At desktop widths use a roughly 250px route rail, a flexible central map, and a roughly 300px detail drawer when selected. A compact evidence filmstrip can sit along the map's bottom edge. At 390px use a map-first arrangement with route and evidence tabs or a clear bottom panel. Desktop and mobile must make the same records reachable by keyboard. Keep page-level text short; disclose source details on demand.

## Existing sources and what they mean

Read `docs/research/PRINCETON_CORRIDOR.md`, `docs/research/PRINCETON_SOURCE_AUDIT.json`, and the source archive `docs/source/Curb_Research_and_Data.zip`. These contain Princeton aerial/archive geometry, not a measured traversability graph. The archive includes `princeton_paths_crossings.geojson`, `princeton_ramp_inventory.geojson` and `sources.json` with hashes in the audit. Extract only a small relevant local subset into your new feature/public scope; preserve source IDs and provenance.

Useful historical design references are recoverable from tags `archive/2026-11-14/codex/princeton-scout-map` (`docs/research/PRINCETON_SCOUT_MAP.md/.svg`) and `archive/2026-11-14/codex/r3-evidence-ux-prep` (`docs/planning/R3_EVIDENCE_UX.md`). Read them as references, not approval to cherry-pick an entire old branch or restart R3. This new assignment selects the bounded explorer only.

Build at least three selectable archive-derived corridor entries using real source IDs, for example the library/Witherspoon approach, primary Nassau crossing and alternate Nassau crossing. The audit explains the chains and endpoints. An incomplete chain remains visibly incomplete; don't interpolate a missing gate or campus approach. Don't label these navigation recommendations or verified accessible routes. Show **Current traversal: Unknown** for every first-version route, even if an evidence attachment is accepted.

The Robertson Hall survey is the actual **Field observation** collection. You may expose its five existing local photos as a fourth collection, linking into `/curb/surveys/robertson-hall`. Individual finding placements remain null: show them in its evidence list/filmstrip, not invented pin coordinates. A known approximate site context may be labeled as site context, never as exact defect positions. Do not move Robertson pictures onto Nassau features.

## Record and date rules

Every evidence item visibly says one of **Field observation**, **Aerial or archive record**, or **Synthetic example**. If using worked examples from C's prior brief, each remains explicitly illustrative. Do not make synthetic photographic claims; schematic thumbnails or a clear unavailable-image card are better than unrelated photos.

Each date says what it means: Observed, Photo captured, Source capture, or Retrieved. Missing expected dates read **Unknown**. Preserve date-only precision; never append a clock time to a date-only source. A review acceptance only accepts the record's attachment to its feature; it does not establish passability. Conflicting records remain side by side with no automatically selected winner. Unknown-location entries remain listed but are not drawn. Broken or publication-held photos receive distinct text explanations, not silently substituted images.

## Interaction details

- Select a route in the rail to fit its known extent, emphasize its segments, update title/provenance/record counts and show linked evidence snapshots. Counts must come from the local data. Unmapped entries remain accessible.
- Click or keyboard-select a known-position marker to open the corresponding evidence card. Selecting an evidence thumbnail highlights its attached feature if the location is known; otherwise say **Location not yet placed** and leave it undrawn.
- Offer zoom in/out, reset/fit selected route, and pointer drag pan. Provide keyboard-accessible zoom and fit controls; retain the selected feature across zoom and filter changes when still eligible.
- Use an evidence-type filter and a concise search across route names and stable feature/record IDs. Show a clear empty state and reset action. Filters must not silently hide an unresolved location or conflicting evidence without an accessible count/list.
- Add a **Snapshots** strip for the selected collection: previous/next buttons, selected state, image/text detail and meaningful source/date caption. The real Robertson entries link to review their timestamped evidence. Do not imply a real chronological capture sequence for undated archive features.
- Draw source geometry according to its record type. Color/solid line on an archive map must not imply usable traversal. A clear legend says **Archive geometry · traversal unknown**. Preserve visible gaps; use a distinct proposed connector only if explicitly synthetic and never as real geography.
- Make a small **How collection would work** link to `/curb/collection` and a **Review Robertson survey** link. Root adds the global menu after integration.

## Acceptance and delivery

Validate local data: unique IDs, references, finite coordinates, source-kind/date precision, optional locations, broken/unavailable photo states and conflict groups. Test meaningful semantic rules: missing locations never get markers; a reviewed attachment does not change traversal; filtering and selections retain record identity; conflicts stay accessible; dates retain their precision. Reuse existing validated survey data read-only, without importing server-only code into the browser.

Run `npm run check` and real production browser checks at 1366×768, 1920×1080, 390px and 200% zoom. Exercise all routes, filters/search including no-result, snapshot navigation, marker/list selection, zoom/reset, keyboard focus and reduced motion. Confirm no external map/font/media requests, no console exceptions, and navigation to the real survey. If a browser is unavailable, say exactly what wasn't checked rather than substitute server output for a visual pass.

Deliver strong desktop and mobile screenshots and a report naming exact data provenance, accepted limits and executed checks. Preserve license/attribution for reused geometry. Commit only the new scope, push `codex/route-evidence-explorer`, independently verify full local/remote SHA equality, and publish RESULT/STOP/RELEASE. No main merge, hosting mutation, fresh field observation, accessibility certification or new persistent review system in this task.
