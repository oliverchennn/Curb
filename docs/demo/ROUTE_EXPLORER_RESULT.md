# Route explorer — Developer D result

**Ready for root integration.** `/curb/explore` is a local evidence atlas with three audited archive corridors, the five actual Robertson photographs in their own unplaced collection, and a separate synthetic conflict example. No explorer blocker remains in the executed checks. Shared navigation, B's collection page and hosted acceptance remain integration dependencies.

Task: `CURB-ROUTE-EXPLORER/1`; Developer D, session `6af808fa-83dc-8191-bd58-80697dbe50c9`. Assignment [6883030624](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6883030624), ACK [6883049425](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6883049425). Exact implementation base **`6b2b11040eed8d3d620743bc4e12e112f9ebfa90`**, isolated checkout `/workspace/curb-route-evidence-explorer`, branch `codex/route-evidence-explorer`. Brief read at docs-only commit `635a91ce6d999cc90c77b137512370a6a2f01692`; the implementation base was not advanced.

Only new paths in `app/curb/explore/page.tsx`, `src/features/curb/explore/`, `public/curb/explore/` and this report were written. Existing application/domain/API/tests/data/media/config/global styles are unchanged. No dependencies, external map service, deployment, main merge or child agent was added. The branch includes WIP commit `29fbfb6d1d3fc6aca8a089db13dff51c08e71e3d` and its completion commit; integrate both changes from the assigned base, not the completion delta alone. The final publication comment records full local/remote equality and release.

## What is inspectable

| Collection | Records | Drawn source features | Unplaced records |
| --- | ---: | ---: | ---: |
| 01 Library / Witherspoon | 8 | 7 | 1 |
| 02 Nassau / east crossing | 10 | 7 | 3 |
| 03 Nassau / west crossing | 12 | 9 | 3 |
| 04 Robertson Hall | 5 | 0 | 5 |
| 05 Evidence examples | 2 | 0 | 2 |

There are **31 distinct records**, **30 feature identities**, and **11 distinct unplaced records**. Some archive records belong to more than one collection, so row counts are not additive. Ten line features and ten ramp points have source geometry. Forty-six unchanged nearby source lines provide muted context; no building footprint or campus connector was invented. Textual street/context labels are orientation aids, not new evidence geometry.

Selecting a collection fits its known extent. Source lines distinguish paths from dashed crossings; points, snapshots and the complete evidence list select the same stable record ID. Zoom, fit and pointer/keyboard pan retain selection. Search covers names and source/record IDs; filters retain an eligible selection, disclose hidden unplaced/conflict counts, and offer reset. Searching either conflicting example keeps both cards visible. Previous/next snapshots wrap and bring the selected thumbnail into view.

On mobile, Map & snapshots / Collections / Evidence tabs expose the same records. Arrow keys, Home and End control tabs; collection arrows move focus and Enter selects. Selecting a collection moves focus to the visible map tab. Controls occupy their own map row so they cannot cover a fitted endpoint. Primary route names are 15–16px; type and snapshot date/name labels are 14px. Rail and drawer scroll independently on desktop. Root's review comments [6883290937](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6883290937) and [6883351414](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6883351414) are incorporated: dates use `dateText(record.captured)`, and only synthetic accepted records receive the “example only” suffix.

## Provenance and limits

The input is the repository's `docs/source/Curb_Research_and_Data.zip`, read alongside `docs/research/PRINCETON_CORRIDOR.md` and `PRINCETON_SOURCE_AUDIT.json`. ZIP integrity, all six member hashes, and exact raw equality of every extracted line/ramp/context feature were checked. The [source receipt](../../public/curb/explore/verification/source-receipt.json) preserves all hashes and counts.

- ZIP SHA-256: `a1757bb7c964f9e6f4e178b86742b3994e299d7c1b2af67de220f4c445d43475`.
- Path/crossing member SHA-256: `99c086c61fc02a8c9e9d4308acb143844cad90e0e277192812010a67c9406065`.
- Ramp member SHA-256: `62fbe2547ae1cf4ff1b332f55634667d301df932bf5ce8199c512d5dc9c18d3d`.
- Line IDs: `889957, 834112, 809875, 986574, 834108, 1010009, 1004047, 957434, 942676, 951724`.
- Ramp IDs: `568004, 448038, 454485, 496163, 461092, 554811, 562921, 501839, 577885, 478465`.

Coordinates, original feature IDs and properties remain unchanged. A small local equirectangular projection centers on `[-74.6597, 40.3502]` solely for drawing; it supplies no measured distance, width or slope. Visible attribution and the [DVRPC license](https://catalog.dvrpc.org/dvrpc_data_license.html) remain present, with original source links in the drawer.

The local catalog date `2026-11-13` is not an observation or capture date. Undated archive capture/retrieval stays **Unknown**. Dated primary-source web retrievals retain their audited instants and render in America/New_York with a zone label; date-only values retain date-only precision. The four door/gate/campus guidance targets have null positions. The west-side level G elevator-lobby entrance is explicitly distinguished from the separately named stepped west entrance. Both west-crossing ramp records retain their `ASSUMED` status.

Robertson uses the existing survey JSON read-only: findings `defect-01` through `defect-05`, their actual local `closeupSrc` images and their exact `evidenceTime` values. Original MOV SHA-256 remains `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a`. All five locations, observation dates and capture dates remain null. Descriptions retain unmeasured quantities and pending human review. Each card links to the actual local clip using its media-fragment time and separately to the real survey workspace; there is no invented finding deep link or copied survey implementation.

The two conflicting records are explicitly invented UI examples on one unplaced target; one missing-photo state and one publication-withheld state have separate explanations and no fabricated photograph. An actual failed local image also shows an explicit failure, without a substitute. Accepted attachment status never changes **Current traversal: Unknown**. No route recommendation, field measurement, current opening, accessibility or ADA certification is asserted.

Historical scout-map `4ba01d89396bc864ba31884ed298e1e4993d131a` and UX proposal `ed6472de87d19703f8f9a69768ca532f37015748` were read as references only. No historical branch was cherry-picked; this is not acceptance of the earlier scout map.

## Executed verification

`npm run check` passed: **710 tests in 24 files**, TypeScript, and the Next production build. The new 27 semantic tests cover ZIP/audit identity, genuine photo association, null locations, accepted-attachment semantics, source/date precision, filtering/identity, conflict visibility, media states and malformed data rejection. [Actual check log](../../public/curb/explore/verification/npm-check.txt).

The committed [browser verifier](../../src/features/curb/explore/verify_browser.py) used installed Python Playwright with real Chromium **156.0.8078.79**, `next start` on loopback, and the real built page/media/survey. Its final run completed November 14, 2026 at **3:01:47 p.m. EST** (`20:01:47Z`): **93 checks passed**. [Machine-readable receipt](../../public/curb/explore/verification/browser-receipt.json) records each check, viewport, request/error classification and SHA-256 of the exact product bytes tested. Its `head` identifies the prior WIP commit because completion edits were still uncommitted during the run; `productSha256` binds the tested final source bytes.

- Real viewports: **1366×768**, **1920×1080**, **390×844**. No page horizontal overflow. All archive features fit clear of the control row; all five collections and mobile evidence panels were reached.
- Actual Chromium **200% page zoom**, not CSS scaling: `visualViewport.zoom=2`, `devicePixelRatio=2`, CSS viewport `683×340` in a `1366×768` browser window. Mobile-equivalent tabs and evidence remained usable with no horizontal overflow. The zoom screenshot uses Chromium's native capture API to avoid Playwright's zoom clip mismatch.
- Exercised source-ID search, all collection choices, evidence filtering, retained identity, empty/reset, unplaced search, both conflict cards, snapshot previous/next/wrap and visible selection, marker Enter/Space/click, pointer pan, keyboard pan/zoom/Home, route keyboard controls, tab arrows/Home/End, visible mobile focus, and reduced-motion emulation.
- All five actual field photos decoded successfully; no field marker was drawn. The real media-fragment link opened the actual local video, and the survey link reached the existing workspace with its video. This checks navigation and media loading; it is not a fresh frame-accuracy audit of the existing player.
- Clean explorer runs had **zero page exceptions, console errors, external requests or non-cancellation request failures**. Existing Next prefetch cancellations (`net::ERR_ABORTED`) are separately recorded. A deliberate local photo abort produced the expected network error and honest failure card, with no page exception.
- The separate existing-survey handoff produced one reproducible **P3 missing `/favicon.ico` 404** on this pinned base. Reproduction: navigate from a field card to `/curb/surveys/robertson-hall` in a fresh browser. Survey and media still load; no page exception occurs. The explorer has its own scoped icon. Root owns any shared-icon correction.

Reproduce after `npm ci` and `npm run build`: start `npm run start -- --port 3186`, then `python src/features/curb/explore/verify_browser.py`. The verifier requires an already installed Python Playwright and Chromium; it adds no repository dependency and installs nothing. It only accepts a localhost target. Normal paths use actual local assets; the one image-abort case is explicitly injected.

## Screenshots and remaining integration work

[1366 desktop](../../public/curb/explore/verification/desktop-1366.png) · [1920 desktop](../../public/curb/explore/verification/desktop-1920.png) · [390 map](../../public/curb/explore/verification/mobile-map.png) · [390 field detail](../../public/curb/explore/verification/mobile-field-detail.png) · [390 conflicts](../../public/curb/explore/verification/mobile-conflicts.png) · [desktop field detail](../../public/curb/explore/verification/robertson-field-detail.png) · [desktop conflicts](../../public/curb/explore/verification/conflicting-examples.png) · [native 200% viewport](../../public/curb/explore/verification/zoom-200-percent.png).

These are actual captures of this pinned branch, including its existing header. Root must verify the combined shared navigation/shell and B's `/curb/collection` route after integration, then hosted behavior. The collection link is present but its destination is intentionally absent on this assigned base. No hosted, offline-browser-cache, screen-reader, Safari/Firefox, touch-device or physical-projector acceptance is claimed. Operation requires the local app server and bundled assets, with no runtime map/font/media provider. The atlas is inspect-only, with no new persistent review workflow.

Developer D publishes and releases only the assigned new paths. Root remains sole integration/merge owner; the board RESULT records the actual stop and remote equality.
