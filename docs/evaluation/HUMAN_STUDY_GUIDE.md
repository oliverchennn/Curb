# Facilitator guide for the Curb time and correctness study

Once the release owner accepts a specific Investment demo build, Vincent or a named human facilitator should pin its URL and full source SHA, freeze six or eight slots, and recruit that many eligible volunteers. Give each person only the [participant task](HUMAN_STUDY_TASK.md), [input CSV](HUMAN_STUDY_INPUT.csv), and [blank answer sheet](HUMAN_STUDY_ANSWER_TEMPLATE.md). Keep this guide, assignments, and the [scorer rubric](HUMAN_STUDY_RUBRIC.md) with the study staff. Nobody supplies a study answer during recruitment or orientation.

## Set up and freeze before recruitment

1. Select the accepted build at `/curb/investment-demo`. Confirm the exact source SHA using release evidence and the app health endpoint (or the verified local Git SHA). Confirm the app offers scenario `synthetic-campus-investment`, revision `1`, and $10,000 budget. Test it with a staff dry run and confirm the participant tool works at the study desk. Keep any dry-run answers and times out of study observations. Use the same workstation/browser and input format across arms where possible.
2. Create a private cohort folder outside the tracked repository. In it, create `acceptance.json` using this shape, filling values from the actual release receipt. Use UTC at whole-second resolution (YYYY-MM-DDTHH:mm:ssZ). Use `validated-local` with a loopback URL for an independently accepted local build. Prefer an immutable deployment URL for a hosted build. Retain receipt and use a stable HTTPS verification link to the accepted source.

   ```json
   {
     "status": "accepted",
     "app_source_sha": "<full accepted Git SHA>",
     "app_url": "<accepted URL ending in /curb/investment-demo>",
     "environment": "hosted",
     "verified_at_utc": "<actual UTC>",
     "verification_ref": "<HTTPS release or build verification receipt>"
   }
   ```

3. From the repository root, run the freeze command below with the cohort size you have chosen. Keep `freeze.json` and its SHA-256 unchanged. Give a reviewer the timestamped receipt or record its hash privately before recruitment. The source commit with this protocol and the receipt hash establish what was fixed before timing.

   ```text
   node --import tsx scripts/curb/metrics/study.ts --freeze "<private-cohort-directory>" --size 8
   ```

   With eight, the fixed order S01–S08 is Manual, Curb, Curb, Curb, Manual, Manual, Curb, Manual. With six, use `--size 6`: S01–S06 is Curb, Manual, Curb, Curb, Manual, Manual. Keep upcoming assignments private. Map eligible consenting people to the next available slot in chronological enrollment order. Once assigned, a slot stays on the roster even if the person withdraws or fails to appear. Close other unused slots as `unfilled`. Recruitment changes after freezing require a separately documented cohort.

4. Copy [the observation header](HUMAN_STUDY_OBSERVATIONS.template.csv) to `observations.csv` in that folder. Keep it header-only until you have actual records. Make a worksheet or timer that records whole-second UTC times and elapsed seconds. Reserve another staff member to score or independently review each final brief. The facilitator may be the first scorer if another person is the reviewer.

The facilitator can ask, “Would you volunteer for a short campus repair planning exercise? It takes about 10 minutes after setup. We record an anonymous brief, time, and scoring for a small comparison. You can decline or stop at any time.” Ask whether they have helped author Curb or already seen this demo, answer, or rubric. Exclude those volunteers from comparative slots. Confirm that the volunteer agrees to anonymous review/use of the brief and timing. Record only a broad role and prior familiarity with budgeting or graph/planning tools. Avoid names and contact details in study files. Avoid recording screen, audio, or video.

## Run one timed attempt per person

1. Check the accepted app SHA again before the session. Ready a blank answer sheet, the same task and packet files, and paper/calculator/spreadsheet for either arm. Keep study content and Curb's recommendation out of view before timing. If needed, show basic control mechanics using an unrelated example only. Manual participants use the packet and ordinary tools. Curb participants can also open the pinned app for the study case. Other automated recommendation tools or help are out of scope for both arms.
2. Read the common orientation. “You are deciding which campus repairs to fund using the information provided. You have 10 minutes once I show you the task inputs. Work independently and write your answer on the provided template. Submit it as soon as you want it scored. You may ask me to repeat an instruction or stop at any time.” Disclose their assigned tool. Start the timer as you reveal the packet and give the participant access to the assigned tool. Include opening the study case, reading, using the tool, and preparing/submitting the answer in the elapsed time.
3. Use the frozen neutral clarifications. “Use the objective and constraints on the task sheet.” “You may use the packet and the tools provided to you.” “Put your final recommendation and reasoning on the answer sheet.” Repeat instructions as needed without interpreting them. If a facilitator supplies facts about this case, identifies an edge or repair to inspect, suggests a choice, helps use case-specific controls, or gives other substantive help, count each intervention as a hint and note what happened. Log tool failures and interruptions with their durations while leaving the timer running.
4. Stop at final handoff. Save the actual submitted answer, preserving errors and omissions. An incomplete answer deliberately submitted before the cap is `completed` and gets scored. If no final handoff occurs by 10 minutes, mark `timed_out` and record exactly 600 seconds. An early voluntary stop is `abandoned` if the participant permits the anonymous timing record. An irrecoverable technical stop earlier than the cap is `technical_failure`. Retain the original assignment if a person used the wrong tool or switched tools, and log the actual arm. For Curb, recheck the accepted source. If it changed, suspend the cohort and document the affected session instead of relabeling it.
5. Write the observer record at the time of the session (or document the unused/withdrawn slot when known). For a consent withdrawal use only the authorized anonymous disposition; remove unapproved material. If even the minimal proof cannot be retained, report incomplete evidence and leave publication pending. Keep enrollment/contact coordination separate from the data.

## Keep proof and enter the CSV

Use one row for every frozen slot. Use `curb-study-v1` in `protocol_version`, `observed` in `record_kind`, `synthetic-campus-investment@1/packet-v1` in `input_revision`, and the accepted SHA in `app_source_sha`. The task inputs are synthetic even though the observed human sessions are real. Never put pilot, simulated, or scripted rows in the empirical CSV.

| Fields | Values or recording rule |
| --- | --- |
| `participant_id`, `assigned_arm` | Copy the exact ID and `manual` or `curb` from `freeze.json`. |
| `role`, `familiarity` | `facilities`, `student`, `other`, `unknown`; `none`, `some`, `high`, `unknown`. Choose `unknown` when information is absent or retention would be inappropriate. |
| `status` | `unfilled`, `no_show`, `withdrew_before_start`, `withdrew_after_start`, `completed`, `timed_out`, `abandoned`, or `technical_failure`. Use `withdrew_after_start` when only the anonymous disposition can be retained. |
| `actual_arm`, `start_utc`, `end_utc`, `duration_seconds`, `hint_count`, `interruption_seconds` | For timed attempts, use actual arm `manual`, `curb`, or `mixed`; record UTC times at whole seconds on the same clock and calculate total elapsed seconds as end minus start. Record integer hints and interruption seconds, including explicit zero. Leave these six fields empty for administrative and disposition-only withdrawal rows. |
| `observer_id`, `observer_attestation`, `observer_ref`, `observer_sha256` | Anonymous staff IDs are H01, H02, and so on. Use `observed-by-human` and reference actual observer proof for every row. The observer should personally sign off under their code. |
| `submission_ref`, `submission_sha256` | Completed rows require the actual submitted brief. Other rows leave these blank. |
| `scorer_id`, `reviewer_id`, `review_status`, `scoring_ref`, `scoring_sha256`, and nine rubric/error flags | Completed rows require distinct scorer/reviewer IDs, `agreed` or `resolved`, and the reconciled flags (0/1). Other rows leave these fields blank. |

Use the exact evidence layout `proof/S01/observer.json`, `proof/S01/submission.md`, and `proof/S01/scoring.json`, replacing S01 with the slot ID. These are the values in the corresponding CSV reference cells. Store UTF-8 files. Include SHA-256 hashes in the CSV (`Get-FileHash -Algorithm SHA256 -LiteralPath <file>` on Windows, `shasum -a 256 <file>` on macOS, or `sha256sum <file>` on Linux). Use text or spreadsheet software that preserves the CSV headers, UTC strings, and IDs. Save a literal CSV using standard doubled quotes for quotes inside a quoted field.

Copy this shape for the observer record. Replace placeholders with what actually happened. For a timed attempt replace the four null values with two UTC timestamps and two integer counts. Set the actual arm for a timed attempt, leaving it null for other records. Record timed notes as events happen and use the time the record was completed. Include hints, interruption durations, method mismatches, and the reason an attempt did not take place. Keep the notes anonymous.

```json
{
  "participant_id": "<frozen slot>",
  "observer_id": "<human observer code>",
  "attestation": "observed-by-human",
  "status": "<actual disposition>",
  "app_source_sha": "<accepted source SHA>",
  "actual_arm": null,
  "recorded_utc": "<actual UTC>",
  "start_utc": null,
  "end_utc": null,
  "hint_count": null,
  "interruption_seconds": null,
  "notes": "<contemporaneous observer notes>"
}
```

The primary scorer and independent reviewer each complete the [rubric](HUMAN_STUDY_RUBRIC.md) before reconciliation. Where possible give them only a copy normalized to the common template and stripped of tool references and timings. Preserve the original separately. Save both initial sets of flags and the final flags in a scoring JSON with this shape.

```json
{
  "participant_id": "<frozen slot>",
  "scorer_id": "<human scorer code>",
  "reviewer_id": "<different human reviewer code>",
  "review_status": "<agreed or resolved>",
  "review_notes": "<review and reconciliation notes>",
  "submission_sha256": "<hash of the retained submitted brief>",
  "primary_flags": {},
  "reviewer_flags": {},
  "final_flags": {}
}
```

Fill each flags object with the same six rubric names and three error names as the CSV, with numeric values `0` or `1`. `review_notes` records independent review and, for `resolved`, why the scores differed and how they were reconciled. The final flags must match the CSV. Do not complete a row on behalf of an observer or reviewer who has not checked it.

## Analyze and hand off

With `observations.csv`, `freeze.json`, `acceptance.json`, and `proof/` in the same private folder, run:

```text
node --import tsx scripts/curb/metrics/study.ts --input "<private-cohort-directory>/observations.csv" --out "<new-analysis-directory>"
```

The script validates the frozen roster, source and packet identities, times, observer and scoring consistency, and file hashes. It writes `study-summary.json` and `study-accounting.csv` in a new directory. It does not authenticate a human witness. Have another human inspect the retained records and calculation before using figures. Review the flagged quality tradeoffs beside any time comparison, and publish only authorized anonymized artifacts. The kit without sessions supports `study_ready / observations_pending`.
