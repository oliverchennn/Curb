# Foundation task board — snapshot

Live board: **not started**. Kickoff records the issue URL in `orchestration.team.json` and here. No active task claims exist. This file is not a distributed lock.

Repository: `vzhu08/Curb`. Inspected initial HEAD: `95732cca8eaef9bb41a4c7311c9442cf3dd9b1e6` (README-only initial commit). This is **not** the future documentation checkpoint or verified F0 base. Resolve actual SHAs at dispatch; never substitute this initial SHA for a missing build checkpoint.

| ID | Visible result | Human / agent | State | Dependency and base gate | Card |
|---|---|---|---|---|---|
| F0 | Reproducible web+maps skeleton, v0 schemas, golden fixtures, compiling seams | Vincent / separate `agent-a` | Planned; eligible first at kickoff | Board active; docs checkpoint SHA and exclusive application scope recorded | [F0](tasks/F0.md) |
| F1A | Validated real API and browser transport | Vincent / `agent-a` | Blocked | F0 verified; exact common F0 SHA + frozen `curb-v0` | [F1A](tasks/F1A.md) |
| F1B | Correct relationships, counts, evidence lookup and fixtures | Oliver / `agent-b` | Blocked | B account/access; F0 verified; same F0 SHA + frozen `curb-v0` | [F1B](tasks/F1B.md) |
| F1C | Usable map/list/evidence screen and all load states | Landau / `agent-c` | Blocked | C account/access; F0 verified; same F0 SHA + frozen `curb-v0` | [F1C](tasks/F1C.md) |
| F2 | Integrated foundation with repeatable browser walkthrough | Vincent / separate A integration agent | Blocked | F1B, F1A, F1C reviewed; stopped writers; actual integration candidate SHA | [F2](tasks/F2.md) |

States follow the kit: Planned → Ready → Running → Review → Queued → Merged → Verified; Blocked records a precise dependency. Queued means reviewed and ready for the recorded integration action. No state implies push, merge, deployment or successful checks. Rejected/stopped attempts remain in the message history and get a new attempt ID.

Dispatch records contain: task/attempt ID, owner/login, session, full base SHA, contract version, branch/checkout, literal scopes, checks, non-goals, timebox and remote action authority. Running requires the owner's acknowledgement. Scope persists through a blocker until a stop/release is confirmed.

F1 uses one common F0 SHA. The integration candidate advances sequentially B → A → C. F2 verifies the resulting commit; later tasks use that newly verified SHA.

R1–R5 and all sponsor additions are **deferred choices**, not Ready tasks. After F2, Vincent selects one next outcome. No application tests, multi-machine check, remote board or deployment have run during this documentation setup.
