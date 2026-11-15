# Curb metrics and proof implementation plan

Prepared 2026-11-15 for Vincent's request to measure Curb's benefit and give the orchestrator an assignable development task. Task family: `METRICS-PROOF/1`. This document specifies work; it contains no newly measured benchmark or participant results.

The deliverable is a reproducible evidence package for two questions: how much modeled access Curb buys at a fixed repair budget, and how quickly a person can produce a correct recommendation using Curb. Accept and report unfavorable results. Completion must never depend on achieving a desired improvement percentage.

## Current context and ownership

The investment demo is already assigned. Its published plan is `docs/planning/INVESTMENT_DEMO_IMPLEMENTATION.md` at `5d06aff20ee6b84807726cbb5380df93e42593c8`. This metrics task supplements that work and does not claim its files. Preserve Route Explorer, Robertson evidence, Repair priorities, CAD, frozen contracts, and the optimizer.

Read the current live board before assignment. The planning inspection reached [comment 6892345016](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892345016). [Assignment 6892289223](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892289223) reserves the investment API, fixture, UI, navigation and final demo script/result. Vincent's active coordinator is recorded as `01a1de7d-ca0f-7ed2-989d-4aae0850f1ae`; Oliver-host execution routing as `01a1de80-4636-7e51-9828-33617eb391d9`. Existing sole integration publisher: `01a1dc6e-1818-7dd2-ae95-8ac3fcfca3b5`. Existing live checker: `01a1de18-2671-7590-b81f-e13bb62d64d9`. Reconcile newer records; these are a snapshot, not a fresh dispatch.

Use the current two-host workflow and actual model instructions. Vincent-host workers use Sol/xhigh; the board records and acknowledges a direct human Astra/xhigh override for Oliver-host tasks. Do not replace active writers or restart completed work. The coordinator assigns/reviews; a separately assigned implementation owner writes the evaluation tools.

These two new planning files are initially local in `C:\Users\vzhu0\PycharmProjects\Curb`, on historical `codex/r2-coordination` at `9f1b1817a114c5bf35376474b20d0ca98f3311cc`. They must be copied/published as a scoped documentation change from a current fetched base before remote workers depend on them. Do not merge the historical branch. During planning, `git fetch origin` failed because `.git/FETCH_HEAD` was not writable; current package/engine and the board were inspected through the GitHub connector. No local fetch or remote publication is claimed. Canonical repository is `oliverchennn/Curb`; the old `vzhu08/Curb` origin redirects there as verified by the active coordinator.

## Deliverables and completion states

| Deliverable | Required proof | Completion state |
| --- | --- | --- |
| Authored demo comparison | Actual engine output and independent oracle for the released investment fixture and its eight specified budgets | `demo_verified` only after the actual fixture is available |
| General synthetic benchmark | Frozen 30-network suite, all 120 network-budget cases, four strategies, raw results, independent audit, reproducible report | `benchmark_verified` only after independent rerun |
| Human measurement kit | Frozen task, balanced assignment, instructions, rubric, anonymous input template, validated analysis script | `study_ready`; this does not mean participants were tested |
| Observed usability study | Actual human submissions, observer times, scoring records, denominators, raw anonymized rows and analysis | `study_observed` only after sessions occur |
| Judge-facing evidence brief | Every numerical statement traceable to a result field and a verified source/run | `claims_verified`; unused/unmeasured claims are omitted |

Engineering can finish while human sessions are pending. The final handoff must name these states separately. Never replace missing sessions with agents, fabricated CSV rows, team estimates, or recorded demo playback. Synthetic rows used to test the analysis code live in tests and must be rejected as empirical input.

## Metrics and permitted claims

For one fixed scenario, origin, profile and destination list, define `R(S)` as the set of destinations with a known traversable route after the modeled repair set `S`. Define `G(S) = |R(S) minus R(empty)|`. Every destination has weight one, matching `curb-r2`.

Primary benchmark outcome: `G(Curb) - G(comparator)` at the same budget and on the same immutable inputs. Record actual spend separately. Secondary outcomes: total reachable destinations, gain divided by the fixed destination count, and `spendCents / G(S)` when gain is positive. A zero-gain cost-per-destination result is null with a reason, not zero or infinity. Relative gain is defined only when the comparator gain is positive; exclude it from headline aggregation and show its valid denominator if reported.

Unknown routes contribute no demonstrated access. Unknown-cost candidates are excluded consistently and listed. All graphs, costs, severities and modeled repair effects in this suite are synthetic. Neither destination counts nor destination weights are counts of people helped. This objective assigns no credit for hazard reduction or partial progress and models no mandatory-work constraints; the comparison concerns discretionary repairs under the declared objective.

Expected illustration from the existing investment plan, pending execution against its released fixture:

| $10,000 budget, baseline Cafe already reachable | Condition-first | Exact Curb |
| --- | ---: | ---: |
| Selected set | C | A+B |
| Assumed spend | $10,000 | $10,000 |
| Newly reachable destinations | 1 | 2 |
| Total reachable | 2 of 4 | 3 of 4 |
| Modeled cost per newly reachable destination | $10,000 | $5,000 |

The supported wording is "two newly reachable destinations instead of one for the same assumed $10,000 in this synthetic scenario." The cost-per-destination ratio falls 50%; cash spending does not. Total coverage increases 25 percentage points. Cheapest-first also selects A+B here, so the example is not a win over every comparator. Keep it separate from the 30-network benchmark aggregate because it was deliberately authored to illustrate complementarity.

The exact engine is optimal by construction for the bounded objective when implemented correctly. Benchmark results quantify the gap left by simpler rules on the published suite. They do not prove superior real-world repair outcomes, a unique optimization invention, or superiority to commercial products.

## Freeze the benchmark before measuring

Implement a deterministic generator and materialize `benchmarks/curb-metrics/suite-v1.json`. Freeze the generator, full inputs, metric definitions, comparator rules and seeds in a published commit before running the comparative benchmark. Save the fixture hash in a manifest. Do not search seeds or modify topology, severity or prices to enlarge a win. If a defect requires correction, publish a new suite revision, explain it, retain the failed receipt, and rerun the entire suite.

Use six topology families with five variants each:

| Family | Structural coverage |
| --- | --- |
| Independent approaches | Mostly one repair per connection; a simple rule can perform well |
| Serial barriers | Two- and three-repair chains whose benefit requires completion |
| Shared approaches | A shared bottleneck plus branches to several destinations |
| Alternative paths | Loops, alternative approaches, and directed edges |
| Mixed network | Several kinds of connection with varying assumed prices and severities |
| Incomplete information | Explicit unknown route assessments and unknown costs; no optimistic filling of gaps |

Use seeds `101, 202, 303, 404, 505` for each family; define a stable family-specific PRNG derivation in the generator and protocol. Use an explicitly implemented deterministic PRNG, not `Math.random`, locale-dependent sorting or current time. Each network has one origin, eight distinct destinations including one deliberately reachable baseline destination, 12-30 nodes, and 6-10 candidate repairs. Keep total candidate count within the existing maximum of 12. Generated known costs are strictly positive assumed cents from a frozen price set; severity scores are 1-5. Choose the generator's distributions before seeing comparative results. Do not enforce a Curb win or exact baseline reachable-count constraint beyond the authored baseline destination. Record any additional initially reachable destinations normally.

For family six, author two unknown edge assessments and one unknown-cost candidate per variant; validate references and preserve possible known alternate routes where the topology provides them. The other five families use complete route assessments and known costs. No real campus coordinates, footage or field claims are attached to these generated inputs.

Let `K` be the sum of eligible known candidate costs. Run budgets `floor(K/4)`, `floor(K/2)`, `floor(3*K/4)`, and `K`, in cents. Require positive K and distinct budgets in this main suite; invalid construction fails the suite rather than silently dropping or regenerating cases. Record requested fraction, actual cents, eligible candidate count, all excluded IDs, baseline reachability and scenario identity in every case. This yields 120 cases and 480 strategy rows. There are 360 paired Curb/comparator comparisons; these are correlated cases from 30 networks, not 120 independent campuses.

Do not call this a representative campus sample or a held-out evaluation. It is a preregistered synthetic engineering benchmark with disclosed construction choices.

## Four strategies, exactly specified

All four strategies share the same graph, profile, origin, destination list, budget, candidate eligibility and route evaluator. Baseline policies are implemented in evaluation tooling, not added to the production API or UI.

1. **Curb exact:** call the actual production `comparePlans` import. Use its exact selection, outputs, spend and search counters without reproducing the optimizer in the runner. Preserve gain, lower-spend, fewer-repairs and stable-ID tie-breaking.
2. **Condition-first:** use the actual `conditionFirst` result, and independently reconstruct its selection in the audit. Sort severity descending, cost ascending, code-unit repair ID ascending. Scan all candidates, purchasing when affordable and skipping otherwise.
3. **Cheapest-first:** sort cost ascending, severity descending, code-unit ID ascending. Scan all candidates using the same affordability rule.
4. **Greedy marginal access per dollar:** start empty. At each step evaluate the additional gain from every remaining affordable candidate relative to the current set. Select the largest gain/cost ratio. Break ties by larger absolute gain, lower cost, then code-unit ID. Recompute after every purchase. Continue through zero-gain candidates using those rules until no remaining candidate fits; do not deliberately stop at a complementarity plateau to weaken this comparator. A positive-gain zero-cost candidate ranks first; zero gain at zero cost has ratio zero. Compare rational ratios exactly, using BigInt cross-products if needed, rather than rounding.

Cheapest and greedy may use the existing `prepareTripEvaluator(...).evaluateRoutes(...)` with selected repair-to-barrier IDs, as the production engine does. This ensures equal evaluation semantics. The separate verifier described below cannot import that evaluator. All known-cost eligible candidates remain available to every policy; unknown cost is not treated as zero. A selected repair is purchased once. Input data must be immutable.

## Controls and independent proof

Keep controls outside the 120-case performance aggregate. Use them to catch scientific and implementation mistakes:

- The investment fixture's eight budget oracles from its existing plan, including $10,000 condition-first C versus exact A+B, each A/B singleton and omission having zero gain, $5,000 exact choosing empty, and the $20,000 gain tie. Record cheapest-first's $10,000 tie with exact.
- Tiny hand-checkable graphs for genuinely free repairs, unaffordable repairs, all-zero gain, no candidates, unknown costs, unknown routes remaining unknown after a blocker is removed, one-way edges, multiple blockers, a disconnected destination and stable selection ties.
- Monotonicity: adding repairs cannot reduce modeled reachability; increasing the budget cannot reduce exact gain. Do not require exact selected sets to be nested or condition-first gain to be monotone.
- At budget K, all four specified methods achieve the maximum reachability possible from eligible repairs, even if exact omits unnecessary purchases. Unknown routes and unknown-cost projects can still prevent full destination coverage.

Build an independent oracle in evaluation tooling. It may import contract types and parse inputs but must not import `comparePlans`, `prepareTripEvaluator`, production reachability/search helpers or caches. Build directed adjacency from the fixture and use an independently written BFS/DFS: an edge is traversable only when its assessment is known and every blocking barrier is cleared. Clearing a blocker never converts an unknown assessment into pass. Enumerate all eligible subsets, compute cost and reachable destination IDs, and apply the documented exact tie-breaking. Independently reconstruct all three comparator selections using this oracle.

Audit every case and strategy for selected IDs, eligibility, spend, budget feasibility, baseline/new destination sets and counts. Audit exact optimality and tie-breaking, plus enumerated/feasible subset counts. Validate every returned reachable path's endpoints, directed edge continuity, cleared blockers, destination and summed lengths; a reachable path witness must not include an unknown edge. This audit proves reachability/selection under the model, not every distinction between the production blocked/unknown/disconnected explanation categories.

Add tests that deliberately alter one selected ID, spend, restored destination, route edge and artifact checksum and confirm rejection. Prevent accidental oracle reuse of production routing by source/import inspection during independent review. A numerical mismatch or malformed case exits nonzero and invalidates the headline report; never turn it into a skipped row or average over the survivors.

An independently assigned verifier reruns the released source in a separate checkout, recomputes the report from raw rows, and checks a small hand-calculated sample. The author running their own oracle is useful but does not satisfy independent acceptance.

## Evidence package and reporting

Use the existing `tsx`/Vitest dependencies. Current main already runs TypeScript scripts through `node --import tsx`; no new package, manifest, lockfile, server endpoint, analytics service or database is required. Proposed CLI interface, to implement and document:

```text
node --import tsx scripts/curb/metrics/generate.ts --output benchmarks/curb-metrics/suite-v1.json
node --import tsx scripts/curb/metrics/benchmark.ts --suite benchmarks/curb-metrics/suite-v1.json --out <run-directory>
node --import tsx scripts/curb/metrics/audit.ts --run <run-directory>
node --import tsx scripts/curb/metrics/report.ts --run <run-directory>
node --import tsx scripts/curb/metrics/study.ts --input <anonymous-study-csv> --out <study-directory>
```

These are target commands, not claims that scripts already exist. Paths must work on Windows and macOS/Linux. Do not overwrite an existing run directory silently. The runner records the actual full source commit and relevant source-file hashes; reject dirty benchmark/engine/contract inputs for a publishable run. A run ID may include time, but timestamps, timing measurements and machine metadata stay outside deterministic comparison data.

Reserve the following exact output names beneath one coordinator-selected `docs/evidence/metrics/<run-id>/` directory before publication:

| Artifact | Required contents |
| --- | --- |
| `manifest.json` | Schema/suite versions, source commit, frozen-input commit/hash, UTC time, Node/OS, exact commands, case/row counts, per-file SHA-256 hashes, measured scope and limitations |
| `inputs.json` | Complete frozen suite snapshot, including assumptions, PRNG/seeds and all costs/assessments; byte/hash relationship to suite-v1 explicitly recorded |
| `engine-responses.json` | Unmodified production comparisons for all 120 cases, plus separately identified demonstration/control responses |
| `results.json`, `results.csv` | Stable-order rows with scenario/family/seed/budget/strategy, selection, spend, baseline/new/total destination IDs and counts, excluded IDs and nullable cost-per-new-destination |
| `audit.json` | All case/strategy/control checks, expected and actual counts, failures and verifier version; no summary-only pass |
| `summary.json` | Recomputed aggregate values with field-level numerators, denominators, filters and metric definitions |
| `report.html` | Local, printable report with accessible tables and a budget-versus-gain SVG plot generated from audited results; no CDN or network requirement |
| `claims.json` | Approved wording, evidence class, result-field pointers, run/source references and limitations for every proposed numerical claim |
| `run.log`, `verification.md` | Actual exit codes/check commands and independent rerun receipt, tested SHAs, scope and limitations |

Manifest hashes exclude the manifest itself. Record artifact publication SHA in the handoff/verification receipt without creating a circular requirement for a commit to contain its own SHA. Version and hash the deterministic inputs/results/summary separately from execution metadata. Independent runs must reproduce deterministic content; times and machine metadata may differ. Keep any private machine paths or usernames out of published receipts.

For each comparator report all-case mean absolute gain difference, wins/ties/losses, per-family means and a full-case table. Compute means by averaging each scenario's four paired differences and then averaging the 30 scenarios, so the weighting is explicit. Also show the 25/50/75% budget subset separately as a predefined secondary view; never hide 100% budget ties. The plot uses budget as a fraction of total eligible cost and mean new destinations, clearly labeling all costs as synthetic. With eight destinations per scenario, coverage fractions remain comparable; still show actual counts.

A loss by exact on its own objective indicates a defect and blocks verification. No target win rate, percentage gain or minimum speedup is an acceptance criterion. Do not add statistical significance or population confidence claims to this small authored suite. A one-page proof brief can contain one benchmark comparison, its scope, and the illustrative map result, with a link/path to the complete package. Human results appear only after observation.

## Human study: real observations, bounded claim

Use a short randomized between-participant study of the implemented investment demo. This avoids asking someone to solve the identical case manually after Curb has shown the answer. It needs no second production fixture, new study route or telemetry.

Default task: using the released three-repair synthetic investment case at $10,000, produce a short brief selecting repairs within budget, listing assumed spend and newly reachable destinations, explaining the A/B dependency, citing the supplied evidence/assumptions, and stating the main verification limitation. The comparator receives the same complete graph, baseline access, repair IDs, costs, severity and authored evidence in a neutral printable packet and CSV; a spreadsheet/calculator is permitted. It contains no recommended set. The Curb group receives the same packet plus the accepted application. Both use the same neutral answer template. Do not give only Curb extra costs, annotations or reviewed inputs.

Target six or eight actual participants, with three or four in each arm. Freeze a balanced randomized assignment before recruitment; record the seed/order. Exclude product authors and people already shown this demo from the comparative sample; they may run an explicitly excluded dry run. Record anonymous role categories, such as facilities staff, student or other, and prior familiarity. Do not describe convenience participants as facilities customers. Both arms receive the same short task orientation; Curb control familiarization must not expose the study answer before timing begins.

Give each participant one task, with a fixed ten-minute cap. Start the stopwatch when the prepared task inputs and assigned tool are available; include reading, reasoning, evidence inspection and writing/exporting the final brief. Stop at final submission. Allow ordinary task clarification using a frozen script; log substantive hints, technical interruptions and abandonment. Hinted sessions remain reported and are excluded from the unassisted summary by a predeclared rule. No selective deletion of slow participants.

This measures **post-setup recommendation-and-brief task time on a small synthetic case**. It excludes field inspection, data collection, fixture authoring, model ingestion and software setup. Record those exclusions prominently. Record facilitator preparation/setup effort separately when practical; do not extrapolate an annual time saving or an end-to-end operational ROI from this study.

A scorer uses a frozen six-item rubric, preferably blind to method after normalizing submissions into the common template:

1. Repair IDs and assumed spend are stated and budget-feasible.
2. The selected set is optimal under the disclosed objective; for the fixed task it is A+B.
3. Newly reachable destinations are Library and Student center; Cafe is baseline access.
4. The brief explains that either A or B alone leaves the shared approach blocked.
5. Cost/effect assertions reference the supplied scenario evidence or assumptions rather than invented measurements.
6. It explicitly identifies synthetic costs/conditions and the need for actual route/scope verification.

Record each item separately plus any budget breach, unsupported field claim or destination miscount. A fully correct submission passes all six. A second reviewer checks every scored submission in this small study and records disagreements/resolution. Timed completion alone is not task success. The rubric and raw answer artifacts must be retained so someone else can audit the score.

Study input fields include protocol version, participant ID, anonymous role/familiarity, assigned arm, actual arm, input/app revision, start/end/duration, completion/censoring status, hints/interruptions, submission reference/hash, six rubric flags, error categories and scorer/reviewer IDs. Include explicit `recordKind: observed` and a human observer attestation; schema validation cannot itself prove that a session happened. Require links to the actual submission and contemporaneous observer record. Do not collect names, contact details or recordings by default. Explain voluntary participation and anonymous result use before starting. Publish only authorized anonymized artifacts; retain restricted evidence privately and label any limit on independent public review.

The analysis script rejects missing/duplicate IDs, inconsistent times, impossible durations, absent input revisions, test/synthetic observations and missing required proof references. Preserve all assigned sessions and dropouts in an accounting table. Report arm counts, fully-correct counts/rates, rubric/error counts, raw durations and median/range for completed attempts. Also report successful-submission durations with their smaller denominator; do not compare only successful participants while hiding failures. Cap-expired attempts are right-censored at ten minutes, not treated as successful ten-minute completions.

Only consider a descriptive percentage-time headline when at least three unassisted participants in each arm completed fully correct submissions and overall completion/error rates are reported beside it. If an arm has worse quality, lead with that tradeoff. Smaller or incomplete samples support individual observations and task-success counts, not a broad efficiency claim. Random assignment and these gates do not turn a tiny convenience sample into validated market evidence. Never promise a favorable result.

The development owner prepares the kit and analysis. Vincent or a named human facilitator recruits and observes sessions; this plan does not authorize agents to send invitations or messages. The orchestrator provides Vincent the ready task sheet, instructions and CSV location as the concrete human action, while continuing independent engineering. If sessions cannot happen before judging, publish `study_ready / observations_pending` and use only verified synthetic results in the demo.

## Proposed assignments and literal source scopes

These are proposed scopes for the orchestrator to reserve after checking the live board. One writer per file; no active reservation is made by this document. Use a current pinned base containing unchanged `curb-r2` and the production engine. The harness can start before investment UI completion. The demonstration control waits for the released fixture; the human sessions wait for accepted UI.

| Task | Proposed owner and exact writable paths |
| --- | --- |
| `METRICS-BENCH/1` | One available implementation lead, preferably on Oliver host if it does not delay Investment P0: `scripts/curb/metrics/spec.ts`, `generate.ts`, `baselines.ts`, `benchmark.ts`, `report.ts`, `benchmark.test.ts`; `benchmarks/curb-metrics/suite-v1.json` |
| `METRICS-AUDIT/1` | Separate verifier after the evaluation schema is frozen: `scripts/curb/metrics/oracle.ts`, `audit.ts`, `audit.test.ts`; independently generated verification receipt in the reserved run directory |
| `METRICS-STUDY/1` | One available owner: `scripts/curb/metrics/study.ts`, `study.test.ts`; `docs/evaluation/METRICS_PROTOCOL.md`, `HUMAN_STUDY_GUIDE.md`, `HUMAN_STUDY_TASK.md`, `HUMAN_STUDY_INPUT.csv`, `HUMAN_STUDY_ANSWER_TEMPLATE.md`, `HUMAN_STUDY_RUBRIC.md`, `HUMAN_STUDY_OBSERVATIONS.template.csv` |
| `METRICS-ACCEPT/1` | Existing coordinator/serial publisher reserves the concrete run artifact paths above and `docs/evaluation/METRICS_RESULTS.md`, `METRICS_CLAIMS.md`; records source/artifact SHAs, verified status, remote equality and remaining human work |

All script basenames after the first in each row share `scripts/curb/metrics/`. The benchmark lead owns the internal evaluation schema in `spec.ts`; freeze it before dependents start. This is not a change to production contracts. The study owner freezes methodology before collection, with verifier review. The coordinator records actual task IDs, sessions, checkout, branch, full base and expanded literal paths before assigning. A released schema owner handles subsequent schema changes serially.

Prefer a serial benchmark lead plus an independent audit owner over a large new development swarm. A single lead may build study tooling afterward if capacity is limited. Respect current host-specific delegation and model instructions; do not create substitute coordinators, merge publishers or live checkers. Existing Investment UI, API, fixtures, navigation, production engine/contracts, package files and demo script/result remain read-only to this task. If a genuine engine bug is found, publish the reproduction and obtain a narrow corrective assignment through its owner; do not quietly fix it inside evaluation work.

The evidence brief is a local HTML/Markdown deliverable; no production page is required. Route any accepted judge-facing wording to the already-assigned presenter/coordinator for their reserved script. Do not edit their script or insert numbers directly into an actively written UI.

## Execution order, checks and cut policy

1. **Reconcile and publish the task, roughly 10 minutes.** Publish these two planning files from a current base, confirm owners, reserve paths, read the active investment assignment and choose a code base. Record exact source and scope; do not use a moving `main` label as the experiment revision.
2. **Freeze the experiment, roughly 20-30 minutes.** Define evaluation schema, generator, comparator rules, 30 complete inputs and study protocol. Validate the suite and publish its frozen commit/hash before comparison. Freeze the human protocol before any scored sessions. No requirement to inspect comparative outcomes during this stage.
3. **Implement/run/audit, roughly 45-75 minutes.** Build tooling, meaningful regression/adversarial checks, oracle, complete run and independently reproducible report. Study kit preparation can proceed in disjoint files after the schema freeze. These are estimates, not a completion promise.
4. **Collect humans when ready, roughly 20-40 minutes with volunteers available.** Run the frozen protocol against one pinned accepted app version. Record actual observations, score, review and analyze. Do not rush correctness review to obtain a headline. If the app changes materially, keep cohorts separate or restart an explicitly new study revision.
5. **Accept and publish, roughly 15-25 minutes.** Reviewer reruns deterministic results, checks controls and claim pointers, and publisher verifies the remote checkpoint. Give the existing presenter the accepted one-page brief and exact sentence(s), along with limitations and any pending human study.

Run focused Vitest checks for these scripts, then the repository-required `npm run check` on the final integrated source and any currently required replay/CI checks. Typecheck the standalone scripts even if the repository tsconfig excludes that directory. Record actual commands and exit codes. Required checks cover suite counts/determinism, valid contracts/references, all comparator rules, independent optimality and route witnesses, input immutability, cost/gain arithmetic, zero-denominator handling, malformed/missing rows, tamper rejection, identical deterministic output on rerun, and study missing/censored/unsuccessful cases. A report must not show a passing headline when audit status is missing or failed.

The independent verifier compares all 120 cases and 480 rows, rather than just checking the illustrative win. Validate the eight investment budget controls only after reading its actual released fixture; do not create a second supposedly authoritative fixture to unblock this check. Open/print the generated HTML report and verify its chart/table/labels agree with summary.json. No production deployment is necessary for local benchmark tooling. If merged main triggers the existing automatic deployment, the existing publisher/checker owns the normal release process; this task does not create a manual deployment or duplicate browser checker. Human observations record the actual accepted deployment SHA or validated local source SHA and environment.

If time is short, cut decorative report polish, optional latency measurements and additional derived metrics first. Keep the fixed suite, fair baselines, raw artifacts and independent audit. If only the illustration is verified by judging, claim only that authored example. If the benchmark is partial, label it incomplete; do not publish a headline over a favorable subset. Human absence remains an honest pending state. The existing investment demo stays P0 and must not be delayed for a new metrics dashboard.

## Final handoff checklist

Return the full tested source SHA, frozen-suite SHA/hash, source and artifact branches/PRs, independently verified remote SHAs and sync time, exact reproducible commands, run directory and all proof files, actual test results, independent review receipt, and remaining local changes. Identify `demo_verified`, `benchmark_verified`, `study_ready`, `study_observed` and `claims_verified` separately. Supply the exact allowed presenter wording and its result pointers. Return any failures or unfavorable comparisons just as clearly as gains.

Do not say "beats current solutions" without an actual same-input comparison to those named products. Do not claim measured people served, construction savings, general AI accuracy, regulatory compliance or actual repaired campus routes. The one Robertson video remains evidence of observed conditions, separate from synthetic network benefits.

## Research basis

- [University of Minnesota: calculating accessibility metrics](https://access.umn.edu/ao-research/accountability/calculating-accessibility-metrics) identifies origins, destinations, network connections and travel cost as inputs. Curb's present metric is a bounded reachability version, without a travel-time threshold or demand weighting.
- [VTRC: Guidelines for Prioritizing Curb Ramp Retrofits](https://rosap.ntl.bts.gov/view/dot/55474) reports multiple prioritization considerations and the value of sidewalk/crosswalk data for connectivity. Condition-first here is a transparent comparator, not a claim about actual Princeton practice.
- [DeepWalk](https://www.deepwalk.com/webapp) already describes inspection-based improvement programs; [OpenGov](https://opengov.com/products/asset-management/sidewalks-ramps/) describes investment scenarios; [UW Taskar Walkshed](https://tcat.cs.washington.edu/openthepaths-2026-narrations/) describes barrier-change accessibility scenarios. These sources justify avoiding unsupported novelty and vendor-superiority claims. They supply no Curb performance measurements.
