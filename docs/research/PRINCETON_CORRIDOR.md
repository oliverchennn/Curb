# Princeton corridor: proposed field packet

Prepared 2026-11-14 for `PRINCETON-FIELD-PREP/1`, assigned base `c952d7de0328bb31ba5f677b9800684b2c6366b8`. This is a scouting and photography plan. No field visit, current passability, measurements or repair outcomes are recorded. All current traversal states remain **unknown**.

Use the [18-stop checklist](PRINCETON_FIELD_CHECKLIST.csv) alongside the [source audit](PRINCETON_SOURCE_AUDIT.json). The audit binds every archived feature to its provider, layer, snapshot and exact hash; its web retrieval records distinguish source guidance from a project observation. [Original research checkpoint](https://github.com/vzhu08/Curb/issues/1#issuecomment-6873427490) and [assignment](https://github.com/vzhu08/Curb/issues/1#issuecomment-6876473105).

## Scout selection

Keep the short **Hinds Plaza / library → east Witherspoon at Spring → Nassau crossing → FitzRandolph Gate → Nassau Hall west-side elevator-lobby entrance** corridor. It connects three identifiable entrance targets, includes paired crossing ends and has an alternate crossing chain close to the primary one. That makes it useful for testing evidence completeness without importing a city-wide network. Its usable length and traversal time have not been measured.

The main archival chain is line `889957` toward Spring, crossing `834112`, path `809875`, corner link `986574`, then Nassau crossing `834108`. The alternate from the south end of `809875` crosses Witherspoon on `1010009`, uses corner link `1004047`, crosses Nassau on `957434`, and returns along south-side path `942676`. Path `951724` continues east of the primary south landing. **The actual gate attachment and campus path to the elevator-lobby door are unverified**, so neither branch is a completed surveyed route.

The wider-window `MISSING` ramp lead `491033` at `[-74.658703171, 40.346424634]` is outside this central scout. Do not add a detour solely to find a dramatic barrier. Pittsburgh imagery labels remain a separate research source. If the campus spur cannot be identified or inspected, retain its unknown status and finish the town-side evidence packet; that is a useful bounded result.

## Verified archive anchors

These coordinates were read from the pinned ZIP, not geocoded from street names. Display values below are rounded to eight decimal places; the JSON preserves the raw coordinates. Order is **longitude, latitude**, EPSG:4326. Side/direction labels are scouting descriptions to confirm onsite. `EXISTING` and `ASSUMED` are archived DVRPC statuses, not project observations.

| Crossing / side | Ramp ID | Archived status | Longitude | Latitude | Crossing line |
|---|---|---|---|---|---|
| Spring, east of Witherspoon, north end | 448038 | EXISTING | -74.66019684 | 40.35093591 | 834112 |
| Spring, east of Witherspoon, south end | 454485 | EXISTING | -74.66015112 | 40.35082636 | 834112 |
| Nassau east leg, north end | 461092 | EXISTING | -74.65970086 | 40.34977020 | 834108 |
| Nassau east leg, south end | 554811 | EXISTING | -74.65961625 | 40.34958760 | 834108 |
| Witherspoon near Nassau, east end | 496163 | EXISTING | -74.65972313 | 40.34980137 | 1010009 |
| Witherspoon near Nassau, west end | 562921 | EXISTING | -74.65987616 | 40.34976106 | 1010009 |
| Nassau west leg, north end | 501839 | ASSUMED | -74.65987535 | 40.34972500 | 957434 |
| Nassau west leg, south end | 577885 | ASSUMED | -74.65976971 | 40.34954233 | 957434 |

The line endpoint pairs above match the ramp coordinates exactly in the archive. This checks source association only. It does not establish present crossing usability, permitted direction, signal operation or physical continuity.

| Connecting path | Exact archived endpoint association | Field question |
|---|---|---|
| 889957 | 448038 ↔ 568004 (`[-74.660383954, 40.351313608]`) | Does the plaza approach join this sidewalk? The northern endpoint is not a library-door coordinate. |
| 809875 | 454485 ↔ 496163 | Is the whole east Witherspoon sidewalk continuous, including intermediate driveways/obstacles? |
| 986574 | 496163 ↔ 461092 | Can the northeast corner connect its two distinct ramp heads? |
| 1004047 | 562921 ↔ 501839 | Can the northwest corner join the alternate crossings? Preserve this small connector. |
| 942676 | 577885 ↔ 554811 | Do both Nassau exits reach the same continuous south sidewalk? |
| 951724 | 554811 ↔ 478465 (`[-74.658487071, 40.349874480]`) | Where does the real gate approach attach? No gate coordinate is inferred from this endpoint. |

Ramps `568004` and `478465` identify the other archived endpoints of the two outer paths; they are not among the eight selected crossing ends or newly inferred entrance positions. The endpoint audit checks all 83 archived ramps.

## Three entrance targets

Primary pages were retrieved and inspected on **2026-11-14 at approximately 06:27 EST / 11:27 UTC**. All seven requests returned HTTP 200, with the glossary redirect noted below. Retrieval confirms what the page said, not that the entrance was open or its condition recently surveyed. All three entrance coordinates and source observation dates remain unknown.

| Target | Primary guidance | What the field record must establish |
|---|---|---|
| Library front door beside Hinds Plaza | [Library location](https://princetonlibrary.org/about-us/location-hours-book-drops/) gives Sands Library Building, 65 Witherspoon Street. [Library plaza page](https://princetonlibrary.org/exhibition/hinds-plaza-gates/) places a pair of Hinds Plaza gates outside the front door. | Identify the actual door and approach; record coordinates/method, threshold, opening, controls and current access hours. Confirm published hours before any planned visit. |
| FitzRandolph Gate | [University history](https://princetoniana.princeton.edu/campus/landmarks/fitzrandolph-gate) identifies this campus entrance and describes regular use since 1970. | Photograph the full passage and both approaches, measure opening/threshold if possible, and record any current restrictions or barriers. Historical open use does not settle today's condition. |
| Nassau Hall west-side accessible entrance to level G elevator lobby | [AccessAble's Nassau Hall guide](https://www.accessableusa.com/princeton-university/access-guides/nassau-hall), linked through [Princeton Facilities maps](https://facilities.princeton.edu/maps), identifies an accessible entrance west of the building, giving access to the level G elevator lobby / West Wing elevator. It describes a card reader, automatic door and push plate/sensor. **The separately named west entrance, like the north and east entrances, has steps in that guide.** | Distinguish the elevator-lobby door from the west stairs. Confirm the actual campus approach, threshold/opening, permitted operation and visitor/card restrictions. Do not label every west-side door step-free or copy guide measurements as new measurements. |

## Using the checklist

The CSV has 18 stable IDs, `PRN-01`–`PRN-18`. Each row contains context and detail photo instructions, an archival reference or named primary source, and an alternate-route question. Primary stops end at `PRN-12`; `PRN-13`–`PRN-18` document the alternate crossing chain and its return. Photograph both directions even when walking only one direction.

1. Keep the archive anchor columns unchanged. Record actual observed coordinates, method/accuracy and door/path identification separately. `unknown` is deliberate; it must not become zero or an automatically snapped location.
2. Use a context image showing the named corner/approach and paired end, then detail images of the curb, landing, surface, opening or obstruction. Record media filenames/IDs, observer/source and an observation timestamp with timezone. Label source type as field observation when one actually occurs.
3. Record measured values with units and method. Useful dimensions include clear width, curb/threshold rise and landing dimensions. Record slope only with an appropriate measurement; otherwise leave it unknown. Do not infer legal compliance from a photograph, a source status or an unmeasured dimension.
4. Separate temporary obstructions and their time from permanent geometry. Note access hours, a locked door and construction restrictions without treating a single visit as permanent availability.
5. Keep field review separate from capture: reviewer, review time, evidence-to-feature linkage and unresolved issues must be explicit. A matched source ID is not a reviewed traversal finding. If a connection was not inspected, preserve the gap.
6. Compare complete primary and alternate chains, including both crossing ends and corner links. If another route remains available, record it. Do not manufacture complementary repairs to reproduce the synthetic optimizer result.

Every observation, measurement, media ID, reviewer and current traversal field starts `not_recorded`, `unreviewed` or `unknown`. There are no current photos or recordings in this packet, and no one has been dispatched to collect them. This packet is a preparation aid, not turn-by-turn navigation.

## Source integrity, limits and credit

Pinned archive: `docs/source/Curb_Research_and_Data.zip`, SHA-256 **`a1757bb7c964f9e6f4e178b86742b3994e299d7c1b2af67de220f4c445d43475`**. ZIP CRC check passed. All four data-member hashes and counts match `sources.json`; the JSON audit records full hashes for every member and the exact original query URLs.

| Snapshot member | Independently counted | Interpretation limit |
|---|---|---|
| `princeton_paths_crossings.geojson` | 148 lines: 98 paths, 50 crossings | All `AERIAL`; all width, cross-slope and condition-date fields null. |
| `princeton_ramp_inventory.geojson` | 83 points: 54 `EXISTING`, 29 `ASSUMED` | All `AERIAL`; all `ada_comp` and `dws` values null. |
| `princeton_survey_lead.geojson` | 1 `MISSING` point | Wider-window aerial lead; excluded from this scout and not a confirmed current absence. |
| `pittsburgh_missing_ramp_clusters.geojson` | 48 historic `NoCurbRamp` label clusters | Pittsburgh geography and imagery-label provenance; not Princeton field evidence. |

The manifest's `2026-11-13` date is a snapshot/catalog date. It is not a field observation or independently established imagery capture date. The archived [DVRPC glossary URL](https://walk.dvrpc.org/help/glossary/) now redirects to [Sidewalk Gap Analysis Explorer](https://www.dvrpc.org/webmaps/sidewalk-gaps/). The older README's status explanation and imagery-method date therefore remain archived interpretations, not freshly verified glossary guidance. Regardless of the literal status, current traversal stays unknown.

Credit **Delaware Valley Regional Planning Commission (DVRPC)** for the Princeton source layers; follow its [data license](https://catalog.dvrpc.org/dvrpc_data_license.html), including credit in derived analyses/maps/reports/presentations. Data is supplied as-is for planning and does not update this packet automatically. Retain Project Sidewalk attribution and [license/provenance](https://sidewalk-pittsburgh.cs.washington.edu/api#data-license-provenance) if using its separate Pittsburgh data. Entrance guidance is attributed to Princeton Public Library, Princeton University and AccessAble. Source photographs are not republished here.

## One proposed later integration slice

Propose a **small, versioned local evidence snapshot for this corridor** after Vincent explicitly selects that next slice and the coordinator assigns exact scopes. Its purpose would be to inspect a few reviewed observations, their source/media links and remaining uncertainty. Keep the synthetic R2 scenario for optimizer behavior unless real complementary repairs are established after alternate-route checks. This proposal does not select or implement R3.

| Suggested owner | Bounded responsibility |
|---|---|
| A | Own the prospective provenance/date/review contract and validation changes; distinguish archive retrieval, actual observation and review without breaking frozen fixtures. Decide the smallest versioned boundary before B/C implementation. |
| B | Curate only the approved corridor observations and explicit feature associations; preserve direction, multiple blockers, unknown links and immutable evidence. Validate source references and reviewed graph completeness if routing is later authorized. |
| C | Reuse the evidence display to show source kind, known/unknown dates, review state and missing media; make unverified crossings/entrances visibly uncertain. Verify keyboard and narrow-layout behavior on an assigned candidate. |

Entry criteria: Vincent's explicit next-slice choice and exact coordinator assignments; actual permitted media with observation timestamps and sources; entrance/path coordinates with methods; both ends of included crossings and alternative links checked; approved measurement/profile interpretation; a separate review of evidence-to-feature linkage; and a versioned compatibility plan preserving existing synthetic fixtures. Unmet criteria remain recorded unknowns. No SDK, provider, live runtime service, repair price or new optimizer is required by this preparation packet.
