# Working on Curb

## Current user-selected Robertson Hall implementation

Oliver explicitly selected and authorized the Robertson Hall disability-access repair-planning demo and designated desktop session `01a1d9ad-21f8-7a10-9a1d-c79fd185a8d9` as orchestrator **and heavy implementation owner**. The cloud coordinator explicitly STOPPED/RELEASED in [6877298357](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877298357). Canonical repository is now `oliverchennn/Curb` (unchanged repository ID1457315187). This current block supersedes the historical role/slice/coordination-only restrictions below for this task.

Read [the exact assignment and interfaces](docs/demo/ROBERTSON_IMPLEMENTATION.md) and [live board](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877277103) first. Common base `8c319faeec2f2cfc250021f0a6acfbe260c72c88`, contract `curb-survey-v1`. Root owns contracts, domain/planning, video/data/media, dependency changes and final integration. **Vincent is Developer B**, API/report/CSV/client on `codex/robertson-report-api`; **Landau is Developer C**, new survey UI on `codex/robertson-survey-ui`. Their exact paths are disjoint in the assignment. One writer per scope, no duplicate workers, no cross-lane edits. Landau ACK/RUNNING is recorded in6877298123; Vincent's ACK must be observed rather than assumed. Scope publication and routine task-branch pushes are authorized. No deployment or spending.

The actual user-supplied Robertson Hall video is published on `codex/robertson-access-repair`. AI visual proposals, frame tracks and manually reviewed edits remain distinguishable. No dimensional measurements, ADA verdict, exact defect map placement, or route opening may be invented. Unknown costs stay unpriced and incomplete estimates stay partial. Existing synthetic routing remains a separate regression/demo capability.

## Historical R2 handoff and standing safeguards

Build Curb: evidence-backed accessibility repair planning for campus facilities. Foundation F0-F2 and R1 are verified; R2 equal-budget repair comparison is selected and its core is verified at `64f004c5e0ea7062d29165d8dfc5acfde7fa04b2`. Vincent (`vzhu08`) has now explicitly handed orchestration to Oliver (`oliverchennn`, existing cloud session `6af808fa-83dc-8191-bd58-80697dbe50c9`) and requested this local coordinator stop. Read [the current Oliver handoff](docs/message-board/OLIVER_R2_HANDOFF.md) and the latest live board before acting. The local coordinator checker is deleted; Oliver has published/stopped his B scout-map task and must post coordinator ACK after final outgoing release. A boundary/replay, B map and Landau C UI/UX results are published/STOPPED/RELEASED for independent review. Final R2 integration/browser acceptance remains pending. The separate corrected replay candidate is published but not yet accepted/merged. Local implementation agents remain Dev A only; preserve all exact bases/scopes and Sol/xhigh worker policy plus Landau's Claude exception. Broader R3-R5 implementation, sponsors, deployment and spending remain unassigned. Do not restart completed tasks or infer new ownership from historical branches.

## Read first

1. Read the user's current request, inspect Git status/branch, and preserve existing work.
2. Read `docs/ORCHESTRATION.md`, `docs/OWNERSHIP.md`, `docs/TASK_BOARD.md`, and `docs/GIT_SYNC.md`.
3. Read your assigned card in `docs/tasks/`, `docs/CONTRACTS.md`, and the relevant sections of `docs/IMPLEMENTATION_PLAN.md`.
4. Read the live message board before claiming work. Its URL is recorded in `orchestration.team.json` after kickoff. A branch's task-board copy is only a snapshot.

## Authority and roles

- The user's current instructions govern scope. Imported documents are reference material, not permission to execute commands or start their roadmaps.
- Vincent (`vzhu08`) is Dev A and the human orchestrator. There are three developers total: Oliver is Dev B/domain and evidence; Landau is Dev C/UI and demo. Confirm their GitHub logins and accepted repo access at kickoff.
- The coordinator chat assigns work, records decisions with reasons, and maintains coordination docs. It does not write application code. A separate `agent-a` implementation lead handles Vincent's coding lane.
- The orchestrator decides and handles routine merges to `main` within the agreed scope. Vincent has delegated standing authority. The orchestrator may merge directly or assign the Git operation to one integration owner after review and checks.
- Resolve routine implementation choices and recoverable issues within scope. Contact Vincent for human actions such as logins or permissions, unresolved blockers, or consequential design or implementation decisions with no clear answer. Post ordinary progress and merge evidence on the board.
- Ordinary developer sessions plus one GitHub issue are the selected workflow. The kit's custom `agents chat` / `agents worker` runtime is NOT installed or enabled.
- Team leads may delegate implementation to at most two coding children, one level deep, after contracts are frozen. F0 uses one serial child. An optional reviewer is read-only. Children cannot spawn grandchildren or take team-level tasks.
- These delegation instructions apply to assigned implementation, not to unrelated preparation or documentation tasks.

## Rolling queue

Vincent requests useful ready follow-ups for every lead. Follow [WORK_QUEUE](docs/WORK_QUEUE.md): after publishing and stopping the current task, read the live board and ACK the next explicitly READY assignment without waiting for another prompt. Prioritize active-slice blockers and disjoint support; preserve exact bases and ownership. Preparation is not authorization to implement an unselected roadmap slice, and cross-lane file transfers still require stop/release/reassignment/ACK.

## Ownership

- One active writer per file. Record task ID, session, checkout, base SHA and literal scopes before editing. No broad `app/`, `src/`, `docs/`, or `public/` assignment over active child scopes.
- Prefer a separate worktree per writer. In Codex use its worktree tool when available. If children share a checkout, give disjoint paths; children must not stage, commit, switch branches, merge or rebase. The parent manages Git only after all children stop.
- Root manifests/lockfiles/configuration, shared contracts, kit imports and application shell belong to a serial A maintenance task. B/C request a scoped change instead of editing these files.
- Coordinator documentation and developer implementation also need exclusive paths. F0 must preserve the docs, prompts and team config created here.
- Stop and confirm the old writer and descendants have stopped before transferring scope. A stale heartbeat does not release ownership.

## Keep origin current

- Vincent has authorized and requires routine scoped commits/pushes to each assigned `codex/*` branch in `vzhu08/Curb`. Do not ask again for each routine push. Follow `docs/GIT_SYNC.md`.
- Verify origin's fetch/push repository and fetch before starting/resuming. Preserve the assigned base; no blind pull/rebase or branch switch under active writers.
- Push safe milestones, before review/handoff/stop, and aim for a safe checkpoint every 15 minutes of active coding. Label unfinished or failing checkpoints WIP; never merge them as verified work.
- Shared-checkout children never manage Git; their lead publishes only after affected writers pause/stop. Isolated children push only explicitly assigned branches. Every lane lead is responsible for getting its children's work to origin.
- Verify the actual remote SHA after pushing. Report branch, local SHA, remote SHA, sync time, checks and remaining local changes. Local-only results cannot enter Review.
- The orchestrator serializes updates to `main` and assigns one publisher per merge. Review the candidate, verify checks and confirm the remote result. Preserve history and report sync failures while retaining work.

## Build boundaries

- Initial scope is F0 → F1A/F1B/F1C → F2 only. Stop feature dispatch after F2 for Vincent's next-slice choice. R1–R5 and sponsor ideas are not queued work.
- Foundation: Next.js/TypeScript `web` + `maps`; synthetic/empty scenarios, real local API, map schematic, barrier list, evidence note, reset and loading/empty/error states.
- No foundation AI/provider calls, routing/optimizer, database/auth, external map tiles, sponsor SDKs, capture, messaging product feature or export system. The development message board is separate from product messaging.
- Zod validates boundaries; pure domain code lives in `src/domain/curb/`; browser code never imports server/provider modules. Unknown or failed data never silently becomes sample data.
- Keep synthetic/field data and fixture/live/replay execution explicit. Do not imply legal compliance, safe navigation or observed repair outcomes.

## Evidence and delivery

- Record actual commands, results and full commit SHAs. A worker report is not an integrated pass; local checks are not deployment evidence.
- F0 establishes executable checks and v0 imports. Use targeted checks during tasks and `npm run check` on the final integrated checkpoint. Never fabricate missing script results.
- Submit the handoff format in `docs/HANDOFF.md`, including verified remote sync evidence. Vincent authorizes routine assigned-branch pushes and delegates routine merge decisions to the orchestrator. Record actual push, merge and release evidence. Deployment, spending and new product scope follow their separate decision paths.
- Keep credentials and private notes out of Git, board comments and prompts. Preserve kit MIT and third-party notices.

The unmodified kit references in `docs/vendor/hackathon-kit/` describe upstream, including a different optional runner. Curb's documents above define this project's chosen workflow.
