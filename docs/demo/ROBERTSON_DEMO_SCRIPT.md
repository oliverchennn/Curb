# Robertson Hall — two-minute demo and rehearsal sheet

Developer D / ROBERTSON-DEMO-SCRIPT/1. Exact task base: `ae583471dcdd60455ccf1746e3a13459fe03bcac`; [assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877377911), [ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877531108). This file is a proposed presenter script, **not a completed browser rehearsal**. UI/report actions below must be exercised against the coordinator's final combined source before presentation; C's earlier harness with API stand-ins does not satisfy that gate.

Numbers and evidence anchors come from the [independent review](ROBERTSON_REVIEW.md). The current canonical data at [`9c337cf69c3ac5df843e499f7ed6d304a8c5f61e`](https://github.com/oliverchennn/Curb/blob/9c337cf69c3ac5df843e499f7ed6d304a8c5f61e/src/data/curb/surveys/robertson-hall.json) was separately read: rates, quantities and default treatment choices remain unchanged; labels and track exits were corrected. The coordinator's [integration record](https://github.com/oliverchennn/Curb/blob/9c337cf69c3ac5df843e499f7ed6d304a8c5f61e/docs/demo/ROBERTSON_INTEGRATION.md) distinguishes those checks from pending final acceptance.

## Two-minute script

The six timed cues include time for clicks and short pauses. Start with restored original data, an empty budget field and the normalized video paused. Route: `/curb/surveys/robertson-hall`. Cues are operator instructions; quoted paragraphs are spoken copy.

**0:00–0:18 — Show Survey replay and the site context.**

> Curb helps facilities teams turn sidewalk footage into evidence they can inspect and repair choices they can discuss. For wheelchair, walker and cane users, an irregular walking surface can matter. This example uses footage supplied from outside Robertson Hall at Princeton.

**0:18–0:36 — Play briefly; select Defect 02 to seek to 9.5 seconds.**

> This is the actual fourteen-second clip. Three stable defect IDs connect the visible cracks to their close-ups and tracked frames. Selecting Defect 02 returns to its evidence. These are AI-assisted proposals, with human field review still pending.

**0:36–0:54 — Show the finding's inspection needs and unknown route impact.**

> The irregular edges suggest possible effects on wheel contact, cane tips and footing. Width, height difference, slope and clear passage still need measurement. Curb keeps those questions visible. This incomplete survey does not establish ADA compliance or an accessible route.

**0:54–1:18 — Show the three policy cards and quote-required items.**

> Essential's priced subtotal is $144 to $956. Balanced shows the same subtotal but also needs a patch quote. Durable replaces three panels. These estimates use assumed quantities and omit unpriced setup. Sealing rates are selected 2021 bids; replacement references come from a 2026 bid.

**1:18–1:42 — Enter $500; then enter a reviewer and reject Defect 02.**

> A $500 budget selects one high-priority sealing option, with a $72 to $478 priced subtotal. Setup still needs a quote, so the fit remains partial. A reviewer can reject a finding or correct its description. The proposed work and export data must follow those decisions.

**1:42–2:00 — Restore original; show export controls and a previously verified PDF.**

> After review, export the current findings and assumptions for a facilities discussion. JSON, CSV and PDF should reflect the edits; the downloaded annotated video retains its original analysis labels. The next step is field inspection and a qualified quote, with uncertainties carried forward.

## One-page rehearsal checklist

Complete on the real combined build. Record commit, browser, viewport, time and artifact paths. Every box below is initially **unchecked**; expected values are authored data expectations, not observed UI passes.

- [ ] **Ready source:** record the coordinator's exact combined SHA and completed full-check evidence. Confirm real B GET/CSV/PDF modules, root corrections and C styles are integrated. Load the route without stand-ins or a synthetic fallback.
- [ ] **Reset:** restore original; clear budget. Three pending AI findings, no measurements, no individual map pins, unknown route impact. Context geography is approximate and attributed.
- [ ] **Seek/play:** keyboard-select defects at 7 / 9.5 / 12 seconds. Confirm portrait aspect, stable labels and boxes; switching video variants preserves time. Verify no defect-01 box at frame 230 or defect-03 box at 371 in corrected data.
- [ ] **Policies:** Essential $144–$956 plus setup; Balanced $144–$956 plus patch **and** setup; Durable $337.50–$2,676 plus setup/exclusions. All are partial estimates; conditional treatment suitability and assumed quantities remain visible.
- [ ] **Budget:** $500 → area 01 seal, $72–$478, partial. $100 → no priced repair fits. `1.005` is invalid. Clear budget to restore three policy cards.
- [ ] **Review:** require a reviewer; reject defect-02. Its area is excluded; Essential becomes $72–$478 and Durable $225–$1,784, both partial. Restore returns three pending findings. Priority edits also require an access rationale.
- [ ] **Exports:** explicitly download an edited and restored JSON/CSV/PDF; compare IDs, reviews, selected plan, amounts and unpriced items with the screen. Inspect every PDF page. Confirm fixed annotated-video labels are disclosed after edits.
- [ ] **Usability:** rehearse keyboard focus, video controls and errors; inspect 390px and projector viewport; verify readable contrast, no horizontal overflow and reduced-motion behavior.
- [ ] **Offline/errors:** with the local server running, disconnect external networking and reload. Confirm local media/context/exports work; simulate missing video and failed GET/PDF, check actionable recovery without substituted data.
- [ ] **Timing:** run the six cues with a stopwatch. Save the checked PDF beforehand for the final cue. If exports or any dependency remain unavailable, disclose that limit and show the inspected footage/cost discussion without claiming a successful live report.

Rehearsal record: commit ______ · browser/viewport ______ · timestamp ______ · elapsed ______ · operator ______ · screenshots/PDF/logs ______ · unresolved issues ______.

Price-reference cue: Palmyra page 1 A1.6 selects $75–$223/SY from the first four bidders. NJDOT page 74 item 0083 selects $18/$59.75 per LF from bidders 4/5 in 2021. Neither is the full bid spread or a current campus-job quote. Source links, hashes and independent page checks are in [ROBERTSON_REVIEW.md](ROBERTSON_REVIEW.md).
