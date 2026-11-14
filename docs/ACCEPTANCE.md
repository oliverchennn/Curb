# Acceptance and evidence

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
