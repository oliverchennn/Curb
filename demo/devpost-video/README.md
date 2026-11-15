# Curb Devpost video

The 99-second picture edit shows the Robertson Hall workflow from field evidence through the selected $500 repair plan and exported report. It leaves the right rail open for a presenter camera.

- [Timed script and recording guide](START_HERE.md)
- [Picture edit](Curb-picture-edit.mp4) and [editable timeline](Curb-edit.xml)
- [Separate clips](clips), [transparent overlays](overlays), and [draft captions](captions-draft.srt)
- [Storyboard](Curb-storyboard.jpg) and [the exact exported demo report](demo-budget-report.html)

## Edit in a video editor

Import the six numbered clips from `clips` in order at 1920 × 1080 and 30 fps. You can also import the XML and relink its media to that folder.

## Regenerate assets

Use Node 22 or newer, FFmpeg with H.264 encoding support, and Chrome for screen capture. Run `npm install` from this folder to install the optional tools. The rendered files can be edited directly.

- `npm run timeline` rewrites XML media links for your checkout.
- `npm run render:titles` renders the intro and outro from `tools/render.cjs`.
- `npm run capture` records the hosted prepared demo. Set `CURB_DEMO_URL` to capture a specific hosted or local version. Update selectors if the app changes.
- `npm run render` assembles the picture edit and transparent plates. Capture first to use a fresh recording. The renderer can use the older committed walkthrough for missing screen shots. Check `picture-sources.json` for the source of each shot.
- `npm run verify` decodes the clips, checks the transparent plates and capture receipt, and updates the storyboard. Review the selected plan and report again after replacing footage.

Set `CURB_DEMO_FFMPEG` to an encoder executable if it is outside PATH. The original phone footage comes from `public/curb/surveys/robertson-hall/survey.mp4`. The app footage was captured from the hosted demo. AI analysis of the clip was prepared in advance. The estimates remain partial pending site measurements and quotes.
