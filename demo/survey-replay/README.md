# Curb survey replay

From the repository root, run `node demo/survey-replay/serve.mjs` and open
`http://127.0.0.1:8742/survey-replay/`. This uses local assets and needs Node,
with no package installation or venue network. In the existing Curb Next.js
app, the same page is available at `/survey-replay/index.html`.

Play the 21-second sample or jump to either finding using its timeline row.
The matching pin appears as the playhead reaches the finding. Choose the
raised slab pin to seek to the evidence and highlight the Market Street
crossing. Its thumbnail opens the close-up.

| Scenario | Library | Clinic | Pharmacy | Change from current |
| --- | --- | --- | --- | --- |
| Current conditions | 330 m | Blocked | Blocked | — |
| Repair surface crack | 240 m | Blocked | Blocked | 90 m saved |
| Repair raised slab | 330 m | 260 m | 275 m | 2 newly reachable |

## Replace the sample

1. Put a local MP4 and optional poster and close-up under
   `public/survey-replay/media/`. Set `video.src`, `video.poster` and
   `video.label` in `public/survey-replay/survey.json`. Paths are relative
   to the replay page.
2. Edit each finding's `start` and `end` in seconds and `box` as
   `[left, top, width, height]` fractions of the source frame. Keep
   `surface-crack` and `raised-slab` as the IDs for the two repair controls.
   A finding may have `source: "model"` or `source: "manual"`. Both
   sources require a separate assessment to affect routing.
3. Use `assessment: { "reviewed": true, "stepFree": "blocked", "reason": "…" }`
   only when the reviewer has explicitly marked the segment blocked.
   A box or defect label alone has no effect on routes. The sample crack
   has a separate reviewed obstruction record for broken pavement that
   interrupts usable width. A repair clears only the selected finding's
   restriction. Other reviewed restrictions on the same segment still apply.
4. For the slab, add `closeUp` to point at a detail photo. Add
   `measurement: { "value": 18, "unit": "mm" }` only after a real measurement.
   The example syntax shows a value. The bundled sample leaves measurement
   blank.
5. If you change geography, edit the nodes, segment endpoints and distances,
   destination names, and findings' segment IDs together. The supplied
   background is an illustrative street grid at 650 × 392 map units.

The included MP4 is a synthetic motion study from generated sidewalk images.
It illustrates how to review a recording. It contains no observed campus
conditions or measured rise. [Everett Bumstead's 12-second cracked pavement
video on Pexels](https://www.pexels.com/video/close-up-of-cracked-skate-park-pavement-35988850/)
is a stock candidate for the crack scene. The packaged sample gives both
findings a consistent visual setting.
