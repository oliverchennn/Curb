# Repair priorities UI result

Task: `CURB-DAMAGE-PRIORITIES/1`, root UI lane. Original base `eab54a449ea7dd1111aa0e125529d638150a268e`; actual dependency checkpoint `395d254a61d5da1d44992f2209087f9fdaf7ed64` from Developer D. Validation date: 2026-11-15 UTC. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6889833662).

## Result

`/curb/plans` now displays the actual published Robertson Hall survey as **Repair priorities**, replacing the exposed synthetic budget/network lesson. The main navigation and the older campus-review link use the new name. Existing synthetic routing APIs, engines, data and tests are retained without changes.

The left-hand queue consumes D's validated `buildRepairPriorities` result. The right-hand panel connects the selected work area to its photo, evidence time, qualified accessibility impact, next inspection step, proposed treatment and measurement checklist. A native disclosure explains the ordering: high/medium/low, then near-term within a tier, then stable work-area IDs. Unknown priorities, monitoring areas, active ungrouped findings and rejected findings have explicit handling. Costs do not affect this order.

The source is identified as AI-assisted video findings. The published five-finding inventory is still provisional and unmeasured. Treatment links open the existing survey comparison in the selected finding's context; evidence links open the existing replay at that finding's exact evidence timestamp. The page does not make new dimensions, price totals, route or compliance claims.

The page reads the published survey from the existing loading endpoint. It does not persist or import review edits from another page; the footer states that session edits remain in the survey workspace. No new storage or endpoint was added.

## Verification

Environment: Node v22.23.2, isolated worktree `/Users/oliverchen/Documents/random shi/curb-repair-priority-ui`, existing matching dependencies, actual D module (no stand-in).

- `npm run check`: PASS, TypeScript, **859 tests in 35 files**, production build.
- `npm run test:replay`: PASS, **14 tests**, including the preserved synthetic routing outcomes. The first sandboxed attempt could not bind its local test ports; the authorized retry with local-port access passed.
- `git diff --check`: PASS.
- Independent source review identified and root corrected contrast, explicit AI provenance, Retry focus restoration, active-finding treatment links, and empty-queue copy. Recheck passed; queue text contrast is at least 5.47:1 across the checked states.
- Chrome against the actual production build at local port3106: 1366×768, 1920×1080, 390×844. No horizontal overflow with classic scrollbars (1351/1351, 1905/1905, 375/375 document/client widths).
- All five selections showed their matching detail, photo, rank and evidence link; mobile selection focused and revealed the detail heading. All image assets loaded.
- Keyboard Enter opened/closed the ordering disclosure and selected a queue item. Native buttons, visible focus and text priority labels remain usable without color. No animation is required.
- Reset restored the initial selection. Defect04 evidence link loaded the actual video at6.0seconds; Defect02 scope link selected Compare repairs with the video at9.5seconds. Unknown treatment cost remained quote-required.
- Chrome console: no errors/warnings in this normal-flow pass.

Local visual receipts (outside Git): `/private/tmp/curb-repair-priorities-ui/before-1366.png`, `after-1920.png`, `mobile-detail.png`. Command logs: `check.log`, `replay.log` in the same directory.

An independent adversarial browser pass for error/retry and alternate validated survey states was assigned separately. This report records root's completed checks, not that pending result or deployment. The merge owner's final receipt establishes the published UI SHA and integrated release.

## Scope

Only `app/curb/plans/page.tsx`, `app/curb/page.tsx`, `src/features/curb/navigation/AppNavigation.tsx`, new `src/features/curb/priorities/RepairPriorities.tsx`, new `RepairPriorities.module.css`, and this report belong to root's UI change. No Explorer, source survey, contract, routing, cost-evaluator, media, package or configuration edits. The local dependency symlink is not a deliverable.
