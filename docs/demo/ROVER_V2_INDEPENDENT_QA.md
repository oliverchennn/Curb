# Rover V2 independent QA

**Result: no application defect found in this bounded, pinned-source pass.** This verifies the local production rover at `4d44143392675f36078c7607753cf10c751bea6b`; it does not accept a later merge or public deployment.

- Task: `CURB-ROVER-V2-INDEPENDENT-QA/1`, Developer D / Oliver cloud, session `6af808fa-83dc-8191-bd58-80697dbe50c9`.
- [Assignment 6886087226](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6886087226); [actual ACK 6886102070](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6886102070).
- Exact published implementation base: [`4d44143392675f36078c7607753cf10c751bea6b`](https://github.com/oliverchennn/Curb/tree/4d44143392675f36078c7607753cf10c751bea6b), `codex/demo-upgrade-integration`.
- Isolated checkout: `/workspace/curb-rover-v2-independent-qa`; report branch: `codex/rover-v2-independent-qa`.
- Sole tracked write is this report. Application, tests, contracts, data, media and configuration remained unchanged. No children, deployment, main/integration writes or branch deletion.
- Independent checks ran on 2026-11-14 UTC. B's `ROVER_INSPECTION_V2.md` supplied a checklist, not substitute evidence.

## Environment and checks

Local Next.js **production build**, served by `npm run start -- --port 3142`. Browser: **headless Chromium 156.0.8078.79 on Linux, Playwright, ANGLE/Vulkan SwiftShader software rendering**. This is the Chromium cloud fallback, not desktop Google Chrome or a hardware GPU. Desktop viewports were 1366×768 and 1920×1080; touch emulation was 390×844. A 1366×250 viewport was used only to put both render surfaces fully offscreen for the suspension sample.

| Check | Actual result |
| --- | --- |
| Dependency installation | `npm ci --no-audit --no-fund` completed successfully. |
| Targeted simulation suite | `src/features/curb/collection/simulation.test.ts`: **4 tests / 1 file passed**, Vitest 5.0.3, 150ms. |
| Production build | Passed compilation, TypeScript and static generation. |
| Focused production browser pass | Inspection, controls, accessibility, mobile, fallback and lifecycle behavior below independently exercised. |
| Wider suite | Full 748-test suite and backend stress were **not rerun** in this read-only lane. |

Browser probes observed the real production page. Instrumentation wrapped WebGL calls, animation scheduling and observer/listener registration to count activity without changing application files. Actual context loss used `WEBGL_lose_context.loseContext()`. The separate unavailable-graphics check deliberately made browser `getContext('webgl2')` return null; that check tests the capability-failure branch, not physical GPU failure.

## Independently reproduced behavior

| Area | Evidence and outcome |
| --- | --- |
| Both stop boundaries | Scrubbed 8.9, 9, 12, 14.9, 15, 22.9, 23, 26, 28.9 and 29 seconds. All three previews and the focused camera carried the exact matching time and expected SIM ID. Auto inspect selected Downward during `[9,15)` / `[23,29)` and returned to the prior Forward selection after each stop. |
| Inspection evidence | SIM-01 seek paused at 12; SIM-02 seek paused at 26. Viewed the actual rendered captures: SIM-01 has an irregular branching transverse fracture, SIM-02 a mottled polygonal rough patch, distinct from straight slab joints. The downward view supplies the close-up; this is modeled evidence, not Robertson footage. |
| Three cameras | At frozen SIM-01, selected Forward, Downward and Side / curb. Time remained 12.000 and SIM-01 across all four canvases. Distinct preview pixel hashes and screenshots agree with the three different camera positions and directions in the renderer. |
| Auto/manual control | Manual selection disabled Auto inspect. Re-enabling it at the stop returned to Downward. Disabling Auto inspect preserved Downward after seeking past the stop. |
| Backward seek | Returning from SIM-02 to 12 seconds reproduced all three SIM-01 preview pixel hashes exactly. Capture state also followed time rather than remaining permanently captured. |
| Playback and end | Play, Pause, all three speed options, range scrub and capture buttons worked. At the exact 36-second end, all four canvas timestamps were 36.000 and Replay was available. Replay restarted near the beginning. |
| Camera controls | Follow, Side and Overhead generated different hero screenshots. Mouse drag orbited; Reset returned the hero screenshot to the exact pre-orbit Follow hash. Coverage visibly changed the scene and toggled off again. Time remained frozen through these interactions. |
| Static → 3D | Switching at 12 seconds with Side / curb selected preserved both time and sensor. Static mode disabled playback and retained the diagrams/seek controls. Returning to 3D created one live context and rendered the same time/sensor, paused. |
| Keyboard | Real Tab presses reached Play, Replay, range, speed, presets, reset, coverage, scene modes, Auto inspect, all three stable camera buttons and both capture stops. Play had a visible 3px focus outline. Four exercised callout-hide cases transferred focus to the matching stable camera button. |
| 390px touch | No horizontal overflow. All visible article buttons, select and range targets were at least 44×44px. A CDP touch swipe beginning over the 3D canvas scrolled the document from 0 to 145px; computed touch action was `pan-y`. |
| Reduced motion | Started paused. Seeking to SIM-01 kept Forward; choosing Side / curb and enabling Auto inspect still preserved the manual camera at SIM-02. Replay returned to zero without starting animation. |
| Real context loss | Invoked the real loss extension while a moving callout held focus. The app switched to static diagrams, kept time at 12, disabled playback, showed the loss message and transferred focus to the matching stable camera control. |
| Graphics unavailable | Controlled WebGL2-unavailable initialization produced static mode without a page error. SIM-02 seek and manual Downward selection remained usable at 26 seconds. |

The short playback samples advanced 0.37, 0.90 and 1.77 simulation seconds at 0.5×, 1× and 2× respectively. Their wall times included browser actions (about 0.96, 1.02 and 1.28 seconds); these are functional observations, not frame-rate or real-time performance guarantees on SwiftShader.

## Rendering and cleanup

- **Paused:** after the final requested frame settled for 250ms, each speed setting produced **zero additional WebGL draw calls, zero time advance and zero pending animation frames over 500ms**. The required final frame is not continuing idle rendering.
- **Offscreen:** both the hero canvas and camera aside were geometrically outside the viewport. Over **800ms**, draw count stayed **3807 → 3807**, displayed time **3.23 → 3.23**, and pending animation frames stayed zero. Returning onscreen advanced to 3.72 after roughly 550ms, without replaying the hidden interval.
- **Navigation:** three consecutive SPA upload/back cycles released every departing context (`isContextLost() = true`, detached canvas) and returned to exactly one live context. The renderer's visibility listener count went **1 → 0 → 1** each cycle; mounted observer counts remained stable. No pending frame remained after unmount.
- **Observer attribution:** a focused follow-up identified the actual rover ResizeObserver and IntersectionObserver; both had zero observed targets after unmount. The two remaining global intersection targets were connected navigation links, not leaked rover observers.
- **Implementation read:** `CollectionScene.tsx` creates one renderer and three mount-specific perspective cameras; feeds render from the same scene and pose. It suspends animation when the document is hidden or both render surfaces leave view. Cleanup disconnects observers, removes listeners, disposes controls/geometry/materials/textures/shadows/renderer, destroys the owned context and removes the canvas. Relevant pinned sections: [camera setup](https://github.com/oliverchennn/Curb/blob/4d44143392675f36078c7607753cf10c751bea6b/src/features/curb/collection/CollectionScene.tsx#L58), [feed production](https://github.com/oliverchennn/Curb/blob/4d44143392675f36078c7607753cf10c751bea6b/src/features/curb/collection/CollectionScene.tsx#L445), [render scheduling](https://github.com/oliverchennn/Curb/blob/4d44143392675f36078c7607753cf10c751bea6b/src/features/curb/collection/CollectionScene.tsx#L553), [cleanup](https://github.com/oliverchennn/Curb/blob/4d44143392675f36078c7607753cf10c751bea6b/src/features/curb/collection/CollectionScene.tsx#L649).

Observed contexts were intentionally retained by the probe to inspect their loss/disconnection status. This is bounded lifecycle evidence, not a heap/driver-memory leak certification. Background-tab suspension was source-reviewed; the runtime suspension sample used actual offscreen geometry.

## Raw probe results and resolved diagnostics

Raw evidence is preserved rather than relabeled as a clean first run:

| Probe | Recorded assertions | Direct passes | Initial diagnostics |
| --- | ---: | ---: | ---: |
| `inspection.json` | 38 | 35 | 3 |
| `lifecycle.json` | 38 | 32 | 6 |
| `closure.json` | 7 | 7 | 0 |

All nine diagnostics were probe assumptions/preconditions, not reproduced application failures:

1. Three pause assertions sampled before the final frame, while one animation callback was still pending. The settled 500ms samples above passed at all speeds.
2. The keyboard assertion expected an incorrect `Side/curb context` string. The recorded real Tab path reached the actual `Camera 03, Side / curb, simulated camera` control and both stops; the corrected evidence check passed.
3. Three unmount assertions incorrectly required **all page** IntersectionObservers to disappear. Target attribution showed the rover observers disconnected, while the framework's connected link targets remained. Counts did not grow over navigation cycles.
4. Two offscreen assertions used a 400px-high viewport where 106px of the camera aside still intersected the viewport. Continuing rendering was correct there. The 250px-high viewport put both surfaces outside view; the suspension check then passed.

An earlier keyboard harness attempt also timed out after Tab left the document because the probe assumed `:focus` always existed. Its log is retained; the completed run used `document.activeElement` and recorded the browser-chrome transition. No product file was changed to resolve any diagnostic.

All production browser contexts recorded **zero page errors and zero external requests**. Some desktop runs logged Next.js unused CSS-preload warnings; these did not interrupt the flow. Local procedural textures, simulated labels and camera qualifications remained visible. No measured width, slope, curb height, ADA compliance, passability or actual rover collection was asserted. Robertson's phone survey remained explicitly separate.

## Artifacts and limits

Artifacts are intentionally **local and ignored**, as assigned: `/workspace/curb-rover-v2-independent-qa/.curb-local/rover-v2-qa/`. They are not published product media.

- Logs: `install.log`, `simulation-tests.log`, `build.log`; probes/receipts: `common.py`, `inspection.py/json/log`, `lifecycle.py/json/log`, `closure.py/json/log`, and the retained initial focus-timeout log/receipt.
- **17 screenshots**, including `desktop-1366-sim01.png`, `desktop-1920-sim01.png`, `mobile-390.png`, `sim01-forward.png`, `sim01-surface.png`, `sim01-curb.png`, `sim02-surface.png`, three preset views, orbit/reset/coverage, keyboard focus, context loss, reduced motion and unavailable fallback. D visually inspected the desktop/mobile composition and the camera/fallback images, in addition to DOM and pixel observations.
- `artifact-sha256.json` hashes the local artifacts. Manifest SHA-256: `e2f62e74d260bde1a9564f8019746dce73942a4fa4b42af49534fec7fb928218`.

No hardware GPU, physical touchscreen, other browser engine, screen reader, long-duration memory soak, public deployment or later combined-release acceptance is claimed. The displayed camera geometry is illustrative and does not establish field measurements or traversal status. No application correction is requested from this pass. The orchestrator and merge owner retain final integration/release decisions.
