# Foundation task board — snapshot

Live board: [Curb team board #1](https://github.com/vzhu08/Curb/issues/1). Read newer comments before claiming work; this file is a snapshot, not a lock. Cursor: `6872753548`. [Session checkpoint](message-board/KICKOFF.md).

F0 result: `7e56583774b9723a6ce8b6c25def915c08e76217`. Integration checkpoint: `d9d2c56b86c1bf7dda6d2d0819d00d7816cc76e1`, independently passed install, typecheck, 23 tests and production build. `curb-v0` is frozen in [CONTRACTS](CONTRACTS.md). F1 assignments record one final common SHA containing the freeze; no lane may substitute a different base.

| ID | Visible result | Owner | State / gate | Card |
|---|---|---|---|---|
| F0 | Reproducible web+maps skeleton, schemas, fixtures, compiling seams | Vincent / separate agent-a | Accepted; final child stopped; scope released on acceptance board record | [F0](tasks/F0.md) |
| F1A | Validated real API and browser transport | Vincent / agent-a | Ready; explicit assignment/ACK and common base required | [F1A](tasks/F1A.md) |
| F1B | Correct relationships, counts, evidence lookup and fixtures | Vincent / agent-b-temp, covering unavailable Oliver | Ready; explicit assignment/ACK and common base required | [F1B](tasks/F1B.md) |
| F1C | Map/list/evidence screen and load states | Landau / landautzou / Claude Code | Ready; explicit assignment/ACK and common base required | [F1C](tasks/F1C.md) |
| F2 | Integrated foundation with browser walkthrough | Vincent / separate A integration agent | Blocked until reviewed F1 results and confirmed stopped writers | [F2](tasks/F2.md) |

All coordinator-created workers/children use GPT-6.1 Sol / extra-high; Landau retains his approved Claude Code exception. Astra is coordinator-only. Ordinary native children only, no custom kit worker runtime.

Dispatch records include task/attempt, owner/login, session, full base, contract, branch/checkout, literal scopes, checks, non-goals, timebox and remote authority. Running requires ACK. Silence does not release scope. Scoped commits/pushes follow [GIT_SYNC](GIT_SYNC.md), including actual remote verification and safe checkpoints about every 15 minutes.

F2 integrates B → A → C, checks the exact candidate and records browser evidence before main publication. Orchestrator owns routine reviewed merges under [standing delegation](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956). No status implies deployment or successful checks.

Stop feature dispatch after F2. Landau's sponsor proposal is recorded for Vincent's subsequent choice; R1–R5 and sponsor work remain unassigned.