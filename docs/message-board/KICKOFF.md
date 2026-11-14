# Kickoff checkpoint

Live board: https://github.com/vzhu08/Curb/issues/1. Coordinator session: `01a1d84f-5fd1-71b0-a1d3-c9952d311e7a`; branch `codex/coordination-kickoff`; checkout `C:\Users\vzhu0\PycharmProjects\Curb`.

Shared preparation SHA: `eee48e553de92072b4cb53148f9fd12c957514f0`, published to `main` by the setup chat under Vincent's explicit instruction. Kickoff preserves its 47 setup files. F0 SHA and final integrated SHA remain unset; `curb-v0` is draft.

Vincent's model requirement: all new and already-started worker chats and coding children use `gpt-6.1-sol` / `xhigh` (GPT-6.1 Sol, extra-high reasoning). Only the coordinator uses Astra. When spawning a child with explicit model/effort overrides, use `fork_turns="none"` and supply its complete task context.

Subsequent explicit exception: Vincent permits Landau to continue his independently started Claude Code session. A/B settings remain unchanged. Approved docs-only main checkpoint `5d05de8e2ae88fc2c22c51e9c562af3e0346113b` was pushed and independently read back from GitHub; it preserves Landau's two username edits. F0 keeps its originally assigned `aed56a3935408ed139a13e56fe42a589368e1e19` base.

## Roster and sessions

- Vincent / `vzhu08`: authenticated admin; A lead session `01a1d85a-6afa-7a03-a025-d095dfbb6e1b` is running F0 adoption revision 2 with one serial child `/root/f0_bootstrap`. Branch `codex/f0-bootstrap`; checkout `C:\Users\vzhu0\.codex\worktrees\curb-f0-bootstrap\Curb`; base `aed56a3935408ed139a13e56fe42a589368e1e19`; revision 2 ACK 6872008472. Its exact 33 source files are in [assignment 6872004050](https://github.com/vzhu08/Curb/issues/1#issuecomment-6872004050).
- Temporary B: `agent-b-temp`, session `01a1d853-781e-7ce1-9082-ac04a68d3782`, local host, acting under Vincent / `vzhu08`. B-READY only: read documentation/board, verify identity, post readiness; no files, Git mutations, children or application code. Oliver is unavailable; `oliverchennn` has a pending write invitation. Returning Oliver requires confirmed temporary-writer/descendant stop and scope release.
- Landau / `landautzou`: accepted write collaborator, C-READY ACK 6871867809. Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221`; checkout `C:\Users\Landau\Desktop\CS_PROJECTS\Curb`. Vincent explicitly permits this Claude Code session. No write scope or children. Startup prompt: [START_DEV_C.txt](../../START_DEV_C.txt). F1C awaits the verified F0 baseline.
- Setup support `01a1d840-149d-73f3-822d-832a4aa4bd87`: policy work completed; all writers stopped and paths released; no descendants or application scope. Merge-authority policy is integrated and remote-verified on main at `5aaae394560c84fec4ef020683b6bb22a8544bcb`.

## Ownership and next action

Coordinator COORD-START owns only: `orchestration.team.json`, `docs/TASK_BOARD.md`, `docs/DECISIONS.md`, `docs/OWNERSHIP.md`, `docs/ORCHESTRATION.md`, `docs/MESSAGE_BOARD.md`, `README.md`, `START_DEV_B.txt`, `docs/message-board/KICKOFF.md`. Base is the shared preparation SHA above. No application coding by this chat.

Completed F0 staging: verified pin `22a5f44a27375e88ac2cd1754f6976704f725bc5`, kit `npm ci` and web+maps generation exited 0. A enumerated 73 staged files and reported the staging child stopped. Coordinator inspected the generated dependency/import closure and approved 15 copy/adapt targets plus 18 additional source/test/notices files, excluding provider adapters, generated instructions/docs, deployment config and caches. [Exact inventory](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871982974); [revision 2](https://github.com/vzhu08/Curb/issues/1#issuecomment-6872004050). A ACKed and resumed the single child. Existing coordination files and Git history remain preserved; no kit custom worker runtime.

F0 must establish executable scripts, v0 imports, synthetic/empty/invalid fixtures and honest compiling stubs, run actual `npm run check`, review the child diff, stop the child before parent Git operations, and report the full committed/remote-verified result plus docs proposals. No F1 dispatch before acceptance; then all lanes use the same verified F0 SHA. F2 integration is B → A → C, followed by full checks and browser evidence. Stop features after F2 for Vincent's choice.

## Authority and evidence

Board comments authorized by kickoff. Vincent's later direct instruction in the setup chat authorizes and expects routine scoped commits/pushes to assigned `codex/*` branches, with verified remote SHAs, safe milestone checkpoints and a 15-minute checkpoint aim while coding. Main integration, PR and release gates remain. [Standing sync policy](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871779642).

Actual preparation verification: `node .curb-local/verify-docs.cjs` passed before roster edits (17 upstream snapshot hashes, original source SHA-256, 26 active documents, 63 local links, 12 exclusive child paths); `git diff --check` passed. Credential-pattern scan returned no matching filenames (`rg` exit 1). GitHub connector identity and issue create/readback succeeded. CLI initially lacked sandbox network access; approved read-only queries returned admin access, accepted `landautzou`, pending `oliverchennn`. No application checks, deployment or native coding-child run has occurred yet.

At START `2026-11-14T04:31:22Z`: 26h28m until feature freeze and 32h28m until hard deadline. Supplied deadlines: 2026-11-15 02:00 / 07:30 / 08:00 America/New_York. No new event packet supplied. No background board polling is promised after coordinator stops.

Board cursor at this snapshot: `6872022645`; live issue may be newer. B/C readiness is complete; F0 revision 2 is running. Pending: actual app installation/checks, reviewed/pushed F0 result and contract freeze. No application integration queued and no feature slices beyond foundation dispatched. Vincent delegated routine main merges to the coordinator in [decision 6871935956](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956); matching policy is now on main. Active task bases stay unchanged.

Resume coordination by reading all board comments after this cursor and the A lead's current result/status. Healthy A work may continue within revision 2 while this kickoff turn ends. Do not duplicate its writer or assign F1 early. Review the actual F0 diff/commit/check evidence, record imports/fixtures/commands, then dispatch F1A/B/C from one common verified SHA. B session is idle awaiting a communicating follow-up; Landau manually re-invokes C to read the board. No coordinator background polling is promised after the turn ends.
