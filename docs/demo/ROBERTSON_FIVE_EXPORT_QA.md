# Robertson Hall five-finding export QA

**Task:** ROBERTSON-FIVE-EXPORT-QA/1, Vincent (`vzhu08`), session `01a1da08-cf52-7473-8216-c4a2c7b4c19c`.
**Tested source:** [`adbbf25b9696519b12403ba626da9703b57cd2e1`](https://github.com/oliverchennn/Curb/commit/adbbf25b9696519b12403ba626da9703b57cd2e1), revision 2. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877763962) and [ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877812698).
**Environment:** Windows, Node 24.12.0, matching lockfile dependencies, real Next server on loopback, November 14, 2026.

Three live PDF attachments were generated: default policy comparison, a $1,500 budget comparison, and a $1,500 comparison after rejecting `defect-04` and manually lowering `panel-01` to low with a reviewer rationale. CSV and JSON from the same validated live data retained all five stable finding IDs and exact times, review status/method/reviewer/note, measurements, work-area priority and rationale. CSV protected the edited label `=1+2` with an apostrophe while JSON and PDF preserved it literally.

| Policy | Default known subtotal | Reviewed known subtotal |
| --- | ---: | ---: |
| Essential | $294–$2,294 | $144–$956 |
| Balanced | $216–$1,434 | $216–$1,434 |
| Durable | $600–$4,906 | $450–$3,568 |
| $1,500 budget | $216–$1,434 | $216–$1,434 |

All subtotals are partial. Default balanced separately requires patch quotes for `panel-02-patch` and `panel-04-patch` plus shared site setup. Reviewed balanced drops the second patch and retains the shared quote. The default budget selects seal options for panels 01, 02 and 03. The reviewed budget replaces panel 01 with panel 05, keeping 02 and 03. The rejected finding stays in the exports but its work area is absent from every reviewed plan. PDF comparison blocks matched evaluator-selected treatments, areas, deferred areas and cost ranges in all three reports.

All five JPEG requests returned 200. Each report embeds one photo for each of `defect-01` through `defect-05`. SHA-256 of each embedded DCT stream matched the corresponding live JPEG byte for byte. For the final transverse crack, the recorded time 13.933333 s resolves to display frame 418 at 30 fps, and its track and exact frame lookup both contain that frame. All three PDFs caption the corresponding image at 13.93 s. Rendered and visually inspected all 36 pages. The new work areas occupy pages 5 and 6 and their evidence cards occupy pages 10 and 11 in each report. No clipping, blank pages or lost evidence observed. Poppler issued the same unused display-font notices noted in the earlier QA.

**Copy finding (P3).** The reviewed report calls both the manually edited area priority on page 2 (low) and the original finding assessment on page 7 (high) “Accessibility priority.” The plan and CSV use the correct area priority and preserve the original assessment. Use “Reviewed work-area priority” where applicable and “Provisional finding priority” on the evidence card so readers can tell these values apart. Relevant renderer lines at the tested source: [finding label](https://github.com/oliverchennn/Curb/blob/adbbf25b9696519b12403ba626da9703b57cd2e1/src/server/curb/surveyReport.ts#L219) and [area label](https://github.com/oliverchennn/Curb/blob/adbbf25b9696519b12403ba626da9703b57cd2e1/src/server/curb/surveyReport.ts#L332).

**Checks:** `node --import tsx .curb-local/five-export.mts` exercised the real GET, five photo GETs and three report POSTs using the live evaluator. `five-parity.py` used Python csv, pdfplumber and pypdf to validate text, fields and embedded streams. `pdftoppm -r 96 -png` and contact-sheet review covered every page. `npm test -- tests/integration/server/survey.test.ts src/client/curb/fetchSurvey.test.ts src/domain/curb/surveyExports.test.ts` passed 44 tests. Artifacts and harnesses remain under ignored `.curb-local/five-export/` and `.curb-local/`.

**Separate root delta:** Read-only diff from this pinned source to [`85a3e0c`](https://github.com/oliverchennn/Curb/commit/85a3e0c917be346d9f3304fabe64b36ab9ded85b) shows unchanged media, report renderer, transport, contracts and cost calculation. Quote descriptions gain treatment IDs, while the PDF already prints distinct IDs. Video event time is clamped to the last displayed frame, preserving frame 418 when native playback reaches duration. This was a source review. The pinned runs did not exercise the new native-ended behavior. [Coordinator checkpoint](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877840558)
