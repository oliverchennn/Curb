# Task board — snapshot

Live board: [Curb team board #1](https://github.com/vzhu08/Curb/issues/1). Read newer comments before claiming work. Cloud verification cursor: `6873942498`. All prior local and R1 cloud coding writers are stopped/released. No application scope is currently assigned.

**Foundation F0 → F1A/F1B/F1C → F2 and R1 are verified.** R1 browser/full-check application SHA: `03d89572c207b88bc02d80c6f3a745aad1895391`. Final main publication SHA is recorded on the board after this documentation checkpoint. [Acceptance evidence](ACCEPTANCE.md).

| ID | Owner | Result SHA | State / evidence |
|---|---|---|---|
| F0 | Vincent / agent-a | `7e56583774b9723a6ce8b6c25def915c08e76217` | Verified; common frozen F1 base `313395308c26791ef8f9fd37a2d0fb72e441e9b7` |
| F1A | Vincent / agent-a | `b8b8c682b86e7594eea80d3a659ed13e0b4b2c0e` | Accepted/integrated; real API and transport; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873032653) |
| F1B | Vincent / agent-b-temp for unavailable Oliver | `a0837c0edbfe973d0fb658b187984e53cde80ed2` | Accepted/integrated; 23 domain + 5 data tests; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873019586) |
| F1C | Landau / landautzou / Claude Code | `6fc3ccdd00229ab1a615174a8caa6d2eb526fb79` | Accepted/integrated; screen and evidence; [final result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873069299) |
| F2 / M-DEV | Vincent / separate A integration lead | `fc12e86c85394ab8126db1be485aaf0e7845c087` | Verified: B → A → C merges, dev-command fix, 53 tests/build and real browser; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873216551) |

All historical foundation leads and children stopped and released their write scopes. Their laptop preview and heartbeat were stopped at handoff. Current cloud ownership is below. No branch state grants a new task.

Foundation contracts stay frozen at `curb-v0`. The separate `curb-r1` contract is frozen at `c271c4fee62b3f05e7909df450a66f263db213ea`; existing fixtures/imports remain intact. R2–R5 and sponsors remain unassigned. [Git sync](GIT_SYNC.md), exclusive ownership and [standing merge delegation](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956) continue to apply.

All coordinator-created workers/children use GPT-6.1 Sol / extra-high. Landau retains his approved Claude Code exception; Astra is coordinator-only.

## Current cloud iteration

[Takeover audit](message-board/CLOUD_TAKEOVER.md); [R1 card](tasks/R1.md). User Oliver selected R1 after the audit. Authenticated account `oliverchennn` has verified WRITE access. Coordinator session `6af808fa-83dc-8191-bd58-80697dbe50c9`, branch `codex/cloud-takeover`, checkout `/workspace/curb`, baseline `1992c53778c4374c7b2400f2a201f02dcac8c260`.

| Task | Owner / checkout | State |
|---|---|---|
| CLOUD-TAKEOVER | Coordinator | Complete: repo, all prior PRs, board, source/research provenance and baseline checks audited |
| R1-CONTRACT | `/root/r1_a` | Accepted, 23 tests/typecheck; `c271c4fee62b3f05e7909df450a66f263db213ea` |
| R1-B | `/root/r1_b`, `/workspace/curb-b-r1` | Accepted/stopped; `c1349e3e6fb9a45026849b45e76ff366585bb98c`; 64 domain/data tests; remote equality 07:30:22 UTC |
| R1-A | `/root/r1_a`, `/workspace/curb-a-r1` | Accepted/stopped; `3c1f3576ca7d7de0543ffb4412e400dbf0bb4f9e`; 118 API/transport tests; remote equality 07:32:55 UTC |
| R1-C | `/root/r1_c`, `/workspace/curb-c-r1` | Accepted/stopped; `6f5a61309f11a28ca45cad054bdd99f4c6cdc3f8`; combined typecheck/258 tests; remote equality 07:33:51 UTC |
| R1-VERIFY | Coordinator, `/workspace/curb` | Accepted; B → A → C integration `03d89572c207b88bc02d80c6f3a745aad1895391`; full check, 160 API comparisons, browser and foundation regression passed; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873942498) |

Common implementation base was `d561c30f10b6e3f34300093cea343346a87b9678`; [exact assignments](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873769585). A's transport child and B's fixture child stopped before their leads' Git operations; C had no child. Final publication follows the standing merge delegation. This completes only R1; no autonomous background worker, deployment or later feature iteration is scheduled.
