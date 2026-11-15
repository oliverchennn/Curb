# Robot CAD web assets

The `/curb/robot` tab renders a concept CAD model of the Curb sidewalk-survey robot.
It is a **generic prototype / visual model — not validated hardware.** No part numbers,
ratings, capacities, chemistries, sensor models or performance claims are made or implied.

## Served assets

The viewer loads static assets from `public/robot/`:

- `manifest.json` — groups, per-part metadata, colours, centroids and explode offsets.
- `parts.json` — the flat part index (every part names exactly one group).
- `models/group_<id>.glb` — full per-part geometry for the exploded view (loaded lazily, per group).
- `models/preview_<id>.glb` — decimated geometry for the fast overview / hover pass.
- `stills/assembled.png` — reference image shown when WebGL is unavailable.

The initial overview payload (six `preview_*.glb` + `manifest.json`) is ~7.5 MB; the full
`group_*.glb` files load only when a group is exploded.

## Provenance

These assets were generated from the parametric CadQuery model in the Developer E CAD handoff,
GitHub release [`curb-robot-cad-e-handoff-2026-11-15`](https://github.com/oliverchennn/Curb/releases/tag/curb-robot-cad-e-handoff-2026-11-15)
(`CURB-ROBOT-CAD-E-PRODUCT.zip`, SHA-256 `1d98692e8077bc03da90ee8e34be059d444176b026a2c0c6e5e912c118feb768`).

Geometry digest of the exact model that produced these assets:

```
baebf97c74b452895dad142f24c7e4b70625c30d30d84b9954c4c9e6458d042d
```

(The per-module source hashes are embedded in `public/robot/manifest.json` under `source.geometry_files`.)

## Regenerating

The CAD source is not vendored into the app repo; it lives in the release ZIP and in the
git-ignored `.curb-local/robot-cad-e/` workspace. `export_web.py` here is the copy that produced
the assets, kept for reference. To regenerate:

1. Extract `CURB-ROBOT-CAD-E-PRODUCT.zip` (or `-SOURCE.zip`) into a working directory.
2. Create the Python environment from `requirements-lock.txt` (CadQuery 2.8, trimesh, pygltflib).
3. Run `python export_web.py` — it writes `web/public/manifest.json`, `web/public/parts.json`
   and `web/public/models/{group,preview}_*.glb`.
4. Copy those outputs into this repo's `public/robot/` (manifest, parts.json, models/ and
   `stills/assembled.png`).

The grouping and coverage are asserted by `src/features/curb/robot/groups.test.ts`.
