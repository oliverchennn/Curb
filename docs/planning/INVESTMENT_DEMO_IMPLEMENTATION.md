# Curb investment demo implementation plan

Prepared November 15, 2026 for Vincent and the active Curb orchestrator.

## Outcome and user decision

Build a short, interactive synthetic campus case that answers a facilities manager's question: with a fixed repair budget, which combination restores access to the most destinations, and why?

Vincent requested this plan after reviewing the Route Explorer and the available Robertson Hall video. Keep the Route Explorer in the product. Use the actual video to introduce evidence review, then demonstrate the funding decision on an explicitly authored network. The main presentation should spend its time on the budget choice, dependent repairs, and resulting connections.

The requested deliverable in this planning chat is this document and the companion orchestrator prompt. Implementation begins when the user hands that prompt to the orchestrator. The plan supplies concrete defaults for the scenario, layout, file scopes, checks, and release. The orchestrator can resolve routine details within this scope.

## Source and coordination checkpoint

| Item | Evidence at preparation |
| --- | --- |
| Canonical repository | `oliverchennn/Curb`, repository ID `1457315187` |
| Inspected production source | `9271b304e43dcef09be4f26b17e604677ce1c783`, tree `e00d315ed8b796d7584a35bd7cf033db24e0a5cb` |
| Public site | <https://curb-taupe.vercel.app> |
| Latest board record read | `6892186041`, outgoing coordinator confirmation |
| Incoming coordination | Vincent's existing coordinator `01a1dca7-e0e9-7620-af70-e2511b9c2580`, actual acceptance to verify on the board |
| Existing live checker | `01a1de18-2671-7590-b81f-e13bb62d64d9` |
| Planning checkout | `C:\Users\vzhu0\PycharmProjects\Curb`, branch `codex/r2-coordination`, HEAD `9f1b1817a114c5bf35376474b20d0ca98f3311cc` |
| Planning scope | `INVESTMENT-DEMO-PLAN/1`; current user-requested planning chat; session ID unavailable. Writes only this file and `docs/planning/INVESTMENT_DEMO_ORCHESTRATOR_PROMPT.md` |

The planning checkout contains historical coordination files. Current production source was read through GitHub. Local `git fetch origin` failed because `.git/FETCH_HEAD` was not writable in this session. The orchestrator must fetch and pin its actual implementation base before dispatch, using current canonical repository and ownership evidence. The source SHA above is a reference checkpoint, not an instruction to roll back newer main.

Oliver handed coordination back to Vincent and stopped new dispatch. PR18 survey corrections, PR17, PR22 robot CAD, and the separate Robertson inspection branch remain independent work in the handoff. This demo does not depend on those candidates. Read newer board records before assigning any overlapping file. [Coordination transfer](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892178523), [outgoing confirmation](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892186041).

## Existing implementation to reuse

The earlier conversation described `/curb/plans` as the synthetic comparison page. At the inspected production source, that route renders `RepairPriorities` for Robertson Hall. Preserve that route and add **`/curb/investment-demo`** for this case.

| Existing path | Reuse |
| --- | --- |
| `src/domain/curb/plans.ts` | `comparePlans` validates the scenario, enumerates affordable repair sets, computes destination outcomes, and returns individual and omission evaluations. |
| `src/domain/curb/trips.ts` | Existing graph evaluation and route witnesses used by `comparePlans`. |
| `src/contracts/curb/plans.ts` | `curb-r2` schemas, integer cents, fixed origin/profile, equal destination weights, identity and context validation. |
| `src/server/curb/plans.ts` | Current metadata and comparison handlers. Extend scenario selection with a small explicit allowlist. |
| `src/client/curb/fetchPlan.ts` | `fetchPlanScenario(signal, scenarioId?)` already supports an explicit ID. `fetchPlan` validates the returned request tuple. |
| `src/features/curb/plans/PlanPlanner.tsx` | Reference for cancellation, timeout, stale-result handling, budget parsing, retry, and reset. This component currently has no page import in the inspected source. |
| `src/features/curb/plans/presentation.ts` | Reuse currency formatting, budget parsing, and suitable label helpers. |
| `src/features/curb/trips/TripDiagram.tsx` | Reference for schematic geometry and highlighting actual returned route edge IDs. |
| `src/data/curb/plan-demo.json` | Preserve the original synthetic fixture and its established regression expectations. |

Keep the optimizer, its objective, and public schemas intact for this slice. The required interaction is already expressible with `baseline`, `conditionFirst`, `exact`, `singleRepairs`, and `exact.withoutRepair`. There is no need for a new optimizer, arbitrary-set API, provider, persistence service, or map dependency.

## Synthetic scenario specification

Create `src/data/curb/investment-demo.json` using `PlanScenario`.

| Field | Value |
| --- | --- |
| Scenario ID | `synthetic-campus-investment` |
| Title | `Campus investment scenario` |
| Revision | `1` |
| Data/evidence origin | `synthetic` throughout |
| Contract | `curb-r2`, schema version `1` |
| Profile | Existing `step-free-demo`, labeled as an authored step-free planning profile |
| Origin | `arrival`, label `Arrival court` |
| Ordered destinations | `library`, `student-center`, `hall`, `cafe` |
| Default budget | `1000000` cents, displayed as `$10,000` |
| Objective | Maximize newly reachable destinations from Arrival court. Each destination counts once and equally. |

Use seven nodes and six bidirectional edges. All geometry is a schematic with authored local coordinates. It does not use Princeton coordinates or imagery.

```text
Arrival -- [A] -- midpoint -- [B] -- hub --+-- Library
                                        +-- Student center

Arrival -- [C] -- Hall
Arrival -------- Cafe (already reachable)
```

Library and Student center both branch from `hub` after B. Use the exact adjacency below.

| Edge | From -> to | Authored assessment |
| --- | --- | --- |
| `link-a` | `arrival` -> `link-mid` | Blocked by `link-a-curb`; A clears this blocker |
| `link-b` | `link-mid` -> `hub` | Blocked by `link-b-surface`; B clears this blocker |
| `library-walk` | `hub` -> `library-door` | Pass |
| `student-center-walk` | `hub` -> `student-center-door` | Pass |
| `hall-link` | `arrival` -> `hall-door` | Blocked by `hall-surface`; C clears this blocker |
| `cafe-walk` | `arrival` -> `cafe-door` | Pass |

Create matching destination/node references, three barriers, three synthetic evidence notes, three repairs, and complete edge assessments. Use existing allowed barrier kinds. Include finite authored lengths to satisfy the routing contract; distance is secondary and labeled schematic if shown. The baseline reaches only Cafe.

| Repair | Label | Assumed cost | Condition score | Modeled effect |
| --- | --- | ---: | ---: | --- |
| `repair-a` | A - Add approach ramp | 500000 cents | 3/5 | Clears `link-a-curb` |
| `repair-b` | B - Repair shared path | 500000 cents | 2/5 | Clears `link-b-surface` |
| `repair-c` | C - Repair Hall approach | 1000000 cents | 5/5 | Clears `hall-surface` |

All three costs use `status: assumed`. Source text identifies a scenario-author assumption. For the exercise, each amount is the complete modeled cost of that candidate, including its allocated setup. This keeps the three alternatives comparable without introducing shared-cost logic. Condition scores are authored visual-condition rankings. All three are eligible discretionary projects under the demo objective.

B's damaged path is an authored blocking condition. Robertson's visible cracks do not establish that condition, and its photos must not be attached to B as field evidence. Give the new fixture coherent synthetic notes and review metadata; preserve the separation between evidence review and route assessment already enforced by the domain.

Display **Synthetic scenario · assumed costs and route conditions** throughout the page and its printable brief. Keep one clear assumption disclosure near the budget. Put detailed sources and model limitations behind an accessible disclosure. Say **newly reachable destinations** in headline metrics. People served, measured savings, contractor estimates, and actual repair outcomes are unmeasured.

## Required algorithm results

These are acceptance oracles for the new fixture. UI values must come from runtime comparison results.

| Budget | Condition-first selection / spend | New destinations | Best set / spend | New destinations | Affordable subsets |
| ---: | --- | ---: | --- | ---: | ---: |
| $0 | Empty / $0 | 0 | Empty / $0 | 0 | 1 |
| $4,999.99 | Empty / $0 | 0 | Empty / $0 | 0 | 1 |
| $5,000 | A / $5,000 | 0 | Empty / $0 | 0 | 3 |
| $9,999.99 | A / $5,000 | 0 | Empty / $0 | 0 | 3 |
| $10,000 | C / $10,000 | 1, Hall | A+B / $10,000 | 2, Library and Student center | 5 |
| $14,999.99 | C / $10,000 | 1, Hall | A+B / $10,000 | 2 | 5 |
| $15,000 | C then A / $15,000 | 1, Hall | A+B / $10,000 | 2 | 7 |
| $20,000 | C then A then B / $20,000 | 3 | A+B+C / $20,000 | 3 | 8 |

There are eight total subsets at every budget. Total reachable destinations equal the new count plus the already-reachable Cafe. At $10,000, individual A and B each restore zero, individual C restores Hall, and omitting either A or B from the recommendation restores zero. At $20,000, both methods reach all four destinations, with no reachability advantage.

At $5,000 the exact planner chooses the empty set because every affordable repair restores zero new destinations and lower spend breaks ties. Explain this in the UI if that budget is selected. The example's objective does not assign credit for partial progress or hazard reduction. Preserve deterministic tie-breaking by cost, repair count, then repair IDs. Describe condition-first as a simple comparator, without claiming it represents actual Princeton practice.

## User experience

The new route opens with the question **Which repairs should we fund?** It loads the new scenario by explicit ID and computes the default $10,000 comparison. Initially show the **Before repairs** map so the presenter can explain the problem. The comparison cards can appear alongside it once the request completes.

Use the existing product typography and navigation. On desktop, put the network beside the budget and comparison cards so the central decision is visible at 1366 x 768 without searching through explanations. On narrow screens, place the controls, diagram, cards, and brief in reading order. Give the four named destinations persistent text labels. A/B/C labels identify repair controls, not decorative numbering.

Required controls and states:

1. **Budget** accepts dollar amounts with at most two decimal places through the existing parser. Presets are $0, $5,000, $10,000, $15,000, and $20,000. Selecting a preset submits immediately. Typing a value requires **Compare plans**.
2. **Before repairs**, **Condition-first**, and **Curb recommendation** are buttons with a visible and programmatic selected state. They switch the map's displayed coverage and selected repairs using the completed response. They do not issue a new optimization request.
3. Each comparison card shows the submitted budget, selected repairs, assumed spend, newly reachable destination count, and destination names. Keep baseline Cafe out of the benefit count. Equal outcomes get neutral copy.
4. The map shows blockers, selected repairs, and returned reachable paths. Use line patterns, symbols, and text as well as color. Accessible text lists the equivalent route outcomes. Highlight paths from the selected response's `route.edgeIds`; diagram geometry alone must never create a new connection.
5. **Test this combination** exposes a single-omission preview for repairs in `exact.selectedRepairIds`. At $10,000, the controls are **Omit A** and **Omit B**, plus **Restore recommendation**. Only one omission is active at a time. Use the matching `exact.withoutRepair` record. Label it **Recommendation without A** or **Recommendation without B**, show remaining spend and outcomes, and keep the original recommendation card available. This preview does not reoptimize or overwrite the recommendation.
6. Show the corresponding `singleRepairs` explanation when available. The server returns singles for repairs selected by either comparison, so hide an unavailable singleton control at other budgets instead of inventing a result.
7. **Reset scenario** restores $10,000, clears omission/evidence selection, obtains a fresh comparison, and selects Before repairs. Global **Reset demo** should also return this route to that starting state. Refresh opens the same deterministic default.
8. **View Robertson evidence** links to the existing survey page. Add **Investment demo** to shared navigation. Route Explorer stays available with its existing behavior. The presenter can open the real video first and use navigation to enter the scenario.

The client imports contracts and pure presentation helpers. Keep server modules and the authoritative fixture out of browser imports. Reuse existing cancellation behavior: budget edits invalidate old results immediately, newer requests supersede older ones, timeouts and API failures expose Retry, and unmount aborts pending work. Show the entered budget separately from a completed comparison's submitted budget until recomputation. Reset, failure, or revision change must clear an omission preview that belongs to an older response.

## Decision brief

Provide an on-page **Recommended investment** summary and **Print recommended plan**. Use browser print and scoped print CSS for a compact one-page brief on Letter or A4. The brief includes scenario/revision, synthetic label, budget, profile/origin, selected repairs and assumed costs, spend, newly reachable destinations, the condition-first comparison, and the A/B dependency explanation when applicable.

The print source is the canonical `exact` plan for the completed response, including when an omission preview is visible. State that the print action exports the recommendation. Include the scenario assumptions and the next real-world inputs required: verified route assessments, user destination priorities, measured repair scopes, and current prices. Print is disabled while results are missing, stale, or loading.

The existing Robertson export remains its own workflow. This slice needs no new PDF API or changes to the survey report schema. Validate the actual browser print preview and saved output before the rehearsal.

## Technical changes and file ownership

Choose existing available implementation leads after reading the live board. These are proposed literal scopes for the orchestrator to assign, not active reservations. Each assignment records the task, actual session, checkout, full base SHA, branch, files, and release. Prefer one lead per lane and avoid additional children for this small slice. Preserve the project's Sol/xhigh worker policy and Landau's existing Claude exception.

| Work package | Literal writable paths |
| --- | --- |
| Scenario and API selection | New `src/data/curb/investment-demo.json`; new `src/data/curb/investment-demo.test.ts`; existing `src/server/curb/plans.ts`; existing `tests/integration/server/plans.test.ts`; existing `tests/integration/client/fetchPlan.test.ts` only for the explicit scenario-selection regression if needed |
| New demo UI | New `app/curb/investment-demo/page.tsx`; new `src/features/curb/investment/InvestmentDemo.tsx`, `InvestmentDiagram.tsx`, `InvestmentSummary.tsx`, `InvestmentDemo.module.css`, `presentation.ts`, and `presentation.test.ts` |
| Serial integration/navigation | Existing `src/features/curb/navigation/AppNavigation.tsx`; `AppNavigation.module.css` only if required to fit the added link; new `docs/demo/INVESTMENT_DEMO_SCRIPT.md`; new `docs/demo/INVESTMENT_DEMO_RESULT.md` |

The scenario/API owner adds an explicit allowlist of the original fixture and the new one, using a `Map` or own-property lookup. `GET /api/curb/plan-scenario` with no selector retains the original default. `GET /api/curb/plan-scenario?scenarioId=synthetic-campus-investment` selects the new scenario. `POST /api/curb/plan` selects authoritative context by the request's scenario ID before running the existing validator and comparator. Unsupported IDs remain 404, stale revisions remain 409, malformed requests remain 400, and invalid server data remains 500. Preserve route-handler protections and response identity checks. A fixed allowlist must not resolve user input as a file path.

The UI owner calls the existing client with the new ID. Reuse formatting and validation helpers directly where appropriate. The new presentation helper can select a `PlanCoverage`, repair IDs, and derived spend from baseline/comparison/omission state. It must not search routes or decide a winning set. Component boundaries may be consolidated when that improves readability, with the orchestrator recording the final literal paths before assignment.

Application code in `src/features/curb/explore/`, the Robertson survey, Repair priorities, existing fixtures, contracts, optimizer, manifests, lockfile, and hosting configuration is outside these proposed write scopes. If an actual dependency requires an additional path, the orchestrator resolves its ownership and records the narrow scope change before editing. No unrelated candidate needs to merge first.

## Sequence and time budget

1. **Reconcile and pin, about 10 minutes.** The intended coordinator confirms the current handoff, integration publisher, and live checker. Read current AGENTS, orchestration/ownership/contracts, and all newer board records. Fetch canonical main and pin a common base. Copy or publish these two planning files from the planning checkout to the coordinator's selected branch so remote workers can read the same plan. Do not merge the stale coordination branch wholesale. Assign exact disjoint scopes.
2. **Scenario and API, about 20–30 minutes.** Author and validate the fixture, run the numerical oracles through `comparePlans`, extend scenario selection, and verify both fixtures over the actual API. Publish the checked checkpoint and its full SHA.
3. **Diagram and interaction, about 40–60 minutes.** The UI owner can build against frozen schemas and agreed fixture IDs while the API work finishes. Final integration uses the published API checkpoint. Complete budget comparisons, route highlighting, omission preview, reset, and print summary.
4. **Integration and verification, about 20–30 minutes.** Add the shared navigation entry serially after confirming release of that file. Run required checks and the complete presenter flow. Fix observed failures and publish one reviewed candidate.
5. **Release and rehearsal, about 15–20 minutes plus hosting time.** Merge through the established publisher and CI process, observe the automatic Vercel deployment, and use the existing checker for the exact live revision. Perform a spoken rehearsal and save a local backup of the accepted result.

These are planning estimates. At preparation it was approximately 04:16 America/New_York on November 15. Recheck the remaining event time when starting. Prioritize the diagram, true budget calculation, and A/B omission result. Drop animation, decorative polish, new media, and optional explanations before cutting those interactions. If print formatting cannot be finished safely, retain the on-page brief, explicitly record that limitation, and keep the central live demo intact. Required correctness, provenance, navigation regression, and normal release checks remain part of delivery.

## Acceptance and verification

Use focused tests for the new fixture and scenario-selection behavior. Keep existing meaningful regression tests. Do not add tests that merely repeat component markup.

- Independently enumerate the eight eligible subsets and verify the full result table above, including actual route node/edge witnesses, baseline Cafe, selected costs, and omission outcomes. Deep-freeze input and assert that comparisons preserve the scenario.
- Verify the old fixture's established $0/$2/$4/$8 behavior remains intact. Test explicit selection of both IDs, omitted selector, unknown ID, stale revision, invalid amount, and returned identity through the real handlers/client.
- Test presentation projections for baseline, both plans, and one omitted repair. Assert highlights are limited to returned reachable paths, destination counts are consistent, and a missing projection cannot appear as success.
- Run `npm run check` on the final combined checkpoint and the repository's required CI jobs. Run `npm run test:replay` as required by the existing release checks. Record exact commands, results, and SHAs without treating old archived results as new runs.
- In actual browser sessions at desktop 1366 x 768 and narrow 390 x 844, open via shared navigation. Verify default $10,000, both strategies, A omission, B omission, restoration, $5,000, $15,000, $20,000, reset, and refresh. Ensure the diagram is legible and the main decision is easy to locate.
- Exercise keyboard-only controls, visible focus, selected-state announcements, readable contrast, text equivalents for the map, and reduced motion. Inspect for horizontal page overflow and console exceptions.
- Delay or fail the plan request and change budget twice quickly. The late response must not replace the newer one. Verify Retry, malformed-response handling where practical, and disabled print while results are stale.
- Print the $10,000 recommendation while Omit A is visible. The saved brief must contain the actual A+B recommendation, $10,000 spend, Library and Student center, and the synthetic disclosure. Check both Letter and A4 preview for clipping.
- Smoke-test Route Explorer Campus/photo detail and Robertson field detail, the original `/curb/plans` Repair priorities, survey replay/exports, collection demo, and existing synthetic trip behavior. The added navigation entry must work at both widths.

The current main-to-production Git integration deploys automatically. Follow `docs/demo/ROBERTSON_HOSTING.md` with one publisher and the existing checker. Capture merged SHA, READY deployment ID, production URL, `/api/health` matching the merged SHA, changed-flow live results, and a retained previous deployment for rollback. If newer main supersedes a candidate, verify the actual deployed combined revision and identify that change in the receipt.

## Three-minute presenter script

| Time | Action and narration |
| --- | --- |
| 0:00–0:25 | Show Robertson's surface-breakup evidence at six seconds. “We recorded this on campus. Curb lets facilities review the evidence and scope the next inspection.” |
| 0:25–0:40 | Open Investment demo. “To test funding decisions across a network, we built this synthetic campus with assumed conditions and costs.” |
| 0:40–1:10 | Show Before repairs. Identify Arrival, the shared A/B approach, and C's separate Hall approach. “We have $10,000. Cafe is already reachable. The other three destinations are blocked in this model.” |
| 1:10–1:40 | Select Condition-first, then Curb recommendation. “Worst-condition-first funds C and opens Hall. Curb funds A and B together and opens Library and Student center for the same amount.” |
| 1:40–2:05 | Omit A, restore, then omit B. “Either repair alone leaves a barrier on this approach. The benefit depends on completing the pair.” Restore the recommendation. |
| 2:05–2:25 | Select $20,000. “With enough budget both methods fund all three repairs and reach the same destinations.” Return to $10,000. |
| 2:25–3:00 | Show the brief. “The facilities manager gets a proposed repair set and an explanation of the connections it restores under these assumptions. Our next validation is one measured corridor with campus users, facilities staff, and current repair quotes.” |

For a two-minute slot, use one omission, shorten the video introduction, and keep the $20,000 comparison available for questions. Avoid the prepared upload delay during the main presentation. Keep Route Explorer accessible for provenance questions and the rover accessible for collection questions.

## Completion handoff

Return the new route and production URL, PR and exact merged SHA, verified deployment, numerical and browser results, remaining limitations, the rehearsed script, and local backup location. The result should let the presenter reproduce the $10,000 decision, explain the dependency, change the budget, and recover the starting state without developer assistance.

Source references: [production routing](https://github.com/oliverchennn/Curb/blob/9271b304e43dcef09be4f26b17e604677ce1c783/app/curb/plans/page.tsx), [existing optimizer](https://github.com/oliverchennn/Curb/blob/9271b304e43dcef09be4f26b17e604677ce1c783/src/domain/curb/plans.ts), [client](https://github.com/oliverchennn/Curb/blob/9271b304e43dcef09be4f26b17e604677ce1c783/src/client/curb/fetchPlan.ts), [latest recorded live QA](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6891955041), [hosting runbook](https://github.com/oliverchennn/Curb/blob/9271b304e43dcef09be4f26b17e604677ce1c783/docs/demo/ROBERTSON_HOSTING.md).
