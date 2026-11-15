type Pt = [number, number];
/** Orientation label beside an archive line that names the street: offset perpendicular toward `side`
 *  (a rough direction vector in SVG space) and optionally slid along the street. Never moves geometry. */
export function streetLabel(a: Pt, b: Pt, side: Pt, offset: number, along = 0): { x: number; y: number; rotate: number } {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len, ny = dx / len;
  if (nx * side[0] + ny * side[1] < 0) { nx = -nx; ny = -ny; }
  let rotate = Math.atan2(dy, dx) * 180 / Math.PI;
  if (rotate > 90) rotate -= 180; else if (rotate <= -90) rotate += 180;
  const ux = dx / len, uy = dy / len;
  return { x: (a[0] + b[0]) / 2 + nx * offset + ux * along, y: (a[1] + b[1]) / 2 + ny * offset + uy * along, rotate };
}

/** Screen-space placement for numbered stop badges. Anchors (real geometry) never move; only
 *  badges are offset, and an offset badge gets a leader line back to its anchor. */
export type BadgeAnchor = { id: string; x: number; y: number; dy: number };
export type BadgePlacement = { x: number; y: number; moved: boolean };

const ANGLES = [-90, -45, -135, 0, 180, -20, -160, 45, 135, 90];

/** `markers` are clickable point markers (with their owning id): a badge never covers another stop's marker. */
export function placeBadges(anchors: BadgeAnchor[], radius: number, markers: { id: string; x: number; y: number }[] = []): Map<string, BadgePlacement> {
  const placed: { x: number; y: number }[] = [];
  const out = new Map<string, BadgePlacement>();
  const minGap = radius * 2.25, clearance = radius * 1.9;
  const free = (x: number, y: number, own: string) => placed.every(p => Math.hypot(p.x - x, p.y - y) >= minGap)
    && markers.every(m => m.id === own || Math.hypot(m.x - x, m.y - y) >= clearance);
  for (const a of anchors) {
    let spot: BadgePlacement = { x: a.x, y: a.y + a.dy, moved: false };
    if (!free(spot.x, spot.y, a.id)) {
      search: for (const ring of [2.6, 3.7, 4.8, 6]) {
        for (const deg of ANGLES) {
          const t = deg * Math.PI / 180, x = a.x + Math.cos(t) * radius * ring, y = a.y + Math.sin(t) * radius * ring;
          if (free(x, y, a.id)) { spot = { x, y, moved: true }; break search; }
        }
      }
      // Dense fallback: stack above the anchor rather than hiding the number.
      if (!spot.moved) spot = { x: a.x, y: a.y + a.dy - placed.length * minGap * 0.6, moved: true };
    }
    placed.push(spot); out.set(a.id, spot);
  }
  return out;
}
