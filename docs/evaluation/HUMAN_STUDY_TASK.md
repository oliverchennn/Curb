# Campus repair funding task

You are advising campus facilities. You have **$10,000** to spend on repairs in the Campus investment scenario. Choose the repair set that makes the largest number of destinations newly reachable from Arrival court under the modeled step-free profile. Count each destination once. If plans open the same number, prefer lower spend, then fewer repairs, then alphabetical repair IDs. You may leave budget unspent.

Using the assigned tools and the inputs below, complete the [answer template](HUMAN_STUDY_ANSWER_TEMPLATE.md) within **10 minutes**. List the repair IDs, assumed total spend, newly reachable destinations, and any destination already reachable. Explain what changes on the relevant connections if each recommended repair is done alone. Cite the supplied note IDs or assumptions that support your choice. Identify what should be checked before using the brief to fund real work.

Use the template for your final submission. Submit it when you are done, even if you are uncertain. Write the anonymous slot ID your facilitator gives you.

## Scenario inputs

Use input revision `synthetic-campus-investment@1/packet-v1`. Conditions, costs, route assessments, and lengths are authored assumptions. All three discretionary candidates are eligible. A modeled repair clears only the named barrier. Assessments are independent of evidence review. Surface damage in a real location would require its own assessment. Costs cover the complete modeled repair, including allocated setup.

Start at **Arrival court**. Destinations are **Library**, **Student center**, **Hall**, and **Cafe**. Before repairs, **Cafe** is reachable. Each edge below runs both ways. The list contains every connection. Distances are schematic and do not enter the funding objective.

| Edge ID | Ends | Length (m) | Step-free assessment before repairs |
| --- | --- | ---: | --- |
| `link-a` | Arrival court ↔ Shared approach midpoint | 15 | Blocked by `link-a-curb` |
| `link-b` | Shared approach midpoint ↔ Shared destination hub | 15 | Blocked by `link-b-surface` |
| `library-walk` | Shared destination hub ↔ Library | 20 | Pass |
| `student-center-walk` | Shared destination hub ↔ Student center | 20 | Pass |
| `hall-link` | Arrival court ↔ Hall | 25 | Blocked by `hall-surface` |
| `cafe-walk` | Arrival court ↔ Cafe | 15 | Pass |

Condition scores reflect the author's visual ranking from 1 (least severe) to 5 (most severe). Use destination reachability as the funding objective.

| Repair ID | Work | Clears | Assumed USD | Condition | Evidence note ID |
| --- | --- | --- | ---: | ---: | --- |
| `repair-a` | Add approach ramp | `link-a-curb` | $5,000 | 3/5 | `link-a-note` |
| `repair-b` | Repair shared path | `link-b-surface` | $5,000 | 2/5 | `link-b-note` |
| `repair-c` | Repair Hall approach | `hall-surface` | $10,000 | 5/5 | `hall-note` |

- `link-a-note` — The author placed a raised curb without a ramp at the start of the shared approach. Review of the synthetic note was accepted. The step-free blockage is a separate modeled input.
- `link-b-note` — The author defined a broken path section as a blocker between the shared approach midpoint and hub. Review of the synthetic note was accepted. The condition has no campus survey, photo, or field measurement.
- `hall-note` — The author assumed more extensive surface damage on the Hall approach and assigned the highest condition score. Review of the synthetic note was accepted. Condition, route effect, and cost are assumptions.

The same inputs are available as [CSV](HUMAN_STUDY_INPUT.csv). You may use paper, a calculator, or a spreadsheet for notes. The facilitator will tell you which task tool is assigned.
