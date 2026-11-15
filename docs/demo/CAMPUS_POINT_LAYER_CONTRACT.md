# Campus archive-point catalog v1

Task `CURB-CAMPUS-POINT-CATALOG/1`, Developer D. Base:
`7546599a479cabc167168d21a7fc7ad6e25ac200`. Input handoff:
`e80f34b8fa3d0d2ba04a2954f97e94c4c06b0dd2`.
[Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6888734042),
[ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6888748578),
[public projection clarification](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6888766073)
and [inventory/viewport agreement](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6888792408).

This standalone catalog is ready for separate UI and endpoint integration review.
It does not register records in the running explorer, change its existing Point
variant, or modify the live line-data download. All 1,188 ways, 22 sections and
five legacy collections remain unchanged. No new acquisition or field review occurred.

## Public boundary and imports

All new code/data lives in `src/data/curb/princeton-campus-points/`.

| File | Role |
| --- | --- |
| `point-source.json` | Exact internal audit input, unchanged bytes from the released handoff. Do not serve or import into the UI. |
| `catalog.json` | Generated public projection, explicit field allowlist; proposed future download object. |
| `contract.ts` | Public Zod schemas, types, category names, counts and bounds semantics. Does not import raw data. |
| `adapter.ts` | Client-safe entry, imports only public JSON and contract/selectors. `createCampusPointCatalog()` returns a fresh validated object. |
| `selectors.ts` | Pure inventory, marker, exact lookup and distinct count helpers. No raw data import. |
| `build-catalog.ts`, `generate.ts` | Offline allowlist projection and hash-checked deterministic generator. Never import into client/runtime code. |
| `catalog.test.ts`, `selectors.test.ts` | Source/projection parity, real join reconciliation, curation, invalid-data and selection tests. |
| `LICENSE.md` | OSM/ODbL data attribution. |

Public type **`CampusPointCatalog`**, `schemaId: "curb-campus-point-catalog"`,
`schemaVersion: 1`. The adapter exports `CampusPoint`, `CampusPointCounts`,
`PointCategory`, `PointBounds`, `CampusPointFilter`, `POINT_CATEGORIES`,
`CATEGORY_LABELS` and the functions below. For validating an external copy,
import `campusPointCatalogSchema` from `contract.ts`; invalid data throws a Zod
error (`safeParse` also available). No fallback to sample data.

```ts
import {
  createCampusPointCatalog, findCampusPoint, selectCampusPoints,
  mapCampusPoints, countCampusPoints,
} from '../../data/curb/princeton-campus-points/adapter'; // adjust relative path

const points = createCampusPointCatalog();
const inventory = selectCampusPoints(points.records, { query: 'node/8776287626' });
const detail = findCampusPoint(points.records, 'node/8776287626');
const markers = mapCampusPoints(points.records, {
  categories: ['crossing', 'kerb'], bounds: [-74.67, 40.34, -74.64, 40.36],
});
const counts = countCampusPoints(inventory);
```

The future endpoint can use `createCampusPointCatalog()` as its public `points`
object, or parse `catalog.json` with the exported schema. Never spread the raw
handoff into a response. The public object intentionally omits `inputs`, private
GitHub paths/commit URLs, task, branch, chat, base-commit and handoff-purpose
metadata. Its only source-artifact identifier is the SHA-256 digest. Public OSM
response URLs, hashes, byte counts and retrieval receipts remain intact.

## Record and provenance fields

| Field | Meaning |
| --- | --- |
| `id` / `sourceFeatureId` | `campus-osm-node:<numeric id>` / original `node/<id>`. One record per source node. |
| `kind`, `sourceMatch` | `archive`, `exact-source-node`. Source identity matching is separate from position review and traversal. |
| `label` | Original name if present, otherwise category label(s), followed by original node ID. Not an invented building assignment. |
| `sourceNode` | Exact original `type`, numeric `id`, `lat`, `lon`, `version`, edit `timestamp` and complete `tags`. No snapping, coordinate changes or editor identity metadata. |
| `categories` | Every source category, sorted: crossing/entrance/kerb/transit. No coercion to the existing ramp-only Point type. |
| `geometry` | Normal source-position GeoJSON Point `[longitude, latitude]`, or null when location review is required. |
| `locationStatus`, `locationReviewNote` | `source-position` with null note, or `location-review-needed` with original fixme text. Neither means accessible/inaccessible. |
| `boundaryStatus` | `interior` or `retained-way-context`; the latter must be visibly described as perimeter context, outside the chosen campus boundaries. |
| `selectedWayIds`, `sectionCollectionIds`, `studyAreaIds` | All exact joins from original node IDs in the frozen selected ways, including empty/multiple memberships. These are not suggested routes or proximity-based connections. |
| `auditGrouping` | Null for linked records; for unlinked records, `{studyAreaId, basis: "authored-coordinate-audit-only"}` preserves the former coordinate grouping solely as an audit aid. Never use it as a section/building/path join. |
| `sourceResponseIds`, `retrieval` | Join to `responses`; earliest/latest known retrieval dates and flag for undated response receipts. Known ranges do not silently date an undated receipt. |
| `observedAt`, `capturedAt`, `currentTraversal` | Always null, null, `unknown`. OSM edit/retrieval dates are not field observations or capture dates. |
| `inSanitizedSource`, `insideAcquisitionEnvelope` | 295 original sanitized / 38 recovered raw nodes; all within the prior acquisition rectangle. Not a claim about campus ownership. |

Top-level `source` contains attribution/license/credit URLs and the exact handoff
digest. `responses` contains all 13 original public OSM receipts. The full
relation retrieval date remains null; five nodes link to it as well as dated
map receipts. `bounds` encloses **all original source positions**, including the
four unplaced rows; `acquisitionBounds` describes the earlier fetch envelope.
Neither rectangle is the university boundary. `semantics` documents source
categories, geography, joins, dates, position curation and limitations.

## Counts and position curation

| Distinct inventory or membership set | Count |
| --- | ---: |
| Unique inventory nodes | 333 |
| Eligible normal map geometry | 329 |
| Location review, retained but unplaced | 4 |
| Interior / perimeter context | 273 / 60 |
| Linked / unlinked | 295 / 38 |
| Exact node-to-selected-way memberships | 330 |
| Crossing / kerb / entrance / transit memberships | 232 / 44 / 38 / 20 |

Category memberships sum to 334 because `node/10828764207` is both crossing and
kerb. Thirty-five nodes join multiple ways; `node/8948926332` joins central and
east. Deduplicate by source identity, not category, section, coordinate or name.
Distinct source records are not necessarily distinct physical facilities.

The four curated IDs are `8776287626`, `11124620711`, `12785065968`,
`12785065969`. Each retains `fixme=confim exact location` verbatim, original
coordinates and all source tags in inventory/public JSON; normal map geometry
is null. No normal marker, nearest-line join, building attachment or location
resolution is inferred. Source position review requires a separately reserved
review/change; this implementation does not resolve the note.

## Selection contract

- `findCampusPoint(records, sourceFeatureId)` returns the exact record or null.
  It accepts exact `node/<id>` identity only; no number/string coercion, fuzzy
  match, whitespace trimming or nearest-point behavior.
- `selectCampusPoints(records, filter?)` is the **inventory query**. With no
  filters it returns all 333, including all unlinked and unplaced rows. It has
  no knowledge of the displayed line section. UI map scope must not implicitly
  constrain the all-campus inventory.
- Optional list filters: `categories`, `nodeIds`, `selectedWayIds`,
  `sectionCollectionIds`, `studyAreaIds`. A list uses OR, different filters use
  AND. Omitted means unrestricted; `[]` selects none; unknown IDs match none.
  Section/area filters use actual joins only and intentionally exclude empty
  joins. The authored audit grouping is never used to satisfy these filters.
- Optional scalar filters: `boundaryStatus`, `linkStatus` (`linked`/`unlinked`),
  `locationStatus`. Query tokens are case-insensitive AND substring matches over
  identity, label, categories, exact joins and original tag keys/values. Empty
  query is unrestricted. Every record, including a fixme row, is ID-searchable.
- Optional `bounds` is `[west, south, east, north]` in WGS84 degrees, **inclusive
  on all edges**. Zero-area bounds are valid. Nonfinite/out-of-range, reversed
  or wrong-length bounds throw a Zod error; no silent full-campus fallback or
  antimeridian wrapping. Bounds select eligible `geometry` only. Supplying
  bounds to an inventory query intentionally excludes unplaced rows, even if
  their retained coordinates lie inside the rectangle. Use no bounds for the
  all-campus inventory.
- `mapCampusPoints(records, filter?)` applies those filters, then removes all
  null geometry. It narrows the returned TypeScript geometry type to Point and
  never promotes retained coordinates to map markers. A review-needed filter
  therefore returns no markers.
- All selection results deduplicate source IDs and sort by ascending **numeric**
  node ID, independent of input/filter order. Helpers do not mutate inputs. Pass
  records from the validated catalog; duplicate selections from that same
  catalog are supported, contradictory versions of a node are not a merge API.
- `countCampusPoints(records)` deduplicates IDs before computing unique `total`,
  `mapEligible`, `locationReviewNeeded`, `interior`, `context`, `linked` and
  `unlinked`. `categoryMemberships` and `selectedWayMemberships` are explicitly
  overlapping memberships, not a unique total. Empty input yields zero counts.

## Reproduction and executed checks

Node **24.22.1**, npm **11.9.0**. Existing installed dependencies were reused
from an identical lockfile; dependency files were not edited.

```sh
node --import tsx src/data/curb/princeton-campus-points/generate.ts --check
npm test -- src/data/curb/princeton-campus-points
npm run typecheck
```

The focused **40 tests passed**, including exact source/projection bytes, all
original node fields, actual 330-way join reconstruction against the frozen
line dataset, empty/multiple joins, context/overlap counts, null dates/Unknown
traversal, category and placement validation, malformed public objects,
inventory/marker search, inclusive and invalid viewport bounds and deterministic
ordering. TypeScript passed. Offline regeneration matched committed public
bytes exactly. A browser-targeted esbuild dependency-graph check also passed:
only `catalog.json`, `contract.ts`, `selectors.ts` and `adapter.ts` from this
folder entered the client bundle; no raw handoff, offline builder or generator.
This was a compilation/dependency check, not a production browser acceptance run.
The existing line-adapter and explorer-model regression tests also passed
**34/34**, including unchanged legacy collections and unplaced field records.

| Artifact | Canonical bytes | SHA-256 |
| --- | ---: | --- |
| `point-source.json` | 358,056 | `eb7f4eece8ed2b95e842a4cc09c5fa25cfade8478ece6120fd83443aaa25ca84` |
| `catalog.json` | 494,609 | `af1b739933ab241d2fd9cec4cbe1178483450d3efb5afcc91e4a6499bb1f337c` |

Both JSON files use UTF-8, two-space indentation and a final LF. The merge owner
must add narrow `text eol=lf` entries for **both** files before Windows checkout
verification. This lane does not edit `.gitattributes` or dependency/config files.

All tracked changes are additions within the reserved new folder and this
document. No runtime registration, current-data mutation, UI, endpoint, public
download, configuration, deployment, child worker or new geographic acquisition
is part of this handoff. Root/merge owner review, Vincent's separately assigned
UI and integrated download/browser acceptance remain subsequent work. OSM
attribution and a public ODbL data offer must accompany the displayed layer.
