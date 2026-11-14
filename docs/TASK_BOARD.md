# Task board — snapshot

Live board: [Curb team board #1](https://github.com/vzhu08/Curb/issues/1). Read newer comments before claiming work. Cloud takeover cursor: `6873665200`. Prior local writers are stopped. R1-CONTRACT is assigned to cloud A; other R1 lanes await its reviewed freeze.

**Foundation F0 → F1A/F1B/F1C → F2 is verified. Oliver has selected R1 in the cloud takeover session.** Browser/full-check application SHA: `fc12e86c85394ab8126db1be485aaf0e7845c087`. Final main publication SHA is recorded on the board after this documentation checkpoint. [Acceptance evidence](ACCEPTANCE.md).

| ID | Owner | Result SHA | State / evidence |
|---|---|---|---|
| F0 | Vincent / agent-a | `7e56583774b9723a6ce8b6c25def915c08e76217` | Verified; common frozen F1 base `313395308c26791ef8f9fd37a2d0fb72e441e9b7` |
| F1A | Vincent / agent-a | `b8b8c682b86e7594eea80d3a659ed13e0b4b2c0e` | Accepted/integrated; real API and transport; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873032653) |
| F1B | Vincent / agent-b-temp for unavailable Oliver | `a0837c0edbfe973d0fb658b187984e53cde80ed2` | Accepted/integrated; 23 domain + 5 data tests; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873019586) |
| F1C | Landau / landautzou / Claude Code | `6fc3ccdd00229ab1a615174a8caa6d2eb526fb79` | Accepted/integrated; screen and evidence; [final result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873069299) |
| F2 / M-DEV | Vincent / separate A integration lead | `fc12e86c85394ab8126db1be485aaf0e7845c087` | Verified: B → A → C merges, dev-command fix, 53 tests/build and real browser; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873216551) |

All historical foundation leads and children stopped and released their write scopes. Their laptop preview and heartbeat were stopped at handoff. Current cloud ownership is below. No branch state grants a new task.

Foundation contracts stay frozen at `curb-v0`. The separate `curb-r1` contract is being established serially; existing fixtures/imports remain intact. R2–R5 and sponsors remain unassigned. [Git sync](GIT_SYNC.md), exclusive ownership and [standing merge delegation](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956) continue to apply.

All coordinator-created workers/children use GPT-6.1 Sol / extra-high. Landau retains his approved Claude Code exception; Astra is coordinator-only.

## Current cloud iteration

[Takeover audit](message-board/CLOUD_TAKEOVER.md); [R1 card](tasks/R1.md). User Oliver selected R1 after the audit. Authenticated account `oliverchennn` has verified WRITE access. Coordinator session `6af808fa-83dc-8191-bd58-80697dbe50c9`, branch `codex/cloud-takeover`, checkout `/workspace/curb`, baseline `1992c53778c4374c7b2400f2a201f02dcac8c260`.

| Task | Owner / checkout | State |
|---|---|---|
| CLOUD-TAKEOVER | Coordinator | Baseline audit complete; documentation in progress |
| R1-CONTRACT | `/root/r1_a`, `/workspace/curb-a-r1`, `codex/r1-contract-api` | ACKed; only new trips contract and contract tests; [assignment](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873665200) |
| R1-A / R1-B / R1-C | New cloud workers, assigned after freeze | Waiting for reviewed common contract SHA |
| R1-VERIFY | Separate verification task after stopped lane results | Waiting for integration |
