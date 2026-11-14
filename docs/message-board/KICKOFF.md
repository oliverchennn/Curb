# Kickoff checkpoint

Live board: https://github.com/vzhu08/Curb/issues/1. Coordinator session: `01a1d84f-5fd1-71b0-a1d3-c9952d311e7a`; branch `codex/coordination-kickoff`; checkout `C:\Users\vzhu0\PycharmProjects\Curb`.

Shared preparation SHA: `eee48e553de92072b4cb53148f9fd12c957514f0`, published to `main` by the setup chat under Vincent's explicit instruction. Kickoff preserves its 47 setup files. F0 SHA and final integrated SHA remain unset; `curb-v0` is draft.

Vincent's model requirement: all new and already-started worker chats and coding children use `gpt-6.1-sol` / `xhigh` (GPT-6.1 Sol, extra-high reasoning). Only the coordinator uses Astra. When spawning a child with explicit model/effort overrides, use `fork_turns="none"` and supply its complete task context.

## Roster and sessions

- Vincent / `vzhu08`: authenticated admin; separate A coding chat creation and F0 start explicitly authorized. F0 uses one serial bootstrap child in an isolated checkout.
- Temporary B: `agent-b-temp`, session `01a1d853-781e-7ce1-9082-ac04a68d3782`, local host, acting under Vincent / `vzhu08`. B-READY only: read documentation/board, verify identity, post readiness; no files, Git mutations, children or application code. Oliver is unavailable; `oliverchennn` has a pending write invitation. Returning Oliver requires confirmed temporary-writer/descendant stop and scope release.
- Landau / `landautzou`: accepted write collaborator. Agent-c session/readiness ACK pending. Startup prompt: [START_DEV_C.txt](../../START_DEV_C.txt). F1C awaits the verified F0 baseline.
- Setup support `01a1d840-149d-73f3-822d-832a4aa4bd87`: separate worktree and disjoint docs listed in the sync-policy board comment; no application scope.

## Ownership and next action

Coordinator COORD-START owns only: `orchestration.team.json`, `docs/TASK_BOARD.md`, `docs/DECISIONS.md`, `docs/OWNERSHIP.md`, `docs/ORCHESTRATION.md`, `docs/MESSAGE_BOARD.md`, `README.md`, `START_DEV_B.txt`, `docs/message-board/KICKOFF.md`. Base is the shared preparation SHA above. No application coding by this chat.

Next: publish the kickoff documentation checkpoint; post F0 assignment using its full SHA; create the authorized A lead with [START_DEV_A.txt](../../START_DEV_A.txt). A must use an isolated checkout, post ACK with actual session/checkout and delegate one serial child. Initial work stages pinned kit `22a5f44a27375e88ac2cd1754f6976704f725bc5` web+maps output under `.curb-local/`. Post an exact generated-file inventory for coordinator scope approval before copying any generated files into Curb. Preserve all existing coordination files and Git history. No kit custom worker runtime.

F0 must establish executable scripts, v0 imports, synthetic/empty/invalid fixtures and honest compiling stubs, run actual `npm run check`, review the child diff, stop the child before parent Git operations, and report the full committed/remote-verified result plus docs proposals. No F1 dispatch before acceptance; then all lanes use the same verified F0 SHA. F2 integration is B → A → C, followed by full checks and browser evidence. Stop features after F2 for Vincent's choice.

## Authority and evidence

Board comments authorized by kickoff. Vincent's later direct instruction in the setup chat authorizes and expects routine scoped commits/pushes to assigned `codex/*` branches, with verified remote SHAs, safe milestone checkpoints and a 15-minute checkpoint aim while coding. Main integration, PR and release gates remain. [Standing sync policy](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871779642).

Actual preparation verification: `node .curb-local/verify-docs.cjs` passed before roster edits (17 upstream snapshot hashes, original source SHA-256, 26 active documents, 63 local links, 12 exclusive child paths); `git diff --check` passed. Credential-pattern scan returned no matching filenames (`rg` exit 1). GitHub connector identity and issue create/readback succeeded. CLI initially lacked sandbox network access; approved read-only queries returned admin access, accepted `landautzou`, pending `oliverchennn`. No application checks, deployment or native coding-child run has occurred yet.

At START `2026-11-14T04:31:22Z`: 26h28m until feature freeze and 32h28m until hard deadline. Supplied deadlines: 2026-11-15 02:00 / 07:30 / 08:00 America/New_York. No new event packet supplied. No background board polling is promised after coordinator stops.

Board cursor at this snapshot: `6871779642`; live issue may be newer. Pending: A assignment/ACK, B readiness report, C session readiness, F0 inventory, actual application checks. No integration queued and no feature slices beyond foundation dispatched.
