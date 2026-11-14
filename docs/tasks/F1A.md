# F1A — API and browser transport

Owner: Vincent (`vzhu08`) / separate `agent-a`. State: Blocked on F0. Base: the verified common F0 SHA, filled at dispatch. Contract: frozen `curb-v0`. Branch: `codex/f1a-api`. Timebox: 60–90 minutes. Remote authority: recorded in assignment, never inferred.

Allowed: `app/api/curb/`, `src/server/curb/`, `src/client/curb/`, `tests/integration/server/`, `tests/integration/client/`. Forbidden: shared paths listed in [task rules](README.md), B/C files and unassigned test folders. Read AGENTS, contracts, golden fixture and F0 report.

| Child | Scope | Acceptance |
|---|---|---|
| A1 server/API | `app/api/curb/`, `src/server/curb/`, `tests/integration/server/` | GET sample/empty calls B's frozen pure interface; validates inputs/output; unknown dataset 404; invalid internal data explicit 500; no hidden fallback |
| A2 transport | `src/client/curb/`, `tests/integration/client/` | Typed fetch adapter validates envelope, propagates AbortSignal and handles HTTP/schema errors visibly; no stale response wins |

Use F0 stubs/interfaces while B implements. Do not copy B's domain logic into server code. Data is immutable; no database/global mutable sessions. No AI/providers/export or future endpoint scaffolding.

Checks: `api`, `transport`, `types` from [acceptance](../ACCEPTANCE.md), using commands frozen by F0. Test success, empty, not-found, malformed response and cancellation. Parent reviews children, integrates into lane branch and posts one RESULT with request/output evidence and actual checks. Cut: retain one endpoint and one transport; remove optional abstraction, never validation/errors. Rollback: retain branch, request a small owner-scoped correction.
