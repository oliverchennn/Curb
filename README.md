# Curb

Accessibility repair planning for campus facilities: connect barrier evidence to the trips a repair could restore.

**Continuing the project:** [Current Oliver orchestration handoff](docs/message-board/OLIVER_R2_HANDOFF.md) · [R2 core evidence](docs/message-board/R2_CORE_CHECKPOINT.md) · [live team board](https://github.com/vzhu08/Curb/issues/1).

R1 is verified: choose a trip and compare one hypothetical repair at `/curb/trips`. The real local API returns directed shortest routes or distinct blocked, unknown and disconnected explanations. The original `/curb` barrier review, schematic and linked evidence remain available.

## Run locally

Use Node.js 22.23.0 or newer (cloud checks used Node 24.22.1 / npm 11.9.0). No credentials or environment file are needed.

```powershell
npm ci
npm run check
npm run dev
```

Open `http://127.0.0.1:3000/curb` and follow **Plan a trip and compare one repair**, or open `/curb/trips` directly. Keep the default Welcome court → Library trip, select **Add library ramp**, then **Compare trip**: the blocked baseline becomes a hypothetical 60 m route. Cafe stays reachable, Studio needs unknown assessments, Archive is disconnected, and either single Service repair leaves another blocker. Reset clears the simulation.

`check` runs TypeScript, Vitest and the production Next.js build. Verified application commit: `03d89572c207b88bc02d80c6f3a745aad1895391` (258 tests, build, 160 independent API comparisons and production-browser checks). See the [frozen contracts](docs/CONTRACTS.md), [acceptance evidence](docs/ACCEPTANCE.md), [R1 card](docs/tasks/R1.md) and [takeover audit](docs/message-board/CLOUD_TAKEOVER.md). These are explicitly synthetic planning examples, not a deployment, field survey, navigation tool or compliance determination.

Live team board: [Curb coordination](https://github.com/vzhu08/Curb/issues/1). Vincent has designated Oliver as successor orchestrator and stopped this local coordinator/checker. Read the final handoff/release and actual successor ACK. R2 core is verified at `64f004c5e0ea7062d29165d8dfc5acfde7fa04b2` (469 tests/build and independent API oracle); Landau has published/stopped R2 UI and its UX proposal; independent review and final R2 acceptance remain pending. The separate corrected replay is awaiting review and is not yet on main. R3-R5 implementation, sponsors, deployment and spending remain unassigned.

## Start the team

- **Designated Oliver coordinator:** use the existing cloud session and [START_ORCHESTRATOR.txt](START_ORCHESTRATOR.txt); do not create a duplicate coordinator.
- **Vincent's separate coding chat:** [START_DEV_A.txt](START_DEV_A.txt).
- **Separately assigned B/domain work:** [START_DEV_B.txt](START_DEV_B.txt); Oliver first safely stops his current B task before coordinator acceptance.
- **Landau, UI/demo:** [START_DEV_C.txt](START_DEV_C.txt).

These are current resume prompts. Read the handoff and live board first; do not restart F0 or reopen released scopes without an assignment. The workflow uses one coordinator, scoped coding leads and one GitHub issue; it does not start the kit's custom worker runner or wake paused chats automatically.

Read the [orchestration guide](docs/ORCHESTRATION.md), [task board](docs/TASK_BOARD.md), [ownership](docs/OWNERSHIP.md), and [adapted implementation plan](docs/IMPLEMENTATION_PLAN.md). The [docs index](docs/README.md) lists the full package.

Kit documentation and selected `web` + `maps` application files come from [`oliverchennn/hackathon-kit` at `22a5f44`](https://github.com/oliverchennn/hackathon-kit/tree/22a5f44a27375e88ac2cd1754f6976704f725bc5). See [provenance and adaptation notes](docs/KIT_IMPORT.md). The optional managed orchestration runtime is not installed.
