# Curb Devpost video

The current 116-second cut moves from real Robertson Hall evidence to a separate synthetic Investment comparison. The presenter camera and audio are added separately.

- [Timed script and recording guide](START_HERE.md)
- [Silent picture edit](Curb-picture-edit.mp4) and [editable timeline](Curb-edit.xml)
- [Chapter order and timecode](timeline.json), [separate clips](clips), [transparent overlays](overlays), and [draft captions](captions-draft.srt)
- [Storyboard](Curb-storyboard.jpg), [source record](picture-sources.json), and [video checks](verification.json)

## Update footage

Use Node 22 or newer, Chrome, and FFmpeg with H.264 encoding support. Install the optional dependencies from this folder with `npm install`. Rendered files can be opened directly. Set `CURB_DEMO_FFMPEG` or `CURB_DEMO_CHROME` if those executables are outside their default locations.

1. Record from an accepted build. Set `CURB_DEMO_URL` to the app URL, `CURB_DEMO_REVISION` to the verified full SHA reported by `/api/health`, and `CURB_DEMO_ACCEPTANCE` to the matching team board receipt. Run `npm run capture`. This captures both $10,000 plans, both omissions, the $20,000 tie and the $10,000 printable decision brief. The script checks the pinned revision before and after the capture.
2. Review the generated capture in `captures/investment/`. Run `npm run capture:import` to replace the checked source PNGs and receipt in `source-captures/investment/`. Preserve the source distinction for local and hosted runs.
3. Run `npm run render` and `npm run verify`. To render a structural preview with placeholders, run `npm run render:preview`. Its output stays under ignored `.render/`. The release editor requires actual Investment sources. It does not substitute the historical Robertson report for an Investment result.
4. Import the [editable timeline](Curb-edit.xml) and relink the numbered clips, or run `npm run timeline` to resolve paths for your checkout. The in/out times, narration and generated captions share one [cut manifest](tools/cut.cjs). `npm run render:titles` rebuilds the two motion graphics. After manually replacing a same-length clip, `npm run assemble` rebuilds the master and captions without overwriting the clip. Update the source record for the replacement.
5. Keep the opening and closing timing, synthetic disclosures, and quote and field assumptions intact. Review the updated frames and once again time the actual spoken take and captions.

## Current sources and next replacements

- **Real evidence.** The phone clip is `public/curb/surveys/robertson-hall/survey.mp4`. The accepted original [Robertson capture receipt](capture-receipt.json) verifies Defect 04 at 6 seconds. Preserve the existing 23-second scene until the compact presenter flow has its own accepted capture.
- **Context statistic.** CDC reports a 12.2% U.S. adult mobility limitation rate in 2022 for self-reported serious difficulty walking or climbing stairs. [CDC measure definitions and estimate](https://www.cdc.gov/places/measure-definitions/disability.html)
- **Synthetic Investment.** The [capture receipt](source-captures/investment/receipt.json) records the exact app source and all observed states. Financial inputs and route conditions are scenario assumptions.
- **Proof.** The eight-second slot currently shows the actual printable synthetic decision brief. Wait for accepted metrics source material before adding a benchmarking or speedup claim.

The [original Robertson-only cut](https://github.com/oliverchennn/Curb/tree/1e477b92b20f0f1c041042f9727d66ebbde973de/demo/devpost-video) includes the prior $500 scope and report. It remains available at its original revision.
