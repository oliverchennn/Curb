# Verified synthetic benchmark results

All 120 cases, 480 strategy rows and 32 separate Investment control rows passed independent BFS/exhaustive verification and a separate clean-checkout rerun. The suite contains 30 authored networks: six families, five fixed seeds and four budgets each. No inputs or unfavorable cases were removed.

| Comparator | Exact wins / ties / losses | Mean additional newly reachable destinations | Raw difference / cases |
| --- | --- | ---: | ---: |
| Condition-first | 58 / 62 / 0 | 0.808333 | 97 / 120 |
| Cheapest-first | 39 / 81 / 0 | 0.458333 | 55 / 120 |
| Recomputed marginal gain per dollar | 16 / 104 / 0 | 0.183333 | 22 / 120 |

These are absolute destination-count differences, not relative percentages. The primary statistic averages each network's four-budget mean, then weights all 30 networks equally. Every network has four budgets, so the raw paired means are equivalent. All 30 full-budget cases tie for each comparator. The predefined 25/50/75-percent secondary results are 97/90, 55/90 and 22/90; they do not replace the primary result. At the separate $10,000 Investment control, exact and cheapest-first both select A+B (two new destinations); condition-first and greedy select C (one). Each spends $10,000. Controls are excluded from benchmark means.

## Reproducible proof

Source `396317aaf5c683b84bf9e71208cbe436f371a69d`. Input freeze `ec8afe2d72c947943767c9906b3ec6f21270fc75` was published before comparison. Official [manifest](../evidence/metrics/2026-11-15-suite-v1/manifest.json), [report](../evidence/metrics/2026-11-15-suite-v1/report.html) and [independent receipt](../evidence/metrics/2026-11-15-suite-v1/verification.md).

| Deterministic artifact | SHA-256 |
| --- | --- |
| Frozen suite / inputs.json | d639296a53e17c1298436b63f358ecb026358d46e7fef6bd1f00812c18daed55 |
| engine-responses.json | 144ea893d6911317c72c4000f53364f87da181abc55e3081232693e83cd33fd6 |
| results.json | 95f4e06123ecca013a6b29253409aaf59dd06f613e02f65bb88205e55103625e |
| results.csv | 94096980339493ea5b005f66cf52c72fce7fa04f328933ee83242929f144abc5 |

All four matched byte for byte. Source hashes use committed Git blobs, not platform checkout line endings. From a clean source checkout with locked dependencies installed:

```sh
node --import tsx scripts/curb/metrics/benchmark.ts --suite benchmarks/curb-metrics/suite-v1.json --out <new-primary-directory>
node --import tsx scripts/curb/metrics/audit.ts --run <new-primary-directory> --reproduce <new-independent-directory>
node --import tsx scripts/curb/metrics/report.ts --run <new-primary-directory>
```

All three commands actually exited 0; the independent verifier ran in a separate clean checkout. A generated report starts with proposed claims. Official claim approval is a separate coordinator review and changes only approval metadata/report disclosure plus their manifest hashes; it never changes deterministic results. All 480 rows, 32 controls, raw production responses, witnesses, row pointers, per-family means and budget curves are retained.

## Checks and limits

Passed: 26 benchmark tests, 15 verifier tests, 12 study analysis tests, strict TypeScript for all evaluation scripts, application check (TypeScript, 1,015 tests, production build), and 14 replay tests after reconciling presenter/video main. Later exact integration CI is recorded in merge/release evidence. The first Windows suite check correctly rejected CRLF bytes; restoring exact frozen Git blob bytes fixed it without changing generated inputs or results.

States: `demo_verified=true` at public `44ba3e49b06fc679e04acad3f26ca7f5dae79a6c` ([acceptance](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892934505)); `benchmark_verified=true`; `study_ready=true` (kit only); `study_observed=false` (user explicitly skipped human metric, participants unavailable); `claims_verified=true` for the approved synthetic wording only.

This authored engineering suite is not a representative or held-out campus sample. Costs/repair effects are assumptions; destinations are not people. Unknown routes provide no demonstrated access and unknown-cost repairs are excluded. The objective omits mandatory work, hazard reduction and partial progress. Budget cases within a network are correlated. No significance, legal compliance, safe navigation, current field condition, construction outcome, vendor superiority or measured human speedup is supported.
