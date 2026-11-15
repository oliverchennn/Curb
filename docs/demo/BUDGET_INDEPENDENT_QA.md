# Budget redesign: independent usability and consistency check

Task CURB-BUDGET-INDEPENDENT-QA/1. Developer C (Landau), session `06a135c3-65bb-4de0-b273-9d48ab953221`, no children.

- **Base:** exact published `4d44143392675f36078c7607753cf10c751bea6b`, fresh isolated worktree, branch `codex/budget-independent-qa`.
- **Product:** read-only. This file is the only tracked write.
- **Probes and screenshots:** ignored, under `.curb-local/budget-independent-qa/` in that worktree.

## Source and browser

- **Build:** `npm ci` then `npm run build` on the exact base. Served with `npm run start -- --port 3020` on 127.0.0.1.
- **Browser:** the Claude desktop browser pane (Chromium), with viewports emulated at 1366×768 and 390×844. It is not Google Chrome and not a physical phone.
- **Inputs:** budget values were typed with real keystrokes; keyboard paths used real Tab, Shift+Tab, Space and Enter.
- **Downloads:** the HTML export was captured in the page (the `Blob` handed to `URL.createObjectURL`) and read in full; nothing was written to disk.
- **Scope:** as assigned, no full test suite and no backend load.

**Verdict: no release blocker. One should-fix accessibility issue (C-B1) and five copy recommendations.**

## Results

| # | Check | Result |
|---|---|---|
| 1 | Review → Compare at 1366 and 390, read cold | **Pass**, see below |
| 2 | Three policy subtotals, Balanced caveat, treatment/source disclosure, shared setup | **Pass** |
| 3 | $500, insufficient budget, unknown prices | **Pass**, plus copy note C-C1 |
| 4 | Exported report vs UI | **Pass**, plus copy notes C-C3 and C-C4 |
| 5 | Keyboard reach, 390 layout, learning lab | **Pass**, except **C-B1**: focused policy button hidden under the sticky tab bar at 390 |

### 1. Reading the planner cold (1366 and 390)

**"2 Compare repairs"** opens with "What work should we fund?". The page then sets out the pieces a first-time reader needs:

- **Three scopes.** Essential ("near-term needs … lowest priced suitable option"), Balanced ("every eligible area with its recommended treatment, including repairs that need quotes") and Durable ("most durable suitable option").
- **Price status.** Every card leads with **"Full project cost: quote needed"**, then **"Priced work subtotal"**.
- **Quantities.** Every priced row shows its unit rate × an **"(assumed)"** quantity, for example "$18.00–$59.75 / linear foot × 4–8 linear feet (assumed)". The page states "The quantities above are not measurements from the video."
- **Exclusions.** "Outside the selected unit rates" lists mobilization and small-job minimum, site measurements and treatment design, and repair of displacement, loose concrete or base failure.

No contradictory text was found. Ambiguities are listed under copy recommendations.

### 2. Policies and why Balanced looks cheaper

The UI subtotals match the assignment's figures exactly, and the rows add up:

| Policy | Rows | Subtotal | Deferred |
|---|---|---|---|
| Essential | Sealing $72–$478 (areas 01, 02) + panel renewal $150–$1,338 (area 04) | **$294.00–$2,294.00** | 03, 05 |
| Balanced | Sealing $72–$478 × 3 (01, 03, 05); **Quote needed** × 2 local repairs (02, 04) | **$216.00–$1,434.00** | none |
| Durable | Panel renewal $112.50–$892 × 4 (1.5–4 SY) + $150–$1,338 (area 04, 2–6 SY) | **$600.00–$4,906.00** | none |

- **Balanced is not presented as cheaper.** The note under the cards reads: "Balanced includes 2 unpriced treatments. Its lower priced subtotal does not mean the whole project is cheaper. Partial subtotals cannot rank the full cost of these plans." It is visible at both 1366 and 390.
- **Treatment and source disclosure (sealing).**
  - Source: NJDOT contract 21132, item 0083 / 456006M, page 74, "$18 and $59.75/LF".
  - Dated "2021-10-05 (historical benchmark)", with "no inflation adjustment or small-job minimum inferred".
  - The "Confirm treatment suitability" list states when sealing applies and that it "does not correct displacement or restore a loose fragment".
- **Shared setup** appears once, as "Shared job cost · once per project … Quote needed … it is not counted once per defect", in all three selected breakdowns and the budget scenario.

### 3. Budget scenarios and unknown prices

**$500 (typed):**
- "1 area in the $500.00 scenario". Priced upper bound $478.00; "Full budget fit is unconfirmed until the missing costs are quoted."
- Proposed work: area 01, $72.00–$478.00. Deferred: areas 02, 03, 04 and 05.
- "Not yet priced: Site verification, mobilization and accessible work-zone provision". Setup stays visible.

**$50 (typed):**
- "No repair work selected for this amount … This does not make the deferred work free."
- All five areas listed as deferred. The card reads "No work selected" rather than any dollar figure.

**Unknown prices:** never shown as $0. The exported HTML contains no "$0.00" at all.

### 4. Exported report vs UI

Steps: selected the $500 budget scenario, then Export report → **Download accessible HTML**.
- Actual request: `POST /api/curb/survey/report?format=html`, status 200.
- Actual file: `curb-robertson-hall-r2.html`, 348,182 bytes, read in full.

| Item | UI | Exported HTML | Match |
|---|---|---|---|
| Plan shown first | "Your budget · selected for report" | "Your budget / Selected plan for this report" listed first | yes |
| Work | Work area 01, "Prepare and seal suitable cracks" | `panel-01`, `panel-01-seal` | yes |
| Priced subtotal | $72.00–$478.00 | "Partial estimate of $72.00 to $478.00 for known costs, plus required quotes" | yes |
| Budget | $500.00, fit unconfirmed | "Supplied budget $500.00 … Budget fit remains partial until quotes are obtained" | yes |
| Deferred | 02, 03, 04, 05 | `panel-02` to `panel-05` | yes |
| Quote items | Shared setup | `site-setup`, same wording | yes |
| Other policies | three cards | Essential / Balanced / Durable with identical subtotals and treatment IDs | yes |
| Measurement checklist | "Site measurement checklist (15)" | Per finding under "Measurements needed": 3 items × 5 findings, same wording | yes (heading differs, C-C4) |
| Evidence images | five | 5 `<img>` | yes |

The other formats (PDF, JSON, CSV) and the other policies were not re-downloaded; D's report covers them.

### 5. Keyboard, 390 layout and learning lab

**Keyboard reach (1366, real Tab):** "Compare repairs" → Select Essential → Select Balanced → Select Durable → budget field → slider → Clear budget → budget scenario → source link → checklist summary → "Continue to Export report".
- Space on Essential selects it (`aria-pressed=true`), keeps focus and shows a 3px outline.
- Enter on "Continue to Export report" opens the Export tab. The next Tab lands on Download PDF, then Download accessible HTML, then Download JSON.

**390×844:**
- Page `scrollWidth` 390, so no horizontal overflow.
- No element in the Compare panel extends past the viewport, and the breakdown table fits (324/324).
- Every visible control in the panel is at least 44×44.

**C-B1 — should fix (accessibility, WCAG 2.2 SC 2.4.11 Focus Not Obscured).**
- **Where:** 390×844, Compare repairs, Shift+Tab back from Durable. Focus on **"Select Essential for report"** scrolls it to y=37–81, entirely under the sticky `SurveyWorkspace_tabList` (bottom at y=88).
- **Evidence:** `elementFromPoint` at the button returns the tab bar. Screenshot `390-focus-obscured-essential.jpg`.
- **Cause:** `html` `scroll-padding-top` is `auto`, so the browser ignores the sticky bar when scrolling a focused element into view. Forward Tab is unaffected, and at 1366 the policy buttons sit at y=362, well below the 70px bar.
- **Suggested fix (shared CSS, root/merge owner):** `scroll-padding-top` on `html` of about the bar height, or `scroll-margin-top` on the panel's interactive elements.
- **Why not a blocker:** the controls still work and stay reachable.

**Learning lab (`/curb/plans`, 390):**
- Labelled "LEARNING LAB · SYNTHETIC NETWORK" with the callout: "These tiny amounts are teaching numbers, not repair prices. The authored $4 and $8 budgets make the algorithm easy to compare … they cannot estimate a contractor's work."
- **"Plan real Robertson Hall work →"** goes to `/curb/surveys/robertson-hall#survey-plans-heading` with "2 Compare repairs" selected and the heading "What work should we fund?".

**Console:** no errors during the run.

## Copy recommendations

- **C-C1 (budget deferral reason is misleading).** At $500, areas 02, 03 and 05 are deferred with "Not selected within the priced upper bound; quote-only treatments cannot compete in this scenario."
  - Area 02 (high priority) has a priced sealing option, the same $72–$478 Essential uses. It was deferred because $500 covers only one $478 upper bound, and area 01 (also high) came first.
  - Suggest per-area reasons, such as "Its priced option would exceed the $500.00 upper bound with area 01 included". Keep "quote-only" for areas whose only option is unpriced.
- **C-C2 (budget scenario vs selected plan).** After typing a budget, the result box shows the $500 scenario while section 3 still reads "Balanced plan · selected for report" until **Choose Budget scenario** is pressed.
  - Suggest one line in the result box: "Choose Budget scenario to use it in the report."
- **C-C3 (wording drift between UI and report).**
  - "Full project cost: quote needed" / "Priced work subtotal" (UI) versus "Partial estimate … for known costs, plus required quotes" (report).
  - The UI caveat that Balanced's lower subtotal is not a cheaper project does not appear in the exported report, though each plan does say "plus required quotes".
  - Suggest carrying the one-sentence caveat into the report's plan comparison.
- **C-C4 (checklist heading).** "Site measurement checklist (15)" in the UI versus "Measurements needed" per finding in the report. Suggest the same name.
- **C-C5 (minor).**
  - "Prioritise" in the budget card versus "Prioritizes" in the report; use one spelling.
  - Essential says "Choose the lowest priced suitable option for each", yet it seals area 02, where the suitability note says sealing "does not … restore a loose fragment" and Balanced recommends local repair. The conditional note covers it; adding "if inspection confirms sealing is suitable" to Essential would make that explicit.

## Artifacts (ignored, local only)

In `.curb-local/budget-independent-qa/`:
- `1366-policies.jpg`, `1366-budget-500.jpg`
- `390-policies.jpg`, `390-durable-caution-budget.jpg`, `390-breakdown.jpg`, `390-focus-obscured-essential.jpg`
- `390-learning-lab.jpg`

The 1366 screenshots were downscaled to 800px wide by the pane; the page was laid out at the emulated viewport.

## Honest limits

- Chromium emulation only: no physical device, no Google Chrome and no screen reader.
- One HTML export was read in full. PDF, JSON and CSV were not re-downloaded, and the earlier policy exports were not repeated.
- One $500 and one insufficient ($50) budget were tried, as assigned. Boundary values, invalid inputs and rejected-finding flows were not re-run; D's report covers them.
- The check was made on `4d44143`. It does not include later integration changes.
- No application code was changed.
