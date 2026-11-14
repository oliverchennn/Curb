# Curb implementation plan

Prepared for HackPrinceton Fall 2026. Three developers, including one orchestrator, with separate coding agents. Target: Business and Enterprise.

**Build a small foundation first, review it together, and then choose the next working slice. Only the foundation tasks below are ready for initial dispatch. The later roadmap is a menu for the orchestrator, not permission to build everything at once. Sponsor additions require Vincent's decision before they become implementation tasks.**

## 1. Product direction and winning demo

Curb helps a campus facilities team decide which accessibility repairs to fund. It connects observations about individual barriers to the routes those barriers interrupt. The business decision is: **given this budget, which repairs restore the most useful connections, and what evidence supports the recommendation?**

The initial customer hypothesis is a campus facilities or capital-planning manager working with disability services. Disability services provides route priorities and user feedback; facilities owns the repair workflow and budget. Test this hypothesis during the event. A conversation with a real user is more valuable than an invented market-size slide.

The intended eventual demo is a small surveyed Princeton area: inspect evidence for a barrier, compare a condition-first repair plan with a connectivity-aware plan at the same budget, and see a previously disconnected destination become reachable in the planning model. Export a reviewable repair brief. A real photograph proves an observation; the repair and resulting network are a **what-if simulation**, not a claim that construction occurred.

The original concept included automated legal applicability, continuous phone sensing, multiple mobility profiles, a transition-plan inventory, and routing. That is too broad for this build. Keep the core insight, then earn each additional capability through a working increment.

### What the rubric rewards

The onsite packet names Creativity, Utility, Charity, and Avidity. It publishes no numerical weights for these four. Business and Enterprise includes tools that improve business management, dashboards, and analytics. The following is our implementation strategy, not an official scoring formula.

| Criterion | Evidence Curb should show | Build consequence |
|---|---|---|
| Creativity | The most damaged curb is not necessarily the highest-value repair; two repairs can matter only when combined | Build and verify the graph counterfactual, not just a defect heatmap |
| Utility | A facilities manager can inspect evidence, change a budget, compare plans, and export a usable brief | One complete workflow beats a broad dashboard |
| Charity | Named destinations and trips that become possible, with uncertainty visible | Show who the restored connection serves; do not invent beneficiary counts |
| Avidity | A clear two-minute story, thoughtful design, real local evidence, and credible next steps | Reserve the last hours for reliability and rehearsal |

The strongest claim is “better repair decisions from the same evidence and budget.” Do not claim guaranteed safety, legal compliance, financial ROI, or population-level impact from a weekend prototype.

## 2. The first build is deliberately small

Target **2–3 working hours after kickoff**, with a short serial bootstrap before three parallel tasks. If setup takes longer, reduce scope rather than moving the event deadline.

### What the user can do at the foundation checkpoint

1. Open `/curb` locally without credentials.
2. Load one clearly labeled synthetic example through a real local API.
3. See a small sidewalk-network schematic, destinations, and a barrier list.
4. Select a barrier from the list and inspect its linked evidence note.
5. See counts computed from the example data and explicit loading, empty, and error states.
6. Reload or reset the example and get the same result.

Use roughly 8–12 nodes, 10–16 explicit edges, 3–4 destinations, and 4 barrier records. Exact counts are chosen in bootstrap and come from the fixture; they are not hardcoded into the UI. A text evidence note is enough for the foundation. An authored diagram must be labeled as an illustration.

### Not in the first build

No AI calls, phone capture, slope estimation, route solver, optimizer, legal standards engine, user accounts, database, background workers, external map tiles, sponsor SDKs, messaging, or export system. Do not add empty interfaces, dormant dependencies, fake “AI analysis,” or placeholder buttons for those future features.

The foundation demonstrates the product's structure. It is **not** the competitive MVP. At its checkpoint the team chooses the next slice.

## 3. Team structure

There are **three humans total**, not an orchestrator plus three additional developers.

| Human lane | Agent arrangement | Human responsibilities | Implementation lane |
|---|---|---|---|
| Dev A, technical lead and orchestrator | One coordinator conversation plus a separate implementation lead `agent-a`, which spawns coding subagents | Scope, contracts, integration, dependency changes, final release decision | Bootstrap, API, transport, integration checks, later exports/provider boundary |
| Dev B, domain and field-evidence lead | Implementation lead `agent-b` with coding subagents and an optional read-only reviewer | Ground the graph, gather/verify local evidence, challenge the algorithm | Pure domain functions, graph, repair evaluation, data fixtures |
| Dev C, experience and demo lead | Implementation lead `agent-c` with coding subagents and an optional read-only reviewer | User workflow, visual quality, accessibility of the interface, demo rehearsal | Product page, evidence/review UI, map presentation, later scenario controls |

Vincent chooses product direction and sponsor scope. Map actual names and GitHub logins to A/B/C at kickoff. Do not guess accounts or assign Oliver a lane simply because he owns the toolkit.

**The coordinator does not write application code while coordinating.** It assigns Dev A's implementation work to the separate A worker, just as it assigns B and C. Humans review output and make product decisions; workers implement bounded tasks.

**Each developer lead is expected to deploy implementation subagents.** Start with up to two concurrent coding children per lane, one child level deep, and an optional read-only review agent. This is an initial coordination budget, not a platform limit. Use fewer children for a tiny or sequential task. The three human developers remain accountable for their lanes.

Use ordinary coding-agent sessions with native subagents enabled, plus the shared task board and isolated worktrees. The inspected kit's custom worker launcher explicitly disables children, so it is **not the default launcher for this plan**. Reuse the kit's application modules and collaboration templates independently. Automated cross-computer dispatch can be added after a separate runner change and live rehearsal; setting `maxChildren` alone does not enable it.

Dev A has two distinct sessions: the team coordinator and A's implementation lead. The coordinator assigns lane outcomes; each lane lead splits its own implementation work, spawns children, reviews their results and returns one integrated lane result. Coding children do not independently take team-level tasks or write outside their parent's lane.

## 4. Folder ownership

Use the kit's generated Next.js project layout. Imported kit files stay separate from Curb code. The coordinator records ownership in `docs/OWNERSHIP.md`, and active task state in `docs/TASK_BOARD.md`; branch copies are snapshots, not ownership locks.

| Path or exact file | Accountable lane | Rules |
|---|---|---|
| `package.json`, `package-lock.json`, root configuration files, `.env.example`, `.gitignore` | A's separate bootstrap/maintenance agent | Serialized changes; no B/C dependency installs that modify tracked files |
| `.github/`, `.codex/`, `tools/agents/`, `orchestration.json`, `orchestration.install.json` | A maintenance agent | Coordination infrastructure; leave imported runtime unchanged during product work |
| `src/contracts/curb/` | A contract agent | Versioned Zod schemas and golden examples; reserve after bootstrap |
| `packages/`, `modules/`, `kit.project.json` | A import steward | Imported kit code is read-only to ordinary feature workers; prefer Curb wrappers |
| `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/error.tsx`, `app/not-found.tsx` | A shell agent | Initial shell only; C uses scoped styles and `/curb` |
| `app/api/curb/`, `src/server/curb/`, `src/client/curb/` | A worker | HTTP validation, service composition, browser transport, later provider/export boundaries |
| `src/domain/curb/` | B worker | Pure functions and colocated tests; no React, provider SDKs, or server I/O |
| `src/data/curb/` | B worker | Synthetic cases, later real survey records, source manifest and graph revisions |
| `app/curb/`, `src/features/curb/`, `public/curb/` | C worker | Product UI, scoped CSS, public approved evidence assets; no API handlers |
| `tests/integration/`, `tests/e2e/` | A verification agent | Integrated workflow checks; C can suggest cases without writing here |
| `docs/` except the two folders below | A coordination/documentation agent | Plan, decisions, contracts, ownership, acceptance and release notes |
| `docs/research/` | B | Field observations, interview notes, data sources; sensitive notes kept outside public commits |
| `docs/demo/` | C | Demo script, rehearsal results, screenshots approved for publication, submission draft |

Do not assign a task the broad `app/`, `src/`, `docs/`, or `public/` directory if another task owns a child. Automated tasks use literal paths/prefixes supported by the runtime, not globs. For example, A may own `docs/TASK_BOARD.md` but never an overlapping `docs/` scope while B is writing `docs/research/`.

A folder steward is accountable over the event; the task board identifies the one writer for each file now. A lane lead subdivides its folders among children using the table in section 7; ownership of a lane does not permit its parent and children to write the same file concurrently. If a task needs another lane's file, it sends a change request containing the path, purpose, and proposed interface. The orchestrator either creates a serial task for its owner or transfers ownership after the old writer stops. No drive-by edits.

### Shared-file maintenance

Package files, shared contracts and infrastructure remain A-owned, protected paths. Bootstrap them before parallel implementation starts. Later shared changes go to a separately scoped A maintenance agent while affected writers are stopped; the coordinator remains read-only. Review the commit, update the common base and contract version, then resume. With normal agent sessions these boundaries are task/checkout rules, not a claim of automatic enforcement by the kit. If the managed runner is adopted later, preserve its reserved-path checks too.

## 5. Kit reuse and bootstrap

Inspected source: `oliverchennn/hackathon-kit`, commit `22a5f44a27375e88ac2cd1754f6976704f725bc5`. Pin that revision for reproducible planning; compare any newer revision before upgrading. The orchestration guide still discusses a feature branch, but this inspected `main` tree already contains `tools/agents/`, the installer and coordinator role. Use the verified source revision rather than assuming a branch named in prose is required.

| Kit component | When to use | What it provides | Curb still needs |
|---|---|---|---|
| `web` starter, shared runtime/contracts | Foundation | Next.js/TypeScript skeleton, validation conventions, check scripts | Curb schemas, UI and API |
| `maps` | Foundation | GeoJSON conversion and credential-free SVG schematic | Selection UI; later accessibility topology and route computation |
| Collaboration templates; optional `tools/agents` | Templates in foundation; managed runner deferred | Ownership/task conventions; the current runner supports three workers but disables their children | Native subagent sessions now; runner modification and live verification before automated dispatch |
| `media` | Only after the evidence-capture slice is chosen | Browser preprocessing, sampled frames, image analysis adapter and overlays | Curb labels, review flow, location matching and evaluation |
| `analytics` | Later only if its charts/CSV utilities save time | Basic statistics, charts and additive allocation examples | A graph-dependent repair optimizer; do not reuse its additive benefit objective |
| `exports` plus its `documents` dependency | Later export slice | Safe CSV and evidence-linked PDF utilities | Repair-brief content and evidence projection; photo-rich layout is extra work |
| `ai` | Only if a selected product slice needs structured text/tool work | Provider interfaces and bounded generation patterns | Actual Curb tools; its supplied tool example is not a repair agent |
| `integrations` | Only after a relevant sponsor decision | Integration patterns and some named adapters | No Photon adapter is provided; any Photon work is new |

Do not choose the `full` recipe. Do not install Supabase, retrieval, realtime, voice, Python, or jobs merely because they are available. The first slice needs only `web` plus `maps`.

### Bootstrap task F0, Dev A's separate agent, 30–45 minutes

1. Inspect the current Curb checkout if one exists: status, branch, local instructions, existing routes, and functioning features. Preserve it. The supplied toolkit is a dependency source, not evidence that a Curb repository already exists.
2. For an empty new project, create from the pinned kit. For an existing app, use the kit's plan/add workflow and preserve current functionality; never generate over a nonempty directory.
3. Establish the folders and interfaces in sections 4 and 6. Add the single synthetic golden scenario, a tiny empty scenario, and one invalid-reference example. No future feature scaffolding.
4. Create the `/curb` mount stub that C will replace, API/transport stubs that A will replace, and pure function stubs that B will replace. They must compile and clearly return the sample or an explicit unavailable state, not fake functionality.
5. Record actual names, write scopes, acceptance checks, and the foundation-only scope in the task board. Check the generated scripts; the kit's `check` script already includes typecheck, tests, and build.
6. Run `npm run check`, save the baseline, and record its **actual** full Git SHA. This is the common base for F1A/F1B/F1C.

Example setup commands for a new project, executed by the bootstrap agent after inspecting paths:

```sh
git clone https://github.com/oliverchennn/hackathon-kit.git hackathon-kit
cd hackathon-kit
git checkout 22a5f44a27375e88ac2cd1754f6976704f725bc5
npm ci
npm run kit -- create ../curb --starter web --modules maps
```

Follow the generated README to install/lock the generated app. If a lockfile exists use `npm ci`; if creation has not produced one, generate and review it with `npm install` once, then use `npm ci` on the other machines. Preserve MIT and third-party notices and record kit reuse in the submission. Confirm event reuse requirements with organizers at kickoff; the packet's public-repository rule is not itself blanket permission for every prebuilt feature.

Do not install or start the custom `agents worker` runner for this initial nested-agent workflow. Its source disables native children. Use the ordinary agent environment on each developer's machine, verify that it can spawn a child, and keep the kit modules independent of the launcher. Do not spend the foundation timebox redesigning orchestration. Section 11 describes the optional later runner work without claiming it is implemented.

## 6. Foundation contracts

Finalize these contracts during F0; avoid designing a production platform now. Names below are implementation requirements, not a claim that these functions already exist in the kit.

### Data contract v0

| Record | Required information |
|---|---|
| `Scenario` | `schemaVersion: 1`, ID, revision, title, `dataKind: synthetic | field`, nodes, edges, destinations, barriers, evidence |
| `Node` | ID, `[longitude, latitude]`, optional label |
| `Edge` | ID, from/to node IDs, explicit LineString geometry, positive length in meters, `bidirectional`, linked barrier IDs |
| `Destination` | ID, label, node ID |
| `Barrier` | ID, edge ID, kind (`missing_ramp`, `obstruction`, `surface_issue`, `unknown`), `reviewStatus` (`pending`, `accepted`, `rejected`), evidence IDs, note |
| `Evidence` | ID, kind (`note` or `image`), origin (`synthetic` or `field`), caption/note, optional public asset path, optional observation timestamp and source attribution |
| `ScenarioView` | Validated scenario plus counts derived from its arrays; no invented accessibility or savings metric |

Use stable string IDs and ISO timestamps. Unknown measurements remain absent/null, never zero. Coordinates are `[longitude, latitude]`. Check unique IDs, valid coordinate ranges, endpoint references, barrier-edge consistency and evidence references. Lines crossing visually do not create graph connections unless they share an explicit node.

Do not add legal status, inferred slopes, person counts, repair costs, live model confidence, or optimization fields in v0. Add them only when the next approved slice needs them, with explicit units and provenance.

### Function and HTTP seams

| Owner | Contract | Behavior |
|---|---|---|
| B | `buildScenarioView(scenario): ScenarioView` | Validate relationships and derive counts, with no I/O |
| B | `getBarrierDetail(scenario, barrierId)` | Return barrier plus referenced evidence; explicit not-found result |
| A | `GET /api/curb/scenario?dataset=sample` | Return one validated `ScenarioView`; `dataset=empty` supports the empty-state check; unknown dataset returns 404 |
| A | `fetchScenario(dataset, signal): Promise<ScenarioView>` | Typed browser transport; validate response; abort and report errors |
| C | `CurbScreen` | Fetch through A's transport and render data; keep selected barrier ID in component state |

API envelope: success `{ok:true,data:ScenarioView}`; failure `{ok:false,error:{code,message}}`. Schema mismatch is a visible error, not a fallback to sample data. `getBarrierDetail` may be used client-side because it is pure. No client import from `src/server/`, provider modules or Node libraries.

### Storage and rendering in v0

One immutable versioned JSON example on disk, loaded by server code; selection is local React state. No shared mutable server-global session. Reset reloads the same fixture and clears selection. `GeoMap` renders the schematic; the supplied component does not promise pin-selection callbacks or raster tiles. Use the barrier list for selection initially. C can build a Curb wrapper later instead of changing kit internals.

## 7. Exactly how the initial parallel work is split

All three tasks start from the verified F0 SHA and agreed contract. Each gets one branch/worktree, its own allowed paths, and a 60–90 minute task budget. The initial team plan contains these tasks only; each lane lead delegates the child tasks below. F2 integration is a separate task after they are reviewed and merged, so it can reference the real integrated SHA.

| Task | Agent and exclusive scope | Build now | Acceptance and handoff |
|---|---|---|---|
| **F1A API and transport** | `agent-a`: `app/api/curb/`, `src/server/curb/`, `src/client/curb/`, `tests/integration/` | Read sample/empty data, call B's agreed pure interface, validate request/response, implement fetch cancellation and explicit errors | Sample works; unknown dataset gives 404; malformed responses do not silently render; provide endpoint output and actual check result |
| **F1B domain and example** | `agent-b`: `src/domain/curb/`, `src/data/curb/` | Implement v0 relationship validation, counts and barrier/evidence lookup; refine the example within the golden contract | Duplicate IDs, dangling edge/evidence references and empty input are handled; counts match arrays; no routing or optimization |
| **F1C product screen** | `agent-c`: `app/curb/`, `src/features/curb/`, `public/curb/` | Render map, barrier list, evidence panel, sample label, reset and loading/empty/error states; scoped styles | Selecting each barrier shows its evidence; keyboard selection works; long notes do not break layout; no dead future-feature buttons |

### Initial subagent assignments within each lane

F0 stays serial: A's implementation lead delegates bootstrap to one child, waits for its result, reviews and commits the verified baseline. Do not parallelize shared schema/package setup. Once that baseline exists, the following six implementation children can work concurrently across the three lanes.

| Parent | Child task | Exclusive write scope | Output |
|---|---|---|---|
| A implementation lead | **A1 server/API** | `app/api/curb/`, `src/server/curb/`, `tests/integration/server/` | Sample/empty GET endpoint, request/response validation and endpoint checks |
| A implementation lead | **A2 client transport** | `src/client/curb/`, `tests/integration/client/` | Typed fetch adapter, abort/error handling and transport checks against the frozen envelope |
| B implementation lead | **B1 domain functions** | `src/domain/curb/` | Relationship validation, counts, evidence lookup and colocated domain tests |
| B implementation lead | **B2 example data** | `src/data/curb/` | Small synthetic/empty/invalid-reference cases and data-focused tests; no shared-schema edits |
| C implementation lead | **C1 screen/map** | `app/curb/`, `src/features/curb/screen/`, `src/features/curb/map/` | Page composition, fetch/loading/error/reset flow, map, counts and barrier selection list |
| C implementation lead | **C2 evidence panel** | `src/features/curb/evidence/`, `public/curb/` | Evidence detail, review-status display, empty selection and scoped styling/assets |

F0 freezes the public imports and component props needed here. In particular, C1 passes `BarrierDetail | null` to C2's exported `EvidencePanel`; C2 reads no server code and changes no selection state owned by C1. Avoid shared barrel/index files that both children must edit. A1/A2 work against the same API envelope; B1/B2 work against the same golden schema and explicit function signatures.

Each child receives the actual base SHA, contract version, allowed paths, acceptance cases, non-goals and return format. Prefer a separate worktree per coding child. If the native agent environment shares a worktree, use strictly disjoint paths, prohibit children from staging/committing/changing branches, and let the parent manage Git only after every child has stopped. A parent must not merge, rebase or change the checkout underneath active children.

The parent waits for its children, inspects all diffs, integrates their commits or patches into its lane branch, runs the lane checks, and returns one reviewed result to the team coordinator. Only then does team-level F2 integrate A/B/C. A child failure stays with its parent; do not reassign its files while the process may still be writing. Stop all descendants when cancelling a lane. Read-only review can run concurrently; fixes require a new exclusive writer assignment.

Children may investigate and implement within the current slice, but cannot spawn grandchildren, broaden the feature scope, approve sponsor additions, or merge/release the product. The coordinator tracks three lane outcomes; lane leads track the six child assignments. This keeps small tasks parallel without turning them into six independent product directions.

B and C work against the same F0 examples and interfaces; neither waits for A's live endpoint to be finished. Temporary UI data access is injected through the agreed transport seam or contract fixture. Remove any temporary direct fixture path during integration; the final checkpoint must use the real endpoint.

**F2 integration, A separate verification agent, about 30 minutes:** review B, A and C diffs, merge sequentially, run the integrated checks once, and exercise sample → select barrier → inspect evidence → reset, plus empty and failed-load states. If a branch fails, send a small correction task to its owner rather than rewriting their files in the coordinator session. Tag or record a foundation checkpoint.

### Foundation stop condition

Once F2 passes, **stop feature dispatch**. Show Vincent the running screen, the exact implemented behavior, remaining bugs and three next-slice choices. Do not start the full roadmap because tokens or time remain. The next plan is based on feedback from this screen.

Suggested checkpoint question: “The foundation works. Should the next slice prove route impact first, improve evidence capture first, or change the workflow?” Recommend route impact unless the user feedback indicates the workflow is wrong.

## 8. How the orchestrator runs subsequent iterations

Each iteration has one visible outcome and usually one task per lane, lasting 45–90 minutes. The orchestrator keeps at most one future iteration described, rather than a large automatically dispatched backlog.

1. Show the current build and actual test/demo evidence.
2. Name the largest gap against the two-minute story.
3. Propose a single next outcome, its task scopes, time budget, cut option and rationale.
4. Record Vincent's direction. Sponsor work is still separately gated.
5. Freeze only the interfaces needed for this slice, assign exclusive writers, and run in parallel.
6. Review/merge, verify on the integrated SHA, show the result, and repeat.

Use the current selected slice as the authority for child delegation; do not seek a new product decision for every internal subtask. Stop for Vincent's next-slice direction at the agreed checkpoints. If the optional managed runner is adopted later, its human `/approve VERSION` control also applies. Update dependent tasks to the newly verified base SHA; never invent SHAs.

Every task card includes: ID; visible goal; owner; full base SHA; contract version; literal allowed paths; forbidden shared paths; dependencies; non-goals; acceptance examples; configured check IDs; timebox; rollback/cut option. Reports give commit, changed files, actual checks, demo steps, limitations and requests for the other lanes. “Agent finished” does not establish passing tests, an integrated build or a deployment.

A separate review agent may inspect a completed branch read-only. It cannot quietly edit files owned by the writer. To implement its findings, dispatch a bounded follow-up task. Keep review small enough that it does not become a second design process.

## 9. Roadmap after the foundation

These are **proposed increments**, not initial task assignments. The orchestrator selects one at each checkpoint. Technical detail is provided so the team has a coherent direction without prebuilding all of it.

### Slice R1: Show why a barrier changes a trip

**Visible outcome:** choose one origin and destination; show a route through the known graph or explain why no verified route is available. Toggle one barrier in a clearly labeled repair simulation and recompute.

| A | B | C |
|---|---|---|
| Add validated route/evaluation endpoint and transport | Build directed adjacency, reachability and shortest path; tests for disconnected/unknown edges | Origin/destination selection, before/after route display, readable failure reason |

Use explicit walkway, crossing and entrance edges. A missing curb belongs to a transition/crossing edge, not the entire neighboring road. Do not infer accessible topology from a generic walking-direction API. Handle direction and slope separately if slope is eventually added.

Start with one documented mobility scenario whose restrictions a reviewer chooses. Edge result is `pass`, `blocked` or `unknown`. Conservative routing excludes unknown edges; optional exploratory display may show them distinctly but cannot label them verified. A photo showing no visible barrier does not verify every property of an edge.

Shortest-path cost is length for now. The essential tests are directionality, disconnected nodes, unknown-data handling, and an edge with two blocking conditions where clearing one does not clear the other. A repair changes a separate scenario projection; it never overwrites observed conditions.

### Slice R2: Prove the repair-budget insight

**Visible outcome:** same budget, two plans, visibly different restored connectivity. This is the core Business-track payoff and should precede secondary AI features.

| A | B | C |
|---|---|---|
| Add plan request/result schema and endpoint; snapshot/version checks | Implement bounded exact subset evaluation and a fair condition-first baseline | Budget input, selected repairs, before/after comparison, why-this-repair detail |

Start with one origin and equal-weight destinations. Let `Reach(S)` be the set of destinations reachable on verified traversable edges after applying repair set `S`. Maximize `|Reach(S) \ Reach(empty)|` subject to `sum(cost(S)) <= budget`. Break ties by lower cost, fewer repairs, then stable ID order. Costs are integer cents with source/status (`assumed`, `quoted`, or `unknown`); unknown-cost repairs are not silently free. Label all invented costs and results as scenario assumptions.

Use at most **12 candidate projects**, giving at most 4,096 subsets. Cache feasibility/reachability by repair-set mask and scenario revision. Benchmark on the demo laptop; aim for under one second on the chosen small graph. If the bounded engine is too slow, reduce the scenario or move computation off the UI thread. Do not claim global optimality for a larger unsearched problem.

Recompute the graph for each feasible set. The kit's additive allocation solver cannot model complementary repairs correctly. Cut vertices/bridges are useful explanations but are not themselves the full repair optimizer, especially when blocked edges are being restored.

Condition-first baseline: sort the same eligible projects by documented condition severity, then lower cost and stable ID; add affordable projects under the same budget and constraints. Compute its outcome with exactly the same graph evaluator. Baseline ordering, costs and reachable destinations must all be visible.

**Required synthetic regression:** origin O connects through blocked link A to a middle node, then blocked link B to two destinations. A and B each cost 2 scenario units. A alone and B alone restore nothing; together restore two destinations at budget 4. A separate worse-rated project C costs 4 and restores one destination. The exact engine chooses A+B; condition-first chooses C. Test this as an authored case, never claim those values were observed on campus.

Other tests: zero budget, affordable empty choice, ties, a repair that clears only one of two blockers, mutually incompatible projects if supported, and invalid costs. Do not add dependencies/exclusions until an actual case needs them.

### Slice R3: Replace the illustrative map with real evidence

**Visible outcome:** inspect actual observations from a bounded Princeton corridor and understand which parts of the graph were reviewed. This may overlap R1/R2 as human fieldwork while agents implement, but data integration is still a separate slice.

Dev B conducts a short daylight survey with a teammate where practical: roughly 10–20 meaningful observations, a few destinations, wide-context and close-up photos, date/time, manually confirmed edge assignment, and notes on what was not measured. Choose public access routes and building entrances deliberately. Record temporary obstructions with timestamps; do not generalize them to permanent defects.

Use observed geometry or an appropriately attributed/licensed pedestrian-data extract as a starting point. Manually check actual crossings, both curb transitions and destination entrances. GPS proximity alone is insufficient for snapping a photograph to the correct side of a street. Mark uninspected properties unknown. Count restored connections only within the surveyed graph; do not imply the campus beyond that area is fully mapped.

If no genuine local example shows the intended improvement, use the real survey to demonstrate evidence handling and a separate labeled synthetic scenario to demonstrate optimization. Do not relabel synthetic faults as real to improve the pitch. A manual authoritative observation remains valid even if no AI feature ships.

Human discovery: ask a facilities/accessibility stakeholder how repairs are requested, how priorities are set, what evidence is required, and whether a connected-destination comparison changes a decision. Record what changed in the product. With permission, retain a short quote. No fabricated interviews or inferred endorsements.

### Slice R4: Add bounded survey assistance

**Visible outcome:** upload a photo or short video, get a proposed barrier observation with linked frame/time, and accept/correct/reject it before it affects the planning graph.

| A | B | C |
|---|---|---|
| Install the reviewed media module; add server-only provider boundary, request limits and cancellation | Define small label set, evidence-to-edge review logic, provenance and held-out examples | Local preview, selected frames, progress, correction UI and pending-review states |

Start with one image before video. Vision proposes `missing_ramp`, `obstruction`, `surface_issue` or `unknown`; outputs are observations for review, not legal conclusions. Avoid deriving exact slopes, widths or small step heights from ordinary moving video. Phone orientation is not surface grade without a calibrated measurement setup.

The kit can sample up to 12 frames, but begin with at most six. Send bounded individual compressed frames through the endpoint rather than a 50 MB video body. Suggested prototype caps: one JPEG under 512 KB per request, request body under 1 MB, two concurrent frame analyses, six frames per survey. Validate decoded data, reject oversized/malformed input, expose cancellation and provider errors, and put keys only on the server. Select and smoke-test a currently available vision-capable model on the actual account; coding-agent subscriptions do not supply application API credit.

The kit's confidence value is uncalibrated. Label it as model confidence, not probability of accessibility or survey accuracy. Keep `executionMode: fixture | live | replay` separate from data origin and human review status. No silent replay after a live failure. Record source image/frame, model/prompt version, observation time, review action and matched edge.

For a hosted live endpoint, A adds a bounded team-demo access gate and request quota before exposing paid calls. The public judge view can remain read-only. This is separate from implementing a full account system.

Assess a small hand-labeled held-out set with useful negatives and uncertain examples. Report actual count-based results and failure cases, not unsupported “95% accurate” claims. If live vision is unreliable, retain manual evidence entry and clearly label any saved replay used in the demo.

### Slice R5: Finish the business handoff

**Visible outcome:** export the chosen repair scenario with evidence, assumptions, estimated cost, restored destinations and verification needs.

A adds the `exports` module only now; B supplies deterministic plan/evidence projection; C provides the preview and download action. Start with CSV plus a print-ready summary if that is the fastest usable handoff. The kit PDF renderer expects documents/citations; normalize observation notes into that model and link photographs. It is not already a photo-rich engineering report.

Call it a repair-planning brief or draft inventory. A weekend export is not a certified survey or complete statutory transition plan. Keep source scenario revision, selected mobility assumptions, unresolved data, and hypothetical repair effects alongside the results.

## 10. Architecture as it grows

Use one TypeScript/Next.js application. Runtime flow: browser UI → typed HTTP boundary → deterministic domain functions → immutable scenario/evidence data. Later, image assistance is a separate server adapter that proposes evidence. The browser never calls a secret-bearing provider directly.

The domain engine remains independent of AI, databases and sponsor products. That permits a credible demo when a model or network fails and prevents probabilistic output from defining graph correctness. Use versioned schemas at every boundary. Reserve a session-local scenario state for what-if edits; add durable storage only if an actual selected workflow requires shared persistence.

If a later review slice allows edits, preserve the original scenario and record reviewed overrides against its revision. Reject stale revisions or recompute before exporting; a budget result for yesterday's graph must not appear as a result for today's graph. Model proposals never directly mark an entire route accessible.

No numeric legal thresholds are needed to win this demo. If the team later adds standards references, a human selects the applicable policy and a deterministic ruleset checks properly measured inputs. The Access Board's PROWAG page lists distinct adoption contexts, including DOT transit-stop standards and GSA adoption; a generic “2023 PROWAG applies everywhere” rule is unsound. Preserve source/version/applicability context and describe unmeasured cases as needing review.

## 11. Operating the agents

**Default: three ordinary developer lead sessions with native subagents, plus the separate team coordinator on A's computer.** No custom worker launcher is required. Each developer uses their own local accounts and project checkout. Keep credentials out of shared prompts and the repository.

| Computer | Session and prompt | Delegation |
|---|---|---|
| A | Team coordinator: `START_ORCHESTRATOR.txt` | Assigns lane outcomes, maintains ownership and decisions; no application-code writing |
| A | Separate implementation lead: `START_DEV_A.txt` | Serial bootstrap child, then A1 API and A2 client children |
| B | Implementation lead: `START_DEV_B.txt` | B1 domain and B2 data children |
| C | Implementation lead: `START_DEV_C.txt` | C1 screen/map and C2 evidence-panel children |

Before feature work, each developer verifies actual native child spawning and completion in their installed agent environment using a tiny read-only task. Use the environment's supported subagent configuration; do not copy guessed feature flags from another version. If spawning is unavailable on a machine, explicitly start separate ordinary coding sessions with the same child task cards and scopes, and record that this is manually launched parallel work rather than native spawning. This keeps delivery moving without pretending the capability is enabled.

Each lane works from the same verified F0 commit, with distinct child worktrees or disjoint-path shared-worktree rules from section 7. Record active children and exact scopes in the lane handoff/task record. A lane lead cannot edit a file currently delegated to its child. After all children stop, the parent integrates and checks the lane. The team coordinator requests sequential integration through A's separate integration agent; it does not write application code itself.

Run checks appropriate to changed behavior, followed by the integrated `npm run check` at the checkpoint. The generated check already includes typechecking, tests and build. Record manual browser checks or an available automated smoke check. A model saying “done” is not evidence of passing checks.

**Optional later custom-runner support:** the inspected worker code hardcodes both multi-agent flags off, prompts that children are disabled, and falls back to zero children even when `maxChildren` is positive. Supporting nested workers requires changes to launcher/configuration and worker prompts, plus validation of child count/depth, descendant cancellation, worktree/file ownership, completion reporting and final diff checks. Test on the actual three accounts and machines before relying on automatic dispatch. Do not just flip a flag or claim that this document changes the runtime. This work is deferred from the initial Curb build.

For a coordinator handoff in the default workflow, stop new assignments, record the current base, active parent/child assignments, outstanding decisions and integration state, and designate one successor. Healthy children can keep their existing scope. Never restart an uncertain writer solely because its lead lost contact; confirm it stopped before reassigning its files.

## 12. The 36-hour envelope

The event schedule runs Friday November 13 at 8:00 PM to Sunday November 15 at 8:00 AM, America/New_York. The onsite packet calls **8:00 AM** the hard submission deadline, while the separate schedule lists Devpost at 8:15 AM. Plan to submit by **7:30 AM Sunday** and treat 8:00 AM as hard unless organizers resolve the conflict. A late start has less than 36 hours left; do not restart this clock.

This table reserves time; it does not authorize all listed features. Use the current checkpoint and actual remaining time to choose scope.

| Event hours | Local time | Target and decision |
|---|---|---|
| H0–H3 | Fri 8–11 PM | Bootstrap, three parallel foundation tasks, integration; stop and review |
| H3–H6 | Fri 11 PM–Sat 2 AM | Choose and prove route-impact slice; freeze the initial topology conventions |
| H6–H12 | Sat 2–8 AM | Stagger rest; bounded domain/UI work and regression cases; no unattended scope expansion |
| H12–H16 | Sat 8 AM–noon | Daylight field survey and real consultation; select the next increment from findings |
| H16–H22 | Sat noon–6 PM | Repair-budget comparison; integrate genuine evidence; aim for a complete demo path |
| H22–H28 | Sat 6 PM–midnight | Only selected additions: survey assistance, business handoff, or an approved sponsor adapter |
| H28–H30 | Sun midnight–2 AM | Exercise complete flow; choose final cuts; begin recording while the demo is healthy |
| H30–H33 | Sun 2–5 AM | No new product features; bug fixes, resilience, source/reuse documentation, two-minute rehearsal |
| H33–H35.5 | Sun 5–7:30 AM | Final verification, video upload, public repo/link review, submission |
| H35.5–H36 | Sun 7:30–8 AM | Submission buffer; verify receipt and links; preserve the demo build |

Keep the planned product freeze at H30. If the managed kit runtime is adopted later, it also blocks new feature dispatch in its last three hours. Do not relabel new features as fixes to bypass either boundary. Protect several hours of staggered rest per person; humans still need to notice algorithm and demo mistakes.

### Cut order when behind

1. All unapproved sponsor work and any additional integration service.
2. Continuous sensing, multiple mobility presets, legal policy automation, realtime collaboration and accounts.
3. Video; retain photo/manual evidence.
4. Automated vision; retain reviewed evidence and the actual graph engine.
5. Rich PDF; retain CSV/print summary.
6. Multiple origins and elaborate budgets; retain one origin, a small exact candidate set and the fair baseline.

Do not cut the working end-to-end decision, honest provenance, correct graph behavior, reset path or rehearsal. If only a barrier map is working by H22, make the next slice the smallest one-repair counterfactual rather than adding more detection features.

## 13. Definition of demo-ready

Foundation completion and demo completion are different checkpoints. Before calling the eventual MVP demo-ready:

- A fresh clone installs and runs with documented commands; source revision and imported kit code are identified.
- The chosen scenario has explicit origins, destinations, edges, barrier evidence and unknowns.
- A user can inspect an observation, choose a budget, compare actual engine outputs and inspect the selected repair plan.
- The complementary-repair regression and disconnected/unknown edge cases pass.
- Displayed costs/counts agree with the engine and exported result; assumptions are visible.
- The whole flow works repeatedly without refreshing away broken state; reset restores a known case.
- An empty state, bad input and provider failure are handled visibly; saved replay and live execution are distinguishable.
- Any live provider and hosted deployment are tested separately from local fixtures. A deployed frontend alone is not an end-to-end pass.
- The team can complete the pitch within two minutes and answer who buys it, what is real, what is simulated, and what the kit supplied.

Useful measurements: eligible candidate count, feasible subsets considered, actual latency on the demo machine, restored destinations under equal budget, number of reviewed observations, and data coverage. A weighted destination score is not a count of people helped. Repair cost per restored connection is a scenario ratio, not proven financial savings.

### Two-minute demo structure

| Time | Show and say |
|---|---|
| 0–15 seconds | Facilities manager's problem: a limited repair budget and a list of disconnected defects |
| 15–35 seconds | One real local observation and its evidence/review status |
| 35–75 seconds | Same budget, condition-first versus Curb; animate the actual computed route change |
| 75–95 seconds | Inspect why the selected repair or combination helps; show an unresolved observation handled honestly |
| 95–110 seconds | Repair brief or summary the manager can use; named target customer and actual consultation insight |
| 110–120 seconds | Restored-connection result and the specific next validation step |

Use numbers only after the engine and scenario establish them. Prepare a local build and a saved demo video. If connectivity fails, say the shown execution is local or replayed; never pretend an API succeeded. The optional submission video must be at most two minutes, and the packet requires the in-person demo regardless of video.

## 14. Sponsor decisions

See `SPONSOR_OPTIONS.md` for every non-main category identified in the onsite packet, implementation choices, effort estimates and fit. **None of its new SDKs, tools or features are included in F0/F1/F2 or automatically queued in later slices.**

Recommended discussion order: Amazon as an additional submission using the core product; Peri if an eligible real consultation is obtainable; LangChain if a tool-using product agent adds a meaningful decision loop after the deterministic engine works. Defer CoStar unless the team deliberately accepts a Houston/Los Angeles data case, and defer Photon/hardware unless a user need justifies their extra workflow.

The coding coordinator and coding agents are development tools. They do not by themselves make the submitted product a deepagent or an agentic sponsor entry.

## 15. Sources and verification scope

- [HackPrinceton onsite hacker packet](https://chatgpt.com/library?file_id=libfile_fde3_f-e5929189ecd881918ee9955a30c3e34f_7ee33cccf6a0819182595a71e4d587c0&account_id=personal), especially pp. 3–5, 10–18: rubric, deadline, main/optional/special tracks and demo requirements.
- [F26 schedule](https://chatgpt.com/library?file_id=libfile_fde3_f-10f6f9197f848191869a5633e136bccc_7ee33cccf6a0819182595a71e4d587c0&account_id=personal): event hours and the conflicting 8:15 AM Devpost entry.
- [Original Curb concept](https://chatgpt.com/library?file_id=libfile_fde3_f-d8db738d92488191bb39426d4d63fde0_7ee33cccf6a0819182595a71e4d587c0&account_id=personal), pp. 3–5: product premise; broader claims are narrowed in this plan.
- [Pinned kit tree](https://github.com/oliverchennn/hackathon-kit/tree/22a5f44a27375e88ac2cd1754f6976704f725bc5), [create guide](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/start-here/CREATE.md), [orchestration guide](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/guides/ORCHESTRATION.md), [worker source](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/tools/agents/worker.ts).
- Kit module READMEs for [maps](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/modules/maps/README.md), [media](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/modules/media/README.md), [analytics](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/modules/analytics/README.md), and [exports](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/modules/exports/README.md).
- [Access Board PROWAG context](https://www.access-board.gov/prowag/) and [DOT adoption scope](https://www.transportation.gov/regulations/federal-register-documents/2024-29990): support the decision to avoid automated blanket legal applicability.

This deliverable is a reviewed implementation plan and task/prompt package. No Curb application, live API, multi-computer runtime, sponsor integration or deployment has been implemented or tested as part of producing it.


# Curb sponsor options for discussion

**Decision status: no sponsor-specific tools or features approved.** These options are separate from the initial build and are not an implementation queue. The base plan targets Business and Enterprise. Discuss the options with Vincent before selecting any added feature or dependency.

The table covers all eight special tracks and both optional tracks identified in the supplied onsite packet, plus the automatic Overall category. A sponsor logo or workshop is not evidence of an additional prize. The live Devpost page and Photon's linked supplemental guidelines could not be read; confirm late changes and Photon-specific conditions with organizers/sponsor staff before entering. Do not import historical MLH categories into this year's list.

Effort below is a planning estimate of additional person-hours after the relevant core workflow works, not a delivery promise. Setup, data access and sponsor review can dominate these estimates.

| Category | Curb fit | What would be required | Extra effort | Recommendation |
|---|---|---|---|---|
| Amazon — Best Practical AI Innovation | Strong if the shipped product actually uses AI | Functional AI use case, basic documentation and pitch; no AWS-only requirement in the packet | 0.5–1 for submission/demo adaptation if core AI already works | Best low-friction candidate; initial fixture-only foundation is not enough |
| Peri — Forward Deployed Challenge | Strong with real discovery | Consult an eligible business or student organization during the event; include organization name, person's name/role and supporting evidence | 1–2 for discovery and evidence; implementation changes depend on findings | High value if a real partner can be reached |
| LangChain — Best use of deepagents | Strong potential, new product capability | Build an actual deepagent in Curb; development-time coding agents do not satisfy this | 3–5 | Best technical addition after routing/repair tools are working |
| CoStar — Inside and Out: AI for the Built World | Strong thematic fit, substantial scope change | Agentic use of at least two supplied layers: CoStar, Matterport, Vexcel; supplied geography is Houston/Los Angeles | 6–10+, strongly dependent on API/data access | Investigate early only if desired; do not silently pivot away from Princeton |
| Photon — Build a Messaging Agent using Photon 2.0 | Moderate | A real messaging-agent workflow through Photon; verify supplemental guidelines | 3–5 | Only if evidence collection by messages is useful to the actual customer |
| Arlequin Track 1 — AI-Driven Forensics | Poor | Analysis of illegal/criminal patterns in forensic data | Effectively a different product | Skip; accessibility evidence is not criminal forensics |
| Arlequin Track 2 — Social Media Analysis | Poor | Combine message content with social-network connectivity | Effectively a different product | Skip; sidewalk connectivity does not satisfy social-network analysis |
| Justin Bojarski — Best Physical AI Hack | Poor for the software-first scope | AI in a physical hardware build | 8–12+ | Skip unless the team deliberately chooses a sensor rig |
| Best Hardware Hack, optional | Low without a hardware build | Creative physical-computing integration | Shared hardware effort above | Do not assume a normal phone camera qualifies |
| Best Rookie Hack, optional | Not a fit for the known experienced team | First-hackathon eligibility | None | Do not plan around it; mixed-team eligibility would need organizer confirmation |
| Best Overall Hack | Automatic consideration | Main project judged across the rubric | None | No extra feature; packet says track winners cannot also win Overall |

## Amazon

The packet permits open-source AI, API services, custom models and agent frameworks. It specifies equal 25% weights for Creativity, Usefulness, Technical Implementation and User Experience. It does not require Bedrock or another Amazon service.

**How it would work:** demonstrate a real AI observation from a photo, the human correction/review step, and the resulting change to a deterministic repair plan. If the later product includes a tool-using planner, show its verified action trace as well. Fit the same coherent user story into the sponsor demo; adding an AWS service solely for branding has no demonstrated benefit under these published requirements.

**Decision requested:** include Amazon as a submission target once the core AI workflow works, without adding an Amazon-specific dependency? If the shipped product remains manual-only, reassess eligibility rather than labeling ordinary graph code as AI.

## Peri

Student organizations and clubs explicitly qualify in the packet. A facilities manager, local property manager or accessibility organization could reveal a useful workflow, but confirm eligibility if the partner is an institutional office rather than the examples listed.

**How it would work:** Dev B conducts a short consultation during the event, records the current repair-prioritization process, identifies one concrete breakdown, and brings that finding to the next orchestrator checkpoint. The next selected slice addresses it. Keep a permitted quote/photo/conversation excerpt, the person's name and role, and the organization's name for submission. Ask what they can actually use Monday: the answer may favor a simple export over another model feature.

This is not a request to manufacture evidence or retroactively label a generic accessibility conversation as customer validation. Share only what the participant permits. No outreach is sent by this plan.

**Decision requested:** pursue a real consultation and consider Peri if the resulting workflow still fits Curb? This can strengthen the main-track entry as well.

## LangChain deepagents

The official TypeScript Deep Agents documentation describes a harness for tool use, planning, context and delegation. Use the current version-matched API and pin it; planning capabilities can require explicit configuration. Do not install the entire managed hosting stack for this use case. [Official documentation](https://docs.langchain.com/oss/javascript/deepagents/overview).

**Proposed user action:** “With this budget, propose repairs; if critical evidence is missing, tell me exactly what to verify first.”

**How it would work:** a bounded server-side deepagent calls typed Curb tools such as `inspect_barrier`, `evaluate_repairs`, `compare_plans` and `draft_verification_request`. It checks evidence, evaluates candidate plans through B's deterministic engine, and creates an in-app draft brief or review task. Changing a reviewed observation or approving a plan stays with the human. It never invents coordinates, costs or successful repairs.

A small trace shows actual tool inputs/results and the final supported proposal. Set a step/time/token limit and disable unnecessary shell/network tools. Use the ordinary Curb buttons and engine when the agent fails; show the failure explicitly. This makes the integration substantive because the agent chooses what to inspect next and adapts to missing evidence.

**Ownership if approved:** A installs the SDK and owns `src/server/curb/agents/`; B exposes deterministic tool contracts; C adds a compact request/trace panel within `src/features/curb/`. Freeze those interfaces first. No shared writer on the domain engine.

**Gate:** approve only after route evaluation and the repair-budget comparison work. Give it a 60–90 minute integration spike; if a genuine bounded tool cycle is not demonstrated, remove it from the release scope.

**Decision requested:** add this product agent after the deterministic MVP, or keep the interface entirely button-driven?

## CoStar

The packet calls for at least two of CoStar property data, Matterport 3D scans and Vexcel aerial imagery. Its weights are 30% data use, 30% agentic depth, 25% usefulness and 15% demo/polish. The supplied buildings are in Houston and Los Angeles. Accessibility is expressly listed as a possible use case.

**How it could work:** add a separate property case in one supplied city. Use Matterport evidence to identify/verify the entrance and Vexcel context to ground exterior approach/crossing candidates, with a matched building ID and location. Optionally use CoStar building records to identify relevant destination/tenant context. An agent selects the missing viewpoint or evidence needed, calls the existing evaluator only on reviewed topology, and drafts a specific inspection/repair decision. Both chosen layers must change or support the actual decision; screenshots used as decoration do not meet the intent.

Aerial imagery generally cannot establish small curb heights, precise slope or all passage conditions. Scan coverage may stop at an entrance. Missing coverage becomes a verification task, not an invented connection. Supplied-market data must be a separately labeled case, not passed off as Princeton survey data.

**Ownership if approved:** A owns the adapter/API credentials in `src/server/curb/sponsors/costar/`; B owns the matched property scenario and evidence mapping in `src/data/curb/costar/`; C owns a separate case selector/evidence comparison. Register these future folders only after approval.

**Early feasibility check:** in 45–60 minutes, obtain credentials, retrieve two matching real layers for one property, inspect their coverage and usage terms, and identify a decision their combination supports. If that fails, stop. Do not build speculative adapters against undocumented payloads.

**Decision requested:** accept this additional geography/data case and its time cost, or keep all effort on the Princeton core? This could be compelling, but it is the most likely sponsor option to dilute the main demo.

## Photon

The packet names a Photon 2.0 messaging-agent challenge and links additional guidelines. Those linked requirements need sponsor confirmation before implementation. Photon publicly describes agent messaging across channels, but this plan does not assume a particular attachment, location-sharing or outbound capability is available to the team's account. [Photon](https://photon.codes/).

**How it could work:** a facilities tester messages a barrier report through one supported channel. The agent asks for missing location/evidence, then creates a **pending** observation in Curb. After review, the tester can request a link to the resulting plan. This is more coherent than unrelated voice narration or unsolicited repair alerts.

A validates inbound events using the provider's documented mechanism, deduplicates message IDs and maps the conversation to a permitted demo session. B normalizes the report into the same evidence schema; C adds source/review context. Begin with one channel and one consenting test account. Verify actual attachment/location support before promising photo-based intake. No automatic contact of campus staff or users.

The kit's integrations module contains some useful patterns but no ready-made Photon adapter. Provider setup and the messaging flow are real additional work.

**Decision requested:** add messaging-based intake because the customer needs it, or leave it out to protect the main demo?

## Hardware and the other categories

A calibrated instrumented wheel/phone mount plus sensors could make surface measurements more defensible, and might support both the optional Hardware category and the Physical AI category. It requires actual calibration, a real physical build, reliable readings, and a meaningful AI role for the latter. It is not a weekend shortcut to legal-grade measurement. Without hardware already available and a teammate committed to it, this is an unfavorable trade.

Neither Arlequin track is satisfied by renaming sidewalk evidence “forensics” or calling the street graph a social network. Rookie is not a sensible target given the team's prior hackathons. Overall is automatic and requires no additional integration.

## Proposed decision to discuss

Prefer **Amazon + Peri**, if a genuine consultation is obtainable, with **LangChain as the one possible technical addition** after the core engine works. Do not activate CoStar, Photon or hardware without a deliberate discussion of their new workflow, setup and time cost. No option in this document is approved by default.

Source: [F26 onsite packet, pp. 10–18](https://chatgpt.com/library?file_id=libfile_fde3_f-e5929189ecd881918ee9955a30c3e34f_7ee33cccf6a0819182595a71e4d587c0&account_id=personal). Sponsor details are packet-based; confirm late changes onsite.
