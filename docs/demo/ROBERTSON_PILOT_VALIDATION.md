# Robertson Hall pilot validation packet

Use the five-finding Robertson Hall sidewalk survey, revision 2, to test whether disabled campus users can interpret the evidence and express priorities, and whether facilities staff can turn the same evidence into an inspection and quote brief. Use `/curb/surveys/robertson-hall` at the [pinned release checkpoint](https://github.com/oliverchennn/Curb/commit/1ea205d6630eee001e4f827c456cf828567ec9ea). The tasks and expected observations below are examples for future sessions.

## Run a voluntary session

Allow about 25 minutes plus breaks. Start from **Restore original** if there are prior edits, clear the budget, and have a saved accessible HTML copy available. Let the participant choose a remote or accessible in-person setup, their device and assistive technology, and their preferred format. Ask “What would make this session easier to take part in?” Offer keyboard access, written prompts, captions or breaks as requested. Participants can skip questions or stop at any point. A diagnosis or demonstration of travel over the surveyed sidewalk is unnecessary.

Tell participants what the facilitator will record and who will see it. Ask permission for notes and separately for any recording. Use a session code, keep accommodation logistics separate from observations, and omit identifying details from shared notes and exports. For disposable review edits, use the session code in the app’s **Reviewer** field. Capture the task, finding or panel ID, outcome (independent, prompted, blocked or skipped), where help was needed and the participant’s reason or suggested change. Ask neutral questions before explaining the expected result.

### Tasks for disabled campus users

1. **Find and interpret the evidence.** Open `defect-02` and find its close-up at 9.5 seconds. Try the same task for `defect-05` using the finding list or saved HTML. Ask what the image shows, what could affect a trip, and what information is still missing. Give the participant a text-first path if video is difficult to use.
2. **Set a priority in their own words.** “Which of these areas would you ask facilities to inspect first, if any? What would you want checked?” Compare `defect-03` and `defect-04` as an example. Record the reason, disagreements and evidence the person would need. They can decline to rank the examples.
3. **Explain what a review means.** On a disposable copy, accept or correct a finding and ask what changed and what they can conclude about traversal. Ask whether anything in the screen or report implies they should rely on the route. Open the saved accessible HTML and find the finding, its review state and its evidence. Offer the PDF as a visual reference if requested.

### Tasks for facilities staff

1. **Check review and work-area grouping.** Trace `defect-04` to `panel-04`. Identify why the connected damage is one provisional work area and which site measurements could change that. Reject `defect-04` in a disposable review. Check that its evidence and rejection remain in the report while `panel-04` drops out of proposed repair selection. Restore the original before the budget task.
2. **Read a constrained budget.** Enter $1,500 and select the budget plan. The original scenario selects seal options on `panel-01`, `panel-02` and `panel-03`, defers `panel-04` and `panel-05`, and shows a partial $216–$1,434 known subtotal plus the shared setup quote. Ask staff to identify the outstanding quote and assign a next step for each deferred area. The figure is a demo estimate using assumed quantities. [Pinned report QA](ROBERTSON_FIVE_EXPORT_QA.md).
3. **Hand off a reviewed snapshot.** Make one copy with a test review and a budget. Download HTML, PDF, CSV and JSON from that same state. Have a second reader identify the focused plan, deferred areas and partial costs in the HTML/PDF, then match the finding ID, evidence timestamp and review state in CSV and JSON. Open HTML from disk with the server unavailable. The data exports carry survey and review records. Plan totals are in the reports. [Pinned export checks](ROBERTSON_EXPORT_ADVERSARIAL.md).

## Inspection and quote worksheet

For each row, the inspector records date, role, confirmed location and panel boundary, annotated photo or field reference, method, measurement and unit, and any remaining uncertainty. Measure opening width and orientation, vertical difference, edge stability, affected extent, remaining clear width, running slope and cross slope as applicable. Use the checks in the source register to guide inspection. A professional determines which standards and sections apply. [U.S. Access Board, ADA Accessibility Standards, §§302.3, 303 and 403](https://www.access-board.gov/ada/).

| Finding and work area | Possible access effect to investigate | Field check and candidate scope |
| --- | --- | --- |
| `defect-01` → `panel-01`, transverse crack, 7.00 s | Irregular edge may affect small wheels, walker wheels, cane tips or footing. | Measure gap and level difference at the crossing. Consider seal only for a stable edge without displacement that needs another repair. Measure linear feet for seal, depth and extent for a localized patch, or panel area for replacement. |
| `defect-02` → `panel-02`, branched crack, 9.50 s | A loose branch or fragment may affect wheel contact and footing. | Check fragment movement, sound substrate and remaining clear width. Request a measured patch scope if localized repair is suitable. Compare eligible seal or replacement on the confirmed condition. |
| `defect-03` → `panel-03`, diagonal crack, 12.00 s | Crossing angle and opening may affect wheel or cane contact. | Measure opening orientation relative to travel and level difference. Consider seal on stable edges or measure patch/replacement scope if deterioration or displacement requires it. |
| `defect-04` → `panel-04`, surface breakup, 6.00 s | Broken edges and loose material may affect wheel contact, cane use or footing at the junction. | Delineate the full connected damaged area, check substrate and loose material, and measure passage through the junction. Compare one localized patch with one replacement scope using the confirmed boundary. |
| `defect-05` → `panel-05`, final transverse crack, 13.93 s / frame 418 | Irregular edge may affect small wheels, cane tips or footing. | Locate the final frame’s finding in the field. Measure opening, vertical difference and extent. Consider seal if stable, localized patch if the substrate supports it, or measured replacement. |

For each area record the chosen option ID or deferral, reason and next owner. Ask for a dated, itemized quote on the measured scope with unit, quantity, rates, exclusions and validity. Confirm preparation/materials and patch depth, or thickness, base, drainage, removal and disposal for replacement. Record `site-setup` once for the job, including site verification, mobilization and accessible work-zone provision. Check any job minimum and exclusions so setup and scope are reconciled across area quotes. The demo's seal and replacement references are historical bid items. Patch and setup remain unpriced until quoted. [Pinned survey catalog](../../src/data/curb/surveys/robertson-hall.json), [NJDOT contract 21132 bid tabulation](https://www.nj.gov/transportation/contribute/business/procurement/ConstrServ/documents/BidTabsDP21132_Redacted.pdf), [Palmyra sidewalk bid tabulation](https://erinj.com/wp-content/uploads/2026/04/44538-00-2026-03-24-bid-summary.pdf), [FHWA maintenance guide](https://highways.dot.gov/sites/fhwa.dot.gov/files/2024-10/Guide_for_Maintaining_Active_Transportation_FHWA-SA-23-005.pdf).

Compare like-for-like scope before comparing numbers. Copy the panel row for each verified work area. Mark unmeasured quantities and missing prices as pending. Record the reason for each difference, such as quantity, condition, scope, rate or setup.

| Work area | Demo option, quantity assumption and range | Field quantity and unit | Quote reference, scope and price | Difference and reason | Open item, owner and due date |
| --- | --- | --- | --- | --- | --- |
| `panel-__` | | | | | |
| `site-setup` | Quote required | | | | |

## Decide whether to advance

| Check | Go evidence | Hold condition |
| --- | --- | --- |
| Evidence clarity | Users can find the right ID and image in their chosen mode and distinguish observed damage from a possible access effect without a facilitator correction. | Wrong finding, unclear image or missing equivalent evidence blocks the task. |
| Unknown traversal | Users and staff can explain that accepting a finding records a review decision. Traversal, exact field location and ADA compliance remain undetermined. | Someone relies on a finding, priority or plan as a route opening, a measured hazard or a compliance verdict. |
| Deferred needs | Staff identify both deferred areas in the $1,500 example and record the next inspection or quote owner for each. Rejected evidence stays visible. | A deferred area or its next step disappears, or a rejected finding still drives repair selection. |
| Budget interpretation | Staff name the partial subtotal and outstanding setup and can show where measured scope and current prices will be entered. | Staff read the subtotal as an all-in price, a guaranteed fit or a zero-cost allowance. |
| Exports | With the server stopped, the second reader navigates the HTML using their chosen mode and finds the same evidence and review state as the downloaded files. PDF/HTML agree on the focused plan and cost status. | An export cannot be opened in the intended mode or the files disagree on IDs, review decisions, plan or amounts. |

Proceed to scoped professional inspection and comparable quotes after the critical tasks pass or are retested following a fix. Treat repeated confusion about traversal or price as a stop signal for wider use. Any repair decision still needs measured scope, a complete quote comparison and facilities review.

## Follow-up backlog

| Priority | Candidate | Evidence before implementation |
| --- | --- | --- |
| 1 | Fix observed evidence, navigation or estimate wording | A repeatable blocked or misleading task with a finding ID and access mode. Retest with the affected mode before adding workflow scope. |
| 2 | Save and resume reviews | Observed loss of needed work across sessions or handoffs. Identify who can see or change reviews, what history is needed, and when records should expire. |
| 3 | Uploads and background processing | Multiple authorized sites or repeat surveys that exceed the fixed example. Document consent and media handling, allowed input and size, measured operator wait, failure recovery, and review of proposed findings. Add background processing only when the observed wait or interruptions justify it. |
| 4 | Work orders | Facilities confirms a real handoff need after measured inspection and current quotes. Record required fields, approval owner, status reconciliation and a safe trial using a draft order. |
