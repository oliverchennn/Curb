# F1B — domain and fixture correctness

Owner: Oliver / `agent-b`; GitHub login confirmed at kickoff. State: Blocked on F0 and account readiness. Base: the same verified F0 SHA as A/C. Contract: frozen `curb-v0`. Branch: `codex/f1b-domain`. Timebox: 60–90 minutes.

Allowed: `src/domain/curb/`, `src/data/curb/`. Forbidden: shared paths in [task rules](README.md), APIs/UI, package installs that change tracked files and shared schemas. Read AGENTS, contracts, golden fixtures and F0 report.

| Child | Scope | Acceptance |
|---|---|---|
| B1 domain | `src/domain/curb/` | Validate relationships; derive counts; get barrier with referenced evidence or null; no React, Node I/O or provider dependencies |
| B2 examples | `src/data/curb/` | Deterministic sample/empty/invalid-reference cases and data-focused tests; preserve frozen golden IDs/meaning unless coordinated |

Test duplicate IDs, dangling endpoints/destination/evidence, barrier-edge inconsistency, invalid coordinates, positive lengths and empty input. Counts match arrays. Invalid data fails explicitly. No routing, repair costs, optimizer or legal engine. Synthetic origin is obvious; real survey material is a later separately scoped task.

Checks: `domain`, `data`, `types` from [acceptance](../ACCEPTANCE.md), with F0's exact commands. Parent reviews all children and posts one RESULT with fixture inventory, passing/failing checks, commit and limits. Cut: keep one sample and small focused invalid cases; no elaborate fixture generator. A schema issue becomes a change request to A, not a drive-by edit.
