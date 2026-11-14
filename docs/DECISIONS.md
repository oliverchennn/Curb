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
| D13 | Routine scoped commits/pushes to assigned `codex/*` branches authorized and expected | Vincent instructed the setup chat to keep origin consistently updated and notify active agents; actual user messages verified; [board policy](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871779642) | Vincent changes authority; main integration/PR/release gates remain |
| D14 | All new/started worker chats and coding children use GPT-6.1 Sol / extra-high (`gpt-6.1-sol`, `xhigh`); Astra only for coordinator | Vincent's explicit instruction in kickoff; temporary B receives a model override and A is created with it | Vincent changes model preference |
| D15 | Landau may continue his independently started Claude Code session | Vincent explicitly answered "Landau can continue in Claude Code"; C readiness ACK 6871867809; A/B model settings unchanged | Vincent changes the exception |
| D16 | Publish reviewed docs-only checkpoint `5d05de8e2ae88fc2c22c51e9c562af3e0346113b` to main | Vincent explicitly approved this candidate; it preserves Landau's username commits; actual main push and remote SHA verification succeeded | New main integration requires recorded authority; this is not application approval |

Open facts:

- Landau's session/readiness acknowledgement remains pending; `landautzou` accepted write access is verified. Oliver's `oliverchennn` write invitation remains pending; temporary B operator is verified `vzhu08`.
- F0 SHA, frozen schema exports, check script availability and native-child execution remain unverified until actual implementation checks. Shared preparation SHA is recorded above; later kickoff snapshots are recorded on the board.
- Event deadline/sponsor details are carried from the supplied plan; original event packets have not been independently reread in this setup. No sponsor is selected.

Append future decisions with owner, reason, evidence, affected task IDs, and reconsideration trigger. Record actual approvals already given; do not ask the user to repeat them.
