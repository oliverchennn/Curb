# Development coordination

This folder holds agent instructions, saved role prompts and development metadata. Start with the [application setup guide](../DEVELOPMENT.md) to run Curb, or the [judge walkthrough](../demo/INVESTMENT_DEMO_SCRIPT.md) to present it.

| File | Purpose |
| --- | --- |
| [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) | Full workflow, ownership safeguards, evidence boundaries and earlier handoffs. Read current assignments on the live board. |
| [START_ORCHESTRATOR.txt](START_ORCHESTRATOR.txt) | Historical coordinator prompt. |
| [START_DEV_A.txt](START_DEV_A.txt) · [START_DEV_B.txt](START_DEV_B.txt) · [START_DEV_C.txt](START_DEV_C.txt) | Historical implementation-role prompts. |
| [orchestration.team.json](orchestration.team.json) | Saved human-readable team/board metadata; older task states are snapshots, not active assignments. |
| [kit.project.json](kit.project.json) | Original kit selection and upstream provenance hashes; paths inside it refer to the repository root. |

Use the [live board](https://github.com/oliverchennn/Curb/issues/1) and [cumulative queue](../message-board/CRUNCH_QUEUE_2026-11-15.md) for current work. Saved prompts do not restart completed tasks or confer ownership. No custom agent runner is installed.

The small root `AGENTS.md` and `CLAUDE.md` files remain discoverable by coding tools. Package, Next.js, TypeScript, Vitest and Vercel configuration stays at the root for the build and deployment workflow. Licenses and third-party notices remain easy to find.
