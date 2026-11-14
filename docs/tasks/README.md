# Foundation task cards

Dispatch [F0](F0.md) first. After its real verified SHA and `curb-v0` exist, dispatch [F1A](F1A.md), [F1B](F1B.md) and [F1C](F1C.md) in parallel with the same base. Then run [F2](F2.md) on the sequentially integrated candidate. Later plan slices are not task assignments.

Every assignment fills the runtime fields below in a board comment; placeholders are not executable assignments:

```text
Task / attempt / scope revision:
Human / GitHub / lead session:
Full base SHA / contract version:
Branch / absolute checkout:
Allowed literal paths / reserved paths:
Dependencies satisfied:
Acceptance / exact configured check commands:
Timebox / rollback or cut:
Remote code authority:
```

Use `codex/` branches. Children receive the same fields plus a parent task ID and the exact subset of their parent's scope. Prefer isolated child worktrees. In shared-checkout mode children do not stage/commit/change branches; parent handles Git after all children stop. A read-only reviewer does not fix files without a new writer assignment.

For every child, the lane lead records child ID, session, checkout, paths, start/status, actual checks and result SHA/patch. Children return [the handoff](../HANDOFF.md) to their parent. Parent inspects their combined diff and reports one reviewed lane result on the board. No grandchildren.

Shared paths prohibited in F1: root package/lock/config files; `.github/`; `.codex/`; `tools/agents/`; `orchestration.team.json`; `src/contracts/curb/`; `packages/`; `modules/`; `kit.project.json`; A-owned shell; coordination docs/prompts; other lanes' paths. Post a change request instead.
