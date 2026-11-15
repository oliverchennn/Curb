# Repair priorities domain result

Task: `CURB-DAMAGE-PRIORITIES/1`, Developer D domain lane. Base: `eab54a449ea7dd1111aa0e125529d638150a268e` (tree `455fd0fd598f337231706fe8dc3e504e09cd964a`). Branch: `codex/repair-priority-order`. Validation date: 2026-11-15 UTC. [Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6889833662); [interface ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6889848666).

## Interface and behavior

`src/domain/curb/repairPriorities.ts` exports `buildRepairPriorities(input: Survey): RepairPriorities` and the types `RepairPriorityItem`, `RankedRepairPriorityItem`, and `RepairPriorities`. `Survey` and `Priority` remain the existing types from `src/contracts/curb/survey.ts`. Every call validates through the existing `validateSurvey`; invalid input throws its `ZodError`.

The result contains `ranked`, `needsAssessment`, `monitoring`, `excludedFindingIds`, and `ungroupedFindingIds`. Each area item has exactly `workAreaId`, active `findingIds`, recorded `priority`, `nearTerm`, and `reason`; ranked items also have a contiguous, one-based `rank`.

- Active evidence means pending or accepted. Rejected findings appear only in the sorted exclusion list. Areas with no active evidence are absent from all three area lists.
- Repair-worthy areas with assessed priority rank high, medium, low; within a tier, near-term first; remaining ties use ascending ASCII work-area IDs. No costs, treatment choices, durability, route benefits, accepted-versus-pending status, randomness, or input order affect this ordering.
- Repair-worthy areas with unassessed priority enter `needsAssessment`, never the low tier. Areas marked not repair-worthy enter `monitoring`, even when their priority is unassessed. Both lists sort near-term first, then ASCII ID, without a rank.
- Every returned finding-ID list sorts lexically. Active findings without any work-area membership appear separately in `ungroupedFindingIds`.
- Reasons describe the actual ordering keys, including the stable ID tie-break. Pending evidence remains provisional; acceptance does not verify priority or passability. Recorded work-area priority is not a measured severity inferred from labels or photographs.

The actual Robertson survey produces:

| Rank | Area | Recorded priority | Near-term |
| --- | --- | --- | --- |
| 1 | panel-01 | high | yes |
| 2 | panel-02 | high | yes |
| 3 | panel-04 | high | yes |
| 4 | panel-03 | medium | no |
| 5 | panel-05 | medium | no |

Its other four result lists are empty. The function returns detached data and does not mutate its input.

## Verification

Node `v24.22.1`, matching-lockfile installed dependencies, isolated checkout `/workspace/curb-repair-priority-order`.

| Command | Actual result |
| --- | --- |
| `npm test -- src/domain/curb/repairPriorities.test.ts src/domain/curb/survey.test.ts` | PASS: 57 tests in 2 files (30 new priority tests; 27 existing survey/evaluator tests) |
| `npm run typecheck` | PASS |
| `git diff --cached --check` | PASS before publication |

The new tests cover all 120 permutations of the five work areas with frozen inputs; high/medium/low precedence independent of price, near-term and review status; near-term ordering within tiers; ASCII rather than natural-number ordering; sorted mixed groups; all-rejected groups across all buckets; unassessed and monitoring behavior; active ungrouped findings; detached outputs; and malformed contracts, fields, references, grouping and costs. Existing survey/evaluator tests passed unchanged. Local command receipts are retained in ignored `.curb-local/repair-priorities/validation-receipt.json`.

Only the new domain module, its test, and this report are included. No survey, contract, evaluator, synthetic engine, UI, endpoint, configuration or media file was changed. This is a domain-only result: production build, combined UI/browser acceptance and integration remain with root and the merge owner. It makes no new field-measurement, cost-completeness, accessibility or route-passability claim. The board RESULT records the verified published SHA and STOP/RELEASE.
