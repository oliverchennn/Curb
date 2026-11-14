# Acceptance and evidence

## Verified R1 checkpoint

Application SHA: `03d89572c207b88bc02d80c6f3a745aad1895391`. [Coordinator verification](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873942498); [R1 card](tasks/R1.md). All source leads/children stopped and released. B → A → C merges preserve published history. Final PR/main SHA is recorded on the live board after this documentation checkpoint.

- `npm run check` exited 0 on the clean integrated application: TypeScript, **258/258 tests across nine files**, and Next.js 16.4.1 webpack production build, 2026-11-14 07:35 UTC. Node 24.22.1 / npm 11.9.0; unchanged lock/configuration. Counts include the original 53 foundation tests, 23 contract, 64 domain/data and 118 API/transport cases. The build ran outside the restricted sandbox after the baseline demonstrated a sandbox worker failure; no product workaround was added.
- Production server `127.0.0.1:3000`: **160 actual POST comparisons** (8 origins × 5 destinations × 4 repair/no-repair selections) matched an independent exhaustive simple-path oracle. It checked both phases' status, minimum length, returned node/edge directions, request identity, absent failure paths, no-store, invalid selections/revision and context immutability. Original foundation counts also matched.
- Chromium **156.0.8078.79**, 15 browser interaction/fault groups: original-page link and explicit initial selection; library repair blocked → 60 m with three highlighted route edges; cafe unchanged; studio unknown; archive disconnected; both service repairs still blocked by the other condition; same-node 0 m and reverse one-way failure; linked original evidence; reset; native keyboard selection/submit; and no horizontal overflow at 390px.
- Controlled browser injections verified context/comparison network errors and real-API retries, a response with the wrong revision, late old responses after a new selection, reset and explicit cancellation, plus the ten second context/comparison deadlines and recovery. Delayed responses deliberately ignored AbortSignal in the harness. Playwright advanced the browser clock for deadline checks; these were controlled tests, not observed production outages.
- Original `/curb` regression: all four barriers and their linked evidence, arrow-key/Enter selection, reset, narrow layout and trip link passed on the integrated application. No external requests or page exceptions. Eleven loaded client chunks excluded the exact trip fixture ID and authored evidence markers. Source review confirmed browser code imports no server/fixture modules.
- Desktop and mobile screenshots were inspected. Normal trip browsing reported the known optional favicon 404; injected failed requests were recorded separately. There were no page exceptions. First harness attempts exposed case-sensitive header lookup and exact-label selector mistakes; corrected harnesses passed without application changes.

Local reproducible harnesses: `/workspace/scratch/verify-curb-trips.py`, `verify-curb-trip-browser.py`, `verify-curb-foundation.py`. Evidence: `/tmp/curb-r1-check.log`, `/tmp/curb-r1-{api,browser,foundation}-check.log`, and `/workspace/scratch/curb-r1-verification/` JSON/screenshots. These cloud-local artifacts are not committed, deployed or a CI service. The repo still has no GitHub Actions workflow.

Handoff preservation, November 14: the above execution record is historical. Exact copies of its successful logs, result JSON, screenshots and executed harnesses are now checked in under [r1-evidence](message-board/r1-evidence/README.md), with SHA-256 provenance, so Vincent can inspect them outside the original cloud workspace. This packaging adds no new test pass; original harness paths/runtime requirements are documented beside the copies.

The example is a separate synthetic scenario with explicit authored step-free assumptions, not measured accessibility or field geography. Clearing one blocker never clears another or unknown coverage, and evidence/review records stay unchanged. No screen-reader audit, deployment, live GIS/provider path, budget optimizer or legal compliance result is established. The original foundation request's missing timeout and optional favicon remain; the new trip flow has bounded cancellation/deadlines. R1 is complete; R2–R5 and sponsors remain unassigned.

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
