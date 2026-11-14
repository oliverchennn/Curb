# Foundation task board — snapshot

Live board: [Curb team board #1](https://github.com/vzhu08/Curb/issues/1), created and read back at kickoff. This file is a snapshot, not a distributed lock. Current sessions and exact reservations: [kickoff checkpoint](message-board/KICKOFF.md). Last recorded cursor: `6872022645` (merge-policy integration and F0 revision 2 status); read newer comments before claiming work.

Repository: `vzhu08/Curb`. Inspected initial HEAD: `95732cca8eaef9bb41a4c7311c9442cf3dd9b1e6` (README-only initial commit). This is **not** the future documentation checkpoint or verified F0 base. Resolve actual SHAs at dispatch; never substitute this initial SHA for a missing build checkpoint.

Shared setup SHA: `eee48e553de92072b4cb53148f9fd12c957514f0`, pushed to `main`. Kickoff changes use `codex/coordination-kickoff`; F0's dispatch records the full current documentation SHA. No F0 result exists yet. All new/started worker chats and coding children use `gpt-6.1-sol` with `xhigh` reasoning per Vincent; Astra is reserved for the coordinator.

| ID | Visible result | Human / agent | State | Dependency and base gate | Card |
|---|---|---|---|---|---|
| F0 | Reproducible web+maps skeleton, v0 schemas, golden fixtures, compiling seams | Vincent / separate `agent-a` | Running; adoption revision 2; ACK 6872008472 | Base `aed56a3935408ed139a13e56fe42a589368e1e19`; isolated checkout; exact 33 files approved in comment 6872004050 | [F0](tasks/F0.md) |
| F1A | Validated real API and browser transport | Vincent / `agent-a` | Blocked | F0 verified; exact common F0 SHA + frozen `curb-v0` | [F1A](tasks/F1A.md) |
| F1B | Correct relationships, counts, evidence lookup and fixtures | Vincent / `agent-b-temp`, covering unavailable Oliver | Blocked; B-READY is read-only | F0 verified; same F0 SHA + frozen `curb-v0`; explicit scope ACK | [F1B](tasks/F1B.md) |
| F1C | Usable map/list/evidence screen and all load states | Landau (`landautzou`) / `agent-c` | Blocked; C-READY acknowledged; Claude exception approved | F0 verified + frozen `curb-v0`; explicit assignment and ACK | [F1C](tasks/F1C.md) |
| F2 | Integrated foundation with repeatable browser walkthrough | Vincent / separate A integration agent | Blocked | F1B, F1A, F1C reviewed; stopped writers; actual integration candidate SHA | [F2](tasks/F2.md) |

States follow the kit: Planned → Ready → Running → Review → Queued → Merged → Verified; Blocked records a precise dependency. Queued means reviewed and ready for the recorded integration action. No state implies push, merge, deployment or successful checks. Rejected/stopped attempts remain in the message history and get a new attempt ID.

Dispatch records contain: task/attempt ID, owner/login, session, full base SHA, contract version, branch/checkout, literal scopes, checks, non-goals, timebox and remote action authority. Running requires the owner's acknowledgement. Scope persists through a blocker until a stop/release is confirmed.

F1 uses one common F0 SHA. The integration candidate advances sequentially B → A → C. F2 verifies the resulting commit; later tasks use that newly verified SHA.

R1–R5 and sponsor additions are deferred choices. After F2, Vincent selects one next outcome. Use the live board for current verification evidence and report the verified remote SHA of task checkpoints. The orchestrator handles routine merges to `main` after review and required checks. [Merge delegation decision](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956).
