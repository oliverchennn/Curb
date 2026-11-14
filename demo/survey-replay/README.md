# Curb survey replay

From the repository root, run `node demo/survey-replay/serve.mjs` and open
`http://127.0.0.1:8742/survey-replay/`. The loopback server uses local assets
and needs Node. In the existing Curb Next.js app, the same page is available at
`/survey-replay/index.html`.

Play the 21-second sample or jump to either finding using its timeline row.
The matching pin appears when the playhead reaches the finding. Choose the
raised slab pin to seek to the evidence and highlight the Market Street
crossing. Open its thumbnail for a close-up. If a finding starts beyond the
loaded video, its timeline row explains why seeking is unavailable.

The synthetic comparison models only these authored segments and the step-free
profile. A reviewed blocking assessment restricts its segment. The model
assumes the other segments are passable. Unreviewed findings and annotations
without an assessment provide no observation of passability. The table shows
hypothetical repair effects and illustrative distances.

| Scenario | Library | Clinic | Pharmacy | Change from current |
| --- | --- | --- | --- | --- |
| Current conditions | 330 m | Blocked | Blocked | — |
| Repair surface crack | 240 m | Blocked | Blocked | 90 m saved |
| Repair raised slab | 330 m | 260 m | 275 m | 2 newly reachable |

## Replace the sample

1. Put a local MP4 or WebM and optional poster and close-up under
   `public/survey-replay/media/`. Set `video.src`, `video.poster` and
   `video.label` in `public/survey-replay/survey.json`. Use paths starting
   with `media/`, with letters, digits, underscores or hyphens in directory
   names and filenames. Images can be JPEG, PNG or WebP. Results require
   browser support for the selected video codec.
2. Edit each finding's `start` and `end` in seconds and `box` as
   `[left, top, width, height]` fractions of the source frame. The synthetic
   repair controls use the finding IDs `surface-crack` and `raised-slab`.
   `current` is reserved for the untreated baseline. An annotation source
   can be `model` or `manual`. The assessment has its own boolean review field.
3. Use `assessment: { "reviewed": true, "stepFree": "blocked", "reason": "…" }`
   only when the reviewer has explicitly marked the segment blocked. In the
   sample the crack has a separate reviewed obstruction record for broken
   pavement that interrupts usable width. A repair clears only the selected
   finding's restriction. Other reviewed restrictions on the segment still
   apply.
4. Use `closeUp` for a detail photo. Add
   `measurement: { "value": 18, "unit": "mm" }` only after a real measurement.
   The bundled sample leaves measurement absent.
5. For replacement geography or surveyed footage, set `sample` to `false`.
   Update nodes, segment endpoints and distances, destination names, and
   findings' segment IDs together. The map uses a 650 × 392 view box. Omitting
   a segment's `bidirectional` flag makes it two-way. Use boolean `false` for
   travel from `from` to `to` only. In replacement mode the page supports
   video, annotations and mapped findings. Repair comparison is available
   for synthetic scenarios only.

The bundled MP4 is a synthetic motion study from generated sidewalk images
with no observed campus conditions or measured rise. The two scenes share
a consistent visual setting. [Everett Bumstead's 12-second cracked pavement
video on Pexels](https://www.pexels.com/video/close-up-of-cracked-skate-park-pavement-35988850/)
is an optional stock candidate for the crack scene.

## Verify

Run `node --test demo/survey-replay/replay.test.mjs demo/survey-replay/server.test.mjs`
from the repository root. The standalone server responds with HTTP 416 to
unsatisfiable byte ranges. During review, Next's static MP4 handler returned
HTTP 500 for an unsatisfiable range. Use the loopback server for standalone
range checks.
