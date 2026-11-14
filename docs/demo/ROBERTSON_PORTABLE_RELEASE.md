# Robertson Hall portable report release

## Save the report before the walkthrough

1. From the release checkout, install the locked dependencies with `npm ci`, build with `npm run build`, and start the local app with `npm start -- --port 3191`. Open [Robertson Hall sidewalk survey](http://127.0.0.1:3191/curb/surveys/robertson-hall).
2. Review the five findings and their evidence. In **Compare repairs**, choose the plan to share. For a budget snapshot, enter the amount under **Budget (US dollars, optional)** and select the budget plan. For a reviewed snapshot, export with the intended finding decisions still open in the same tab.
3. In **Export report**, choose **Download accessible HTML**. Save **Download PDF** for print and **Download CSV** and **Download JSON** for the record. Put files from the same review and plan in one dated folder. Label the folder with the plan and budget, if supplied. Open the HTML once from disk to confirm the download before closing the survey.
4. Carry one copy on the walkthrough device and keep a second copy with the facilities handoff. Keep the saved reports with the release they describe. Review edits made after export require a fresh download.

## Present from the saved report

Open the saved `.html` file directly in a browser. It contains the report and all five close-ups. Press Tab to reach **Skip to report**, then use the section links or your reader's heading navigation to move among plans, work areas, findings and sources. The final finding includes the close-up from frame 418. Source references open external sites when you follow them and require a connection.

Use accessible HTML for screen-reader use and the untagged PDF for printing or visual reference. Review the selected and deferred work, field checks and items requiring quotes together. Dollar ranges with outstanding quotes are partial estimates. Dimensions, accessibility compliance, and route availability require field verification. The saved report is a planning snapshot.

If the live app is unavailable and there is no saved report, restart the local app from the same release checkout using the commands above. Reapply the intended review and budget before exporting. The maintainer samples below contain a disposable review edit. Keep them separate from the facilities record.

## Verify a saved release bundle

Run these commands from the release checkout with its locked dependencies installed. The corresponding checkout supplies the approved survey, photos, report format and plan rules used for verification. Keep the checkout commit with the archived bundle.

With a production server listening on port 3191, run the live flow check. It writes fixed filenames to `.curb-local/release`. Move any prior bundle out of that directory before regenerating it.

```powershell
npm run verify:flow -- http://127.0.0.1:3191
```

Stop the app with Ctrl+C in the server terminal. Run the following with the app stopped, replacing the argument with the saved bundle directory if needed.

```powershell
node --import tsx scripts/curb/verify_report_bundle.ts .curb-local/release
```

The directory must contain `default`, `budget`, and `edited` copies, each with `.request.json`, `.json`, `.csv`, `.html` and `.pdf` files. The request identifies the reviewed survey, focused plan and budget for each set. Keep it alongside the exported artifacts. The verifier reads the files locally without writing them and prints a JSON receipt with survey, photo and artifact SHA-256 hashes, page counts, and plan totals. Save stdout separately if a receipt is needed. On failure the command exits 1 and identifies the variant and failed check on stderr.

The CLI checks the approved evidence and the reviewed edits, including CSV quoting and formula protection, HTML navigation and embedded resources, and PDF finding and plan content. HTML embeds the approved image bytes. The PDF check inspects the drawn image on each finding page and verifies selected and deferred work, estimates and required quotes. Open saved HTML offline and inspect it in a browser as a separate release step.

### Reproduce the negative checks

With the original bundle retained, copy its directory into six separate directories. Apply one change per copy and run the verifier against each changed directory. The command should return exit 1 with the indicated failure. Rerun the original and compare its artifact hashes with the initial receipt.

| Copy | Change | Expected failure |
| --- | --- | --- |
| Missing photo | Remove the first complete figure from `default.html`. | HTML missing a photo, alt text, or caption |
| Wrong ID | Change the `#area-panel-01` link in `default.html` to `#area-panel-99`. | HTML has an unregistered link or broken anchor |
| Wrong PDF cost | Change only the essential upper estimate in `default.pdf` from $2,294.00 to $2,295.00. For the generated PDF, use the existing `pdf-lib` dependency to replace the corresponding hexadecimal text in the decompressed page content stream. | Essential amount or completeness differs |
| Corrupt CSV | Change the rejected status in `edited.csv` to accepted, leaving the other files unchanged. | CSV differs from the reviewed records and canonical quoting |
| Corrupt HTML | Insert an empty iframe immediately after the main element in `default.html`. | HTML includes an active or external resource element |
| Stale request | Change the first reviewed label in `edited.request.json` while leaving `edited.json` unchanged. | JSON differs from the submitted review |

## Verification record

- Production source `117175a34f3e8ae8dec87ffe80b131453a3b6771`, November 14, 2026. `npm run check` passed TypeScript, 674 tests in 23 files, and the Next.js production build. The standalone verifier also passed strict TypeScript checking.
- The production flow passed 16 live checks and produced all 15 report files. The offline CLI matched the five approved photos in all three PDF and HTML pairs. Default balanced was $216–$1,434 with quote items outstanding. The $1,500 budget selected seals for panels 01, 02 and 03 at $216–$1,434, with the shared quote outstanding. The edited set excluded rejected `defect-01` from planning and retained its evidence. The edited balanced subtotal was $144–$956 with required quotes.
- With port 3191 closed, Chrome opened the three HTML files from disk in an offline context and decoded five photographs per file. Keyboard skip, report section links, language and source-link destinations were checked. The edited supplemental bundle contained the label `=裂缝检查 & 岩石`, reviewer `王小明`, and a multiline note with punctuation. Its HTML preserved the label and reviewer offline and its CSV passed the formula and quoting checks. No automatic HTTP requests were observed in the four HTML files. The browser check did not include a screen-reader session.
- Poppler rendered all 37 saved PDF pages across the three production sets (12 default, 13 budget, 12 edited). Representative plan, work-area, evidence and source pages were inspected visually. All six copied bundles failed with the expected diagnostics, and the original 15 artifact hashes stayed the same.
- The original bundle's JSON receipt SHA-256 was `16ae1d7d2ba5fd266f9e3cd502623cae1a25d7bc5fdc7374f8d0647790bba6c3`. The supplemental receipt SHA-256 was `0602e726d61dedea5cb0759e11e405c03b99074d496190eef364536b8fcc59a8`. These hashes identify the inspected local artifacts. Regenerated PDFs can have different metadata and hashes.
