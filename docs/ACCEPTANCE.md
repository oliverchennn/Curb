# Acceptance and evidence

## Verified F2 checkpoint

Application SHA: `fc12e86c85394ab8126db1be485aaf0e7845c087`. [F2 report](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873216551); [coordinator acceptance](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873224948). All source writers/children stopped and released. Final main publication (including completion docs) is recorded on the live board.

- Locked `npm ci` passed at 2026-11-14 06:30:16 UTC; `npm run check` passed at 06:30:55: TypeScript, 53/53 tests across four files, Next.js production build. The sole F2 source edit adds `--webpack` to the dev script; no dependency/lock/schema changes. Plain `npm run dev` was observed working.
- Chrome 156.0.8078.74, production server on `127.0.0.1:3000`, verified at 06:34:25–06:34:31 UTC through actual headless Playwright browser interaction. Real API sample/empty/404, map and destinations, every mouse/keyboard barrier selection, ordered linked evidence/review status, deselection, two resets and refresh passed.
- Empty UI was exercised by rerouting to the real empty API. Controlled held requests, malformed JSON/schema/counts, network failure and long notes were browser-only injections; recovery returned to the real sample. Navigation away aborted a held request; no overlapping-reset race was claimed because reset is disabled while loading.
- At 390px width, keyboard focus was visible and an 850-character note wrapped without horizontal overflow. Reviewed desktop and narrow screenshots. No page errors, unexpected normal-flow network errors or external requests; nine loaded client chunks were checked for server/provider/fixture markers.
- First browser run stopped on `/favicon.ico` 404. The optional missing icon was identified and recorded separately; the rerun passed without hiding other network/console errors. No source correction was needed.

Local evidence: A's F2 checkout `.curb-local/f2/browser-check.mjs`, `browser-evidence.json`, first-run evidence, install/check logs and screenshots. These ignored artifacts are not committed or uploaded. Known limits: list-first schematic selection, missing favicon, no screen-reader/deployment/field verification, and a never-resolving request has no client timeout. No legal compliance, safe navigation or observed repair outcome is claimed.

This establishes the foundation gate only. Feature dispatch stops for Vincent's next-slice choice.

## F0 readiness gate

- Pinned kit `web` + `maps` imported without overwriting the coordination package or Git history.
- Reviewed dependency lockfile and documented setup; no unused provider SDKs.
- v0 Zod types, public imports/component props and golden fixtures compile.
- Sample, empty and invalid-reference cases exist; stubs have honest unavailable behavior where unfinished.
- `npm run check` passes on the actual recorded F0 commit. Check IDs/commands and fixture counts are frozen in the F0 report.
- Shared-file writer stopped; B/C accounts and task scopes confirmed before their respective assignments.

## F1 lane checks

Frozen commands below discover actual tests. F0 result `7e56583774b9723a6ce8b6c25def915c08e76217` passed a fresh archive install, typecheck, 23 tests across four files and production build. Coordinator independently ran `npm ci --prefer-offline --cache .curb-local/npm-cache` and `npm run check` on integration commit `d9d2c56b86c1bf7dda6d2d0819d00d7816cc76e1` on 2026-11-14 UTC: exit 0, 23/23 tests, production build passed. Installation reported zero vulnerabilities. Native serial child execution and stop were reported and reviewed. Browser evidence remains pending F2.

Never report a no-tests exit as a pass. Vitest does not use `passWithNoTests`. No DOM testing framework is installed; C records useful browser evidence and type/build results instead of inventing a UI-test pass.

| Check ID | Intended command / observation |
|---|---|
| types | `npm run typecheck` |
| api | `npx --no-install vitest run tests/integration/server` (F0: 6 tests) |
| transport | `npx --no-install vitest run tests/integration/client` (F0: 6 tests) |
| domain | `npx --no-install vitest run src/domain/curb` (F0: 7 tests) |
| data | `npx --no-install vitest run src/data/curb` (F0: 4 tests) |
| ui | `npx vitest run src/features/curb` if the generated environment supports useful UI tests; otherwise record browser evidence and types/build, do not add a framework just for mirrored tests |
| full | `npm run check` = typecheck, tests, then `next build --webpack` |

Each lane runs relevant targeted checks and typechecking. F2 runs full integrated checks after the final integration change; no need to duplicate the full build in every child.

## F2 browser checkpoint

On the exact integrated SHA, record these observed results and the browser/port used:

1. Open `/curb` without credentials; the page uses the real local API.
2. Display the synthetic label, network, destinations, barrier list and counts derived from the fixture.
3. Select every barrier using mouse and keyboard; show only its linked evidence and review status. Long notes remain readable.
4. Reset clears selection and reloads the same scenario; repeat and refresh without changing counts.
5. Exercise empty data, delayed loading and failed fetch/schema mismatch using controlled test injection or the agreed data seam. No silent sample fallback or stale selection.
6. Confirm no dead future-feature controls and no secret/server imports in the client bundle.

A documented seam or test harness may exercise empty/error states; do not add product debug controls merely for testing. Record any test not run and why. Foundation is not demo-ready MVP: routing, repair-budget comparison and business handoff remain future choices.

## Later demo-ready gate

Use implementation-plan section 13 only after Vincent selects those slices. Required evidence includes the complementary-repair regression, same-budget comparison, honest source assumptions, usable repair summary and repeatable two-minute demo. A deployment and any live provider path require separate observation; fixture success does not establish either.
