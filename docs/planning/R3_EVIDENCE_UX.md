# R3 evidence UX proposal

Proposal for `R3-EVIDENCE-UX-PREP/1` (Landau, Dev C), at base `c952d7de0328bb31ba5f677b9800684b2c6366b8`. It describes how a later read-only evidence snapshot should read in the UI. It changes no code, contract or current R2 screen. [Assignment](../tasks/READINESS_QUEUE.md#r3-evidence-ux-prep--1--landau-after-r2-c-release) · [A's boundary packet `f9aeda43`](https://github.com/vzhu08/Curb/blob/f9aeda43a3ee8fa899939e4ba7ed6b8b3c89b345/docs/planning/R3_BOUNDARY_READINESS.md) · [B's Princeton field packet](https://github.com/vzhu08/Curb/blob/2d56e6a0a2ca4e70fd2977009d572e983182fb4c/docs/research/PRINCETON_CORRIDOR.md).

The record names below (`ArchiveSource`, `ArchiveEvidence`, `FieldEvidence`, `EvidenceAttachment`, `CoverageRecord`, and the `null | { date } | { timestamp }` date value) are A's proposed names. They are not frozen. If the boundary changes, this document follows it. Every Princeton case below is an **illustrative UI case built on B's archive IDs, not an observation**. No field visit has happened.

## What the current panel already does well, and what it cannot say

| Today (`EvidencePanel`, v1 `BarrierDetail`) | Keep for R3 | Cannot express for R3 |
| --- | --- | --- |
| One card per barrier: kind, ID, review pill, note, linked evidence list, closing disclaimer. | Card layout, `dl` metadata rows, pill styles, long-text wrapping, the disclaimer. | Evidence attached to an edge or location with no barrier, or to nothing yet (unresolved). |
| Origin label: “Synthetic example” or “Field observation” (text plus colour). | Origin always in words, never colour alone. | A third kind, aerial or archive. Mapping it to `field` would relabel aerial data as field truth. |
| `observedAt` shown as “Recorded” in fixed-locale UTC; the row is omitted when absent. | Deterministic formatting, so server and client render the same text. | Separate capture, source-as-of, retrieved, observed and reviewed dates; explicit “unknown” versus not applicable; date-only precision. |
| Review status belongs to the barrier. | Review shown as its own labelled row, apart from condition. | Review of *this evidence's attachment* (pending, accepted or rejected, with date and reason). |
| No traversal statement, which is correct: R1 and R2 assessments are separate authored inputs. | Never imply passability from evidence. | Inspection coverage and an explicit “current traversal: unknown” line. |
| Image with alt text, or “Image not available.” | Caption kept when media is missing. | *Why* a photo is missing: not cleared for publication versus a missing local file. |

Two small defects in the current panel, recorded here and not fixed in this task. (1) Its empty state says “Select a barrier from the list,” but `/curb/trips` and `/curb/plans` use a `<select>` or repair buttons. (2) “Recorded” is ambiguous once there are capture and retrieval dates. A later scoped task could add an optional `emptyMessage` prop and rename the row “Observed.” Both are compatible with existing callers.

## Reading rules

1. **Three provenance kinds, always in words.** Show “Field observation,” “Aerial / archive record” or “Synthetic example” as a labelled pill on every record, with distinct text, colour and an icon-free shape, so the kinds survive greyscale and screen readers. An archive pill also names its source, e.g. “Aerial / archive record · DVRPC Princeton extract.” A synthetic record never appears inside an R3 snapshot. The pill exists so mixed screens can never blur the kinds.
2. **Every date says what it is.** Use only these labels: *Observed* (field), *Photo captured*, *Source capture* (feature-specific imagery), *Source record date*, *Source as of* (extract date), *Retrieved* and *Reviewed*.
   - **Unknown:** a date that applies but is `null` reads “Unknown,” e.g. “Source capture: Unknown.”
   - **Not applicable:** the row is omitted, e.g. no *Observed* row on an archive record.
   - **Date only:** `{ date }` renders as a date, “14 Nov 2026,” and never gets a time.
   - **Timestamp:** renders in fixed-locale UTC with “UTC” spelled out, as today.
   - **No substitutes:** a source-as-of date never stands in for a capture or observation date.
3. **Review is about the attachment, not the place.** “Attachment review: Pending,” or “Accepted 14 Nov 2026 — reason …”. Accepted means *this record supports this caption at this target*. It never means *passable*. Barrier review, where a barrier exists, stays a separate row.
4. **Traversal is its own line and is unknown in v1.** Every selected edge, crossing end or entrance shows “Current traversal: Unknown — not assessed in this snapshot,” even when coverage is “Inspected.” Coverage reads “Uninspected,” “Partially inspected (threshold, clear width)” or “Inspected (listed conditions only).” No green check, “OK,” “clear” or “accessible” wording appears anywhere.
5. **Conflicts stay visible.** When records on one target disagree, show a neutral notice, “Records disagree. Neither is treated as current,” and list every record newest first by its own applicable date. Undated records go last and are marked “date unknown.” The UI never picks a winner or hides an older record.
6. **Unresolved is a first-class state.** An attachment with target `null` appears under “Not yet placed,” with no map highlight and no implied segment.
7. **Honest absence.** The UI distinguishes three statements: “No evidence recorded for this segment,” “No field observation yet” (archive only), and “Evidence could not be loaded.” It never falls back to sample or synthetic data.

## Proposed flow

```
/curb/evidence — Princeton corridor (read-only snapshot princeton-corridor-v1 · rev N)
[ Snapshot banner: Archive and field records · not a compliance or navigation assessment ]

┌ Corridor targets (list, keyboard) ──────┐ ┌ Selected target ─────────────────────────┐
│ PRN-03 Spring crossing north landing    │ │ PRN-07 Primary Nassau crossing, north    │
│   Archive only · traversal unknown      │ │ Coverage: Uninspected                    │
│ PRN-07 Nassau crossing north landing  ◀ │ │ Current traversal: Unknown — not         │
│   1 archive · 1 field (pending) · unknown│ │   assessed in this snapshot              │
│ PRN-12 Nassau Hall west accessible door │ │ ─ Records (2) ───────────────────────────│
│   Not yet placed · traversal unknown    │ │ [Field observation] …  Review: Pending   │
│ …                                       │ │ [Aerial / archive record] … Review: Acc. │
│ Not yet placed (1)                      │ │ ─ Other end of this crossing: PRN-08 ──▶ │
└─────────────────────────────────────────┘ └──────────────────────────────────────────┘
[ Schematic: selected target highlighted; unresolved targets are listed, not drawn ]
```

- **Target list.** One button per stop, segment or crossing end, using B's stable `PRN-xx` IDs and names. Each row has a one-line summary of record counts by provenance and the traversal state, so the state is readable without opening the item. It uses the same `aria-pressed` and arrow-key pattern as the `/curb` barrier list.
- **Selected-target panel.** Read top to bottom: target and its coverage, the traversal line, then the records, then related targets. For a crossing end, related targets are the other end of the same crossing. Each record is a card (anatomy below).
- **Schematic.** Optional. Reuse `CurbMap` only if A extracts a geometry-only input. Unverified gaps stay drawn as disconnected, with no line inferred between unlinked ends.

## Record card anatomy

| Row | Field observation | Aerial / archive record |
| --- | --- | --- |
| Provenance pill | Field observation | Aerial / archive record · *source name* |
| Caption, note | Literal text | Literal text plus source status, e.g. “DVRPC status: EXISTING (archived label, not a project observation)” |
| Identity | Field record ID | Source, layer and original feature ID, e.g. “ramp 461092,” plus snapshot key |
| Dates | Observed; Photo captured (if a photo exists) | Source capture; Source record date (if supplied); Source as of; Retrieved |
| Measurements | Value, unit and method, only when actually measured | None; “not in source” where the audit says so (e.g. width, cross-slope) |
| Media | Photo with alt text equal to the caption, or a media-status line | Usually none; a link to the source opens only on deliberate activation, in a new tab, labelled “Opens source site” |
| Attachment review | Status, date, reason | Status, date, reason |
| Attribution | Observer or organisation, if published | Required attribution and licence or terms reference |

## Required cases (illustrative, not observations)

| Case | Data shape | What the UI says | Must never say or show |
| --- | --- | --- | --- |
| **Aerial ramp, no capture date.** Nassau east leg north end, ramp 461092. | `ArchiveEvidence` → DVRPC extract; status `EXISTING`; capture date `null`; source as of from the manifest; retrieved date; attachment accepted to edge. | “Aerial / archive record · DVRPC.” “DVRPC status: EXISTING (archived label).” “Source capture: Unknown.” “Source as of: …” “Attachment review: Accepted — supports location of an archived ramp.” “Current traversal: Unknown.” | “Ramp present,” “Verified,” a field pill, an *Observed* date, or a pass state from the accepted review. |
| **Field photo, date mismatch.** Same landing, later field visit. | `FieldEvidence` with an observed timestamp and a photo with a different `capturedAt`; attachment pending. | Both dates on separate rows: “Observed: 15 Nov 2026, 14:10 UTC.” “Photo captured: 15 Nov 2026, 13:58 UTC.” “Attachment review: Pending.” | One merged “Date,” or the photo time used as the observation time. |
| **Missing date.** A retained field note whose original has no time. | `FieldEvidence` with observed `null`, or `{ date }` only. | “Observed: Unknown,” or “Observed: 15 Nov 2026” (date only, no time). The list sorts it last and marks it “date unknown.” | An invented midnight or UTC time, or the source-as-of date shown instead. |
| **Missing media.** Two different causes. | (a) Photo listed, local asset fails the integrity check or fails to load. (b) Photo not cleared for publication. | (a) Caption kept, plus “Photo unavailable — the local file could not be loaded.” (b) “Photo withheld pending publication review,” and the note shown alone. | A broken image icon, a placeholder or stock photo, or a remote URL. |
| **Conflicting records.** Archive `EXISTING` versus a field note “no ramp found at this corner”. | Two attachments on one target with different conclusions. | Notice: “Records disagree. Neither is treated as current.” Both cards, newest first, each with its own dates and review. | A winner, a strikethrough on the older record, or a “resolved” badge without a review reason. |
| **Unverified crossing.** Primary Nassau crossing, line 834108, ends 461092 and 554811. | North end has archive plus pending field records; south end archive only; no transition links. | The crossing summary reads “2 ends · 1 with a field record · opposite end not inspected · traversal unknown,” with each end its own target. The archive line endpoint match is described as “source association only.” | A drawn complete crossing from the endpoint match, signal or direction claims, or any statement that the crossing is usable. |
| **Unverified entrance.** Nassau Hall west-side elevator-lobby entrance, PRN-12. | Web guidance recorded as a source with a retrieved date; location attachment `null`. | Under “Not yet placed”: “Source guidance (retrieved 14 Nov 2026), not an observation. Location unknown.” Kept separate from the nearby stepped west entrance. | A map pin, a coordinate, “open,” “accessible” or “card reader works.” |
| **Alternate, unsurveyed.** Nassau west leg, ramps 501839 and 577885, status `ASSUMED`. | Archive only; coverage uninspected. | “DVRPC status: ASSUMED (archived label).” “Coverage: Uninspected.” “No field observation yet.” | A ranking against the primary route or a suggested detour. |

## Accessibility and narrow-layout acceptance

- **Keyboard.** All targets and records are reachable with Tab. The target list supports Up and Down. Selecting a target moves focus to the panel heading (as R2-C's `/curb/plans` does for evidence, on unmerged `codex/r2-ui` `2ff4478`) and announces “PRN-07 selected, 2 records, traversal unknown” through a polite live region. Source links are explicit buttons or links and never hijack Enter on a card.
- **Meaning without colour.** Every pill and state has text. Contrast is at least 4.5:1 for text and 3:1 for pill borders. The conflict notice is text, not an icon.
- **Structure.** Each record is an `article` with a heading made of the caption plus its provenance. Dates use `<time dateTime>` with the original value; unknown dates are plain text. Rows use `dl`.
- **Images.** Alt text is the caption. The unavailable and withheld states are text in the same position. Images are lazy-loaded with a fixed aspect ratio so the layout does not shift.
- **390px.** No horizontal page scroll. List and panel stack, with the list first. The selected panel shows a “Back to targets” link. Long IDs, hashes and attributions wrap. Date rows stack label over value under 420px. Check with the same `scrollWidth === clientWidth` probe used for R2-C.
- **Reduced motion.** No animated transitions are needed. Respect `prefers-reduced-motion` if any are added.
- **No provider calls.** The browsing flow loads only the local snapshot and local assets. Verify in network logs.

## Reuse and minimal future paths

Reuse, unchanged:
- `EvidencePanel.module.css` tokens and pill styles, through a shared import or copied tokens.
- The `Intl.DateTimeFormat` UTC formatter pattern.
- The AbortController, generation-guard and deadline request pattern from `TripPlanner` (and R2-C's `PlanPlanner` once integrated).
- The `aria-pressed` list keyboard pattern from `CurbScreen`.
- The loading, empty and error copy conventions.

Existing `EvidencePanel` callers (`/curb`, `/curb/trips`, and `/curb/plans` after R2-C integration) keep `BarrierDetail` and are not migrated.

Proposed C-owned UI paths for a later assignment. They match A's candidate list, and each needs its own exact assignment:

| Path | Purpose |
| --- | --- |
| `app/curb/evidence/page.tsx` | Route shell and metadata only. |
| `src/features/curb/evidence/EvidenceSnapshotScreen.tsx` | Load state, target list, selection and focus. |
| `src/features/curb/evidence/SnapshotEvidencePanel.tsx` | Target summary, traversal line and record cards. |
| `src/features/curb/evidence/snapshotPresentation.ts` and `.test.ts` | Pure label, date and sort helpers: date-value formatting, provenance labels, conflict detection by target, unknown-last ordering. These are unit-testable against an authored fixture, like R2-C's `plans/presentation.ts`. |
| `src/features/curb/evidence/SnapshotEvidence.module.css` | Scoped styles. |
| `app/curb/page.tsx` (link only) | Navigation. |

These paths depend on A's contract, domain, server and client work and on B's fixture. The UI starts only after that contract is frozen. Optional later C fix, separately assigned: an `EvidencePanel` `emptyMessage` prop and the “Recorded” → “Observed” label.

## Out of scope and open questions

Out of scope: UI or component edits now, changes to the R2 slice, imagery or tile providers, live source fetches at runtime, field collection, and traversal decisions.

Open questions for the coordinator and Vincent:
1. **Time zone.** Should field timestamps also show local Princeton time next to UTC? The proposal keeps UTC only, for deterministic rendering.
2. **Archive-only release.** If no field records exist yet, should v1 ship archive-only with “No field observation yet” on every target? A recommends deciding this explicitly.
3. **Reviewer identity.** Should reviewer names be shown or reduced to a role?
4. **Withheld photos.** Should withheld-photo placeholders appear at all, or only in a reviewer mode?
