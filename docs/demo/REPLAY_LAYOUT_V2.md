# Larger survey replay

User requested removal of the oversized footer banner shown in their screenshot, a larger left video/review area and a correspondingly narrower right workspace. Root changed only SurveyWorkspace.tsx and its shared CSS; Dev D separately owns plan presentation and a new dedicated stylesheet.

Product commits: 06d3e82 and 8e81089. The removed banner is exactly the paragraph starting “AI-assisted findings from one walk-through video.” Evidence review status, unknown measurements, site context and plan pricing limitations remain in their relevant controls/cards.

Desktop columns now use 47.5% / 52.5% of available space. At 1366×768, Chrome measured the left panel at 608.95px and the right at 673.05px, with the portrait video 281.25×500px (previous video height 420px). At 1920×1080 the panels are 769.5px / 850.49px and the portrait image is 450×800px (previous height 720px). The inline finding-shortcut row keeps all five 44px buttons visible at the bottom of the sticky evidence column. An initial 528px frame put their lower halves below a short viewport; the final 500px frame and one-line shortcut row resolve that actual Chrome finding.

A production build passed. Actual Chrome checks on 1366, 1920 and 390px showed no horizontal overflow. All five shortcuts sought 7, 9.5, 12, 6 and 13.933333 seconds respectively, including backward seeking; Defect 05 retained its final-frame box. Original removed the live boxes; Annotated loaded annotated.mp4; Review restored overlays at the same 13.933333-second position. Mobile tabs retained a $500 budget while switching away and back. No console warnings/errors were recorded; viewport overrides were reset. Screenshot: ignored .curb-local/hardening/replay-larger-desktop.png; build receipt: replay-layout-build.txt.

This is local candidate evidence, not a new public deployment claim. The user also assigned B rover graphics/cameras, C an independent explorer proposal, and D budget clarity; those tasks require separate review and integration.
