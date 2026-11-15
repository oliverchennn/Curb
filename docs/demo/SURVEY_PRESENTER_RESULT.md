# Survey Presenter acceptance

[Open the Presenter](https://curb-taupe.vercel.app/curb/surveys/robertson-hall?present=1). The existing full-review view and exports remain available. [Three-minute judges script](INVESTMENT_DEMO_SCRIPT.md) and [source-frame selection evidence](SURVEY_PRESENTER_FRAMES.md).

## Exact release

UI source `c8b92131278e3ab15182d137f90f3dfc5e0b4249`; source-frame release `4dce9616dae699081bdb6783460966d368afc201`. All thirteen frame paths were byte-identical in integration. PR30 head `0a3710e58de21132fc900fa552865b85a3c12f0f` passed both CI jobs [43703776924](https://github.com/oliverchennn/Curb/actions/runs/43703776924), a fresh locked install, TypeScript, 1,050 application tests, production build, 14 replay tests, 419-frame media verification, 12 compiled release checks and 31 backend requests.

Merged and independently browser-accepted public source: `670f6d80cc139441042957d117ad5eb85d238c6b`, tree `f5cad0a0c3712c113302b989d9fbc9bbd051da85`, deployment `dpl_7PpebKc2s1e525TR5mzMrD9HDt6t`. [Owner READY](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892996974), [independent public PASS](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6893121482). Health matched before/after every accepted case and final health/readiness returned 200/200. Later docs/video and singleton-copy merges do not change Survey Presenter source.

## Actual public checks

Chrome 156 verified fresh Original paused at zero with pending Defect 04, valid/invalid finding queries, view/history preservation, empty-reviewer validation and named Accept yielding 1 accepted / 4 pending / 0 rejected. The overlay changed from dashed to solid; keyboard focus and one-entry review history were retained. Reject, duplicate acceptance protection, Restart and Global Reset passed. Actual JSON import/export, the existing Mark pending guard, accessible HTML and PDF downloads passed.

At 1366 x 768 and 1280 x 720, essential controls fit from the top. Phone-width keyboard/reduced-motion and native Chrome 200-percent zoom reflowed without horizontal overflow. Both desktop widths resolved all five reviewed cuts and verified contained overlays at frames 180, 264, 285 and 418, including playback. Public hashes matched all ten JPEGs. Metadata mismatch, a missing alternate crop, both images missing, and video failure produced canonical or explicit unavailable states while review remained usable. Investment, Robot CAD, Campus evidence and Repair priorities navigation passed. Current-source Letter and A4 one-page Investment print regression preserved canonical A+B while Omit A was active.

## Two measured clean-state flows

| Run | Actual elapsed | Reset and review |
| --- | ---: | --- |
| 1 | 5.022 seconds | Fresh pending Defect 04, about three seconds of Original playback, real named acceptance |
| 2 | 4.587 seconds | Recorded an acceptance, used Restart to clear it, then made a new measured acceptance with Enter |

Both completed Presenter to Investment, the $10,000 comparison, Omit A / Restore, the $20,000 tie and final $10,000 brief. These are **automated action timings including playback, without spoken narration**. They are not human study results or measured three-minute pitches. Two spoken rehearsals on the presentation laptop and a physical projector check remain human actions. The released script has 287 spoken words and a planned 2:49 close plus eleven seconds of recovery; actual spoken duration is unmeasured.

## Source-frame integrity

Reviewed source frames for findings 01 through 05 are 195, 264, 326, 180 and 398. Hero 04 remains frame 180 at six seconds; finding 02 uses frame 264 at 8.8 seconds. Canonical survey evidence anchors, measurements, reviews and export source data were not rewritten. The 720 x 1280, 30 fps normalized video has 419 decoded frames.

Original MOV SHA-256: `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a`. Normalized MP4 SHA-256: `52b364f88dd42f66fe924f2d5a25ef6cf642a8ce272790bc315ee78427831ff6`. Source choices, full-frame and crop hashes, geometry and rationale are recorded in the [frame metadata](../../src/data/curb/surveys/robertson-presenter-frames.json). The extraction script reproduced all ten JPEGs, 1,068,092 bytes, and independent source inspection reviewed 37 decoded frames / 41 finding observations.

Accept confirms the visible observation, not a route assessment. Field measurements remain pending and route impact unknown. The central funding demonstration is a separate explicitly synthetic campus.

## Offline backup receipt

The accepted local backup is `curb-presenter-offline-backup-670f6d80.zip`, 1,655,916 bytes, SHA-256 `0ffedef0367d3880b19c64651da0437e0ad1f24ecebabf403753771675a39a23`. It contains the source-bound QA receipt, per-action JSON, nine screenshots and both one-page PDFs. The local acceptance chat retains the artifact; its absolute machine path is intentionally excluded from this public repository.

Letter PDF SHA-256: `8f6abaa3238e9fe7af0cb7f555eee5e4f27e7883fa0b5f5661be517574845185`. A4 PDF SHA-256: `39dcef4d125b8a2bce9f84467a6962039abcd961df016749b22b226e5ac28472`. Per-action timing JSON SHA-256: `66db9b7619fd0625a797cb9cb235de98b213ea677a845d205c6833876d35a937`.
