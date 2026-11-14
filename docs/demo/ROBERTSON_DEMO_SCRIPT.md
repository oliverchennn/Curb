# Robertson Hall — two-minute demo and rehearsal sheet

Developer D / ROBERTSON-DEMO-SCRIPT/1. Original task base: `ae583471dcdd60455ccf1746e3a13459fe03bcac`; [assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877377911), [ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877531108). Root has since exercised the actual integrated UI/API and prepared the offline walkthrough. This script remains the guide for a **live timed presentation**, which still needs a presenter rehearsal; an edited 120-second backup does not establish live timing. Current verification and exact sources are in [ROBERTSON_INTEGRATION.md](ROBERTSON_INTEGRATION.md).

Root revision-2 update: the user identified two omissions in the three-finding snapshot reviewed by D. The current editable inventory now contains five findings, including the connected surface breakup and final transverse crack. Amounts below use that expanded inventory; the earlier independent review remains a pinned historical record.

## Two-minute script

The six timed cues include time for clicks and short pauses. Start with restored original data, an empty budget field and the normalized video paused. Route: `/curb/surveys/robertson-hall`. Cues are operator instructions; quoted paragraphs are spoken copy.

**0:00–0:18 — Show Survey replay and the site context.**

> Curb helps facilities teams turn sidewalk footage into evidence they can inspect and repair choices they can discuss. For wheelchair, walker and cane users, an irregular walking surface can matter. This example uses footage supplied from outside Robertson Hall at Princeton.

**0:18–0:36 — Play briefly; select Defect 02 to seek to 9.5 seconds.**

> This is the actual fourteen-second clip. Five stable defect IDs connect the visible cracks to their close-ups and tracked frames. Selecting Defect 02 returns to its evidence. These are AI-assisted proposals, with human field review still pending.

**0:36–0:54 — Show the finding's inspection needs and unknown route impact.**

> The irregular edges suggest possible effects on wheel contact, cane tips and footing. Width, height difference, slope and clear passage still need measurement. Curb keeps those questions visible. This incomplete survey does not establish ADA compliance or an accessible route.

**0:54–1:18 — Show the three policy cards and quote-required items.**

> Essential's priced subtotal is $294 to $2,294. Balanced shows $216 to $1,434 plus two patch quotes. Durable renews five work areas. These estimates use assumed quantities and omit unpriced setup. Sealing rates are selected 2021 bids; replacement references come from a 2026 bid.

**1:18–1:42 — Enter $500; then enter a reviewer and reject Defect 02.**

> A $500 budget selects one high-priority sealing option, with a $72 to $478 priced subtotal. Setup still needs a quote, so the fit remains partial. A reviewer can reject a finding or correct its description. The proposed work and export data must follow those decisions.

**1:42–2:00 — Restore original; show export controls and a previously verified PDF.**

> After review, export the current findings and assumptions for a facilities discussion. JSON, CSV, PDF and accessible HTML reflect the edits; the downloaded annotated video retains its original analysis labels. The next step is field inspection and a qualified quote, with uncertainties carried forward.

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
- [ ] **Timing:** run the six cues with a stopwatch. Save the checked PDF beforehand for the final cue. If exports or any dependency remain unavailable, disclose that limit and show the inspected footage/cost discussion without claiming a successful live report.

Rehearsal record: commit ______ · browser/viewport ______ · timestamp ______ · elapsed ______ · operator ______ · screenshots/PDF/logs ______ · unresolved issues ______.

Price-reference cue: Palmyra page 1 A1.6 selects $75–$223/SY from the first four bidders. NJDOT page 74 item 0083 selects $18/$59.75 per LF from bidders 4/5 in 2021. Neither is the full bid spread or a current campus-job quote. Source links, hashes and independent page checks are in [ROBERTSON_REVIEW.md](ROBERTSON_REVIEW.md).

## Saved backup

`scripts/curb/build_backup.py` builds a 120-second MP4 from actual app captures, the complete annotated clip and a rendered PDF page. It is an edited walkthrough of captured states, not a continuous live-screen recording. It has on-screen presenter cues and no narration. Input and output SHA-256 hashes are recorded beside it. Keep the MP4 and a checked `default.html`/`default.pdf` on the presentation machine before going offline; HTML embeds all five photos. Root's in-app browser disallows local-file URLs, so root inspected the rendered PDF while B independently opened saved HTML offline in Chrome. No browser policy was bypassed.

The final backup is committed at `public/curb/surveys/robertson-hall/demo-backup.mp4`; its receipt is `demo-backup.json` in the same folder. It includes the corrected five-finding overlay and is decoded/visually checked. The [portable runbook](ROBERTSON_PORTABLE_RELEASE.md) covers saved reports and independent offline verification. A presenter's live stopwatch rehearsal and physical projector/assistive-technology checks are still separate from the software and edited-video verification.
