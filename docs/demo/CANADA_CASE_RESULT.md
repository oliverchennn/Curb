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

PR40 merged the proof at `d918a0b83732712a42a285b9ca51e77e91a067c5`; PR39 merged the readiness page at **`e9ec00d0981fd148801d80b29f81d613e19906b4`**, tree `3494fcad49cc1bfd027d7ff2cbf4895f41f57bd9`. The merged application files match the tested implementation; its only additional files are the four proof artifacts.

The existing independent checker passed 11 actual local browser cases at 1280×720 and 390×844: all record choices and costs, keyboard/focus, source links, reset, error/timeout/retry and stale responses, plus adjacent navigation. The real JSON download matched the pinned 6,007-byte snapshot. Native Chrome printed all four records, open requirements and provenance across two Letter pages. [Exact local receipt](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6893715226)

The [automatic Vercel deployment](https://vercel.com/oliverzychen-6748/curb/2MW8unzqTaF6PrzVpYDWfdFDuMWD) reported success, and public health returned the exact merged `e9ec00d` revision. [Integrated main CI](https://github.com/oliverchennn/Curb/actions/runs/43709650103) also passed.

**Independent public acceptance passed all 11 browser cases** on that exact source, pinned before and after each case, with final health/readiness at 11:39:45 UTC. Chrome 156 verified 1280×720 and 390×844, record choices, keyboard/focus, reflow, reset, failure recovery, a real 10.114-second timeout and stale responses. Source and independent-review endpoints returned HTTP 200. The actual JSON download matched the snapshot byte for byte. Presenter, Investment, Campus evidence and shared CAD navigation also passed. [Full public receipt](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6893766232)

The public native Letter PDF contains all four records, open requirements and provenance across two inspected pages. PDF SHA-256: `c4ae2c59829cad6a773d7f8270f1adc82359fc776b85553d23ee958c2adf29df`. The 6,007-byte JSON download retains the snapshot hash above. Exact-source desktop/phone captures and full browser/print receipts are retained with the independent checker.

## What the result supports

Independent source review completed M11. M1 through M10 remain open: arrival and endpoints, assessed crossings and approaches, continuous route coverage, complete scope and cost ownership, and other evidence requirements listed in the case. No graph, comparative output or benefit value was fabricated. Comparison grids, strategy results and sensitivity runs are not applicable to this disposition.

The page provides four source-record choices, historical costs and PDF locators, a missing-evidence checklist, reset/retry, snapshot download and a printable brief. Route Explorer, the separate synthetic Investment demo and Robertson review remain available. Historical measurements do not establish present conditions, passability, legal compliance or actual repair outcomes.
