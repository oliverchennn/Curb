# Curb sponsor options for discussion

> Preserved from the supplied plan's appendix. All additions remain deferred; no sponsor dependencies are authorized by this document. Packet claims have not been independently revalidated during setup.


**Decision status: no sponsor-specific tools or features approved.** These options are separate from the initial build and are not an implementation queue. The base plan targets Business and Enterprise. Discuss the options with Vincent before selecting any added feature or dependency.

The table covers all eight special tracks and both optional tracks identified in the supplied onsite packet, plus the automatic Overall category. A sponsor logo or workshop is not evidence of an additional prize. The live Devpost page and Photon's linked supplemental guidelines could not be read; confirm late changes and Photon-specific conditions with organizers/sponsor staff before entering. Do not import historical MLH categories into this year's list.

Effort below is a planning estimate of additional person-hours after the relevant core workflow works, not a delivery promise. Setup, data access and sponsor review can dominate these estimates.

| Category | Curb fit | What would be required | Extra effort | Recommendation |
|---|---|---|---|---|
| Amazon — Best Practical AI Innovation | Strong if the shipped product actually uses AI | Functional AI use case, basic documentation and pitch; no AWS-only requirement in the packet | 0.5–1 for submission/demo adaptation if core AI already works | Best low-friction candidate; initial fixture-only foundation is not enough |
| Peri — Forward Deployed Challenge | Strong with real discovery | Consult an eligible business or student organization during the event; include organization name, person's name/role and supporting evidence | 1–2 for discovery and evidence; implementation changes depend on findings | High value if a real partner can be reached |
| LangChain — Best use of deepagents | Strong potential, new product capability | Build an actual deepagent in Curb; development-time coding agents do not satisfy this | 3–5 | Best technical addition after routing/repair tools are working |
| CoStar — Inside and Out: AI for the Built World | Strong thematic fit, substantial scope change | Agentic use of at least two supplied layers: CoStar, Matterport, Vexcel; supplied geography is Houston/Los Angeles | 6–10+, strongly dependent on API/data access | Investigate early only if desired; do not silently pivot away from Princeton |
| Photon — Build a Messaging Agent using Photon 2.0 | Moderate | A real messaging-agent workflow through Photon; verify supplemental guidelines | 3–5 | Only if evidence collection by messages is useful to the actual customer |
| Arlequin Track 1 — AI-Driven Forensics | Poor | Analysis of illegal/criminal patterns in forensic data | Effectively a different product | Skip; accessibility evidence is not criminal forensics |
| Arlequin Track 2 — Social Media Analysis | Poor | Combine message content with social-network connectivity | Effectively a different product | Skip; sidewalk connectivity does not satisfy social-network analysis |
| Justin Bojarski — Best Physical AI Hack | Poor for the software-first scope | AI in a physical hardware build | 8–12+ | Skip unless the team deliberately chooses a sensor rig |
| Best Hardware Hack, optional | Low without a hardware build | Creative physical-computing integration | Shared hardware effort above | Do not assume a normal phone camera qualifies |
| Best Rookie Hack, optional | Not a fit for the known experienced team | First-hackathon eligibility | None | Do not plan around it; mixed-team eligibility would need organizer confirmation |
| Best Overall Hack | Automatic consideration | Main project judged across the rubric | None | No extra feature; packet says track winners cannot also win Overall |

## Amazon

The packet permits open-source AI, API services, custom models and agent frameworks. It specifies equal 25% weights for Creativity, Usefulness, Technical Implementation and User Experience. It does not require Bedrock or another Amazon service.

**How it would work:** demonstrate a real AI observation from a photo, the human correction/review step, and the resulting change to a deterministic repair plan. If the later product includes a tool-using planner, show its verified action trace as well. Fit the same coherent user story into the sponsor demo; adding an AWS service solely for branding has no demonstrated benefit under these published requirements.

**Decision requested:** include Amazon as a submission target once the core AI workflow works, without adding an Amazon-specific dependency? If the shipped product remains manual-only, reassess eligibility rather than labeling ordinary graph code as AI.

## Peri

Student organizations and clubs explicitly qualify in the packet. A facilities manager, local property manager or accessibility organization could reveal a useful workflow, but confirm eligibility if the partner is an institutional office rather than the examples listed.

**How it would work:** Dev B conducts a short consultation during the event, records the current repair-prioritization process, identifies one concrete breakdown, and brings that finding to the next orchestrator checkpoint. The next selected slice addresses it. Keep a permitted quote/photo/conversation excerpt, the person's name and role, and the organization's name for submission. Ask what they can actually use Monday: the answer may favor a simple export over another model feature.

This is not a request to manufacture evidence or retroactively label a generic accessibility conversation as customer validation. Share only what the participant permits. No outreach is sent by this plan.

**Decision requested:** pursue a real consultation and consider Peri if the resulting workflow still fits Curb? This can strengthen the main-track entry as well.

## LangChain deepagents

The official TypeScript Deep Agents documentation describes a harness for tool use, planning, context and delegation. Use the current version-matched API and pin it; planning capabilities can require explicit configuration. Do not install the entire managed hosting stack for this use case. [Official documentation](https://docs.langchain.com/oss/javascript/deepagents/overview).

**Proposed user action:** “With this budget, propose repairs; if critical evidence is missing, tell me exactly what to verify first.”

**How it would work:** a bounded server-side deepagent calls typed Curb tools such as `inspect_barrier`, `evaluate_repairs`, `compare_plans` and `draft_verification_request`. It checks evidence, evaluates candidate plans through B's deterministic engine, and creates an in-app draft brief or review task. Changing a reviewed observation or approving a plan stays with the human. It never invents coordinates, costs or successful repairs.

A small trace shows actual tool inputs/results and the final supported proposal. Set a step/time/token limit and disable unnecessary shell/network tools. Use the ordinary Curb buttons and engine when the agent fails; show the failure explicitly. This makes the integration substantive because the agent chooses what to inspect next and adapts to missing evidence.

**Ownership if approved:** A installs the SDK and owns `src/server/curb/agents/`; B exposes deterministic tool contracts; C adds a compact request/trace panel within `src/features/curb/`. Freeze those interfaces first. No shared writer on the domain engine.

**Gate:** approve only after route evaluation and the repair-budget comparison work. Give it a 60–90 minute integration spike; if a genuine bounded tool cycle is not demonstrated, remove it from the release scope.

**Decision requested:** add this product agent after the deterministic MVP, or keep the interface entirely button-driven?

## CoStar

The packet calls for at least two of CoStar property data, Matterport 3D scans and Vexcel aerial imagery. Its weights are 30% data use, 30% agentic depth, 25% usefulness and 15% demo/polish. The supplied buildings are in Houston and Los Angeles. Accessibility is expressly listed as a possible use case.

**How it could work:** add a separate property case in one supplied city. Use Matterport evidence to identify/verify the entrance and Vexcel context to ground exterior approach/crossing candidates, with a matched building ID and location. Optionally use CoStar building records to identify relevant destination/tenant context. An agent selects the missing viewpoint or evidence needed, calls the existing evaluator only on reviewed topology, and drafts a specific inspection/repair decision. Both chosen layers must change or support the actual decision; screenshots used as decoration do not meet the intent.

Aerial imagery generally cannot establish small curb heights, precise slope or all passage conditions. Scan coverage may stop at an entrance. Missing coverage becomes a verification task, not an invented connection. Supplied-market data must be a separately labeled case, not passed off as Princeton survey data.

**Ownership if approved:** A owns the adapter/API credentials in `src/server/curb/sponsors/costar/`; B owns the matched property scenario and evidence mapping in `src/data/curb/costar/`; C owns a separate case selector/evidence comparison. Register these future folders only after approval.

**Early feasibility check:** in 45–60 minutes, obtain credentials, retrieve two matching real layers for one property, inspect their coverage and usage terms, and identify a decision their combination supports. If that fails, stop. Do not build speculative adapters against undocumented payloads.

**Decision requested:** accept this additional geography/data case and its time cost, or keep all effort on the Princeton core? This could be compelling, but it is the most likely sponsor option to dilute the main demo.

## Photon

The packet names a Photon 2.0 messaging-agent challenge and links additional guidelines. Those linked requirements need sponsor confirmation before implementation. Photon publicly describes agent messaging across channels, but this plan does not assume a particular attachment, location-sharing or outbound capability is available to the team's account. [Photon](https://photon.codes/).

**How it could work:** a facilities tester messages a barrier report through one supported channel. The agent asks for missing location/evidence, then creates a **pending** observation in Curb. After review, the tester can request a link to the resulting plan. This is more coherent than unrelated voice narration or unsolicited repair alerts.

A validates inbound events using the provider's documented mechanism, deduplicates message IDs and maps the conversation to a permitted demo session. B normalizes the report into the same evidence schema; C adds source/review context. Begin with one channel and one consenting test account. Verify actual attachment/location support before promising photo-based intake. No automatic contact of campus staff or users.

The kit's integrations module contains some useful patterns but no ready-made Photon adapter. Provider setup and the messaging flow are real additional work.

**Decision requested:** add messaging-based intake because the customer needs it, or leave it out to protect the main demo?

## Hardware and the other categories

A calibrated instrumented wheel/phone mount plus sensors could make surface measurements more defensible, and might support both the optional Hardware category and the Physical AI category. It requires actual calibration, a real physical build, reliable readings, and a meaningful AI role for the latter. It is not a weekend shortcut to legal-grade measurement. Without hardware already available and a teammate committed to it, this is an unfavorable trade.

Neither Arlequin track is satisfied by renaming sidewalk evidence “forensics” or calling the street graph a social network. Rookie is not a sensible target given the team's prior hackathons. Overall is automatic and requires no additional integration.

## Proposed decision to discuss

Prefer **Amazon + Peri**, if a genuine consultation is obtainable, with **LangChain as the one possible technical addition** after the core engine works. Do not activate CoStar, Photon or hardware without a deliberate discussion of their new workflow, setup and time cost. No option in this document is approved by default.

Source: [F26 onsite packet, pp. 10–18](https://chatgpt.com/library?file_id=libfile_fde3_f-e5929189ecd881918ee9955a30c3e34f_7ee33cccf6a0819182595a71e4d587c0&account_id=personal). Sponsor details are packet-based; confirm late changes onsite.
