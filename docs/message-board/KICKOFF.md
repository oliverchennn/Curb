# Kickoff checkpoint

Live board: https://github.com/vzhu08/Curb/issues/1. Coordinator session: `01a1d84f-5fd1-71b0-a1d3-c9952d311e7a`; branch `codex/coordination-kickoff`; checkout `C:\Users\vzhu0\PycharmProjects\Curb`.

Shared preparation SHA: `eee48e553de92072b4cb53148f9fd12c957514f0`, published to `main` by the setup chat under Vincent's explicit instruction. Kickoff preserves its 47 setup files. F0 SHA and final integrated SHA remain unset; `curb-v0` is draft.

Vincent's model requirement: all new and already-started worker chats and coding children use `gpt-6.1-sol` / `xhigh` (GPT-6.1 Sol, extra-high reasoning). Only the coordinator uses Astra. When spawning a child with explicit model/effort overrides, use `fork_turns="none"` and supply its complete task context.

Subsequent explicit exception: Vincent permits Landau to continue his independently started Claude Code session. A/B settings remain unchanged. Approved docs-only main checkpoint `5d05de8e2ae88fc2c22c51e9c562af3e0346113b` was pushed and independently read back from GitHub; it preserves Landau's two username edits. F0 keeps its originally assigned `aed56a3935408ed139a13e56fe42a589368e1e19` base.

## Roster and sessions

- Vincent / `vzhu08`: authenticated admin; A lead session `01a1d85a-6afa-7a03-a025-d095dfbb6e1b` is running F0 revision 1 with one serial staging child. Branch `codex/f0-bootstrap`; checkout `C:\Users\vzhu0\.codex\worktrees\curb-f0-bootstrap\Curb`; base `aed56a3935408ed139a13e56fe42a589368e1e19`; ACK 6871868844. No application adoption yet.
- Temporary B: `agent-b-temp`, session `01a1d853-781e-7ce1-9082-ac04a68d3782`, local host, acting under Vincent / `vzhu08`. B-READY only: read documentation/board, verify identity, post readiness; no files, Git mutations, children or application code. Oliver is unavailable; `oliverchennn` has a pending write invitation. Returning Oliver requires confirmed temporary-writer/descendant stop and scope release.
- Landau / `landautzou`: accepted write collaborator, C-READY ACK 6871867809. Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221`; checkout `C:\Users\Landau\Desktop\CS_PROJECTS\Curb`. Vincent explicitly permits this Claude Code session. No write scope or children. Startup prompt: [START_DEV_C.txt](../../START_DEV_C.txt). F1C awaits the verified F0 baseline.
- Setup support `01a1d840-149d-73f3-822d-832a4aa4bd87`: separate worktree and disjoint docs listed in the sync-policy board comment; no application scope.

## Ownership and next action

Coordinator COORD-START owns only: `orchestration.team.json`, `docs/TASK_BOARD.md`, `docs/DECISIONS.md`, `docs/OWNERSHIP.md`, `docs/ORCHESTRATION.md`, `docs/MESSAGE_BOARD.md`, `README.md`, `START_DEV_B.txt`, `docs/message-board/KICKOFF.md`. Base is the shared preparation SHA above. No application coding by this chat.

Next: A's acknowledged F0 assignment stages pinned kit `22a5f44a27375e88ac2cd1754f6976704f725bc5` web+maps output under `.curb-local/`. The pin is verified and locked dependency installation is underway. A must post an exact generated-file inventory for coordinator scope approval before copying any generated files into Curb. Preserve all existing coordination files and Git history. No kit custom worker runtime. Board assignment: [F0 revision 1](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871848406).

F0 must establish executable scripts, v0 imports, synthetic/empty/invalid fixtures and honest compiling stubs, run actual `npm run check`, review the child diff, stop the child before parent Git operations, and report the full committed/remote-verified result plus docs proposals. No F1 dispatch before acceptance; then all lanes use the same verified F0 SHA. F2 integration is B → A → C, followed by full checks and browser evidence. Stop features after F2 for Vincent's choice.

## Authority and evidence

Board comments authorized by kickoff. Vincent's later direct instruction in the setup chat authorizes and expects routine scoped commits/pushes to assigned `codex/*` branches, with verified remote SHAs, safe milestone checkpoints and a 15-minute checkpoint aim while coding. Main integration, PR and release gates remain. [Standing sync policy](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871779642).

Actual preparation verification: `node .curb-local/verify-docs.cjs` passed before roster edits (17 upstream snapshot hashes, original source SHA-256, 26 active documents, 63 local links, 12 exclusive child paths); `git diff --check` passed. Credential-pattern scan returned no matching filenames (`rg` exit 1). GitHub connector identity and issue create/readback succeeded. CLI initially lacked sandbox network access; approved read-only queries returned admin access, accepted `landautzou`, pending `oliverchennn`. No application checks, deployment or native coding-child run has occurred yet.

At START `2026-11-14T04:31:22Z`: 26h28m until feature freeze and 32h28m until hard deadline. Supplied deadlines: 2026-11-15 02:00 / 07:30 / 08:00 America/New_York. No new event packet supplied. No background board polling is promised after coordinator stops.

Board cursor at this snapshot: `6871935956`; live issue may be newer. B readiness and C readiness are complete; F0 is staging. Pending: F0 inventory/adoption revision, actual application checks and contract freeze. No application integration queued and no feature slices beyond foundation dispatched. Vincent has since delegated routine main merges to the coordinator in [decision 6871935956](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956); setup support is preparing the matching policy changes on exclusive paths. Active task bases stay unchanged.
