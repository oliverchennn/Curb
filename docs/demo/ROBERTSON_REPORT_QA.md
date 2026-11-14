# Robertson Hall report QA

**Task:** ROBERTSON-REPORT-QA/1, Vincent (`vzhu08`), Codex session `01a1da08-cf52-7473-8216-c4a2c7b4c19c`.
**Exact tested source:** [`5aab3c0177684350a26b801fd6f441d86b8d0b88`](https://github.com/oliverchennn/Curb/commit/5aab3c0177684350a26b801fd6f441d86b8d0b88), the released API result. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877377911) and [QA acknowledgment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877655878).
**Environment:** Windows, Node 24.12.0, locked repository dependencies, real Next dev server bound to `127.0.0.1:3186`, installed Chrome via Playwright. All checks ran in an isolated checkout on November 14, 2026 America/New_York.

The board supersedes the three-finding inventory at this source for field coverage. The results below verify the released export code against its pinned snapshot. Recheck report totals, finding IDs, layout, and evidence for the expanded inventory when the coordinator publishes it. [Coverage update](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877637509)

## Export parity

Fetched the validated survey over HTTP. Generated separate default and edited PDF, CSV, and JSON exports using a $1,500 budget. The edited sample changed the first finding's label, kind and multiline description, accepted the first finding, rejected the second, and set the first work area's priority to low with a reviewer and rationale.

| Plan | Default known subtotal | Edited known subtotal |
| --- | ---: | ---: |
| Essential | $144–$956 | $72–$478 |
| Balanced | $144–$956 | $144–$956 |
| Durable | $337.50–$2,676 | $225–$1,784 |
| Budget | $216–$1,434 | $184.50–$1,370 |

All shown subtotals are partial. Both budget plans have `budgetFit=partial` because of the shared site quote. The default balanced plan also includes the unpriced patch, despite its priced subtotal matching essential. Rejecting `defect-02` removed `panel-02` from the selected work in every edited plan and kept the finding in all three exports, with the rejection explicit. Scope and treatment IDs, deferred areas, and every priced subtotal on the PDF matched the domain evaluator for both samples. The PDF route also returned a policy report without a budget.

Python's CSV parser matched each record to its JSON finding by stable ID, time, review method/status/note, work area, priority and rationale, and structured measurements and checks. The formula-like label `=1+1` was preserved as literal review text in JSON and PDF and exported as the apostrophe-prefixed `'=1+1` in CSV. The multiline description survived CSV parsing. CSV and JSON carry the survey records, from which the evaluator produced the totals above.

Chrome walked the real review controls: accept `defect-01`, reject `defect-02`, and record a low work-area priority with a reviewer and access rationale. JSON, CSV, and PDF each downloaded. The browser made one PDF POST on the explicit button click and received HTTP 200. There were no page errors. The Chrome PDF focused the balanced plan with the prior rejection and priority edits visible.

## Report rendering and failure paths

Rendered the default, edited, and Chrome-downloaded reports with Poppler at 95 dpi. Inspected all 24 pages across three eight-page reports, including the comparison, estimate, three close-up, and sources/shared quote pages. No clipping, blank pages, or unreadable body text was observed. Text extraction and PDF object inspection separately verified eight numbered pages, three embedded close-ups, and six source link destinations in each of the two API fixtures. Poppler emitted missing display-font notices for Symbol and ArialUnicode, while the used Helvetica text and images rendered intact. The issued reports leave field dimensions and route impact unknown and overall ADA compliance undetermined.

| Case | Actual response |
| --- | --- |
| Known or omitted selector | 200, validated local survey |
| Unknown selector | 404 `SURVEY_NOT_FOUND` |
| Extra or duplicate selector, malformed JSON, forged evidence path, or budget plan without a budget | 400 `INVALID_REQUEST` |
| Streamed body exceeding 2 MiB | 413 `BODY_TOO_LARGE` |
| Registered close-up temporarily absent in the QA checkout | 500 `SURVEY_UNAVAILABLE` |
| Same asset restored | 200, PDF attachment |

Live responses used `Cache-Control: no-store`. The absent-file probe restored its asset in a `finally` block and verified successful report generation immediately after restoration.

Checks used `node --import tsx .curb-local/b-qa.mts`, `node .curb-local/b-browser.mjs`, `node .curb-local/check-missing-closeup.mjs`, the bundled Python `pdfplumber` and `pypdf` export comparison, and `pdftoppm -r 95 -png`. Harnesses, downloads and page renders were kept in ignored local scratch. The API release's separate `npm run check` passed TypeScript, 585 tests across 22 files, and the production build on this exact source. [API release evidence](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6877634556)
