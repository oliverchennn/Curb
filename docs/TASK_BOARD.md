# Foundation task board — snapshot

Live board: [Curb team board #1](https://github.com/vzhu08/Curb/issues/1), created and read back at kickoff. This file is a snapshot, not a distributed lock. Current sessions and exact reservations: [kickoff checkpoint](message-board/KICKOFF.md). Last recorded cursor: `6871779642` (sync policy); read newer comments before claiming work.

Repository: `vzhu08/Curb`. Inspected initial HEAD: `95732cca8eaef9bb41a4c7311c9442cf3dd9b1e6` (README-only initial commit). This is **not** the future documentation checkpoint or verified F0 base. Resolve actual SHAs at dispatch; never substitute this initial SHA for a missing build checkpoint.

Shared setup SHA: `eee48e553de92072b4cb53148f9fd12c957514f0`, pushed to `main`. Kickoff changes use `codex/coordination-kickoff`; F0's dispatch records the full current documentation SHA. No F0 result exists yet. All new/started worker chats and coding children use `gpt-6.1-sol` with `xhigh` reasoning per Vincent; Astra is reserved for the coordinator.

| ID | Visible result | Human / agent | State | Dependency and base gate | Card |
|---|---|---|---|---|---|
| F0 | Reproducible web+maps skeleton, v0 schemas, golden fixtures, compiling seams | Vincent / separate `agent-a` | Ready; creation/start authorized, awaiting lead ACK | Board active; exact docs base and isolated checkout; inventory approval before adoption | [F0](tasks/F0.md) |
| F1A | Validated real API and browser transport | Vincent / `agent-a` | Blocked | F0 verified; exact common F0 SHA + frozen `curb-v0` | [F1A](tasks/F1A.md) |
| F1B | Correct relationships, counts, evidence lookup and fixtures | Vincent / `agent-b-temp`, covering unavailable Oliver | Blocked; B-READY is read-only | F0 verified; same F0 SHA + frozen `curb-v0`; explicit scope ACK | [F1B](tasks/F1B.md) |
| F1C | Usable map/list/evidence screen and all load states | Landau (`landautzou`) / `agent-c` | Blocked | Accepted write access verified; session ACK pending; F0 verified + frozen `curb-v0` | [F1C](tasks/F1C.md) |
| F2 | Integrated foundation with repeatable browser walkthrough | Vincent / separate A integration agent | Blocked | F1B, F1A, F1C reviewed; stopped writers; actual integration candidate SHA | [F2](tasks/F2.md) |

States follow the kit: Planned → Ready → Running → Review → Queued → Merged → Verified; Blocked records a precise dependency. Queued means reviewed and ready for the recorded integration action. No state implies push, merge, deployment or successful checks. Rejected/stopped attempts remain in the message history and get a new attempt ID.

Dispatch records contain: task/attempt ID, owner/login, session, full base SHA, contract version, branch/checkout, literal scopes, checks, non-goals, timebox and remote action authority. Running requires the owner's acknowledgement. Scope persists through a blocker until a stop/release is confirmed.

F1 uses one common F0 SHA. The integration candidate advances sequentially B → A → C. F2 verifies the resulting commit; later tasks use that newly verified SHA.

R1–R5 and all sponsor additions are **deferred choices**, not Ready tasks. After F2, Vincent selects one next outcome. The remote board is verified live; no application tests, multi-machine check or deployment have run yet. Routine scoped commits/pushes to assigned `codex/*` branches are authorized and expected; report verified remote SHA. Main integration, PR and release gates remain.
