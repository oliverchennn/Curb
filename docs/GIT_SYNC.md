# Keeping origin current

Standing instruction from Vincent: all agents keep `origin` consistently updated. Routine scoped commits and pushes to each assigned `codex/*` branch in `vzhu08/Curb` are authorized; do not ask for permission on every push. [Live policy notice](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871779642). This policy changes synchronization, not task scope, exclusive ownership, integration/release authority or deployment.

## Before starting or resuming

1. Inspect status, branch and both fetch/push URLs. `origin` must resolve to `vzhu08/Curb` on GitHub (HTTPS or SSH). If it points elsewhere, report the mismatch; never silently push to another repo or change origin.
2. Fetch `origin`, read the current board and current agent instructions. Use `git show origin/main:AGENTS.md` and `git show origin/main:docs/GIT_SYNC.md` to inspect updated guidance without changing active working files.
3. Start from the coordinator's assigned full base SHA. Fetching new main does not authorize switching the task base or importing other lanes' changes. Never blindly pull, rebase, reset or change branches underneath active writers.
4. Record the one owner and publisher of each branch. Each lane uses a unique `codex/<task-id>-<description>` branch; shared Git metadata does not confer shared branch ownership.

Existing writers can adopt this policy from the issue immediately. Pick up file changes at a safe task boundary; do not interrupt healthy work just to refresh documentation.

## Checkpoint and push

- Commit and push after a meaningful milestone, before review/handoff/tool switch, and before deliberately stopping a session with changes.
- During active coding, aim to publish a safe checkpoint at least every 15 minutes. If a safe checkpoint is unavailable, report why and arrange the next safe pause; do not hide hours of local-only progress.
- Review the diff, stage only your assigned paths, exclude secrets/local artifacts, and run checks appropriate to the checkpoint. A checkpoint may be incomplete or have known failures if it is explicitly labeled WIP on the task branch. It must not be called ready, verified or eligible for main.
- Shared-checkout children never stage, commit, push, switch branches, merge or rebase. The parent stops/pauses all affected writers before Git operations and publishes their combined scoped checkpoint. The parent remains responsible for remote freshness.
- Isolated children may commit/push only an explicitly assigned unique child branch, after their parent verifies its scope. They report the remote commit to the parent; the parent still produces one integrated lane result.
- Push the assigned branch explicitly. Never force-push (including force-with-lease), rewrite published history, push someone else's branch, or push all branches/tags.

After a scoped checkpoint commit, the following PowerShell example publishes and verifies a task branch. Check the actual branch against the board assignment before running it:

```powershell
$curbTaskBranch = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or -not $curbTaskBranch.StartsWith('codex/')) { throw 'Expected the assigned task branch.' }
$curbLocalSha = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot read local checkpoint.' }
git push --set-upstream origin "HEAD:refs/heads/$curbTaskBranch"
if ($LASTEXITCODE -ne 0) { throw 'Push failed; preserve local work and report the blocker.' }
$curbRemoteRef = git ls-remote --exit-code origin "refs/heads/$curbTaskBranch"
if ($LASTEXITCODE -ne 0 -or -not $curbRemoteRef) { throw 'Remote verification failed.' }
$curbRemoteSha = ($curbRemoteRef -split '\s+')[0]
if ($curbRemoteSha -ne $curbLocalSha) { throw 'Remote differs from the intended checkpoint; reconcile before claiming sync.' }
```

A successful local commit is not proof of a push. A stale remote-tracking ref is not proof of remote equality. Record the actual remote read and its time.

## Reporting and integration

Every UPDATE/RESULT includes branch, local HEAD, verified remote branch SHA, last successful sync time, relevant check results and remaining uncommitted/unpushed paths. If there is no new work, say unchanged since the last verified sync; do not create empty commits. Read-only agents report that they have no code to publish.

Coordinator tracks each lane's last remote checkpoint and sync blockers. A lane cannot enter Review with a local-only result; a lost connection is a precise blocker, not an exemption from disclosure. Dependent assignments must use a commit other machines can fetch.

Only the designated integration owner updates `main` under the coordinator's recorded integration authority. Integrate reviewed, checked results serially, verify the combined SHA, push the accepted main update promptly and verify `origin/main`. The coordinator publishes its own documentation checkpoints to its owned branch and arranges their integration; no routine work should remain only on a laptop.

If main moved during verification, fetch and reconcile in the integration checkout, then rerun affected checks before pushing. Never replace the newer main or advance main to an unverified candidate. F0/F1/F2 gates and Vincent's release decisions still apply.

## Failures and limits

For authentication/network/push rejection, retain the local commit and post the failed command, concise error, local SHA, last known remote SHA, affected task and safe next action. Retry transient failures boundedly. For non-fast-forward, inspect the remote changes and ownership; coordinate reconciliation instead of force-pushing or blindly rebasing.

Keep a shared-checkout child's Git restriction even when a checkpoint is overdue. Never revoke a healthy writer just because its lead lost contact. Stop/release rules remain in force.

This is a required agent workflow with observable evidence. It is not an installed background sync service or a guarantee that offline agents have read the notice. Coordinator requests acknowledgements from active leads and relays the rule to new sessions.
