# Rover inspection v2

`CURB-ROVER-INSPECTION-V2/1` on `codex/rover-inspection-v2`

- Assigned base `2fb49f710085732a7ac20f63680925b8db06dba5`
- Tested application source `3ba997cdd18f6473cc01c9f6a088f2807b330896`, verified at the assigned remote ref at 23:31:41 UTC on November 14, 2026. The handoff commit adds this report and screenshots.
- Vincent laptop session `01a1db77-0c6c-7e53-a5af-b5fae92dbda3`. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885539290) · [Visual addendum](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885549275) · [ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885609474)

## What the demo does

Play starts a deterministic 36-second run. The rover eases to a stop for the branching crack (SIM-01, 9–15 seconds, capture at 12) and the rough patch (SIM-02, 23–29 seconds, capture at 26). Wheels turn according to distance traveled and the chassis follows the route heading. Each capture card seeks to its exact time and exposes all three angles. Auto inspect smoothly reframes the downward feed at each stop. Selecting a camera turns Auto inspect off so the chosen feed remains open.

All three virtual cameras use their corresponding mounts in the same Three.js scene. The forward camera follows the sidewalk, the downward camera sees the modeled surface detail, and the side camera shows the curb and road edge. The IDs are simulation examples. The phone survey remains the source of Robertson Hall field evidence.

## Visual passes

| Pass | Improvement | Chrome review |
| --- | --- | --- |
| Timeline and feeds | Replaced straight traversal and text-only camera descriptions with two synchronized stops, three virtual viewpoints and an inline inspection feed. | 1366×768, 1920×1080 and 390×844 at SIM-01. Three distinct rendered frames at 12.000 seconds. |
| Model and environment | Moved the hero closer and added a separate chassis and lid, axle and strut geometry, tire lugs, hub fasteners, and three lens barrels with indicators. Added textured concrete and asphalt, a planted verge, masonry depth, softened shadows and distinct modeled defects. | Reviewed all three sizes. The branching crack reads against the grain and slab joints. The side camera frames the curb, and the rough patch reads separately in the second capture. |
| Framing, controls and rendering | Fit the playback controls onto one row at 390 pixels and kept desktop controls and the camera workspace visible at short desktop heights. Added a subtle inspection marker in the hero, avoided idle redraws and forced the exact finishing frame. | Reviewed final screenshots at all three sizes. Each layout had 18 visible collection buttons ≥44×44 CSS pixels and no horizontal overflow. |

## Browser captures

The before capture is from the prior local regression checkout at `c35ebe10268dc3511eef93b86994b900bcca32a5`. It shows the pre-upgrade collection scene at 12 seconds of its 24-second run. The after captures show the new 36-second demo on the tested source.

- SIM-01 at 12.000 seconds. [Before, 1366×768](../../public/curb/collection/v2/before-1366.png) · [After, 1366×768](../../public/curb/collection/v2/after-1366.png) · [After, 1920×1080](../../public/curb/collection/v2/after-1920.png) · [After, 390px full page](../../public/curb/collection/v2/after-390.png)
- Three views at SIM-01, 12.000 seconds. [01 Forward context](../../public/curb/collection/v2/camera-forward.png) · [02 Downward surface](../../public/curb/collection/v2/camera-surface.png) · [03 Side / curb](../../public/curb/collection/v2/camera-curb.png)
- SIM-02 at 26.000 seconds with both captures recorded. [Rough patch and capture controls](../../public/curb/collection/v2/rough-patch-1366.png)

## Checks

- `npm.cmd run check` passed on Windows with Node 24.12.0. It ran TypeScript, all 748 Vitest tests across 28 files, and the production build.
- `npm.cmd run test:replay` passed all 14 replay tests.
- Chrome 156.0.8078.74 against the local production build verified Play, Pause, Replay, three speeds, backward seek, and before/during/after frames for both stops. Capture cards restored the expected ID and count. Backward seeking reproduced identical camera pixels at 12.000 seconds. All previews carried the same time and example ID, including the final 36.000-second frame.
- Chrome verified keyboard camera selection, the Auto inspect toggle during a stop, Follow/Side/Overhead, coverage, pointer orbit and Reset view. Static mode exposed three distinct diagrams. Returning to 3D preserved the time and selected camera. Forcing WebGL context loss while a sensor callout had focus moved focus to the matching camera button. Startup with no WebGL showed the same fallback. Reduced motion started and replayed paused, kept camera selection manual, and allowed deliberate playback.
- The software-rendered Chrome walkthrough observed one live WebGL2 context. Over a 1.95-second sample at 2×, simulation time advanced 3.10 seconds with 11 preview updates. There were zero WebGL draws in a 300ms paused sample and zero in a 500ms offscreen sample. Three in-app navigation cycles released every departing context and its visibility listener and returned to one attached context and one listener. The sample is specific to Windows Chrome with SwiftShader. Hardware GPU, other browser engines and assistive technology were outside this run.
- Browser checks logged zero page errors or external HTTP requests. This verification used the local production build. Integration and deployment are pending with Oliver.
