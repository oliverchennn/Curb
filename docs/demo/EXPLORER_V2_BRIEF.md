# Explorer v2: combined implementation brief

Root reviewed Landau's complete [independent proposal](EXPLORER_UPGRADE_PROPOSAL.md), released at 85769f4, against root list A. Assignment [6885741592](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6885741592) gives Landau implementation ownership on an isolated branch from main16f5444.

The selected concept is **one large stage, three evidence modes**: known archive geometry gets the map, real unplaced field records get the large photo/clip viewer, and conflicting synthetic records get equal side-by-side presentation. The strongest evidence should occupy the center rather than a small thumbnail beside an empty map.

| Idea | Combined decision | Reason |
| --- | --- | --- |
| Root map-led workspace + Landau adaptive stage | Keep together | Mapped and unplaced evidence both get a useful primary view. |
| Root linked selection + Landau numbered stops | Keep | Map, reel and detail stay connected; numbers use stable source order, not chronology. |
| Landau visual uncertainty | Add | Archive ASSUMED/EXISTING styles, a legend and unplaced tray make the data limits readable. |
| Both readable reel and overview cards | Keep | Existing type/status/geometry and real coverage counts give the collections distinct identities. |
| Landau direct review link | Promote to required | Root implements validated ?finding= selection/seek so real evidence leads to its exact review frame. |
| Archive attribute row | Promote to required | Existing material/type/capture metadata makes archive records more informative without inventing data. |
| Extra compare view and automatic reel | Drop | They crowd the core demonstration and add motion/state complexity. |
| Automatic guided tour and redundant filters | Defer | A clear manual 85-second story is sufficient; existing search/type filters and the tray expose the records. |

Landau controls composition, detailed styling and interactions within the assigned explorer paths. The desktop goal is a roughly420–480px stage at1366 and600–640px at1920, adjusted so main evidence and useful controls fit rather than shrinking type to meet a rigid size. At390, deliberate Stage/Collections/Evidence navigation preserves all actions and44px targets. Root owns the survey deep link; Vincent owns the rover; Dev D owns budget clarity.

The demo sequence is: collection overview → Nassau archive/ASSUMED ramp and unplaced tray → Robertson Defect02 large photo/clip → equal conflict pair → review the matching finding. All assets remain local. Original geometry/IDs, labeled evidence kinds, meaningful dates/Unknown, unknown traversal and attachment-only review semantics are mandatory. No invented route connectivity or per-defect coordinates.

Acceptance requires real browser coverage of every new control, focus/keyboard, reduced motion, URL restoration, media lifecycle, empty filters, offline assets and representative desktop/mobile screenshots, plus meaningful model tests and the integrated build. The exact assignment and [integration gates](VISUAL_UPGRADE_ACCEPTANCE.md) govern merge/deployment.
