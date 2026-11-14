# Robertson Hall — two-minute demo and rehearsal sheet

Developer D / ROBERTSON-DEMO-SCRIPT/1. Original task base: `ae583471dcdd60455ccf1746e3a13459fe03bcac`; [assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877377911), [ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877531108). Root has since exercised the actual integrated UI/API and prepared the offline walkthrough. This script remains the guide for a **live timed presentation**, which still needs a presenter rehearsal; an edited 120-second backup does not establish live timing. Current verification and exact sources are in [ROBERTSON_INTEGRATION.md](ROBERTSON_INTEGRATION.md).

Root revision-2 update: the user identified two omissions in the three-finding snapshot reviewed by D. The current editable inventory now contains five findings, including the connected surface breakup and final transverse crack. Amounts below use that expanded inventory; the earlier independent review remains a pinned historical record.

## Two-minute script

The eight proposed cues include time for clicks and short pauses. Start at `/curb/upload`; choose the original Robertson Hall MOV or **Use Robertson Hall demo**. The explicitly labeled 10-second processing simulation opens the prepared survey with original data, an empty budget and the video paused. `/curb/surveys/robertson-hall` remains a direct entry when skipping the introduction. Cues are operator instructions; quoted paragraphs are spoken copy. The last two cues require the combined collection/explorer release. Check the [current release gates](CURB_RELEASE_CHECKPOINT.md) and rehearse the timing on the final build; these allocations are not a recorded stopwatch result.

**0:00–0:16 — Start the prepared demo; let the processing simulation open Survey replay.**

> Curb connects sidewalk footage to repair decisions for disability access. This ten-second walkthrough opens analysis prepared from our Robertson Hall clip. We can inspect the evidence, compare repair choices, and carry the unanswered questions into a facilities report.

**0:16–0:34 — Play briefly; select Defect 04 to seek to 6 seconds.**

> This is the actual fourteen-second clip. Five stable defect IDs connect the cracks and surface breakup to their close-ups and tracked frames. Defect 04 is one connected repair area. These are AI-assisted proposals, with human field review still pending.

**0:34–0:47 — Show the finding's possible access effects and inspection needs.**

> Irregular edges may affect small wheels, cane tips and footing. Width, level difference and clear passage still need measurement. Those open questions stay visible; this video does not establish ADA compliance or route availability.

**0:47–1:10 — Select Compare repairs; show the three policy cards and quote-required items.**

> Essential's priced subtotal is $294 to $2,294. Balanced shows $216 to $1,434 plus two patch quotes. Durable renews five work areas. These estimates use assumed quantities and omit unpriced setup. Sealing rates are selected 2021 bids; replacement references come from a 2026 bid.

**1:10–1:25 — Enter $500 and select the budget plan.**

> A $500 budget selects one high-priority sealing option, with a $72 to $478 priced subtotal. Setup still needs a quote, so the fit is partial. The four deferred areas remain visible. A smaller budget does not erase an access concern.

**1:25–1:40 — Select Export report; start the PDF download and show the saved, verified budget report.**

> The report carries the selected work, deferred needs, evidence and quote checklist into a facilities discussion. JSON, CSV, PDF and accessible HTML reflect the review. The annotated video is a fixed export of the original analysis.

**1:40–1:50 — Open Collection demo; show the moving camera callouts or select a sensor.**

> This simulated robot shows our proposed collection approach: context, surface and curb views feeding a review queue. It illustrates the concept; calibrated measurements and hardware validation are future work.

**1:50–2:00 — Open Route explorer; switch an archive corridor to Robertson Hall snapshots.**

> The explorer connects source geometry to its records. Archive data and real field photos stay distinct. Unplaced findings remain in the inventory, and current traversal stays unknown.

## One-page rehearsal checklist

Use this checklist for each final presenter rehearsal. The boxes are operator checks, not a claim that an unchecked item has never been tested; observed integration checks and independent reviews are recorded separately. Record commit, browser, viewport, time and artifact paths.

- [ ] **Ready source:** record the coordinator's exact combined SHA and completed full-check evidence. Confirm real B GET/CSV/PDF modules, root corrections and C styles are integrated. Load the route without stand-ins or a synthetic fallback.
- [ ] **Reset:** restore original; clear budget. Five pending AI findings, no measurements, no individual map pins, unknown route impact. Context geography is approximate and attributed.
- [ ] **Seek/play:** keyboard-select defects at 7 / 9.5 / 12 / 6 / 13.933 seconds. Confirm portrait aspect, stable labels and boxes; switching video variants preserves time. Verify no defect-01 box at frame 230 or defect-03 box at 371 in corrected data. Defect 04 stops after frame 301; Defect 05 remains visible on the last frame (418).
- [ ] **Policies:** Essential $294–$2,294 plus setup; Balanced $216–$1,434 plus two patches **and** setup; Durable $600–$4,906 plus setup/exclusions. All are partial estimates; conditional treatment suitability and assumed quantities remain visible.
- [ ] **Budget:** $500 → area 01 seal, $72–$478, partial. $100 → no priced repair fits. `1.005` is invalid. Clear budget to restore three policy cards.
- [ ] **Review:** require a reviewer; reject defect-02. Its area is excluded; Essential becomes $222–$1,816 and Durable $487.50–$4,014, both partial. Restore returns five pending findings. Priority edits also require an access rationale.
- [ ] **Exports:** explicitly download an edited and restored JSON/CSV/PDF; compare IDs, reviews, selected plan, amounts and unpriced items with the screen. Inspect every PDF page. Confirm fixed annotated-video labels are disclosed after edits.
- [ ] **Usability:** rehearse keyboard focus, video controls and errors; inspect 390px and projector viewport; verify readable contrast, no horizontal overflow and reduced-motion behavior.
- [ ] **Offline/errors:** with the local server running, disconnect external networking and reload. Confirm local media/context/exports work; simulate missing video and failed GET/PDF, check actionable recovery without substituted data.
- [ ] **New pages:** the collection simulation loads locally; its pause, sensor and static-diagram controls work. The explorer switches from archive geometry to all five Robertson snapshots without drawing invented finding positions. Label the concept and archive limits aloud.
- [ ] **Timing:** run the eight cues with a stopwatch. Save the checked $500 budget PDF beforehand for the export cue. If exports or any dependency remain unavailable, disclose that limit and show the inspected footage/cost discussion without claiming a successful live report. Skip the two concept/explorer cues if their combined release is not verified.

Rehearsal record: commit ______ · browser/viewport ______ · timestamp ______ · elapsed ______ · operator ______ · screenshots/PDF/logs ______ · unresolved issues ______.

Price-reference cue: Palmyra page 1 A1.6 selects $75–$223/SY from the first four bidders. NJDOT page 74 item 0083 selects $18/$59.75 per LF from bidders 4/5 in 2021. Neither is the full bid spread or a current campus-job quote. Source links, hashes and independent page checks are in [ROBERTSON_REVIEW.md](ROBERTSON_REVIEW.md).

## Saved backup

`scripts/curb/build_backup.py` builds a 120-second MP4 from actual app captures, the complete annotated clip and a rendered PDF page. It is an edited walkthrough of captured states, not a continuous live-screen recording. It has on-screen presenter cues and no narration. Input and output SHA-256 hashes are recorded beside it. Keep the MP4 and a checked `default.html`/`default.pdf` on the presentation machine before going offline; HTML embeds all five photos. Root's in-app browser disallows local-file URLs, so root inspected the rendered PDF while B independently opened saved HTML offline in Chrome. No browser policy was bypassed.

The final backup is committed at `public/curb/surveys/robertson-hall/demo-backup.mp4`; its receipt is `demo-backup.json` in the same folder. It includes the corrected five-finding overlay and is decoded/visually checked. The [portable runbook](ROBERTSON_PORTABLE_RELEASE.md) covers saved reports and independent offline verification. A presenter's live stopwatch rehearsal and physical projector/assistive-technology checks are still separate from the software and edited-video verification.
