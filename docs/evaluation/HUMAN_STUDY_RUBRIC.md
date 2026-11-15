# Facilitator only: frozen scoring rubric v1

Score the final submission against the criteria below. Use 1 for pass and 0 for fail. A blank, ambiguous, contradictory, or incorrect item fails its criterion. Apply items independently. Preserve the original submission and use the common template for scoring. Count full correctness only when all six items pass and none of the three errors below is present.

| CSV field | Pass criterion |
| --- | --- |
| `budget_selection` | The complete choice uses valid, unique repair IDs (A/B/C shorthand is acceptable), states the corresponding total assumed USD spend correctly, and totals no more than $10,000. An explicit empty set at $0 also meets this criterion. |
| `optimal_set` | The final recommended set is A+B, in either order. Accept a list of alternatives only if A+B is unambiguously the recommendation. |
| `destinations` | Names exactly Library and Student center as newly reachable, counts 2, and identifies Cafe as already reachable in the model. Hall is not included as a gain. |
| `dependency` | Explains that both repairs are needed on the shared approach. A alone leaves the B blockage, and B alone leaves the A blockage. Exact edge IDs are optional. |
| `provenance` | Identifies supplied note IDs, equivalent unambiguous descriptions, or the supplied assumptions and connects them to the claimed repair cost and route effect. Omits invented evidence, prices, or measurements. |
| `verification` | States that costs and route conditions are synthetic assumptions and identifies a need to verify actual route conditions and repair scopes before funding real work. Current real pricing is a useful addition. |

Record these independent error flags when present, including when a different rubric item also fails.

| CSV field | Set to 1 when |
| --- | --- |
| `budget_breach` | The chosen set costs more than $10,000 using the supplied prices, or the final stated spend exceeds that budget. |
| `unsupported_field_claim` | The submitted brief presents actual measurements, prices, route accessibility, completed work, compliance, or real-world impact as established by the exercise. |
| `destination_miscount` | The brief gives a wrong count or conflicting lists/counts for the final recommendation, treats Cafe as a newly gained destination, or gives the wrong newly reachable set for the submitted plan. A correct gain count/set for a suboptimal choice can avoid this error while still failing the destination criterion. |

At the $10,000 cap, C alone costs $10,000 and opens Hall. A alone or B alone costs $5,000 and opens no additional destination. A+B costs $10,000 and opens Library and Student center. A+C and B+C each cost $15,000, and all three cost $20,000. Cafe is baseline in every case.

The first scorer and second reviewer record independent judgments before reconciling differences. They use anonymous reviewer IDs and keep both initial judgments and the final agreed flags in the proof record. If scores differ, record the reason for each resolved item. A completed submission with unresolved scoring is awaiting analysis. Hints, timeouts, and interruptions are recorded independently of rubric judgments.
