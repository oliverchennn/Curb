# R2: two-minute repair comparison

**Proposed presenter script; no browser rehearsal performed for this brief.** Prepared for `R2-DEMO-BRIEF/1` at base `c952d7de0328bb31ba5f677b9800684b2c6366b8`. The [accepted core checkpoint](../message-board/R2_CORE_CHECKPOINT.md) verifies domain/API outputs at `64f004c5e0ea7062d29165d8dfc5acfde7fa04b2`. At [coordinator checkpoint 6876661919](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876661919), Landau's `/curb/plans` UI and final browser gate were still pending. This brief does not establish UI controls, labels, accessibility or deployment.

Use the reviewed R2 UI only after its published acceptance. Until then, present this as an explanation of the recorded core result, with the table below and the archived JSON available. The separate survey replay demonstrates different behavior and is not a substitute for R2 acceptance.

## Setup and two-minute narration

Scenario: **Synthetic campus repair comparison** (`synthetic-campus-repair-plans`, revision 1). Origin: **Arrival court**. Profile: **Authored step-free demo** (`step-free-demo`). Start with the shared **400 USD-cent** budget; all six destinations have weight one. These tiny costs are authored comparison inputs, not real repair estimates. Exact button names and evidence-panel actions must be mapped to the actual accepted UI during a later rehearsal.

| Time | Proposed display cue | Say |
|---|---|---|
| 0:00–0:18 | Scenario assumptions and unchanged baseline | “Curb compares which repairs restore trips under the same budget. This campus and its costs are synthetic. From Arrival court, Cafe is already reachable; Library, Student center and Hall are blocked. Studio is unknown, and Archive has no connection.” |
| 0:18–0:35 | Candidate costs and condition scores | “A adds a ramp for 200 cents; B clears the next link for 200. C resurfaces Hall's approach for 400 and has the worst condition score. Both methods use the same candidates, costs and budget ceiling.” |
| 0:35–0:55 | 400-cent comparison and named destinations | “Condition-first buys C and restores Hall. The exact plan buys A and B for the same 400 cents and restores Library and Student center. That's one versus two newly reachable destinations; Cafe is not counted again.” |
| 0:55–1:15 | Singleton and omission results | “A alone restores zero. B alone restores zero. They repair consecutive links on the shared approach. Together they restore two trips. Remove either companion from that plan and both trips are blocked again. The benefit belongs to the combination.” |
| 1:15–1:35 | Source note for B, its review state, authored assessment and cost source | “Inspect B's source note: it's synthetic, and its evidence review is rejected. That review does not clear the separately authored blocker. The repair only simulates removing that blocker; it does not rewrite the evidence or turn an assumption into an observation.” |
| 1:35–1:50 | Studio exclusion and Archive status | “Studio's repair has an unknown cost, so it is excluded, not treated as free. Its route coverage also remains unknown. Archive stays disconnected. Neither is credited as restored.” |
| 1:50–2:00 | Field-validation question | “Next, can observed crossing ends, entrances and alternative routes support these decisions on a real corridor? Keep the Princeton evidence work separate until that is established.” |

Timing is a suggested allocation, not a measured rehearsal. Use the 400-cent story for the two-minute slot; the other checkpoints below are short answers or rehearsal checks.

## Budget checkpoints from recorded core evidence

All amounts are **USD cents**. “New” means newly reachable relative to the unchanged baseline; “total” includes the already-reachable Cafe. A shared ceiling does not require both plans to spend all of it.

| Budget | Condition-first selection / spend | Condition-first new destinations | Exact selection / spend | Exact new destinations | Total reachable, condition / exact |
|---|---|---|---|---|---|
| 0 | None / 0 | None (0) | None / 0 | None (0) | 1 / 1 |
| 200 | A / 200 | None (0) | None / 0 | None (0) | 1 / 1 |
| 400 | C / 400 | Hall (1) | A+B / 400 | Library, Student center (2) | 2 / 3 |
| 800 | C, A, B / 800 | Library, Student center, Hall (3) | A, B, C / 800 | Library, Student center, Hall (3) | 4 / 4 |

At 200, condition-first skips unaffordable C and buys A. The exact search gives every affordable selection zero new trips, so its minimum-spend tie rule selects the empty plan. At 800, both can afford all three eligible repairs; neither method wins on this fixture. Condition-first lists purchase order, while exact IDs are sorted. Studio remains unknown and Archive disconnected at every checkpoint.

The three known-cost candidates produce eight subsets, including the empty set; 1, 3, 5 and 8 are affordable at the four budgets respectively. “Exact” means best for this bounded set, fixed origin/profile, equal destination weights and authored assessments. It does not mean a globally optimal real-world repair program or measured people served.

At 400, the modeled route lengths are Library **40 m**, Student center **45 m** under A+B, Hall **25 m** under C, and Cafe **12 m** in every case. These are authored lengths, not field measurements. Failed/unknown/disconnected outcomes have no usable route distance; do not draw a plausible route for them.

## Evidence inspection and companion proof

The [fixture](../../src/data/curb/plan-demo.json) supplies the following records. Display them through the accepted evidence UI when available; otherwise point to the exact JSON records during an explicitly recorded-result walkthrough. No new controls are assumed here.

| Repair / display label | Cost and severity | Source/evidence record | Interpretation |
|---|---|---|---|
| `repair-a` — Add west-link ramp (A) | Assumed 200 cents; severity 3/5 | `link-a-curb` → `link-a-note`, review `accepted` | Clears the missing-ramp blocker on `link-a`; B still blocks the shared approach. |
| `repair-b` — Clear hub approach (B) | Assumed 200 cents; severity 2/5 | `link-b-crate` → `link-b-note`, review `rejected` | Clears the named crate on `link-b`; rejected evidence review does not determine passability. |
| `repair-c` — Resurface hall approach (C) | Assumed 400 cents; severity 5/5 | `hall-surface` → `hall-note`, review `pending` | Clears the separate Hall blocker; does not open the shared Library/Student center links. |
| `repair-studio` — Clear studio shortcut | Cost unknown/null; severity 4/5 | `studio-shortcut-crate` → `studio-shortcut-note`, review `pending` | Excluded for unknown cost. Even hypothetical crate removal would leave the shortcut's coverage unknown. |

All four notes have `origin: synthetic` and attribution **Curb R2 synthetic fixture authors**. The known cost sources explicitly say “Synthetic author assumption” and deny supplier quotations/field estimates. Evidence review, authored edge assessment and simulated repair are separate concepts. No source note, review or assessment is mutated by a comparison.

For the companion moment, inspect `singleRepairs` for A=0 and B=0, then `exact.withoutRepair` at budget 400. Omitting A leaves `link-a` blocking both trips; omitting B leaves `link-b` blocking both. Each omission restores zero new destinations and leaves only Cafe reachable. These counterfactuals explain the selected set; they do not imply that the pending UI has individual repair-toggle controls.

## Reset and failure fallback

- **Reset target:** fresh metadata for the same scenario/revision/profile/origin, budget 400, then a fresh comparison. Use the accepted UI's actual reset/reload flow once verified; its control name and behavior have not been rehearsed here. Confirm C→Hall versus A+B→Library/Student center, with Cafe already reachable. Source evidence must remain unchanged.
- **Changed budget:** keep the displayed result tied to its submitted budget/context. Do not narrate a previous 400-cent result as the outcome of a new input that has not completed.
- **Stale revision or failed request:** use the actual unavailable/error state, refresh metadata and retry through the implemented flow. Do not substitute a fixture success, silently retain a success as current, or reinterpret an error as an empty plan. If recovery fails, say: “The live comparison is unavailable; this is the previously verified synthetic core result,” and use the checkpoint table/archive explicitly as recorded evidence.
- **Missing UI or evidence view:** deliver the recorded-result walkthrough from this document and source JSON, without claiming a live browser demo. Do not switch to the standalone replay and imply it proves the R2 optimizer.

Before any public live rehearsal, C/coordinator must confirm the published UI result and tested commit, map these cues to real controls, verify keyboard/narrow layout and evidence/reset/error behavior, and record the actual runtime/screenshots. That work is outside this documentation task.

## Provenance and the unresolved field question

This brief was checked against the unchanged fixture and the original [R2 core evidence ZIP](../message-board/r2-core-evidence.zip), SHA-256 `e05859c145fc12d31362c5e5375a62d270fb0c8800162357fe440439c619b948`. Its manifest binds eight constituent files; `core-http-evidence.json` records `PASS` at `2026-11-14T10:53:41.799Z`, with all four budgets among 16 comparisons and the complete 400-cent result. The accepted checkpoint also records 469 tests and the build; those checks were not rerun for this documentation change. Source contract: [curb-r2](../CONTRACTS.md#r2-repair-plan-contract--curb-r2), frozen at `c71310539c762a1d893f6e3b7778bdcdd3258a18`.

The [published Princeton field packet](https://github.com/vzhu08/Curb/tree/414214b83330d318ebc5402e6f78c258142fc095/docs/research) supplies proposed observation stops, not a verified route. Read it with the [coordinator's integration correction](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876768933): two outer path endpoints also match archived ramp IDs 568004 and 478465; those are source identities, not entrance positions or added field observations. The question is whether timestamped, reviewed observations of both crossing ends, connecting sidewalks, actual entrance access and alternative routes establish a continuous connection—and whether any real repairs actually need companions. Aerial inventory, unknown entrance coordinates and assumed prices cannot answer that. Keep real corridor evidence and synthetic optimizer behavior visibly distinct until Vincent chooses a later slice and its entry criteria are met.
