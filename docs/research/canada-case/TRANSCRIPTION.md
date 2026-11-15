# Transcription and exception ledger

69 records are included:43 narrow sidewalk rows,7 curb-ramp records,2 Building9 approach records,11 route summaries,4 legend/method records and2 ramp subtotal records. This is a bounded inventory, not every Cañada record.

## Two author passes

Pass1: parent extracted searchable text, identified exact rows and transcribed original units, ranges, chainage, quantities and costs. Pass2: a separate read-only author-team reviewer inspected rendered pages and then the actual JSON:all43 sidewalk rows,11 route summaries and78 numeric ramp-table entries agreed. Parent visually inspected the legend/method context and draft reconciliation. Reviewer found one inappropriate inherited vertical-curb value on415; corrected to not recorded before publication. The two passes are author-team work, not Vincent's separate gate acceptance.

Every observation contains its source ID, one-based PDF page, printed page, stable record locator, raw fields, normalized values and author pass markers. `raw` preserves source numeric text/labels; action, method, coverage and semantic status sentences are explicitly author paraphrases, not verbatim quotations. Unspecified values remain unknown. Additional source locators on the priority record identify AppendixQ context.

## Sidewalk ledger

All rows below were checked against final rendered pages2805-2806. Each row's precise source page and original visible heading are in observations.json. Rows1352684-1352692 and1352705-1352718 and1352721-1352723 are on2805; remaining selected rows are on2806. Page2805 is headedRoute35/run1906050854/priority132.5;2806 is headedRoute52/run1906050745/priority117.25. No intermediate heading establishes the candidate assignments below. They are arithmetic hypotheses only, not accepted route membership or priority.

| RowID | PDF | Candidate route (unresolved) | Chainage (ft) | Type / raw value | Width | Qty / unit | Rate / printed total |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
|1352707|2805|route-40|1.2 to 3.6 feet|Cross Slope (PAR): 3-4%|5 ft|12 SF|$120 / $1,440|
|1352708|2805|route-40|3.6 to 12.8 feet|Cross Slope (PAR): 2-3%|5 ft|46 SF|$120 / $5,520|
|1352705|2805|route-40|6.6 to 7.6 feet|Vertical Change: .3|5 ft|5 REF|blank / blank|
|1352709|2805|route-40|14.5 to 16.7 feet|Cross Slope (PAR): 3-4%|5 ft|11 SF|$120 / $1,320|
|1352710|2805|route-40|16.7 to 23.6 feet|Cross Slope (PAR): 2-3%|5 ft|35 SF|$120 / $4,140|
|1352711|2805|route-40|23.8 to 27.1 feet|Cross Slope (PAR): 3-4%|5 ft|17 SF|$120 / $1,980|
|1352712|2805|route-40|27.3 to 30.8 feet|Cross Slope (PAR): 3-4%|5 ft|18 SF|$120 / $2,100|
|1352713|2805|route-40|31.0 to 32.7 feet|Cross Slope (PAR): 2-3%|5 ft|9 SF|$120 / $1,020|
|1352714|2805|route-40|33.7 to 36.1 feet|Cross Slope (PAR): 2-3%|5 ft|12 SF|$120 / $1,440|
|1352715|2805|route-40|36.2 to 40.1 feet|Cross Slope (PAR): 3-4%|5 ft|19 SF|$120 / $2,340|
|1352716|2805|route-40|40.8 to 42.9 feet|Cross Slope (PAR): 2-3%|5 ft|11 SF|$120 / $1,260|
|1352717|2805|route-40|52.3 to 53.3 feet|Cross Slope (PAR): 2-3%|5 ft|5 SF|$120 / $600|
|1352718|2805|route-40|53.5 to 59.8 feet|Cross Slope (PAR): 3-4%|5 ft|32 SF|$120 / $3,780|
|1352706|2805|route-40|58.5 to 59.5 feet|Vertical Change: .3|5 ft|5 REF|blank / blank|
|1352721|2805|route-41|4.9 to 5.9 feet|Vertical Change: .4|8 ft|8 REF|blank / blank|
|1352722|2805|route-41|5.3 to 8.8 feet|Cross Slope (PAR): 2-3%|8 ft|28 SF|$120 / $3,360|
|1352723|2805|route-41|8.9 to 10.4 feet|Cross Slope (PAR): 2-3%|8 ft|12 SF|$120 / $1,440|
|1352684|2805|route-52|1.3 to 2.8 feet|Cross Slope (PAR): 2-3%|5 ft|8 SF|$120 / $900|
|1352685|2805|route-52|2.9 to 5.2 feet|Cross Slope (PAR): 2-3%|5 ft|12 SF|$120 / $1,380|
|1352686|2805|route-52|4.0 to 6.4 feet|Cross Slope (PAR): 2-3%|5 ft|12 SF|$120 / $1,440|
|1352687|2805|route-52|5.8 to 8.7 feet|Cross Slope (PAR): 3-4%|5 ft|14 SF|$120 / $1,740|
|1352688|2805|route-52|7.5 to 9.3 feet|Cross Slope (PAR): 2-3%|5 ft|9 SF|$120 / $1,080|
|1352689|2805|route-52|8.8 to 10.7 feet|Cross Slope (PAR): 3-4%|5 ft|9 SF|$120 / $1,140|
|1352690|2805|route-52|10.6 to 11.6 feet|Cross Slope (PAR): 2-3%|5 ft|5 SF|$120 / $600|
|1352691|2805|route-52|11.3 to 12.8 feet|Cross Slope (PAR): 2-3%|5 ft|8 SF|$120 / $900|
|1352692|2805|route-52|12.5 to 13.8 feet|Cross Slope (PAR): 2-3%|5 ft|7 SF|$120 / $780|
|1352703|2806|route-52|15.5 to 18.0 feet|Running Slope: 5-6%|5 ft|13 SF|$120 / $1,500|
|1352704|2806|route-52|19.7 to 21.7 feet|Running Slope: 7-8%|5 ft|10 SF|$120 / $1,200|
|1352681|2806|route-52|31.7 to 32.7 feet|Vertical Change: .3|5 ft|5 LF|$75 / $375|
|1352682|2806|route-52|41.2 to 42.2 feet|Vertical Change: .3|5 ft|5 REF|blank / blank|
|1352693|2806|route-52|41.6 to 42.7 feet|Cross Slope (PAR): 2-3%|5 ft|6 SF|$120 / $660|
|1352694|2806|route-52|42.9 to 44.0 feet|Cross Slope (PAR): 2-3%|5 ft|6 SF|$120 / $660|
|1352695|2806|route-52|54.0 to 56.0 feet|Cross Slope (PAR): 2-3%|5 ft|10 SF|$120 / $1,200|
|1352696|2806|route-52|56.4 to 60.2 feet|Cross Slope (PAR): 2-3%|5 ft|19 SF|$120 / $2,280|
|1352697|2806|route-52|59.9 to 62.1 feet|Cross Slope (PAR): 2-3%|5 ft|11 SF|$120 / $1,320|
|1352698|2806|route-52|60.3 to 64.9 feet|Cross Slope (PAR): 3-4%|5 ft|23 SF|$120 / $2,760|
|1352699|2806|route-52|62.1 to 63.6 feet|Cross Slope (PAR): 3-4%|5 ft|8 SF|$120 / $900|
|1352700|2806|route-52|63.6 to 65.8 feet|Cross Slope (PAR): 2-3%|5 ft|11 SF|$120 / $1,320|
|1352683|2806|route-52|64.3 to 68.7 feet|Vertical Change: .3|5 ft|22 REF|blank / blank|
|1352701|2806|route-52|64.9 to 67.0 feet|Cross Slope (PAR): 2-3%|5 ft|10 SF|$120 / $1,260|
|1352702|2806|route-52|67.8 to 72.2 feet|Cross Slope (PAR): 2-3%|5 ft|22 SF|$120 / $2,640|
|1352719|2806|route-53|3.3 to 6.5 feet|Vertical Change: .3|5 ft|16 LF|$75 / $1,200|
|1352720|2806|route-53|7.8 to 10.3 feet|Running Slope: 7-8%|5 ft|13 SF|$120 / $1,500|

The four candidate blocks total$26940,$4800,$28035,$2700 respectively, matching route40/41/52/53 summary totals. This numerical reconciliation is not proof of identity. REF records1352705,1352706,1352721,1352682,1352683 have blank individual prices and retain null cost. Their physical owner remains unresolved.

19 displayed quantity-times-rate discrepancies are retained without correction:1352710,1352711,1352712,1352713,1352715,1352716,1352718,1352684,1352685,1352687,1352689,1352691,1352692,1352703,1352693,1352694,1352699,1352701,1352720. Example1352710:35SF×$120=$4200, but source total$4140. Example1352684:8SF×$120=$960, source$900. Chainage-derived quantities suggest display rounding in some cases, but no rounding model is accepted. Printed totals remain unchanged.

## Remaining record checklist

Every listed record has both author passes. See observations.json for raw/normalized ramp feature tables, unresolved attributes and full labels.

| Observation ID | PDF / printed | Key source fact or scope |
| --- | --- | --- |
|route-12-summary|2792 / 2791|ROUTE 12; $171,900.00 route_total|
|route-34-summary|2792 / 2791|ROUTE 34; $1,440.00 route_total|
|route-40-summary|2793 / 2792|ROUTE 40; $26,940.00 route_total|
|route-41-summary|2793 / 2792|ROUTE 41; $4,800.00 route_total|
|route-52-summary|2793 / 2792|ROUTE 52; $28,035.00 route_total|
|route-53-summary|2793 / 2792|ROUTE 53; $2,700.00 route_total|
|route-24-summary|2792 / 2791|ROUTE 24; $27,900.00 route_total|
|route-25-summary|2792 / 2791|ROUTE 25; $4,500.00 route_total|
|route-26-summary|2792 / 2791|ROUTE 26; $24,480.00 route_total|
|route-29-summary|2792 / 2791|ROUTE 29; $65,040.00 route_total|
|route-9-summary|2793 / 2792|ROUTE 9; $55,920.00 route_total|
|ramp-404|2826 / 2825|45.0"; $6500.00 individual|
|ramp-405|2826 / 2825|2.5%; $6500.00 individual|
|ramp-421|2827 / 2826|Right: 9.8%; $7000.00 individual|
|ramp-422|2827 / 2826|2.4%; $3500.00 individual|
|ramp-413|2824 / 2823|Left: 11.6% Right: 14.1%; $6500.00 individual|
|ramp-414|2824 / 2823|Under Construction; $0.00 construction_zero|
|ramp-415|2825 / 2824|Surveyed features assessed compliant; $0.00 maintenance_zero|
|legend-ref|2788 / 2787|REF|
|legend-columns|2787 / 2786|Column definitions|
|method-prow|10 / 9|Curb-ramp checklists and measuring/smart-level equipment; sidewalk profilers capture slopes and surface variation.|
|method-priority|11 / 10|Activity plus barrier score, each 0 to 100; combined priority 0 to 200.|
|lot1-b9-subtotal|2827 / 2826|Lot 1 and Building 9; $20,000.00 subtotal|
|lot1-subtotal|2827 / 2826|Lot 1; $23,500.00 subtotal|

## Exception register

- **E1: grouped cost labels.**421's$7000 differs from the adjoining$20000 subtotal.415's individual$0 differs from the CampusCir group$6500 displayed by its ID in summary2821. Detailed component sums govern individual prices.
- **E2: zero semantics.**414 was under construction;415 was assessed compliant only for listed features. Neither is a zero-cost repair project or full-journey certificate.
- **E3: missing intermediate headers.**Sidewalk row-to-route/run/priority association is unresolved despite sum agreement. No priority is inherited across a chainage reset.
- **E4: quantities and overlaps.**Nineteen displayed multiplication differences and five REF rows remain explicit. No independent free overlap work or cheaper partial construction job is created.
- **E5:404 priority.**Text extraction yields `111.2` then a separate `5`; the rendered cell visibly shows `111.2`. Raw text and visible value are both recorded; normalized priority is null. The map's111.25 class boundary does not resolve this transcription conflict.
- **E6: map connectivity.**421/422 opposite-side points and individual crosswalk flags do not establish crossing pairing.404/405 and east/west Building9 gaps remain. Route28 has a map label but no master-cost row. Exact entrance/arrival identities are unsupported.
- **E7: source coverage.**Source feature assessments, numeric defects and run boundaries do not establish continuous coverage of every relevant route attribute. No missing record becomes passable.
- **E8: original units and intervals.**Sidewalk vertical-change decimal cells omit a unit; retain unspecified. Slope ranges such as2-3% remain intervals. No invented midpoint, coordinate, distance or photo.

Cost-kind and normalization validation checks these recorded semantics where machine-detectable. Human source review remains necessary for missed rows, ambiguous layout and topology. This ledger makes no independent acceptance claim.

## Building9 approach corroboration added before publication

Reviewer preflight6892922527 prompted an additional parent text pass and rendered-page pass on final2256/2261 within the already bounded west-side approach inspection. SheetB9-0-1, dated9-1-2020, shows historical crossing paint but no assessed exact curb-ID connectors. This corroborates approximate crossings without resolving passability or topology.

| Observation ID | Final PDF / printed | Retained fact | Cost / scope |
| --- | --- | --- | --- |
|b9-site2-record-3|2261 /2260|Site2 southwest ramp handrail extension10in; source mitigationNO selected|3JOB×$510=$1530; priority1/severity4|
|b9-site2-record-4|2261 /2260|Site2 landing deficiency; exact existing length absent; source mitigationNO selected|300SF×$162=$48600; priority1/severity1|

These two additional barriers are retained in west-expansion coverage, not promoted into the four initial-cluster projects. The building-facility priority/severity scale is distinct from the public-right-of-way score. Record4's description uses72 inches while its proposed-solution CA-only line prints72 feet; the conflict remains raw and no target length is normalized. Parent performed both added passes; the earlier author-team reviewer receipt covered the original67records.

REF1352683 spans64.3-68.7ft. Priced1352701ends67.0ft and1352702starts67.8ft. Those two records do not establish repair coverage of67.0-67.8ft; no nearest-row mapping or complete effect is claimed. This is a source interval coverage gap, not proof of a physical gap in the sidewalk.
