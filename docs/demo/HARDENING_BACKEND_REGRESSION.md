# Hardening backend regression

Independent Windows verification of exact PR #8 candidate `0cd2cd4757ac38919c5db54a7d1672ceecd16138` using Node 24.12.0 and Next.js 16.4.1. Tested the bounded JSON reader, health revision fallback, and foundation selector change in `8ed75f1` and `0cd2cd4`. The [hosted baseline audit](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885102738) covers the separately deployed `b010ad0` source. This regression used loopback only and made zero public requests. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885096239), [ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885124176).

## Expected and observed

| Check | Result |
| --- | --- |
| **Plan and trip, compiled HTTP** | Ordinary and exact 16,384-byte JSON requests returned typed 200s with identical projections; 16,385 bytes, malformed JSON, unsupported media type and missing fields returned typed 400 `INVALID_REQUEST`. Both routes retained JSON and `no-store`. A new valid request after the failures produced the original result. |
| **Plan and trip, direct handlers** | Two-chunk exact requests with a JSON charset returned 200. The extra byte with a deliberately small declared length returned 400, cancelled the producer and released its lock. Producer failure and simulated client abort delivered as a stream error returned structured 400s; a subsequent valid request passed. |
| **Foundation selectors** | Omitted, explicit sample and explicit empty returned the expected 200 views. Both conflicting orders and the two identical repeats returned typed 404 `DATASET_NOT_FOUND` with `no-store`. |
| **Report byte cap** | Compiled HTML and PDF accepted precisely 2,097,152 UTF-8 bytes and rejected 2,097,153 with structured 413 `BODY_TOO_LARGE`. A direct multi-chunk over-limit request with a small declared length also returned 413, cancelled the producer and unlocked the stream. |
| **Actual client choices** | Local Chrome 156.0.8078.74 at 1366×768 submitted an $8.00 comparison and the Library ramp selection. Both POSTs returned schema-valid 200s. The exact plan restored three synthetic destinations, and the trip returned its 60 m after-route. No page exceptions observed. |
| **Health provenance** | With an empty Git SHA and `APP_REVISION` set to the full candidate SHA, compiled health returned that exact SHA and `no-store`. A second compiled process with both identity values empty and `VERCEL=1` returned `unknown`. The explicit full-SHA verifier exited 1 with the expected mismatch on that process. |
| **Compiled assets** | The twelve-request verifier passed with the pinned revision, comparing the canonical survey and all five evidence photos in each report format, and three media byte ranges. The completed Windows report trace listed 131 entries, including the canonical JSON and the original five approved JPGs. |

The compiled HTTP matrix used real local Next.js route handling. The direct-handler cases exercised transport behavior in process, including a producer that aborts with a stream error. An actual TCP disconnect, alternative Node majors and hosted provider behavior were outside this local pass. Both owned production servers were stopped and ports 3196 and 3197 refused connections.

## Reproduction and evidence

```powershell
$env:APP_REVISION='0cd2cd4757ac38919c5db54a7d1672ceecd16138'
npm.cmd ci --no-audit --no-fund
npm.cmd run build
npm.cmd test -- --maxWorkers=1 --testTimeout=20000 tests/integration/server/requestBody.test.ts tests/integration/server/health.test.ts tests/integration/server/scenario.test.ts tests/integration/server/plans.test.ts tests/integration/server/trips.test.ts tests/integration/server/survey.test.ts tests/integration/server/surveyAdversarial.test.ts
node --import tsx .curb-local/hardening-regression.mjs
```

The scratch matrix starts two owned `next start` processes on 127.0.0.1 ports 3196/3197 with the identity inputs above. It runs `node --import tsx scripts/curb/verify_deployment.ts http://127.0.0.1:3196 <full candidate SHA>` and the expected-rejection counterpart at port 3197. Raw matrix, verifier receipt, rejection output and server logs are under ignored `.curb-local/`.

The locked install and production build, including TypeScript, exited 0. The seven focused files passed 233 tests. The separate matrix passed all 41 checks at 17:29:14 EST, including the twelve-request functional verifier with a 12-page PDF. The negative provenance check failed as expected and stopped before checking the rest of the deployment.

| Local artifact | SHA-256 |
| --- | --- |
| `hardening-matrix.json` | `f47c9c8834bef7035deb9942514c143ed25d3ce423285753e52c4811fc5eb62b` |
| `hardening-verify.json` | `bf42ce0671574f46226d606a17e79ca71ea4d4f73e37d50325cb1ac349584cf2` |
| `hardening-verify-rejection.log` | `366d10db782f95717ce51718a6acc3b6932a703a2ea783ff18f048d8aec5175d` |
