# Curb — team coordination

Run: `curb-hackprinceton-f26`. Repository: `vzhu08/Curb`.

Vincent (`vzhu08`) is the sole human orchestrator and Dev A. Oliver is Dev B/domain and evidence; Landau is Dev C/UI and demo. Their GitHub logins and accepted repository access must be confirmed at kickoff.

Four lead chats: coordinator + `agent-a` + `agent-b` + `agent-c`. Coding leads use up to two scoped coding children; bootstrap stays serial. This is manual GitHub-issue coordination, not the kit's automated runner.

## Current scope

Foundation only: credential-free `/curb`, synthetic network schematic, real local API, barrier/evidence selection, derived counts, reset, and loading/empty/error states. No AI, route optimization, database, sponsor integrations or export yet.

| Task | Owner | Initial state | Gate |
|---|---|---|---|
| F0 bootstrap/contracts | Vincent / agent-a | Planned | Coordinator records docs SHA and assignment |
| F1A API/transport | Vincent / agent-a | Blocked | Verified F0 SHA and frozen v0 |
| F1B domain/data | Oliver / agent-b | Blocked | Same F0 SHA; verified account/access |
| F1C UI/evidence | Landau / agent-c | Blocked | Same F0 SHA; verified account/access |
| F2 integration | Vincent / separate A integration agent | Blocked | All F1 lanes reviewed and stopped |

No active claims, verified foundation commit, passing application checks or deployment are established by creating this issue. Latest coordinator assignments and replies below carry live state. Update this summary as checkpoints are verified.

## Rules

Read `AGENTS.md`, `docs/ORCHESTRATION.md`, `docs/MESSAGE_BOARD.md`, `docs/OWNERSHIP.md` and your `docs/tasks/` card at the shared docs commit. Include a unique Message-ID, role/session, human/login, timestamp and task/attempt in every comment. No secrets or private field notes.

Coordinator assigns → lead acknowledges → children implement disjoint scopes → lead reviews/checks → coordinator arranges sequential integration → separate A agent verifies. No reassignment until the old writer and children are confirmed stopped. Branch copies of task docs are snapshots.

After F2, stop feature dispatch and ask Vincent to choose the next slice. R1–R5 and sponsors are discussion options, not assignments.

Deadline from supplied plan: Sunday 2026-11-15 08:00 America/New_York; target submission 07:30; feature freeze 02:00. Confirm event details onsite; do not restart the event clock at kickoff.
