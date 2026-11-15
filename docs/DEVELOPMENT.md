# Run and maintain Curb

Use Node.js **22.23.0 or newer**. No credentials or environment file are required for the prepared demo.

```sh
npm ci
npm run check
npm run start
```

Open [the local home page](http://127.0.0.1:3000/). For development, run `npm run dev`. To use a different port in production, run `npm run start -- --port 3004`. Install dependencies and build before going offline. Core playback, calculations, and exports work from the local server with the committed media. External references require internet access.

| Route | What it demonstrates |
| --- | --- |
| `/curb/upload` | Choose the prepared Robertson clip or its bundled demo. The ten-second simulation is labeled. It checks local file identity without uploading footage or calling a live analysis service. |
| `/curb/surveys/robertson-hall?present=1` | Open the focused presenter view of the survey workspace. **Full review** opens the evidence, repair plan, and export tabs. |
| `/curb/investment-demo` | Compare plans on a separate synthetic network with a shared two-repair approach. |
| `/curb/explore` | Browse archived campus geometry, field photo records, and separately labeled synthetic examples. |
| `/curb/collection` | Inspect the simulated six-wheel collection concept and proposed camera views, including a static fallback. |
| `/curb/plans` · `/curb/trips` · `/survey-replay/index.html` | Open Robertson repair priorities, the synthetic directed-trip exercise, and the separate synthetic survey replay. |

## Verify a change or release

`npm run check` runs TypeScript, Vitest, and the production Next.js build. The [GitHub verification workflow](../.github/workflows/verify.yml) also runs `npm run test:replay` and compiled page/API/report/media checks on Node 22.23.0 and 26.x. `npm run verify:media` checks hashes, frame decoding, color metadata, and track agreement with `ffprobe` on PATH.

With the built server running on port 3004, verify the prepared Robertson flow and its report output.

```sh
npm run verify:flow -- http://127.0.0.1:3004
node --import tsx scripts/curb/verify_report_bundle.ts .curb-local/release
```

The flow check saves report variants under ignored `.curb-local/release/`. The bundle check verifies evidence photos, review data, costs, and selected/deferred work across request, JSON, CSV, HTML, and PDF files. [Portable report runbook](demo/ROBERTSON_PORTABLE_RELEASE.md)

Production uses the existing Vercel project linked to canonical `main`. The release owner records the merged commit and deployment, and the independent checker confirms the source at the public health endpoint and tests the changed flows. Confirm current owners on the [live board](https://github.com/oliverchennn/Curb/issues/1). [Exact revision release runbook](demo/ROBERTSON_HOSTING.md)

## Survey data and evidence

- [Canonical Robertson survey](../src/data/curb/surveys/robertson-hall.json) and [survey contract](../src/contracts/curb/survey.ts) define the review record. [Prepared analysis](../src/data/curb/surveys/robertson-analysis.json) and [tracks](../src/data/curb/surveys/robertson-tracks.json) record model proposals and frame coordinates.
- [Media provenance](../public/curb/surveys/robertson-hall/README.md) documents the MOV, normalized/annotated MP4, evidence images, and reproduction steps. [Preparation scripts](../scripts/curb/) generate the media and maps. Rebuilding the manifest may overwrite authored edits, so preserve edits first.
- Review edits stay in the open workspace. Download the updated JSON before reloading. The accessible HTML report preserves original Unicode and embeds the photos. The PDF is untagged. The annotated MP4 has fixed overlays based on the prepared analysis.
- The [offline walkthrough video](../public/curb/surveys/robertson-hall/demo-backup.mp4) covers the Robertson workspace independently of the server. `scripts/curb/build_backup.py` assembles it from captured screens and the annotated clip.
- Robertson field measurements, exact per-defect location, and route impact remain unknown. The map provides site context. The workspace shows limited planning estimates, quotes needed, and deferred work.

## Map and collection references

The [Route Explorer](https://curb-taupe.vercel.app/curb/explore) keeps DVRPC archive geometry, Robertson evidence, and synthetic examples distinct. Use the evidence list as an alternative to map interaction. Focused map keys include arrows to pan, plus/minus to zoom, and Home to fit. Archive attachment and reviewer acceptance do not establish current traversal. [Source audit and browser checks](demo/ROUTE_EXPLORER_RESULT.md)

The collection concept shows simulated camera coverage and a 24-second capture sequence. Reduced motion starts paused. The static diagram supports camera inspection without WebGL. [Collection verification](demo/COLLECTION_ROBOT_RESULT.md)

## Provenance and licenses

The application foundation reuses [hackathon-kit at `22a5f44`](https://github.com/oliverchennn/hackathon-kit/tree/22a5f44a27375e88ac2cd1754f6976704f725bc5). [Import record](KIT_IMPORT.md) · [Project license](../LICENSE) · [Third-party notices](../THIRD_PARTY_NOTICES.md). Local map geometry includes © OpenStreetMap contributors under [ODbL 1.0](https://www.openstreetmap.org/copyright). DVRPC and other source attribution appear in the [Princeton source audit](research/PRINCETON_CAMPUS_SOURCES.md) and in Route Explorer.
