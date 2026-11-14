# Curb explorer integration QA

`CURB-EXPLORER-INTEGRATION-QA/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (Claude Opus 5.5, approved exception) · 2026-11-14.

**Exact base:** `08855c746b38ced0a4fe0ffb2e4f4b422777c60a`. Branch `codex/curb-explorer-integration-qa`, isolated worktree. **Sole write:** this report. Product files and public assets are unchanged.

**Scope:** the combined changes only, meaning the shared header and nav, the explorer flow and history, the shared icon, layout and focus, and the mobile panel flow. I did not rerun D's 93-check matrix or the core survey stress.

## Result

**Pass, with one P3 and two P4 findings.** None is a release blocker by my reading; root decides.

**Collection demo:** the `/curb/collection` link is **pending**, not a pass or a failure. It returns HTTP 404 by design until B's release.

**Checks:**
- `npm ci`, then `npm run check` at the exact base: **exit 0**. Typecheck, **24 files / 710 tests**, and the production build ("Compiled successfully").
- Then `next start` on 127.0.0.1:3013, a production build with real data and media.

## Shared header, navigation and icon

Every page was fetched from the production server. The table shows each page's own `<link rel=icon>` and nav state.

| Path | HTTP | Title | Nav (5 links, `aria-current` marked *) | Icon |
|---|---|---|---|---|
| `/` | 200 (redirects to upload) | Curb · Start a survey | Start survey* … | `/curb/icon.svg` (svg+xml) |
| `/curb/upload` | 200 | Curb · Start a survey | Start survey* | `/curb/icon.svg` |
| `/curb/surveys/robertson-hall` | 200 | Curb · Survey replay | Survey replay* | `/curb/icon.svg` |
| `/curb/explore` | 200 | Route explorer · Curb | Route explorer* | **`/curb/explore/atlas-icon.svg`** |
| `/curb/plans` | 200 | Curb · Repair plan comparison | Sample network* | `/curb/icon.svg` |
| `/curb` | 200 | Curb · Campus barriers | none current (not in nav) | `/curb/icon.svg` |
| `/curb/collection` | **404, pending** | Curb | — | — |

Assets: `/curb/icon.svg` 200 `image/svg+xml`, `/curb/explore/atlas-icon.svg` 200 `image/svg+xml`, `survey.mp4` 200 `video/mp4`.

**EXQA-01 (P4):**
- **What happens:** the explorer's page metadata overrides the shared icon with its own `atlas-icon.svg`, so its browser tab shows a different icon from every other Curb page. Both files load.
- **Repro:** open `/curb/explore` and any other page, then compare the `link[rel=icon]` hrefs.
- **Decision for root:** keep it as an intentional sub-brand, or drop `icons` from `app/curb/explore/page.tsx` metadata so the shared `/curb/icon.svg` applies.

## Explorer flow and history (1366×768)

Archive → field → survey:
1. **Archive collection.** "Library / Witherspoon", 8 records.
   - Snapshot 2/8 is "Spring Street crossing".
   - The card shows Location "Archive source geometry", Source capture **Unknown**, Retrieved **Unknown**, Attachment "Source ID matched", and "Current traversal: Unknown".
2. **Field collection.** "Robertson Hall" (Field observation), 5 records, subtitle "Actual clip frames · precise locations unknown".
   - Next stepped through **1/5 → 5/5**: Defect 01 to the final Defect 05.
   - **All 5 photos decoded**: 720×235, 720×270, 720×305, 330×185 and 720×175.
   - Each card shows Location "Location not yet placed", Observed **Unknown**, Photo captured **Unknown**, and Clip position "7.000 / 9.500 / 12.000 / 6.000 / 13.933 seconds · **not a date**".
   - 0 map markers for field records.
   - Type, date and unknown wording is preserved as designed.
3. **Survey.** The card links are `survey.mp4#t=<clip seconds>` and `/curb/surveys/robertson-hall`. "Review Robertson survey →" opens the survey: the Survey replay nav is current, and `survey.mp4` is loaded.

**History:**
- From explorer, **Back** returns to `/curb/explore` (`back_forward`). **Forward** returns to the survey, which loads.
- Client-side nav: Survey → Route explorer → Sample network, then Back → explorer and Forward → `/curb/plans`. Both work.

**EXQA-02 (P3), explorer selection is lost on Back:**
- **Repro:**
  1. Go to `/curb/explore` and select **Robertson Hall**.
  2. Press Next to reach **5/5 (Defect 05)**.
  3. Follow "Review Robertson survey →", or the nav link to Sample network.
  4. Press the browser **Back** button.
- **Result:** the explorer reopens at **Library / Witherspoon, 1/8**. This reproduced with both the full-page link and client-side `Link` navigation, so it doesn't depend on the browser's back/forward cache.
- **Cause:** the selection is React state only.
- **Suggestion:** mirror `collection` and `record` in the URL query, and read them on load.

**Observation, not a defect:** "Review Robertson survey →" opens the survey at its default first finding, not the defect selected in the explorer. The "Open source clip at this frame" link does carry the time.

## Layout, focus and mobile flow

Measured after a fresh load at each size.

| Viewport | Header | Explorer layout | Overflow | Small targets (under 24px desktop, under 44px at 390) |
|---|---|---|---|---|
| 1920×1080 | 1680×77, nav one row | three columns: 250 / 1024 / 320, all shown | none | page links "How collection would work →" and "Review Robertson survey →" 16px tall; the two details summaries 15px |
| 1366×768 | 1351×77, one row | 235 / 730 / 300 | none | same 4 |
| 960×540 (1920 at 200%) | 945×77 | 190 / 416 / 260 | none | same 4 |
| 683×384 (1366 at 200%) | 683×110 | **mobile panel tabs**, Map shown | none | the page links (14px) |
| 390×844 | 390×160, nav 2 rows (44px links) | mobile panel tabs | none | page links 14px, search input 32px, evidence-type select 35px, "Open selected evidence →" 40px |

No clipped headings or controls at any size. The global skip link (22px) is shared and unchanged.

**EXQA-03 (P4), explorer targets:**
- **Desktop:** the explorer's header links (16px tall) and its "Source & record details" / "All N records" summaries (15px) fall under the 24px minimum, unless the WCAG 2.5.8 spacing exception is relied on.
- **At 390:** the links (14px), search (32px), select (35px) and "Open selected evidence" (40px) are under the 44px mobile target used on the survey and upload pages.
- **Scope:** this is explorer CSS only; the shared header passes (40px desktop, 44px mobile).

**Mobile flow (390×844).** The pane wasn't drawing for real input, so these used dispatched `keydown` events and element activation; root's own check covered the same flow with real input.
- From **Map & snapshots**, → selects **Collections** (routes panel shown, map hidden).
- ↓×3 within the list reaches **Robertson Hall**. Activating it shows the Map panel and **moves focus to the Map tab**, with heading "Robertson Hall".
- Next ×4, then "Open selected evidence →", shows the **Evidence** panel and **moves focus to the Evidence tab**, with "Defect 05 · Final transverse crack" and its photo (720×175) decoded, plus "Current traversal: Unknown".
- Home → Map tab, End → Evidence tab, → wraps to Map.

**Console and network:**
- Over the session, the browser console logged a single error: a 404 for `/curb/collection`, which my own fetch requested (pending route).
- The explorer page loads 15 resources, all same-origin, with 0 broken images.
- Server error log: empty.

## Limits

- The pane wasn't drawing for real mouse and key input or screenshots, so the mobile keyboard flow used dispatched events (labelled above), and no screenshots are attached. Root reports real-input captures of the same flows.
- Not checked: D's full matrix (out of scope), a projector, a screen reader, Safari or Firefox, touch hardware, the hosted site, and the Collection demo (pending).

## Root correction and production verification

Root integrated this report as `0f9efc8` and corrected EXQA-01/02/03 in `1c6f1ce28553f223e3c8b28086af4c18c3164910`. This paragraph records a later root check, not an extension of C's pinned run. The full check passed TypeScript,714 tests in25 files and the production build. Four location regressions cover field snapshot round trips, invalid/cross-collection IDs, filtered/empty states, and URL punctuation.

In the actual production in-app browser, root selected Robertson Defect05, navigated to Sample network, pressed Back/Forward, followed the full-page survey link, pressed Back and reloaded. The same final finding survived every return. At390px a field filter, search and Evidence panel also survived reload; a no-results query stayed empty, then clearing filters restored the final finding. The page inherited `/curb/icon.svg`. Measured header links, search, select and visible details summaries were44px high, with no horizontal overflow. The production browser error/warning log was empty. These were real supported browser interactions; no synthetic key dispatch was used. Root refreshed the1920px archive screenshot and saved a390px evidence capture. Collection integration and hosted checks remain separate.
