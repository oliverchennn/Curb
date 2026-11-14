# Current production verification and visual upgrades

The public deployment serves `b010ad02ce9e0cb905e15e5c7c7109713814b36e` at [curb-taupe.vercel.app](https://curb-taupe.vercel.app). PR9 merged the wider survey replay and removed the oversized footer at `16f5444ace90422cac3ef32548ec35b9bed9fc1f`. [PR10](https://github.com/oliverchennn/Curb/pull/10) integrates the collection, explorer, and budget upgrades.

| Owner | Current scope | State |
| --- | --- | --- |
| Merge owner `01a1dc6e-1818-7dd2-ae95-8ac3fcfca3b5` | Git, shared integration, Chrome acceptance, archives and release | [Handoff ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6886029469) from outgoing product coordinator `01a1d9ad-21f8-7a10-9a1d-c79fd185a8d9` |
| B / Vincent laptop | Rover inspection and Vincent-project deployment | [Rover released](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885965018) at `352bc300850bacd7360680fc50fe17a1190846e7` and integrated through `e12464c`. [Read-only hosting preflight](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885998309) |
| C / Landau | Adaptive explorer stage and linked evidence | [In progress](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885777369) from `16f5444ace90422cac3ef32548ec35b9bed9fc1f`. See the live board for release |
| D / Oliver cloud | Survey plan presentation and synthetic budget explanation | [Released](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6886003683) at `cf7210200ebfe47b1f435bdcc136ddd4e2137f6e` and integrated through `7414d40`. Combined acceptance pending |

B and D used assigned base `2fb49f710085732a7ac20f63680925b8db06dba5`. C still holds its assignment until STOP/RELEASE. Vincent receives the exact merged source after integration and verification. [Live board](https://github.com/oliverchennn/Curb/issues/1).

---

# Task board — snapshot

**Current coordination:** Vincent has designated Oliver and requested the local coordinator stop. [Oliver R2 handoff](message-board/OLIVER_R2_HANDOFF.md). Checker deleted; final publication/release and successor ACK are recorded on the live board.

Live board: [Curb team board #1](https://github.com/vzhu08/Curb/issues/1). Read newer comments before claiming work. Handoff cursor: `6877084218`; read all pages for later/late arrivals. Vincent has designated Oliver; outgoing final release and actual successor ACK govern coordination. R2 remains selected. Local agents handle A only. [R2 task](tasks/R2.md); [resume ACK](https://github.com/vzhu08/Curb/issues/1#issuecomment-6875693713).

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
| R2-VERIFY-CORE/1 | Existing agent-a; stopped/released, no app changes | Accepted on `64f004c5e0ea7062d29165d8dfc5acfde7fa04b2`; full check/469 tests/production build, 16 independent plan-budget comparisons, 160 R1 comparisons and foundation APIs; [portable evidence](message-board/R2_CORE_CHECKPOINT.md); R2 UI/browser remains pending |
| R2-C/1 | Landau / `landautzou`; seven exact UI paths reserved | [Assignment](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876190198) from integrated `64f004c5e0ea7062d29165d8dfc5acfde7fa04b2`; Vincent expects return around 06:00 America/New_York; actual session/checkout/ACK required before Running |
| R2 coordination | Vincent | `codex/r2-coordination`; exact documentation reservation in resume ACK; no application edits |

Common implementation base: `47f7bfa4ac0a68d95050be5dfca1de92699c2e4d`; [exact six-file assignments](https://github.com/vzhu08/Curb/issues/1#issuecomment-6875905730). Later coordination-only main changes do not change lane bases.

The existing native local checker is ACTIVE every five minutes. It does not wake Oliver or Landau's separate chats. No temporary B/C agent is authorized under Vincent's latest instruction.


## Separately authorized parallel task

Vincent authorized [SURVEY-REPLAY/1](tasks/SURVEY_REPLAY.md), [board assignment](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876269112), from source `64f004c5e0ea7062d29165d8dfc5acfde7fa04b2` on `codex/survey-replay-demo`. The existing writer that posted 6876198246 must identify its actual session/model/checkout and literal files before Running. Oliver's R2-B session explicitly did not start it and remains stopped. Proposed boundary is only `public/survey-replay/` and `demo/survey-replay/`; no R2-C or shared path transfer. R2 continues unchanged, and its UI/browser acceptance remains separate.


## Rolling follow-up queue

Vincent requires useful queued work and safe cross-lane help. [Current queue](WORK_QUEUE.md), [five exact readiness task scopes](tasks/READINESS_QUEUE.md), [authority](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876402752). Actual Oliver B can prepare the Princeton field packet, then the R2 demo brief; A can prepare the evidence-boundary proposal; Landau and the replay writer have independent planning follow-ups after their implementation releases. The live READY assignment supplies the exact shared queue base. No implementation file ownership changes through this policy.


Replay RESULT/STOP/RELEASE [6876360532](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876360532) supplies exact candidate `ebc35b07590ad07ca990299da1d3b077190987d6`. Its owner is desktop session `01a1d9ad-21f8-7a10-9a1d-c79fd185a8d9`, not stopped R2-B. Ten files are released. Exact model was not exposed/reported, so it remains unverified. Prioritize A's independent UI/server review and actual B's domain/evidence review before their ready preparation fallbacks; no integration or correction is implied by the worker's result.


Ready queue assignments are live at [6876473105](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876473105), with documentation-preparation base `c952d7de0328bb31ba5f677b9800684b2c6366b8`. A [ACK 6876496820](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876496820) and actual B [ACK 6876489030](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876489030) are Running independent UI/server and domain/evidence reviews of exact replay `ebc35b07590ad07ca990299da1d3b077190987d6`. Tracked files are read-only. After their reviewed RESULT/STOP, A may directly ACK/start its boundary proposal; B may directly ACK/start field preparation, then the demo brief. Read the live board for a higher-priority exact assignment first.


2026-11-14 11:28 UTC: B replay domain review [RESULT/STOP 6876565135](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876565135) is accepted as review evidence, not candidate acceptance. Remote review ref remains `ebc35b07590ad07ca990299da1d3b077190987d6`. Coordinator independently reproduced malformed review/direction values, sentinel collision and nonfinite route sums in six Node cases. B and its Sol/xhigh read-only child stopped/released. B then [ACKed PRINCETON-FIELD-PREP/1](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876575682), Running in `/workspace/curb-princeton-field-prep` on `codex/princeton-field-prep` at `c952d7de0328bb31ba5f677b9800684b2c6366b8`, with only the three assigned research-document files. R2-DEMO-BRIEF remains its ready fallback. A browser/server review continues; replay main integration waits for reviewed corrections. Landau R2-C ACK remains pending. [Review acceptance](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876599507).


2026-11-14 11:32 UTC: A [review RESULT/STOP 6876599465](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876599465) is accepted as evidence after coordinator inspection of actual logs/JSON/screenshots. Windows standalone startup, malformed-data handling and local-media boundaries require corrections. [REPLAY-CORRECTION/1 assignment 6876629908](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876629908) transfers eight exact files from the released original replay scope to the existing Sol/xhigh A lead, base `ebc35b07590ad07ca990299da1d3b077190987d6`, branch `codex/replay-correction`. [Card](tasks/REPLAY_CORRECTION.md). Actual correction ACK and any prior preparation stop remain required before Running. B continues field preparation; C keeps its reserved R2 UI scope.


2026-11-14 11:51 UTC: B field packet `414214b83330d318ebc5402e6f78c258142fc095` is reviewed/integrated at `2d56e6a0a2ca4e70fd2977009d572e983182fb4c` after the [two endpoint-identity corrections](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876768933). Independent ZIP/member/count/feature/CSV/link checks passed; primary entrance guidance was reread. B's [R2 demo brief RESULT/STOP](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876791620), source `93d5e2509febd63fd718b92ad04909d0d99a8f2d`, is reviewed against the original core evidence (0/200/400/800 budgets, singles/omissions, named outcomes and distances). It remains a proposed script, with no UI rehearsal claim. Both B scopes released. [PRINCETON-SCOUT-MAP/1](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876823930) is READY for B at the corrected field base, three literal documentation artifact files, ACK required. A correction and C UI ownership are unchanged; read newer ACKs/results on the live board.

A [correction ACK 6876827578](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876827578) confirms Running, exact replay base and eight literal paths, in `C:\Users\vzhu0\.codex\worktrees\curb-replay-correction-local\Curb`, branch `codex/replay-correction`. A used a fresh Git worktree after desktop creation stalled; boundary preparation remains unclaimed/unedited/deferred, with no child or concurrent task.


Handoff snapshot through 6877084218: A boundary proposal `f9aeda43a3ee8fa899939e4ba7ed6b8b3c89b345` STOP6877003684; C R2 UI `2ff4478b9b2f84399f3ee66ff357f6c976f3c6dd` STOP6877006449; C UX proposal `ed6472de87d19703f8f9a69768ca532f37015748` STOP6877049587; B scout map `4ba01d89396bc864ba31884ed298e1e4993d131a` STOP6877084218. A replay correction `ce0a66fe753a55150dbbecf910fe57440aea50f0` STOP6876939367. All await independent review; no current active writer remains from these tasks. Oliver is waiting for outgoing final publication/release before coordinator ACK. See the handoff for source SHAs, literal paths, evidence and required final R2 gates. Earlier snapshots are historical.
