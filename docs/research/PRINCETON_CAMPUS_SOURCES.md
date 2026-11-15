# Princeton university campus mapping: source decision and implementation

Task `CURB-PRINCETON-CAMPUS-MAP/1`, Developer D, existing cloud session
`6af808fa-83dc-8191-bd58-80697dbe50c9`. User confirmed **university campus only**.
Research and acquisition: November 14, 2026 EST / November 15 UTC. Implementation
base `fd697515eecc6e4ba3f8259f7e8cd8b05f78d256`, isolated branch
`codex/princeton-campus-map`. This is a separate slice from the portrait, save/reset
and explorer UI releases.

## Decision

Import **OpenStreetMap pedestrian geometry**, retain DVRPC as a distinct archive,
and use Princeton's official map and AccessAble as linked reference sources.
Do not redraw campus from Google Earth. The available dataset removes the need
for six chats to trace the same paths manually.

The implemented snapshot contains **1,188 complete source ways** intersecting
OSM's Princeton University multipolygon and its separately mapped Meadows
Neighborhood area. These include Graduate College/west campus, the central and
eastern campus, athletics, northern/southern university areas and Meadows.
This is a map of available campus geometry, **not a claim that every physical
path, entrance, construction change or accessibility condition is mapped**.
It excludes town-wide coverage, Princeton Theological Seminary and the Institute
for Advanced Study as independent institutions. It does not claim coverage of
the separate Forrestal/PPPL campus or every University-owned property.

The source selection is D's evidence-based decision, acknowledged by the
orchestrator. Vincent was invited to compare official GIS and OSM sources on the
board; no absent reply is represented as agreement. The collaboration remains
open. B's active save/reset and Chrome-audit task was not displaced.

## What the repository had

At the pinned base, `explore/data.ts` exposes 20 mapped DVRPC features (10 lines,
10 ramp points), four unplaced archive targets, five unplaced Robertson footage
findings and two synthetic conflict records across five collections. The source
ZIP contains a larger **148-line / 83-ramp** corridor extract, still not a campus
network. Existing source IDs, records, collection membership, photos and conflicts
are preserved by the new adapter; no old branch was cherry-picked.

The strict atlas supports line/point geometry and requires real source IDs. It
does not encode a surveyed routing graph. Campus data therefore adds compatible
archive records, rather than attaching photographs, inferring ramp locations or
creating accessibility edges. Buildings and entrance polygons are not converted
into fake path lines or ramp points.

## Source comparison

| Source | What the research actually established | Decision |
| --- | --- | --- |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Reusable under ODbL with attribution and applicable database share-alike. Actual downloaded campus interior geometry is far denser than DVRPC. Original IDs, nodes, tags, edit versions and timestamps are available. | Primary offline pedestrian geometry. Keep data license separate from code license. |
| [DVRPC pedestrian network](https://catalog.dvrpc.org/dataset/dvrpc-pedestrian-network) | A regional sidewalk/crosswalk/trail inventory. The catalog states unrestricted internal/external sharing; its license field is blank, so also retain the [general data terms](https://catalog.dvrpc.org/dvrpc_data_license.html), which require credit and describe planning limitations. | Retain existing records. Useful supplementary perimeter/ramp source; inadequate alone for internal campus paths. |
| [Princeton Facilities campus map](https://facilities.princeton.edu/maps) | Current official map with entrances and AccessAble links. Public embedding/printing is documented. Queried ArcGIS application and web-map metadata have empty license fields; public query capability is not an explicit redistribution license. | Link/reference for naming, entrances and current construction. Do not copy its underlying database into this release without suitable terms. |
| [Princeton CST QGIS tutorial](https://cst.princeton.edu/mapping-princeton-qgis) | Its downloadable paths/buildings teaching data explicitly derives from OSM under ODbL. It is not a separate current University survey. | Confirms an established OSM workflow; obtain a fresh, pinned extract instead of silently presenting a teaching snapshot as current. |
| [Princeton library geospatial portal](https://dpul.princeton.edu/atlases/about/digital-maps-and-geospatial-data-portal-pulmap) | Mixes public, University-affiliate and on-site materials. No blanket campus dataset reuse right follows from portal access. | Discovery/reference, not the initial production source. |
| [Overture transportation](https://docs.overturemaps.org/guides/transportation/) | Provides roads/paths/connectors derived in part from OSM, with transportation under ODbL. Adds a release/schema/import layer; it is not independent evidence of campus accessibility. | Useful alternative for regional scaling. Direct OSM is simpler for this bounded campus import and preserves original node/way identity. No claim that Overture campus coverage was downloaded or tested. |
| [NJ OGIS 2020 orthophotography](https://maps.nj.gov/arcgis/rest/services/Basemap/Orthos_Natural_2020_NJ_WM/MapServer) | Official georeferenced aerial context. A source year is not an exact capture date, a field observation or evidence that a newer path is absent. | Root owns a wider separately attributed offline backdrop. No imagery changes in D's scope. |
| [Google Earth terms](https://www.google.com/help/terms_maps-earth/) | Terms restrict copying/bulk downloads and certain reuse into other mapping datasets. Annotation/export capabilities do not grant unrestricted reuse of imagery-derived data. | Do not use Google Earth tracing as the project data pipeline. Use appropriately licensed geometry/imagery or new field evidence. |

Princeton announced its in-house official map in
[April 2026](https://inside.princeton.edu/community-news/2026/princeton-facilities-introduces-new-interactive-campus-map).
That announcement said step-free routing was planned; the currently retrieved
Facilities page now describes a step-free directions widget. Neither statement
is converted into Curb's independent verification of any route. The
[Meadows project](https://facilities.princeton.edu/projects/meadows-neighborhood)
and [housing page](https://hres.princeton.edu/meadows) establish why southern
campus coverage matters; the latter describes continuing Washington Road
connectivity work. A 2020 backdrop predates those newer facilities.

## Measured coverage, not a row-count assumption

DVRPC's candidate research envelope `[-74.680,40.325,-74.625,40.360]` returned
1,912 lines and 1,244 ramp records. All are tagged `captured=AERIAL`; all line
condition dates are null. Ramp archive statuses are 684 ASSUMED, 552 EXISTING
and 8 MISSING. Those labels do not establish current ramp existence or absence.
Plotting actual lines against the university area shows large campus-interior
gaps. The high count mostly represents surrounding road corridors.

OSM acquisition used twelve small API bounding boxes within
`[-74.676,40.318,-74.625,40.356]`, plus the complete university relation. The
initial larger API request exceeded the documented server node limit; bounded
requests succeeded. Several public Overpass requests timed out; they supplied
no data. The source responses total about 20 MB, with no conflicting duplicate
object versions across tiles. The retained snapshot removes unrelated objects
and editor identities, while preserving all candidate pedestrian geometry and
the boundary members needed to reproduce inclusion.

The research download rectangle is **not** the campus boundary. Inclusion uses:

- [Princeton University relation 6365145](https://www.openstreetmap.org/relation/6365145), version 28, with its disjoint outer rings and two inner holes;
- [Meadows Neighborhood way 1389673622](https://www.openstreetmap.org/way/1389673622), explicitly tagged as Princeton University's university area.

The importer joins boundary members by their original node IDs; an unclosed
ring fails rather than acquiring an invented closing edge. It selects source
`footway`, `path`, `pedestrian`, `steps` and `cycleway` ways that intersect either
area. It handles crossing segments with no endpoint inside, respects holes,
and retains complete original ways, including boundary-crossing portions.
Vehicular streets are not silently assumed to be pedestrian paths. This is a
geometry inventory, not a connected or accessible routing solution.

| Coverage | Count |
| --- | ---: |
| Candidate pedestrian ways in the retained source | 2,328 |
| Selected campus ways | 1,188 |
| Outside the source campus areas | 1,140 |
| Excluded area=yes pedestrian polygons | 0 |
| Footways / steps / cycleways / paths | 1,077 / 62 / 27 / 22 |
| Ways without width / incline / wheelchair tags | 1,166 / 1,169 / 1,187 |

Missing tags stay unknown. Present tags remain source assertions, not measured
quantities or compliance verdicts. All archive observation and capture dates
are null; source edit dates stay separate from retrieval time. Even a recent
OSM edit may concern a name rather than a field visit.

Selected full-geometry bounds are
`[-74.669837,40.3192245,-74.6297684,40.3560433]`. Some source ways extend outside
campus; their complete geometry is retained without claiming those portions
are University property. Proposed padded imagery extent for root is
`[-74.672,40.318,-74.628,40.357]`.

## Data and UI contract

`src/data/curb/princeton-campus/` contains the sanitized immutable source snapshot,
acquisition provenance, generated campus database, license notice, atlas adapter
and tests. `campus-index.json` is a lightweight sidecar with no full geometry:

```text
schemaVersion: 1
group: { id: "campus", label: "Campus (OSM)" }
counts, bounds, retrievedAt, source { license, credit, copyrightUrl, licenseUrl, datasetSha256 }
studyAreas[] { id, name, count, bounds, sectionIds }
sections[] { collectionId, code, areaId, areaLabel, section, sectionsInArea,
             areaWayCount, bounds, wayCount, featureIds, recordIds }
```

Collections retain the existing strict atlas schema. IDs begin `campus-`;
feature IDs are `campus-osm-way:<way-id>` and record IDs are
`record:campus-osm-way:<way-id>`. All five previous collection IDs and records
remain unchanged. No context lines are added to the existing atlas.

| Authored browsing area | Ways | Sections |
| --- | ---: | ---: |
| Northern university areas | 84 | 2 |
| Graduate College / west campus | 56 | 1 |
| Central campus | 443 | 8 |
| East campus / athletics | 125 | 2 |
| Southern university areas | 440 | 8 |
| Meadows Neighborhood | 40 | 1 |
| **Total** | **1,188** | **22** |

Area cuts and median spatial bisection are documented in the generated data.
They are browsing divisions, not inferred legal boundaries or named routes.
Each selected way occurs in exactly one section; the largest has 63 ways
(cap 64). Complete source geometries are never simplified, clipped or moved
to make the partitions fit. Source IDs survive later reviewed updates;
partition IDs belong to this pinned snapshot and must be reviewed on refresh.

C's separately assigned UI work uses **campus overview → section selector →
inspection**, not 22 permanent chips or 1,188 numbered markers. Overview can
derive all geometry through index/atlas joins. It needs visible OSM attribution
at every width, an honest hidden-label count if labels are suppressed, and
keyboard/list access to every record. D does not edit that UI or the strict
model. Existing DVRPC-only global test counts need to become source-scoped
assertions when this expansion integrates.

## Reproduction and refresh

No runtime network calls, API keys or new application dependencies are added.

```sh
# Reproduce the committed output entirely offline.
node scripts/import-princeton-campus.mjs --check
npx vitest run src/data/curb/princeton-campus

# Explicit future one-off refresh, in a new reviewed task; never a background job.
node scripts/import-princeton-campus.mjs --fetch .curb-local/campus-download

# Re-import already acquired API responses and SHA receipts.
node scripts/import-princeton-campus.mjs --prepare .curb-local/campus-download
```

On a managed runtime requiring an HTTPS proxy, use Node's supported
`--use-env-proxy` flag. The network refresh path is a provided command, **not
claimed executed validation**; this run acquired the exact same bounded API
responses through a Python research client, then exercised `--prepare` and
offline regeneration. The importer fails on partial response sets, checksum
mismatch, changed duplicate objects, missing nodes or unclosed boundaries.
Refreshes require renewed source/coverage/attribution review; they do not
automatically become current field observations.

## Manual work still worth doing

Do not launch six duplicate tracing chats. A dataset supplies geometry;
neither it nor six image readers can establish today's width, cross-slope,
surface defects, restrictions or passability without appropriate evidence.

After the imported map is usable, a **conditional six-sector QA plan** can use
the six `studyAreas` entries above as disjoint review scopes: Oliver's three
chats review north, west/Graduate and central; Vincent's three review east,
south and Meadows. The orchestrator should issue those cards only when a real
gap-review backlog exists. Each reviewer uses the same pinned dataset/index,
reports original way/node IDs, source URL/date, apparent discrepancy and
confidence, and leaves all product files read-only. Cross-area features have
one owner from the manifest. Aerial-only apparent gaps stay proposals; no
automatic bridge, entrance attachment or “missing ramp” observation is created.

Prioritize new Meadows connections, construction changes, campus entrances,
steps/ramps, and links at source-area edges. For an actual edit, use licensed
imagery or new GPS/field observations with dates, uncertainty and provenance.
Keep conflicting evidence alongside the archive. A separate reviewer verifies
the change before the merge owner publishes it. OSM contribution, contacting
University staff and deploying the application are not actions performed by
this task.

## Validation status

The separate machine-readable receipt records exact hashes and executed checks.
An independent Python/Matplotlib polygon/segment check and the JS importer
selected the same 1,188 way IDs (symmetric difference zero). Focused tests cover
holes, crossing segments, missing/duplicate inputs, unclosed rings, full source
coordinate/tag preservation, complete bounded partitions, atlas joins, unknown
dates and preservation of the old field/conflict collections.

This data handoff is not a deployment claim. Campus UI attribution, overview,
large-section interaction and the wider aerial are separately owned integration
dependencies. Exact browser/build results and any stale baseline test assertions
are recorded in the receipt before final release.
