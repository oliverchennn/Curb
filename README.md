# Curb

Curb helps campus facilities teams turn sidewalk evidence into disability-access repair priorities and budget options.

The Robertson Hall pilot uses an actual 14-second phone video, three AI-proposed findings with tracked evidence, and a local campus context map. The working flow is **Review findings → Compare repairs → Export report**. Essential, balanced and durable plans keep unmeasured conditions, conditional treatments, deferred needs and unpriced work visible.

## Run locally

Use Node.js 22.23.0 or newer. No credentials or environment file are required. Install dependencies before arriving at the venue:

```sh
npm ci
npm run check
npm run start
```

Open `http://127.0.0.1:3000/`. The home page opens `/curb/surveys/robertson-hall`. For development use `npm run dev`; for a different port use `npm run start -- --port 3004`. The production build and committed media/data work with local loopback access and no venue internet. Opening an external source reference requires internet; playback, calculations and exports do not.

`npm run check` runs TypeScript, Vitest and the production Next.js build. Run `npm run test:replay` for the separate synthetic replay regressions. `npm run verify:media` verifies committed media hashes, decoded frames, color metadata and track agreement; this optional media audit requires `ffprobe` on PATH.

## Demo data and editing

- Editable survey: `src/data/curb/surveys/robertson-hall.json`, validated by `src/contracts/curb/survey.ts`.
- Original MOV, normalized MP4, annotated MP4 and evidence images: `public/curb/surveys/robertson-hall/`.
- AI proposals and every tracked frame: `src/data/curb/surveys/robertson-analysis.json` and `robertson-tracks.json`.
- Video preparation and local map rendering: `scripts/curb/`. See the [media provenance and reproduction notes](public/curb/surveys/robertson-hall/README.md).

Accept, reject or correct a finding in the workspace, and supply a reviewer and rationale for priority changes. Edits remain in the current browser session; download the updated JSON to keep them. PDF and CSV exports reflect the current review. The downloadable annotated MP4 is a fixed rendering of the original analysis and does not incorporate subsequent browser edits. Rebuilding a manifest with the Python script overwrites authored edits; preserve them first.

No dimensions were measured from this footage. Accessibility effects are qualified observations, not an overall ADA verdict. A visible crack never automatically blocks a route. The Robertson Hall map is context only, with no accepted per-defect map placements or verified route graph. Cost amounts are partial planning estimates from explicitly identified historical/regional benchmarks and assumed quantities; obtain site measurements, suitable repair scopes and current quotes. Unknown costs are never treated as free.

## Separate synthetic routing examples

`/survey-replay/index.html` demonstrates the three repair states: the sample crack repair saves 90 m on the library trip, while the sample slab repair opens clinic and pharmacy routes. `/curb/trips` and `/curb/plans` preserve the directed routing and equal-budget comparison foundation. These use labeled synthetic geography, not Robertson Hall field routes.

## Verification and team

[Integrated evidence and open gates](docs/demo/ROBERTSON_INTEGRATION.md) · [Independent domain/media review](docs/demo/ROBERTSON_REVIEW.md) · [Exact implementation boundaries](docs/demo/ROBERTSON_IMPLEMENTATION.md) · [Live team board](https://github.com/oliverchennn/Curb/issues/1).

Oliver's desktop chat coordinates integration and owns core/media/planning. Vincent is Developer B (API and reports), Landau is Developer C (workspace and visual QA), and Oliver's existing cloud chat is Developer D (independent review and demo support). The live board records exact branches, bases, writable paths and releases. Follow the current block in [AGENTS.md](AGENTS.md) before the preserved historical handoff records. Routine reviewed integration is serialized; no deployment or spending is part of this checkpoint.

Kit application foundations originate from [`oliverchennn/hackathon-kit` at `22a5f44`](https://github.com/oliverchennn/hackathon-kit/tree/22a5f44a27375e88ac2cd1754f6976704f725bc5); [provenance](docs/KIT_IMPORT.md). Local map geometry © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
