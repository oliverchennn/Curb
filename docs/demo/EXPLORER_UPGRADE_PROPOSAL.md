# Explorer upgrade proposal (list B and synthesis)

`CURB-EXPLORER-DESIGN-V2/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` · 2026-11-14 · base `2fb49f710085732a7ac20f63680925b8db06dba5`.

This is a design proposal only. No product files changed. Measurements come from a local production build of this base at 1366×768, plus my earlier hosted audits at 390, 1366 and 1920.

## 1. What is weak today (measured)

1. **The hero is the smallest thing on the page.**
   - At 1366×768 the map SVG is **730×233 px**, a thin strip between the heading and the snapshot reel.
   - The archive geometry fills only **~10%** of that strip.
   - The workspace starts at y = 305 and runs to 1107, so the map, reel and evidence never share one screen.
2. **The best evidence is hidden behind an empty placeholder.**
   - For Robertson Hall (the only real photographs), the centre stage is a **730×323 "Evidence without a pin"** message.
   - The five photos appear as **164×63 thumbnails** and a 252×210 drawer image.
   - The honest message is right, but it takes the most valuable space.
3. **Archive records look identical.**
   - All 30 archive snapshots are the same small line schematic.
   - The data has real, distinguishing attributes that are never shown visually: path/crossing type, CONCRETE/CONTINENTAL/DECORATIVE material, ramp status EXISTING vs **ASSUMED**, and AERIAL capture.
4. **The explorer is a dead end in the Curb story.**
   - It links out to the survey, but always lands on Defect 01.
   - Nothing says how archive context, field evidence, review and planning connect.
   - To a judge, it reads as a separate data viewer, not "where Curb's evidence comes from".
5. **The key honesty is in small text.**
   - "Unplaced", "traversal unknown" and "assumed" are the product's differentiators.
   - They live in 12–13px notes and a footer, not in the visual language.

## 2. List B: my improvements, prioritized

- **B1. One adaptive evidence stage, full height (P0).**
  - The centre becomes a single large stage that changes by evidence kind:
    - **Archive:** the map, fitted to the selection, with numbered stops.
    - **Field:** a large photo with zoom and inspect, an inline "play from 0:07" clip, and a small **"approximate site" inset** using the existing local `site-context.svg`. That map is already labelled "Phone GPS is approximate… individual finding locations have not been verified", so no per-defect position is drawn.
    - **Synthetic:** the two conflicting records side by side at equal size, with no winner.
  - Height: `calc(100dvh − header − reel)`, about **480 px at 1366×768** (vs 233 now).
- **B2. Make uncertainty visual, not footnoted (P0).**
  - Ramp status **EXISTING = solid ring, ASSUMED = dashed ring** (archived label, not current condition).
  - Crossings dashed, paths solid. Unplaced records docked in a visible "Not on the map (n)" tray at the stage edge, never drawn as points.
  - A compact legend that is the source of these words. "Current traversal: Unknown" stays as a persistent stage badge.
- **B3. A reel you can read at a glance (P0).**
  - Thumbnails ≥120 px tall: real photos for field; for archive, a mini-geometry tile tinted by type and status, with "#03 · Crossing · Assumed".
  - Selected state, a "Source capture / Photo captured / Unknown" date chip, and keyboard ← → (exists).
  - Archive order labelled "source order, not chronology".
- **B4. A collection overview as the landing state (P0, small).**
  - Five cards across the top or rail, each with mini geometry (or a photo strip for Robertson, a split card for examples).
  - Real counts: records / on map / unplaced / photos / conflicts. Plus "What you can inspect here" in one line.
  - This replaces the plain text rail.
- **B5. Connect to the pipeline (P1, small).**
  - Field records deep-link to the survey at that finding (needs a survey `?finding=` read; root-owned survey file).
  - A thin "Archive context → Field evidence → Review → Plan" strip with the current step highlighted.
- **B6. A guided 3-chapter tour (P1).** User-started and stoppable. Each chapter only frames known geometry or switches stage mode; it never animates a route. Reduced motion means instant cuts.

## 3. Root list A vs list B

| A item | Decision | Reason | Value / effort / risk |
|---|---|---|---|
| A1 map-led evidence journey, numbered stops, legend | **Keep, merged into B1 and B2** | Agree the stage must dominate. B1 adds that the stage *changes mode*, so field evidence also gets the hero, not just the map. | High / M / Low |
| A2 guided chapters | **Change to P1 (B6)** | Valuable for a presenter, but the stage, reel and legend do most of the storytelling. A tour on a weak stage is still weak. | Med / M / Med (focus and motion handling) |
| A2 large gallery for unplaced frames | **Keep, inside B1** | Exactly right. Add the approximate-site inset from the existing local asset, clearly labelled. | High / S / Low |
| A3 linked map ↔ snapshot, photo inspection, side-by-side conflict | **Keep (P0)** | Core interaction. The conflict pair becomes the synthetic stage mode. | High / M / Low |
| A4 stronger reel | **Keep (P0, B3)**; **drop** auto-playing reel | Readable identity matters. Optional playback adds motion-preference and focus risk for little gain; the tour covers it. | High / S / Low |
| A5 controls: type, placed/unplaced, conflict filters, URL, Fit, legend, coverage counts | **Keep a subset**: type filter (exists), URL (exists), Fit selection/collection, legend, coverage counts. **Defer** placed/unplaced and conflict filters. | The tray (B2) and counts (B4) already expose placed/unplaced and conflicts. More filters crowd the toolbar. | Med / S / Low |
| A6 overview cards | **Keep (P0, B4)**; **drop** the compare view | Cards make five collections understandable instantly; compare would dilute the main story. | High / S / Low |
| A7 responsive, 390 sheets, keyboard, reduced motion, local assets | **Keep, mandatory** | Same acceptance bar as the rest of Curb. | Required |
| — | **Add B2** (visual uncertainty) | The honesty rules are the product's edge; make them visible in the cartography. | High / S / Low |
| — | **Add B5** (pipeline link, P1) | Turns the explorer from a side page into "where the evidence comes from". | Med / S / Low (cross-scope read) |

## 4. Recommended P0 (one cohesive scope)

**"One stage, three evidence modes"** = B1, B2, B3, B4, plus A3's linking and A7. A2 (tour) and B5 (pipeline) are P1.

**Desktop composition (1366×768 and 1920×1080, no page scroll needed for the main view):**
- **Top:** a compact title row with the "Current traversal: Unknown" badge and the search and type filter, about 56 px.
- **Left:** the overview cards as a vertical rail, about 240 px (1366) or 300 px (1920), each with a mini-geometry or photo thumbnail and counts.
- **Centre:** the stage, flexible width and ≥480 px tall at 1366.
  - Archive: map with numbered stops, legend chip top-left, "Not on the map (n)" tray bottom-left, Fit/zoom top-right.
  - Field: large photo with ⊕/⊖/reset and "Play clip from 0:07" inline, plus the approximate-site inset bottom-right.
  - Synthetic: two equal cards side by side.
- **Bottom of the centre:** the reel, about 150 px.
- **Right:** a 300 px evidence drawer with title, kind-in-words chip, the date grid (Observed / Photo captured / Source capture / Retrieved / Unknown), source and record IDs, and a "Source & record details" disclosure. This exists today; it gets a 14 px minimum.

**390 px:** the stage first (full width, 56vh), then the reel (horizontal, 44 px controls), then a bottom-sheet drawer, with tabs **Stage · Collections · Evidence** (the current tabs, renamed). The overview cards become a horizontal scroller.

## 5. 60–90 second demo

1. **0–10s, landing.** Five overview cards: "Three archive chains, one real field visit, one worked example." Point at the counts (for example "8 records · 7 on map · 1 unplaced").
2. **10–30s, Nassau west, archive.** The stage fills with the map; numbered stops 1…n follow source order ("not chronology"). Select stop 4: the ramp ring is **dashed: ASSUMED in the archive**, and the drawer says "Archived status · not current condition". Point at the tray: "Gate, campus approach and elevator door: *Not on the map (3)*. We don't draw what we haven't located."
3. **30–55s, Robertson Hall, field.** The stage becomes the photo of Defect 02 at full size; zoom into the crack. "Play clip from 0:09.5" runs the actual frame inline. The inset shows the approximate site with the label "defects not placed". Step through the five frames with → in the reel.
4. **55–70s, Evidence examples.** Two equal cards: "Records disagree. Neither is treated as current."
5. **70–85s, close.** Press the Review link (P1 deep link) to jump to the survey at Defect 02: "From evidence to review to a costed plan."

## 6. Implementation paths

All within explore unless noted.

| Path | Change |
|---|---|
| `src/features/curb/explore/Explorer.tsx` | New grid: rail, stage plus reel, drawer. Stage-mode switch by `collection.kind`. Keep the URL-state hooks unchanged. |
| `src/features/curb/explore/MapCanvas.tsx` | Fit to selection; numbered stops; ramp status ring (solid/dashed from `properties.status`); legend; unplaced tray; fill the stage height (fix the 233 px strip). |
| **new** `src/features/curb/explore/EvidenceStage.tsx` | Field mode: large photo with zoom/pan/reset (keyboard + − 0 and arrows), inline `<video>` of `/curb/surveys/robertson-hall/survey.mp4` started at `clipSeconds` on request (no autoplay), approximate-site inset `<img src="/curb/surveys/robertson-hall/site-context.svg">` with its existing caption. Synthetic mode: equal conflict pair (reuse `RecordCard comparison`). |
| **new** `src/features/curb/explore/CollectionCards.tsx` | Overview cards with mini geometry (reuse the `Snapshot` schematic path code) and counts. |
| `src/features/curb/explore/Evidence.tsx` | Reel tiles ≥120 px; type/status tile styling; date chip. `RecordCard` font and spacing floor of 14 px. |
| `src/features/curb/explore/model.ts` (+ `model.test.ts`) | Pure `coverage(atlas, collection)` returning `{records, onMap, unplaced, photos, conflicts}`; `stopNumber(record)` from source order. Unit tests for counts and that unplaced/synthetic never yield geometry. |
| `src/features/curb/explore/Explorer.module.css` | Layout, stage height, legend, tray, reel, 390 sheet. |
| P1, root-owned survey | `SurveyWorkspace.tsx` reads `?finding=` once to select and seek. |

**Data needs:** none new. Everything comes from `archive.json`, `createAtlas()`, the survey JSON (photos and clip times), and the existing local `site-context.svg`. No tiles, services or dependencies.

## 7. Acceptance checks (for the implementation task)

- **Stage size:** at 1366×768 the stage is ≥480 px tall, and the stage plus reel are visible without page scroll. At 1920×1080 the stage is ≥640 px. No horizontal overflow at 1366, 1920, 390 or simulated 200%.
- **Mode per collection:** archive shows the map, field shows the photo, synthetic shows the conflict pair. Reload, Back and Forward restore collection, record, filter and panel, as today.
- **Honesty rules intact:**
  - Unplaced and synthetic records are never drawn on the map.
  - The ASSUMED ramps (3 in the archive) render dashed and say "archived label, not current".
  - "Current traversal: Unknown" is visible in every mode.
  - The kind and date wording is unchanged.
  - The conflict pair has equal size, with no winner.
- **Linking:** selecting a map stop selects its reel tile and drawer, and vice versa. Fit selection and Fit collection both work. Every map action has a keyboard equivalent.
- **Field mode:** the inline clip starts only on request at `clipSeconds`; photo zoom and reset work by keyboard; the inset caption says positions are not verified.
- **Accessibility:** 44 px targets at 390, 24 px minimum on desktop, visible focus, one polite announcement per deliberate selection (the existing status pattern), no motion when reduced motion is set. An NVDA spot check on selection and mode change.
- **Tests and build:** `npm run check` passes with the new `coverage` and `stopNumber` unit tests.

## 8. P1 refinements (only if time remains)

- B6 guided 3-chapter tour (user-started, stoppable, focus-stable).
- B5 survey deep link `?finding=` and a pipeline strip.
- An archive attribute row (material, line type, AERIAL capture) in the drawer as a small table.
