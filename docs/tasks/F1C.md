# F1C — foundation product screen

Owner: Landau / `agent-c`; GitHub login confirmed at kickoff. State: Blocked on F0 and account readiness. Base: the same verified F0 SHA as A/B. Contract: frozen `curb-v0`. Branch: `codex/f1c-screen`. Timebox: 60–90 minutes.

Allowed: `app/curb/`, `src/features/curb/screen/`, `src/features/curb/map/`, `src/features/curb/evidence/`, `public/curb/`. Forbidden: shared paths in [task rules](README.md), root global CSS/layout, API/server/domain/data code and imported kit internals. Use scoped styles and approved local assets.

| Child | Scope | Acceptance |
|---|---|---|
| C1 screen/map | `app/curb/`, `src/features/curb/screen/`, `src/features/curb/map/` | Fetch through A's adapter; synthetic map/network, counts, destinations and keyboard-selectable barrier list; loading/empty/error/reset; owns selected ID |
| C2 evidence | `src/features/curb/evidence/`, `public/curb/` | `EvidencePanel({detail})` handles null selection, note/evidence/review status and long text; no server reads or selection state |

Use the kit's credential-free `GeoMap` schematic through a Curb wrapper as needed; it does not promise marker-selection callbacks. Select from the list first. Do not add external tiles, routing controls, budget buttons, fake AI, exports or dormant features. A labeled fixture injected through the seam can unblock local UI work; final F2 must use the real API.

Checks: `types`, meaningful `ui` tests if supported by F0, and browser evidence from [acceptance](../ACCEPTANCE.md). Exercise keyboard selection, linked notes, long text, reset, empty and failed loads. Parent inspects combined C1/C2 imports and styles and posts one RESULT. Cut: simple schematic/list/panel, preserving useful states and access by keyboard. Do not spend the timebox on styling the kit's example routes.
