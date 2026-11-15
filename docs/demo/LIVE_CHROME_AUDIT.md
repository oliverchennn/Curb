# Curb live Chrome audit

Assignment [CURB-LIVE-CHROME-AUDIT/1](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6886997270) · Vincent / Dev B. The ongoing Codex goal remains active. This receipt covers the public baseline and the first local repair. The final combined deployment and its repeat audit are pending.

## Exact sources

- Public baseline [curb-taupe.vercel.app](https://curb-taupe.vercel.app) at `fd697515eecc6e4ba3f8259f7e8cd8b05f78d256`, confirmed by `/api/health` before and after the interaction pass.
- Save/reset fix `cc3d480f89d7deafa30e82ba11b871bb423b6431`. [Local repair receipt](SAVE_RESET_DEMO.md).
- Windows Google Chrome 156.0.8078.74 through Playwright. Main interaction pass at 1366×768, layout samples at 1920×1080 and 390×844, and mobile keyboard/media and reduced-motion checks at 390×844. Local repair passed both 1366 and 390. Browser receipts, screenshots, and downloads are retained in the temporary `curb-dev-b-chrome-audit` folder.

## Defects and acceptance gaps

| ID | Severity and owner | Reproduction and expected behavior | Observed browser evidence | Fix and verification |
| --- | --- | --- | --- | --- |
| CH-01 | High · B survey review | On the Robertson review, fill reviewer and rationale, save a priority, leave the finding and return. Change the level and save. The editor should retain the reviewed rationale, apply the revised level and keep focus. | Chrome showed the saved rationale in the summary but a blank textarea immediately after save and on return. Focus left Save after remount. A subsequent Low submission was rejected as missing a rationale. Adjacent confirmation was absent. The baseline screenshot is `baseline-save-reset.png`. There was no uncaught page error. | `cc3d480f89d7deafa30e82ba11b871bb423b6431`. Local 1366/390 retest saved multiple levels with one reason, confirmed field-linked validation and focus, and verified changed plan and exports. |
| CH-02 | Medium · B shared navigation | Edit or start activity on any Curb page. There should be one keyboard-accessible way to return that page to its initial state. | The public header on all seven routes lacked a current-page Reset demo action at 1920 and 390. Existing page-specific resets covered narrower state. | `cc3d480f89d7deafa30e82ba11b871bb423b6431`. Local 1366/390 resets passed on all seven routes, including active simulation/playback and an Explorer deep link. |
| QA-C-01 | Medium · Explorer integration owner | On released aerial candidate `310189d0130dc939746f29a9ece8b01dd0a8e8d3`, validate 44 px hit areas around archive line, ramp and number-badge controls at 390. | Independent source review identified 34 px line strokes, 40 px ramp targets and 17 px number badges. This finding refers to the separate C candidate. [Owner's finding and reproduction](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6887216581). | Pending combined Chrome confirmation and fix if needed. |

## Public baseline interaction evidence

| Surface | Exercised and observed |
| --- | --- |
| Navigation | All five primary navigation links and their current-page markers, Curb brand redirect, browser Back, links into the sample trip, and an exact field-to-survey deep link. |
| Upload | Empty and unmatched clips returned actionable messages. The bundled flow started and cancelled. The prepared MP4 opened the five findings after the stateful simulation with no upload POST. |
| Survey replay | All five authored finding seeks reached 7, 9.5, 12, 6, and 13.933333 seconds. Original, Review and Annotated modes retained time. Keyboard play/pause and backward seek worked. Injecting a failed survey GET showed a Retry control that recovered the real survey. |
| Review and priorities | Missing reviewer guard, accept, reject, mark pending, correction of label/kind/description, standards and analysis disclosures, and Restore original. Priority re-save exposed CH-01. |
| Budget, plans and reports | Negative input, keyboard range, clear, typed $500, and all four plan selectors. Six real downloads completed (JSON, CSV, PDF, accessible HTML, annotated MP4, original MOV). Public JSON held five findings and PDF had the expected file signature. |
| Rover | Play/pause, three speeds and view presets, Reset view, coverage, auto inspection, both stop seeks with all three cameras, progress scrub, static/3D and replay. Loaded reduced-motion controls remained usable offline with manual camera selection. |
| Explorer | All five collections and 37 reel records, previous/next, type filtering, source-ID search and no-result recovery. Across the three archive maps, keyboard selected 23 mapped markers and the trays selected seven unplaced items without drawing them. Zoom, fit selection/collection, keyboard pan, source and all-record disclosures. Photo zoom/pan/reset, clip close, mobile panels and hidden-clip pause, Defect 05 transit at 13.933333 seconds and Back. Synthetic conflict cards rendered with equal width and retained stated uncertainty. |
| Campus and synthetic comparisons | All four campus barrier selectors, keyboard movement and reset. Sample budget presets, validation, compare, evidence actions, assumptions, and reset. Trip origin, destination and repair controls, compare, evidence and reset. Browser-intercepted load/comparison requests exercised cancellation and recovery. |
| Layout and accessibility | No page overflow in the 1920 and 390 route samples. No uncaught page errors in the main baseline pass. Observed native keyboard focus on representative controls. The 390 initial-state sample did not size every conditional or SVG hit target. |

## Next verification

Repeat the control inventory on the actual combined deployment, including the revised aerial/diagram, compact record navigator, imagery failure fallback and marker hit areas. Include every conditional disclosure and input variant, mobile touch and keyboard paths, report recovery, confirmed source revision and warmed-versus-cold offline behavior. Read the live board for the exact accepted source and deployment owner before a release.
