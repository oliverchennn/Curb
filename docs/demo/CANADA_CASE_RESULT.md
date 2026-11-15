# Cañada College evidence-readiness case

The investigation reached **inventory_only**, with `comparisonAllowed: false`. It preserves 69 historical inventory records, including summaries and source context, from the official November 2020 SMCCCD report. Four proposed whole ramp replacements have published estimates totaling **$23,500 in 2020 USD**. This is neither a complete-route price nor a current quote.

Ramps 404, 405 and 421 account for $20,000 of the Lot 1 / Building 9 inventory; ramp 422 adds $3,500 for a separate Lot 1 / Lot 1 crossing. Their assessed connections remain unverified.

[Case page](https://curb-taupe.vercel.app/curb/case-studies/canada-college) · [Readiness report](../../reports/curb/canada-2020/readiness.md) · [Approved claims](../../reports/curb/canada-2020/claims.json) · [Hash manifest](../../reports/curb/canada-2020/manifest.json) · [Independent verification](../research/canada-case/VERIFICATION.md)

## Accepted source and implementation

| Checkpoint | Full commit |
| --- | --- |
| Corrected source inventory | `1dbe30033ae46a4b2711bca1b93b0831b675251e` |
| Independent source review | `65effc19e03c5f3bd98cbb3e781fcd9ec07c98ab` |
| Reviewed readiness implementation | `ff33cdc9aa7ea4907851dae7aec8351b722e409a` |
| Independent proof package | `0e6de1e86a411514b9f66f39a1a9e86bd8f9755e` |

Official PDF SHA-256: `01e6d86bc0535a925a1f26172c808a22b80fc000797d5fc441ea1b9714f4d2f8` (111,675,832 bytes; 4,399 viewer pages). The report is linked, not copied into the repository. The manifest binds the six reviewed input blobs, review receipt and readiness snapshot.

Readiness snapshot SHA-256: `45a70b5a61a3088a6596ad5645bf4e276b6fb0fbde070e6468d7949608ee4a8a`. Git blob bytes define these hashes; local checkout line endings can differ.

## Verification and release

Exact implementation `ff33cdc` passed independent technical and source-projection review, strict contract and actual GET-handler checks, and `npm run check`: TypeScript, 45 test files / 1,064 tests, and optimized build. [CI run 43706796151](https://github.com/oliverchennn/Curb/actions/runs/43706796151) passed on Node 22.23 and Node 26, including replay and compiled/backend checks.

The initial local sandbox check could not load temporary transformed modules; its unrestricted rerun passed with no source change. Separately, the source-validation author ran 24/24 on macOS; the independent Windows run passed 23/24 with one symlink-permission error. That platform limitation is retained in the independent receipt.

Production and browser acceptance are pending at this draft checkpoint. The existing Oliver release lane and independent public checker own these remaining checks.

## What the result supports

Independent source review completed M11. M1 through M10 remain open: arrival and endpoints, assessed crossings and approaches, continuous route coverage, complete scope and cost ownership, and other evidence requirements listed in the case. No graph, comparative output or benefit value was fabricated. Comparison grids, strategy results and sensitivity runs are not applicable to this disposition.

The page provides four source-record choices, historical costs and PDF locators, a missing-evidence checklist, reset/retry, snapshot download and a printable brief. Route Explorer, the separate synthetic Investment demo and Robertson review remain available. Historical measurements do not establish present conditions, passability, legal compliance or actual repair outcomes.
