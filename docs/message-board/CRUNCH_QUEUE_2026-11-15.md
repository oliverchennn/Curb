# Curb crunch execution queue — 2026-11-15

This is a durable coordination snapshot. Read the latest comments on [board #1](https://github.com/oliverchennn/Curb/issues/1) before claiming files. New user steering appends or explicitly revises this queue; it does not silently cancel earlier work.

## Authority and release

Vincent's current root chat `01a1de7d-ca0f-7ed2-989d-4aae0850f1ae` owns orchestration, GitHub merges and remote branch cleanup. The former publisher explicitly released main publication and cleanup in [6892535381](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892535381). Oliver's existing chat `01a1dc6e-1818-7dd2-ae95-8ac3fcfca3b5` retains integration candidate preparation, checks, Vercel operations and exact deployed-source receipts. ALL CAD engineering/review stays on Oliver's host.

Vincent-host implementation uses Sol/xhigh. Oliver-host follows its direct human-approved Astra/xhigh override. One writer per literal scope; no transfers until explicit STOP/release; no new coordinators, live checkers or recurring automations.

## Cumulative queue

| Task | Owner / source | State and next gate |
| --- | --- | --- |
| INVESTMENT P0 | API `2f61604771ada3f39dd678adea2955c310e0249b`; UI `7486939bdac5dc23682ce57bff302337f8d921e0`; integration PR24 `d70876d7b531fd323579a3291729489cac07cc92` | Merged `f15d154e509af2b498b3c362e7db4ce01dac6e2c`, tree `1c4e9df247d1f01b975b9b3b78a2b7c23f9a1d8f`. 913 tests/build, 14 replay, required CI passed. Production auto-deploy blocked by author access; Oliver handles owner CLI sign-in/fallback. Public acceptance pending. |
| PR17/18 corrections | Oliver existing lead `01a1de81-e82b-7af3-b018-7e0ba108b0c0`; released final `5ee01fbf2ed9834d07cd91157321402f2f0be757` | Independent source review passed, 951 tests/build and browser round trips reported. Candidate integration/CI/merge pending. Do not merge obsolete original head without corrections. |
| CAD PR22 | Oliver released correction `90ed3349784a11f73f500f9b68eaead6a66995a8` | Five-file correction, 891 tests/build and 15 browser cases reported. Oliver review/integration then root merge. |
| METRICS-BENCH/1 | Oliver available implementation lead; exact spec base `a4d362908aad5178f838c143a7297e0a47a90d1f` | Dispatch requested. Freeze schema/generator/rules/30 complete inputs and hash BEFORE comparative run. Six families × five fixed seeds × four budgets × four methods. |
| METRICS-AUDIT/1 | Vincent independent verifier | Reserved; starts after published schema freeze. Independent BFS/exhaustive oracle, all 120 cases/480 rows, tamper failures, independent checkout rerun. |
| METRICS-STUDY/1 | Vincent local implementation subagent `investment_api`; `codex/metrics-study` base `a4d3629` | ACK/running, nine exact files. Neutral task and protocol, balanced assignment, validated anonymous input/analysis. Actual participant observations pending human facilitation. |
| SURVEY-PRESENTER-UI/1 | Same Oliver PR18 lead after release; spec `4843e9e9e986bb0d63539d324f0c41e0071e68d5` | Queued. Integration owner supplies current-main+released-PR18 base. Compact `?present=1`, genuine Accept, unchanged guard/export semantics, immutable-original reset. |
| SURVEY-PRESENTER-FRAMES/1 | Existing Vincent photo reviewer `01a1ddd3-c247-7bd1-b4af-51837eafc5a0` | Directly dispatched, new isolated branch from `4843e9e`. Freeze metadata seam, inspect all five source anchors, reproduce truthful frame/crop assets and hashes. |
| Three-minute judges script | Existing `01a1de88-03eb-7d10-b415-e507bb1c7d60` | Draft update dispatched: 20s problem, 40s actual review, central Investment, one omission, 20k tie, 11s recovery. Accepted metrics replace narration, never invent speedup. Root reserves final script/result. |
| DEVPOST-VIDEO-REFRESH/1 | Existing editor `01a1de44-7004-7f20-bf03-2a074b5d0871`, `codex/devpost-video-refresh` | ACK/running, exclusive `demo/devpost-video/`. Editable sub-two-minute refresh, update actual accepted presenter segment and proof segment when available. Root merges. |
| Live acceptance/rehearsal | Existing checker `01a1de18-2671-7590-b81f-e13bb62d64d9` | Investment first after READY/health receipt. Later verify final combined presenter flow and two clean Pending→Accepted rehearsals; record real timing and backup. |
| Main/branch queue | Vincent root | Merge exact reviewed heads after required checks; independently verify remote main. Archive stopped merged branches before deletion. |

## Reserved acceptance outputs

Root: `docs/demo/INVESTMENT_DEMO_SCRIPT.md`, `INVESTMENT_DEMO_RESULT.md`, `SURVEY_PRESENTER_RESULT.md`; `docs/evaluation/METRICS_RESULTS.md`, `METRICS_CLAIMS.md`.

Metrics run directory: `docs/evidence/metrics/2026-11-15-suite-v1/` with `manifest.json`, `inputs.json`, `engine-responses.json`, `results.json`, `results.csv`, `audit.json`, `summary.json`, `report.html`, `claims.json`, `run.log`, `verification.md`. No empirical participant observations are invented or included by default. Keep `demo_verified`, `benchmark_verified`, `study_ready`, `study_observed`, `claims_verified` separate.

The presenter owns only `docs/demo/INVESTMENT_DEMO_SCRIPT_DRAFT.md` while root owns final paths. Frame owner and UI owner use the literal disjoint scopes in the published plan. Detailed assignments: [metrics](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892571194), [presenter](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892580253), [review/queue](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892602698).

## Completed cleanup

At 2026-11-15T09:47:37Z, confirmed merged/stopped branch tips were atomically preserved under `archive/2026-11-15/<branch>` and remote branches deleted: `codex/campus-photo-map` → `43c52d0b0a31d787ee7f611a657defba37f4c5e8`; `codex/campus-photo-map-release` → `db72da7915d523cb75d7a36da5ec255866d9759d`; `codex/vercel-release-closeout` → `82b07362654fa2a39d4c18b1ca727d08e2257bb7`; `codex/devpost-video-kit` → `2acecdd0701bfd409a8fe8e229afe801206ab4ab`. Each remote archive tag was reread and matched; deleted branches were absent. Unaccepted/active source branches were preserved.
