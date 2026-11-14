# Robertson Hall implementation contract

User-selected scope: disability-access repair planning from the supplied Robertson Hall video. Desktop session `01a1d9ad-21f8-7a10-9a1d-c79fd185a8d9` is orchestrator and heavy implementation owner by Oliver's explicit direction. Landau is Developer C; Vincent is Developer B. This task does not transfer an existing active writer's checkout. Main integration remains serialized here. No deployment or spending.

## Shared boundary

`src/contracts/curb/survey.ts` is the common contract. Do not change it independently. Request a bounded change on board #1. Media are local under `/curb/surveys/robertson-hall/`. Canonical authored data: `src/data/curb/surveys/robertson-hall.json`. One physical defect has one ID; multiple defects on one panel share a work area. Track entries identify displayed CFR video frames (30 fps), normalized [x,y,width,height]; missing frames have no retained tracking evidence; physical visibility is unknown, and no box is interpolated across a gap, not interpolation through an occlusion. All measurements initially absent. Review method AI is distinct from manual review. Pending AI findings may support explicitly provisional plans; rejected findings are excluded, not deleted.

Root supplies these pure exports in `src/domain/curb/survey.ts`:

```ts
validateSurvey(input: unknown): Survey
costRange(cost: Cost): { lowCents: number; highCents: number } | null
buildRepairPlans(survey: Survey, budgetCents?: number): RepairPlan[]
getBoxAtTime(finding: Finding, seconds: number, fps: number): Box | null
```

Plans return essential/balanced/durable, then budget only when supplied. RepairPlan is in the shared contract. No reviewed route graph exists for this site; routeImpact always remains unknown. Unknown costs are never zero. All available subtotals remain explicitly partial when any selected/shared item needs a quote. Budget selection uses known treatment upper bounds and shared costs; unpriced shared costs yield budgetFit=partial, never within. Unknown-priced treatments are excluded from numeric budget optimization but remain visible in policy plans. Accessible priorities rank high, medium, low, then unassessed; prioritize field inspection separately for unassessed needs. Eligible areas have at least one non-rejected finding and repairWorthy=true. Essential picks nearTerm areas and their cheapest suitable option (quoted estimates precede unknown, then durability/id ties); balanced picks recommended; durable picks maximum durability (then cost/id). Reject incompatible treatments on one area. No double count of setup or work areas. Inspection-only catalog entries do not earn repair coverage; work areas needing inspection remain deferred with their checks visible. Evidence timestamps must have their exact displayed track frame, and source references must use HTTP(S).

## Developer B: Vincent, API and exports

Branch `codex/robertson-report-api`. Exact new scope:
- `src/server/curb/survey.ts`, `src/server/curb/surveyReport.ts`, their colocated tests.
- `src/client/curb/fetchSurvey.ts`, its colocated test.
- `src/domain/curb/surveyExports.ts`, its colocated test (CSV only; root owns survey.ts).
- `app/api/curb/survey/route.ts`, `app/api/curb/survey/report/route.ts`.
- `tests/integration/server/survey.test.ts`, `tests/integration/client/survey.test.ts` if useful.

GET `/api/curb/survey?id=robertson-hall` (omitted id defaults to this site) returns `{data: Survey}` with no-store; reject extra/malformed/unknown selectors, missing/corrupt files and never substitute synthetic data. Export `fetchSurvey(signal?: AbortSignal): Promise<Survey>` from the client, validating response and identity.

POST `/api/curb/survey/report` accepts `ExportRequestSchema` JSON: `{survey, budgetCents: number|null, planId}`. Limit body to 2 MB. Validate reviewed edits, do not trust supplied totals. Recompute plans with root evaluator. Render a PDF with pdf-lib (already installed) using approved local close-up paths from this fixed survey registry, never arbitrary filesystem paths or network fetches. Include three policies, selected budget when present, defect/evidence cards, qualified accessibility effects, estimate assumptions/source links, deferred and quote-required work. Unknown measurements and no overall ADA verdict. Return PDF attachment. Errors use `{error:{code,message}}`, appropriate 400/404/413/500 status and no-store. Explicit user download is the only report request; do not generate PDFs on every slider move.

Export `surveyToCsv(survey: Survey): string` with escaped cells and spreadsheet-formula injection protection; keep stable IDs, timestamps, review, measurements and accessibility notes. All outputs reflect edits/rejections. PDF rendering and visual QA required; report commands/results honestly. Read the PDF skill before authoring. No dependency/config/shared-contract/data/media writes. Push scoped checkpoints; stop/release before root integration.

## Developer C: Landau, workspace UI

Branch `codex/robertson-survey-ui`. Exact new scope:
- `app/curb/surveys/[id]/page.tsx`.
- `src/features/curb/survey/` new components, CSS and colocated presentation tests.

Build Survey replay: video left, local site context right; Review findings → Compare repairs → Export report. Premium restrained cream/forest/amber civic design, large projector-readable type, clear hierarchy. Preserve portrait aspect ratio; overlays share the displayed video coordinate system and run on requestVideoFrameCallback (fallback timeupdate/animation frame); use root getBoxAtTime. Play/pause/seek work through native controls; findings/pins seek evidence. No fake loading, measurements or street accuracy. All current mapPosition values may be null: show approximate site context and unplaced findings, not invented individual pins. No external tile/font/network dependency. Normalized approximate accepted positions, when present, are selectable pins. The scene must visibly connect evidence selection, work areas, and plan options.

Use fetchSurvey from B, local edited Survey state, buildRepairPlans from root; import shared types directly. Allow accept/reject and correct label/kind/description and area priority (manual edits update reviewer/method). Restore original survey. Make missing media/data errors actionable. Three plan cards plus adjustable numeric/slider budget; show ranges/partial/quote-required/deferred needs/unknown route impact honestly. Use a currency text field preserving cents, no NaN or unsafe integer values. Display work-area quantities as assumptions, not measurements. Dynamic results from same data, no hardcoded counts.

Downloads: annotated MP4/source MOV local links, JSON Blob of current validated survey, CSV via B's surveyToCsv, PDF POST per B contract. Indicate pre-rendered annotated video reflects original analysis if review edits exist; do not imply edited labels have been burned into the MP4. JSON and PDF reflect current edits. Keyboard/focus, non-color labels, reduced motion and 390px no horizontal overflow required. No app shell/root manifests/API/domain/fixture edits. Push scoped checkpoints; stop/release before root integration.

## Orchestrator/root heavy work

Own `src/contracts/curb/survey.ts` and its tests; `src/domain/curb/survey.ts` and its tests; `src/data/curb/surveys/`; `public/curb/surveys/robertson-hall/`; `scripts/curb/`; this document; dependency files; root navigation/shell; bounded existing R2 empty-plan wording correction. Analysis/tracking provenance and source hashes remain inspectable. Final integration checks cover all 469 baseline tests, added tests, standalone replay goldens, browser video seeking/review/budgets/downloads, media decoding, PDF rendering and offline use. Do not start duplicate B/C workers while their assignments are live. Future pilots, live inference services and work orders are outside this demo checkpoint.

Original footage: supplied for GitHub publication by Oliver, Robertson Hall, Princeton; no dimensional measurements supplied. Original SHA-256: `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a`.

## Revision 2 inventory expansion

The user identified the connected surface breakup and final transverse crack omitted from revision 1. Revision 2 retains IDs 01–03 and adds 04–05 with their own work areas. The compatible catalog is bounded to 18 treatments and 4,096 possible work-area scopes (one treatment or none per area). The evaluator enumerates compatible scopes directly. API/DTO shape remains `curb-survey-v1`; findings and approved local images must remain data-driven.
