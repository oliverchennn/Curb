# R2 core verification checkpoint

The repair-plan domain and HTTP API are verified on **`64f004c5e0ea7062d29165d8dfc5acfde7fa04b2`**. The R2 UI and final browser gate are still pending. [A result](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876215111); [coordinator acceptance](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876234859); [Landau's UI assignment](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876190198).

Accepted lane sources are B `67d54131f89e8ad09144136ce1d32169f0f2583d` and A `84161110be92e04436568d4080c9afab6aa7575d`. Verification branch `codex/r2-verify` publishes the tested integration SHA without a new implementation commit. All A/B writers, descendants and the temporary production server stopped. Main may include later coordination-only commits; read the live board for current ownership.

## Observed checks

- `npm.cmd run check`: exit 0 at 2026-11-14 10:51:34 UTC; typecheck, 469/469 tests in 14 files and Next.js production Webpack build. Node 24.12.0/npm 11.6.2; existing locked installation.
- Temporary `npm.cmd run start -- --port 3000`: only loopback `127.0.0.1`; health 200; started 10:53:37 UTC and stopped 10:53:43 UTC with no listener remaining.
- `node verify-core-http.mjs http://127.0.0.1:3000 64f004c5e0ea7062d29165d8dfc5acfde7fa04b2`: exit 0 at 10:53:41.799 UTC. The harness uses Node built-ins, GET metadata, exhaustive simple directed paths and recursive subsets. Expected outputs do not call product evaluators or schemas.
- Complete plan outputs matched at 16 budgets: 0, 1, 199, 200, 201, 399, 400, 401, 599, 600, 601, 799, 800, 801, 900 and 9007199254740991 cents. This includes both selections/spend, all route witnesses, restored IDs/counts, singleton and omission projections, and subset counts.
- Seventeen typed R2 failure cases, no-store, strict envelopes, immutable contexts and 12 byte-identical warm repeats passed. All 160 R1 origin/destination/repair comparisons, six R1 failures and foundation sample/empty/unsupported cases also passed: 222 oracle requests excluding health.
- Twelve warm local full HTTP responses had median 5.47 ms and empirical p95/max 7.38 ms. This small loopback measurement is not deployed or production-scale latency. Internal 500 cases were covered by Vitest, without live fault injection.

## Portable evidence

[Download the original evidence archive](r2-core-evidence.zip): 12,473 bytes, SHA-256 **`e05859c145fc12d31362c5e5375a62d270fb0c8800162357fe440439c619b948`**.

It contains nine files: README, independent verifier, complete JSON result, manifest, full-check log, HTTP oracle log, production stdout/stderr and server lifecycle JSON. The manifest lists byte lengths and hashes for its eight constituents. Coordinator verified the archive and all entries. The ZIP preserves Windows log line endings exactly; no raw evidence is rewritten during publication. It contains synthetic results and ordinary local process/path metadata, with no credentials or private research notes.

For a new verification, extract the archive into an ignored scratch directory beside the checkout of the tested source. Run `npm ci`, `npm run check`, then `npm run start -- --port 3000`. In a second terminal, run the verifier with the loopback URL and full tested SHA. It writes new JSON beside itself; keep the archived evidence unchanged and record the new run separately. Stop the preview afterward.

At 400 illustrative USD cents, C restores Hall, while A+B restores Library and Student center. A alone, B alone and either omission restore zero new destinations. Cafe remains already reachable, Studio unknown and Archive disconnected. These are authored synthetic examples, not field conditions or completed repairs.

This checkpoint does not establish the pending R2 UI, browser accessibility, CI, deployment, real repair costs, legal compliance or safe navigation. The final R2 gate follows the stopped and reviewed C result.
