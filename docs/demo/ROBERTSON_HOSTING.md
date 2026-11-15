# Curb hosting and verification

The production site is [curb-taupe.vercel.app](https://curb-taupe.vercel.app). Vincent deployed the original release from exact source `b010ad02ce9e0cb905e15e5c7c7109713814b36e`. Check the live coordination board and the current Vercel dashboard for the active release and account. [Original hosting receipt](VINCENT_HOSTING_RESULT.md).

The recorded release uses Node26.x because the existing `engines.node >=22.23.0` range overrides the project's24.x setting. That runtime built and served the verified release. Root has not changed the runtime range during the audit. No custom domain, app credentials or paid upgrade is required.

## Releasing an exact revision

After each merge to canonical `main`, the integration owner records the PR, exact merged SHA and expected changes on the shared board. Queue the existing live deployment checker. Confirm that the existing Vercel project is linked to `oliverchennn/Curb`, uses `main` as the production branch, and starts a production deployment for the exact merged SHA.

The operator records the READY deployment ID and production URL. The checker confirms that public `/api/health` reports the exact merged SHA, then verifies the changed flows and relevant regressions on desktop and phone. Mark the release complete after the deployment and live checks pass. Record an access, build or verification blocker on the board if any step cannot finish.

If the Git trigger fails and the orchestrator assigns a direct upload, one authorized operator verifies the project ID and production domain, then deploys only the tracked archive of the merged SHA. The archive excludes local linkage, environment files, build output and credentials. Provide the non-secret `APP_REVISION` at build and runtime and preserve the `curbSourceSha` deployment metadata. The health endpoint reports the Git integration SHA when present and otherwise uses `APP_REVISION`.

Run from the matching source checkout:

```sh
node --import tsx scripts/curb/verify_deployment.ts https://curb-taupe.vercel.app <full-source-sha>
```

The verifier makes12 sequential functional requests: four pages, health/readiness, canonical survey, HTML/PDF with all five photo hashes, and three media byte ranges. The optional expected SHA makes missing or incorrect release identity fail. Public protection/login/redirect responses fail. This is not a load test. Follow with the changed-flow browser regressions and record actual source, deployment, URL and runtime. The older published release used the preceding ten-request verifier; that evidence is not relabeled as a12-request run.

## Report packaging

`next.config.mjs` explicitly traces the canonical survey JSON and five exact evidence JPEGs for the report function. Videos remain static assets. Root previously verified the130 traced inputs and invoked the compiled real HTML/PDF handler from an isolated directory containing only that package. The first hosted release also returned all five exact photos in both report formats. Keep these traces when changing file loading. [Next.js output tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

For a separately budgeted API regression, `node --import tsx scripts/curb/audit_hosted_backend.ts <origin> <full-source-sha>` makes31 sequential bounded functional requests across all nine authored API routes. It requires the exact release identity and does not retry. CI runs both scripts against a local compiled server; public runs require an explicit coordination assignment so probes are not duplicated. The historical baseline report links its original script commit.

See [AGENTS.md](../../AGENTS.md) and the live board for integration ownership, the assigned Vercel operator and the checker. Preserve the previous immutable production deployment for rollback.
