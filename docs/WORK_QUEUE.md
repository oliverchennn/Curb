# Rolling work queue

Vincent has transferred orchestration to Oliver; [current handoff](message-board/OLIVER_R2_HANDOFF.md). Local checker deleted. Outgoing coordinator makes no new dispatch after handoff preparation; Oliver has safely stopped the scout map and ACKs after outgoing release. All current A/B/C tasks have now published STOPPED/RELEASED results.

Vincent explicitly requested continuous useful queues on 2026-11-14, including helping a slower lane and preparing the next checkpoint. [Authority](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876402752). This queue complements the live board; it does not replace exact assignments, frozen interfaces or ownership ACKs.

Maintain a current task, one independently ready fallback, and the next dependency-gated task for each lead. Refill the ready slot when it is claimed. Prioritize active-slice blockers and review, then disjoint support for another lane, then checkpoint preparation. Do not add unnecessary code, repeat completed checks or expand product scope just to stay busy.

| Lead | Current / immediate work | Ready fallback | Dependency-gated priority |
|---|---|---|---|
| Existing A, Sol/xhigh | Boundary proposal and replay correction published/stopped, awaiting review | Successor assigns useful exact review/integration work after acceptance | R2 final integration/browser verification after reviewed C source and new ACK |
| Actual Oliver B | Scout map published/stopped; coordinator ACK pending outgoing release | Accept designated orchestration after outgoing final release | Independent replay/C review, own map independent review, integration and queue maintenance |
| Landau C | R2-C and UX proposal published/stopped; review pending | Successor assigns exact evidenced fixes or rehearsal | Rehearse reviewed integrated demo after appropriate assignment |
| Existing survey replay writer | SURVEY-REPLAY/1 stopped/released; candidate under review, exact model unverified | REPLAY-REUSE-PREP/1 ready after its published release and new ACK | Correct reviewed replay defects after exact assignment and model confirmation |

The two read-only reviews and five independent preparation items are defined in [READINESS_QUEUE](tasks/READINESS_QUEUE.md). Their exact bases and branch assignments are published on the board. They are review/documentation/readiness tasks, not permission to implement R3 or change the current R2 path. All developer documentation paths are explicitly transferred for those tasks; coordinator does not write them concurrently.

## Advancing without idle handoffs

1. Publish the current safe result/checkpoint to the assigned branch, verify the actual remote SHA, and record all writer/child stop status. Finish its RESULT/STOP/RELEASE before beginning a separate queued task.
2. Read the live board. Prefer a newly ready critical-path review/fix over a fallback. Use only an explicitly assigned READY item with an exact base and literal paths; an unassigned idea or blocked slot is not permission.
3. Inspect status/origin, fetch, and use a clean isolated task checkout from the assigned full SHA. Preserve previous work. Post task/attempt/session/model/base/branch/checkout/scope ACK before writes.
4. Start the assigned item without asking Vincent or coordinator again. Report any conflicting owner, changed prerequisite or missing source instead of guessing. Maintain remote checkpoints and one reviewed lane result.
5. Coordinator reviews results, promotes blocked items when their exact sources exist, and replenishes the ready fallback at each meaningful checkpoint. The checker acts on new information without posting empty progress messages.

Cross-lane assistance uses disjoint new paths or an explicit stop/release/reassignment/ACK transfer. It never takes files from an active writer based on speed, silence or an ETA. No new local B/C agent is created; local implementation agents remain A only. No autonomous runtime or extra recurring automation is installed.

B completed and released the domain review in [6876565135](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876565135), with four independently reproduced replay boundary defects. Its [field-prep ACK 6876575682](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876575682) advances the existing queue at the pinned preparation base. A also completed and released the browser/server review in [6876599465](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876599465). Both reviews are accepted as evidence; the candidate needs corrections. [REPLAY-CORRECTION/1](tasks/REPLAY_CORRECTION.md) assigns eight literal files to existing A, after safely stopping/deferring boundary prep and a new exact ACK. No replay or R2-C integration is implied.

The field packet is integrated at `2d56e6a0a2ca4e70fd2977009d572e983182fb4c`, including two corrected outer endpoint ramp identities. The stopped R2 brief `93d5e2509febd63fd718b92ad04909d0d99a8f2d` was checked against the archived core evidence. [Scout-map assignment 6876823930](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876823930) replenishes B's ready work with a static geographic reference for the existing 18-stop packet. It uses that separate corrected-field base; the five original preparation bases remain unchanged. No entrance coordinate, passability or navigation claim is inferred.
