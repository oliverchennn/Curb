# Campus photo map — WIP checkpoint

Task `CURB-PHOTO-MAP/1`. Base `572c91657b8d35c59c5199258e0fb6f57bb17788`,
tree `36d83fe932ecff60cd75e81debfc1eba80d5c4ba`, branch
`codex/campus-photo-map`. Sole writer: Vincent / Dev B,
`01a1dde2-f504-7393-9ebd-a5b9f6c35da8`.
[Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6890309208) ·
[ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6890370619) ·
[Latest scope](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6890416752) ·
[Pass-through ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6890426170).

**WIP: no publication-ready photo records.** The manifest currently has zero images,
findings, locations and records. No asset or photo marker is published from the
supplied source; the photo controls stay hidden with an empty manifest. The
original completion requirement remains blocked. Do not merge this checkpoint
as the completed slice.

The additive manifest validates media rights fields, dates and precision, IDs
and their references, and separate camera and independently supported
finding positions. Map markers use a camera square for a viewpoint, an amber
exclamation triangle for a possible concern at a supported finding position, and an
octagon only after condition review. The actual panel keeps source, placement,
visible condition, review and any model suggestion distinct. Unplaced records
can be selected from the inventory without snapping. Map selection, the
keyboard list and URL state share a single evidence panel. Current traversal
remains Unknown. Router, budget, Robertson findings, point and line data, and
the download are unchanged.

[Google's Street View guidelines](https://about.google/brand-resource-center/products-and-services/geo-guidelines/#street-view)
do not permit rehosting extracted Street View crops or creating map data from them.
No independent grant was established for the supplied crops. The
[provider presentation correction](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6890399228)
also withdraws the proposed provider iframe beside this map. No crops,
provider iframe, private derivative findings, provider account, or credentials
are included. No public inventory can be inferred from the private review.
An independent candidate photo or provider source link requires the separate
product route decision recorded on the board.

Checks, 2026-11-15 on the isolated worktree (Windows, Node v24.12.0):

- `npm.cmd ci --no-audit --no-fund` installed the pinned lockfile.
- `npm.cmd run check` passed: TypeScript, 877 tests in 36 files, and the
  production webpack build. A preceding focused run passed 129 tests.
- Production-build smoke in Google Chrome at 1366×768 and 390×844 retained
  1,188 ways, 22 sections, and 333 archive points (329 eligible, four in
  location review), with no horizontal overflow at 390. Diagram, section
  selection and Reset worked. The Campus download returned HTTP 200 with the
  original 952,412 bytes, SHA-256
  `9262bbd2781c20d7be83a3645dc6de1fbca2f34b04cd56d7dc5a33ecd2b20868`.
- A separate ignored fixture copy at 1366×768 and 390×844 exercised square,
  triangle and octagon statuses, overview and section selection, a decoded
  320 px fixture image, focus on selection and return on Escape, restored
  section photo link, unplaced image error fallback, layer-off reload and
  Reset. Fixtures did not enter the branch. This confirms behavior with test
  data; it does not verify any public photo or placement.

Next: decide the public photo route, verify its actual media and attribution,
populate only the authorized projection, and repeat the browser checks with
real imagery. No deployment or merge performed.
