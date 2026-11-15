# Curb Cañada College case study implementation plan

Prepared November 15, 2026 for Vincent and the active Curb orchestrator.

## 1. Outcome and authority

Conduct and publish a reproducible, bounded repair-planning case study using Cañada College's public 2020 accessibility audit. A facilities reviewer should be able to inspect a documented problem, follow it to its route and proposed repair, compare repair packages at equal budgets, and trace every displayed conclusion to source records and an independently checked computation.

The research found promising inputs, not a completed routing dataset or a measured Curb improvement. The task must establish whether the public evidence supports a useful connected case before building its comparison UI. A tie, zero gain, unstable ranking, or insufficient evidence is a valid result. No target winning percentage is required.

Vincent requested this implementation plan and a prompt to pass to the orchestrator. This planning chat writes only this file and `docs/planning/CANADA_CASE_STUDY_ORCHESTRATOR_PROMPT.md`. It does not dispatch workers, claim implementation lanes, change application code, or resume historical coordination. The receiving orchestrator should conduct the bounded study through the current workflow when given the prompt; routine gate decisions belong to that orchestrator and its independent reviewer.

Keep the Robertson video/review flow, Route Explorer, synthetic Investment demo, metrics benchmark, presenter work and CAD intact. Cañada adds an institutional-audit input and a historical planning case. It does not claim that our video system collected the Cañada measurements. Seoul, Seattle, live capture, outreach, purchases and a general document-upload product are outside this task.

## 2. Coordination checkpoint

| Item | Observed at preparation |
| --- | --- |
| Canonical repository | `oliverchennn/Curb`, repository ID `1457315187` |
| Live board | <https://github.com/oliverchennn/Curb/issues/1>, read through `6892694352` |
| Latest main checkpoint reported on board | `437eb3c49369d1001a93b3a2b36c58b6b0b34e5e`, CAD integration in `6892660161`; re-fetch before assignment |
| Active survey presenter | Oliver-host lead `01a1dea4-95f4-7bf3-85be-bfe2cba8cfb0`, ACK `6892679287`; its six UI files remain reserved |
| Active synthetic benchmark | Lead `01a1de9f-604d-75c2-b959-89315c5a7da9`; preregistered input/schema checkpoint `ec8afe2d72c947943767c9906b3ec6f21270fc75`, record `6892670869`; later tools/audit remain separate |
| Planning checkout | `C:\Users\vzhu0\PycharmProjects\Curb`, `codex/r2-coordination`; historical checkout, not the implementation base |
| Verified planning HEAD | `9f1b1817a114c5bf35376474b20d0ca98f3311cc` |
| Planning reservation | `CANADA-CASE-PLAN/1`, this user-requested chat; only the two new `CANADA_CASE_STUDY_*.md` files |

Local coordination documents are historical. `git fetch origin` failed with `.git/FETCH_HEAD: Permission denied`; current board and planner source were read through GitHub. These plans are initially local. Copy/publish the two files from a current fetched canonical base before remote assignment; do not merge the old local coordination branch. Existing untracked planning/demo documents belong to earlier work and are preserved.

Use the existing root coordinator, Oliver host router, serial merge/release publisher and live checker. Apply the current human-approved host/model policies; this plan creates no new model exception or worker session. Before coding, record exact task, session, checkout, branch, full base SHA, literal scopes and dependencies. Independent review must be distinct from author verification. Preserve active writer scopes; serially reserve any shared-kernel changes after reconciling the active benchmark's pinned implementation.

## 3. Source packet and facts actually checked

Authoritative starting point: [SMCCCD District ADA Plan](https://smccd.edu/ada2020/).

Use the **final combined report** linked by that page:

<https://smccd.edu/ada2020/19029%20SMCCCD%20ADA%20Self-Evaluation%20and%20Transition%20Plan%20FINAL%20Nov2020%20sm.pdf>

The research download was 111,675,832 bytes, 4,399 PDF pages, SHA-256 `01e6d86bc0535a925a1f26172c808a22b80fc000797d5fc441ea1b9714f4d2f8`. Verify the downloaded bytes rather than assuming the URL is immutable. A changed hash requires a documented version comparison and a new source freeze. The local research cache is `C:\Users\vzhu0\AppData\Local\Temp\curb-public-data-research\smcccd-2020.pdf`; it is a convenience, not a portable dependency.

Useful locators in that verified final PDF (PDF page means one-based viewer page):

| Content | PDF page(s) | Printed page(s) |
| --- | --- | --- |
| Cañada sidewalk appendix cover | 2784 | 2783 |
| Sidewalk legend and overlapping-work `REF` definition | 2787–2788 | 2786–2787 |
| Master route cost list | 2790 | 2789 |
| Route endpoints and cost summary | 2792–2793 | 2791–2792 |
| Campus path-of-travel map | 2795 | 2794 |
| Sidewalk measurement tables begin | 2796 | 2795 |
| Curb-ramp records 413 and 414 | 2824 | 2823 |
| Curb-ramp record 415 | 2825 | 2824 |
| Curb-ramp records 404 and 405 | 2826 | 2825 |
| Curb-ramp records 421 and 422 | 2827 | 2826 |

The separately searchable [Appendix I](https://smccd.edu/ada2020/Appendix%20I%20-%20Canada%20College%20Sidewalks.pdf) and [Appendix J](https://smccd.edu/ada2020/Appendix%20J%20-%20Canada%20College%20Curb%20Ramps.pdf) carry DRAFT labels and different pagination. Use them for discovery only unless reconciled with the final report. Never mix their viewer-page numbers with final-report locators.

Verified examples, for extraction checks rather than a preselected winning scenario:

- Ramp 421: Lot 1 / Building 9; recorded right running slope 9.8%; proposed replacement; individual estimate $7,000. The adjacent $20,000 subtotal covers other ramps too and is not ramp 421's individual cost.
- Ramp 422: recorded bottom-landing cross slope 2.4%; individual replacement estimate $3,500.
- Ramp 414: under construction at the survey date. A $0 entry here does not mean completed, passable, or a free repair.
- Ramp 415: explicitly assessed compliant for the surveyed features; routine maintenance recommended. This does not certify the complete adjoining journey.
- Sidewalk Route 12: Building 5 to Lot 8; the summary gives $171,900. Route 34's summary gives $1,440. Route endpoints are route labels, not automatically precise entrance nodes.
- `REF` denotes overlapping work with no additional mitigation cost. Blank cells and `REF` are not independent zero-cost repairs.

The report has mapped route lines, measured defects and cost estimates. A machine-readable connected graph, current repair status, exact entrance connectivity and complete photographs for every sidewalk defect have NOT been verified. Some route labels start/end at the same building; do not collapse distinct junctions into one building node. PDF tables continue across pages and can place later-route rows below a page-level heading; validate record grouping visually against summaries and route IDs.

## 4. Stage A: establish a defensible bounded case

Assign a data/evidence owner first. Complete an inventory, source manifest, coverage matrix and feasibility decision before application work. This is useful deliverable work even if the comparison cannot proceed.

### Acquisition and transcription

1. Retrieve the official final report without credentials, record URL, publisher/author, report version, survey period, retrieval UTC, bytes and SHA-256. Preserve raw bytes in an ignored local research cache. Record access/reuse terms; public availability alone is not a blanket license to redistribute the entire report or its aerial basemap. Prefer attributed factual records and source links. Do not commit the 112 MB report or scrape private systems.
2. Inventory all Cañada routes, ramp IDs, start/end descriptions, reported priorities, quantities and costs relevant to the exterior study. Preserve raw text, exact units, numeric intervals, missing values, and page/table/row locators separately from normalized values.
3. Make a transcription checklist with two independent passes over every record used in the case. Visually inspect map junctions and relevant table pages. A model-generated extraction is a proposal until checked; no generative photo reconstruction or inferred physical measurements.
4. Reconcile individual costs, route totals and work references. Keep contradictions in an exception register. The imported total must be explainable; do not silently force records to match a summary. Costs are **published 2020 estimates**, not contractor quotes or current construction prices.
5. Find the report's survey methodology and delimit what was actually assessed. Record whether negative evidence is explicit, whether the inventory claims continuous route coverage, and which attributes remain unmeasured. No listed defect is not by itself proof of passability.

### Choose the area before comparing strategies

Start by evaluating the Lot 1 / Building 9 cluster because the research found multiple ramp measurements and connecting route labels there. This is a feasibility lead, not a guaranteed final selection. Choose the smallest connected area with traceable geometry, useful destinations and complete costable repair actions. Include adjacent buildings only when their connecting paths are supported.

Target one arrival/access point, three to six distinct exterior destination access points, and six to twelve atomic repair projects. These are size targets, not grounds to invent records or omit barriers. Fewer projects/destinations are acceptable if the decision remains meaningful. A destination is an exact mapped exterior endpoint unless the source supports the building entrance and approach; label it accordingly, e.g. “Building 9 exterior access point.” Do not count multiple aliases of the same node as separate destinations.

Freeze the area boundary, chosen origin/endpoints, candidate eligibility, profile/policy and budgets before comparative runs. Choose areas using coverage/connectivity/cost criteria, not observed algorithm advantage. Record all areas considered and exclusions. One outcome-independent bounded expansion within Cañada is allowed if the initial cluster fails; do not search locations until Curb wins.

### Coverage and interpretation

For each edge, record topology support, source route segment and chainage, direction assumptions, assessment basis, surveyed properties, intervals, known barriers, unresolved attributes and source references. Intersections need mapped connectivity; visual crossing of lines, proximity and shared building names are insufficient. Match both curb transitions and the intervening crossing when a route crosses a road. Treat stairs, undocumented connectors, construction and unresolved grade separation explicitly.

Freeze a narrow, clearly named **historical audit planning policy**, not a claim of universal wheelchair access or legal compliance. Distinguish:

- `surveyed_measurement`: an explicit measurement interpreted under a documented threshold;
- `source_assessment`: the auditor's stated assessment for specified surveyed attributes;
- `inventory_coverage_assumption`: an explicit interpretation of documented survey coverage, confined to recorded barrier categories;
- `unresolved`: missing or contradictory support.

Preserve measured intervals. An interval straddling a threshold is unresolved, not its midpoint. Keep original units alongside conversions and document threshold sources. Do not select permissive thresholds after seeing results. Compliance deficiencies are not automatically impassable for all users. If using an inventory-completion policy, the outcome means **connections with the selected recorded barriers addressed**, not verified mobility access. Inventory coverage assumptions must remain visible in the UI, result and claim ledger.

Known barriers and unknown coverage are separate dimensions. Repairing known barriers never supplies a missing measurement or makes an unsupported connector pass. Retain every known blocker on included paths, including noncandidate or unknown-cost blockers. Map boundaries and omitted alternatives limit the conclusion to this subnetwork and candidate set; they do not prove campus-wide optimality.

### Feasibility gate and branches

Publish `feasibility.json` and `FEASIBILITY.md` with an independent reviewer disposition:

| Disposition | Required evidence | Next action |
| --- | --- | --- |
| `comparison_ready` | Traceable connected bounded topology; distinct supported endpoints; defensible assessment policy; complete records for included routes; at most 12 costable atomic projects; explicit unresolved edges; at least one supported end-to-end route in baseline or a complete repair projection | Continue to contract, engine, study and product stages. A zero improvement or a tie remains acceptable. |
| `conditional_only` | A useful graph is possible only with specific unsupported connectors, omitted measurements or post-repair assumptions beyond defensible source support | Publish the audited inventory and explicit assumption scenarios in the report. Default product shows evidence readiness; do not promote conditional reachability into the main verified comparison. |
| `inventory_only` | Topology, coverage, costs or record reconciliation cannot support a meaningful comparison after the bounded attempt | Deliver evidence inventory, cost/coverage findings and exact missing-data checklist. No fabricated graph, benefit percentage or automatic city switch. |

The gate is about input support, not whether Curb beats a baseline. Expose the supported result even when all strategies tie or all destinations remain unresolved. A reviewer can accept scoped historical model assumptions without claiming field validation. Record exactly which assumptions the result depends on.

## 5. Stage B: freeze a historical-case contract and reuse the engine

Current `src/contracts/curb/plans.ts` and `src/domain/curb/trips.ts` explicitly require synthetic evidence. The current repair maps to one barrier, while a physical repair project may fix multiple records. Do not cast real records to `synthetic`, weaken old endpoint validators, call a synthetic wrapper with historical evidence, or implement a separate unreviewed optimizer for this case.

Have the contract steward and domain owner serially agree a narrow extraction of the existing routing/subset logic into a **provenance-neutral internal kernel**. Keep `curb-r1`, `curb-r2`, existing URLs, fixtures, validation errors and output behavior unchanged. Existing wrappers validate their original contracts then call the shared kernel; a new `curb-case-v1` wrapper validates the historical envelope and calls the same kernel. Preserve old regression outputs and the active benchmark's pinned-source results. The historical case must never enter the synthetic benchmark aggregate.

Suggested new interfaces (freeze exact exports and paths before parallel work):

| Object | Required fields / rules |
| --- | --- |
| `CaseSource` | Stable ID, official URL, publisher, title/version, survey period, retrieval UTC, source hash/bytes, reuse note; locator includes one-based PDF page, printed page if present and table/record ID |
| `CaseObservation` | Source record ID, physical asset ID, raw type/value/unit/range, normalized value/range, source references, extraction/review state, unresolved/conflicting fields; never overwrite the raw record |
| `CaseSnapshot` | `contractVersion: curb-case-v1`, `caseId`, revision, `dataKind: historical_audit`, source/snapshot digests, policy, scope boundary, nodes/edges, distinct endpoints, assessments, assumptions, projects, coverage and feasibility state |
| `CaseProject` | ID, action, physical work group, observation IDs, explicit barrier IDs cleared, published estimate with currency/base year/source, priority source and value; unknown costs remain null and excluded |
| `CaseAssessment` | Edge ID; known blocking IDs; separate unresolved reasons; evidence basis and policy checks; post-repair requirements; derived status with explanation |
| `CaseRequest` | Allowlisted case ID, revision, snapshot/policy digest, fixed origin and budget cents; no client-authored costs, graph, thresholds or priorities |
| `CaseComparison` | Exact request/snapshot identity, empty-set baseline, all strategy selections/spend/per-destination outcomes and witnesses, omissions/singletons, unresolved/excluded counts, search counts, cost basis and claim status |

Use safe integer USD cents. Add an explicit `published_estimate` cost kind in the new case contract. Missing costs, unresolved totals, `REF` and under-construction $0 are not coerced to free; genuinely zero-priced work requires explicit source support. Do not introduce inflation adjustment as measured fact; keep all budgets in the same 2020 estimate basis.

A project clears an explicit set of barriers; the union of selected project effects is evaluated once. One physical defect split across graph segments can map to several blocker references but is costed once. Resolve overlapping work into documented, nonoverlapping atomic projects before freezing. Preserve linked component records and full scope/cost. Do not create cheaper partial projects without a supported estimate. If overlap or dependencies cannot be represented faithfully, exclude the project with a reason or fail feasibility; do not expand this slice into a general construction scheduling solver.

The kernel must honor all remaining blockers, directionality and unknowns. Never invent metre lengths from map pixels and present them as surveyed distances. Use recorded length or a separately labeled derived map-scale length; if length is only a deterministic witness-selection aid, disclose that and make no travel-time/detour claims.

## 6. Stage C: conduct the comparison and preserve proof

Freeze a reviewable `study-spec.json` and input hashes on a remote checkpoint **before comparative measurement**. Include all area-selection decisions, the policy/thresholds, graph, candidate work groups, exclusions, origin/endpoints, exact ordering/tie rules and budget formula. Amendments after first results require a new version and keep the original results; no silent favorable reruns.

### Strategies and objective

All methods receive identical case inputs, fixed origin, equal-weight distinct destinations, budget and eligibility. Optimize newly connected destinations relative to the empty-project baseline under the frozen historical policy. Tie-break by lower spend, fewer projects and stable code-unit project IDs. Enumerate all subsets of at most 12 eligible projects (at most 4,096) and retain actual feasibility/search counts.

Compare four strategies:

1. Curb exact subset search using the shared production kernel.
2. **Published-priority-first**: descending source priority, then lower cost, then stable ID; scan and skip unaffordable projects. Freeze the project priority aggregation before results (use maximum applicable source priority by default, record every component and the rationale). If any included project lacks a defensible source priority, exclude it uniformly from the primary comparison or declare this baseline unavailable; never silently replace priorities. Call this a reconstruction of a published-priority rule, not the college's actual spending decisions.
3. Cheapest-first: ascending cost, then stable ID, scanning affordable projects.
4. Greedy marginal connection gain per dollar: recompute gain after each selected project. Rank affordable projects by marginal gain/cost descending, then marginal gain descending, cost ascending, stable ID. Positive gain at zero cost ranks first; zero gain at zero cost has ratio zero. Continue through zero-gain choices until no affordable project remains, so complementary repairs can be completed. Compare ratios without avoidable floating-point ambiguity. Reuse a released metrics utility only if it implements these frozen rules; otherwise implement the case-specific baseline in its reserved path and disclose any difference from the synthetic study.

Do not call the published-priority baseline “condition-first”: its source includes expected use. A separate condition-only baseline is optional only if independently sourced ratings support it; do not invent severity scores merely to fit the old schema.

Use five frozen primary budgets: 0%, 25%, 50%, 75% and 100% of the summed eligible project estimates, rounded down to integer cents, deduplicated with the rule recorded. Default UI budget is 50%, chosen before results. Compute the exact cost/connection frontier from the same enumeration. If the case has no eligible costs, report that and do not manufacture a grid. A later explanatory budget may be shown with its selection reason, but all original primary cases remain visible.

### Outputs and uncertainty

For every budget/strategy, retain selected IDs in purchase order, spend, baseline and post-repair connected destination IDs, newly connected count, unavailable/unknown outcomes, route witnesses and relevant source assumptions. Include single-project and leave-one-selected-project-out evaluations to explain complements without inventing a story.

Primary metrics: absolute additional destinations versus each comparator, spend, wins/ties/losses over the declared budgets, and cost per newly connected destination (N/A when gain is zero). Budgets are related scenarios on one site, not independent trials or statistical evidence of general superiority. Percentage lift is optional and undefined when the comparator's gain is zero. Do not report people helped, realized savings, ROI, current accessibility or market-wide superiority.

Run cost sensitivity at each nontrivial primary budget: all costs ×0.75 and ×1.25, plus each project's cost alone ×0.75 and ×1.25. Round by a frozen integer rule and hold nominal budget fixed; rerun every strategy fairly. These are stress scenarios, not confidence intervals. Report changed selections, gain differences and whether a proposed headline survives.

For uncertain edges/measurements, retain conservative results with unknowns excluded. If useful, compute a separately labeled optimistic sensitivity with specifically enumerated unknowns treated as favorable. It is an upper scenario for the recorded graph, never observed access or a repair benefit. Do not turn unresolved topology into new edges even for this bound. A headline that depends on unknowns must name that dependency or remain unapproved.

### Independent audit

An independent verifier must:

- Recheck all credited route witnesses against source locators, topology, endpoints and project effects. This evidence audit is separate from mathematical correctness.
- Recompute every primary selection/spend/outcome and exact optimum using an independent BFS/reachability and subset enumeration that imports no production routing/search implementation. Check all candidate subsets for the bounded primary case, not only the winning selection.
- Verify baseline ordering, ties, project deduplication, boundary conditions, cost arithmetic, exclusions, all remaining blockers, unknown persistence, baseline subtraction and singleton/omission results.
- Reproduce deterministic inputs/results from a clean checkout at the reported source commit. Keep timestamps and performance timings outside deterministic hashes.
- Verify sensitivity outputs, result/report/UI consistency and artifact hashes. Never accept a developer-authored `verified: true` flag as proof.

The proof package contains source manifest, transcription ledger, graph/coverage/assumption ledgers, frozen spec, normalized input, raw engine outputs, all strategy results in JSON/CSV, sensitivity results, independent audit receipt, source/input/artifact SHA-256 manifest, actual commands/logs and a claim ledger. Each claim has exact supporting result IDs, scope, caveats and reviewer approval state. Store raw source caches outside Git; commit small factual inputs and reproducibility tooling with attribution. Rendering an optional report PDF is separate from validating its numeric contents.

## 7. Stage D: product experience and report

For an accepted `comparison_ready` case, add `/curb/case-studies/canada-college` using a small static dataset served through validated local endpoints. Suggested API: `GET /api/curb/cases/canada-college` for metadata, and `POST /api/curb/cases/canada-college/compare` for the request above. Allowlist the one case; no arbitrary URL/PDF ingestion. All computation uses the same frozen input as the proof package.

The page should answer the decision in this order:

1. **Context:** “Cañada College — historical 2020 audit case.” State survey year, estimate year, bounded area, fixed arrival point, endpoint meaning and whether results depend on inventory assumptions. Persistent copy: “Modeled repair effects; current conditions not verified.”
2. **Evidence:** show one real record with raw measurement/assessment, source page, proposed action and historical estimate. Use an attributed source excerpt if reuse is established; otherwise show a factual card with a source link. Do not attach the Princeton video as Cañada evidence or add generic photographs as site evidence.
3. **Budget decision:** the frozen budget controls, selected comparison rule and result cards showing named endpoints, newly connected count and spend. Show all four strategies; no hidden unfavorable outcomes. Display ties plainly.
4. **Why this package:** trace actual route witnesses on a schematic reconstructed from the audit, highlight cleared and remaining barriers, and show the computed consequence of omitting one selected project. Distinguish unresolved edges with text and pattern as well as color. Include a list/table alternative to the diagram.
5. **Evidence and limits:** coverage, excluded projects, assumptions, cost sensitivity and source links. “No supported comparison” must be a useful first-class state, not a loading failure or substitution with the synthetic fixture.
6. **Reviewable brief:** printable HTML plus downloadable JSON/CSV with exact snapshot identity, source locators, selected budget/projects, all comparators, metrics, assumptions and independent audit reference. Prefer the existing report/export facilities after explicit ownership transfer; no new document service is necessary.

For `conditional_only` or `inventory_only`, publish a compact evidence-readiness page/report using the same provenance model, identifying what the audit supports and which connectors/measurements/costs prevent a stronger conclusion. Do not show approved benefit cards. This remains a useful completed investigation; do not leave a fake success screen.

Support a direct stable link, reset to the frozen default, keyboard access, 390px reflow and 1280×720 presenter readability. Abort or supersede obsolete requests, validate response identity, and clear stale comparisons after budget changes. Distinguish validation, stale revision, unavailable case, server/data failure and network/cancellation; never fall back to synthetic data. The client does not author costs or import server/source-cache modules.

Add a navigation entry only through the current shell owner after release. A 30–45 second optional demonstration is: source record → budget → actual comparison → one route explanation → historical limitation. Provide measured wording to the existing presenter owner. Do not silently replace the active three-minute pitch or duplicate its script. Promote this case into the pitch only after its result is verified and the full pitch is rehearsed.

## 8. Proposed task sequence and literal scope families

These are proposed reservations, not existing assignments. The orchestrator must enumerate the exact files in each family before dispatch and avoid overlapping parent/child writers. Use new case-specific paths instead of writing the active synthetic metrics tooling.

| Task | Responsibility and proposed files | Start gate |
| --- | --- | --- |
| `CANADA-DATA/1` | Data lead: `docs/research/canada-case/{SOURCE_AUDIT,FEASIBILITY,TRANSCRIPTION,ASSUMPTIONS}.md`; `research/curb/canada-2020/{sources,observations,coverage,projects,graph,feasibility}.json`; `scripts/curb/canada-case/{acquire,normalize,validate-data}.ts` and named colocated tests | Fresh source/base, exact scopes and ACK; no product edits |
| `CANADA-DATA-REVIEW/1` | Independent reviewer: `docs/research/canada-case/DATA_REVIEW.md` and `research/curb/canada-2020/data-review.json`; reads original sources and proposed records | Data candidate published/stopped; findings may send it back for a bounded correction |
| `CANADA-CONTRACT-KERNEL/1` | Serial A/domain maintenance: new `src/contracts/curb/cases.ts`, new `src/domain/curb/planning-kernel.ts`, necessary named tests and bounded edits to `src/domain/curb/{plans,trips}.ts`; historical wrapper `src/domain/curb/cases.ts` | Feasibility reviewed; active metrics source pinned; exact shared-file reservation; contract/kernel freeze before consumers |
| `CANADA-STUDY/1` | Study author: `research/curb/canada-2020/study-spec.json`; `scripts/curb/canada-case/{run,baselines,sensitivity,report}.ts` and tests; `src/data/curb/cases/canada-college.json`; author result artifacts under a private author-run directory | Reviewed inputs and frozen contract; publish spec/input hashes before comparisons |
| `CANADA-PROOF/1` | Independent verifier: `scripts/curb/canada-case/{oracle,audit}.ts` and tests; `docs/research/canada-case/VERIFICATION.md`; official `reports/curb/canada-2020/` package assembled from checked author outputs | Frozen inputs and published implementation; reviewer alone authors audit/approved-claim state |
| `CANADA-API/1` | API/transport: exact new case GET/POST route files, `src/server/curb/cases.ts`, `src/client/curb/fetchCase.ts`, named integration tests | Feasibility and contract freeze; can work against the pinned reviewed snapshot while independent proof proceeds |
| `CANADA-UI/1` | UI lead: `app/curb/case-studies/canada-college/page.tsx`; enumerated components/styles/tests under `src/features/curb/case-study/`; permitted new case assets only | Frozen API/metadata; no active survey/presenter file edits; approval display waits for proof |
| `CANADA-INTEGRATE/1` | Existing integration owner: exact final merge/check/browser/release scope; existing presenter receives verified case brief | Authors and children stopped/released, reviews complete, hashes agree |

No root manifest, lockfile, deployment config, shared contract barrel, shell or active report verifier edits are implicit. If a package script or shared seam is necessary, name it in a serial maintenance request and preserve existing owners. Use installed tools/dependencies and direct TypeScript CLI entry points where possible. The data task may use a small Python extraction helper if already available, but the published normalized case and verifier must run without a private local cache or undocumented workstation setup.

Independent study/proof paths must be disjoint from active `scripts/curb/metrics/`, `benchmarks/curb-metrics/`, presenter metadata/assets and existing report scripts. Reuse released utilities by import when appropriate; do not amend the benchmark's preregistered inputs. Contract/kernels must preserve exact legacy semantics and existing benchmarks before any case release.

## 9. Acceptance, release and cut order

Required acceptance evidence:

- Official source bytes/version/locators verified; every used record reviewed; uncertain fields and licensing/attribution status recorded.
- Complete graph/reference validation, distinct endpoints and explicit boundary/coverage. No unknown-to-pass conversion, fabricated repair costs, duplicate physical work, mistaken subtotals, or undocumented project grouping.
- Old R1/R2 validators and fixtures behave identically; the independent synthetic benchmark remains reproducible at its own source checkpoint. Multi-barrier and multi-edge project effects have meaningful tests.
- Tests reject tampered source/input hashes, mismatched page/record mapping when detectable, stale snapshots, foreign IDs, malformed/overflowing/negative costs, excluded-cost selection and unsupported statuses. Human source review covers what automated validation cannot prove.
- Independent oracle agrees for every primary case/subset, all baseline outputs, witnesses, singleton/omission results and sensitivity scenarios. A deliberate corrupted artifact fails verification.
- Actual API/browser checks cover budget switching, reset, stale response, error/cancellation, unknown/zero-gain/tie states, source opening, printable/downloaded outputs, keyboard and reflow. Displayed values match the checked raw response.
- Run meaningful targeted checks, then required `npm run check` and repository CI at the final combined source. Record actual commands/results; worker reports are not integrated or deployment proof.
- Follow scoped commits/pushes and verify remote SHAs. The existing publisher handles any authorized release and the existing checker verifies the deployed case and regressions. Record source SHA, deployed SHA/tree, health and live browser evidence separately. No second deploy operator or checker.

Final deliverables are the accepted feasibility decision, source/data package, reproducible study and independent proof, working case page or explicit readiness result, printable brief, claim ledger, exact source/input/artifact/remote SHAs, actual check evidence and a short presenter handoff. The final conclusion must state whether data support a comparison, which result was observed, which assumptions change it, and what remains unverified.

Prioritize source/coverage validation, correct cost/work mapping, an honest executable comparison and reproducible proof. Cut extra areas, polished maps, photographs, arbitrary origins, additional metrics and PDF styling before these. Do not spend the available time digitizing the whole campus. If data fail the gate, finish the inventory/limitations deliverable and stop comparative product work; do not relabel the failure as a completed investment proof or improvise another city's case without a new decision.

Acceptable measured statement after verification: “For this documented 2020 audit subnetwork, these candidates, this policy and this budget, Curb selected [IDs] at [historical estimate], producing [count] additional modeled connections versus [comparator result].” Use actual filled values only after the result exists. If the policies or assumptions support a narrower statement, narrow it. No study outcome is prewritten by this plan.
