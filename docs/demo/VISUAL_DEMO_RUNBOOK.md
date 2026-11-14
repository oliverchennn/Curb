# Curb visual demo runbook

**Two minutes · Robertson Hall · Facilities and accessibility audience**

The spoken script is 200 words, about 81 seconds at 150 words per minute. The allocations include a simulated processing wait, clicks and time to show the evidence. Start the timer on the first click. Speak the quoted lines only. The example uses the original five pending findings and an empty budget.

## Two-minute core

**0:00–0:16 — Open the prepared survey**

On `/curb/upload`, click **Use Robertson Hall demo** as you start speaking. The labeled ten-second processing simulation opens the prepared survey and selects **Review findings**.

> At Robertson Hall, we recorded this sidewalk with a phone. Curb opens a prepared analysis from that footage so a campus facilities team can review evidence and decide what to inspect and fund.

**0:16–0:35 — Show the field evidence**

On **Jump to evidence** under the video, click **04** (Defect 04 · Surface breakup). Let the clip seek to 0:06 and leave it paused. Point to the connected breakup and show **Possible access effects** and **Needs measuring** in **Review findings**.

> Here is the surface breakup at six seconds. The broken edges could affect a small wheel or someone’s footing. A field reviewer still needs to measure the openings, height differences and clear walking width. These are AI-assisted proposals.

**0:35–0:54 — Explain the choices**

Click **Compare repairs** and point across **Essential**, **Balanced** and **Durable**. Leave the optional budget empty until you have shown all three cards.

> Essential starts with lower-cost suitable repairs. Balanced covers every eligible area using the recommended treatment. Durable favors longer-lasting work. Some treatments need quotes, so a smaller priced subtotal can leave more costs outstanding.

**0:54–1:19 — Scope the $500 example**

Enter **500** in **Budget (US dollars)**. Click **Choose Budget scenario**. Point to the single selected area, the **Quote needed** setup row and **Deferred needs · 4 areas**. If scrolling takes longer, the budget summary above the scenario card lists the deferred areas and the unpriced work.

> At five hundred dollars, the budget scenario selects one area for sealing. The priced subtotal ranges from seventy-two to four hundred seventy-eight dollars. Setup still needs a quote. Four areas stay on the deferred list.

**1:19–1:38 — Hand off the report**

Click **Export report**, then **Download PDF** once. Show the selected scope and the deferred work. If the download stalls, show the already checked $500 PDF or accessible HTML in another tab. Use the saved copy as soon as you reach 1:30. Return to the app for the last cue.

> The report gives facilities the selected work, the evidence behind it, and the measurements and quotes needed before approving funds. Keep it with the survey for the site visit.

**1:38–2:00 — Show one rover stop and another angle**

Open **Collection demo** in the top navigation. With **Auto inspect On**, click **SIM-01 · Transverse crack** under **Inspection stops**. The timeline jumps to 12 seconds and the workspace opens **02 Downward**. Click **03 Side / curb** once and stop.

> This simulated rover shows a proposed way to collect evidence. At the first stop, the downward camera opens on the modeled crack. The side camera shows the curb in the same scene.

## Optional 40-second extension

- **0:00–0:15 — Second rover stop.** Turn **Auto inspect** back on after the manual camera switch. Select **SIM-02 · Rough patch** to show the downward view at 26 seconds. Explain that dimensions and treatment suitability still need a site visit.
- **0:15–0:40 — Route explorer, awaiting final integrated verification.** Open **Route explorer**, choose the Robertson Hall collection and open a field record. Show how the close-up connects to the survey evidence. Keep the archive corridor view distinct from the field photos. A record without a verified location remains unplaced. If the final explorer walkthrough is pending, use the rover stop alone. [Explorer implementation handoff](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6886135359)

## Launch, reset and fallback

- Confirm the release owner’s exact accepted SHA before presenting. For local backup, prepare that checkout in advance with `npm ci --no-audit --no-fund` and `npm run build`. Start it with `npm start -- --port 3191` and open `http://127.0.0.1:3191/curb/upload`. Run the prepared upload once before the session to check local media and exports.
- Start a fresh tab on `/curb/upload`. Confirm **Original analysis** and five pending findings. If reusing the survey, use **Restore original** for review edits and **Clear budget** for the optional amount. Open a fresh **Collection demo** view with **Auto inspect On**. Use the named controls instead of orbiting on the projector.
- Keep a checked $500 PDF and accessible HTML available locally. Verify the report shows one sealing area, `$72–$478` priced, a setup quote and four deferred areas. Keep the direct survey URL `/curb/surveys/robertson-hall` ready if the prepared flow has not opened by the first cue change. If 3D fails, use the three camera diagrams and describe them as diagrams.
- The existing edited backup MP4 covers the earlier Robertson survey workflow. Use it with the saved report if live or local hosting is unavailable. Use the verified live build to show the upgraded rover and explorer. [Backup MP4](../../public/curb/surveys/robertson-hall/demo-backup.mp4) · [Portable release guide](ROBERTSON_PORTABLE_RELEASE.md)

## Timed Chrome click-through

On November 14, 2026 at 23:54:37 UTC, one headless Windows Chrome 156.0.8078.74 run at 1366×768 used SwiftShader and the local production build of `4d44143392675f36078c7607753cf10c751bea6b` (Node 24.12.0). The locked install and `npm run build` exited successfully.

**16.93 seconds of operator actions and app waits**, from the prepared upload click to the rendered Camera 03 frame. The browser automation scrolled to click targets. This timing excludes narration, audience pauses, manual reading and launch time. The two-minute allocations still need a spoken presenter rehearsal at the actual venue.

| Step | Measured time |
| --- | ---: |
| Prepared upload through loaded Review findings | 10.71 s |
| Defect 04 through decoded video frame at 0:06 | 2.31 s |
| Compare repairs and the three policy cards | 0.26 s |
| Enter $500, choose Budget scenario and see the deferred list | 0.58 s |
| Export report and complete the PDF download | 0.92 s |
| Open Collection demo and render its first camera frame | 0.82 s |
| Seek SIM-01 and render the downward close-up | 1.04 s |
| Switch to Camera 03 at the same SIM-01 frame, 12.000 s | 0.29 s |

The prepared processing delay and media seek took the most time. Narrate over the simulated wait and let the sought frame settle before pointing to it. Preopen the matching saved report to keep the export cue within its slot if the network is slower.

The click-through saved a 13-page PDF. A separate read of that PDF confirmed `panel-01` selected, the $72–$478 priced subtotal, the setup quote and four deferred areas. The Chrome run logged zero page exceptions and zero external HTTP requests. Receipt, PDF and final screenshot are retained locally under `.curb-local/visual-demo-runbook/`. The explorer extension awaits the combined release. [Task assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6886118743)
