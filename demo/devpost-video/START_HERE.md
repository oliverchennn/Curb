# Curb Devpost video · timed recording guide

**1:56 · 1920 × 1080 · 30 fps**

Start with the silent [picture edit](Curb-picture-edit.mp4). Film one horizontal presenter take with a mic, following the timecode. Keep the presenter in the right rail so the app stays visible. The spoken lines below match the draft captions.

| Time | Picture | Say |
| --- | --- | --- |
| 0:00–0:03.2 | Animated Curb intro. | |
| 0:03.2–0:15 | Real Robertson Hall footage with the national CDC figure. Fade in the presenter. | Campus teams have limited repair budgets. In 2022, about one in eight U.S. adults reported serious difficulty walking or climbing stairs. |
| 0:15–0:38 | Real Robertson Hall Review screen. Select **04**, settle at **0:06**, then show the broken surface and field checks. | At Princeton’s Robertson Hall, we filmed a real sidewalk with a phone. Clicking Finding Four takes us to the broken surface at six seconds. The five findings were prepared with AI. A reviewer can check the footage and flag what still needs a site measurement. |
| 0:38–0:42 | Full chapter declaration **A separate simulated campus**. | For the budget test, we switch to a separate simulated campus. |
| 0:42–1:05 | Show the **$10,000** cards, then **Condition-first** and **Curb recommendation** maps. | Give both plans ten thousand dollars. Worst condition first funds repair C and opens one destination, Hall. Curb picks two linked repairs, A and B, and opens the Library and Student center. Same budget, two newly reachable destinations versus one in this example. |
| 1:05–1:21 | **Omit A**, **Restore recommendation**, **Omit B**. | Take A away and both new trips disappear. Put A back and take B away. The same thing happens. The shared route needs both repairs. |
| 1:21–1:32 | **$20,000** preset, then the two cards at 3 each. | At twenty thousand dollars, both plans can fund all three repairs. They tie at three newly reachable destinations. |
| 1:32–1:40 | The verified **$10,000** printable decision brief occupies the replaceable proof slot. | The decision brief keeps the recommended work and the model’s assumptions together. |
| 1:40–1:52 | Buyer and validation card. | The buyer is campus facilities. Next, we’d walk the crossings with disabled campus users and accessibility staff, measure them, and get quotes. |
| 1:52–1:56 | Animated outro. Fade out the presenter before the cut. | |

The 12.2% is a 2022 U.S. adult survey estimate, as defined by CDC’s mobility question. The pilot footage shows observed surface damage. It cannot establish passability, measurements, legal compliance, or the synthetic campus results. All Investment route and cost results use the separate synthetic network. Already-reachable Cafe is excluded from the new-destination counts. [CDC measure and 2022 estimate](https://www.cdc.gov/places/measure-definitions/disability.html)

## Film and assemble

1. Use a horizontal 1080p30 camera, front light and a quiet mic. Clap once for sync. Record the lines in order and leave a pause between sections. Play the silent picture edit on a separate screen or rehearse with its timecode.
2. Place the camera at **x 1544, y 722, width 320, height 180**. Keep it from 0:03.2 through 1:52. App captures fit **x 44, y 140, width 1456, height 819**. The matching transparent PNG plates are under [overlays](overlays).
3. Import the ten chapter clips in the order in [timeline.json](timeline.json), or import the [editable XML](Curb-edit.xml) and relink the media. Import [draft captions](captions-draft.srt) and time them against the actual read.
4. On Windows, run the [presenter helper](join-presenter.ps1) with your camera file and the offset in seconds where your first line begins. Example: `.\join-presenter.ps1 -PresenterFile .\presenter.mov -StartAtSeconds 2.4`. It uses FFmpeg or `CURB_DEMO_FFMPEG`. Export H.264 1080p30, AAC audio, and check the captions and the final running time before upload.

## Replace individual chapters as new evidence is accepted

- **Survey 0:15–0:38.** The current approved capture shows Finding 04 at six seconds on the earlier Survey review screen. When the compact presenter flow is accepted, capture **Original → Review → Surface breakup crop → real Accept**. Hold on the actual updated counts and the unknown field impact. Rehearse the revised narration in the same 23-second window.
- **Investment 0:42–1:32.** The capture follows the accepted hosted app and records its health revision. When a later release changes this flow, capture the same decision states using the instructions in the [README](README.md). Preserve the synthetic labels.
- **Proof 1:32–1:40.** Keep the actual decision brief until the separate benchmark and claims are accepted. Replace the brief, spoken line, and caption together with the accepted metric, measured scope, denominator, and source. Keep this window at eight seconds. The current script contains no benchmark or human speedup claim.
