# Current Curb release checkpoint

The release branch is `codex/robertson-release-final`, reviewed through [PR #7](https://github.com/oliverchennn/Curb/pull/7). The prior Robertson release is already on main; this checkpoint adds the prepared upload, wider tabbed workspace, separate collection/explorer pages, independent stress corrections and hosting preparation. Root is the sole integrator. Vincent's account is the authorized hosting target.

## Integrated and checked

- **Exact cost arithmetic:** `36174d440a15bd4212fd55e0423fca6d2a2debd6` fixes decimal multiplication at cent boundaries without hiding genuine fractional cents. Seven regressions cover rounding and budget inclusion. D independently reran its exhaustive oracle: 10,428 plan comparisons and 176 report-handler requests across two seeds, with no remaining failures. The original stress report retains its historical failure, and [closure 6882978608](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6882978608) records the corrected result.
- **Prepared upload and video roles:** `8c82fc00a147b27e18ea2cccea788a484c301586` adds local identity checking and a labeled ten-second simulation. Original plays clean footage; Review uses editable overlays; Annotated previews the fixed export. Root exercised the supplied original MOV, a rejected unmatched clip, bundled flow, cancellation, keyboard entry and narrow layout.
- **Wider workspace:** C's released `d32074ad22449d55d2b8ca1ea87edd0ee5f84b84` is integrated as `a4afbfb`; `28b0b1b0b2ab5d9e8051468493155122db91fc39` combines it with the three modes and shared navigation. Review, Compare and Export panels remain mounted, retaining edits, budgets and in-flight reports. Root observed the selected six-second evidence frame, keyboard tabs, retained reviewer/budget, accept/restore focus, three policies in one row at1366px and four with a budget at1920px. The sticky evidence column measured about713px at1366×768.
- **Core integration check:** on the product state at `28b0b1b`, `npm run check` passed TypeScript, 683 tests in23 files and a production build. Root stopped development and production servers, built again after the changes, and captured the actual production upload, simulation, review, close-up, inspection, policies, budget and export states. These checks precede the new collection/explorer integration.
- **Report packaging:** explicit Next.js traces contain the canonical survey and five evidence JPEGs. Root copied only the compiled report route and its130 traced inputs outside the checkout; the real compiled handler returned HTML200 and PDF200 from that isolated package. The deployment smoke payload includes the required nullable budget field. This is local packaging evidence, not a hosted pass.
- **Historical branches:**42 completed branch tips were preserved under exact archive tags before branch removal. The receipt is [BRANCH_ARCHIVE_2026-11-14.json](BRANCH_ARCHIVE_2026-11-14.json). Active feature/review branches remain reserved.

The detailed B/C/D stress reports describe their pinned source and executed checks. They are not claims that later features passed those earlier runs. The actual field inventory still has five pending AI proposals, unknown measurements, no placed defect markers and unknown route impact. No field accessibility verdict or physical hardware validation is asserted.

## Remaining release gates

1. Vincent/B finishes and releases the collection concept; Oliver/D finishes and releases the route explorer. Root reviews exact commits and integrates serially.
2. C's independent upload/survey QA uses exact base `28b0b1b0b2ab5d9e8051468493155122db91fc39`, [assignment 6883284921](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6883284921). The pending new-page links are explicitly outside that core-only pass.
3. Run the combined full check, production browser interactions and bounded functional probes; verify mobile, keyboard, reduced-motion/fallback behavior and final navigation. Refresh the offline walkthrough with actual new-page captures.
4. Merge the verified release, hand Vincent the exact source, deploy through his account, and verify the actual public pages, report photos and media ranges. Record the real project, deployment and URL. Hosting has not yet occurred at this checkpoint.

Physical projector checks, a presenter stopwatch rehearsal, manual assistive-technology testing, measured site inspection and contractor quotes remain separate from the software checks.
