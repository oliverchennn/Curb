# Princeton campus point-source handoff

**333 original OSM node records recovered and verified.** This is a source
artifact for a later additive point layer. It does not alter the current campus
line map, its public download, or the application model.

Task `CURB-CAMPUS-POINT-SOURCE/1`, Developer D / Oliver cloud session
`6af808fa-83dc-8191-bd58-80697dbe50c9`. Exact source/base:
`555ee42d0a57f31a7458cee4d7067a20c1fc6d1f`; isolated branch
`codex/campus-point-source`. Prepared November 14, 2026 EST / November 15 UTC.
[Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6887789210)
and [ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6887800625).

Only this document and [CAMPUS_POINT_SOURCE.json](CAMPUS_POINT_SOURCE.json) are
new tracked outputs. Existing application, source data, importer, model, UI,
media and integration branches remained read-only. No geographic network
acquisition, children, application runtime, merge or deployment was performed.

## Exact artifact and inputs

| Item | Immutable evidence |
| --- | --- |
| Handoff schema | `schemaId: curb-campus-point-source`, `schemaVersion: 1` |
| Handoff size | 358,056 UTF-8 bytes |
| Handoff SHA-256 | `eb7f4eece8ed2b95e842a4cc09c5fa25cfade8478ece6120fd83443aaa25ca84` |
| Audit ID-set SHA-256 | `57d3c0824ca8d450b8d264475faa92d49b871995d82a1d53b6e322d925d77c34` |
| Frozen line database SHA-256 | `8bb4b8cdd2b5e89548195f33df5fa09e23c0e16b44c2e47f2059b47f858da6e1` |
| Existing sanitized source SHA-256 | `47338cae35eb146e063cc7c0d458123ffde2873ba7ce291ee584ebabb3e5d959` |
| Existing provenance SHA-256 | `46d8eca512527f0dcd2053c817f778cabe44fde665ade3c3a63d831863e4bcd2` |

The JSON `inputs` object also pins the browse index and exact commit URLs for
all five inputs. Hashes describe canonical repository bytes with LF endings,
not a text-translated checkout. Records sort by numeric OSM node ID; object
keys and string lists sort lexicographically; numeric memberships sort
numerically. Encoding uses two-space indentation and one final LF. No generation
clock value affects the artifact. A second offline generation produced exactly
the same bytes and hash.

Attribution: **© OpenStreetMap contributors**. Data is subject to
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
and the [OSM copyright/attribution notice](https://www.openstreetmap.org/copyright).
The handoff retains these links. It does not incorporate Princeton's official
reference polygons, NJ imagery, Google-derived geometry, DVRPC data, survey
records or photographs.

## Count reconciliation

| Record set | Distinct nodes | Crossing memberships | Kerb | Entrance | Transit |
| --- | ---: | ---: | ---: | ---: | ---: |
| Already present in sanitized source, linked to selected ways | 295 | 221 | 43 | 28 | 3 |
| Recovered from retained raw responses only | 38 | 11 | 1 | 10 | 17 |
| Total | **333** | **232** | **44** | **38** | **20** |

The 333 records comprise **273 inside/on the chosen campus boundaries** and
**60 outside as retained-way context**. Of the initial 295, 235 are interior and
60 context. All 38 raw-only additions are interior. All 333 are within the
original acquisition rectangle `[-74.676,40.318,-74.625,40.356]`.

Node `10828764207` is both crossing and kerb: 334 category memberships represent
333 records. The initial 295 have no category overlap. Thirty-five nodes occur
in multiple selected ways; all **330 node-to-selected-way memberships** are
preserved. Node `8948926332` joins both central and east study areas. A shared
node has one record, even when it has multiple categories, ways or areas.

| Authored study area | Linked node memberships | Raw-only audit grouping |
| --- | ---: | ---: |
| North | 21 | 0 |
| Graduate / west | 20 | 1 |
| Central | 64 | 9 |
| East / athletics | 52 | 2 |
| South | 116 | 17 |
| Meadows | 23 | 9 |

The linked-area column totals 296 because one node joins two areas. The raw-only
column totals 38. These columns are not a new mutually exclusive point-sector
assignment. In particular, a point's association with a complete way does not
prove the point itself lies in that way's authored study area.

## Record contract

`records` contains one object per original node. The original `type`, `id`,
`lat`, `lon`, `version`, `timestamp` and complete `tags` object are preserved
exactly as values. Coordinates are original OSM latitude/longitude in degrees;
they were not snapped, displaced, rounded to a new precision or connected to
nearby lines. `type` remains `node`, not a made-up application feature type.

| Field | Meaning |
| --- | --- |
| `sourceFeatureId` | Stable original identity, `node/<id>`. |
| `categories` | Every applicable category, sorted and deduplicated; predicates below. |
| `boundaryStatus` | `interior` includes outer/hole boundary points, excluding strict hole interiors; `retained-way-context` is outside the combined University/Meadows boundaries but referenced by a selected complete way. |
| `insideAcquisitionEnvelope` | True for every handoff record; a source-extent check, not ownership. |
| `inSanitizedSource` | True for the original 295, false for the recovered 38. |
| `selectedWayIds` | Every frozen selected OSM way containing the exact node ID. Empty for the 38 raw-only points. |
| `studyAreaIds` | Distinct manifest area IDs joined through those selected ways. Empty where there is no selected-way join. |
| `sectionCollectionIds` | Every frozen section collection reached through the selected-way joins. No proximity inference. |
| `unlinkedAuditStudyAreaId` | The previous audit's coordinate-based grouping for each of the 38 unlinked nodes; null for linked nodes. It is an audit aid, not an inferred path connection or product collection. |
| `sourceResponseIds` | Every retained map/relation response containing that exact node, joining the top-level response catalog. |
| `retrieval` | Earliest/latest **known** response retrieval times and a flag for any linked response whose retrieval time was not recorded. |
| `observedAt`, `capturedAt` | Both null. No field observation or capture date is available. |
| `currentTraversal` | `unknown` for every record. |

Category predicates preserve the audit definition:

- **Crossing:** `highway=crossing` or a `crossing` key is present.
- **Kerb:** a `kerb` key is present or `barrier=kerb`.
- **Entrance:** an `entrance` key is present.
- **Transit:** `highway=bus_stop` or a `public_transport` key is present.

These are source categories, not a count of distinct physical facilities.
Transit nodes include platforms, stop positions and station features; multiple
records can describe different aspects of one station. Kerb `lowered`/`flush`
does not establish a compliant curb ramp. Crossings, entrances and transit nodes
must not be relabeled as ramps to satisfy the current application schema.

All original tags in this reviewed set are retained, including public transit
names/operators, wheelchair assertions and unresolved `fixme` notes. Original
editor `user`, `uid` and `changeset` fields are stripped. No editor/contact or
irrelevant personal metadata tags were present in these 333 records. Local paths
are absent from the JSON.

Four original records carry the literal note **`fixme=confim exact location`**:
`8776287626`, `11124620711`, `12785065968`, `12785065969`. The spelling and source
coordinates remain unchanged. Those location uncertainties must survive any
later layer; this task does not resolve them or merge similarly named stops.

## Response lineage and dates

Every original response was hash-verified before extraction. The top-level
`responses` catalog contains all 12 map responses plus the full relation response,
with stable receipt IDs, exact public URL, SHA-256, byte count and retrieval time
where originally recorded. Map receipts also preserve their bounding boxes.
Each record references all responses in which it appears; duplicate copies were
required to agree exactly.

The original full-relation receipt did **not** record a retrieval time. Its
catalog entry therefore has `retrievedAt: null` and
`retrievalTimeStatus: not-recorded-in-original-receipt`. Five candidate nodes also
appear in that response: `6129383300`, `8942160533`, `8942602090`, `8948926336`,
`12140749716`. Each has known map-response retrieval times as well. Their
`hasResponseWithUnknownRetrievalTime` flag is true; the reported known range is
not represented as a complete interval covering that undated response.

Original `timestamp` is the source object's edit time. The recorded map retrievals
are November 14, 2026 EST / November 15 UTC. Neither is a field observation or a
photographic capture. No current construction, dimensions, condition, direction,
entrance/building attachment, route continuity, passability or ADA verdict is
inferred from these records.

## Executed verification

**42/42 independent validator checks passed**, covering:

- versioned schema, exact base, ODbL attribution and deterministic encoding;
- five frozen input hashes and all 13 original response/catalog comparisons;
- exact equality with the released audit's 333-ID set, with no duplicate records;
- all original node coordinates, tags, versions and timestamps, against the raw
  records; only the three editor metadata fields removed;
- complete response lineage, all 330 selected-way joins, all joined areas and
  sections, and unchanged raw-only audit grouping;
- exact 295 existing / 38 recovered and 273 interior / 60 context accounting;
- independent boundary classification using integer coordinates and winding
  numbers, rather than trusting the generated boundary-status field;
- category overlap, location fixmes, all count fields, known retrieval ranges,
  null field dates, unknown traversal and absence of local/editor identity fields.

A separate regeneration check passed byte-for-byte. Repository whitespace and
scope checks passed; only the two authorized new documents changed. No browser,
application test-suite, production-build or deployed-layer acceptance is claimed
for this source-only handoff.

Private generation/validation scripts and receipts remain in the task's ignored
verification directory. Their hashes provide an evidence anchor without adding
scripts to the tracked scope:

| Evidence | SHA-256 |
| --- | --- |
| Generator | `cde74f08de782713c840d9014f936a2c856ef83351d02f44baab874199585aac` |
| Independent validator | `ffb656cafce4007c45344a1e908a01a200c715fcdb9055a924ffb148ca275fcb` |
| 42-check validation receipt | `06ef3e3afce5aff807113a44c1d8650acf3711dbcd9e28b6f463e400e36bbc68` |
| Deterministic regeneration receipt | `047a964bb27432714878ff1d4c06b1f53449fc1a06e5bd157413af6ea704efac` |

## Integration boundary

This handoff is a reviewable input, not a runtime import. A later reservation
must decide the truthful point-type contract, optional layer/selection behavior,
handling of context points and unlinked nodes, source attribution/data offer,
and independent acceptance. Current line-map rendering and public download must
remain unchanged until that work is assigned. Vincent retains the current
line-map/browser lane; the merge owner retains integration. The earlier coverage
audit's broader geometry and field-review gaps remain unresolved by this artifact.
