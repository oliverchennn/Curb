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

Open facts:

- Oliver's and Landau's GitHub usernames and accepted repo access. User is sharing the repo; do not assume the invitations are accepted or logins match toolkit ownership.
- Actual docs checkpoint SHA, F0 SHA, frozen schema exports, check script availability and native-child support on each machine.
- Live board number/URL (created/resumed by kickoff prompt).
- Event deadline/sponsor details are carried from the supplied plan; original event packets have not been independently reread in this setup. No sponsor is selected.

Append future decisions with owner, reason, evidence, affected task IDs, and reconsideration trigger. Record actual approvals already given; do not ask the user to repeat them.
