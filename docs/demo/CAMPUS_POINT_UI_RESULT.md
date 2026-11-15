# Campus Explorer archive-feature UI result

CURB-CAMPUS-POINT-UI/1 by Vincent / vzhu08. The executable source is `684be8ee823cfb07d366f939816a21ed92a851b9` on `codex/campus-point-ui` from `7b80202ed655848f241ac61318b05b8b92257b59`. The handoff commit adds this report. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6888925256)

The campus layer starts off. The overview retains 1,188 ways and 22 section targets. Enable **Show archive features** and open **Browse features** to search the inventory. At desktop widths the browser uses the existing evidence rail. At 390 px it sits below the map and Browse features can reveal it without closing a selected record.

The frozen `curb-campus-point-catalog` v1 adapter supplies 333 unique records. The inventory retains 329 eligible source positions, 4 location-review records, 60 perimeter-context records and 38 unlinked records. This inventory stays campus-wide until users choose a particular scope. Exact section filtering uses source joins. Category toggles match any selected category and count source memberships separately from unique results. The four reviewed source notes are visible in details and those records have no map action or marker.

Close zoom shows at most 24 independent point hit areas, with selected priority and then ascending node ID. A selected eligible point can retain a passive symbol when its target would collide. The map reports eligible in-view results separately from drawn symbols. Pointer selection preserves scroll position and existing section and way badge targets. **Show on map** changes the viewport while keeping the section. Records outside its exact joins say **Not linked to this section in the source** and **Fit section** restores the original section fit. The UI keeps point history separate from the legacy line query, labels edit and retrieval dates as source dates, and displays **Current traversal: Unknown**.

## Verification

| Command | Exact executable result |
| --- | --- |
| `npm.cmd test -- src/features/curb/explore src/data/curb/princeton-campus-points src/data/curb/princeton-campus` | 111 tests passed in 8 files. |
| `npm.cmd run typecheck` | Passed. |
| `npm.cmd run build` | Passed. |
| `npm.cmd run start -- --port 3078` and `node verify-campus-points.cjs` | Installed Google Chrome 156.0.8078.74 passed all 9 grouped checks. Each case saw the exact executable revision at `/api/health`. |

Chrome used classic 15 px vertical scrollbars. Widths are measured with the feature browser open. The symbol counts below are the observed samples at close zoom.

| Window width | Document client / scroll width | Overview point symbols | C01 / C04 / C13 point symbols |
| --- | --- | --- | --- |
| 390 px | 375 / 375 px | 1 | 0 / 0 / 1 |
| 1366 px | 1351 / 1351 px | 22 | 3 / 2 / 4 |
| 1920 px | 1905 / 1905 px | 24 | 5 / 1 / 10 |

Chrome paged through all 333 IDs in exact ascending order at 1366 px. At each width it checked the 232-crossing and 44-kerb membership union at 275 unique results, exact node search, all scope filters, the C13 exact join count of 26, and the full 333 inventory while C13 was open. It checked four list-only review links, all five legacy links, a mixed way-plus-node link, refresh, browser Back and Reset. Keyboard checks covered roving Tab, arrows, Home, End, Enter, Space, detail focus and return, and explicit focus on the map from Show on map. Chrome inspected marker coordinates against the catalog, measured the 44 px hit areas, checked collision clearance around real section and way badges, selected points and legacy ways, exercised both backgrounds and checked reduced motion. No external runtime requests, console errors or page errors were recorded.

The checkout retained both LF-pinned catalog hashes. Source input SHA-256 is `eb7f4eece8ed2b95e842a4cc09c5fa25cfade8478ece6120fd83443aaa25ca84` and public projection SHA-256 is `af1b739933ab241d2fd9cec4cbe1178483450d3efb5afcc91e4a6499bb1f337c`.

Chrome receipts, screenshot evidence and command logs are local to this chat. The browser run used desktop Chrome with a 390 px viewport. Physical-phone and screen-reader behavior remain unverified. The existing ODbL link is present. Publishing the paired `points` object from the same catalog is the merge owner’s integration step before public release.
