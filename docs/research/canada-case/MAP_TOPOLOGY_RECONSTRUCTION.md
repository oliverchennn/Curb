# Cañada public-map network reconstruction

**Public maps do show the paths and crossings.** The earlier historical audit review bundled map connectivity and measured accessibility too tightly. Lack of a measured crossing assessment does not prevent tracing a crossing that the college explicitly draws.

This addendum separates those questions. It reconstructs a small planning network from the college's mapped Universal Access Routes, while keeping historical defect matches, elevator connections and field conditions explicit. It does not change the frozen 2020 case or claim a repair benefit.

## What the map shows

The [official campus map and directory](https://www.canadacollege.edu/about/docs/canada-map-directory.pdf), viewer page 1, uses blue dashed lines for Universal Access Routes. Its PDF creation metadata is October 2, 2026; that is not a field-inspection date. The downloaded source is 627,129 bytes with SHA-256 `37d2da4afaa774b32bd787e5fb5eef1bbdf863a2695f77e134c91c433fa513b9`.

| Mapped connection | Treatment in the reconstruction |
| --- | --- |
| Middle Lot 1 accessible-parking spur, across the frontage road, to the north Building 9 elevator area | Trace the explicitly drawn walkway and crossing. |
| Upper Lot 1, across a separate crossing beside Buildings 18 and 23, into the central campus path network | Preserve this alternative approach as a distinct branch. |
| North edge of Lot 2, across to the south Building 9 elevator area | Preserve the separate southern crossing and approach. |
| Quad-side paths near Buildings 9, 12, 13, 17 and 18 | Trace visible junctions; do not join lines merely because they are nearby. |
| Building 9's two elevator markers | Keep distinct mapped nodes. A symbol alone does not establish served floors, doorway location or current operation. |

The [older campus directory map](https://canadacollege.edu/marketing/docs/map-directory.pdf), with September 2013 creation metadata, and the 2020 audit's Building 9 aerial provide additional historical location context. Current and historical layers retain separate dates. A 2026 drawing is not silently treated as a 2020 condition survey.

## Machine-readable candidate

[map-topology.json](map-topology.json) records source-linked nodes, links, approximate drawing coordinates, separately typed inferred building connections, historical ramp-pair candidates and excluded joins. Coordinates are positions on a schematic PDF rendered at 180 dpi, not surveyed ground coordinates or measured travel distances.

Each map-derived edge retains `accessAssessment: unknown`. This does not erase its cartographic connection: it means the map establishes the path layout while width, grade and current condition have a different evidence status.

The proposed historical registrations associate ramps 421/422 with the middle Building 9-facing crossing and 404/405 with the southern crossing. Those are explicitly recorded spatial interpretations, not an authoritative source-ID join. The farther-north crossing beside Buildings 18/23 is distinct from both. Elevator/entrance level associations remain separately conditional.

## What this enables

A map-based planning model can use these mapped links. Before calculating repair outcomes, freeze which historical observations are assigned to each link, the repair scope and costs, and the specific assumptions about unmeasured conditions. Show the result with each conditional link enabled and disabled rather than hiding its influence. Include mapped alternatives even if they reduce or eliminate the apparent benefit of a repair.

The resulting claim would concern a **map-based Cañada planning scenario under stated assumptions**. Confirmed present-day accessibility and observed repair outcomes require different evidence. The existing 120-case synthetic benchmark remains separate.

## Review status

The existing independent reviewer confirmed the official map's three distinct crossings and separate Building 9 elevator markers. The exact machine-readable candidate is being checked against those traces before publication. No optimizer comparison has been run on this candidate.
