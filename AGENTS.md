# Working on Curb

Before editing, read the [development and agent workflow](docs/development/AGENT_WORKFLOW.md), the current user request, and the [live team board](https://github.com/oliverchennn/Curb/issues/1). The [cumulative queue](docs/message-board/CRUNCH_QUEUE_2026-11-15.md) records the latest repository checkpoint; dated role prompts and team metadata are historical snapshots.

- Inspect Git status and preserve existing work. Use the assigned current base and literal file scope.
- Keep one writer per file. Obtain STOP/RELEASE before transferring an active scope; shared-checkout children do not manage Git.
- Follow [Git sync](docs/GIT_SYNC.md): publish scoped checkpoints, verify remote SHAs, and preserve history. No force pushes or blind rebases.
- Keep real footage, historical evidence and synthetic scenarios distinct. Unknown measurements, connections and costs stay unknown.
- Run meaningful checks and report the exact tested, merged and deployed sources. Local success is not production evidence.
- Keep credentials/private caches out of Git and preserve licenses and third-party notices.

Agent prompts and coordination metadata live in [docs/development/](docs/development/README.md). Application setup is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
