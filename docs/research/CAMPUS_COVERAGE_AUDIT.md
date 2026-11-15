# Princeton campus coverage audit

**Result: the retained source is accounted for, but it is not a complete campus inventory.**
The download envelope contains every component of the chosen OSM campus boundaries.
The immediate gaps are feature classes and boundary eligibility, followed by missing
field information. Repeating the same rectangular download or manually tracing the
whole campus would not resolve those distinctions.

Task `CURB-CAMPUS-COVERAGE-AUDIT/1`, Developer D / Oliver cloud session
`6af808fa-83dc-8191-bd58-80697dbe50c9`. Reviewed exact published source
`a561892fc443e2c87eddb3676fccbac70c31ee23`, in isolated branch
`codex/campus-coverage-audit`. Research date: November 14, 2026 EST / November 15 UTC.
[ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6887587996) and
[early findings to root, merge owner and Vincent](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6887684018).

Scope remains **university campus only**, including the six existing study areas.
This does not expand to the municipality, the separate Forrestal/PPPL campus, or
every University-owned property. Source, importer, adapter, model, UI and media
were read-only. Vincent owns the successor UI; this report does not review his
unpublished changes or supersede his claim. Only this report and its
[machine-readable companion](CAMPUS_COVERAGE_AUDIT.json) are published by this task.

## Findings and decisions

| Finding | Evidence and implication | Next action |
| --- | --- | --- |
| Acquisition of the chosen boundary is intact | All 23 university outer components, two holes and Meadows lie within the 12-tile envelope. Independent selection reproduces all 1,188 way IDs and coordinates. | Keep the pinned source. Do not call the boundary itself authoritative or complete. |
| Points are omitted from the current adapter | 295 relevant nodes already in the sanitized snapshot, plus 38 additional interior nodes in saved raw responses. | Reserve an additive **333-node** catalog and truthful point types; keep 60 perimeter/context nodes distinguishable. |
| Dedicated paths are only one part of walking geography | 373 other highway ways intersect the chosen area; 22 have road-sidewalk tags. | Review access and separate sidewalk mapping before adding appropriate road context or pedestrian connectivity. These are not 373 confirmed missing paths. |
| The chosen boundary and official neighborhood reference differ | 102 distinct excluded pedestrian-way candidates touch the 14 official reference neighborhoods. | Review boundary-edge approaches and the campus eligibility rule. Neighborhood inclusion alone is insufficient evidence of University ownership. |
| Completeness of buildings and destinations is unresolved | Buildings are not an imported feature class; official building-record queries failed. No complete facility roster was obtained. | Reconcile an authorized facility/destination list, including entrance associations, before making a building-by-building coverage claim. |
| Accessibility is predominantly unknown | Of 1,188 ways, 1,166 lack width, 1,169 incline and 1,187 wheelchair tags. Present tags are also archive assertions. | Use dated field review and measurements for accessibility; preserve unknowns until then. |

These are limitations of the current inventory contract, not evidence that the
importer lost selected geometry. No application regression or product patch is
asserted by this audit. A claim of “all campus paths/accessibility mapped” would
be unsupported.

## Source and acquisition reconciliation

The reused acquisition comprises 12 OSM map responses plus the complete
[University relation 6365145](https://www.openstreetmap.org/relation/6365145),
version 28. The separate [Meadows way 1389673622](https://www.openstreetmap.org/way/1389673622)
supplies the second selection area. Attribution: **© OpenStreetMap contributors**,
[ODbL 1.0](https://www.openstreetmap.org/copyright). The existing
[provenance file](../../src/data/curb/princeton-campus/provenance.json) supplies
all request URLs, times and raw-response hashes; the companion repeats those
receipts for this audit. Retrieval/edit dates are not observations or capture dates.

| Accounting item | Verified result |
| --- | --- |
| Retrieval envelope, W/S/E/N | `[-74.676, 40.318, -74.625, 40.356]` |
| Tile split longitudes | `-74.676, -74.659, -74.642, -74.625` |
| Tile split latitudes | `40.318, 40.3275, 40.337, 40.3465, 40.356` |
| Deduplicated original responses | 65,806 nodes + 8,645 ways + 170 relations |
| Sanitized source | 11,079 nodes + 2,355 ways + 1 relation |
| Boundary outside the acquisition envelope | **0 components; 0 vertices; 0 boundary segments; 0 polygon portion** |
| Boundary components audited | 24 outer rings, two holes; 673 ring segments in total |
| Candidate dedicated pedestrian ways | 2,328 |
| Selected / outside selected area / selected-area `area=yes` exclusions | 1,188 / 1,140 / 0 |
| Selected classes | 1,077 footway; 62 steps; 27 cycleway; 22 path; 0 pedestrian |
| Selected-way original nodes | 5,301 distinct IDs |
| Complete-way perimeter context | 113 selected ways have nodes outside the chosen area; 446 distinct selected-way nodes are outside |
| Complete-way extension beyond the acquisition rectangle | One node on way `966618089`; the fetched complete way reaches latitude `40.3560433` |

Every ring vertex is inside the rectangle. A rectangle is convex, so all ring
segments and their enclosed polygon portions are inside as well. This is an
exact containment conclusion for the retained boundaries, not an approximate
percentage inferred from row counts. Raw relation members were joined by their
original node IDs independently and compared with the committed rings.

The original map API returns complete ways for its selected objects, explaining
the northern extension above. Retaining it is consistent with the existing
contract. Conversely, bounded map acquisition is not a guarantee of every
possible intersecting OSM object: a way with all nodes outside the request area
could cross it, and unrelated/incomplete relations are not a complete topology
inventory. This audit identifies no lost selected boundary component; it does
not quantify unknown physical paths or claim a current global OSM census.

## Six-area ledger

All six rows use the same pinned OSM source and boundaries above. Area names and
cuts are authored browsing aids, not official districts. Exact extents below are
the **retained full-way geometry bounds**, which can cross the selection boundary.

| Area | Ways / sections | W/S/E/N extent | Linked point candidates (outside area boundary) | Additional interior points absent from snapshot |
| --- | ---: | --- | ---: | ---: |
| North | 84 / 2 | `[-74.6690109,40.3511847,-74.6630792,40.3560433]` | 21 (3) | 0 |
| Graduate / west | 56 / 1 | `[-74.669837,40.335614,-74.6619523,40.3488284]` | 20 (7) | 1 |
| Central | 443 / 8 | `[-74.6645474,40.3442887,-74.6493804,40.351811]` | 64 (34) | 9 |
| East / athletics | 125 / 2 | `[-74.6531285,40.3409793,-74.6322224,40.351887]` | 52 (14) | 2 |
| South | 440 / 8 | `[-74.6627731,40.3192245,-74.6297684,40.3453415]` | 116 (2) | 17 |
| Meadows | 40 / 1 | `[-74.6475364,40.3322027,-74.6351498,40.3419712]` | 23 (0) | 9 |

“Outside” in that column means outside the combined OSM university/Meadows
selection, not outside an authored study-area rectangle. Point memberships are
not additive across areas: node `8948926332` belongs to both central and east
selected ways. The six rows total 296 memberships but **295 distinct** linked
points. Additional interior points are grouped by coordinate cuts for audit only;
no new product membership or snapped connection was created.

| Area | Known omissions / unresolved coverage | Concrete next review and confidence |
| --- | --- | --- |
| North | 21 linked point records are not displayed. Thirteen non-selected highway ways touch the source area when assigned by center. One full-way extension crosses the download edge. All 84 ways lack width/incline/wheelchair tags. | High confidence in retained geometry accounting; limited independent campus-roster coverage here. Review named northern facilities/approaches against an authorized roster; preserve the complete edge way. No extra rectangle fetch is justified by that retained extension alone. |
| Graduate / west | 20 linked points and the unlinked Graduate College transit platform are absent as features. Thirty-four other highway ways. Three selected paths have `access=private`. College Road reference overlap includes neighboring institutions. | Review College Road sidewalk assertions and the Graduate College arrival/entrance chain, with property/access eligibility explicit. Inspect source paths `86780765`, `86780805`, `86783503` before interpreting access. Independent neighborhood overlap is a candidate signal, not permission to import Seminary paths. |
| Central | 64 point memberships, including 34 outside-boundary approach nodes; nine additional interior points. Fifty-seven other highway ways. Some William Street/University Place approaches are outside selected boundaries. Forty-seven selected ways are steps. | Review boundary approaches, building entrances and source road/footway joins. Preserve the tags on way `459656778` (`steps`, `ramp=yes`, `wheelchair=yes`) without inferring ramp geometry or measured accessibility. Field review must resolve the actual arrangement. |
| East / athletics | 52 linked points, two additional interior transit points and 53 other highway ways. Official Stadium/Ivy Lane/Prospect reference areas include excluded path candidates. Four selected ways are steps. | Review stadium/athletics arrival points, Washington Road approaches and restricted/private-property edges. Require an explicit eligibility decision for eating-club approaches. Reference overlap alone cannot establish ownership or current through access. |
| South | 116 linked points, 17 additional interior points and 205 other highway ways, many service roads. Buildings/destinations at Lawrence/Lakeside/station areas have no complete imported inventory. Way `1312137145` has private access/foot/bicycle tags. | Prioritize Princeton station, Stadium Drive Garage, Lawrence/Lakeside entrances and links around construction. Distinguish platforms, stop positions and station nodes rather than counting all as separate physical bus stops. Field-review current connections; the backdrop is from 2020. |
| Meadows | 23 linked points, nine additional interior points and 11 other highway ways. The official Meadows reference overlaps two excluded path candidates, `1223890447` and `46619517`; the OSM polygon and official reference do not match. | Review both edge candidates and the Meadows Apartments transit/entrance cluster using source IDs and authorized current references. The larger path `46619517` extends along the northern reference edge; overlap is not a current connectivity finding. New construction/approach continuity requires dated evidence. |

The omitted-highway counts use a disclosed center-based audit allocation and sum
to 373; they are not extra pedestrian routes. Exact IDs and area memberships are
in the companion. Quantitative source reconciliation is high confidence. The
physical completeness of every row remains unresolved without an authoritative
destination/edge inventory and current field validation.

## Point reconciliation and additive catalog proposal

Predicates are explicit: crossing is `highway=crossing` or a `crossing` key;
kerb is a `kerb` key or `barrier=kerb`; entrance is an `entrance` key; transit is
`highway=bus_stop` or a `public_transport` key. These preserve source categories;
they are not physical-facility counts or ADA verdicts.

| Node set | Distinct nodes | Crossing memberships | Kerb | Entrance | Transit |
| --- | ---: | ---: | ---: | ---: | ---: |
| Referenced by selected ways | 295 | 221 | 43 | 28 | 3 |
| Of those, inside/on chosen boundaries | 235 | 178 | 26 | 28 | 3 |
| Of those, outside as complete-way context | 60 | 43 | 17 | 0 | 0 |
| Additional raw nodes inside, not referenced by selected ways | 38 | 11 | 1 | 10 | 17 |
| Proposed union | **333** | **232** | **44** | **38** | **20** |

There is **no category overlap among the initial 295**. One additional node,
`10828764207`, is both crossing and flush kerb, so the final 334 category
memberships represent 333 nodes. The existing 43 kerbs are 37 `lowered` and six
`flush`; the additional kerb is also `flush`. These labels do not certify a
compliant curb ramp. All 333 candidates lie inside the acquisition envelope.

Thirty-five of the initial nodes reference multiple selected ways. Deduplicate
by `node/<id>`, retain every source-way association, and support multiple category
memberships. The point layer must distinguish **273 interior nodes** from **60
retained-way context nodes**. None of the 38 unlinked interior nodes is present
in sanitized `osm-source.json`; recover them from the already saved, hash-verified
responses with original ID, coordinates, tags, version and edit timestamp. Do not
invent a connector to the nearest path. Transit source records can describe
different aspects of one station, not necessarily distinct stops.

There are another ten tagged selected-way nodes outside the four predicates,
including gates, rail crossings, traffic signals and a no-exit assertion. Keep
them in an explicit later review queue rather than silently claiming the four
categories exhaust all point evidence. IDs are in the companion.

The current `model.ts` permits a `Point` only for `ramp`; `crossing` and `path`
require `LineString`. A truthful additive implementation therefore needs a
separate model/UI reservation for crossing points, kerbs, entrances and transit
(or a well-defined generic source-point type). **Do not cast all candidates to
ramps.** Reserve importer/snapshot, adapter, contract and UI changes together
after Vincent's released overview/section checkpoint. Preserve the line dataset
and legacy IDs, use independent point counts, and expose a compact optional layer
with filter/list/keyboard access. Current traversal stays Unknown; observations,
capture dates and measurements remain absent unless separately evidenced.

## What line selection represents and omits

The 101 “sidewalk-tagged ways” are **`footway=sidewalk`**, not road-sidewalk keys.
Selected ways have zero `sidewalk`/`sidewalk:*` keys. There are 131
`footway=crossing` lines, of which 127 also carry a `crossing` key. Counts are
source segments, not a count of distinct physical sidewalks or intersections.

The raw snapshot contains 1,561 complete highway ways touching the selection;
1,188 are retained. The remaining **373** are 256 service, 59 residential,
23 secondary, 13 tertiary, ten track, eight unclassified, two primary, one
living-street and one `road`. Their exclusion follows the chosen dedicated-path
class filter. Some may be meaningful walking links; others are vehicular,
restricted or already represented by separate sidewalks.

Of the 22 omitted ways with road-sidewalk keys, **19 say a sidewalk is mapped
separately**. Two College Road segments (`365781849`, `365781850`) assert a
right/both-side sidewalk; Butler Avenue `48427228` says `sidewalk=both`.
Examples of `separate` include University Place `11642143` and Faculty Road
`11642596`. Retain road centerline semantics if used as context. Never offset a
centerline to fabricate exact sidewalk geometry, duplicate a separate footway,
or automatically make a vehicle road a traversable pedestrian edge.

No `highway=pedestrian` or selected-area `area=yes` pedestrian polygon was found
among the acquired candidates. A raw `area:highway=service` polygon, `141452123`,
touches the selection and is omitted. A plaza/courtyard or open pedestrian area
cannot be represented correctly by treating its polygon perimeter as a route.
Buildings, indoor corridors, floors, lifts and internal entrance connections are
not part of this line adapter. Their absence is not evidence that a building is
inaccessible or that no such geometry exists elsewhere.

No selected `indoor` or `construction` tags were found; that is **not** evidence
of no indoor routes or current construction. Four selected ways have
`access=private`, two `permissive`, eight `yes`; the other 1,174 lack that tag.
One selected way separately has `foot=private`. Explicit access/lifecycle tags
must survive any expanded query, and current restrictions must remain unknown.
Geometry intersections and shared source-node IDs do not by themselves establish
usable connections, grade separation, direction, opening hours or safe passage.

## Independent references and unresolved destinations

Princeton's saved official web-map configuration identifies its Buildings,
Building Entrances, Neighborhoods, Campus Impacts and Accessibility Guides
services. This audit made only **four new public read queries**: Buildings
metadata, Neighborhoods features, and two Buildings record queries. Exact URLs,
UTC times, response sizes, hashes and application errors are recorded in the
companion and private receipts.

The [official Neighborhoods layer](https://facgisprd.princeton.edu/server/rest/services/Property/Neighborhoods/MapServer/0)
returned all 14 features without a transfer-limit flag. All lie inside the
acquisition rectangle. Their geometry was used privately for comparison only;
it is neither imported into product data nor redistributed here. Public query
access does not establish a redistribution license. Neighborhoods are also not
a legal campus/property boundary.

| Official reference neighborhood | Selected ways touching reference | Excluded dedicated-path candidates touching reference |
| --- | ---: | ---: |
| College Road | 62 | 26 |
| University Place | 192 | 15 |
| Woodlands | 25 | 0 |
| Museum | 102 | 0 |
| Nassau | 110 | 15 |
| Lawrence | 49 | 0 |
| Stadium | 103 | 3 |
| Ivy Lane | 33 | 4 |
| The Meadows | 35 | 2 |
| Prospect Avenue | 65 | 21 |
| William Street | 49 | 20 |
| Lakeside | 32 | 0 |
| Theater | 145 | 1 |
| The Ellipse | 139 | 2 |

These reference counts overlap and must not be summed as campus totals. The
excluded column represents **102 distinct OSM ways**. Every reference polygon
also has some vertices outside the chosen OSM boundary; vertex counts in the
companion are diagnostic, **not percentages of uncovered area**. Zero excluded
candidates in a neighborhood does not establish physical completeness.

Named OSM building examples outside the chosen boundary but overlapping these
reference neighborhoods include Procter House (`1386386846`), Springdale
(`652521640`), Tiger Inn (`141087518`), and other Prospect Avenue eating clubs.
They are **eligibility questions**, not confirmed omissions of University-owned
buildings. The same comparison includes Mackay Campus Center, other neighboring
institution buildings, a restaurant and a church; indiscriminately adopting the
reference polygon would broaden the dataset incorrectly. The prior study scope
explicitly excludes Princeton Theological Seminary and the Institute for
Advanced Study as independent institutions.

The [official Buildings metadata](https://facgisprd.princeton.edu/server/rest/services/Building/Buildings/MapServer/0)
was available, but both the bounded record query and a simpler attribute-only
retry returned HTTP 200 carrying **ArcGIS error 400, “Failed to execute query.”**
No usable official building roster was obtained. The report therefore cannot
count every missing campus building or establish a property-wide denominator.
Resolve this with an authorized official list/working service and explicit
campus eligibility, then compare destinations and entrances by identity. Do not
interpret those failures as zero buildings. The separate Forrestal/PPPL area and
other outlying properties were not acquired or audited; adding them needs an
explicit geography decision and appropriately licensed source coverage.

The official Facilities map/entrance and AccessAble links are useful reference
checks for later field planning. The NJ aerial year (2020) predates newer Meadows
work and cannot establish current absence, width, condition or passability.
No Google imagery, coordinates or derived observations were acquired or retained
by this audit. Google source-role/terms review remains with the merge owner.

## Accessibility gaps are separate from geometry gaps

| Authored area | Missing width | Missing incline | Missing wheelchair | Missing surface | Missing lighting |
| --- | ---: | ---: | ---: | ---: | ---: |
| North | 84 | 84 | 84 | 83 | 84 |
| Graduate / west | 56 | 56 | 56 | 41 | 56 |
| Central | 440 | 433 | 442 | 321 | 441 |
| East / athletics | 125 | 123 | 125 | 96 | 122 |
| South | 422 | 433 | 440 | 320 | 421 |
| Meadows | 39 | 40 | 40 | 28 | 35 |
| Total | **1,166** | **1,169** | **1,187** | **889** | **1,159** |

The 19 incline tags include 18 qualitative `up`/`down` values and only one
`30%` assertion. They are not 19 measured gradients. The 22 widths and single
wheelchair tag are not validated measurements either. Do not fill unknowns from
imagery, source dates, accepted records, cracks or the Robertson footage.
Needed field evidence includes measured clear width, slope/cross-slope, steps
and ramp arrangements, kerb/tactile details, surface condition, gates/hours,
construction restrictions and entrance continuity, with dates, direction,
uncertainty and provenance. Preserve conflicting/multiple blockers separately.

## Bounded next-work checklist

1. **Agree campus and approach eligibility.** Keep the current university-only
   baseline; explicitly decide on adjacent public approaches, eating clubs,
   northern housing and any outlying university sites. Do not use a broad
   rectangle or neighborhood polygon as automatic ownership evidence.
2. **Add the 333-node candidate inventory from retained source.** Sanitize the
   extra 38 raw nodes; preserve categories, stable IDs, source lineage and
   context status. Reserve the point model/UI work separately; independently
   verify counts, linkage, keyboard access and no invented path connections.
3. **Review the 22 road-sidewalk assertions and 102 boundary-edge candidates.**
   Work through exact OSM IDs, existing separate geometry and authorized campus
   references. Publish an inclusion/exclusion reason per candidate. Do not bulk
   import all 373 omitted roads.
4. **Reconcile destinations and missing geometry.** Obtain a usable authorized
   facility/entrance roster. Review Meadows/athletics/Graduate/station approaches
   against current permitted sources. A small targeted OSM query can resolve a
   particular dated source gap; new field GPS/survey evidence can resolve an
   actual missing physical connection. Neither is authorized as an import here.
5. **Field-review accessibility and current closures.** Keep that backlog
   distinct from geometry acquisition, preserving unknowns until verified.
6. **Publish a coverage ledger with the next release.** State the chosen extent,
   source age, excluded classes, known unresolved areas and point context; offer
   the applicable ODbL data/attribution. “More comprehensive campus archive” is
   supportable after these reviewed additions; “complete accessible campus map”
   still requires a defined denominator and appropriate verification.

Six manual tracing chats are unnecessary for the known additive data. If a
bounded residual review backlog remains, the existing six area IDs can divide
it without duplicate work, but the orchestrator must issue those assignments.
No child agents, parallel mapping jobs or new acquisition/import were started.

## Verification and limits

**32/32 offline assertions passed.** These include all 13 raw-response hashes,
sanitized-source field equality, exact tiling, independent raw relation joins,
boundary containment, independent way selection, original coordinates/node
order, deduplicated point/area accounting and highway/reference reconciliation.
The independent geometry check includes boundary-inclusive/hole-exclusive
semantics. Application tests, browser acceptance, builds and deployment were
not run for this documentation/data-audit task.

| Immutable evidence | SHA-256 |
| --- | --- |
| `osm-source.json` | `47338cae35eb146e063cc7c0d458123ffde2873ba7ce291ee584ebabb3e5d959` |
| `campus.json` | `8bb4b8cdd2b5e89548195f33df5fa09e23c0e16b44c2e47f2059b47f858da6e1` |
| `provenance.json` | `46d8eca512527f0dcd2053c817f778cabe44fde665ade3c3a63d831863e4bcd2` |
| Private independent `audit.py` | `2d79a60d5a470fbfc39a4dfd9e0a95fb2f271950ad7513968d32f1e8aac49eba` |
| Private `audit-results.json` | `7c72beabbc4cbf92335aeb8af6186da4dfcab18c3ae8f95c41a627d2b07ff7fc` |

Private scripts, original reference responses and receipts remain under
`.curb-local/campus-coverage-audit/`; original OSM responses remain in
`/workspace/scratch/princeton-campus-research/`. The published companion contains
counts, source receipts and candidate IDs, not official reference geometry,
editor identities, personal inputs or credentials. No current traversal,
measurement, route safety or ADA acceptance is implied.
