# Robertson media corrections: independent review

Developer D reviewed exact published source **`f960df5c17db51947529e08374c4bc4dc1440c89`** on 2026-11-14. Assignment [6878074252](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6878074252); ACK [6878087605](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6878087605). Existing cloud session `6af808fa-83dc-8191-bd58-80697dbe50c9`; isolated checkout `/workspace/curb-robertson-media-corrections`, branch `codex/robertson-media-corrections`. This new report is the sole tracked change. Product, media, scripts, tests and existing documents were read-only; no children.

**D4-01 is closed for this annotated MP4, and D4-02 is closed for this browser explanation.** The title no longer obscures the initial surface-breakup evidence, and the displayed disclosure correctly distinguishes missing track keys from physical absence. A remaining documentation inconsistency is recorded below. This is a bounded correction review, not final combined export/UI acceptance or a human field inspection.

## Rendered evidence and labels

Independently decoded all 419 frames of the committed annotated video. Full 720 × 1280 visual checks covered frames **0, 24, 39, 66, 180, 285, 301, 302, 329, 330 and 418**, including the old obstruction, the new finding anchors, a three-finding scene and both track boundaries. The visible text now includes “AI proposal.” The source evidence at the top of frames 0/24/39/66 remains visible; labels move above or below the tracked region. Defect 04 remains visible at its retained right-edge tail and Defect 05 at the last decoded frame. No fixed title bar remains.

An independent pixel check scanned the **actual encoded images**, rather than calling the renderer's candidate-placement routine. It detected 711 opaque label backgrounds and compared each rectangle against every retained evidence box in its frame: **zero evidence intersections**. The color/shape detector could not classify one label in each of 13 frames: 40, 41, 42, 43, 44, 46, 48, 49, 51, 54, 55, 57 and 59. Every exception was then visually inspected in native-width 720-pixel crops with the full label and evidence region. All 13 labels were present and outside the evidence box. Together, automated geometry and those explicit visual exceptions cover the expected **724 label instances** across all five retained tracks. This is not a claim that every full frame was manually inspected again.

The renderer source also removes the opaque header, protects all visible boxes with a margin before choosing labels, prevents label collisions, and fails explicitly if it cannot find a location. Tracks, authored manifest, shared contract, original MOV and normalized MP4 are unchanged from the D4 reviewed source. Labels were repositioned without suppressing retained evidence keys. C's live-overlay/layout review is separate from this burned-video result.

## Media identity and poster

The existing asset verifier passed. Independent `ffprobe -count_frames -show_streams -show_format` checks found both normalized and annotated videos have **419 decoded frames, 30/1 fps, 720 × 1280, H.264/yuv420p**, with BT.709 color primaries, transfer and matrix. The original source checksum is unchanged.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Original `source/IMG_0699.MOV` | 16,661,803 | `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a` |
| Normalized `survey.mp4` | 12,051,199 | `52b364f88dd42f66fe924f2d5a25ef6cf642a8ce272790bc315ee78427831ff6` |
| Corrected `annotated.mp4` | 10,924,406 | `e3dd5a6058a8d809abc2d93037f3021a7c0686da378cde140e321adb73415173` |
| Corrected `poster.jpg` | 332,872 | `2c7333a1d61a208246bb04aed65bd49347fb0c36b9c108b378e15498e819bedc` |

The poster depicts **normalized frame 0**, consistent with the changed extraction condition and initial playhead. Compared against every decoded source frame at 180 × 320, frame 0 was the unique closest match: mean absolute channel difference 1.020/255, versus 5.182 for the next closest frame 1. The earlier frame-180 poster is gone. Independent FFmpeg/OpenCV extraction plus JPEG re-encoding was not byte-identical to the committed poster; decoded mean difference was 1.432/255. Accordingly, this verifies frame identity and the committed checksum, not portable byte-for-byte reproduction across decoder/JPEG stacks. Initial strict re-encode equality probes failed and were replaced by the explicit whole-clip frame comparison; they were not product-test failures or silently reported as exact equality.

## Browser explanation and boundaries

Built the exact source and used its real production server on loopback with headless Chromium **156.0.8078.79**, viewport 1366 × 768. No stand-in API or fixture transport was used. Keyboard Enter opened “About the tracks”; its rendered paragraph was visible and legible:

> Boxes appear only on retained tracked frames; missing boxes do not establish that a defect is absent. Rejected findings are hidden in the live overlay. Measurements and field review are still needed.

The old “a box disappears where the finding is not visible” sentence was absent from rendered page text. The disclosure remains collapsed by default; this review does not imply the paragraph is always visible. Real native video seeks within the listed decoded frames produced these exact live-overlay identities:

| Frame | Visible tracked finding IDs |
| --- | --- |
| 0 | 04 |
| 301 | 02, 03, 04 |
| 302 | 03 |
| 329 | 03 |
| 330 | 03, 05 |
| 418 | 05 |

This preserves the conservative 04 cutoff and 05 start without treating a missing box as proof that the source feature vanished. No page errors or automatic off-origin requests occurred in this narrow flow. Browser and server were stopped after verification. This did not retest B's export implementation, perform manual assistive-technology testing or accept C's separate overlay/layout findings.

## Remaining concern

**D5-01 / P3 — align the implementation note with the corrected behavior.** At this pinned source, `docs/demo/ROBERTSON_IMPLEMENTATION.md:7` still says “missing frames mean invisible.” That contradicts the corrected browser disclosure and the verified 301/302 and 329/330 limits. Root should replace that phrase with retained-tracking/visibility-unknown wording while preserving the prohibition on interpolation through missing keys. This is a documentation correction owned by root; D did not edit the existing file. It does not reopen the now-correct browser sentence.

## Actual execution and limits

- `npm ci --no-audit --no-fund`: passed, 75 packages installed from the pinned lockfile.
- `node --import tsx scripts/curb/verify_assets.ts`: passed, five findings and 419-frame media, hashes/anchors/tracks and unknown measurement/location fields checked.
- `python .curb-local/robertson-media-corrections/check_media.py`: completed the metadata, poster identification and encoded-label scan described above. Its 13 detector exceptions were explicitly resolved visually, not counted as automatic passes.
- `npm run build`: passed, including TypeScript and the production build. The first sandboxed attempt could not parse empty output from TypeScript's `--showConfig`; the approved retry completed successfully without source changes.
- `npm run start -- --port 3115`, followed by `python .curb-local/robertson-media-corrections/check_browser.py`: passed the actual disclosure and six boundary-seek checks. Server bound to `127.0.0.1` and was stopped afterward.
- Read-only Git comparison confirmed the manifest, tracks, contract, original MOV and normalized MP4 unchanged from `72188d5a654dc4bfa1872513d3d8e1c6bdb8ce7f`. Unchanged planner enumeration was not rerun.

Ignored local receipts are under `.curb-local/robertson-media-corrections/`: `assets.json`, `media-pixels-result.json`, `detected-labels.json`, all decoded annotated frames, three exception crop sheets, `build.log`, `build-approved.log`, `browser-result.json` and disclosure screenshots. OpenCV was installed only into that ignored review scratch directory to compare the extraction method; no project dependency changed. These local artifacts are not published attachments.

The five findings remain AI proposals with unknown dimensions, field measurements, ADA verdict and route impact. This report closes only the specified media/browser-copy corrections at the exact reviewed source. Root owns the documentation follow-up, integration and final acceptance. D publishes this report and STOP/RELEASE through the board.
