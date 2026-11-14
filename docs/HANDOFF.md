# Lane result and coordinator handoff

Current completed-project package: [Vincent resumes orchestration](message-board/VINCENT_HANDOFF.md), [Oliver's cloud session continues as Dev B](message-board/DEV_B_CONTINUATION.md), and [preserved R1 verification artifacts](message-board/r1-evidence/README.md). Use the live board for the final publication SHA and Vincent's actual acceptance; this template is not itself an assignment.

Post a RESULT comment containing:

```text
Task / attempt / state:
Human / agent session:
Base SHA / result SHA / contract version:
Branch / absolute checkout:
Origin repository / remote branch:
Verified remote SHA / last successful sync time:
Uncommitted or unpushed paths / sync blocker (or none):
Changed files:
Delivered behavior:
Checks: exact command, exit/result, timestamp, tested SHA
Manual walkthrough and observed result:
Children: IDs, scopes, result SHAs or patches, all stopped?
Contract/dependency/env changes: names only, no secrets
Limits and unverified behavior:
Requested change from another lane:
Push / PR / integration status and links:
Next action / recommended cut:
```

Before Review or handoff, follow [GIT_SYNC](GIT_SYNC.md): push the scoped result and verify that the remote branch resolves to the intended local SHA. A local-only result stays blocked from Review. Read-only work reports no code to publish. Routine assigned-branch pushes are already authorized by Vincent.

On BLOCKED include the attempted fixes and precise help needed. Do not imply that a successful build proves the browser flow, or that a local endpoint proves a deployed provider path.

Coordinator handoff adds the board URL/cursor, roster, active scope revisions, pending decisions with reasons, integration queue, known-good SHA, actual remaining deadline and the designated successor. Keep unpublished work and private input separate from shared context. Resume by inspecting the current repo and live board, not by trusting this template as a record.
