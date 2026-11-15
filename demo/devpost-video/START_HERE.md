# Curb Devpost video · timed recording guide

**1:56 · 1920 × 1080 · 30 fps**

Start with the [read-aloud script](TELEPROMPTER.md) and [silent recording reference](Curb-picture-edit.mp4). Film one full-screen team introduction, then record a separate voiceover. The first seven seconds are a **TEAM CAMERA** placeholder awaiting your footage.

| Time | Picture | Say |
| --- | --- | --- |
| 0:00–0:07 | Full-screen team camera with the team’s own mic audio. Replace the slate. | Hey, we built Curb to help campuses figure out which accessibility repairs to fund. |
| 0:07–0:15 | Real Robertson Hall footage with the national CDC figure. Start the separate voiceover. | In 2022, about one in eight U.S. adults reported serious difficulty walking or climbing stairs. |
| 0:15–0:38 | Open the compact Presenter view in **Original**. Select **Review**, jump to **Surface breakup** at **0:06**, and show source frame 180. Enter the reviewer and select **Accept finding**. Hold on the actual counts and unknown route impact. | We filmed this outside Robertson Hall. When I click Review, you can see what the analysis flagged. I’ll jump to this patch of broken pavement and confirm what I see. We’d still need to measure it on site to know how it affects the route. |
| 0:38–0:42 | Full chapter declaration **A separate simulated campus**. | Now let’s look at a simulated campus. |
| 0:42–1:05 | Show the **$10,000** cards, then **Condition-first** and **Curb recommendation** maps. | Say we’ve got ten grand. Fix the worst spot first and the whole budget goes to opening Hall. Curb puts five thousand into the ramp and five into the shared path. That gets us to the Library and Student Center. Same money, two new destinations instead of one. |
| 1:05–1:21 | **Omit A**, **Restore recommendation**, **Omit B**. | Here’s the catch. Take out the ramp and neither route opens. Put the ramp back and skip the path repair. Same problem. You need both to get through. |
| 1:21–1:32 | **$20,000** preset, then the two cards at 3 each. | If we had twenty grand, we could do all three repairs. Then both plans reach the same three new destinations. |
| 1:32–1:40 | Audited proof card with **30 authored synthetic networks**, **120 budget cases**, **58 wins and 62 ties** versus condition-first. | Curb reached more destinations than condition-first in fifty-eight synthetic budget cases. The other sixty-two tied. |
| 1:40–1:52 | Buyer and validation card. | Facilities can take this plan into a budget meeting. Next, we’d walk and measure a real route with disabled campus users, then get quotes. |
| 1:52–1:56 | Silent animated outro. | |

The 12.2% is a 2022 U.S. adult survey estimate, as defined by CDC’s mobility question. The pilot footage shows observed surface damage. It cannot establish passability, measurements, legal compliance, or the synthetic campus results. All Investment route and cost results use the separate synthetic network. Already-reachable Cafe is excluded from the new-destination counts. [CDC measure and 2022 estimate](https://www.cdc.gov/places/measure-definitions/disability.html)

The benchmark counts more newly reachable destinations as a win at the same assumed budget. All four budgets per network, including the full-budget ties, are included. The human study was skipped. [Approved metrics ledger](https://github.com/oliverchennn/Curb/blob/deb9c7ccecbbe50491edeac75d98693f617c2fda/docs/evaluation/METRICS_CLAIMS.md)

## Shot and recording checklist

- [ ] **Team camera.** Frame whoever is present in landscape 16:9, ideally 1080p at 30 fps. Use front light and check the mic. Record about nine seconds so you can trim to seven without cutting words. Keep the team's original mic audio in the clip and save it as `recordings/team.mov`.
- [ ] **Voiceover.** Record in a quiet room with headphones while the silent edit plays. Start reading when the sidewalk shot begins at **0:07**. Leave pauses at the chapter boundaries and finish by **1:52**. Export the voiceover as `recordings/narration.wav`, ideally at 48 kHz. This is a separate take from the opening line.
- [ ] **Assembly.** Confirm the real team shot fills 0:00–0:07, the voiceover starts at 0:07, and the last four seconds are silent. The handoff, app review at 0:15, synthetic chapters, and proof card already have picture.
- [ ] **Final playback.** Check the first and last words, adjust the [draft captions](captions-draft.srt) to your take, and confirm the finished export is **1:56**, with four seconds of room before the two-minute cap.

## Assemble on Windows

Put both takes in the ignored `recordings/` folder. From this kit folder, run this with your actual source offsets. The example starts the team take one second into its file and uses the voiceover file from its start. Use zero for any file already trimmed to its first cue.

If you start the voice recorder with the silent edit and wait seven seconds to read the CDC line, trim the lead-in or set `-VoiceStartSeconds 7`, adjusting for when your first word actually begins.

~~~powershell
.\join-recording.ps1 -TeamFile .\recordings\team.mov -VoiceoverFile .\recordings\narration.wav -TeamStartSeconds 1 -VoiceStartSeconds 0
~~~

The [join helper](join-recording.ps1) uses FFmpeg on PATH or `CURB_DEMO_FFMPEG`. It uses seven seconds of camera footage and its mic, then the 105-second voiceover slot, then four seconds of silence. Voiceover starts at 0:07. A short read is padded with silence and any audio past the end of the slot is trimmed. The helper checks for decodable audio at both chosen offsets. It exports 1920 × 1080 at 30 fps with 48 kHz AAC to `recordings/Curb-with-team-and-voiceover.mp4`. Choose a new `-OutputFile` for another export.

For a manual edit, import the [editable XML](Curb-edit.xml) or use [timeline.json](timeline.json). Replace the first 210 frames with the team footage and mic, and place the voiceover at 00:00:07:00. The [legacy inset helper](join-presenter.ps1) only adds an inset and leaves the opening slot in place.

## Record the app again after a relevant release

- **Survey 0:15–0:38.** Open `/curb/surveys/robertson-hall?present=1`. Use a fresh tab so the captured acceptance starts at 0 accepted. Keep the crop, update to 1 accepted and 4 pending, and field-impact status in view.
- **Investment 0:42–1:32.** Capture the same decision states from the checked hosted revision. Follow the [README](README.md) to keep the capture tied to its exact source.
- **Proof 1:32–1:40.** Keep the scope and comparator beside the numbers. Change the card, narration, captions, and proof source together if the approved claim changes.
