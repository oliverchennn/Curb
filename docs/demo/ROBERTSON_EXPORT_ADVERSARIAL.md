# Robertson Hall export regression

Tested the published combined source [`eb07a83b4097aaa2c45a7583dad3715e58cd49db`](https://github.com/oliverchennn/Curb/commit/eb07a83b4097aaa2c45a7583dad3715e58cd49db), including portable HTML and keyboard export. Dev B `vzhu08`, local session `01a1da08-cf52-7473-8216-c4a2c7b4c19c`. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6878105758) · [Acceptance details](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6878110841) · [ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6878173456)

| Risk | Check |
| --- | --- |
| Rejected evidence incorrectly drives selection | Exercise every rejection mask across five findings. Retain rejected evidence in the export and compare selected and deferred areas and treatment IDs with independent expectations. |
| Cost or priority changes choose the wrong repair | Use zero, exact and adjacent cent boundaries and edited planning priorities. Compute the expected coverage, treatment IDs, lower and upper cost totals, and partial budget fit from the authored rates and ordering. |
| Grouped or unpriced work is double counted or treated as free | Use an isolated saved-fixture variant to distinguish grouping, inspection-only scope, distinct quote-required treatments, one shared charge, and deferred areas. Keep these scenarios separate from client mutations of the real saved catalog. |
| An export trusts supplied totals, sources or photo paths | Exercise the report boundary and reread the canonical survey after rejected requests. Compare the five embedded JPEG streams against registered files. |
| Edited content changes interpretation in different formats | Compare review data in JSON/CSV, text and figure labels in HTML, and evidence IDs and named plans in PDF. For spreadsheet-active text, verify the defensive prefix. For non-Latin edits, verify original text in HTML and disclosed fallback in PDF. |
| Invalid selectors or bodies reach report generation | Exercise duplicate, unknown and extra format selectors, invalid JSON and oversized bodies against the server request boundary. |

## Regression matrix result

`npm test -- --configLoader runner --no-isolate --maxWorkers 1 tests/integration/server/surveyAdversarial.test.ts` passed 78 tests. The matrix queries all 32 rejection masks at 0, 47,800 and 229,400 cents. Each of the 96 real-handler HTML responses checks three policy plans and one budget plan, for 384 plan comparisons. Ten more canonical cases test exact and one-cent-below limits at 47,800, 95,600, 133,800, 229,400 and 490,600 cents. The expected-cost ledger uses authored values. The budget oracle uses equal seal prices and upgrade deltas for ordinary panels, separately considering the panel 04 replacement. It never calls the production evaluator. It verifies selected and deferred area and treatment IDs, coverage, exact cent ranges, quote IDs and budget fit.

The grouped/inspection fixture overrides one saved-data read. It verifies that one remaining accepted or pending finding keeps the grouped area eligible, inspection-only work remains deferred, separate patch quotes appear once each, and a priced $100 shared item is counted once at the exact $1,056 boundary. The other cases use the unchanged on-disk canonical survey and photos. The suite verifies the exact 2 MiB boundary using UTF-8 bytes, an underdeclared oversized body, stale totals, invalid selectors and invalid requests for immutable fields. It observes no unexpected image-file reads or fetch calls and compares canonical survey and close-up hashes before and after rejected input. No product defect was reproduced by the matrix.

## Actual archived samples

The Windows Node 24.12.0 checkout ran Next on `127.0.0.1:3190`. `node --import tsx .curb-local/verify-export-regression.mts` fetched the saved survey and requested both formats for default, a $1,500 budget, and a reviewed $1,500 budget. The reviewed sample accepted and corrected `defect-01` with Unicode and markup characters, rejected `defect-04`, and lowered the area 01 priority with a manual rationale. The corresponding JSON and CSV use the same validated survey. Chrome opened all three saved HTML files offline with all five embedded photos and zero automatic HTTP requests. The live app retained focus after delayed injected 500s for both report buttons, discarded duplicate activations, and retried against the live endpoint without stealing deliberate focus.

Known subtotals of the default policies were $294–$2,294 essential, $216–$1,434 balanced, and $600–$4,906 durable. The balanced plan included two separate patch quotes plus shared setup. At $1,500 the original selected seal treatments in areas 01, 02 and 03. After the priority edit and rejection, it selected 02, 03 and 05. The known subtotal stayed $216–$1,434 and both budget results remained partial. Reviewed essential and durable totals were $144–$956 and $450–$3,568. These values were checked directly as pinned expectations before checking the saved output.

Bundled Python ran `.curb-local/check-export-regression.py` with pdfplumber/pypdf to compare selection IDs, deferred IDs, amounts, five original JPEG stream hashes, Unicode fallback and CSV/JSON row parity. Poppler `pdftoppm -r 82 -png` rendered all 38 pages (12/13/13), inspected in six contact sheets. The budget comparisons continue onto a second page. No clipping or lost evidence was observed. There were display-font notices for unused Symbol and ArialUnicode. Chrome offline evidence-card screenshots confirmed the revised surface-breakup rejection, source time, and final frame 418 caption. Artifacts and scratch commands remain ignored under `.curb-local/export-regression/` and `.curb-local/`.

| Saved file | SHA-256 |
| --- | --- |
| default.html | `cf014e59ae1c5ebf7c2369d71c5159b3a698a42129fd3250df442eb481b77da4` |
| default.pdf | `b94d12b9f937aa7ad497baf24d14994136ef2949118dadbb3780c1d2b8787731` |
| budget.html | `af7cad42f13a811d5ca7c5c2dc742d191bcc3a00b8882d165a45c14dfdf07039` |
| budget.pdf | `3bc754e2ddf4195ef45ba565dcb5186a8f85a2705c72c4adc3d723eca2759fa1` |
| edited.html | `77bd2fd6fed0de09adfcc35323df2e6385ce88a4f7c5061359796436dc4f45ff` |
| edited.pdf | `eb3e40dbc3f45307543e25af59bb5893917f411b1c1b71b488ca0a1ad9b615f2` |
| default.csv and budget.csv | `3f225e763b4c762b362da6b79866f64dfa4ab2693316f5dd24654cc26a9ce39f` |
| default.json and budget.json | `65da7fd56deaa75ce9026f760f3e654b46c775f4feb8b9c5736acdc8bb401ba1` |
| edited.csv | `1c3f514eb66f5507eec349b03865bb45e9960fb28b04f0f67fb08a67a999e8fb` |
| edited.json | `09caa8c085a6d373c8c2d98829bca4d6b4b2aa05a6c8dae7c4f2e5e1dee5f1a7` |

These are hashes of the actual saved specimens. PDF generation metadata can change the byte hash on a later run. This review checked local product and report behavior. It did not conduct a field inspection or manual assistive-technology interoperability test.

## Real HTTP boundary

`node --import tsx scripts/curb/verify_flow.ts http://127.0.0.1:3190` passed 13 checks. The real server returned the canonical survey, structured 400 for invalid selectors, malformed JSON and stale supplied totals, 404 for an unknown site, and 413 for an oversized report. Three real PDF attachments were generated. Original, normalized and annotated video returned the requested 32-byte ranges with HTTP 206. The receipt is in ignored `.curb-local/release/http-verification.json`.

`npm run check` passed TypeScript, all 674 tests in 23 files, and the Next production build on the tested tree including this regression suite.
