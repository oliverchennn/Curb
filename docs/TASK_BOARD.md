# Task board — snapshot

Live board: [Curb team board #1](https://github.com/vzhu08/Curb/issues/1). Read newer comments before claiming work. Resume cursor: `6876190198`. Vincent's coordinator is active and R2 is selected. Oliver released the handoff documentation and is Dev B; Landau remains Dev C. Local agents handle A only. [R2 task](tasks/R2.md); [resume ACK](https://github.com/vzhu08/Curb/issues/1#issuecomment-6875693713).

**Foundation F0 → F1A/F1B/F1C → F2 and R1 are verified.** R1 browser/full-check application SHA: `03d89572c207b88bc02d80c6f3a745aad1895391`; published R1 main: `db6ceb603e06ecf9ee8319ad0b2aa76eff840df2`, [PR #3](https://github.com/vzhu08/Curb/pull/3). Final documentation-package publication is recorded on the live board. [Acceptance evidence](ACCEPTANCE.md).

| ID | Owner | Result SHA | State / evidence |
|---|---|---|---|
| F0 | Vincent / agent-a | `7e56583774b9723a6ce8b6c25def915c08e76217` | Verified; common frozen F1 base `313395308c26791ef8f9fd37a2d0fb72e441e9b7` |
| F1A | Vincent / agent-a | `b8b8c682b86e7594eea80d3a659ed13e0b4b2c0e` | Accepted/integrated; real API and transport; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873032653) |
| F1B | Vincent / agent-b-temp for unavailable Oliver | `a0837c0edbfe973d0fb658b187984e53cde80ed2` | Accepted/integrated; 23 domain + 5 data tests; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873019586) |
| F1C | Landau / landautzou / Claude Code | `6fc3ccdd00229ab1a615174a8caa6d2eb526fb79` | Accepted/integrated; screen and evidence; [final result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873069299) |
| F2 / M-DEV | Vincent / separate A integration lead | `fc12e86c85394ab8126db1be485aaf0e7845c087` | Verified: B → A → C merges, dev-command fix, 53 tests/build and real browser; [result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873216551) |

All historical foundation leads and children stopped and released their write scopes. Their laptop preview and heartbeat were stopped at handoff. Current cloud ownership is below. No branch state grants a new task.

Foundation contracts stay frozen at `curb-v0`. The separate `curb-r1` contract is frozen at `c271c4fee62b3f05e7909df450a66f263db213ea`; existing fixtures/imports remain intact. R2 is selected; R3–R5 and sponsors remain unassigned. [Git sync](GIT_SYNC.md), exclusive ownership and [standing merge delegation](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956) continue to apply.

All coordinator-created workers/children use GPT-6.1 Sol / extra-high. Landau retains his approved Claude Code exception; Astra is coordinator-only.

## Historical cloud R1 iteration

This section records completed R1 history; the current R2 iteration is listed below.

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

## Historical handoff readiness

| Role / task | State | Next action |
|---|---|---|
| HANDOFF-VINCENT | Outgoing cloud coordinator; docs/evidence/package only | Publish final reviewed documentation checkpoint and release coordination; final SHA/result on board |
| Vincent orchestrator | Designated, resumed session/ACK pending | Follow `START_ORCHESTRATOR.txt`; read final board record; ACK before dispatch |
| Oliver / this cloud session as Dev B | Ready, no code task or active file scope | Follow `START_DEV_B.txt`; use prepared `/workspace/curb-dev-b`; await exact task/base/contract |
| A / C | Historical work stopped; present availability unconfirmed | Coordinator confirms availability before assigning paths |
| R2 | Recommendation only | Vincent selects next outcome; A freezes new contract before B/A/C implementation |


## Current R2 iteration

| Task | Owner / scope | State |
|---|---|---|
| R2-CONTRACT/1 | Local agent-a; two contract/test files released | Accepted/frozen `c71310539c762a1d893f6e3b7778bdcdd3258a18`; [RESULT/STOP/RELEASE](https://github.com/vzhu08/Curb/issues/1#issuecomment-6875814582); independent typecheck and 40 boundary tests passed on merge `ad5e26340a9e25034d126313f2b02f38e57bda5a` |
| R2-B/1 | Oliver / `oliverchennn`; six domain/data paths released | Accepted `67d54131f89e8ad09144136ce1d32169f0f2583d`; [RESULT/STOP](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876036553); independent coordinator typecheck and 358 tests passed on merge `80a6655f3b469c425cff114745c5779aaa115c7e` |
| R2-A/1 | Existing local agent-a; six API/client/test paths released | Accepted `84161110be92e04436568d4080c9afab6aa7575d`; [RESULT/STOP](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876115096); 469 author tests/real HTTP; coordinator typecheck and 111 A tests passed on published integration `64f004c5e0ea7062d29165d8dfc5acfde7fa04b2` |
| R2-VERIFY-CORE/1 | Existing agent-a; ignored local artifacts only | Running from `64f004c5e0ea7062d29165d8dfc5acfde7fa04b2` on `codex/r2-verify`; [assignment](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876147806), [ACK](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876162160); no application writes or children |
| R2-C/1 | Landau / `landautzou`; seven exact UI paths reserved | [Assignment](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876190198) from integrated `64f004c5e0ea7062d29165d8dfc5acfde7fa04b2`; Vincent expects return around 06:00 America/New_York; actual session/checkout/ACK required before Running |
| R2 coordination | Vincent | `codex/r2-coordination`; exact documentation reservation in resume ACK; no application edits |

Common implementation base: `47f7bfa4ac0a68d95050be5dfca1de92699c2e4d`; [exact six-file assignments](https://github.com/vzhu08/Curb/issues/1#issuecomment-6875905730). Later coordination-only main changes do not change lane bases.

The existing native local checker is ACTIVE every five minutes. It does not wake Oliver or Landau's separate chats. No temporary B/C agent is authorized under Vincent's latest instruction.
