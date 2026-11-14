# Acceptance and evidence

## F0 readiness gate

- Pinned kit `web` + `maps` imported without overwriting the coordination package or Git history.
- Reviewed dependency lockfile and documented setup; no unused provider SDKs.
- v0 Zod types, public imports/component props and golden fixtures compile.
- Sample, empty and invalid-reference cases exist; stubs have honest unavailable behavior where unfinished.
- `npm run check` passes on the actual recorded F0 commit. Check IDs/commands and fixture counts are frozen in the F0 report.
- Shared-file writer stopped; B/C accounts and task scopes confirmed before their respective assignments.

## F1 lane checks

F0 must ensure these commands are supported and discover actual tests, or document precise replacements before dispatch. Never report a no-tests exit as a pass.

| Check ID | Intended command / observation |
|---|---|
| types | `npm run typecheck` |
| api | `npx vitest run tests/integration/server` |
| transport | `npx vitest run tests/integration/client` |
| domain | `npx vitest run src/domain/curb` |
| data | `npx vitest run src/data/curb` |
| ui | `npx vitest run src/features/curb` if the generated environment supports useful UI tests; otherwise record browser evidence and types/build, do not add a framework just for mirrored tests |
| full | `npm run check` (generated script includes typecheck/tests/build; inspect actual script) |

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
