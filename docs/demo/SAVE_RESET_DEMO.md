# Work-area priority and page reset

Assignment [CURB-SAVE-AND-PAGE-RESET/1](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6886877404) · Vincent / Dev B · contract `curb-survey-v1`.

- Assigned base `fd697515eecc6e4ba3f8259f7e8cd8b05f78d256`.
- Tested application commit `cc3d480f89d7deafa30e82ba11b871bb423b6431` on `codex/save-and-page-reset`.
- Branch receipt and downstream integration are tracked on the team board.

## Reproduction and behavior

On the public PR #10 build, enter a reviewer and reason, save the first work area's priority, switch to another finding, and return. Chrome showed the saved review text and an empty reason input both immediately after saving and on return. The Save button lost focus after the form remounted. Changing the level to Low and saving again failed with the required-reason error.

The form now shows the current saved work-area value separately from the proposed finding priority. A successful save shows confirmation beside the button and keeps keyboard focus. The reason remains editable when revisiting that area. Missing reviewer or reason focuses the relevant input and shows a linked error nearby. The v1 export still records the named reviewer and explanation in the work-area rationale. Restoring the original survey drops the edited review.

Reset demo reloads the current page at its clean URL. A clean page reloads in place. A deep link replaces its query and fragment so the destination's own defaults can apply. Explorer may then write its default collection and record back to its URL. Current-tab edits and active media or simulated processing are discarded. Files already downloaded remain on disk.

## Verification

`npm run check` exited 0 with TypeScript, 752 tests in 28 files and the production build. `npm run test:replay` passed 14 tests. `git diff --check` passed before the application commit. No dependencies or application contracts changed.

Windows Google Chrome 156.0.8078.74, controlled with Playwright at 1366×768 and 390×844 against the local production build, passed all 16 grouped checks. The 390 run used reduced motion. The browser tests included the following outcomes.

| Flow | Observed result |
| --- | --- |
| Work-area review | Both required-field errors had adjacent text and moved focus to the relevant input. High → Low → Medium → Low saved with retained rationale after a finding switch. Keyboard Save retained focus. |
| Plan and export | At $478 Work area 01 was selected before its priority changed. Lowering its priority to Low selected Work area 02 at the same budget. JSON preserved the Low work-area value and High proposed finding value, CSV carried the rationale, the report request carried the edited survey, and real HTML and PDF downloads completed. Text extracted from the downloaded PDF confirmed the reviewer rationale, Budget scenario and Work area 02. |
| Survey reset | After editing review status, correction, priority and budget, the page returned to five pending findings, original label and priority, blank reviewer and rationale, first finding, Review tab, blank budget, Balanced policy, and clean exported JSON. The query and fragment were removed. |
| Upload reset | An unrecognized file showed the expected error. Reset during an active simulation cleared the file, error and progress. The old timer did not navigate after its ten-second runtime. |
| Rover reset | Reset during playback restored time zero, paused mode, Forward camera, and default speed. |
| Explorer reset | A field-filtered, queried and hashed deep link returned to the default collection and record. Reset after zoom preserved the fresh default selection. |
| Synthetic pages | Sample-network budget and automatically calculated result returned to defaults. Campus barrier cleared its selection. Trip inputs returned to defaults and removed the earlier comparison. |
| Keyboard and sizing | Native Tab reached Reset demo, visible focus was present, the target was at least 44×44 CSS pixels, and the tested header had no horizontal overflow. No page runtime errors were observed. |

Screenshots, Chrome receipts and downloads are local under the temporary `curb-dev-b-chrome-audit` folder. These are viewport checks on Windows Chrome. The merge owner still needs to verify the combined build and the live audit must repeat after release.
