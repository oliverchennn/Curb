# Vincent: resume Curb orchestration

Prepared November 14, 2026, America/New_York. The user requested Vincent resume as orchestrator and Oliver's current cloud session continue as **Dev B**. This package transfers coordination after publication; Vincent's new session and acceptance are not yet observed. Read the live board before acting on this snapshot.

## Start here

1. Open a coordinator chat in a current clone and paste [START_ORCHESTRATOR.txt](../../START_ORCHESTRATOR.txt). The prompt resumes the completed project; it does not restart F0.
2. Read [board #1](https://github.com/vzhu08/Curb/issues/1), beginning with the [R1 publication](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873997922), the [return handoff](https://github.com/vzhu08/Curb/issues/1#issuecomment-6875515894), and all newer comments. The final handoff comment records the package PR and actual published SHA.
3. Verify your identity, current `main`, and clean checkout; post **COORDINATOR ACK** with your real session, checkout, branch, fetched SHA and last board comment read. Update `orchestration.team.json` with your actual session. Do not reuse an old laptop session ID as proof of a running agent.
4. Open the existing demo and inspect the evidence below. Then select the next outcome. **R2 equal-budget repair comparison is the recommendation, not an existing assignment.**
5. Dispatch exact scopes to available leads. This cloud conversation is Dev B, ready for an assignment; A and C need their availability confirmed. A board comment alone does not wake another machine's paused chat.

For a fresh checkout (preserves any existing dirty worktree):

```text
git clone https://github.com/vzhu08/Curb.git Curb-resume
cd Curb-resume
git status --short
git rev-parse HEAD
npm ci
npm run check
npm run dev
```

Node.js **22.23.0+** is required; cloud verification used Node 24.22.1/npm 11.9.0. No credentials, environment file or provider account is needed. `dev` uses webpack and listens at `127.0.0.1:3000`. Stop an existing server before building into the same `.next` directory. For an existing checkout, inspect and fetch first; fast-forward only when clean and no writer owns it. Do not reset or blindly pull/rebase unpublished work.

## What is complete

Curb helps campus facilities connect barrier evidence to the trips a repair could restore. The eventual business question is which repairs restore the most connections at a fixed budget. **Foundation F0–F2 and R1 are complete; the budget comparison is not built.**

| Checkpoint | Exact reference |
|---|---|
| Published R1 main | `db6ceb603e06ecf9ee8319ad0b2aa76eff840df2` |
| R1 PR | [#3: trip reachability and one repair](https://github.com/vzhu08/Curb/pull/3), merged |
| Tested R1 application | `03d89572c207b88bc02d80c6f3a745aad1895391` |
| PR #3 final head | `fe38a136171cc09e9ddae76943677811af746def`; only completion docs followed the tested application |
| Foundation application | `fc12e86c85394ab8126db1be485aaf0e7845c087` |
| Historical bootstrap PR | [#2](https://github.com/vzhu08/Curb/pull/2), merged; no unresolved PR at handoff preparation |
| New package publication | Final handoff comment on board #1; fetch current main rather than pinning the R1 SHA for new work |

The complete repository/PR/board/provenance audit is [CLOUD_TAKEOVER.md](CLOUD_TAKEOVER.md). Both earlier PRs were inspected. There is no pending code integration, known unfinished patch or active application scope. Task branches are retained as history; their existence does not grant ownership. The handoff itself changes documentation and preserves evidence, with no application/dependency/contract changes.

## Two-minute current demo

1. Open `/curb`: original synthetic campus schematic, four barrier records and linked evidence.
2. Follow **Plan a trip and compare one repair** to `/curb/trips`.
3. Keep **Welcome court → Library**, select **Add library ramp**, then **Compare trip**. Baseline is blocked; the hypothetical repair returns a **60 m** route with three highlighted edges. Inspect its unchanged original evidence.
4. Select **Cafe**: already reachable, so the library repair invents no gain. **Studio** stays unknown. **Archive** is disconnected. **Service** stays blocked after either individual repair because a second blocker remains.
5. Reset clears the repair, result and selected evidence. Controls support keyboard use; the trip flow has cancel, retry, stale-response guards and ten second deadlines.

## Architecture and lane map

The app is Next.js 16.4.1 / React 19.3 / TypeScript 6, with Zod 4.6.6 boundaries and Vitest 5. It uses immutable JSON scenarios and a credential-free SVG schematic. There is no database, auth, provider integration, external map service or deployment.

| Layer | Files / responsibility | Steward |
|---|---|---|
| Frozen shapes | `src/contracts/curb/index.ts` (`curb-v0`), `trips.ts` (`curb-r1`) | A, serial contract task |
| Pure validation and routes | `src/domain/curb/index.ts`, `trips.ts` and colocated tests | B |
| Authored examples | `src/data/curb/`; R1 is separate `trip-demo.json` | B |
| Real local API | `app/api/curb/{scenario,trip-scenario,trip}/route.ts`, `src/server/curb/` | A |
| Abortable transport | `src/client/curb/fetchScenario.ts`, `fetchTrip.ts` | A |
| Screens | `app/curb/`, `src/features/curb/{screen,map,evidence,trips}/` | C |
| Cross-boundary tests | `tests/integration/{contracts,server,client}/` | A |
| Shell, dependencies, root config, imported kit | Literal serial maintenance scope only | A |
| Coordination docs and publication decisions | This package, board, task cards, decisions | Coordinator |

Trip flow: UI → typed fetch → GET context / POST trip → immutable fixture + B validator/evaluator → validated result → UI/evidence. Browser code never imports server fixtures. [CONTRACTS.md](../CONTRACTS.md) is the detailed seam reference; do not infer an interface from a branch's partial implementation.

Preserve these decisions: explicit edge assessments determine passability independently of evidence review; unknown coverage is excluded; one repair clears one named blocker; direction matters; visual intersections are not graph nodes; failures do not return a plausible path/distance; explanatory lists describe one possible connection; all original evidence remains immutable. R1 has no multi-repair or cost fields.

## Evidence available on your machine

[Saved R1 evidence](r1-evidence/README.md) contains the actual check logs, API/browser JSON, screenshots and exact executed harness copies with SHA-256 provenance. [ACCEPTANCE.md](../ACCEPTANCE.md) explains the checks and limits. These results were recorded on November 14 at approximately **2:35–2:38 a.m. EST**; they are preserved results, not tests rerun during this documentation handoff.

- `npm run check`: TypeScript, **258 tests across nine files**, production build passed.
- Independent exhaustive-path oracle: all **160** origin × destination × repair/no-repair API combinations matched, including shortest length, direction and immutability checks.
- **15** production-browser interaction/fault groups passed: primary outcomes, keyboard/mobile, retry, stale identity, late completion, cancel/reset and deadlines.
- Original barrier-review regression passed; eleven loaded client chunks excluded exact fixture markers; no external requests or page exceptions.

Known limits: synthetic data only; optional favicon 404; original foundation fetch has no timeout (the new trip flow does); no screen-reader audit, GitHub Actions pipeline, deployed verification, field validation or completed construction claim. The first cloud build hit a sandbox worker restriction; the unchanged source built successfully outside that sandbox. Browser fault cases were controlled injections, with the clock advanced for deadlines.

## People, sessions and ownership

| Role | Current state | Next action |
|---|---|---|
| Vincent / `vzhu08` | Designated incoming orchestrator; new session/ACK pending | Read package and board, ACK, choose next slice |
| Oliver / `oliverchennn`, this cloud session `6af808fa-83dc-8191-bd58-80697dbe50c9` | Dev B ready, no application assignment | Follow [Dev B continuation](DEV_B_CONTINUATION.md); ACK Vincent's exact assignment before coding |
| Vincent's separate A coding lead | Previous local and R1 cloud A writers stopped/released | Confirm availability; use current [A prompt](../../START_DEV_A.txt) |
| Landau / `landautzou` | Previous C work stopped/released; present availability unknown | Confirm availability; use current [C prompt](../../START_DEV_C.txt) |
| R1 cloud workers and children | All completed/stopped; no active write scope | Do not restart without a new task |

Dev B readiness checkout is `/workspace/curb-dev-b`, branch `codex/dev-b-ready`, prepared from final published handoff main. Its actual base is recorded in the final board comment. It is local to this cloud environment, has no unpublished application work and creates no remote task claim. If that environment is gone, use a fresh clone and [START_DEV_B.txt](../../START_DEV_B.txt).

The outgoing coordinator performs only this bounded handoff publication, then releases coordination. Vincent owns subsequent assignments/merges; Dev B has no independent main-integration authority. Previous laptop heartbeat and preview remain stopped. No background board watcher, cross-computer dispatch or durable worker is installed. A paused conversation must be resumed explicitly; do not treat silence as acceptance or release.

Keep one writer per literal file scope, stop affected children before Git operations, and preserve the standing scoped-push/remote-verification policy. Leads may use up to two disjoint coding children after a contract freeze, one level deep. New coding workers follow the recorded GPT-6.1 Sol/xhigh policy; Landau retains the recorded Claude exception. Do not label an existing session with a model that has not been verified.

## Recommended next decision: R2

Select **same budget, two plans, different restored connectivity** before AI/sponsor work. The implementation plan's [R2 section](../IMPLEMENTATION_PLAN.md#slice-r2-prove-the-repair-budget-insight) specifies one origin, equal-weight destinations, at most twelve candidate projects and 4,096 subsets. Recompute reachability for every feasible repair set; the kit's additive solver cannot represent complementary repairs.

Required authored proof: A alone restores 0, B alone restores 0, A+B restores 2 at budget 4; a worse-rated C costs 4 and restores 1. The exact engine chooses A+B and the condition-first baseline chooses C under the same costs/budget/evaluator. Costs need explicit integer units and assumed/quoted/unknown status; an unknown cost is never free. Preserve unknown coverage and multi-blocker semantics. Tie-break by gain, lower cost, fewer repairs, stable IDs.

If Vincent selects R2, first assign A a serial contract task. Specify candidate/cost/severity/budget/result identity and multi-repair projections, preserving the existing v0/R1 seams. Then freeze one reviewed common base and assign B the pure exact evaluator/fixtures, A the API/transport, and C the budget/result interface. [Dev B continuation](DEV_B_CONTINUATION.md) has B's regression checklist and an assignment template. Start with a 60–90 minute bounded slice; cut polish before the fair comparison and complementary-repair proof. R3 real evidence, R4/R5, providers, export and deployment remain separate choices.

Research is preserved in [Curb_Research_and_Data.zip](../source/Curb_Research_and_Data.zip), with provenance in the audit. Princeton's 148 lines and 83 ramp points are aerial-derived; key measurements are missing. They do not establish current passability. Do not replace the clearly synthetic demo with inferred field truth. The CoStar/Matterport proposal is unselected.

## Event clock

All times are **America/New_York (EST)**, carried from the supplied plan:

| Milestone | Time |
|---|---|
| Feature freeze | Sunday, November 15, 2026, 2:00 a.m. |
| Target submission | Sunday, November 15, 2026, 7:30 a.m. |
| Hard deadline | Sunday, November 15, 2026, 8:00 a.m. |

Recompute time remaining when resuming; this handoff does not restart the event clock. Reconcile with the onsite packet if new authoritative timing arrives. Use [HANDOFF.md](../HANDOFF.md) for subsequent lane results and stop/release records.
