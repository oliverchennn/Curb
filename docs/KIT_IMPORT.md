# Kit import and Curb adaptations

Source: [oliverchennn/hackathon-kit](https://github.com/oliverchennn/hackathon-kit/tree/22a5f44a27375e88ac2cd1754f6976704f725bc5), revision `22a5f44a27375e88ac2cd1754f6976704f725bc5`. The inspected remote main matched the supplied plan's pin. [Manifest](KIT_IMPORT_MANIFEST.json) records each upstream Git blob SHA for reproducibility.

## Imported reference snapshots

The following files are preserved under `docs/vendor/hackathon-kit/`, with upstream content unchanged. This is a partial documentation snapshot; relative links to files not imported must be followed in the pinned upstream tree. These are not active Curb task instructions.

- [AGENTS.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/AGENTS.md)
- [docs/guides/ORCHESTRATION.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/guides/ORCHESTRATION.md)
- [LICENSE](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/LICENSE)
- [THIRD_PARTY_NOTICES.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/THIRD_PARTY_NOTICES.md)
- [docs/templates/COLLABORATION.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/templates/COLLABORATION.md)
- [docs/templates/OWNERSHIP.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/templates/OWNERSHIP.md)
- [docs/templates/TASK_BOARD.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/templates/TASK_BOARD.md)
- [docs/templates/TASK_CARD.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/templates/TASK_CARD.md)
- [docs/templates/HUMAN_AI_TEAM_WORKFLOW.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/templates/HUMAN_AI_TEAM_WORKFLOW.md)
- [docs/templates/HANDOFF.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/templates/HANDOFF.md)
- [docs/templates/DECISION_LOG.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/templates/DECISION_LOG.md)
- [docs/templates/GIT_WORKFLOW.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/templates/GIT_WORKFLOW.md)
- [docs/templates/API_CONTRACT.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/templates/API_CONTRACT.md)
- [docs/start-here/AGENT_START.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/start-here/AGENT_START.md)
- [docs/start-here/CREATE.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/start-here/CREATE.md)
- [docs/start-here/ADOPT.md](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/docs/start-here/ADOPT.md)
- [.codex/agents/orchestrator.toml](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/.codex/agents/orchestrator.toml)

Preserve [MIT license](vendor/hackathon-kit/LICENSE) and [third-party notices](vendor/hackathon-kit/THIRD_PARTY_NOTICES.md) when reusing kit material. No application modules, provider dependencies, custom agent configuration or managed runner have been installed by this preparation. The copied role TOML is only a reference under docs; it is not registered in Curb's `.codex/`.

## Adaptation decisions

| Upstream convention | Curb implementation |
|---|---|
| Three humans, distinct lead and coding workers | Vincent/vzhu08 coordinates and owns A; Oliver B/domain; Landau C/UI; four lead chats |
| One authoritative task board, exclusive writers | One GitHub issue at kickoff; local TASK_BOARD is a checkpoint snapshot |
| Contract-first parallel work | Serial F0 freezes v0 and real common SHA before F1A/B/C |
| Independent coding subagents where useful | Up to two coding children per lane, one level deep; F0 serial; explicit child scopes |
| Custom worker runner | Deferred: [worker source](https://github.com/oliverchennn/hackathon-kit/blob/22a5f44a27375e88ac2cd1754f6976704f725bc5/tools/agents/worker.ts) sets both multi-agent flags false (lines 76/78), says children disabled (95), and falls back to cap zero (229) |
| Historical feature-branch installation guide | Use verified pinned main revision; do not assume prose about a feature branch is current |
| Upstream 24-hour / three-minute playbook | Supplied Curb 36-hour event envelope / two-minute demo; fixed dates in team config |
| Root toolkit maintenance rules and catalog checks | Root AGENTS is adapted for the generated Curb app; do not run toolkit-maintenance checks in Curb |
| Generator copies docs and instructions | Stage in an empty directory; preserve this nonempty repo's docs/prompts; selectively adopt application files |
| Managed runtime slash commands, leases and forced model | Not active in manual mode; use native account/session capabilities and explicit board records |

## Supplied-plan handling

The original file is preserved byte-for-byte at [source/Curb_Implementation_Plan.original.md](source/Curb_Implementation_Plan.original.md). SHA-256: `9df65477b4ca499c720173430c8efd2df72aa1e5598d3e724ae97a86957a51b9`.

The adapted [implementation plan](IMPLEMENTATION_PLAN.md) keeps the product roadmap and technical reasoning, updates the actual roster and board authority, corrects nonempty-repo bootstrap, and separates the [sponsor appendix](SPONSOR_OPTIONS.md). Concrete task cards and startup prompts operationalize the foundation only. No instructions embedded in the source file were treated as permission to run the full build.

Event packet, sponsor eligibility, source-library links and legal context remain supplied background, not independently reverified findings from this setup. No source claim establishes a completed product, valid account access or passing checks.

## Verification boundary

Preparation checks verify source integrity, internal document links, team config, task dependencies/scopes and Git whitespace. Application checks await F0. Live GitHub board startup, cross-machine/native-child behavior and deployment are not verified by documentation.
