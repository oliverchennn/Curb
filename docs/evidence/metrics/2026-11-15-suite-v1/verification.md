# Independent benchmark verification

Source commit `396317aaf5c683b84bf9e71208cbe436f371a69d`. Frozen suite SHA-256 `d639296a53e17c1298436b63f358ecb026358d46e7fef6bd1f00812c18daed55`.

The independent verifier launched a fresh benchmark from that commit and audited both packages against a separate directed BFS and exhaustive subset oracle. The actual run exited 0. All 120 cases, 480 strategy rows and 32 rows across eight separate investment controls passed. The four deterministic files matched byte for byte.

Command: `node --import tsx scripts/curb/metrics/benchmark.ts --suite benchmarks/curb-metrics/suite-v1.json --out <independent-run-directory>`.

- inputs.json `d639296a53e17c1298436b63f358ecb026358d46e7fef6bd1f00812c18daed55`
- engine-responses.json `144ea893d6911317c72c4000f53364f87da181abc55e3081232693e83cd33fd6`
- results.json `95f4e06123ecca013a6b29253409aaf59dd06f613e02f65bb88205e55103625e`
- results.csv `94096980339493ea5b005f66cf52c72fce7fa04f328933ee83242929f144abc5`

This verifies authored synthetic reachability, selection and route witnesses. Human task time and field outcomes were outside this run.
