# Robertson independent planner and handler stress

**Conditional go for the current Robertson catalog; one P3 domain defect remains on this pinned source.** Both seeded runs reproduce the same decimal-cent rounding defect, with no other failures. Root accepted STRESS-D-01 and owns its correction. This report does not clear the combined UI, HTTP, packaging or hosting gate.

- Task: ROBERTSON-STRESS-D/1, Developer D / Oliver, cloud session `6af808fa-83dc-8191-bd58-80697dbe50c9`.
- Assignment: [6882750169](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6882750169); actual ACK: [6882768853](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6882768853).
- Exact source: `1ff75a3467b5ccf7a2554ce53e1b46cafe457c90`, independently confirmed with `git rev-parse HEAD`; published main equality was checked before work.
- Branch/check-out: `codex/robertson-stress-d`, `/workspace/curb-robertson-stress-d`. Only this report and `scripts/curb/stress_plans.ts` are changed. No children or product edits.

## Actual runs

Run from the repository root after `npm ci`:

```sh
node --import tsx scripts/curb/stress_plans.ts
node --import tsx scripts/curb/stress_plans.ts --seed 0x20261114 --cases 256
```

Linux, Node `v24.22.1`; Mulberry32 seeded generation. The script caps random cases at 256, evaluates at most 18 treatment bits per catalog, makes sequential local handler calls, and checks a 180-second elapsed limit between cases. No public requests or background load generator are involved. Each command exits **1** on this source because of the two decimal reproductions below; neither run is represented as all green.

| Recorded metric | Default run | Second run |
| --- | ---: | ---: |
| Seed (hex / decimal) | `0x43555242` / 1129665090 | `0x20261114` / 539365652 |
| Start, 2026-11-14 UTC | 19:19:01.873 | 19:21:24.988 |
| Elapsed milliseconds | 5805 | 6276 |
| Named + generated domain cases | 16 + 120 | 16 + 256 |
| Completed budget comparisons | 863 | 1716 |
| Plan comparisons attempted | 3454 | 6866 |
| Actual planner calls | 1276 | 2537 |
| Oracle masks / compatible scopes evaluated | 277631 / 15006 | 279088 / 15870 |
| Assertions attempted | 54902 | 105760 |
| Determinism / permutation comparisons passed | 134 / 134 | 270 / 270 |
| Invalid boundaries rejected | 9 | 9 |
| Report POST calls | 88 | 88 |
| Accepted HTML / PDF responses | 25 / 9 | 25 / 9 |
| Adversarial responses rejected with 400 | 54 | 54 |
| Exported HTML plans compared with oracle | 100 | 100 |
| Embedded evidence images checked | 170 | 170 |
| Canonical GET checks | 2 | 2 |
| Sampled peak RSS, bytes | 477519872 | 469807104 |
| Failing cases | 2 | 2 |

The 16 named cases repeat across seeds; these are 376 generated cases, not 408 distinct random cases. Each failing domain case stops at its first cost assertion, so later budgets and permutation checks for those two cases are not counted as passed. Oracle counts include calibration and HTML-export comparisons. Sampled RSS is not a peak heap profile or a hosting capacity result.

Receipts and complete failing synthetic inputs are generated under `.curb-local/stress-d/<decimal-seed>/`; they remain ignored local artifacts. The sandbox denied the script's optional Git subprocess, so receipts honestly record `sourceSha: null`; the separate Git command above verified the exact source. Deterministic result digests, excluding timestamps and resource samples:

- Default: `50dc3ca6a92667f1f034c55c97cc342632da52c187ece8703b335622d4fbc4d5`.
- Second: `82ac170020a828d04cf3b7283d7952b72bbd72838532aed7858e5cccde42c22c`.

## Independent checks and results

The oracle enumerates treatment bitmasks and rejects subsets with repeated work-area IDs; production expands choices by area. The oracle implements its own policy/priority ordering and decimal-rational arithmetic using integers, without calling production scoring or cost helpers. Hand-calibrated shared-setup and priority examples verify the oracle before comparison.

Named inputs reach 18 options, 12 areas, 50 grouped findings and 4096 compatible scopes. They cover incompatible alternatives, equal-cost/durability ID ties, shared charges once, mixed rejected evidence within an area, all-rejected/out-of-scope findings, maximum allowed rates/quantities, empty catalogs, inspection-only needs, entirely quoted work, and zero priced work with unknown setup. Generated cases vary priorities, recommendations, review status, grouping, near-term eligibility, methods, durability, cost bounds and shared quotes. Budgets include zero, insufficient amounts and exact/adjacent compatible totals. Inputs are frozen; repeat and reversed-array results are compared. Deferred needs, outstanding measurements, excluded findings, partial budget qualification and unknown route status remain explicit.

Canonical-handler inputs are separate from synthetic domain inputs. The real GET/POST modules read the saved Robertson JSON and actual photos; no disk fixture replacement, API mock or stand-in is used. Each run submits the original survey plus 24 named manual-review variants built with actual workspace helpers. HTML checks cover all four plans, escaped Unicode review text, review method/status/reviewer/note, selected/deferred IDs, amounts, quoted scope without a false zero-dollar price, and budget qualification. The 27 immutable/unattributed mutations are each rejected in both HTML and PDF formats: source/revision/media/track/measurement/assessment/map/grouping/cost/route changes, omitted or reordered findings, and invalid review/priority attribution.

Each run checks all five retained photo byte hashes in HTML and PDF image objects, plus finding IDs in HTML captions. Before/after GETs return the unchanged canonical survey with `no-store`. Before/after hashes match for all 12 checked source/data/media files, including original `IMG_0699.MOV` SHA-256 `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a`. Review attribution is self-reported, not authenticated identity. Robertson route impact and ADA determination remain unknown; no dimensional observation, field inspection or passability conclusion is added.

Standalone strict TypeScript checking passed:

```sh
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --target ES2022 --module esnext --moduleResolution bundler --esModuleInterop --skipLibCheck --types node scripts/curb/stress_plans.ts
```

`npm run test:replay` passed **14/14**, including the separate reviewed-blocking synthetic model and media-range checks. Its first sandbox attempt could not run the server wrapper; the authorized retry passed. Replay evidence remains separate from Robertson and R2 acceptance. This attempt did not repeat the unchanged full application build/test matrix or browser/media-frame reviews.

## STRESS-D-01 — P3: decimal quantity produces a cent of rounding drift

[Initial reproduction](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6882858203); [root acceptance and correction ownership](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6882879962).

At this source, `src/domain/curb/survey.ts::costRange` multiplies binary floating-point quantities before applying `floor`/`ceil`. The schema permits these decimal quantities:

| Rate low/high, cents | Quantity low/high | Exact decimal bounds | Actual bounds |
| --- | --- | --- | --- |
| 100 / 100 | 1.1 / 1.1 | 110 / 110 | 110 / 111 |
| 100 / 100 | 0.29 / 0.29 | 29 / 29 | 28 / 29 |

Reproduce with either command above: `failure-001.json` and `failure-002.json` contain the complete valid synthetic surveys. Each has one eligible area, one priced option, and no shared costs. A separate direct planner reproduction confirmed that the 1.1-quantity option is deferred at budget **110 cents** and selected at **111 cents**. This is a real plan-selection effect at the exact boundary, not just display formatting.

The two failures are manifestations of one defect. The authored Robertson quantities are integer/half values (`4–8`, `1.5–4`, `2–6`) and do not reproduce it; API clients cannot change saved costs. No incorrect current-catalog result or current-catalog release blocker was demonstrated. Root should correct exact decimal multiplication and rerun this unchanged oracle on a published correction. That follow-up has not occurred in this pinned report.

## Remaining gate

Root owns the decimal correction and final combined verification. C is revising and stress-testing the workspace layout. B separately owns real HTTP stress and identified a report-photo tracing risk ([STRESS-B-01](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6882894743)); this report's full-checkout handler success does not resolve deployment packaging. Hosting must wait for those findings' disposition and root's exact combined source. Finite seeded testing is not a completeness proof; these in-process calls establish neither HTTP concurrency capacity, hosted behavior, PDF visual layout nor browser acceptance.
