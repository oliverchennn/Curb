# Curb Devpost video

**1:39 target · 1920 × 1080 · 30 fps**

Record the presenter once, then lay that take over the picture edit. The three things a judge should see are the exact frame behind a finding, a repair choice under a fixed budget, and the report that carries that choice into a site visit.

| Time | Picture and click | Say |
| --- | --- | --- |
| 0:00–0:03.2 | Animated Curb intro. Start speaking after the cut. | |
| 0:03.2–0:15 | Roll the actual Robertson Hall phone footage. Bring in the presenter in the right rail. | We filmed this sidewalk at Robertson Hall. Curb helps campus facilities teams decide which access issues to inspect and which repairs to fund. |
| 0:15–0:38 | In **Review findings**, click **04** under **Jump to evidence**. Let the player settle at about six seconds. Point to the broken surface, then the inspection details. | Here’s the surface breaking up near Robertson Hall. Click the finding and Curb jumps straight to the frame behind it. We prepared five AI-assisted findings from this clip. The reviewer can check each one against the video and see what still needs a site measurement, including the height difference and clear path width. |
| 0:38–1:08 | Click **Compare repairs**, enter **500**, and choose the budget result. Let the selected work and deferred list sit on screen. Point to one quote or assumption. | Now suppose facilities has five hundred dollars. Curb compares possible treatments and shows what it would fund first. Switch to the budget plan and you can see the proposed work, the areas that would have to wait, and the costs that still need quotes. That gives the team a starting point for deciding where to spend the money. |
| 1:08–1:35 | Click **Export report** and open the PDF or HTML for the selected plan. Hold on the selected work or quote checklist. Let the last shot breathe before the cut. | Finally, we export the plan so a facilities team can take it to the site. The report keeps the evidence, the proposed work, and the open measurements and quotes together. They can use it to walk the site, get prices, and decide what to approve. |
| 1:35–1:39 | Animated outro. Fade presenter audio before the outro. | |

Use the same budget, scenario and report across the take. The script leaves specific repair counts and dollar ranges out because they can change between releases. Keep the distinction between observed footage, suggested findings and assumed measurements visible. The phone clip is real. Analysis shown in the prepared demo was generated in advance. Costs are planning estimates, and field measurements and quotes are still needed.

## Film the presenter

- Use one speaker, an eye-level camera, a quiet room and a front light. Record horizontal 1080p30. Capture the mic at 48 kHz if possible, with peaks around −12 to −6 dBFS. Clap once before the read for a sync point and leave two seconds of room tone at each end.
- Film the four spoken rows as a single take with a short pause between rows. For easy pickups, start again at the beginning of the row. The script leaves room for pauses at a conversational pace.
- Place the camera at **x 1544, y 722, width 320, height 180** on a 1920 × 1080 canvas. Use its full 16:9 frame. In editors with positions relative to the canvas center, the camera center is **x +744, y −272** for an upward-positive y axis. The enclosed framing guide has a transparent opening. The camera stays in the right rail throughout the spoken portion.
- Keep the microphone as the main audio. Record or edit the app clicks separately so the click timing can follow the best spoken take. Bring the camera in at 0:03.2 and cut it before the outro at 1:35.

## Capture the app if replacing the prepared shots

- Rehearse at `/curb/surveys/robertson-hall`. Reset the survey and clear the budget before capture. Use a fresh browser window, hide notifications, and keep the cursor still after each click. In OBS, capture the browser window at 16:9, ideally 1440 × 810 or greater, at 30 fps. Keep the window large enough to show the sticky video and workspace together. Record to MKV and remux to MP4 from OBS if needed.
- Capture three short takes. Hold at least two seconds before and after each action. First jump to finding 04. Next enter 500 and choose the budget result. Finally open the export that matches that selection. A checked report in a second tab makes the last shot quick and readable.
- Put the screen recording on the editable stage at **x 44, y 140, width 1456, height 819**. Import the matching transparent plate above it, then place the presenter above the plate. The stage has an opaque border around a transparent opening. Keep the app audible only if its audio adds context.
- Keep the chapter text in the right rail. Use `captions-draft.srt` as a starting point, update it to the spoken take, and verify it plays in the uploaded video. A clean voice take and one legible report shot matter more than extra transitions.

## Assemble and export

Drop the six numbered MP4s on a 1080p30 timeline in order, or start from the assembled preview. Those tracks show the intended cut and timing. Add the real camera and microphone above them. An editable timeline is included for editors that accept legacy Final Cut Pro XML. The bundled XML uses a neutral path. To reconnect it, point the editor to `clips` in this folder. To replace one app shot, use the timing above and its matching PNG plate from `overlays`.

If you have one timed presenter take with mic audio in the same file, the Windows helper can place it without an editor. Run this from the kit folder. Set the start offset to where the first spoken line starts in the raw take.

~~~powershell
.\join-presenter.ps1 -PresenterFile .\presenter.mov -StartAtSeconds 2.4
~~~

The helper uses FFmpeg on PATH. It creates Curb-with-presenter.mp4. Use your video editor for pickups, timing changes, or caption edits. The picture edit uses captures from the deployed Curb app and real Robertson Hall footage.

Export H.264 MP4, 1080p30, using AAC audio. Watch the entire export once. Check that the camera stays clear of the app, the project title is easy to read on a phone, the report matches the selected plan, the captions match the recording, and the final video is under the 2:00 limit. The recorded submission video and the in-person demo use the same story.
