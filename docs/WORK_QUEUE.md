# Rolling work queue

Vincent explicitly requested continuous useful queues on 2026-11-14, including helping a slower lane and preparing the next checkpoint. [Authority](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876402752). This queue complements the live board; it does not replace exact assignments, frozen interfaces or ownership ACKs.

Maintain a current task, one independently ready fallback, and the next dependency-gated task for each lead. Refill the ready slot when it is claimed. Prioritize active-slice blockers and review, then disjoint support for another lane, then checkpoint preparation. Do not add unnecessary code, repeat completed checks or expand product scope just to stay busy.

| Lead | Current / immediate work | Ready fallback | Dependency-gated priority |
|---|---|---|---|
| Existing A, Sol/xhigh | REPLAY-UI-REVIEW/1 on the published replay candidate | R3-BOUNDARY-PREP/1 evidence boundary decision packet | R2 final integration/browser verification after reviewed C release |
| Actual Oliver B | REPLAY-DOMAIN-REVIEW/1 on the published replay candidate | PRINCETON-FIELD-PREP/1, then R2-DEMO-BRIEF/1 | Review C's domain-facing presentation when a published candidate exists |
| Landau C | R2-C/1 UI assignment, owner ACK pending | R3-EVIDENCE-UX-PREP/1 after R2-C STOP/RELEASE | Correct evidenced UI defects and rehearse the reviewed integrated demo |
| Existing survey replay writer | SURVEY-REPLAY/1; identity/files ACK received, model confirmation pending | REPLAY-REUSE-PREP/1 after replay STOP/RELEASE | Correct reviewed replay defects; no shared-engine edit without a new assignment |

The two read-only reviews and five independent preparation items are defined in [READINESS_QUEUE](tasks/READINESS_QUEUE.md). Their exact bases and branch assignments are published on the board. They are review/documentation/readiness tasks, not permission to implement R3 or change the current R2 path. All developer documentation paths are explicitly transferred for those tasks; coordinator does not write them concurrently.

## Advancing without idle handoffs

1. Publish the current safe result/checkpoint to the assigned branch, verify the actual remote SHA, and record all writer/child stop status. Finish its RESULT/STOP/RELEASE before beginning a separate queued task.
2. Read the live board. Prefer a newly ready critical-path review/fix over a fallback. Use only an explicitly assigned READY item with an exact base and literal paths; an unassigned idea or blocked slot is not permission.
3. Inspect status/origin, fetch, and use a clean isolated task checkout from the assigned full SHA. Preserve previous work. Post task/attempt/session/model/base/branch/checkout/scope ACK before writes.
4. Start the assigned item without asking Vincent or coordinator again. Report any conflicting owner, changed prerequisite or missing source instead of guessing. Maintain remote checkpoints and one reviewed lane result.
5. Coordinator reviews results, promotes blocked items when their exact sources exist, and replenishes the ready fallback at each meaningful checkpoint. The checker acts on new information without posting empty progress messages.

Cross-lane assistance uses disjoint new paths or an explicit stop/release/reassignment/ACK transfer. It never takes files from an active writer based on speed, silence or an ETA. No new local B/C agent is created; local implementation agents remain A only. No autonomous runtime or extra recurring automation is installed.
