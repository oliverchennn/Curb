# Robertson upload demo and video views

The home route opens `/curb/upload`. Choosing the supplied `IMG_0699.MOV`, its exact prepared `survey.mp4`, or **Use Robertson Hall demo** starts a 10,000 ms processing simulation and navigates to the existing survey workspace. The screen explicitly identifies the simulation and precomputed analysis. No file leaves the browser, no new AI inference is claimed, and arbitrary footage cannot acquire Robertson's findings. A SHA-256 check matches selected file bytes against the two prepared inputs. Empty or larger-than-50-MB selections are rejected before reading their bytes. The bundled option works without a picker or network service beyond the local app.

Cancel clears the timer; leaving the page invalidates pending file checks and timers. The progress heading receives focus, the current stage is announced, and the native progress element has a text label. There are no animated scanning effects; reduced-motion CSS suppresses transitions. Direct survey links remain available.

The video controls separate three uses:

- **Original:** normalized source footage without finding overlays.
- **Review:** interactive overlays driven by the playhead, selection and current review state. Rejected findings are hidden.
- **Annotated:** the exported MP4 with the original analysis permanently rendered into its frames. Review edits are not burned into that existing file.

Review and Annotated intentionally identify the same physical findings. Differences in label placement are presentation differences, not independent analyses. Source changes preserve the paused evidence time once metadata loads.

## Root verification before workspace integration

On the local development server, the actual supplied MOV passed the local file check and started processing. The bundled sequence opened the real survey; Cancel kept the upload page open more than 17 seconds later. Selecting the annotated export as an unsupported input showed the prepared-analysis error. Native keyboard Enter started the sequence, the file control had a visible label focus outline, and processing focused its heading. At measured 1366×768 and 390×844 browser viewports the upload page had no horizontal overflow. All images were local.

The video controls showed no boxes in Original, two live boxes at Defect 04's six-second evidence in Review, and the actual annotated MP4 with no duplicate DOM boxes in Annotated. The annotated player restored six seconds after metadata loaded. Defect 05's final-frame selection produced its live overlay. Typecheck passed. This is browser interaction evidence, not a screen-reader session or a claim of live AI processing. Combined production verification follows C's revised workspace and B's hosting package.
