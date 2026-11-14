# Robertson Hall survey media

Original `source/IMG_0699.MOV` was supplied by Oliver for GitHub publication. Site attribution is the user's statement (outside Robertson Hall, Princeton). The original retains its phone metadata/audio and is unchanged; SHA-256 `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a`.

`survey.mp4`: 419 frames, 30 fps, portrait 720x1280, SDR H.264, no audio. Original HEVC/HLG is rotated according to its display metadata, linearized, converted from BT.2020 to BT.709, Hable tone-mapped, encoded BT.709/yuv420p with faststart. `annotated.mp4` uses the same frames with boxes/labels drawn from the retained tracks. Close-ups and full evidence frames are extracted from the normalized clip. The annotated download is a fixed analysis revision, not a live export of subsequent UI review edits.

Analysis data: `src/data/curb/surveys/robertson-analysis.json` retains the AI-selected descriptions and anchor boxes. `robertson-tracks.json` retains forward/backward-checked pyramidal LK flow, RANSAC motion fitting, frame boxes and stop reasons. `robertson-hall.json` is the editable application manifest. AI proposals and visual review are not a human field inspection. No scale, crack width, slab height, area, geographic path trace or route passability was inferred.

Reproduction from repository root (isolated Python environment recommended):

```sh
python -m pip install numpy Pillow opencv-python-headless imageio-ffmpeg
python scripts/curb/process_video.py all
python scripts/curb/build_manifest.py
```

The Python environment is preprocessing-only; the demo requires only the normal local Next.js runtime and committed media/data. Full-resolution frame caches and contact sheets stay in ignored `.curb-local/`. Building the manifest overwrites authored edits: save reviewed JSON first. Review tracking and generated frames after changing seeds or media. Do not interpolate through missing track frames.

Cost references are benchmarks with visible dates and assumptions. The sealing benchmark is historical (2021), the selected sidewalk-construction benchmark is from a 2026 New Jersey bid. Neither is a current small-job campus quote. Work quantities are scenario assumptions, not dimensions measured from this video. Mobilization, site verification, accessible work-zone provision and other unpriced work remain quote-required. The report must display partial estimates as partial.
# Local map context

`site-context.svg` is rendered by `scripts/curb/render_context.py` from the retained `src/data/curb/surveys/robertson-context.geojson`. Public OpenStreetMap extract retrieved 2026-11-14 from `https://api.openstreetmap.org/api/0.6/map?bbox=-74.6562,40.3468,-74.6527,40.3501`. © OpenStreetMap contributors, [Open Database License 1.0](https://www.openstreetmap.org/copyright). The retained extract omits contributor account metadata. Buildings/streets/paths provide context only; no defect coordinates, traversal assessment or accessible route is inferred. The phone GPS marker is a single approximate clip-level tag. The app makes no live tile requests.
