# Curb Devpost video

The 116-second cut moves from the actual Robertson Hall Presenter review to a separate synthetic Investment comparison and audited benchmark. Add the presenter camera and narration separately.

- [Timed script and recording guide](START_HERE.md)
- [Silent picture edit](Curb-picture-edit.mp4) and [editable timeline](Curb-edit.xml)
- [Chapter order and timecode](timeline.json), [separate clips](clips), [transparent overlays](overlays), and [draft captions](captions-draft.srt)
- [Storyboard](Curb-storyboard.jpg), [source record](picture-sources.json), and [video checks](verification.json)

## Update footage

Use Node 22 or newer, Chrome, and FFmpeg with H.264 encoding support. Install the optional dependencies from this folder with `npm install`. Rendered files can be opened directly. Set `CURB_DEMO_FFMPEG` or `CURB_DEMO_CHROME` if those executables are outside their default locations.

1. Set `CURB_DEMO_URL` to the accepted app URL, `CURB_DEMO_REVISION` to the full SHA from `/api/health`, and `CURB_DEMO_ACCEPTANCE` to the matching board receipt. Run `npm run capture:presenter` for Original, Review, frame 180, and the actual in-tab Accept flow. Run `npm run capture` for Investment. Both capture commands pin the revision before and after the session. If the public alias resets the connection, `CURB_DEMO_IPV4` can select a currently published IPv4 record for the Presenter capture while retaining the original hostname and TLS checks.
2. Review the generated images and receipts under `captures/`. Run `npm run capture:import-presenter` or `npm run capture:import` as appropriate. Each import checks all image digests, stages a complete immutable set, and atomically switches `active.json`. The previous snapshot remains available. `npm run test:capture` checks that an incomplete or mixed set cannot replace the active one.
3. Run `npm run render` and `npm run verify`. To render a structural preview with placeholders, run `npm run render:preview`. Its output stays under ignored `.render/`. The release editor requires actual Investment sources. It does not substitute the historical Robertson report for an Investment result.
4. Import the [editable timeline](Curb-edit.xml) and relink the numbered clips, or run `npm run timeline` to resolve paths for your checkout. The in/out times, narration and generated captions share one [cut manifest](tools/cut.cjs). `npm run render:titles` rebuilds the two motion graphics. After manually replacing a same-length clip, `npm run assemble` rebuilds the master and captions without overwriting the clip. Update the source record for the replacement.
5. Keep the opening and closing timing, synthetic disclosures, and quote and field assumptions intact. Review the updated frames and once again time the actual spoken take and captions.

## Current sources

- **Real evidence.** The phone clip is `public/curb/surveys/robertson-hall/survey.mp4`. The active [Presenter capture](source-captures/presenter) records the checked hosted revision, verified frame-180 crop bytes, and real review change to 1 accepted and 4 pending. Field measurements and route impact remain unresolved.
- **Context statistic.** CDC reports a 12.2% U.S. adult mobility limitation rate in 2022 for self-reported serious difficulty walking or climbing stairs. [CDC measure definitions and estimate](https://www.cdc.gov/places/measure-definitions/disability.html)
- **Synthetic Investment.** The [active Investment set](source-captures/investment) records the exact app source and all observed states. Financial inputs and route conditions are scenario assumptions.
- **Proof.** The [eight-second proof source](benchmark-proof.json) points to the exact approved ledger revision. Across 120 budget cases on 30 authored synthetic networks, Curb recorded 58 wins and 62 ties versus condition-first. The human study was skipped.

The [original Robertson-only cut](https://github.com/oliverchennn/Curb/tree/1e477b92b20f0f1c041042f9727d66ebbde973de/demo/devpost-video) includes the prior $500 scope and report. The [earlier Investment cut](https://github.com/oliverchennn/Curb/tree/e72167a6cbaa7e1107dfbb1622b1d21b6a71ef80/demo/devpost-video) uses the decision brief in its proof slot.
