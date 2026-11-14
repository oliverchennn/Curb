# Collection robot concept — B recovery result

Task: `CURB-COLLECTION-DEMO / 2`. Vincent / `vzhu08`, recovery session `6af8bfb9-50b8-8191-bb64-258bab4200f8`. Assignment [6883587803](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6883587803), ACK [6883667040](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6883667040).

## Source and ownership

- Base: `6b2b11040eed8d3d620743bc4e12e112f9ebfa90`.
- Tested product: **`5e23a63f93ce15e0d364bff1d8c026bb5a1a971c`**. The subsequent evidence/report commit changes no product bytes. The board RESULT records that publication's full SHA and actual remote equality.
- Branch: `codex/collection-robot-demo-recovery`; checkout `/workspace/curb-b-recovery`; canonical origin `https://github.com/oliverchennn/Curb.git`.
- New files only in `app/curb/collection/page.tsx`, `src/features/curb/collection/`, `public/curb/collection/`, and this report. No dependencies, contracts, root configuration, existing product/data/media, navigation or API changes. Existing `curb-survey-v1` behavior is untouched.
- One writer, no children. The laptop writer was **not** confirmed stopped: Vincent explicitly directed recovery in [6883581551](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6883581551). Root designated this separate recovery branch as the current candidate and preserves any later laptop history. No old checkout, branch, or unpublished work was overwritten.
- Root remains sole integration/merge owner. This result does not claim hosting or combined-page acceptance.

## Delivered behavior

`/curb/collection` presents an explicitly simulated collection concept. A locally built cream/forest cargo robot with six rolling wheels, lid seam, bumper, wordmark and three camera mounts traverses a segmented sidewalk beside a curb/verge, trees and a quiet building. An irregular crack and rough patch are illustrative examples. The scene uses direct, route-lazy-loaded Three.js `0.187.0`, procedural geometry, a locally generated wordmark texture and no external assets or services.

The 24-second timeline has Play/Pause, Replay, scrubbing, 0.5×/1×/2× speed, Follow/Side/Overhead, mouse orbit, Reset view and selected camera coverage. Position, wheel angle, capture count, trail and sequence derive from the same deterministic timeline, including backward scrubs. Camera leader lines project each actual moving mount into the current view; raycasts, facing checks and clipping suppress hidden anchors. All sensor descriptions and limitations remain outside the canvas.

The visible Static diagram option keeps scrubbing, capture sequence, sensor selection and links available without WebGL. Missing WebGL2 and actual graphics-context loss select it automatically. Reduced motion starts paused and changes to that preference pause current playback. Offscreen/hidden stages stop animation work; offscreen return resumes without elapsed-wall-clock jumps. Touch swipes scroll the page; named viewpoints provide touch/keyboard access, while a mouse can orbit.

Geometries, materials, texture, controls, observers, event listeners, RAF, shadow targets and renderer are disposed. Cleanup then explicitly loses only this component's owned context, after removing its context-loss listener, to release remaining driver caches. It skips an already-lost context.

The page connects collect footage → review proposed findings → plan repairs. It explicitly separates this concept from actual Robertson Hall phone footage. No calibrated measurements, live AI inference, deployed hardware, GPS, route passability or legal verdict is claimed.

## Verification

On November 14, Linux Node `v24.22.1`, locked `npm ci` succeeded. **`npm run check` exited 0: typecheck, 687 tests in 24 files, and production build.** The four new semantic tests cover bounded/non-finite timeline inputs, wheel rolling and backward/replay consistency, exact capture boundaries, and speed/end behavior. The initial restricted sandbox blocked Next's subprocess; the same command passed outside that restriction. [Full check log](../../public/curb/collection/verification/check.log).

Production server: `npm run start -- --port 3001`. Browser: installed Chromium 156, ANGLE SwiftShader software WebGL. These are rendered 3D tests, separate from the explicit fallback checks.

- **85 browser assertions passed** on the final product, with zero page exceptions and zero external runtime requests. [Receipt and exact product SHA-256 inventory](../../public/curb/collection/verification/browser-receipt.json).
- Full 24-second traversal completes, pauses and replays; intermediate times are monotonic. Start/6/12/18/end and backward scrubs retain capture boundaries, rolling state and projected leader/dot consistency. Screenshots cover those positions and all viewpoints. The robot remains on the level sidewalk in these inspected samples; no hardware or real-surface traversal validation is implied.
- All sensor selections, coverage on/off, three viewpoints, mouse orbit pause/reset, playback speeds, keyboard Enter/focus and range-arrow scrub passed. Callout rectangles do not overlap at sampled times and stay inside the stage across tested widths.
- Layouts: 1920×1080, 1366×768, 390×844 and 683×384 CSS pixels; no horizontal overflow. Essential Play fits the initial 1366×768 viewport. The narrow 683×384 run represents the available layout at 200% scaling; **native desktop browser zoom was not established**, so it is not described as an actual zoom run.
- Real CDP-emulated finger input scrolls the mobile page over the canvas with computed `touch-action: pan-y`. This is browser input emulation, not touch-hardware acceptance.
- Offscreen traversal freezes and resumes without a wall-clock jump. Ordinary motion preference starts playback; reduced motion initially and when changed pauses it. Hidden-tab behavior is implemented and source-reviewed; the receipt's direct pause/resume assertion covers offscreen visibility, not a physical background-tab experiment.
- Static mode removes the canvas, exposes a semantic diagram, retains sensor descriptions/scrubbing/captures and disables animated controls. Static→3D remount, actual `WEBGL_lose_context`, injected missing WebGL, upload navigation and browser back/forward passed.
- **Lifecycle audit: eight Static→3D cycles plus four navigation cycles; all 13 retired contexts disconnected and `isContextLost() === true`.** No page exceptions or deprecated shadow warning. [Lifecycle receipt](../../public/curb/collection/verification/lifecycle-receipt.json). Instrumented explicit-delete counters retain some Three/driver cache objects; context loss releases these implicitly. The receipt does not mislabel those as explicit delete calls.
- Two resource console errors belong to this old isolated base: `/favicon.ico` and the not-yet-integrated `/curb/explore?_rsc=…` prefetch, each 404. [Exact console URL evidence](../../public/curb/collection/verification/base-resource-errors.json). Root has the shared icon and explorer fixes in its combined source. One aborted Next prefetch is recorded separately as cancellation, not a successful request or unexplained runtime failure. Lifecycle navigation also records routine unused-CSS-preload warnings. No collection page exception occurred.

Reproduction harnesses (Python Playwright plus installed `/usr/bin/chromium`; not added project dependencies):

```sh
python public/curb/collection/verification/verify_browser.py
python public/curb/collection/verification/verify_lifecycle.py
```

The harnesses expect the production server at `http://127.0.0.1:3001` and write receipts/screenshots beside themselves. They are bounded local functional checks, not hosted load tests.

## Review corrections

Root identified first-frame follow translation being applied twice. Robot position is now initialized from current time before camera setup; resetting the view follows pose synchronization. This also covers static→3D at an arbitrary scrub. Root/D's touch-action and vertical-fit observations were corrected and verified. D's **COLQA-01** deprecated `PCFSoftShadowMap` setting is replaced with supported `PCFShadowMap`. Repeated context instrumentation corroborated remaining live caches after `dispose()`, prompting explicit owned-context loss. D's final independent result and root's combined acceptance remain separate evidence.

## Captures and walkthrough

- [Moving scene](../../public/curb/collection/verification/hero-moving.png)
- [Surface coverage](../../public/curb/collection/verification/selected-surface.png)
- [1366 layout](../../public/curb/collection/verification/layout-1366.png)
- [390 mobile layout](../../public/curb/collection/verification/layout-390.png)
- [Static fallback](../../public/curb/collection/verification/static-fallback.png)
- [Mobile fallback](../../public/curb/collection/verification/mobile-fallback.png)

Open `/curb/collection`; pause, scrub to 12s and select Downward surface camera. Toggle coverage; choose Side and Overhead, then Follow. Replay at 2× and let it stop at 24s. Switch to Static diagram, scrub backward, select another sensor and return to 3D. Use the phone-survey link to reach the separate actual-footage workflow.

Not tested: physical robot, sensing calibration, projector, screen reader, Safari/Firefox, physical touch hardware, native 200% browser zoom, hosted deployment or final integrated explorer/navigation. No new implementation scope, deployment or spending is authorized by this report. Root/D own the independent and combined release gates.
