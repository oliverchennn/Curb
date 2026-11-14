# Preserved R1 verification evidence

These are exact copies of artifacts from the successful cloud verification on application commit **`03d89572c207b88bc02d80c6f3a745aad1895391`**, subsequently published in [PR #3](https://github.com/vzhu08/Curb/pull/3) / main **`db6ceb603e06ecf9ee8319ad0b2aa76eff840df2`**. They were copied into the handoff on November 14, 2026; packaging did not rerun the application tests or turn this into CI.

Execution was approximately **2:35–2:38 a.m. EST on November 14**. Raw logs retain their original UTC timestamps. [manifest.json](manifest.json) records each original cloud path, size and SHA-256, plus tested SHA/runtime and packaging time. All copied bytes were checked against their original files.

The build log intentionally retains terminal progress carriage returns, trailing spaces and its final blank line. Those copied log bytes are excluded from documentation whitespace checks so the saved evidence stays identical to its source; the manifest verifies them separately.

| Evidence | What it establishes |
|---|---|
| [Full check log](curb-r1-check.log) | TypeScript, 258 tests in nine files and production build completed |
| [API result](api-oracle.json) / [log](curb-r1-api-check.log) | 160 actual API comparisons against an independent exhaustive-path oracle; invalid selections, no-store, immutability and foundation counts |
| [Browser result](browser-evidence.json) / [log](curb-r1-browser-check.log) | Fifteen normal/fault groups; empty page-error list; normal favicon error and intentional network failures separately recorded |
| [Foundation result](foundation-evidence.json) / [log](curb-r1-foundation-check.log) | All four barrier selections, keyboard/reset/mobile/link, no external requests, eleven client chunks checked for exact fixture markers |
| [Desktop screenshot](trip-desktop.png) | Actual blocked → 60 m Library comparison and unchanged evidence |
| [390px screenshot](trip-mobile.png) | Actual narrow comparison/evidence layout |
| [Foundation narrow screenshot](foundation-mobile.png) | Original barrier review after integration |

The browser screenshots were visually reviewed during acceptance. These are synthetic examples; the artifacts do not prove field accessibility, legal compliance, construction completion, screen-reader support or a deployment. The optional favicon 404 is recorded. [ACCEPTANCE.md](../../ACCEPTANCE.md) describes remaining limits and initial harness corrections.

## Reproducing checks

The normal repository checks are portable:

```text
npm ci
npm run check
```

For the manual browser walkthrough, follow [Vincent's handoff](../VINCENT_HANDOFF.md#two-minute-current-demo). The three scripts in [harnesses](harnesses) are the exact files executed in the cloud, provided for inspection and adaptation:

- [API oracle](harnesses/verify-curb-trips.py): Python standard library; optional `CURB_VERIFY_URL` overrides its default local URL.
- [Trip browser](harnesses/verify-curb-trip-browser.py): Python Playwright; real API interactions and controlled fault injection.
- [Foundation browser](harnesses/verify-curb-foundation.py): Python Playwright; existing-screen and client-boundary regression.

The original scripts expect a running production server at `http://127.0.0.1:3000`, write under `/workspace/scratch/curb-r1-verification`, and launch `/usr/bin/chromium` with an installed Python Playwright package. They are **execution references, not a new cross-platform npm script**. On another machine, use a separate local copy and adapt `BASE`, output paths and the browser executable; install browser tooling outside the product dependency set. Stop the dev server before building, then use `npm run start` to serve the production output. Record the new tested commit and results separately instead of overwriting the historical evidence here.

This folder includes only synthetic test outputs, screenshots, public source identifiers and cloud-local paths. No `.env`, credentials, user/browser profile, node_modules, build output or Git authentication metadata is included.
