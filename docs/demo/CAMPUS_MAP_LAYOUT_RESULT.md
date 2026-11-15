# Campus map layout result

**CURB-CAMPUS-LAYOUT/1 · Vincent / Dev B**

- Canonical repository and branch `oliverchennn/Curb` / `codex/campus-map-layout`.
- Baseline `eab54a449ea7dd1111aa0e125529d638150a268e` (tree `455fd0fd598f337231706fe8dc3e504e09cd964a`).
- Executable candidate `6494f9ffc0f1f75b7d4b1e9ad9ff62edfd544517`. The delivery commit adds this report.
- Checkpoint saved on the canonical branch at `436e0a40a91ee13ce5359f42ff8253830523330c`. [Checkpoint and scope ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6889891554)

Campus opens first on entry and Reset. The picker shows Campus, Downtown and Robertson, and retired Examples links resolve to Campus. Existing real-data links, source geometry, the separate Sample network page and the Explorer data download are preserved.

## Campus geometry

Measured the SVG and the part of the base aerial visible inside it at Fit campus. Dimensions and distance from the page top are CSS pixels. Chrome 156.0.8078.74 used classic scrollbars. Campus document client widths and scroll widths matched at 1351, 1905, 2545 and 375 px respectively.

| Chrome viewport | Plot before | Plot after | Visible aerial before | Visible aerial after | Plot top before → after |
|---|---:|---:|---:|---:|---:|
| 1366 × 768 | 1265 × 471.8 | 1265 × 1265 | 416.1 × 471.8 | 1063.6 × 1237 | 476 → 404.4 |
| 1920 × 1080 | 1594 × 753.8 | 1754 × 1754 | 664.9 × 753.8 | 1484 × 1726 | 476 → 404.4 |
| 2560 × 1440 | 1594 × 753.8 | 1754 × 1754 | 664.9 × 753.8 | 1484 × 1726 | 476 → 404.4 |
| 390 × 844 | 341 × 484 | 341 × 426.3 | 341 × 419 | 313 × 364 | 951.6 → 725.2 |

The geographic bounds use west, south, east, north order.

- Before on desktop `[-74.672, 40.318625, -74.628, 40.356643]`.
- Before on phone `[-74.670624, 40.318, -74.628981, 40.357]`.
- After at all widths `[-74.672, 40.318, -74.628, 40.357]`. Fit uses one scale on both axes and includes all 22 section extents, including Graduate College and Meadows.

| Viewport | Fit with inventory closed | Fit with inventory open | Inventory open after resize |
|---|---:|---:|---:|
| 1366 × 768 | 1265 × 1265 | 925 × 925 | 1059 × 1059 |
| 1920 × 1080 | 1754 × 1754 | 1479 × 1479 | 1319 × 1319 |
| 2560 × 1440 | 1754 × 1754 | 1754 × 1754 | 1754 × 1754 |
| 390 × 844 | 341 × 426.3 | 341 × 426.3 | 378.6 × 473.3 |

Desktop plots scroll vertically with the page. The phone keeps the map controls immediately before the plot and the legend immediately after it. Returning the inventory to closed restores the opening fit. Section codes, 44 px targets, keyboard focus and pan/zoom remain available. Chrome exercised C01, C04 and C13, point collisions, Fit campus and Fit section, Aerial and Diagram, and fallback when the base image fails.

## Source-tag classification

| Whole-campus OSM source class | Ways |
|---|---:|
| Steps | 62 |
| Crossings | 131 |
| Cycleways | 27 |
| Sidewalks | 101 |
| Footways & paths | 867 |
| Unclassified | 0 |

The ordered partition uses steps first. Supported remaining highway tags are footway, path and cycleway. Within those, footway=crossing takes precedence over cycleway, then footway=sidewalk, then remaining footways/paths. Missing or unsupported highways are Unclassified. The map encodes the class by color and stroke pattern and gives the selected study area a separate outline. Selected way details expose the preserved OSM tags. Current traversal remains Unknown. [Frozen taxonomy](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6889845297)

The independent satellite spot checks broadly support the Nassau crossing and sidewalk and the McCosh walking corridor. The Firestone steps and Tiger Trail cycleway remain visually unresolved. Imagery capture date remains Unknown. The spot checks changed no source classifications and added no Google imagery, data or assets. [Independent checkpoint review](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6889868551)

## Robertson evidence

Chrome decoded all five native crops in both drawer states on both builds at each viewport. Their dimensions in source order are 720 × 235, 720 × 270, 720 × 305, 330 × 185 and 720 × 175. Each candidate crop fills its photo viewport at its natural aspect ratio. The site SVG uses its full 720:580 viewBox; it sits beside the photo on desktop and below it on the phone. The GPS tag represents an approximate site. All five records remain unplaced and retain unknown observation and capture dates.

| Viewport | Site context box before → after | Defect 01 photo box after |
|---|---:|---:|
| 1366 × 768 | 1235 × 180 → 380.2 × 306.3 | 840.8 × 274.4 |
| 1920 × 1080 | 1564 × 180 → 483 × 389.1 | 1067 × 348.3 |
| 2560 × 1440 | 1564 × 180 → 483 × 389.1 | 1067 × 348.3 |
| 390 × 844 | 315 × 180 → 315 × 253.8 | 317 × 103.5 |

The before site box used cover and clipped the graphic. The after box preserves its aspect ratio. The checks exercised 4× zoom, both-axis pan limits, keyboard and button Reset, and clip seek/play/close for all five records with details open and closed, at all four widths. The portrait video decodes at 720 × 1280.

## Verification and handoff

- `npm.cmd test -- src/features/curb/explore src/data/curb/princeton-campus src/data/curb/princeton-campus-points` passed 115 tests in 8 files. `npm.cmd run typecheck`, `npm.cmd run build` and `git diff --check` passed.
- Chrome production-preview verification checked the running source via `/api/health`. All four geometry captures, 12 candidate interaction cases, 12 candidate point-browser cases and 4 baseline field cases passed. The archive feature browser retained 333 records, 329 eligible positions, four requiring location review, existing filters and pagination, exact node links, and reduced-motion behavior.
- Evidence directory `C:/Users/vzhu0/.codex/visualizations/2026/11/15/01a1dcec-4ded-78b1-96a5-9131989adcf8`. The `layout-{before,after}-{campus,robertson}-{1366,1920,2560,390}.jpg` captures show comparable starting views. The `layout-{before,after}-field-*` captures compare representative crops and drawer states. Raw dimensions and interaction results are in `layout-before-metrics.json`, `layout-after-metrics.json`, `layout-baseline-field-chrome.json`, `layout-interaction-chrome.json` and `layout-points-chrome.json`.
- Browser coverage was desktop Chrome with viewport emulation for the phone size. Physical devices, projector hardware, screen readers and the deployed build were outside this verification. Merge, integration-wide checks and release remain with the assigned merge owner.
