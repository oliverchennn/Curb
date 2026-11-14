# Curb

Accessibility repair planning for campus facilities: connect barrier evidence to the trips a repair could restore.

The foundation is verified: a real local API serves synthetic campus data, and `/curb` shows the schematic, barrier list, linked evidence, keyboard selection and reset. Loading, empty and error states are checked. Routing and repair comparisons await the next slice.

## Run locally

Use Node.js 22.23.0 or newer (checked on Node 24.12.0 / npm 11.6.2). No credentials or environment file are needed.

```powershell
npm ci
npm run check
npm run dev
```

Open `http://127.0.0.1:3000/curb`. `check` runs TypeScript, Vitest and the production Next.js build. See the [frozen contract](docs/CONTRACTS.md) and [acceptance evidence](docs/ACCEPTANCE.md).

Verified application commit: `fc12e86c85394ab8126db1be485aaf0e7845c087` (53 tests, build and Chrome walkthrough). This uses synthetic examples and a credential-free schematic. It is not a deployment, field survey, navigation tool or compliance determination. Foundation work is complete; new feature work waits for Vincent's next-slice choice on the live board.

Live team board: [Curb foundation coordination](https://github.com/vzhu08/Curb/issues/1). See the [kickoff checkpoint](docs/message-board/KICKOFF.md) for the current roster and handoffs. Vincent authorized a temporary B lead under `vzhu08` while Oliver is unavailable; Landau's accepted account is `landautzou`.

## Start the team

- **Vincent / `vzhu08`:** open a new coordinator chat in this repo and paste [START_ORCHESTRATOR.txt](START_ORCHESTRATOR.txt).
- **Vincent's separate coding chat:** [START_DEV_A.txt](START_DEV_A.txt).
- **Oliver, domain/evidence:** [START_DEV_B.txt](START_DEV_B.txt).
- **Landau, UI/demo:** [START_DEV_C.txt](START_DEV_C.txt).

There are three humans and four lead chats: one coordinator plus one coding lead per human. Confirm Oliver's and Landau's GitHub accounts/access before their assignments. The kickoff prompt opens or resumes one GitHub issue in `vzhu08/Curb` as the live message board; it does not start the kit's custom worker runner.

Read the [orchestration guide](docs/ORCHESTRATION.md), [task board](docs/TASK_BOARD.md), [ownership](docs/OWNERSHIP.md), and [adapted implementation plan](docs/IMPLEMENTATION_PLAN.md). The [docs index](docs/README.md) lists the full package.

Kit documentation and selected `web` + `maps` application files come from [`oliverchennn/hackathon-kit` at `22a5f44`](https://github.com/oliverchennn/hackathon-kit/tree/22a5f44a27375e88ac2cd1754f6976704f725bc5). See [provenance and adaptation notes](docs/KIT_IMPORT.md). The optional managed orchestration runtime is not installed.
