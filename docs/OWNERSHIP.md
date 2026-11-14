# Ownership

Vincent (`vzhu08`) is the human lead, Dev A and contract steward. The orchestrator owns routine merge decisions and may designate one integration agent to execute each merge. Oliver owns Dev B domain and evidence. Landau owns Dev C UI and demo. Verify each developer's GitHub account and access before dispatch.

The live issue's coordinator assignments reserve task scopes. Before kickoff, no application writer is active. `TASK_BOARD.md` is a snapshot. A lane steward may not edit files delegated to a child.

Current return handoff: Vincent is designated coordinator (resumed session/ACK pending); Oliver's current cloud session is Dev B ready/unassigned. All historical temporary B and R1 cloud leads/children stopped/released. The outgoing coordinator retains only the bounded documentation/package publication task, then hands coordination to Vincent. No application scope is active. See [Vincent's handoff](message-board/VINCENT_HANDOFF.md) and [B continuation](message-board/DEV_B_CONTINUATION.md); the kickoff exception below is historical and does not reserve today's B files.

Kickoff exception authorized by Vincent: B is temporarily covered by `agent-b-temp`, session `01a1d853-781e-7ce1-9082-ac04a68d3782`, under Vincent / `vzhu08`. B-READY is read-only with no file ownership; F1B still requires the verified F0 base and an explicit assignment. Oliver's return does not automatically release that agent's future scopes. `landautzou` is Landau's accepted write collaborator account. Current sessions and precise reservations are in the [live board](https://github.com/vzhu08/Curb/issues/1) and [kickoff checkpoint](message-board/KICKOFF.md).

| Scope | Accountable lane / current policy |
|---|---|
| `AGENTS.md`, `CLAUDE.md`, `README.md`, `START_ORCHESTRATOR.txt`, `START_DEV_A.txt`, `START_DEV_B.txt`, `START_DEV_C.txt`, `orchestration.team.json` | Coordinator; README setup section may be transferred serially to F0 |
| `docs/README.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/ORCHESTRATION.md`, `docs/MESSAGE_BOARD.md`, `docs/OWNERSHIP.md`, `docs/TASK_BOARD.md`, `docs/DECISIONS.md`, `docs/HANDOFF.md`, `docs/ACCEPTANCE.md`, `docs/CONTRACTS.md`, `docs/KIT_IMPORT.md`, `docs/KIT_IMPORT_MANIFEST.json`, `docs/SPONSOR_OPTIONS.md`, `docs/tasks/`, `docs/message-board/` | Coordinator documentation; F0 proposes contract/check changes in its report, coordinator records them |
| `docs/source/`, `docs/vendor/` | Preserved references; import steward only |
| `package.json`, `package-lock.json`, root application config files, `.env.example`, `.env.kit.example`, `.gitignore`, root license/notices | A serial bootstrap/maintenance task; enumerate actual config files before work |
| `.github/`, `.codex/`, `tools/agents/`, `orchestration.json`, `orchestration.install.json` | A maintenance only; managed runner paths are reserved, not present or authorized to install |
| `src/contracts/curb/`, `packages/`, `modules/`, `kit.project.json` | A bootstrap/contract/import steward; frozen after F0 |
| `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/error.tsx`, `app/not-found.tsx`, generated `app/kit/` | A shell/bootstrap task |
| `app/api/curb/`, `src/server/curb/`, `src/client/curb/` | A implementation lane |
| `tests/integration/`, `tests/e2e/` | A verification lane; narrower A1/A2 children below |
| `src/domain/curb/`, `src/data/curb/`, `docs/research/` | B; research folder requires a separate assignment from F1B code scope |
| `app/curb/`, `src/features/curb/`, `public/curb/`, `docs/demo/` | C; demo folder requires a separate assignment from F1C code scope |

F0 is the sole application writer and can establish all foundation paths listed in its card. F0 releases them before F1. Its exact generated-file inventory is recorded before copying. No parent may claim broad paths concurrently with the children below.

| Child | Exclusive scope once F1 is dispatched |
|---|---|
| A1 | `app/api/curb/`, `src/server/curb/`, `tests/integration/server/` |
| A2 | `src/client/curb/`, `tests/integration/client/` |
| B1 | `src/domain/curb/` |
| B2 | `src/data/curb/` |
| C1 | `app/curb/`, `src/features/curb/screen/`, `src/features/curb/map/` |
| C2 | `src/features/curb/evidence/`, `public/curb/` |

No shared barrel/index file across C1/C2. C1 imports C2's `EvidencePanel` directly. Each child owns its colocated styles/tests. Shared-file requests specify path, change, interface impact and affected consumers; coordinator pauses affected writers and assigns A a bounded maintenance task.

Port plan: A 3000, B 3001, C 3002 on any shared host; children needing servers choose distinct free ports and report them. Worktrees do not isolate ports or credentials. No database resources are needed in foundation.
