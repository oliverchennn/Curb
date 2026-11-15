# Robertson evidence demo for the three-minute pitch

Task family: `SURVEY-PRESENTER/1`. Prepared 2026-11-15 for Vincent's request to implement recommendations 1, 2 and 4: a compact presenter view, one visible human review action, and better source-frame selection. This is an implementation plan, not a claim that these changes or rehearsals have been completed.

The intended result is a 40-second evidence sequence within the existing three-minute pitch: show actual Robertson footage, reveal the review overlays, jump to Surface breakup, record one real visual-review decision, and show what still needs field verification. Then continue to the separately labeled synthetic investment demo.

## Scope and current coordination

Use the current canonical `oliverchennn/Curb` repository and live board. This planning inspection reached [6892472371](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892472371). The existing investment task is assigned at [6892289223](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892289223); its API source `2f61604771ada3f39dd678adea2955c310e0249b` is released, and the UI lead is completing runtime verification. Do not duplicate that task or alter its active scope.

**Survey files have an active writer.** The same PR18 correction lead is handling the Accept → optional Plan → Mark pending round-trip issue. [6892464920](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892464920) explicitly adds `SurveyWorkspace.tsx` to that lead for original-history prop wiring. `FindingReview.tsx`, survey styles and the canonical Robertson data also belong to that correction lane. Wait for its actual stopped/released checkpoint, then assign this as a sequential follow-up or transfer the named files explicitly. Preserve the corrected guards and original-history prop. A read-only frame audit and new disjoint media artifacts may proceed earlier after their own assignment.

The existing integration/Vercel publisher `01a1dc6e-1818-7dd2-ae95-8ac3fcfca3b5` ACKed at [6892439845](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892439845). The existing live checker `01a1de18-2671-7590-b81f-e13bb62d64d9` remains the production acceptance owner. The presenter chat `01a1de88-03eb-7d10-b415-e507bb1c7d60` supplied `docs/demo/INVESTMENT_DEMO_SCRIPT_DRAFT.md`; the coordinator retains the final `INVESTMENT_DEMO_SCRIPT.md` and `INVESTMENT_DEMO_RESULT.md` paths. Deliver revised cues to those owners rather than writing their files in parallel.

This planning chat writes only this document and `SURVEY_PRESENTER_ORCHESTRATOR_PROMPT.md` in the local planning checkout. They start as local files; copy/publish them from a current fetched base before remote dispatch. Do not merge historical `codex/r2-coordination`. Follow the live two-host workflow, actual model overrides, one-writer scopes and existing release process. Reconcile newer board messages before implementation.

## Observed starting point

The live survey route is `/curb/surveys/robertson-hall`. The preceding visual review checked original/review mode switching and evidence selection at 6.0 and 9.5 seconds. Surface breakup at 6.0 seconds was a clear presentation example; the branched-crack frame at 9.5 seconds appeared motion-blurred. The portrait video and long finding/map column required scrolling to connect footage to the detailed review. These are observations at the inspected desktop viewport, not a new all-frame tracking audit.

Current source already supplies most of the needed behavior:

- `SurveyWorkspace.tsx` owns fetched immutable original data, edited in-tab survey state, selected finding, seek requests, counts, restore and workflow tabs. Existing `?finding=<validated-id>` links seek to that finding's evidence time.
- `FindingReview.tsx` requires a reviewer name and uses the shared review helpers. It renders the finding list and site context before the selected detail, and currently contains Accept/Reject/Mark pending/correction controls.
- `VideoEvidence.tsx` has Original, Review and Annotated modes. Review draws current-state overlays; pending boxes are dashed, accepted boxes are solid, and rejected findings are omitted. Annotated is a fixed exported video whose labels do not change after review.
- Overlay coordinates use `containedRect`, `boxToRect`, `ResizeObserver` and the actual media frame time. Keep these semantics when resizing the player.
- The source clip is normalized to 720×1280, 30 fps, 419 frames, duration approximately 13.967 seconds. The immutable original MOV SHA-256 is `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a`.

The selected scope introduces no new field measurements, footage collection, live inference, detection accuracy claim, robot-capture claim, routing assessment or metric benchmark. The earlier metrics task remains separate. Keep the existing normal review/export workflow available.

## Presenter view

Add an explicit **Presenter view** toggle within the survey workspace and a direct entry URL `/curb/surveys/robertson-hall?present=1`. Use the existing route and data-loading path. No new global navigation item, application shell, API or survey contract is needed.

Presenter view is a presentation of the same survey state. Entering/exiting it must not discard review edits, create duplicate review records, reset the typed reviewer, or replace the authoritative original. Use the existing `FindingReview` and `VideoEvidence` with an explicit compact variant, or a small shared presentational extraction after scope is frozen. Do not build a second independent review engine. Keep one mounted reviewer input/action set; hidden controls must not remain focusable or produce duplicate IDs.

On a fresh `?present=1` load, select `defect-04`, use Original mode, and pause at the start of the clip. A valid explicit `finding` query still selects and seeks to its selected source frame; invalid IDs fall back visibly to the available findings without fabricated data. Opening or refreshing the presentation URL never auto-accepts a finding. Switching view during an existing review preserves its selected finding/time and edits; the fresh-load starting preset is not reapplied on every render.

The presenter view places these elements on one desktop screen:

| Area | Required contents |
| --- | --- |
| Compact heading | Robertson Hall; real footage; prepared analysis; current pending/accepted counts |
| Video stage | Original/Review controls, bounded portrait video, native playback controls, current time, short pending/accepted legend |
| Evidence selector | Five accessible numbered findings; the selected label and an explicit jump-to-evidence action remain clear |
| Selected finding card | Label, enlarged real source close-up, one short visible-observation description, review status and reviewer field |
| Decision | Existing Accept finding / Reject finding actions and their real validation/error/status output |
| Next inspection | One or two existing measurement needs and a short statement that route impact remains unknown |
| Secondary controls | Full review, Restart presenter demo, and a link to the accepted Investment demo |

Keep the site map, complete five-row finding list, standards detail, repair forms and export controls behind **Full review** or appropriate disclosures. They remain accessible; they should not consume the initial presentation viewport. Keep a concise visible provenance line, such as **Real footage · Prepared analysis · Field measurements pending**, with complete provenance in a disclosure. This copy does not change review data.

Target 1366×768 and 1280×720 at 100% browser zoom. From the top of the page, the video, Original/Review controls, selected crop, reviewer input, Accept action and review outcome must be visible without page scrolling. Allow ordinary scrolling when secondary details are expanded, at higher zoom, or on a phone. Do not achieve the desktop target by clipping content or shrinking essential body text below 16px. At 390×844, stack content in logical reading order with no horizontal overflow and accessible touch targets.

Bound the video stage by available viewport height and use `object-fit: contain`. The existing width-driven 9:16 aspect ratio must not force a full-width, very tall player in presenter mode. Do not use `object-fit: cover` while retaining the existing overlay coordinate math. Let the existing picture-rectangle measurement update after mode switches, resizing and layout changes. The larger close-up beside the video supplies detail when the full portrait picture becomes narrow. Labels may use the established short defect IDs at narrow picture widths; full names stay in the selected card and accessible selector.

Native controls remain usable and no label may cover the selected defect or playback controls. Keep reduced-motion behavior, text status, keyboard focus and pressed-state semantics. Use ordinary document layout with a responsive compact grid; fullscreen permissions, forced zoom and a new animation system are unnecessary.

## One real review action

The hero interaction uses **Review**, not the fixed Annotated export:

1. During preflight, the actual presenter enters their name in the existing reviewer field. Do not hardcode an identity or silently create a review before the presentation.
2. Play approximately three seconds of Original footage. The presenter controls playback; there is no autoplay timer that accepts data or advances the pitch.
3. Switch to Review and click the Surface breakup evidence shortcut. Pause at its verified source frame, initially frame 180 / 6.0 seconds unless the frame audit supports a better choice.
4. Inspect the visible surface deterioration, then click **Accept finding**. This must call the same validated update path as full review, preserving the newly corrected PR18 workflow/history rules.
5. Show the actual Pending → Accepted badge, accepted/pending count update, manual reviewer attribution, and dashed → solid selected overlay where visible. Keep the live status announcement in place and retain keyboard focus on the action group.
6. Point to **Field measurements pending / Route impact unknown**, then continue to the synthetic investment example. Acceptance confirms the visible observation only; it does not mark the physical route accessible, complete a repair or create a measurement.

With the unchanged five-pending starting data, accepting only Defect 04 should yield 1 accepted / 4 pending / 0 rejected. Derive these values from survey state; do not render scripted counters or color changes. Empty reviewer submission must show the existing validation and leave counts, history and overlay state unchanged. Repeating Accept must not append duplicate progress or announce another decision.

Keep correction and rejection available through full review. Do not use Mark pending as the rehearsal reset; that transition is the subject of an active correctness fix. **Restart presenter demo** must explicitly say that it clears in-tab review edits, restore from the immutable original using the existing restoration semantics, select Defect 04, pause Original at the start, and stay in presenter mode. It may retain the typed reviewer name as UI input, without retaining their decision. No server mutation or new persistence mechanism is introduced. The existing global Reset demo behavior must remain intact.

Preserve the current notice that review edits live in this browser tab and need export to be retained. The live pitch need not export a file, but acceptance must verify that the same review state is available in full review and the existing export flow. Do not claim the decision is saved to a backend merely because the badge changed.

## Select clearer evidence frames

Audit all five findings against the existing normalized clip. The task is to select faithful source frames, not to manufacture sharper pixels. Preserve original MOV, normalized video, fixed annotated video, existing analysis seeds, track arrays and canonical survey semantics.

Use these current anchors and retained spans as starting points, then verify them against the actual pinned data:

| Finding | Existing evidence anchor | Previously retained frame span |
| --- | ---: | ---: |
| Defect 01 | frame 210 / 7.0 s | 105–229 |
| Defect 02 | frame 285 / 9.5 s | 195–301 |
| Defect 03 | frame 360 / 12.0 s | 270–370 |
| Defect 04 | frame 180 / 6.0 s | 0–301 |
| Defect 05 | frame 418 / 13.933… s | 330–418 |

Compare the existing anchor with several nearby candidates within the retained span. Prefer less motion blur, clear visibility of the same defect, a useful amount of surrounding context, no clipping of the relevant feature, and a retained box aligned to that feature. A sharpness score may help sort candidates, but the author must inspect them and a reviewer must check the final choices. A frame with different content or missing tracking is not an acceptable substitute merely because it has a higher score. If no candidate improves a finding, retain the existing anchor and record that result. Defect 04 remains the main demo subject; do not force a new timestamp for it.

Create separate presenter-frame metadata at `src/data/curb/surveys/robertson-presenter-frames.json` and versioned frame/crop assets under `public/curb/surveys/robertson-hall/presenter-v1/`. This avoids overwriting the canonical survey JSON currently owned by PR18 and preserves the original evidence anchors. Each metadata entry contains the finding ID, integer decoded frame index, corresponding seconds, full-frame and crop asset paths, crop rectangle in normalized-video pixels, selected-frame rationale, source normalized-video hash and original MOV hash. Record a fingerprint of the relevant track data, plus dimensions/fps, in the metadata. All findings need an explicit retain/change decision.

Presenter mode uses this metadata only for its displayed **Source frame**, close-up and seek target. The edited `Survey` and exported review data retain their canonical fields. Use an explicit presentation adapter/props, not a cloned survey with silently overwritten evidence timestamps. Full review continues to show the canonical anchor. If a chosen presenter frame differs, label that difference in the evidence detail/disclosure so the relationship remains auditable. Do not label a frozen crop as a live video frame while playback is elsewhere.

Validate presenter metadata against the loaded survey's media identity, finding IDs and retained track. Review status/text edits must not invalidate otherwise compatible media. On mismatch, use the canonical evidence frame with a visible fallback notice; never display a mismatched crop or force a missing finding into the survey. The metadata is presentation-only and must never mark a route passable, change a review or become a new authoritative data source.

Use deterministic frame extraction from the normalized clip with existing preprocessing tools. Select decoded frame numbers rather than relying on approximate keyframe seeking. Save the full source frame and a crop with enough context to locate the defect. Do not apply generative enhancement, invented detail, sharpening intended to imply measurement, or a crop from another time without updating its metadata. Original source hashes must remain unchanged.

Add a narrow script such as `scripts/curb/prepare_presenter_frames.py` to reproduce only these selected assets and metadata. It must not run the existing broad `build_manifest.py` over the current survey: that script regenerates authored fields and can erase later workflow/evidence corrections. No retracking or new AI/provider call is required. Retain before/after contact sheets and extraction commands in the verification package. Any existing preprocessing dependencies must be reused or isolated; do not edit application manifests/lockfiles for this task.

The receipt must distinguish **frame selection and visual review** from detection accuracy, completeness, field measurement or professional inspection. Include every finding, including unchanged or still-blurred evidence. No new global accuracy claim belongs in the pitch.

## Implementation assignments and boundaries

Coordinator expands these proposed scopes into actual literal assignments with session, checkout, branch, full base and writer release. They are not active reservations. Prefer one UI lead and one disjoint media owner, followed by the existing acceptance/release owners.

| Work | Proposed writable paths |
| --- | --- |
| Presenter UI, after PR18 release | Existing `src/features/curb/survey/SurveyWorkspace.tsx`, `FindingReview.tsx`, `VideoEvidence.tsx`; new `src/features/curb/survey/SurveyPresenter.module.css`, `presenter.ts`, `presenter.test.ts` |
| Frame review and reproducible extraction | New `scripts/curb/prepare_presenter_frames.py`; new `src/data/curb/surveys/robertson-presenter-frames.json`; new `public/curb/surveys/robertson-hall/presenter-v1/defect-01-frame.jpg`, `defect-01-crop.jpg`, `defect-02-frame.jpg`, `defect-02-crop.jpg`, `defect-03-frame.jpg`, `defect-03-crop.jpg`, `defect-04-frame.jpg`, `defect-04-crop.jpg`, `defect-05-frame.jpg`, `defect-05-crop.jpg`; new `docs/demo/SURVEY_PRESENTER_FRAMES.md` |
| Independent acceptance receipt | New `docs/demo/SURVEY_PRESENTER_RESULT.md`, with coordinator-reserved screenshot/contact-sheet/log artifact paths listed before publication |
| Three-minute script and release | Existing presenter/coordinator updates its reserved `docs/demo/INVESTMENT_DEMO_SCRIPT.md` and `INVESTMENT_DEMO_RESULT.md`; existing serial publisher handles reviewed integration and Vercel |

The filename groups in the first row all refer to `src/features/curb/survey/`. New CSS should scope the compact variant without changing global buttons/layout or the existing full-review stylesheet. If a genuine dependency requires another existing file or test, request the precise scope from the coordinator. Do not silently edit `presentation.ts`, shared workflow helpers, survey schemas, canonical `robertson-hall.json`, track/analysis files, original media, navigation, investment components, package files or the active presenter's draft.

Freeze the presenter metadata shape and UI adapter before both lanes depend on it. Metadata validation and frame-selection tests belong in the new `presenter.test.ts`; this file should test meaningful behavior, not mirror markup. The UI lead may initially use canonical anchors and add the released presenter metadata at integration. Shared source writes wait for the PR18 author and descendants to stop; disjoint preparation does not grant those files early.

## Revised three-minute flow

The existing presenter/coordinator owns the final script. Use the following timing as its revision target. It devotes 40 seconds to the evidence interaction and leaves 11 seconds of recovery room. At most one already-verified opening statistic may be retained within the first 20 seconds; move the second statistic and detailed sourcing to supporting material.

| Clock | Action | Suggested narration |
| --- | --- | --- |
| 0:00–0:20 | Presenter view ready; establish the buyer's problem | “A campus can have ramps and still have disconnected routes. Facilities teams have a repair backlog and a fixed budget. Curb helps them review the evidence and decide which repairs belong together.” |
| 0:20–0:27 | Play roughly three seconds of Original footage, then pause | “We recorded this outside Robertson Hall. This is the original footage; the analysis was prepared beforehand.” |
| 0:27–0:38 | Switch to Review; select Surface breakup and show its source crop | “Each proposed finding links to the footage. Here the pavement is visibly breaking up.” |
| 0:38–0:50 | With the actual reviewer name already entered, click Accept finding | “I can review and accept that observation. You can see the review status change.” |
| 0:50–1:00 | Point to next inspection and unknown route impact; open Investment demo | “We still need field measurements. To demonstrate budget decisions across a network, we use this separate synthetic campus.” |
| 1:00–1:20 | Before repairs, $10,000; show Arrival, baseline Cafe, A/B and C | “The Cafe is already reachable. Library and Student center share two barriers. Hall has its own approach. These costs and route conditions are assumed.” |
| 1:20–1:50 | Condition-first then Curb recommendation | “Worst-condition-first spends ten thousand on C and opens Hall. Curb spends five thousand each on A and B and opens Library and Student center. Same budget, two newly reachable destinations instead of one.” |
| 1:50–2:13 | Omit A, then restore recommendation | “Remove the ramp repair and both new connections disappear. The two repairs need to be funded together.” Show the second omission only if ahead of time or asked. |
| 2:13–2:25 | $20,000, then return to $10,000 | “With enough budget, both plans reach the same destinations. The comparison shows where the limited budget changes the choice.” |
| 2:25–2:49 | Recommended investment brief and buyer/pilot close | “A facilities manager gets a proposed repair set, its evidence and the connections it is expected to restore under these assumptions. Next we want to validate one measured corridor with campus users and facilities staff.” |
| 2:49–3:00 | Recovery margin; leave the recommendation visible | No additional feature or unsupported metric is required. |

This is a script proposal, not a timed rehearsal receipt. Actual spoken timing governs final edits. Keep the investment numbers driven by the implemented response. Do not imply that accepting the Robertson finding caused the synthetic network result. Any metrics-study claims require their own accepted evidence and must fit by replacing other narration, not by extending the pitch.

## Preflight, recovery and acceptance

Before the live pitch, open the exact accepted deployment's presenter URL, verify video/crop loads, enter the real presenter's reviewer name, restart to the clean pending state and check the frame selection. Load the Investment demo in a second tab as a recovery option and confirm $10,000. Do not leave a pre-accepted finding and pretend the later click changed it. Avoid the upload simulation and analysis wait during the timed sequence.

Rehearse twice from a clean state. Record source/deployment SHA, browser, actual viewport, timings, operator and any failed clicks. The second rehearsal must repeat the acceptance transition after Restart presenter demo. Target 2:45–2:55 elapsed including clicks, with a hard three-minute maximum. If over time, cut a statistic, the second omission and secondary detail before cutting the review action or synthetic disclosure. This plan already schedules only one omission.

Required verification:

- At 1366×768 and 1280×720, capture the initial presenter view and accepted state from the top with the required controls/detail visible. At 1920×1080 check that the layout uses space sensibly; at 390×844 and 200% zoom check reflow, reachable controls and no horizontal clipping. No physical projector check is claimed unless one is actually used.
- Fresh presenter URL, explicit valid/invalid finding links, enter/exit presenter mode, browser back/forward, full review tabs, local edits and reviewer input all behave consistently. Exiting the compact view must not discard data or detach the existing original-history baseline.
- Empty reviewer does not mutate state. Real named Accept updates the selected finding, counts, attribution and overlay through the common handler. Duplicate Accept is idempotent. Reject still follows the normal behavior. Preserve the corrected Accept → optional Plan → Mark pending guard and save/restore/report round-trip through full review; do not reintroduce the bug to simplify a demo reset.
- Restart restores authoritative data, selects the hero, pauses Original at the start, preserves presenter mode and permits a second clean run. Global Reset retains its existing behavior. A review remains an in-tab edit until exported.
- Check all five source-frame choices against decoded pixels and retained boxes, including the final decoded frame. Seek must land on the expected frame; switching Original/Review must preserve time. The shown crop, frame label and selected finding agree. A missing/incompatible presenter metadata entry visibly falls back to canonical evidence.
- Verify box alignment and label placement at the hero frame, the selected new Defect 02 frame, 9.5 seconds where multiple boxes coexist, the last decoded frame, and while playing through the clip at both desktop target widths. Retain source/track hashes. Do not remove truthful boxes to make layout easier.
- Exercise video/crop failure: a real saved source frame may support a static evidence explanation, but the UI must show that video is unavailable. Never fake playback or silently show another finding's crop. Keep the record/action controls usable where their data is valid.
- Run the relevant survey/presenter tests, `npm run verify:media` where available (or its exact existing script), and final integrated `npm run check` plus currently required replay/CI checks. Add validation for the new presenter metadata/assets because the old asset script does not enumerate them. Record actual commands, results and skipped checks. No numerical golden result changes are expected from this presentation-only slice.
- Existing publisher integrates only reviewed released candidates, observes automatic Vercel deployment to READY, verifies matching public `/api/health` SHA, then gives the existing live checker the changed-flow matrix. Confirm on the actual final combined source when another merge supersedes a candidate. Preserve the previous working deployment.

If video playback fails during the pitch, show the verified selected close-up and say that it is the extracted source frame; continue with the review action if usable. If the review interaction fails, do not claim a recorded decision: use the real backup and move to the investment page. Save screenshots or a short recording of the accepted flow for recovery and identify them as a recording when used. The existing older two-minute backup is historical; do not present it as a recording of this newly revised flow.

## Sequence and completion

1. Publish this plan/prompt and reserve exact scopes. Confirm PR18 release and the source to preserve; do not stall disjoint media inspection while waiting.
2. Audit source frames and freeze presenter metadata, approximately 20–30 minutes. Publish reviewed choices/assets with commands and hashes.
3. Implement the compact variant and shared review interaction after the file transfer, approximately 30–50 minutes. Use actual source and source-derived state; no scripted acceptance behavior.
4. Combine released UI/media, verify geometry/review/round-trip behavior, and run required checks, approximately 20–30 minutes.
5. Existing publisher releases; existing presenter/checker rehearses and records the accepted three-minute flow, approximately 15–20 minutes plus deployment time.

These are estimates. Prioritize a fitting screen, the real Accept transition and a clear Surface breakup frame. Audit all five frames, but retain an existing frame when no better one is supported. Cut decorative transitions and backup-video editing first. If the active survey correction remains unreleased, report that exact dependency and return finished disjoint frame work; never overwrite it.

The final handoff includes the presenter URL, source/media/PR/merged SHA, deployment ID and health match, source-frame selection receipt, actual tests and desktop/mobile evidence, two measured rehearsals, final script/backup locations, remote sync evidence and remaining limitations. This planning document itself establishes none of those implementation passes.
