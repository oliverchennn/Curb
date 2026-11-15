# Cañada 2020 source audit

Author candidate for CANADA-DATA/1, session `01a1deb5-1fce-7133-a092-d17eb63f7d17`. Independent disposition is pending Vincent reviewer `01a1ddd3-c247-7bd1-b4af-51837eafc5a0`. Proposed outcome: **inventory_only**; see [FEASIBILITY](FEASIBILITY.md).

## Source freeze

The [official district page](https://smccd.edu/ada2020/) links the [final November 2020 report](https://smccd.edu/ada2020/19029%20SMCCCD%20ADA%20Self-Evaluation%20and%20Transition%20Plan%20FINAL%20Nov2020%20sm.pdf). Fresh HTTP 200 acquisition on November 15, 2026 produced **111,675,832 bytes, 4,399 pages**, SHA-256 **`01e6d86bc0535a925a1f26172c808a22b80fc000797d5fc441ea1b9714f4d2f8`**. This matches the planning research reference exactly. No version replacement was necessary. The response advertised PDF content, the same length, Last-Modified June 22, 2023 and ETag `c1113d5e4fa5d91:0`; these server metadata are not the survey date.

Publisher: San Mateo County Community College District. Author: Sally Swanson Architects, Inc., project 19029. Final report date November 2020; Cañada appendices dated September 2020, within the district's 2019-2020 evaluation. Do not infer an exact field visit date from a run ID. The PDF's inherited Subject metadata says City of San Carlos; the visible report identity, official link and byte hash govern this freeze.

The machine-readable [source manifest](../../../research/curb/canada-2020/sources.json) records URLs, actual transfer timestamps, versions, lengths and hashes. Timestamps use the observed fresh-transfer completion file time converted explicitly to UTC. The acquisition CLI separately reports `retrievedAt: null` when merely verifying an existing file, so a verification is not mislabeled as a new fetch.

Source cache and rendered review pages are outside Git at `/private/tmp/curb-canada-source-cache`. Reproduction may use any external cache path. No PDF, map raster, aerial or photograph is published in this candidate.

## Final versus draft

| Packet | Bytes | Pages | SHA-256 | Role |
| --- | ---: | ---: | --- | --- |
| Final combined report | 111675832 | 4399 | `01e6d86bc0535a925a1f26172c808a22b80fc000797d5fc441ea1b9714f4d2f8` | Sole authoritative record source |
| [Separate Appendix I](https://smccd.edu/ada2020/Appendix%20I%20-%20Canada%20College%20Sidewalks.pdf) | 6312531 | 30 | `6929ae3030aeed9f01bd6d277d7a3fa4a30c2ef41fc800bb4dcf04521f1366ff` | DRAFT, discovery only |
| [Separate Appendix J](https://smccd.edu/ada2020/Appendix%20J%20-%20Canada%20College%20Curb%20Ramps.pdf) | 7480991 | 14 | `8ddbafbfe700a832dc85cd8c6fb840589e0ec2f31471c68d684d0b3cd06626d2` | DRAFT, discovery only |

Both separate covers visibly say DRAFT. Appendix I viewer 22/23 corresponds to final 2805/2806; the same absent intermediate route headings remain. Draft I page 22 prints 2800 of 4366, while final 2805 prints 2804. Draft J viewer 14 (printed 2822 of 4366) and final 2827 (printed 2826) agree on the reviewed 421/422 values and cost structure. Draft J viewer 11/12/13 correspond by record IDs to final 2824/2825/2826. These are bounded record reconciliations, not a claim that every draft page equals the final. No draft locator is used as a final observation locator.

## Locator inventory and review

All PDF locators are one-based viewer pages; final printed page is viewer minus one in this packet.

| Subject | Final viewer pages | Use |
| --- | --- | --- |
| Source methodology and scheduling priorities | 10-11 | Curb checklists/smart levels; sidewalk profiler scope |
| Building9 exterior map and southwest approach | 2256,2261 | Historical crossing paint; separately recorded handrail/landing barriers |
| Appendix I cover | 2784 | Cañada sidewalk identity |
| Column definitions / REF legend | 2787-2788 | Raw chainage, width, quantities, costs and overlap semantics |
| Master route costs | 2790 | Source total cross-check; Route28 absent |
| Route endpoints/cost summaries | 2792-2793 | Eleven bounded/context route summaries |
| Path-of-travel map | 2795, repeated 2823 | Explicit mapped junctions and unsupported connections |
| Narrow sidewalk row inventory | 2805-2806 | All 43 selected rows1352681-1352723 |
| Ramp navigation and feature thresholds | 2817-2819 | Featured defect versus other recorded features; source definitions only |
| Curb cost summary | 2821 | Group totals can be printed beside a single locator ID |
| Ramps413/414,415,404/405,421/422 | 2824,2825,2826,2827 | Individual assemblies, estimates and scope limitations |
| Appendix Q activity score/run definition | 4361-4362 | Activity100 for campus features; runs may end mid-block |

Author pass1 used text extraction with exact row IDs and locators. Author pass2 independently inspected rendered tables/maps; the read-only author-team child checked all43 sidewalk rows, all7 ramp records, eleven summary rows and critical maps. Parent visually checked methodology/legends and draft reconciliation. Neither pass is Vincent's independent review. [TRANSCRIPTION](TRANSCRIPTION.md) lists every used record and the unresolved exceptions.

## Coverage and reuse

Final p10 describes measuring curb features separately and sidewalk profilers for slopes/surface variations. The report describes Excel records with GIS reference maps, but this candidate has no authenticated database/GIS export. Appendix Q p4362 permits runs ending mid-block. Neither methodology nor absence of a defect proves continuous all-attribute coverage of a crossing, entrance or journey. Source priorities are scheduling scores; no source-assessed deficiency is automatically universal impassability.

The official page carries an all-rights-reserved notice and the map carries third-party basemap credits. Public download does not establish unrestricted reproduction rights. This package publishes factual numeric transcriptions, short labels, paraphrases, attribution and source links. The map is inspected privately, not redistributed. No generated photos or Princeton imagery represent Cañada.

## Reproduce and validate

Use Node satisfying the repository engine, installed repository dependencies (`npm ci` in a clean clone), and Poppler `pdfinfo` on PATH (or `PDFINFO`). No Python helper is required for the published validator. After checking out the exact candidate:

```sh
node --import tsx scripts/curb/canada-case/acquire.ts --out /absolute/external-cache
node --import tsx scripts/curb/canada-case/acquire.ts --verify /absolute/external-cache/final-nov2020.pdf
node --import tsx scripts/curb/canada-case/validate-data.ts --data research/curb/canada-2020
node --import tsx --test scripts/curb/canada-case/*.test.ts
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck --types node scripts/curb/canada-case/*.ts
```

Acquisition rejects changed bytes/pages/hash instead of treating the URL as immutable; changed versions require a new reviewed freeze. Validation binds the exact raw bytes of five input files in `feasibility.json`, returns the sixth file's hash, and checks source identity, record references, locators, normalization, cost semantics and the non-executable inventory boundary. It cannot establish transcription truth, topology or independent acceptance by itself. The JSON schema is an evidence inventory format, not the future production `curb-case-v1` contract.

Actual author checks:21 focused Node tests passed, standalone strict TypeScript passed, official-source cached-byte verification passed, and materialized inventory validation passed. Repository `npm run check` passed (TypeScript,1015tests in43files,production build; exit0). Final publication receipts are reported in the board STOP/RELEASE with exact commit/tree; no deployment or strategy result is asserted here.

## Correction and cross-platform byte reproduction

Independent review6893019697 identified two source-fidelity errors in8318518:415's Vertical Curb value and Route40's map-side wording. Both are corrected after a fresh visual check, with the correction history in TRANSCRIPTION.md. Source bold/red annotations under legend2817 and replacement assembly types are now explicit. The source freeze and all numeric measurements/costs remain unchanged.

Hashes bind **exact committed file bytes**, not parsed JSON equivalence. On Windows, `core.autocrlf=true` can produce CRLF working files from LF Git blobs and correctly fail the validator. Use a fresh checkout with conversion disabled (for example `git -c core.autocrlf=false clone <canonical-url> <new-checkout>` and keep conversion disabled for checkout), or pass exact blob buffers to the published `validateBundle` API. No broad `.gitattributes` change or silent newline normalization is part of this correction. To validate committed bytes at the checked-out candidate, from the repository root with dependencies installed:

```sh
node --import tsx --input-type=module -e 'import {execFileSync} from "node:child_process"; import {DATA_FILES,validateBundle} from "./scripts/curb/canada-case/validate-data.ts"; const bytes=Object.fromEntries(DATA_FILES.map(name=>[name,execFileSync("git",["show","HEAD:research/curb/canada-2020/"+name])])); console.log(JSON.stringify(validateBundle(bytes),null,2));'
```

This reads exact Git blobs without rewriting working files and works independently of checkout newline conversion. For file-based validation, preserve the published bytes. The prior21-test Mac receipt remains valid for the original candidate; the independent Windows source check passed exact-blob validation but one acquisition symlink test encountered Windows EPERM. The acquisition pair is unchanged. Correction test counts and exact published SHA are reported in the new STOP/RELEASE.
