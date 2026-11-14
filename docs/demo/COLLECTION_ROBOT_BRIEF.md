# Collection concept — Developer B assignment

Task `CURB-COLLECTION-DEMO/1`, Vincent / Developer B. User explicitly selected this page on November 14. Exact base `6b2b11040eed8d3d620743bc4e12e112f9ebfa90` on `codex/robertson-release-final`; new branch `codex/collection-robot-demo`. Finish, checkpoint and STOP/RELEASE the hosting-package task before ACKing this task. One isolated checkout and one writer. Root remains sole merger and owns the shared navigation, package manifests and hosting coordination.

## Scope and architecture

Exclusive new paths: `app/curb/collection/page.tsx`, `src/features/curb/collection/**`, `public/curb/collection/**`, `docs/demo/COLLECTION_ROBOT_RESULT.md`. Do not edit existing survey, domain, API, global CSS, package/config files, or D's explorer. No extra dependencies without a scoped root change. Root has installed exact `three@0.187.0` and `@types/three@0.187.0`; use direct Three.js in a client-only component, lazy-loaded so the survey does not load 3D code. No runtime CDN, remote models, fonts, textures, tracking or model-service calls. Use local procedural geometry/materials and HTML/SVG overlays.

Build a polished, responsive **Collection concept** page explaining a proposed camera-carrying sidewalk robot. The scene is a visualization, not footage of a deployed robot, a surveyed route, or validated hardware. A visible compact `Collection concept · simulated scene` badge and plain introductory sentence must make that clear. The walkthrough explains collecting reviewable observations; it must not claim the robot can infer exact ADA dimensions from an uncalibrated camera.

## Art direction and scene

Create an elegant, tactile miniature streetscape, not a wireframe or a spinning cube. Use Curb's forest green, warm ivory, graphite rubber and restrained amber/cyan accents. Render a cream rounded cargo body with a dark lower chassis, a visible lid seam, six rubber wheels with hubs and tread suggestions, a small front bumper and a slim camera mast. Give it a subtle `CURB` wordmark using local geometry or a generated canvas texture. Keep the silhouette recognizable as a small delivery robot; do not copy a company logo.

The robot rolls along a segmented concrete sidewalk beside a curb and a narrow planted verge. Include scored normal joints, one visibly irregular crack and one small rough patch as illustrative surface features, distinguishable from each other. A few understated trees/grass tufts and a low building mass add context without obscuring the robot. Use soft contact shadows, warm directional light, ambient fill, slight fog and a clean horizon. Avoid heavy post-processing and huge texture assets.

Use a 20–30-second deterministic traversal through the scene. Wheels rotate consistently with travel; the chassis moves smoothly. Start with a three-quarter view that shows the sidewalk ahead and both a camera and the wheels. The path should fit the scene; no dramatic jumping, flying, clipping through concrete or showing the robot block a pedestrian. At the end pause with a useful overview, with an explicit Replay control. A gentle introductory camera motion is optional, but user interaction must take control immediately.

## Cameras and explanatory overlays

Show three proposed sensing positions: **Forward context camera**, **Downward surface camera**, and **Side / curb camera**. Hardware is illustrative, so don't invent product model names, precision, baseline measurements or field-of-view specifications. Each sensor is visible on the robot. Thin, neatly bent leader lines must anchor to its actual moving 3D position, with high-contrast DOM labels at readable edges of the canvas. Do not let lines terminate in empty space as the robot moves. Project anchor coordinates into the current camera; hide occluded/behind-camera anchors and keep labels inside the viewport, avoiding overlap.

Selecting a sensor highlights its physical mount and its translucent coverage frustum or footprint on the sidewalk. The sidebar explains what that view contributes and what still requires calibration or measurement. Default to two or three clean callouts; a **Camera coverage** toggle can show the cones. Add a restrained capture trail that marks illustrative sample moments as the robot passes a crack or panel. Never present fabricated GPS, confidence or measured crack widths as real telemetry.

A compact **Simulated capture sequence** strip should advance with travel: context frame → surface detail → reviewer queue. Use procedural scene thumbnails or clearly labeled schematic cards. A small scan/readout can show *simulation progress* and *illustrative capture count*, not live AI inference. Distinguish the actual Robertson Hall phone survey through a separate link, not by presenting its pictures as robot camera output.

## Layout and interaction

Desktop: short header, large landscape 3D stage (roughly two-thirds width), concise sensor/details column, and a compact timeline/control strip. Keep the scene dominant; do not turn the page into a long essay or make visitors scroll to find Play. At 1366×768, the essential scene and controls should fit without excessive scrolling. Mobile: stage first, controls below, details in a selectable panel; no horizontal overflow at 390px.

Controls: Play/Pause, Replay, progress scrubber, speed (0.5×/1×/2×), camera coverage on/off, and three meaningful viewpoints (**Follow**, **Side**, **Overhead**). Provide pointer orbit/drag if practical with an obvious Reset view; keyboard viewpoint buttons must offer equivalent access to the important views. Show selected states in words and shapes, not only color. Scrubbing must update robot position, wheel rotation, coverage and capture strip consistently. Pause before orbiting if movement makes inspection difficult.

The page ends with a short three-step story: collect footage → review proposed findings → plan repairs. Link to `/curb/upload` and `/curb/explore`; root will add shared navigation after both routes exist. Explain that reliable dimensions require a calibrated/validated sensing workflow and field checks. Do not bury the useful demo under legal text.

## Performance, resilience and acceptance

- Catch missing WebGL2/context loss gracefully; show a locally rendered static diagram with all sensor descriptions and working page links. Do not leave a blank canvas or endless spinner.
- Cap device pixel ratio at 1.5–2, reuse meshes/materials, keep draw calls modest, avoid React state updates every animation frame. Pause animation when the tab is hidden or the stage is offscreen. Clean up renderer, geometries, materials, event listeners and RAF on unmount. Resize without stretching.
- Respect `prefers-reduced-motion`: start paused with a good static view, retain scrubbing/view controls, and suppress incidental motion. Include a visible pause control whenever motion runs.
- All controls have accessible names, visible focus and keyboard behavior; provide a semantic scene description and textual capture sequence outside the canvas. Test 390px and 200% zoom. Use at least 14–16px key labels.
- Verify play/pause/replay, start/middle/end scrubs, all three viewpoints, each sensor selection, resize, back/forward navigation and context fallback. Ensure camera leader anchors stay correct during travel and viewpoint changes. Test the entire traversal for intersections/clipping.
- Run targeted checks and `npm run check`; test a production build in the real browser and record actual observed viewports, console errors and limitations. No claims of physical robot validation or screen-reader testing unless performed.
- Deliver screenshots of a strong moving-scene moment, selected sensor coverage, mobile layout, and fallback; include a concise implementation/verification report. Commit only your scope, push the branch, verify full local/remote SHA equality, then RESULT/STOP/RELEASE. No merge or deployment from this task.
