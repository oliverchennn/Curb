# Campus photo evidence

CURB-PHOTO-MAP/2 continues the existing photo layer in `codex/campus-photo-map`.
Pinned base `572c91657b8d35c59c5199258e0fb6f57bb17788`, tree
`36d83fe932ecff60cd75e81debfc1eba80d5c4ba`.
[Assignment](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6890856049) ·
[Resume ACK](https://github.com/oliverchennn/Curb/issues/1#issuecomment-6890916769).

The initial projection includes six supplied images at five reviewed camera
viewpoints. The full selected product inventory contains 22 distinct JPEGs
and 24 distinct historical findings in 26 records. Ten records share the five
camera viewpoints. Sixteen records stay in location review and retain a
representative image. Two of the 26 records present alternate-date images
for findings already counted. All 24 finding positions remain unverified.

Each square uses the archived camera position. The map can offset a square
from a crowded location and draw a leader to the source position. Records at
the same viewpoint can be opened from the selected photo panel and the
keyboard-accessible inventory. Unplaced records use the inventory alone.
No triangle or octagon is placed for this dataset because the review
established zero precise finding positions. Historical observations leave
current traversal Unknown.

The project owner confirmed licensed use of the supplied files for the
product in the assignment above. The panel preserves original archive
credits and marks the basis of image use as owner-confirmed. The source
provider and specific license terms remain independently unverified. Archive
months appear at the precision supplied. The conflicting June 2011 and
September 2017 claims for the west residential approach are available side
by side, with the supplement capture date shown as Unknown. Source
retrieval dates remain Unknown.

Only selected JPEGs and public evidence fields enter the product. The
private projection receipt pins the immutable review checkpoint and
per-image archive member, dimensions and SHA-256. All 22 files match the
supplied source bytes and total 5,242,325 bytes. Inspection found JFIF
headers without EXIF, XMP or comment metadata.

Verification on 2026-11-15, Windows, Node v24.12.0:

- `npm.cmd run check` passed TypeScript, 877 tests in 36 files, and a
  production webpack build. An initial sandboxed attempt could not read
  Vitest worker cache files in its temporary directory. The repeated check
  succeeded with the same source in the isolated checkout.
- Production Chrome at 1366 × 768 opened the actual Nassau Hall image
  on the Campus overview and the McCosh Walk image from section C07.
  C07 displayed all five viewpoints at its default fit. Selecting an
  alternate frame at the same camera kept the selected square visible.
- Chrome at 390 × 844 restored a C07 photo URL with no horizontal overflow.
  The inventory opened an unplaced photo with no selection pin, the
  selected photo heading took keyboard focus, and Escape returned focus to
  Browse photos. Layer-off survived reload and Reset restored the default.
- The photo panel showed the missing-image message when one JPEG was
  temporarily withheld. The file was restored, decoded after reload, and
  verified byte for byte. All 22 loopback image URLs returned the expected
  source bytes.
- The Campus map displayed 1,188 ways, 22 sections, and 333 archive points
  (329 eligible and four in location review). The download matched the
  accepted 952,412-byte attachment at SHA-256
  `9262bbd2781c20d7be83a3645dc6de1fbca2f34b04cd56d7dc5a33ecd2b20868`.

The exact local checkpoint, branch publication outcome and release
handoff are recorded separately. Merge and deployment belong to the
assigned integration and release owners.
