# Decisions and open facts

Preparation date: 2026-11-13, America/New_York. These are setup decisions, not evidence of application completion.

| ID | Decision / owner | Reason | Revisit |
|---|---|---|---|
| D01 | Vincent (`vzhu08`) coordinates and owns Dev A; Oliver owns B; Landau owns C | User named Vincent/account and the other two developers; three humans total | Vincent changes roles |
| D02 | Separate coordinator and A coding lead | Preserves the supplied plan's coordination/code ownership separation | Explicit workflow change |
| D03 | Ordinary agent sessions + one shared GitHub issue | Kit worker source disables native children; plan expects bounded lane subagents | A separately scoped runner change and three-machine rehearsal |
| D04 | Pin kit `22a5f44a27375e88ac2cd1754f6976704f725bc5` | It matches both supplied plan and inspected upstream main | Review a newer revision before upgrade |
| D05 | Foundation only, then stop | User asked to adapt/setup the plan; original plan requires a reviewable small first slice | Vincent's post-F2 choice |
| D06 | Stage generator output in an empty ignored directory; selectively adopt | Current Curb is a nonempty Git repo containing coordination docs, not an existing npm app; create refuses nonempty targets | An app exists before F0 begins |
| D07 | Import docs/templates and notices now; application/runtime installation deferred to tasks | Current request is preparation and startup instructions, not execution of the attached implementation roadmap | Kickoff starts F0 |
| D08 | Vincent authorizes temporary B lead under Vincent / `vzhu08` while Oliver is unavailable | Explicit kickoff instruction; separate chat `01a1d853-781e-7ce1-9082-ac04a68d3782`; Oliver's `oliverchennn` invitation is pending | Oliver returns, after confirmed stop/release and a new assignment |
| D09 | Use [board #1](https://github.com/vzhu08/Curb/issues/1), authenticated as `vzhu08` | Exact-title search found no existing issue; create/readback succeeded; admin access and issues enabled verified | Access failure or explicit coordinator succession |
| D10 | Preserve shared setup commit `eee48e553de92072b4cb53148f9fd12c957514f0`; coordinator changes on `codex/coordination-kickoff` | Setup chat concurrently completed Vincent's explicit request to commit/push all 47 setup files to main | New reviewed documentation checkpoint |
| D11 | Create separate A coding chat and communicate F0 assignment | Vincent's explicit response: "Create agent-a and start F0"; coordinator remains outside application code | F0 completion/cancellation |
| D12 | Keep generated-file adoption gated on a literal inventory | Only A may run bootstrap; output does not exist at kickoff, so exact generated paths cannot honestly be asserted yet | Coordinator accepts the lead's inventory addendum before copying |
| D13 | Routine scoped commits and pushes to assigned `codex/*` branches authorized and expected | Vincent instructed the setup chat to keep origin consistently updated and notify active agents. [Sync decision](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871779642) | Vincent changes branch sync authority |
| D14 | All new/started worker chats and coding children use GPT-6.1 Sol / extra-high (`gpt-6.1-sol`, `xhigh`); Astra only for coordinator | Vincent's explicit instruction in kickoff; temporary B receives a model override and A is created with it | Vincent changes model preference |
| D15 | Landau may continue his independently started Claude Code session | Vincent explicitly answered "Landau can continue in Claude Code"; C readiness ACK 6871867809; A/B model settings unchanged | Vincent changes the exception |
| D16 | Publish reviewed docs-only checkpoint `5d05de8e2ae88fc2c22c51e9c562af3e0346113b` to main | Vincent approved this candidate, which preserves Landau's username commits. The push and remote SHA were verified. | Later merges follow D17 |
| D17 | Orchestrator owns routine `main` merges after review and checks | Vincent delegated routine merges and requested escalation only for human actions, unresolved blockers and consequential choices without a clear answer. [Merge delegation decision](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956) | Vincent changes delegation or a specific decision requires his input |

Open facts:

- Landau's C-READY is acknowledged in comment 6871867809, with the Claude exception in D15. Oliver's `oliverchennn` write invitation remains pending; temporary B operator is verified `vzhu08` and B-READY is complete.
- F0 and all F1 lanes are integrated and F2 is accepted at `fc12e86c85394ab8126db1be485aaf0e7845c087`; full check passed (53 tests/build), plus actual Chrome evidence. Common F1 base was `313395308c26791ef8f9fd37a2d0fb72e441e9b7`. All writers/children are stopped and released; `curb-v0` remains frozen. Next product slice awaits Vincent.
- Event deadline/sponsor details are carried from the supplied plan; original event packets have not been independently reread in this setup. No sponsor is selected.

Append future decisions with owner, reason, evidence, affected task IDs, and reconsideration trigger. Record actual approvals already given; do not ask the user to repeat them.

2026-11-14, coordinator: accepted F0 revision 3 with exact Next.js 16.4.1 / Zod 4.6.6 patches after a clean-build security failure; [approval](https://github.com/vzhu08/Curb/issues/1#issuecomment-6872178792), [reviewed result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6872294726). The remaining direct dependency versions and upstream provenance stay pinned. Revisit only for an evidenced compatibility/security issue through a serial A maintenance assignment.

2026-11-14, coordinator: Landau's [sponsor proposal](https://github.com/vzhu08/Curb/issues/1#issuecomment-6872534480) is a post-F2 candidate for Vincent's choice. It does not authorize provider integrations, credentials, spending, field research or a change to foundation scope.

2026-11-14, coordinator: accepted all F1 lanes, a bounded C error-copy correction, and F2's B → A → C integration. C reproduced a plain-dev Turbopack/webpack mismatch, so serial M-DEV authorized only the package.json dev-script `--webpack` flag. Real browser/full checks passed on `fc12e86c85394ab8126db1be485aaf0e7845c087`; [F2 evidence](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873216551), [acceptance](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873224948). Missing optional favicon is a recorded nonblocking limit, not a masked application failure. Stop new feature dispatch; Vincent chooses the next outcome.
