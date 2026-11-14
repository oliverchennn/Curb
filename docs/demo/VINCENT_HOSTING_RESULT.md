# Curb production deployment

`CURB-VINCENT-HOSTING/1` deployed the exact approved release `b010ad02ce9e0cb905e15e5c7c7109713814b36e` from [PR #7](https://github.com/oliverchennn/Curb/pull/7). Vercel reported the production deployment READY, and the public HTTP and Chrome checks passed on November 14, 2026. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6884031001), [laptop ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6884544877).

- Public production URL: [curb-taupe.vercel.app](https://curb-taupe.vercel.app).
- Deployment: `dpl_BWzjmy9YwNRuAcRBLTpbJGWRK1x9`. [Immutable deployment hostname](https://curb-f85ac7h39-vzhu08.vercel.app), [Vercel dashboard](https://vercel.com/vzhu08/curb/BWzjmy9YwNRuAcRBLTpbJGWRK1x9).
- Project: `curb` in Vincent's `vzhu08` Hobby scope. Default `vercel.app` aliases only. The public production alias loaded in a fresh unauthenticated Chrome context. The immutable hostname's public accessibility was outside these checks.

## Source, build and runtime

I verified the canonical remote main SHA before deploying and staged only the tracked bytes from `git archive --format=zip` of that SHA. The source ZIP was 58,647,095 bytes with SHA-256 `e5fafcbc1f36cf1081220e24bb726492441b6980978276279602d354c7938ca0`. The staging directory omitted local Git metadata, credentials, build output and untracked files. After signing in as `vzhu08`, I deployed that directory with Vercel CLI 65.16.0 using `deploy --prod --yes --json --archive=tgz --scope vzhu08 --project <verified project ID> --meta curbSourceSha=<release SHA>`.

The project is unlinked from GitHub. Direct upload preserves the pinned release and ownership in Vincent's account. Git pushes do not automatically deploy this project. The build used the release's `npm ci --no-audit --no-fund` and `npm run build` settings. Project settings specify Node `24.x`, as assigned. Vercel's build log says the approved source's `engines.node >=22.23.0` superseded the project setting and selected Node `26.x`. The deployment inspection confirms the emitted functions use `nodejs26.x`. The released manifest was preserved. A hard Node 24 pin would need a new reviewed source from Oliver. [Vercel version precedence](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions#version-overrides-in-packagejson).

## Public verification

- At 16:47:24 EST, `node --import tsx scripts/curb/verify_deployment.ts https://curb-taupe.vercel.app` exited 0 from the exact source checkout. All ten sequential requests passed. Upload, survey, collection, explorer, canonical survey JSON and both exports returned 200. HTML and the 12-page PDF each embedded all five expected evidence photo hashes. Range reads of the normalized MP4, annotated MP4 and original MOV returned 206 with the expected bytes and content ranges.
- At 16:47:30 EST, headless Chrome 156.0.8078.74 at 1366×768 with software WebGL and reduced motion verified the bundled simulated upload into the live survey, the final crack seek at 13.933333 seconds / frame 418, both browser report downloads, the collection canvas with Overhead selection and a static-diagram switch, and advancing an explorer snapshot. No page exceptions or same-origin HTTP errors were observed. This pass covered those interactions and this viewport.

## Handoff history

The [cloud preflight](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6884237775) completed before the user approved transferring the pinned source to Vercel. The first approved laptop Git import hit a [missing GitHub Login Connection](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6884564171). Vincent completed the login connection. A retry then reported missing GitHub integration access. GitHub confirmed the private repository is owned by Oliver's personal account and Vincent has collaborator write access. Vercel requires the personal repository owner for Git import, so I used the signed-in direct CLI path after Vincent authorized the laptop. [Vercel GitHub import permissions](https://vercel.com/docs/git/vercel-for-github#missing-git-repository).

No product, configuration, main branch, paid feature, custom domain or protection settings were changed. Oliver retains integration and independent public verification.
