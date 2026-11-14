# Cloud takeover and repository audit

Oliver (`oliverchennn`) requested cloud orchestration and then explicitly selected **R1: trip reachability and one repair simulation**. Successor session: `6af808fa-83dc-8191-bd58-80697dbe50c9`. [Takeover ACK](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873649864). This supersedes the pending successor ACK/access in the historical [Oliver handoff](OLIVER_HANDOFF.md). Vincent and Landau's local agents remain paused; their sessions and local heartbeat have not been restarted.

## Inspected baseline

Cloud checkout: `/workspace/curb`. Both origin URLs: `https://github.com/vzhu08/Curb.git`. Initial clean main: `1992c53778c4374c7b2400f2a201f02dcac8c260`. GitHub independently returned login `oliverchennn` and permission `write`. Read all 55 original board comments through `6873577002`, project instructions/task cards, source/tests/configuration, the implementation and sponsor plans, and the portable research archive.

The product serves campus facilities/accessibility planning: connect barrier evidence to trips, then eventually compare repair investments at an equal budget. The completed foundation is an evidence browser, not the eventual decision engine. No routing, budget optimization, real survey ingestion, AI, persistence, authentication or export existed at takeover.

The source flow is `CurbScreen` → `fetchScenario` → `GET /api/curb/scenario` → immutable local JSON → `buildScenarioView`. Strict Zod schemas validate shapes and counts; pure domain validation checks unique IDs and reciprocal graph/evidence references. The browser guards request generations and aborts old loads. `EvidencePanel` is presentational, and `CurbMap` wraps the credential-free SVG schematic. The golden example remains 9 nodes, 12 edges, 3 destinations, 4 barriers and 5 evidence records.

## All PRs and integration history

GitHub's complete REST pull-request collection contains **one PR at takeover**. Search indexing returned no results, so the collection and PR detail were checked directly.

| PR | State | Review and result |
|---|---|---|
| [#2: Codex/f0 bootstrap](https://github.com/vzhu08/Curb/pull/2) | Merged | Two commits; 33 changed files; head `7e56583774b9723a6ce8b6c25def915c08e76217`; merge `6786becfc6c394bf83b55e131d2bb567be3c2162`. No PR description or review discussion. Detailed review/check evidence is on board #1. |

The coordinator's simultaneous F0 integration `d9d2c56b86c1bf7dda6d2d0819d00d7816cc76e1` has the same tree as PR #2's merge (independently compared). `313395308c26791ef8f9fd37a2d0fb72e441e9b7` reconciles both histories and freezes curb-v0; no missing second bootstrap.

Later work was integrated by history-preserving branch merges, not additional PRs: B `a0837c0edbfe973d0fb658b187984e53cde80ed2` expanded domain/data coverage; A `b8b8c682b86e7594eea80d3a659ed13e0b4b2c0e` implemented real API/transport; C `6fc3ccdd00229ab1a615174a8caa6d2eb526fb79` implemented the screen/evidence and corrected error copy. F2 `fc12e86c85394ab8126db1be485aaf0e7845c087` integrates B → A → C and fixes the Webpack dev command. Subsequent commits only change documentation/research. There are no open PRs, unmerged lane results, active old writers or extra remote branches at takeover.

## Independent cloud verification

On baseline `1992c53778c4374c7b2400f2a201f02dcac8c260`, Node 24.22.1 / npm 11.9.0:

- Locked `npm ci --cache /tmp/curb-npm-cache --no-audit --no-fund` passed. This install deliberately does not claim a new dependency audit.
- `npm run check` passed TypeScript and all 53 tests in four files; its sandboxed build failed parsing TypeScript subprocess output. `npm run build` outside the sandbox then passed without changing source, dependencies or configuration. This is an environment-specific first-attempt failure, not a claimed clean full-command pass.
- Production `npm run start -- --port 3000` and installed Chromium 156.0.8078.79 passed real sample load, all four barrier selections, reset, keyboard selection, 390px layout without horizontal overflow, and sample/empty/404 API responses with `Cache-Control: no-store`.
- Fresh local screenshots and evidence are under `/workspace/scratch/curb-baseline`; command logs are `/tmp/curb-cloud-check.log` and `/tmp/curb-cloud-build.log`. They are cloud-local, not a deployment or uploaded evidence.
- All 17 vendored reference Git blob hashes, original plan SHA-256, research ZIP SHA-256/CRC and four GeoJSON hashes/counts match their manifests.

Existing limitations are explicit: no CI workflows/runs; browser regression harnesses were local rather than committed; a never-settling foundation fetch has no timeout; schematic selection is list-first without path highlighting; missing favicon; no full screen-reader or deployed-flow verification. None is evidence that routing or accessibility is already implemented.

## Research and product decisions

The central Princeton extract has 148 lines and 83 ramp points (54 EXISTING, 29 ASSUMED), all aerial-derived. Width/slope/condition and ramp compliance fields are unknown. The single MISSING ramp in the wider window is a scouting lead, not a verified defect. The separate 48 Pittsburgh labels are historical evidence examples. The source archive is not imported into the running app. Never label archival/aerial evidence as a current field observation.

Preserve the original sequence: R1 route impact, then a separately selected R2 equal-budget comparison, then real evidence integration. R2's key regression is complementary repairs: A alone = 0, B alone = 0, A+B = 2 versus worse-condition C = 1 at equal budget. No additive allocation solver can establish this result. Landau's CoStar/Matterport proposal remains a separate, unselected product/geography/provider change.

R1 is now authorized by Oliver's current instruction. Use a separate authored synthetic graph with explicit planning assumptions, conservative unknowns and named destinations. Preserve the original v0 fixture and evidence. [R1 card](../tasks/R1.md) and live assignments define exact ownership; new cloud workers do not impersonate sleeping local agents.

Fixed supplied schedule remains Sunday November 15, America/New_York: feature freeze 02:00 (07:00 UTC), target submission 07:30 (12:30 UTC), hard deadline 08:00 (13:00 UTC). At 07:15 UTC November 14, approximately 23h45m remained to freeze and 29h45m to the hard deadline. Event rules and sponsor eligibility have not been freshly verified with organizers.
