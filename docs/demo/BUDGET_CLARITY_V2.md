# Budget clarity v2

Task `CURB-BUDGET-CLARITY-V2/1`, Developer D / Oliver cloud session `6af808fa-83dc-8191-bd58-80697dbe50c9`. Assignment [6885586935](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885586935), ACK [6885605644](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885605644). Implementation base `2fb49f710085732a7ac20f63680925b8db06dba5`; isolated checkout `/workspace/curb-budget-clarity-v2`, branch `codex/budget-clarity-v2`. No children.

## Presentation

Robertson starts with “What work should we fund?” and Essential / Balanced / Durable scope choices. Every partial plan leads with “Full project cost: quote needed”; the computed range is a priced work subtotal. Balanced's lower subtotal is explicitly explained by its unpriced treatments, rather than presented as a cheaper complete project. The optional budget follows the policies. A selected-plan table shows treatments, relative durability, conditional suitability, assumed quantities, unit rates and the shared job cost once. Deferred needs, rejected findings, sources, exclusions and a measurement/quote checklist remain visible. Existing evaluation, exact-cent parsing, selection callbacks and exports are reused.

The separate `/curb/plans` experience is labelled a synthetic learning lab. It explains the authored $4/$8 amounts and links prominently to Robertson repair planning. The result explains the named destinations returned by the actual evaluator, including ties and illustrative spending. Costs and graph outcomes are unchanged.

Only the assigned presentation files and this report change. No evaluator, contract, data, media, shared shell/CSS, export or provider writes. Root owns integration and the enlarged video layout; this checkout remains pinned to the assigned base.

## Primary source verification

Both PDFs were retrieved anew on 2026-11-14 and the exact source pages visually inspected. Their hashes match the earlier independent source receipts. No factual catalog correction was found.

| Source | Verified source facts | Limits |
| --- | --- | --- |
| [Palmyra bid summary](https://erinj.com/wp-content/uploads/2026/04/44538-00-2026-03-24-bid-summary.pdf), page 1, A1.6 | Opening 2026-03-24; four-inch concrete sidewalk, 20 SY; selected first four bids $223/$200/$200/$75 per SY | Selected range, not all bids or a current campus small-job quote. Pricing reference thickness is not a site specification. |
| [NJDOT contract 21132](https://www.nj.gov/transportation/contribute/business/procurement/ConstrServ/documents/BidTabsDP21132_Redacted.pdf), page 74, item 0083 / 456006M | Tabulation 2021-10-05; letting 2021-09-30; 200 LF; Carbro $18/LF and JPC $59.75/LF | Selected historical roadway bids, not the full bid spread or a current sidewalk quote. No inflation factor or minimum inferred. |

SHA-256: Palmyra `719646867cb8a4df66c3ed3b195838bf626ad420dde0d040d90a4ba65fb652a2`; NJDOT `2c72b982ff2e1b75d0be14efbc4188cf0c0d8de1d984969346bfa30d9bc4f4bf`. Local PDFs, page renders and receipts: `.curb-local/budget-clarity/`. Source dates remain distinct from field observations; quantities remain assumptions and current route impact remains unknown.

## Verified implementation

Final product source: `1c459242464f65788e8e521bddc3366f0f051d43`, following checkpoint `1b3ee7f54e5ce6e6c28b04dd273ab87b08b5c44c`. This report's final commit changes documentation only. The build, browser flows and screenshots below use those exact product bytes, with no root integration changes or local product substitutes.

Root's refinements are included: the budget status says **“No eligible areas deferred”**; the three policies share a row when their container supports it; explanatory paragraphs use at least 14px; the detailed breakdown remains below. Container queries respond to the workspace width, independently of viewport width. Conditional suitability notes are deduplicated into a visible list rather than repeated in every treatment row.

The browser matrix found and fixed one product issue in the new Export link: returning through the tabs leaves the export hash in the URL, so clicking the same hash again previously did not reopen Export. The owned link now invokes the existing hash-change listener when that hash is already current. Repeated policy → Export → plans flows pass without changing the shared workspace or export implementation.

## Validation

`npm run check` passed on the final product source: TypeScript, **748 tests in 28 files**, and the production Next.js build. Final check log: `.curb-local/budget-clarity/check-link-fix.log` (test run began 2026-11-14 23:26:49 UTC). `git diff --check` passed. No dependencies were added. Existing presentation parsers, evaluator, catalog, contracts, export handlers and fixtures are unchanged.

Actual production browser: **Chromium 156.0.8078.79 cloud fallback**, `/usr/bin/chromium`, against `npm run start -- --port 3141` on loopback. This is not Google Chrome or a physical mobile device. The final main matrix ran 2026-11-14 23:29:34–23:29:53 UTC: **215 assertions passed**, with zero page exceptions, console errors or HTTP errors. A further **30 source/treatment/layout assertions passed**. These are browser assertions, separate from the 748 automated tests.

| Flow | Observed result |
| --- | --- |
| Initial Robertson planning | Three policies precede the optional empty budget; Balanced selected; its two unpriced treatments explain the smaller subtotal. |
| All three policies | Selected treatments, area counts, deferred needs, exact-cent subtotals, source URLs/dates, actual exclusions and conditional suitability match the existing evaluator/catalog. Shared setup appears once in each selected breakdown. |
| Canonical subtotals | Essential $294.00–$2,294.00; Balanced $216.00–$1,434.00; Durable $600.00–$4,906.00. Every one remains a **partial priced subtotal**, with full project cost requiring a quote. |
| Empty / invalid budgets | Empty keeps scope planning; `-1`, `12.345`, `abc`, `1000000.01` show invalid input and no budget scenario. Clearing restores valid empty state. |
| Low / boundary budgets | $0, $1, $599.99, $600, $1,500.25, $4,905.99 and $4,906 agree with evaluator outputs. No-work scenarios avoid fabricated zero project prices. Budget fit remains unconfirmed when costs are missing. |
| Exact cents / selection | `1,500.25` is preserved exactly; slider Home produces `0.00`; clearing a selected budget scenario retains the existing Balanced fallback. Policy and budget selection survive tab changes. |
| Rejected findings | Rejecting Defect 01 excludes its area from the proposed plan and updates deferred/selected work. Rejecting all five produces no selected repair scope, not a free project. Canonical GET data stays unchanged. |
| Real report handlers | Downloaded HTML for all three policies plus the reviewed budget scenario. Selected plan appears first, subtotals agree, and all five evidence images remain. Actual reviewed-budget PDF includes the selected plan and $1,500.25; extracted text checked. JSON/CSV retain all five findings, manual reviewer and rejection. Actual POST payloads preserve exact cents, plan ID and current reviewed survey. |
| Quote-only UI fixture | One explicitly synthetic browser-intercepted GET fixture replaces treatment costs with quotes. It displays “Not yet priced,” never $0. This is a presentation edge-case check; canonical and report checks above use the real handlers. |
| Synthetic learning lab | $4 returns best-set 2 vs condition-first 1; $8 returns 3 for both and correctly explains the tie. All four candidate evidence controls resolve. Empty/negative/fractional-cent inputs hide stale results. The real-work link opens Robertson's planning tab. |

Expected plan values come from the unchanged authoritative evaluator; this is presentation/handler agreement verification, not a new independent backend stress oracle. No second backend stress pass was performed. Early harness assertions were corrected for the HTML's “to” range separator, the actual $8 tie and the four published candidates; those harness mismatches were not product defects. Final counts above exclude failed exploratory runs.

## Responsive and interaction evidence

Full-page production screenshots were captured at **1366×768, 1920×1080 and 390×844**. Because the assigned base predates root's enlarged-video layout, the exact **500/673/850px planner contexts** were additionally tested by constraining only the mounted plans panel width in the production browser. These do not claim combined root-layout acceptance.

| Actual planner width | Policy layout / measured card height |
| --- | --- |
| 500px | Stacked cards; 228px each; readable two-column content within each card |
| 673px | Three cards side by side; about 200px wide × 468px high; single-column card content |
| 850px | Three cards side by side; about 259px wide × 449px high; single-column card content |
| 358px inside the 390px viewport | Stacked cards and single-column content; 330–351px card heights |

No horizontal page/component overflow or child spill was found. Visible controls in the owned Robertson planner measured at least 44×44px in all six viewport/context cases. Explanatory paragraphs measured at least 14px. Keyboard Space selects a policy, preserves focus and displays a 3px focus outline. A separate 390px mobile-emulation check used actual CDP touch start/move/end events: scroll moved from 2528 to 2833px; touch policy selection, budget selection, Export navigation, return-tab selection and exact budget persistence passed. Chromium's synthesized-scroll shortcut had produced no movement, so it is not used as touch evidence.

All local artifacts are in `/workspace/curb-budget-clarity-v2/.curb-local/budget-clarity/` (ignored, outside the tracked deliverable). Screenshots were visually inspected. Key artifacts:

- `policies-500.png`, `policies-673.png`, `policies-850.png`, `policies-mobile-390.png`: focused policy comparison captures.
- `breakdown-{500,673,850,mobile-390}.png`: selected-plan tables.
- `desktop-1366.png`, `desktop-1920.png`, `mobile-390.png`, `mobile-touch-390.png`: page/context captures; `context-{500,673,850}.png` record the constrained contexts.
- `synthetic-{1366,1920,390}.png`: learning-lab pages.
- `browser.py`, `browser-results.json`, `visual-review.py`, `visual-review.json`, `touch-review.py`, `touch-review.json`: focused verification scripts and receipts. Run from the checkout with its production server on 3141. `expected.ts` generates the unchanged evaluator reference values via `npx tsx .curb-local/budget-clarity/expected.ts`.
- `essential.html`, `balanced.html`, `durable.html`, `reviewed-budget.html`, `reviewed-budget.pdf`, `reviewed-budget-pdf.txt`, `reviewed.json`, `reviewed.csv`: actual downloaded export evidence.

Selected SHA-256 receipts:

| Artifact | SHA-256 |
| --- | --- |
| `policies-500.png` | `c65901f445de1e62415646e67d8890508e0512049593a7dedd3d4ce8a43283a3` |
| `policies-673.png` | `19ef3ac00eca361eb60b5e176dc7f266d973b34d98b5e27ed0f6cd56f9688af4` |
| `policies-850.png` | `4e644f59fa7ba8e07aa94014a6b75d2e5b3b97f093049485e4f4e7586dc07186` |
| `policies-mobile-390.png` | `cac47eb25b1b3210b515d679f8d8aca1de41ed992d191805196fc23a70bd2556` |
| `browser-results.json` | `92504fbe56890ff4b62b50280e222973dba22eab4f15f334f1b4e97c0450a142` |
| `visual-review.json` | `d9be7e9e88c5894ed43a448bf9479b7c66ba1333c42795161f7e87ed99974afa` |

## Release boundary

No open blocker remains in this bounded presentation task. Root retains final integrated browser/CI acceptance, review and merge ownership. No deployment, full project-price acceptance, physical-device or assistive-technology acceptance is claimed. Unknown measurements, quote requirements, rejected evidence and unknown route impact remain explicit. D releases the task after publishing the branch and posting its exact remote SHA and STOP/RELEASE receipt on the board.
