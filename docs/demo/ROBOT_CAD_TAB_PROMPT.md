# Agent prompt: Robot CAD tab for the Curb Vercel site

Copy everything below the line into a fresh agent session started in `C:\Users\Landau\Desktop\CS_PROJECTS\Curb`.

---

You are adding a dedicated **Robot** tab to the Curb website (Next.js app, deployed on Vercel at https://curb-taupe.vercel.app) that shows the concept CAD model of the Curb sidewalk-survey robot as an interactive 3D viewer. Then you get it merged and deployed through the project's normal release path.

## Read first (required)

1. `AGENTS.md` / `CLAUDE.md` — ownership, one-writer-per-file, Git sync, and evidence rules. They override anything here.
2. The live board (URL in `orchestration.team.json`) — ACK this task and record your branch, base SHA and literal file scopes before editing. Shared files (`package.json`, lockfile, `next.config.mjs`, `vercel.json`, app shell, `src/features/curb/navigation/AppNavigation.tsx`) belong to the merge owner (`01a1dc6e-1818-7dd2-ae95-8ac3fcfca3b5`); request the change or get an explicit transfer before touching them.
3. `.curb-local/robot-cad/HANDOFF_BRIEF.md` and `.curb-local/robot-cad/out/BOM.md` — the CAD source. `.curb-local/` is git-ignored and local to Landau's machine.
4. `docs/demo/VINCENT_HOSTING_RESULT.md` — how production is actually deployed (direct Vercel CLI upload from an exact merged SHA in Vincent's `vzhu08` scope; Git pushes do **not** auto-deploy).

Base your branch on current `origin/main` (verify with `git fetch` and record the full SHA). Branch name: `codex/robot-cad-tab`.

## Source assets that already exist

- `.curb-local/robot-cad/curb_robot.py` — parametric CadQuery model, ~1366 named parts (`build()` returns `(name, shape, color, kind)`).
- `.curb-local/robot-cad/export_web.py` — exports one GLB per group + `manifest.json` (parts, colours, centroids, group/part explode offsets) into `web/public/`. It currently has a draft 6-group split (structure, drive, power, sensing, compute, wiring). Treat that as a starting point only (see "Grouping").
- `.curb-local/robot-cad/web/components/Explorer.jsx` — a react-three-fiber prototype with auto-spin, hover-highlight, click-to-explode and a parts list. Reuse ideas and code, but port it into the main app's TypeScript and conventions under `src/features/curb/robot/`.
- `.curb-local/robot-cad/out/curb_robot.glb` (~29 MB, single mesh). That's too heavy to ship as-is.
- Run Python with `.curb-local/robot-cad/.venv/Scripts/python` (CadQuery 2.8, trimesh, pygltflib installed). A full build takes 8–15 min, so run it in the background.
- The main app already depends on `three@0.187.0`. Check whether `@react-three/fiber`/`drei` are present before planning around them. Adding dependencies is a shared-file change (see above). Plain `three` + `GLTFLoader` + `OrbitControls` is acceptable if that avoids a manifest change.

## Feature spec (the user's requirements; implement all of them)

1. **Dedicated tab.** New route `/curb/robot`, reachable from the site's main navigation (`AppNavigation.tsx`) as its own tab, e.g. "Robot".
2. **Auto-orbit.** On load the full robot slowly orbits automatically. Pause the orbit while the user is hovering, dragging or exploring a group, and resume when they return to the full robot. Respect `prefers-reduced-motion` with no auto-orbit and a visible play control.
3. **Your own grouping.** Independently decide how to group every part into functional component groups. Examples: **Sensing** (the 3 camera modules, camera mast/brackets and other perception parts) and **Movement / drive** (the 6 wheels: tires, hub motors, bearings, axles, brackets, plus the motor drivers and their internals). Others will likely be power & safety, compute & comms (incl. fan, antenna), chassis & enclosure, and wiring harness. Use the part names/kinds and BOM to decide. **Every part must belong to exactly one group.** Write the mapping as a typed, tested data file (e.g. `src/features/curb/robot/groups.ts`) and add a unit test asserting full coverage and no duplicates against the exported manifest.
4. **Hover overlay.** With the full robot shown, whatever group lies under the cursor gets a **translucent blue overlay** across all its parts, using an emissive/overlay material or a second translucent blue mesh pass. Plain recolouring doesn't count. Only one group is highlighted at a time, the cursor becomes a pointer, and the highlight clears on pointer-leave.
5. **Group labels on the full robot.** Each group has a visible label anchored to it in the full-robot view (HTML overlay or sprite) that stays readable while the model orbits and doesn't overlap the others badly.
6. **Click → isolate + exploded view.** Clicking a hovered group hides every other part of the robot and animates that group's parts into an **exploded view** (smooth tween, camera re-framed to fit). The group's label stays clearly visible (e.g. a heading above the canvas or a pinned label).
7. **Numbered parts + left index.** In the exploded view, each individual component gets a number callout in 3D. A panel on the **left** lists every item in the group by number and name. Collapse identical repeated hardware (e.g. 120 magnets, 108 coils, many screws) into one numbered entry with a quantity (`×120`) so the list stays usable. Note the collapsing rule in the UI, and make sure the 3D numbers still map unambiguously.
8. **Item drop-downs.** Clicking an item in the left index expands a drop-down directly below its name explaining that item's purpose (1–3 sentences). Clicking the matching numbered part in 3D does the same and highlights it, and vice versa. One open item at a time is fine.
9. **Return button.** A clear "Back to full robot" button reassembles the group, restores all parts and resumes auto-orbit. `Esc` does the same.
10. **Accessibility & robustness.** Keyboard reachable (tab through groups and index items), visible focus, loading and WebGL-unavailable fallback states. On mobile the left index becomes a collapsible drawer and tap replaces hover.

## Content rules (Curb evidence boundaries, non-negotiable)

- This is a **concept / visual model, not validated hardware**. Show that plainly on the page.
- Purpose descriptions must stay generic and functional (what the part does). **Do not invent** part numbers, brands, ratings, voltages, capacities, chemistries, sensor models, fields of view, torques, speeds or performance claims. Base wording on `BOM.md` descriptions. Don't imply the robot has been built, tested or field-deployed.
- Keep it consistent with the existing collection-robot concept page (`/curb/collection`) and link between the two.

## Assets & performance

- Re-run/adapt `export_web.py` to produce web assets under `public/robot/` (or similar): per-group GLBs with named part nodes, Draco/meshopt-compressed and decimated where it doesn't hurt appearance, plus a manifest. Target a **total payload under ~8 MB** and first render under ~3 s on a normal connection. Commit only the generated web assets and the manifest, not `.curb-local/`. If the export script needs to live in the repo for reproducibility, put a copy under `scripts/robot/` and document the command.
- Load groups lazily if needed, and dispose geometries/materials on unmount. Keep the route client-only (`dynamic(..., { ssr: false })`) so the build doesn't break.
- Check large files against Vercel/GitHub limits (no file >50 MB; prefer far smaller).

## Verification (record actual commands and results)

- `npm run check` (or the repo's lint/typecheck/test/build scripts) passes on your final commit, including the new grouping-coverage test.
- Run the dev server and exercise every spec item in a real browser: auto-orbit, hover blue overlay per group, labels, click → isolate + explode, numbered callouts, left index, drop-downs (index and 3D click), Back button and `Esc`, reduced-motion, mobile width, WebGL fallback. Capture screenshots or a short GIF of each state for the handoff.
- Make sure no other page regressed (the existing deploy smoke script `scripts/curb/verify_deployment.ts` still passes locally against `npm run start`).

## Delivery and deployment

1. Push `codex/robot-cad-tab` at safe checkpoints per `docs/GIT_SYNC.md`, verify the remote SHA, and post the handoff (format in `docs/HANDOFF.md`) on the board with evidence.
2. Open a PR to `main` on `oliverchennn/Curb` and request review/merge from the merge owner. **Don't merge it yourself** unless the merge owner explicitly assigns you that Git operation.
3. Deployment goes through the existing path only. After merge, the merge owner hands the exact merged SHA to Vincent (session `01a1db77-0c6c-7e53-a5af-b5fae92dbda3`), who deploys it to the existing `curb` project in the `vzhu08` scope via `git archive` of that SHA + `vercel deploy --prod` (see `VINCENT_HOSTING_RESULT.md`). If **you** are the session assigned the deploy, follow that document exactly: verify the SHA on origin, stage only tracked bytes, deploy, then run `node --import tsx scripts/curb/verify_deployment.ts https://curb-taupe.vercel.app` and also confirm `/curb/robot` returns 200 and works in a fresh browser.
4. No paid upgrades, domain changes, protection changes, new Vercel projects or deploys from another account. If anything needs a login or approval, stop and ask the human on the board.
5. Final report: branch, full commit SHAs, PR link, merged SHA, deployment ID/URL, check outputs, and screenshots of the live `/curb/robot` page.
