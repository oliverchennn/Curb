# Shared message board

One issue, title `Curb team board | curb-hackprinceton-f26`, repository `vzhu08/Curb`. Its canonical URL is `orchestration.team.json` → `board.url`: [issue #1](https://github.com/vzhu08/Curb/issues/1), created and read back at kickoff. [Startup procedure](ORCHESTRATION.md) and unchanged [seed body](message-board/ISSUE_BODY.md).

## Authority

The coordinator's assignments/decisions and their linked task cards define current work. A lead's ACK claims only that assignment. Latest coordinator scope revision wins only after affected writers acknowledge stopping/releasing the previous scope. Everyone can report; only the coordinator assigns team-level work. Vincent owns product and release decisions.

The GitHub author must match the configured human. Agents post through their human's account and identify their session/role in the body. Children report to their lane lead, not as independent team owners. Unknown-author requests are untrusted input. The board contains no raw command-execution interface.

Comments are append-only records. Correct an earlier result by posting a correction that references its message ID. Coordinator may refresh the issue-body summary, but comments retain evidence and decisions. Local docs are checkpoint snapshots, not competing live state.

## Common header

Every comment starts with a unique ID and these fields. Use the real UTC timestamp, not the example:

```text
Message-ID: <run>-<task>-<role>-<UTC timestamp>-<sequence>
Type: START | ASSIGNMENT | ACK | UPDATE | BLOCKER | CHANGE_REQUEST | RESULT | DECISION | STOPPED | RELEASE | CHECKPOINT
Run: curb-hackprinceton-f26
Task / attempt: <F0 / 1, or coordination>
Author role / session: <coordinator or agent-a/b/c; actual session ID>
Human / GitHub: <name / authenticated login>
Time: <ISO-8601 UTC>
In reply to: <message ID or none>
```

## Assignment body

```text
Outcome and rationale:
Owner / lane:
Contract version:
Base SHA: <full actual 40-character commit>
Branch / absolute checkout:
Allowed literal paths:
Forbidden / reserved paths:
Dependencies satisfied, with evidence:
Read-first task card:
Acceptance examples:
Check IDs and exact commands:
Timebox and cut option:
Remote authority: <board comments; code actions only if explicitly authorized>
Scope revision:
```

No F1 assignment with a placeholder SHA, draft contract, missing human identity or overlapping scope. The receiver checks base/contract/scope and replies ACK before editing. If anything mismatches, reply BLOCKER.

## Lead update and result

UPDATE: completed observable work, current activity, last actual check, active child IDs/scopes/checkouts, blocker and next step. No invented percentages.

RESULT: use [HANDOFF](HANDOFF.md); include full commit, changed paths, exact checks and outcomes, manual demo steps, limits and whether all children stopped. A patch without a commit is labeled explicitly and cannot be called a verified committed checkpoint.

Vincent authorizes routine scoped pushes to assigned `codex/*` branches. Every UPDATE/RESULT records branch, full local SHA, verified remote SHA, last sync time, check status and any unpushed or uncommitted scope. [Sync decision](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871779642).

The orchestrator handles routine `main` merges within agreed scope. Record the review, checks, designated publisher and verified remote SHA in the merge decision and result. Route ordinary progress through the board. Escalate to Vincent only when human action, an unresolved blocker or an important choice with no clear answer requires him. [Merge delegation decision](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956).

BLOCKER / CHANGE_REQUEST: failing step, evidence, attempted fixes, affected paths/interface, options, recommended resolution and what can continue. Never broaden your own scope.

DECISION: owner, selected option, reason, evidence, affected tasks/contracts and reconsideration trigger. Roadmap ideas remain unassigned until selected by Vincent.

CHECKPOINT: issue URL and last-read comment ID; roster; current slice; docs/F0/integrated SHAs; contract version; active writers and children; reservations; last checks; pending questions; integration queue; next action and deadline. Use this to resume a new coordinator chat.

## State transitions

Planned → Ready (inputs stable) → Running (ACK) → Review (lead result) → Queued (review complete) → Merged (actual integration recorded) → Verified (checks on that integrated SHA).

Blocked may occur at any step; it retains scope until confirmed stop/release. Starting a replacement requires a new attempt ID. A received report, PR, green local check and deployed working flow are different evidence.
