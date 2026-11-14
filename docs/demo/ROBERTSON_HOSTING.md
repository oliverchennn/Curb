# Curb hosting and verification

The working public release is [curb-taupe.vercel.app](https://curb-taupe.vercel.app), deployed through **Vincent's account** from exact source `b010ad02ce9e0cb905e15e5c7c7109713814b36e`. [Actual project, deployment and verification report](VINCENT_HOSTING_RESULT.md). Earlier approval/import blockers were resolved. The project uses direct CLI upload of a clean Git archive; it is not linked for automatic GitHub deployments. A Git push alone does not update the live site.

The recorded release uses Node26.x because the existing `engines.node >=22.23.0` range overrides the project's24.x setting. That runtime built and served the verified release. Root has not changed the runtime range during the audit. No custom domain, app credentials or paid upgrade is required.

## Releasing an exact revision

Root supplies a merged full source SHA after integrated checks. Vincent uses the already-authorized account/project, stages only the tracked archive of that SHA, and deploys with the committed locked install/webpack build. Local linkage, environment files, build output and credentials remain excluded. Do not upload a developer's working tree or move the alias while another audit is testing a pinned deployment.

For direct uploads, provide the non-secret **APP_REVISION** at build and runtime with that exact source SHA, and retain the existing `curbSourceSha` deployment metadata. The health endpoint prefers a nonempty Git integration SHA, then APP_REVISION; hosted deployments without either report Unknown rather than a misleading local or empty revision. No secret value belongs in that variable. Local development needs no environment file.

Run from the matching source checkout:

```sh
node --import tsx scripts/curb/verify_deployment.ts https://curb-taupe.vercel.app <full-source-sha>
```

The verifier makes12 sequential functional requests: four pages, health/readiness, canonical survey, HTML/PDF with all five photo hashes, and three media byte ranges. The optional expected SHA makes missing or incorrect release identity fail. Public protection/login/redirect responses fail. This is not a load test. Follow with the changed-flow browser regressions and record actual source, deployment, URL and runtime. The older published release used the preceding ten-request verifier; that evidence is not relabeled as a12-request run.

## Report packaging

`next.config.mjs` explicitly traces the canonical survey JSON and five exact evidence JPEGs for the report function. Videos remain static assets. Root previously verified the130 traced inputs and invoked the compiled real HTML/PDF handler from an isolated directory containing only that package. The first hosted release also returned all five exact photos in both report formats. Keep these traces when changing file loading. [Next.js output tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

For a separately budgeted API regression, `node --import tsx scripts/curb/audit_hosted_backend.ts <origin> <full-source-sha>` makes31 sequential bounded functional requests across all nine authored API routes. It requires the exact release identity and does not retry. CI runs both scripts against a local compiled server; public runs require an explicit coordination assignment so probes are not duplicated. The historical baseline report links its original script commit.

The active B/C audit scopes and root integration gate are in [AGENTS.md](../../AGENTS.md) and the live board. Root is the sole merger; Vincent is the deployment owner. Preserve prior immutable deployments for rollback. No new accounts, paid upgrades or protection changes are part of this process.
