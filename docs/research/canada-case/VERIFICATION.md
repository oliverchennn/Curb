# Independent verification of Cañada College evidence readiness

**Disposition `inventory_only`.** The November 2020 audit supports a bounded inventory of 69 records and four distinct published curb-ramp estimates. The report leaves assessed crossing matches, arrival and entrance points, continuous coverage, and complete repair scopes unresolved. The accepted executable graph is empty. The comparison, study grid, engine output and sensitivities are **not applicable**. No benefit value was computed. [Independent data review](DATA_REVIEW.md) · [Readiness brief](../../../reports/curb/canada-2020/readiness.md) · [Approved claim ledger](../../../reports/curb/canada-2020/claims.json)

## Exact evidence and projection

| Artifact | Identity |
| --- | --- |
| Official final SMCCCD report | November 2020, 111,675,832 bytes, 4,399 viewer pages |
| Official PDF SHA-256 | `01e6d86bc0535a925a1f26172c808a22b80fc000797d5fc441ea1b9714f4d2f8` |
| Reviewed data commit | `1dbe30033ae46a4b2711bca1b93b0831b675251e` |
| Independent review commit | `65effc19e03c5f3bd98cbb3e781fcd9ec07c98ab` |
| Readiness product commit | `ff33cdc9aa7ea4907851dae7aec8351b722e409a` |
| Projected snapshot SHA-256 | `45a70b5a61a3088a6596ad5645bf4e276b6fb0fbde070e6468d7949608ee4a8a` |

The source review reconciled the six committed input blobs and used the final report's records and locators. It checked 43 sidewalk rows, 11 route summaries, 78 numeric fields on seven curb-ramp records, two exterior approach records, four method or legend records and two subtotal records. The separate draft packets were used to confirm matching selected table bodies. Five `REF` overlaps keep null individual costs. Nineteen displayed quantity-times-rate differences retain their printed costs. The four selected assemblies total $23,500 in published 2020 estimates. Separate Building 9 approach work and complete-route costs fall outside that sum. [Source notes](SOURCE_AUDIT.md) · [Official final report](https://smccd.edu/ada2020/19029%20SMCCCD%20ADA%20Self-Evaluation%20and%20Transition%20Plan%20FINAL%20Nov2020%20sm.pdf)

The independently checked product snapshot binds the accepted six data hashes and the exact review receipt. Its four cards match the raw measurement values, units, assembly types, work descriptions, estimate cents and final PDF viewer and printed locators. Every project remains ineligible. The official PDF digest, six input digests and both Git commit references match the accepted evidence. M1–M10 remain open and the accepted receipt completes M11. The response schema admits the historical inventory while rejecting graph, benefit and comparison fields. The page at `/curb/case-studies/canada-college` reads the validated projection from `GET /api/curb/cases/canada-college`. The approval here covers source fidelity and claim scope at the reviewed product commit. I compared the committed evidence with the card-rendering source and invoked the exact GET handler under Node with the accepted snapshot. It returned HTTP 200 and the matching validated JSON. This is a source and handler check. Exact-head browser and deployment verification were pending at publication. [Manifest and SHA-256 values](../../../reports/curb/canada-2020/manifest.json)

## Reproduce

From a checkout with the commits listed in the manifest, use the repository's locked dependencies and Poppler `pdfinfo` on `PATH`. Keep the local copy of the official PDF in an external cache. From the repository root, the following Bash commands acquire or verify the official report and validate a byte-preserving checkout of the accepted input files. Substitute an absolute external cache path. If Git converts LF to CRLF in your checkout, use the exact committed blobs via the manifest check below, or use a clean checkout with `core.autocrlf=false`. [Acquisition and validator details](SOURCE_AUDIT.md)

```sh
node --import tsx scripts/curb/canada-case/acquire.ts --out /absolute/external-cache
node --import tsx scripts/curb/canada-case/acquire.ts --verify /absolute/external-cache/final-nov2020.pdf
node --import tsx scripts/curb/canada-case/validate-data.ts --data research/curb/canada-2020
```

This checksum command reads data, the review and the snapshot directly from their pinned Git commits. It verifies the three companion files as committed at the checkout's HEAD. The proof commit also binds the manifest. Run the following block in Bash, or pipe its JavaScript body into the same Node command from PowerShell.

```sh
node --input-type=module - <<'NODE'
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(
  readFileSync('reports/curb/canada-2020/manifest.json', 'utf8'),
);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = (commit, path) => execFileSync('git', [
  'cat-file', 'blob', `${commit}:${path}`,
]);

for (const file of [
  ...manifest.reviewedInputs,
  manifest.reviewReceipt,
  manifest.product.snapshot,
]) {
  assert.equal(hash(blob(file.commit, file.path)), file.sha256, file.path);
}

for (const file of manifest.proofArtifacts) {
  assert.equal(hash(blob('HEAD', file.path)), file.sha256, file.path);
}

console.log('Manifest hashes verified.');
NODE
```

The independent Windows source-validation rerun materialized the exact committed LF files. It passed 23 of 24 focused tests. The remaining acquisition test returned `EPERM` when Windows denied creation of its test symlink. PDF verification, all six input hashes, the review receipt, source-field checks and the product snapshot checks passed. The author reported 24 of 24 focused tests on macOS plus TypeScript, 1,015 repository tests and a production build. These are separate verification receipts. [Source author test receipt](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6893153809) · [Independent review release](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6893192444)
