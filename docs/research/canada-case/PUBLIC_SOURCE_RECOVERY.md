# Cañada public-source recovery

Public records recovered reproducible cost arithmetic and historical entrance context, but not the assessed crossings and complete repair scope required for a defensible benchmark. **The accepted case stays `inventory_only`; M1–M10 remain open.** The existing synthetic benchmark remains the supported comparison for the demo. The human study remains skipped.

## Independently checked findings

The existing independent reviewer re-extracted the official report and checked the source researchers' arithmetic, rendered map excerpts and construction records on November 15, 2026. [Coordination receipt](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6894166716).

| Recovered evidence | What it establishes | What remains unknown |
| --- | --- | --- |
| All 38 priced sidewalk rows reproduce the printed totals using exact decimal chainage intervals and printed dimensions/rates. The 19 differences from displayed quantity × rate are each $60. | The published amounts can be reproduced for this selected sample. | Original workbook formulas and rounding rule; the two LF rows match numerically but do not establish a general area-to-length conversion. |
| ID `1352703` occurs at both Cañada and College of San Mateo for different records. | Joins must include campus, appendix/table, source version and page locator. | A numeric record ID alone is not a district-wide identity. |
| The 2019 Building 9 notice identifies the parking-side third-floor landing and a separate north entrance. The older project description identifies the elevator's intended upper-parking-to-quad connection. | Historical approach and design context. | Exact arrival point, assessed exterior links and conditions in the 2020 baseline. |
| Duplicate 2020 maps have georeferenced drawing layers, without recovered feature-level assessment attributes. Neither ramp pair 421/422 nor 404/405 has a joining path stroke in the drawing. | The published drawing can be inspected and reproduced. | Physical connectivity and assessed crossing conditions. Absence of a drawn stroke does not prove physical disconnection. |
| The 2017 Board report and contract 86740 award identify separately supplied correction plans. | A specific plan set to request. | Whether its work covers these ramp IDs, as-built conditions and inspection closeout. |

The [row-level arithmetic sidecar](recovery-row-arithmetic.json) preserves printed fields separately from calculated values and candidate groupings. The published Git blob uses LF line endings: SHA-256 `f35e85db8c288ab28935a56f699473d704a0cdb6cf6643e2a95673ee72bf29df` (25,993 bytes). The independently reviewed Windows source used CRLF: `210d9a9b1ed71e5dafff606f867257410d5bda187d245a2901ee07afb7d12301` (26,941 bytes). Exact byte comparison after CRLF-to-LF normalization and parsed-JSON equality both passed; no fields changed. Three contiguous row partitions reproduce the route-summary totals; only the candidate 14/3/24/2 partition keeps starting chainage nondecreasing within each block. This does not recover the missing source route/run headers or REF work ownership. Keep candidate joins explicitly inferred.

## Ready data request

For **Sally Swanson Architects project 19029, Cañada College, November 2020 final report, Appendices I and J, Lot 1 / Building 9**, the missing records are:

1. The original Excel/Access sidewalk and curb-ramp inventory and GIS feature export, including field definitions and route/run joins for sidewalk IDs **1352681–1352723**, **Route 28 W**, and ramps **404/405/421/422**.
2. Assessed crossing and landing worksheets or marked site plans connecting each ramp pair, Lot 1 arrival points and Building 9 entrances, including surveyed widths, grades, remaining barriers and unknown sections.
3. REF overlap/work-ownership records and quantity/rate/calculation conventions, so one physical repair is not counted twice and the full route repair scope is costed.
4. Relevant signed site plans and accessibility inspection/closeout records for **contract 86740**, if they cover this cluster. Its project identity alone does not establish that connection.

The district's [public-records portal](https://www.smccd.edu/pra/index.php) is a route to request existing files. **No request or outside message has been sent.** If the original files are unavailable, new field measurements may support a separate contemporary case; they cannot silently fill the historical 2020 baseline.

## Benchmark gate

After obtaining records, the independent reviewer must establish endpoints, assessed crossing coverage, physical work ownership and complete costs before changing the gate. A historical benchmark can then freeze its graph and assumptions, reuse the optimizer, compare equal budgets, and independently verify results and sensitivity cases. Report ties or no improvement honestly. The recovered arithmetic alone does not make that benchmark executable.

This addendum leaves the accepted inventory, source manifest, proof report and API snapshot unchanged.

## Source locations

- [Official November 2020 final report](https://smccd.edu/ada2020/19029%20SMCCCD%20ADA%20Self-Evaluation%20and%20Transition%20Plan%20FINAL%20Nov2020%20sm.pdf): viewer pages 2805–2806 (costs), 2795/2823 (maps), 2256–2264 (Building 9), and 4292 (CSM record ID). Source SHA-256 `01e6d86bc0535a925a1f26172c808a22b80fc000797d5fc441ea1b9714f4d2f8`.
- [2019 Building 9 construction notice](https://canadacollege.edu/construction/doc/construction-notice-10-21-19-exteriors-envelope-repair-east-elevation-3rd-floor-terrace-work.pdf), viewer pages 1 and 3; [Building 9 project description](https://smccd.edu/facilities/projects/can/canbld9llrc.php).
- [2017 site-package project and award](https://www.smccd.edu/facilities/projects/can/canaccesscompliancesitepackage.php); [Board packet, viewer page 232, report 17-4-103B](https://downloads.smccd.edu/file?du=%2Fsites%2Fdownloads%2FBoT%2FPackets%2F2017-04-26%20Packet.pdf&s=%2Fsites%2Fdownloads%2FBoT#page=232).
