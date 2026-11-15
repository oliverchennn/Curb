# Dev B continuation: Oliver's cloud session

The user requested this cloud conversation continue as **Dev B/domain, data and evidence** while Vincent resumes orchestration. Current session: `6af808fa-83dc-8191-bd58-80697dbe50c9`; GitHub operator: `oliverchennn` (write access verified during takeover). This is a role/readiness handoff, not an R2 implementation assignment. Vincent's exact task and common base must arrive before code changes.

## Resume safely

Read [Vincent's handoff](VINCENT_HANDOFF.md), [AGENTS.md](../../AGENTS.md), [OWNERSHIP.md](../OWNERSHIP.md), [CONTRACTS.md](../CONTRACTS.md), [GIT_SYNC.md](../GIT_SYNC.md), the assigned card and all new [board #1](https://github.com/vzhu08/Curb/issues/1) comments. Use [START_DEV_B.txt](../development/START_DEV_B.txt) in a replacement session.

Preferred cloud checkout: `/workspace/curb-dev-b`, branch `codex/dev-b-ready`. The outgoing coordinator creates it from final handoff main; its exact base and clean state are in the final board RESULT. It is a readiness checkout with no active code ownership and no dependency-install claim. Do not resume the old `/workspace/curb-b-r1` implementation branch as a new task base.

For an assignment, verify the actual GitHub identity, origin, local status and specified full base SHA. Read the board's literal file scope, contract, checks and branch. Create a dedicated `codex/<task-id>-...` branch/worktree from that assigned base, post ACK, then implement only that scope. If a base, contract or writer release is missing, report the precise dependency while continuing read-only preparation. Routine in-scope branch pushes are already authorized; merge/publication belongs to Vincent or his designated integration owner.

No watcher runs after this conversation ends. Vincent can post an assignment on the board, but Oliver must resume this chat with the assignment link (or a new B session with the prompt) for execution. Native R1 workers are completed, not permanently available background services.

## Existing B surface

| Path | Public behavior |
|---|---|
| `src/domain/curb/index.ts` | `buildScenarioView`, `getBarrierDetail`, `InvalidScenarioError`; structural/reference validation, derived counts, ordered linked evidence |
| `src/domain/curb/trips.ts` | `validateTripScenario`, `evaluateTrip`, `InvalidTripScenarioError`, `TripRequestError` |
| `src/data/curb/sample.json`, `empty.json`, `invalid-reference.json` | Frozen foundation examples; preserve IDs/meaning |
| `src/data/curb/trip-demo.json` | Separate synthetic R1 context: 8 nodes, 6 edges, 5 destinations, 3 barriers and 3 evidence records |
| Colocated domain/data tests | Foundation and 64 additional R1 domain/data cases |

`validateTripScenario(input: unknown)` checks every reference, complete edge assessments, repair targets and defaults; current R1 requires synthetic evidence. `evaluateTrip(context, request)` validates the request identity and computes immutable before/after results. Errors use `TripRequestError(code, message)` with invalid-request/not-found/stale codes, or `InvalidTripScenarioError` for bad context. The API maps them; B performs no I/O.

The current solver uses positive authored length, explicit direction and deterministic code-unit edge-ID tie-breaking. Search pass-only first, then a path needing unknowns but no known blockers, then a structural blocked witness, otherwise disconnected. Unknown assessments with known blockers remain blocked until the blocker is cleared, then remain unknown. Failure witness lists are disjoint and carry no route/distance. Same-node trips are valid zero-edge, zero-metre results.

Evidence review is separate from passability. Rejected evidence cannot turn an edge passable. Empty barrier lists do not imply passability. Clearing one blocker cannot clear another condition. Source objects and request objects stay unchanged, including after repeated evaluations. Never substitute a plausible path or sample data on a validation failure.

## Golden example and current checks

Context `synthetic-campus-links`, revision 1, profile `step-free-demo`:

| Selection from `arrival` | Expected outcome |
|---|---|
| `library`, no repair | Blocked by `library-crossing` |
| `library`, `add-library-ramp` | After path `arrival → commons → crossing-east → library-door`, edges `arrival-walk`, `library-crossing`, `library-entrance`, **60 m** |
| `cafe` | Reachable, 60 m; the library repair adds no gain |
| `studio` | Unknown `studio-walk` |
| `archive` | Disconnected |
| `service`, either service repair | Still blocked by the remaining blocker |

Useful commands after installing the locked dependencies in your task checkout:

```text
npm run typecheck
npm test -- src/domain/curb src/data/curb
```

Run meaningful targeted regressions for the assigned change. Coordinator integration runs the full `npm run check` and the complete browser/API flow; a B unit pass is not that integration result. The recorded R1 B result is `c1349e3e6fb9a45026849b45e76ff366585bb98c`; the published R1 main is `db6ceb603e06ecf9ee8319ad0b2aa76eff840df2`. New work uses the coordinator's current assigned base, not these historical lane commits. [Saved evidence](r1-evidence/README.md).

## Boundaries

B owns only the task's literal domain/data/test paths. `docs/research/` requires its own assignment and does not currently exist. A owns shared schemas, server/client/API, integration tests, root manifests and configuration. C owns screens/styles/demo. Send a CHANGE_REQUEST with exact path/export, reason and affected consumers before any shared or cross-lane edit. R1's single nullable `repairId` is frozen; do not silently reinterpret it as a set.

Use no provider calls, React, persistence or field claims in the pure domain. Preserve research-source attribution and distinguish aerial assumptions from measurements. Current archived Princeton data is not a verified accessibility graph. Do not start R3 field ingestion, sponsors or a budget engine merely because the roadmap mentions them.

After the contract freeze, a lead may use up to two disjoint coding children, one level deep. Scope them literally; no parent/child overlapping writes, no shared-checkout child Git operations, no grandchildren. Use the recorded worker model policy for newly started coding agents and report the actual session/model rather than assuming a paused chat resumed. Stop children before commit/merge; review their diffs and return one lane RESULT with actual tests and verified remote SHA.

## If Vincent selects R2

Prepare a pure bounded subset evaluator and a fair condition-first baseline only after A publishes the new reviewed contract. One origin and equal-weight destinations; at most 12 projects /4,096 subsets. Score newly reachable destination IDs relative to the unchanged baseline, recomputing the graph for each set. Respect the same eligible projects, budget and costs in both plans. Unknown-cost projects are not free. Use explicit assumed costs in synthetic fixtures and deterministic gain/cost/count/ID tie-breaking.

Regression minimum: A alone=0, B alone=0, A+B=2 versus condition-first C=1 at equal budget; zero budget; empty feasible choice; invalid/unknown costs; ties and shuffled input; directed/unknown/disconnected cases; a repair clearing only one of two blockers; immutable source/evidence; deterministic result; contract identity. Benchmark the bounded chosen graph on the actual runtime. Do not use the kit's additive allocation solver for connectivity benefits.

Suggested assignment form for Vincent (fill in actual reviewed values; **not a claim**):

```text
Task / attempt: R2-B / 1
Owner: Oliver / oliverchennn / actual B session
Base: <full published common contract SHA>
Branch / checkout: <new exact codex task branch and isolated checkout>
Contract: <A's reviewed version, file, exports, candidate/budget/result semantics>
Allowed files: <literal domain implementation, test and fixture paths only>
Visible outcome: exact same-budget comparison with complementary-repair proof
Checks: typecheck; assigned domain/data cases; bounded runtime measurement
Dependencies: reviewed contract; old writers stopped/released
Excluded: shared schema/config, API/transport/UI, field imports, providers
Return: full local/actual remote SHA, sync time, results, changed files, child stop state
```

When done, publish safe scoped checkpoints, verify the actual remote branch SHA, and post RESULT using [HANDOFF.md](../HANDOFF.md). Remain in B scope until Vincent transfers it; do not resume outgoing coordinator duties.
