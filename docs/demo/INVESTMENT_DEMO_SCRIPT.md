# Curb — three-minute judges demo

*Released presenter script, 287 spoken words. The benchmark claim is approved. The Presenter is deployed at `670f6d80cc139441042957d117ad5eb85d238c6b`. Independent browser acceptance passed. Two clean automated flows took 5.022 and 4.587 seconds without narration; spoken rehearsals and projector verification remain pending. [Production release receipt](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892996974)*

## Before the clock

On the accepted build, open `/curb/surveys/robertson-hall?present=1`. Start with **Original** paused at **0:00**, **Defect 04 · Surface breakup** selected, a blank **Reviewer** field, and five findings pending. Open `/curb/investment-demo` in a second tab with **Before repairs** and the **$10,000** comparison ready.

## 0:00–0:20 · The problem

*[Hold on the paused Robertson footage.]*

> A library can have a ramp and still be out of reach if the path is blocked. At the University of Waterloo, 69 percent of surveyed people with disabilities disagreed that routes between buildings were accessible. With a fixed budget, which repairs reconnect those routes?

## 0:20–1:00 · Review the Robertson evidence

**0:20–0:27** *[Play about three seconds in **Original**, then pause.]*

> We filmed this outside Robertson Hall. This is the original footage.

**0:27–0:38** *[Switch to **Review**. On the **Surface breakup** card, click **Jump to evidence**. Point to the paused video and the close-up labeled **Source frame 180 · 0:06.0**.]*

> We analyzed the footage beforehand. This finding takes me to the frame where the pavement is breaking up.

**0:38–0:50** *[Enter **Vincent** in **Reviewer** and click **Accept finding**. Wait for **Accepted · Vincent** and **1 accepted · 4 pending · 0 rejected**. Point to the status and counts.]*

> I’ll put my name on that observation. One accepted, four pending.

**0:50–1:00** *[Point to **Field measurements pending** and **Route impact unknown**, then open **Investment demo**.]*

> We still need field measurements to know the route impact. Now let’s switch to a separate, synthetic campus.

## 1:00–1:40 · Compare at $10,000

**1:00–1:14** *[Keep **Before repairs** selected. Point to the synthetic disclosure, then trace the shared A/B path and the separate Hall branch.]*

> We have ten thousand dollars. The costs and route conditions are assumed. Cafe is already reachable. Library and Student Center share two barriers. Hall has its own approach.

**1:14–1:40** *[Click **Condition-first** and point to C and Hall. Click **Curb recommendation**, trace A then B, and pause on the two new destinations and equal spend.]*

> Start with the worst condition and you spend all ten thousand on C, opening Hall. Curb spends five thousand on the ramp and five thousand on the path, opening Library and Student Center. Same spend, two newly reachable destinations versus one.

## 1:40–2:00 · Show why the repairs belong together

*[Under **Test this combination**, click **Omit A**. Pause on **0** newly reachable destinations, then click **Restore recommendation** and point to the two routes when they return.]*

> What if we fund just the path? Take out the ramp and both destinations are still blocked. Put it back and both routes return. That’s why these jobs belong in the same funding request.

## 2:00–2:13 · Show the $20,000 tie

*[Click **$20,000**. Wait for both cards to show **3**. Point to the totals, then click **$10,000** to return to the recommendation.]*

> At twenty thousand, both plans can fund all three repairs. Both reach three new destinations.

## 2:13–2:28 · Benchmark result

*[Hold on the **$10,000 Recommended investment** brief while delivering the benchmark line.]*

> Across thirty other synthetic networks and four budgets each, Curb’s plan made more destinations reachable than condition-first in fifty-eight of a hundred and twenty cases. The other sixty-two tied.

**Benchmark caption for a backup visual**

30 authored synthetic networks / 120 budget cases / 58 wins and 62 ties versus condition-first.

## 2:28–2:49 · Close on the decision brief

*[Point to **Recommended investment** at **$10,000** and leave the brief visible.]*

> A facilities director can bring this brief to a budget meeting and explain which jobs belong together. Next, we’d walk one real corridor with disabled campus users and facilities staff, measure the route, and get repair quotes.

## 2:49–3:00 · Recovery time

End at the close if the flow is on time. Use the spare seconds for a delayed click or a tab switch.

- If playback stalls, show the verified close-up and say, “Here’s the source frame from our Robertson footage.” Continue with the review if the controls respond.
- If Accept fails, say, “The review hasn’t gone through. Here’s where we’d start the inspection.” Open the preloaded Investment tab.
- If a comparison stalls, switch to the preloaded **$10,000** tab. If both tabs fail, use the accepted rehearsal backup and say, “Here’s the recorded synthetic comparison.”

## Rehearsal for Vincent

Once the checker confirms the production presenter revision, run the full pitch twice on the presentation laptop at the intended browser zoom and viewport. Start the first run from a fresh page. For the second, use **Restart presenter demo**, verify **0 accepted · 5 pending · 0 rejected**, and clear the retained reviewer name so you can enter it again. Reset Investment to **$10,000** and **Before repairs** for both runs.

Use a stopwatch from the first spoken word through the close, including clicks and waits. Record the production SHA, viewport, both elapsed times, and any stalls at Accept or during the budget changes. Aim to finish from **2:45 to 2:55**, with **3:00** as the hard limit. Save a recording or screenshots of the accepted flow for recovery. [Released presenter source and checks](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6892885391)

## Presenter notes

- **Opening statistic.** The figure is from the University of Waterloo’s April 2023 survey of its campus community, in the subgroup of 161 respondents with disabilities. Use the 69 percent line only for that subgroup. [University of Waterloo survey, pp. 130–133](https://uwaterloo.ca/accessibility/sites/default/files/uploads/documents/2023-08-28-inclusive-physical-space-framework_-final_0.pdf)
- **Budget context for questions.** Gordian’s 2026 North American higher-ed report put capital funding for existing buildings at 73.5% of the level it estimated would keep the backlog from growing. [Gordian campus facilities benchmark](https://www.gordian.com/press/capital-renewal-backlog-rises-higher-education-report/)
- **Benchmark scope.** The independent audit reproduced 120 budget cases across 30 authored synthetic networks. The separate Investment example was excluded from the aggregate. Curb led condition-first in 58 cases and tied in 62, including every full-budget case. The mean gap was 0.81 additional modeled destinations per case at the same assumed budget. In the $10,000 Investment example, cheapest-first also picks A+B. [Approved claims](https://github.com/oliverchennn/Curb/blob/deb9c7ccecbbe50491edeac75d98693f617c2fda/docs/evaluation/METRICS_CLAIMS.md) · [Verification receipt](https://github.com/oliverchennn/Curb/blob/a8d0a4229285cea65989d92fe7df6decbcb0aff9/docs/evidence/metrics/2026-11-15-suite-v1/verification.md)
