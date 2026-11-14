# Curb

Curb helps campus facilities teams turn sidewalk evidence into disability-access repair priorities and budget options.

The Robertson Hall pilot uses an actual 14-second phone video, five AI-proposed findings with tracked evidence, and a local campus context map. The working flow is **Review findings → Compare repairs → Export report**, with a sticky video beside the three workspace tabs on desktop. Essential, balanced and durable plans keep unmeasured conditions, conditional treatments, deferred needs and unpriced work visible.

## Run locally

Use Node.js 22.23.0 or newer. No credentials or environment file are required. Install dependencies before arriving at the venue:

```sh
npm ci
npm run check
npm run start
```

Open `http://127.0.0.1:3000/`. The home page opens `/curb/upload`: choose the supplied Robertson Hall MOV or its prepared MP4, or use the bundled demo. A visibly labeled ten-second processing simulation then opens the prepared findings. File identity is checked locally; arbitrary clips do not receive Robertson's findings, and no live AI analysis or file upload occurs. `/curb/surveys/robertson-hall` opens the workspace directly.

For development use `npm run dev`; for a different port use `npm run start -- --port 3004`. The production build and committed media/data work with local loopback access and no venue internet. Opening an external source reference requires internet; playback, calculations and exports do not.

`npm run check` runs TypeScript, Vitest and the production Next.js build. Run `npm run test:replay` for the separate synthetic replay regressions. `npm run verify:media` verifies committed media hashes, decoded frames, color metadata and track agreement; this optional media audit requires `ffprobe` on PATH.

## Demo data and editing

- Editable survey: `src/data/curb/surveys/robertson-hall.json`, validated by `src/contracts/curb/survey.ts`.
- Original MOV, normalized MP4, annotated MP4 and evidence images: `public/curb/surveys/robertson-hall/`.
- AI proposals and every tracked frame: `src/data/curb/surveys/robertson-analysis.json` and `robertson-tracks.json`.
- Video preparation and local map rendering: `scripts/curb/`. See the [media provenance and reproduction notes](public/curb/surveys/robertson-hall/README.md).

Accept, reject or correct a finding in the workspace, and supply a reviewer and rationale for priority changes. Edits survive workspace tab switches but remain in the current open page; download the updated JSON before reloading or leaving it. PDF, self-contained HTML and CSV exports reflect the current review. HTML includes semantic navigation, original Unicode text and embedded evidence photos; the PDF is untagged.

The video offers three views: **Original** plays clean footage, **Review** draws editable overlays at the playhead, and **Annotated** previews the downloadable MP4 with burned-in labels. Switching views preserves the evidence time after media metadata loads. The annotated MP4 is a fixed rendering of the original analysis and does not incorporate subsequent browser edits. Rebuilding a manifest with the Python script overwrites authored edits; preserve them first.

With the production server running, `npm run verify:flow -- http://127.0.0.1:3004` checks the real API and saves three PDF/HTML report variants in ignored `.curb-local/release/` for inspection. `scripts/curb/build_backup.py` assembles a two-minute offline walkthrough from actual captured app screens and the full annotated clip; it requires the documented screenshots and does not simulate a live session.

The completed [two-minute backup video](public/curb/surveys/robertson-hall/demo-backup.mp4) is committed for the presentation machine. Download it before the venue; it plays independently of the app. See the [presenter script](docs/demo/ROBERTSON_DEMO_SCRIPT.md) for the live flow and its remaining field-review limits.

Verify saved report bundles without the server using `node --import tsx scripts/curb/verify_report_bundle.ts .curb-local/release`. This checks all five evidence photos, IDs, review data, costs and selected/deferred work across the corresponding request/JSON/CSV/HTML/PDF files. See the [portable report runbook](docs/demo/ROBERTSON_PORTABLE_RELEASE.md) for the bundle format and deliberate failure checks.

No dimensions were measured from this footage. Accessibility effects are qualified observations, not an overall ADA verdict. A visible crack never automatically blocks a route. The Robertson Hall map is context only, with no accepted per-defect map placements or verified route graph. Cost amounts are partial planning estimates from explicitly identified historical/regional benchmarks and assumed quantities; obtain site measurements, suitable repair scopes and current quotes. Unknown costs are never treated as free.

## Explore routes and their evidence

Open `/curb/explore` from **Route explorer** in the shared navigation. Choose Library / Witherspoon, Nassau / east crossing, or Nassau / west crossing to inspect the local DVRPC archive geometry. Select a line, landing marker or snapshot to see its source record. Zoom into closely spaced features; every record is also available in the evidence list. Search accepts collection names, source IDs and record IDs. Arrow keys pan the focused map, plus/minus zoom, and Home fits the collection.

The **Robertson Hall** collection contains the five actual close-ups and links to their positions in the original clip. Their precise locations are unknown, so no finding pins are drawn. **Evidence examples** contains two explicitly synthetic conflicting records, kept side by side. Evidence-type filters, named date fields and Unknown values preserve these distinctions. A record's accepted attachment is not a passability decision; current traversal remains Unknown throughout this explorer.

At narrow widths, **Map & snapshots**, **Collections**, and **Evidence** are keyboard-operable tabs. The page uses committed SVG geometry and local photographs without map-service credentials or runtime tiles. Geometry attribution and source details are visible in the page. The [explorer result](docs/demo/ROUTE_EXPLORER_RESULT.md) records the audited source features and its independent browser checks; the [release checkpoint](docs/demo/CURB_RELEASE_CHECKPOINT.md) separates those from later integration checks.

## Separate synthetic routing examples

`/survey-replay/index.html` demonstrates the three repair states: the sample crack repair saves 90 m on the library trip, while the sample slab repair opens clinic and pharmacy routes. `/curb/trips` and `/curb/plans` preserve the directed routing and equal-budget comparison foundation. These use labeled synthetic geography, not Robertson Hall field routes.

## Verification and team

[Integrated evidence and open gates](docs/demo/ROBERTSON_INTEGRATION.md) · [Independent domain/media review](docs/demo/ROBERTSON_REVIEW.md) · [Exact implementation boundaries](docs/demo/ROBERTSON_IMPLEMENTATION.md) · [Live team board](https://github.com/oliverchennn/Curb/issues/1).

For the next step, use the [pilot validation packet](docs/demo/ROBERTSON_PILOT_VALIDATION.md): voluntary sessions with disabled campus users and facilities staff, an inspection/quote worksheet, observable decision criteria and an evidence-based follow-up backlog. These are proposed future sessions, not completed research or field inspections.

Oliver's desktop chat coordinates integration and owns core/media/planning. Vincent is Developer B (API and reports), Landau is Developer C (workspace and visual QA), and Oliver's existing cloud chat is Developer D (independent review and demo support). The live board records exact branches, bases, writable paths and releases. Follow the current block in [AGENTS.md](AGENTS.md) before the preserved historical handoff records. Routine reviewed integration is serialized; current deployment authority and target are recorded on the live board.

Completed task branches are preserved under `archive/2026-11-14/<original-branch>` tags; the [cleanup inventory](docs/demo/BRANCH_ARCHIVE_2026-11-14.json) records their exact commits. Archived proposals are historical work, not newly selected features. The current release task adds B/C/D stress checks and hosting through Vincent's account, explicitly authorized by Oliver; no paid upgrades are included.

Kit application foundations originate from [`oliverchennn/hackathon-kit` at `22a5f44`](https://github.com/oliverchennn/hackathon-kit/tree/22a5f44a27375e88ac2cd1754f6976704f725bc5); [provenance](docs/KIT_IMPORT.md). Local map geometry © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
