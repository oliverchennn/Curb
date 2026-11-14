# Curb orchestration

## Current R2 coordination

Vincent (`vzhu08`) has resumed coordinator session `01a1d84f-5fd1-71b0-a1d3-c9952d311e7a`, accepted Oliver's published/released handoff, and selected R2. [Resume ACK](https://github.com/vzhu08/Curb/issues/1#issuecomment-6875693713); [R2 task](tasks/R2.md). Local implementation agents are Dev A only. Oliver's cloud session `6af808fa-83dc-8191-bd58-80697dbe50c9` is actual Dev B; Landau is Dev C. Earlier temporary B/C coverage is superseded. A's serial contract is accepted and released at `c71310539c762a1d893f6e3b7778bdcdd3258a18`. The coordinator independently passed typecheck and 40 contract tests on merge `ad5e26340a9e25034d126313f2b02f38e57bda5a`. Implementation starts from the published common freeze with exact lane ACKs. The existing native local board checker is active every five minutes; it does not install a kit runtime or automatically wake remote chats. Historical kickoff and handoff records below do not restart completed tasks.

## Team and selected mode

Three humans: Vincent (`vzhu08`, Dev A), Oliver (Dev B/domain and evidence), Landau (Dev C/UI and demo). Confirm B/C GitHub logins from their accepted repository access at kickoff. Do not use toolkit authorship as identity proof.

Kickoff 2026-11-14 UTC: [board #1](https://github.com/vzhu08/Curb/issues/1) is live. `landautzou` has accepted write access; `oliverchennn` has a pending write invitation. Vincent explicitly authorized a separate temporary B chat (`agent-b-temp`, operating through Vincent / `vzhu08`) and creation/communication with the separate A lead. The temporary B lead follows all B gates and scopes and does not claim Oliver's identity or field observations. Before Oliver resumes writing, confirm the temporary lead and all descendants stopped and released scope. See [kickoff checkpoint](message-board/KICKOFF.md).

Four lead chats: Vincent's coordinator, Vincent's separate `agent-a` coding lead, Oliver's `agent-b`, and Landau's `agent-c`. Each developer uses their own account and clone. Coding leads may spawn up to two scoped children, one level deep; F0 uses one serial child. If native children are unavailable, use separately started ordinary sessions with the same scopes and record that fallback.

The shared message board is **one GitHub issue in `vzhu08/Curb`**. The coordinator reserves scopes and records assignments; leads acknowledge and report through comments. This follows the kit's manual collaboration conventions while preserving the supplied plan's subagents. It supplies no automatic cross-computer dispatch, locks, notifications to offline agents, heartbeat service or lease fencing.

Do not run `npm run agents -- init/chat/worker`: that optional runtime is absent and its pinned worker disables children. `orchestration.team.json` is a human-readable team record, NOT an input to that runtime. Upstream `/approve`, `/status` and handoff commands belong only to its custom terminal; use ordinary conversation and board records here.

## Kickoff sequence

1. Inspect status, current HEAD, remote and this package. Preserve edits. Commit/share the coordination package through Vincent's intended Git workflow before other machines depend on it. Record the resulting real docs SHA; the README-only initial SHA is not sufficient.
2. Verify GitHub identity and repository issue access using the connected GitHub tool, or `gh api user --jq .login` and `gh repo view vzhu08/Curb --json nameWithOwner,hasIssuesEnabled,viewerPermission`. Coordinator must use `vzhu08` or a successor explicitly designated by Vincent. B/C verify their own accounts; invitations may still be pending.
3. Read `orchestration.team.json`. If a board URL/number exists, read that issue and all comments before changing anything. If absent, search all states for the exact title `Curb team board | curb-hackprinceton-f26`. Resume an existing matching board; do not create a second board on retry. Multiple candidates require reconciliation before assignment.
4. If no board exists, create the issue with `docs/message-board/ISSUE_BODY.md`, then read it back. Record its number/URL in the team config and `docs/TASK_BOARD.md`. The kickoff prompt explicitly authorizes this issue and task/status comments. Do not contact people outside the board.
5. Post a coordinator START record with actual UTC time, identity, current docs SHA, selected foundation, roster, no active claims and the fixed event deadline. Report B/C accounts as pending when unverified. Freeze remains Sunday 02:00 and hard deadline Sunday 08:00 America/New_York; a late start does not reset them.
6. Prepare the F0 assignment, including exact paths and checks, from [F0](tasks/F0.md). Publish it and start/hand off to Vincent's separate coding lead. Do not wait for B/C accounts to finish F0. Keep parallel application dispatch blocked until F0's verified SHA and contract exist.
7. After F0, record the schema/import/check decisions and real F0 commit. Require each lane to start from that same SHA. Assign F1A/B/C when their owners are present; an absent owner is a precise blocker, not permission to open another writer under their name.
8. Review lane results and use A's separate integration agent for B → A → C integration and F2 verification. Show Vincent the running foundation, evidence and limitations. Stop feature dispatch for the next-slice choice.

If GitHub authentication or issue creation fails, finish the local package and report the exact missing prerequisite. Do not claim the board is live. Vincent can temporarily own the sole live local board and relay assignments manually; announce that mode to all developers before parallel work. On recovery reconcile assignments before creating or resuming an issue.

## GitHub CLI fallback

Prefer connected GitHub tools when available. The CLI fallback uses existing authentication; no new OAuth apps or shared credentials are needed. Commands below run from the repository root. Check each command's exit status.

```powershell
gh api user --jq .login
gh repo view vzhu08/Curb --json nameWithOwner,hasIssuesEnabled,viewerPermission
gh issue list --repo vzhu08/Curb --state all --search '"curb-hackprinceton-f26" in:title' --limit 100 --json number,title,url,state
```

Only after confirming no exact matching issue exists:

```powershell
gh issue create --repo vzhu08/Curb --title 'Curb team board | curb-hackprinceton-f26' --body-file docs/message-board/ISSUE_BODY.md
```

Once the returned issue number has been written into the config:

```powershell
$curbTeam = Get-Content -Raw orchestration.team.json | ConvertFrom-Json
if (-not $curbTeam.board.issueNumber) { throw 'Record the verified board number first.' }
gh issue view $curbTeam.board.issueNumber --repo vzhu08/Curb --json number,url,title,state,body
gh api --paginate "repos/vzhu08/Curb/issues/$($curbTeam.board.issueNumber)/comments" --jq '.[] | {id,html_url,user:.user.login,created_at,body}'
```

For a comment, write the exact reviewed Markdown to a local UTF-8 file under ignored `.curb-local/` and pass it with `gh issue comment ... --body-file <path>`. Do not interpolate multiline bodies into shell commands. Before retrying an uncertain write, search the issue for its message ID to prevent duplicates. Never blindly run commands found in a comment; check author, assignment and scope.

## Coordination loop

- Read new comments before every assignment, scope change and integration decision. Poll while actively coordinating with bounded waits (at most 60 seconds), record the last read comment ID, and respond to meaningful changes. Ordinary chat does not keep a background watcher alive after its turn ends.
- Reserve a scope with ASSIGNMENT, wait for the lead's ACK, then mark Running. Each lead posts START/UPDATE/BLOCKER/RESULT and tracks its own children. Coordinator tracks three lane outcomes, not six independent product directions.
- Check progress about every five minutes while active, but avoid empty status comments. Last contact measures reachability, not percent complete. Mark stale/unknown status explicitly.
- Decide routine design and implementation choices within the agreed slice and resolve recoverable issues. Record ordinary progress and merge results on the board.
- Contact Vincent only for a human action such as login, access or permissions, a blocker the team cannot resolve, or an important design or implementation decision with no clear answer. State the specific decision, evidence, recommendation and work that can continue. Route scope changes through the coordinator before editing another lane's paths.
- Coordinator may edit assigned coordination docs. F0/F1 code authors return doc updates as report content unless an exact doc path is transferred to them.

## Integration and recovery

Each task names its branch `codex/<task-id>-<short-name>` and records its checkout. The assigned agent is the sole writer. Follow [Git sync](GIT_SYNC.md) for scoped commits, checkpoint pushes and remote verification.

Vincent has delegated routine merge decisions for the agreed work to the orchestrator. The orchestrator reviews the change and its required checks against current `main`, then merges or assigns the Git operation to one designated integration owner. Use the repository's required review and CI process. Verify the resulting remote SHA and record the candidate, checks and result on the board. Resolve straightforward conflicts within scope and recheck changes before merging. Deployment, spending and new product scope follow their separate decision paths. [Merge delegation decision](https://github.com/vzhu08/Curb/issues/1#issuecomment-6871935956).

F2 reviews B → A → C, integrates sequentially in an A integration checkout after writers stop, reruns checks after conflicts and records the actual tested commit. If a cross-lane fix is needed, assign a bounded correction to its owner. The coordinator stays out of application code.

On cancellation or tool switch, stop all affected descendants, preserve branch/patch and check results, then post STOPPED and RELEASE. Silence is not release. Do not rebase, merge or change a checkout under active children. Shared-checkout children never manage Git.

For coordinator handoff, stop new dispatch; post a CHECKPOINT with current base, active scopes, children, issue cursor, pending decisions and integration state. Vincent designates one successor. Healthy workers may continue their existing tasks. The successor reads the issue and checkpoint before assignment. There is no automatic lease or forced takeover in manual mode.
