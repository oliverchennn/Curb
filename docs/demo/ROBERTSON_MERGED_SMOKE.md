# Robertson Hall merged release smoke test

The merged release passed a clean Windows install, production build, live report flow and offline playback and report checks on November 14, 2026. Source was main at `3bcc6f63e49eae883a428c505421851db0125718`, verified against origin before the run. The isolated checkout had no `node_modules`, `.next` or saved artifacts at the start. [Merged PR #5](https://github.com/oliverchennn/Curb/pull/5), [smoke assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6879384589).

Using Node 24.12.0 and npm 11.6.2 in PowerShell, I followed the setup in the [README](../../README.md) and [portable runbook](ROBERTSON_PORTABLE_RELEASE.md). The locked install added 69 packages, and the production build completed. I used the runbook's build command for this packaging check. The 676-test suite had already passed in integration. [Merge receipt](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6879374561).

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start -- --port 3191
# In a second terminal
npm.cmd run verify:flow -- http://127.0.0.1:3191
# Stop the server with Ctrl+C. If asked "Terminate batch job (Y/N)?", enter Y.
node --import tsx scripts/curb/verify_report_bundle.ts .curb-local/release
```

- **Production flow.** All 16 checks passed, including the real survey GET, default/budget/edited PDF and HTML requests, structured errors and the original, normalized and annotated media ranges. On the real survey page, selecting **Final transverse crack** paused the video at 13.933333 seconds (frame 418), selected `defect-05` and loaded its close-up. **Download accessible HTML** returned HTTP 200 and saved `curb-robertson-hall-r2.html` with five embedded close-ups and the frame 418 caption.
- **Saved reports.** After the server stopped, a loopback GET returned `ECONNREFUSED`. The shipped verifier passed all 15 files across the three request/JSON/CSV/HTML/PDF sets. The PDFs had 12, 13 and 12 pages. Chrome opened the actual app download from disk with five decoded photos, working keyboard skip navigation and zero HTTP requests in its offline context.
- **Backup playback.** Chrome 156.0.8078.74 opened the committed MP4 from disk in an offline context. Playback advanced at the beginning and reached the end at 120 seconds after seeking to 112 seconds. The captured frame showed the Robertson Hall report and the cue **Take the evidence and open questions to facilities**. The video was 1600 × 1100, with zero HTTP requests during the check.

I compared disk hashes with the [media provenance](../../public/curb/surveys/robertson-hall/README.md), [media correction record](ROBERTSON_MEDIA_CORRECTIONS.md) and [backup receipt](../../public/curb/surveys/robertson-hall/demo-backup.json). All four matched.

| File | SHA-256 |
| --- | --- |
| `source/IMG_0699.MOV` | `30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a` |
| `survey.mp4` | `52b364f88dd42f66fe924f2d5a25ef6cf642a8ce272790bc315ee78427831ff6` |
| `annotated.mp4` | `e3dd5a6058a8d809abc2d93037f3021a7c0686da378cde140e321adb73415173` |
| `demo-backup.mp4` | `fb30922f4e31f42165447230ede7955607eb152c426b1fb2cf3a64730546c20b` |

The verifier receipt SHA-256 was `44c8228df40a07b82d45002b20b423c23d22dd67db7cdd7dac2e2099c31ccd46`. The app download SHA-256 was `cf014e59ae1c5ebf7c2369d71c5159b3a698a42129fd3250df442eb481b77da4`. The receipt, download and playback capture are local under ignored `.curb-local/smoke/`.

The Windows terminal asked for `Y` after Ctrl+C, as shown above. No release blocker surfaced. The offline evidence covers stopped loopback and Chrome's offline context. Physical Wi-Fi, projector and manual screen-reader testing remain separate.
