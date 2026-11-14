# Hosted UI audit

`HOSTED-UI-AUDIT/1` · Dev C (Landau, `landautzou`) · Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221` (approved Claude exception; no children) · 2026-11-14. Assignment [6884878483](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6884878483), ACK [6884895605](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6884895605), checkpoint [6884930949](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6884930949).

## Target and identity

**Target:** production **https://curb-taupe.vercel.app**, the deployed baseline from source **`b010ad02ce9e0cb905e15e5c7c7109713814b36e`** (main). Branch `codex/hosted-ui-audit`. Only this report is tracked; product, config, data and media are untouched. No redeploy or alias change.

**How I verified the deployment matches the source:**
- `/api/curb/survey` is deep-equal to `src/data/curb/surveys/robertson-hall.json` (revision 2, 5 findings).
- Byte-identical to source: `icon.svg`, `explore/atlas-icon.svg`, `poster.jpg`, `site-context.svg`, `defect-05.jpg` and `survey-replay/index.html`.
- `/api/health` reports `revision: ""`, so no build SHA is exposed.
- The immutable URL `curb-f85ac7h39-vzhu08.vercel.app` returns **302 to Vercel SSO** from my client, so I couldn't test it directly. All results below are for the production alias.

**Environment:**
- Windows 11 Pro 10.0.26200. Chromium inside the Claude desktop app's built-in browser, with emulated viewports.
- **NVDA 2026.3.1** with input/output speech logging.
- I used real key events where the pane was in front, and in-page scripted events otherwise; each section says which.
- 200% zoom is **simulated** with CSS viewports 683×384 (1366 at 200%) and 960×540 (1920 at 200%). It is not native browser zoom.
- No alternate browser was driven: computer-use can't type into other browsers here.

**"Local-only" evidence**, marked where it appears, means a fault injected inside the page on the hosted site (fetch wrapper or forced image error). It never touched the server.

## Result

**No broken primary flow and no P1 or P2 found.** One new P3 accessibility issue (HUA-01) and several P4s. The collection timer, focus and name issues are **known and pending integration** of my polish branch (`5129765`); they're not new regressions. EXQA-01 (icon) and EXQA-02 (explorer back/reload) are **confirmed fixed** in this deployment.

### Bugs, ranked

| ID | Severity | Route | Reproduction | Expected / actual |
|---|---|---|---|---|
| **HUA-01** | **P3** (accessibility) | `/curb/surveys/robertson-hall` | Fresh load with NVDA running. Enter a reviewer, focus **Accept finding**, press Enter. Then press **Reject finding**. | The first decision should be announced. **Actual:** NVDA said nothing for "Accepted “Defect 01 · Transverse crack”." (the text is in the DOM). The *second* action was spoken: "Rejected “Defect 01 · Transverse crack”. It stays in the record and is excluded from plans." **Cause:** the summary-bar `role="status"` is rendered with `hidden={!notice}`, so the first message un-hides the region in the same update that fills it, and screen readers miss live regions that appear with their content. **Fix:** keep the status element always rendered (empty text, not `hidden`). One line in `SurveyWorkspace.tsx`. |
| HUA-02 | P4 (known, pending integration) | `/curb/collection` | NVDA, autoplay. | "Simulation time / 01 / 24s / Simulation time / 02 / 24s…" every second. The sensor detail is read in fragments, in reverse order ("…compliance." / "A side view could…" / "Keep the edge in view."). Capture-card names omit Captured/Upcoming ("Inspect context frame at 5 seconds"). Small targets: "Try the real phone survey" 19px, slider 20px, footer links 18px. **All addressed in `5129765`, released, awaiting root integration.** |
| HUA-03 | P4 | `/curb/plans` | 1366, 1920, 683 and 390. | The "← Campus barrier review" and "One-trip repair comparison" links are 22px tall (under 24px). At 390, "View evidence…" buttons are 36px and the "Planning assumptions" summary is 30px (under 44px). |
| HUA-04 | P4 | `/survey-replay/index.html` (legacy static page) | All sizes. | The "Seek survey video" range is 16px tall. At 390, the step links (39px), Play (32×32), finding buttons (37px) and repair toggles (38px) are under 44px. There are also two controls both named "Play survey" (the big play button and the control-bar button). |
| HUA-05 | P4 | `/curb` (legacy) | Press **Zoom in map** up to 3×. | Zoom scales the schematic around its centre and clamps at 0.5–3×. There's no pan, so at 3× the outer features leave the 600×360 view. Reset restores the original geometry exactly. At 390, the zoom buttons are 32px tall and Reset is 42px. |
| HUA-06 | P4 | `/curb/explore` | 390 | Previous/Next snapshot buttons are 36×44 (narrower than 44). |

## Coverage matrix

Key: **Pass** = exercised with real interaction and the expected result. **Fail** = see bug ID. **N/T** = not tested, with the reason. Hosted unless marked.

The control inventory comes from source plus a hosted DOM enumeration at 1366: interactive elements per route are upload 10, survey 86 (39 visible at once), collection 30, explore 53, `/curb` 18, trips 15, plans 25, survey-replay 10. The tables below group them by function.

### 1. `/` and `/curb/upload`

| Control / state | Result |
|---|---|
| `/` redirects to `/curb/upload`; global nav shows 5 links with `aria-current` | Pass |
| Skip link | Pass (exists and targets `#main`); 22px tall (shared, from base) |
| Bundled demo → 10s labelled simulation → survey | Pass: 24% at 3s, one navigation |
| Real `IMG_0699.MOV` (16,661,803 B, from production) through the input | Pass: one navigation at 13.6s (hash plus 10s plus route) |
| Real `survey.mp4` by drag and drop | Pass: one navigation at 10.2s |
| Empty, arbitrary 4 KB `.mov`, `.txt`, 50 MiB + 1, real `annotated.mp4` (mismatched), dropped arbitrary 1 KB | Pass: each rejected with a specific alert, no navigation, so no Robertson findings |
| Cancel at 24%; still on upload at +11s | Pass: 0 navigations |
| Cancel → retry or reselection | Pass (re-ran the demo and files after cancel) |
| Double-click by position (second click 120ms later) | Pass: second click lands on the progress list |
| Navigate away mid-run (to Sample network at 4s) | Pass: stays on `/curb/plans`, no late redirect |
| Back from the survey to upload | Pass |
| "Selected locally; no file is uploaded" / "does not run live AI analysis" | Pass (text present) |
| NVDA (live regions) | Pass: spoke "Load tracked findings", "Connect accessibility checks", "Assemble repair options", "Opening the review workspace…" |

### 2. `/curb/surveys/robertson-hall`

| Control / state | Result |
|---|---|
| Original / Review / Annotated (`aria-pressed`, source) | Pass: Original and Review use `survey.mp4`, Annotated uses `annotated.mp4` |
| DOM boxes per mode at the five evidence times | Pass: Original 0, Review 3/3/2/2/1, Annotated 0 |
| 30 seeks (each mode, forward 01→05 and backward 05→01) | Pass: each within ½ frame, boxes match tracks within ±1 frame, labels equal boxes |
| Native play then pause (`video.play()` for 2.5s) | Pass: advanced ~3.0s; overlay correct after pause |
| Time kept across modes (Review → Annotated → Original) | Pass: 9.979s in all three |
| Final frame (seek to 13.95s → frame 417/418) | Pass: Defect 05 box present |
| Native control-bar buttons clicked directly | N/T (browser-internal shadow DOM; the media API was used instead) |
| Five jump buttons, five findings-list items | Pass |
| Close-ups for all five | Pass: 720×235, 720×270, 720×305, 330×185, 720×175 |
| All 34 disclosures toggle open and closed | Pass |
| Map context | Pass: 0 pins; "Not placed on the map (5): Defect 01…05"; route impact unknown |
| Reviewer required | Pass: alert, focus moves to Reviewer; alert clears on typing |
| Accept / Reject / Mark pending | Pass: counts update; method shows "Manual review · Hosted Audit C"; focus goes to Accept after Mark pending |
| Correct label | Pass: heading and list update; "Saved corrections…" |
| Area priority with empty rationale → error; with rationale → recorded | Pass |
| Restore original | N/T on hosted (passed in the local integrated QA of the same source) |
| Workspace tabs keep reviewer, budget, plan and correction | Pass |
| Unknown measurements, route impact unknown, no compliance verdict | Pass |
| Session-only note while edited | Pass |
| Keyboard: Accept with no reviewer by Enter; End on tabs; Tab to the export buttons; Enter | Pass (real keys) |
| NVDA: reviewer error announced as an alert | Pass |
| NVDA: first review decision | **Fail, HUA-01** |
| NVDA: later decisions | Pass |

### 3. Compare and Export

| Control / state | Result |
|---|---|
| Budget $0 / $1 | Pass: "No priced repair fits this budget"; 5 areas deferred |
| $600 | Pass: $72–$478 for 1 area, partial, 4 deferred |
| $4,906 (exact upper) | Pass: $600–$4,906 for 5 areas |
| $4,905.99 | Pass: cheaper set, $559.50–$4,492 |
| $12.34 | Pass |
| `12.345`, `abc` | Pass: `aria-invalid`, specific help text, budget plan removed |
| Empty, and Clear budget | Pass: 3 policies only |
| Slider to 250000 | Pass: input "2500.00", value text "$2,500.00" |
| Select each of the 4 policies | Pass: Export shows "Plan: <policy>" |
| Omitted work shown | Pass: deferred areas and quote-required counts visible on every card |
| JSON | Pass: 177,769 B, corrected label, `pending/manual` review for the edited finding |
| CSV | Pass: 6 lines, corrected label |
| HTML | Pass: 348,323 B; all five "Defect 0N"; corrected label; reviewer; plan "Your budget"; 5 embedded images, 0 external; no compliance verdict |
| PDF (client) | Pass: 261,156 B, `%PDF-`, plan "Your budget" status |
| PDF (server text) | Pass: same API with the canonical survey, $2,500, `planId: budget`. 13 pages; all five defects; "Your budget" and "$2,500"; 5 images; "Overall ADA compliance undetermined". The edited-survey PDF bytes were not re-parsed; the HTML from the same generator shows the edits. |
| Annotated MP4 / Original MOV links | Pass: 200, `video/mp4` 10,924,406 B and `video/quicktime` 16,661,803 B; byte ranges 206. The MOV SHA-256 shown on the page equals the real file's. |
| 5 rapid HTML clicks; 2 rapid PDF clicks | Pass: 1 request each |
| Export busy and an in-flight report across tab changes | N/T on hosted (passed in the local integrated QA of the same source) |
| Injected HTTP 500 and network failure (local-only) | Pass: specific errors; retry downloads once |
| Downloads written to disk | Intercepted in-page (blob captured), not saved, to avoid writing files to the machine |

### 4. `/curb/collection`

Deployed base; my fixes aren't integrated yet.

| Control / state | Result |
|---|---|
| Autoplay; Pause freezes time | Pass |
| Speeds 0.5×, 1×, 2× | Pass: 0.49, 0.98, 1.97 simulated s/s (pane visible) |
| Scrub; capture cards 5, 12, 20s | Pass: count 1, 2, 3 / 3 and states agree |
| Backward scrub to 11.9s | Pass: count 1/3, card 2 Upcoming |
| End and Replay (2× from 22.5s) | Pass: "↺ Replay" at 24.00 with 3/3; Replay restarts |
| Cameras via the 3 canvas callouts and the 3 sidebar buttons | Pass: both sides agree in `aria-pressed` and the detail heading |
| Follow, Side, Overhead and Reset view | Pass |
| Coverage on/off | Pass |
| Static ↔ 3D | Pass: diagram, Play disabled, cameras usable; 3D restored paused |
| WebGL `loseContext()` | Pass: static fallback plus notice "The 3D graphics context was lost…" |
| Hidden pane | Pass: time frozen while the pane was hidden (observed) |
| Offscreen | Pass: at 1366×400, stage bottom −204 → frozen 2.40 → 2.40; resumes on return. At 1366×768 the stage can't leave the viewport, so the first attempt was invalid. |
| Reduced motion (`matchMedia` override plus client remount) | Pass: starts paused with the notice; seek and camera changes don't autoplay |
| Navigate away and back | Pass: 1 canvas, autoplay resumes |
| Timer, card and focus accessibility | **Known, HUA-02** (pending `5129765`) |

### 5. `/curb/explore`

| Control / state | Result |
|---|---|
| All 5 collections; every record via Next (37), Previous wraps | Pass: Witherspoon 8, Nassau east 10, Nassau west 12, Robertson 5, examples 2 |
| Labels and dates | Pass: archive "Source records · not a chronological capture sequence"; field "Actual clip frames · precise locations unknown"; synthetic "Illustrative records · not observations" |
| Five field photos | Pass: all decode; each "Location not yet placed"; clip positions "7.000 / 9.500 / 12.000 / 6.000 / 13.933 seconds · not a date"; 0 field markers |
| Conflicting synthetic records | Pass: shown side by side (2) |
| "Current traversal: Unknown" | Pass: on every record |
| Zoom in/out, Fit, map keys (→ ↓ + − Home), pointer drag pan | Pass: `viewBox` changes and Fit restores |
| Marker Enter | Pass: selects the record; NVDA "Library / Witherspoon, 8 matching records. Spring north landing. Current traversal unknown. 1 unplaced records in this collection." |
| Evidence-type filter (all / archive / field / synthetic) | Pass: 5 / 3 / 1 / 1 of 5 |
| Search "834108" → Nassau east; no-match → "No matching collections"; Clear | Pass |
| Reload and Back restore collection, record and filter | Pass: `?collection=robertson&record=…defect-05&type=field` restored after reload and after Back from the survey (EXQA-02 fixed) |
| Clip link | Pass: `survey.mp4#t=13.933…` returns 200 |
| Review survey link | Pass |
| Source link | Href verified; not opened (external) |
| Broken photo (local-only forced `onerror`) | Pass: "Photo unavailable — the local file could not be loaded." |
| Withheld photo | N/T: no withheld record in the deployed atlas, and none injected |
| Mobile panels | Pass at 390 and at the pane's 945px width (mobile layout); the collection list lives in its tab |

### 6. Legacy routes

| Route / control | Result |
|---|---|
| `/curb`: 3 links; 4 barrier toggles | Pass: select/deselect; details show barrier ID, review status, linked evidence |
| `/curb`: Arrow keys in the barrier list | Pass |
| `/curb`: map zoom −/Reset/+ | Pass, with HUA-05 note |
| `/curb`: Reset | Pass: clears selection |
| `/curb/trips`: origins (8), destinations (5), repairs (4); Compare trip | Pass |
| `/curb/trips`: sample outcomes | Pass: arrival → library **Blocked**, and **Reachable** with "Add library ramp"; arrival → cafe Reachable; → studio Unknown; → archive Disconnected; → service Blocked under each single repair |
| `/curb/trips`: barrier evidence select (3) | Pass: barrier IDs resolve |
| `/curb/trips`: Reset | Pass |
| `/curb/plans`: presets $0, $2, $4, $8 → Compare | Pass: "$0/$2 both newly reach 0"; "**$4: best set 2, condition-first 1**"; "$8: both 3" |
| `/curb/plans`: typed 3.5 / abc / 2.345 / empty | Pass: invalid inputs set `aria-invalid` |
| `/curb/plans`: View evidence (4 of 7 tested) | Pass |
| `/curb/plans`: Reset | Pass: back to 4.00 |
| `/survey-replay/index.html`: 2 findings | Pass: seek to 5.28s and 11.38s |
| `/survey-replay`: 2 map pins | Pass: seek |
| `/survey-replay`: 3 repair toggles | Pass: `aria-pressed` |
| `/survey-replay`: close-up dialog open and close | Pass |
| `/survey-replay`: step nav state | Pass: `aria-current` |
| `/survey-replay`: second step link activated | N/T |

### Layout sweep

All 8 routes × 4 sizes, in iframes.

| Size | Overflow | Failed requests (≥400) | Controls off-screen | Under target (desktop 24px, 390 44px) |
|---|---|---|---|---|
| 1366×768 | none on all 8 | 0 | explore 3 (inside the scrollable snapshot strip, by design) | skip link (shared); collection 4 (HUA-02); plans 2 (HUA-03); survey-replay seek (HUA-04) |
| 1920×1080 | none | 0 | 0 | same set |
| 390×844 | none | 0 | explore 7 (snapshot strip) | upload/survey: skip and brand only; collection HUA-02; explore HUA-06; `/curb` HUA-05; trips summary 30px; plans HUA-03; survey-replay HUA-04 |
| 683×384 (simulated 200%) | none | 0 | explore 5 (strip) | as 1366 |

Screenshots (git-ignored, main checkout `.curb-local/hosted-shots/`): `hosted-1366-survey.jpg` (three mode buttons, tabs, jump row) and `hosted-390-explore-robertson.jpg` ("Evidence without a pin", traversal unknown).

## NVDA, quoted from the speech log

`.curb-local/nvda-hosted.log` and `nvda-hosted-excerpt.log`, git-ignored.

**Coverage:** live regions were captured throughout. Focus speech wasn't: NVDA's focus stayed in the Claude app chrome for part of the run, so most quotes are live-region announcements, not focus changes.

| Path | NVDA speech |
|---|---|
| Upload simulation | "Load tracked findings" · "Connect accessibility checks" · "Assemble repair options" · "Opening the review workspace…" · "Curb · Survey replay" |
| Accept with no reviewer | "alert, Enter a reviewer name before recording a decision." |
| First Accept | **(nothing)**: HUA-01 |
| Reject (second action) | "Rejected “Defect 01 · Transverse crack”. It stays in the record and is excluded from plans." |
| Export HTML | "Preparing the HTML report for Balanced plan…" · "Saved the HTML report for Balanced plan." |
| Explorer marker | "Library / Witherspoon, 8 matching records. Spring north landing. Current traversal unknown. 1 unplaced records in this collection." |
| Collection autoplay and cameras (base) | "01 / 24s", "Simulation time", "02 / 24s"…; camera detail read in fragments (HUA-02, known) |

The fixed collection page was already NVDA-checked on `5129765` (no autoplay speech, single explanation per camera).

## Gaps, stated honestly

- **Immutable deployment URL:** blocked by Vercel SSO; only the alias was tested.
- **Native 200% zoom, Safari, Firefox, Edge, physical touch, projector:** not tested.
- **Native video control bar:** buttons were not clicked; the media API was used instead.
- **Withheld-photo state** in explorer: not exercised.
- **NVDA:** live regions were captured, but focus-change speech was only partly captured (see the note above). JAWS, VoiceOver and Narrator were not tested.
- **Not exercised:** `/curb/plans` "View evidence" (3 of 7 buttons), `/survey-replay` second step, explorer external source links.
- **Downloads:** intercepted, not written to disk. PDF text was verified from a server PDF of the canonical survey, not the edited one.
- **Coordination:** no UI → API failure was found, so nothing was escalated to Vincent.
