# Active coordination checkpoint

Board: https://github.com/vzhu08/Curb/issues/1. Coordinator: `01a1d84f-5fd1-71b0-a1d3-c9952d311e7a`, `codex/coordination-kickoff`, `C:\Users\vzhu0\PycharmProjects\Curb`. Snapshot cursor `6872753548`; live comments take precedence.

F0 result `7e56583774b9723a6ce8b6c25def915c08e76217` is reviewed. Its single native child stopped before Git publication; no grandchildren. Integration commit `d9d2c56b86c1bf7dda6d2d0819d00d7816cc76e1` independently passes install, typecheck, 23 tests and production build. [Frozen imports/fixtures](../CONTRACTS.md), [checks](../ACCEPTANCE.md), [import provenance](../KIT_IMPORT.md). Final F1 assignments will record the same published common SHA containing these docs.

## People and ownership

- A: Vincent / `vzhu08`, authenticated admin. Lead `01a1d85a-6afa-7a03-a025-d095dfbb6e1b`. F0 branch `codex/f0-bootstrap`, checkout `C:\Users\vzhu0\.codex\worktrees\curb-f0-bootstrap\Curb`, original base `aed56a3935408ed139a13e56fe42a589368e1e19`. F0 stopped; next task F1A in its separately ACKed checkout.
- Temporary B: Vincent / `vzhu08`, lead `01a1d853-781e-7ce1-9082-ac04a68d3782`; next F1B after assignment. Oliver's verified login is `oliverchennn`, invitation pending and currently unavailable. Any return requires temporary B and descendants to stop/release first.
- C: Landau / `landautzou`, accepted write access; Claude Code session `06a135c3-65bb-4de0-b273-9d48ab953221`, checkout `C:\Users\Landau\Desktop\CS_PROJECTS\Curb`. Ready for F1C; ACK establishes new branch/checkout. Cross-computer dispatch is the manual board, not automatic execution.
- Setup support `01a1d840-149d-73f3-822d-832a4aa4bd87`: stopped/released. Git sync and merge policy integrated; obsolete remote policy branches removed after ancestry verification.

All coordinator-created workers and children use `gpt-6.1-sol` / `xhigh`; Astra only coordinator. Landau's independent Claude Code session is explicitly permitted. F1 leads may use two exclusive coding children, one level deep, no grandchildren. Prefer separate worktrees; shared-checkout children never manage Git and must stop before parent Git operations.

Coordinator reserved documentation only: `README.md`, `orchestration.team.json`, `docs/CONTRACTS.md`, `docs/ACCEPTANCE.md`, `docs/TASK_BOARD.md`, `docs/DECISIONS.md`, `docs/KIT_IMPORT.md`, `docs/message-board/KICKOFF.md`, from pre-F0 main `94ab899731674be2883bfcaa13b762bca0253aa3`. The coordinator does not write application code.

## Next actions and authority

Publish the checked F0/freeze checkpoint, record exact common SHA, then assign/communicate F1A/B/C with literal disjoint paths. Review lane diffs and remote results, confirm writers stopped, assign separate A integration work B → A → C, run F2 full checks and real-browser walkthrough. Stop feature dispatch after F2 for Vincent's choice. Landau's sponsor proposal is deferred to that choice.

Vincent authorized scoped board comments, creation/communication with A and temporary B, routine task-branch commits/pushes and orchestrator decisions on reviewed main merges. [Git sync policy](../GIT_SYNC.md) requires verified remote SHAs and safe milestone/15-minute checkpoints. No force-pushing, deployment, new product scope or spending authority follows from this.

Fixed event times: feature freeze 2026-11-15 02:00, target submission 07:30, hard deadline 08:00 America/New_York. Supplied event source remains unverified independently. No background polling is promised after this chat stops.