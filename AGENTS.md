# Working on Curb

Build Curb: evidence-backed accessibility repair planning for campus facilities. Foundation F0–F2 and R1 are verified; R1 application SHA is `03d89572c207b88bc02d80c6f3a745aad1895391`. Vincent (`vzhu08`) resumed coordinator session `01a1d84f-5fd1-71b0-a1d3-c9952d311e7a` and explicitly selected **R2: equal-budget repair comparison**. Read `docs/tasks/R2.md` and the live board for exact current assignments. The R2 contract is reviewed and frozen at `c71310539c762a1d893f6e3b7778bdcdd3258a18`; implementation requires the published common base and exact lane ACK on the live board. Local implementation agents are **Dev A only**; Oliver owns Dev B and Landau owns Dev C. All former R1 workers stopped/released. R3–R5, sponsor work, deployment and spending remain unassigned. Do not restart F0 or infer a new writer from a historical branch.

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
