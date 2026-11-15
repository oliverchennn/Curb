type Pt = [number, number];
export type BadgeBounds = { left: number; top: number; right: number; bottom: number };
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
export function placeBadges(
  anchors: BadgeAnchor[], radius: number, markers: { id: string; x: number; y: number }[] = [],
  bounds?: BadgeBounds,
): Map<string, BadgePlacement> {
  const placed: { x: number; y: number }[] = [];
  const out = new Map<string, BadgePlacement>();
  const minGap = radius * 2.25, clearance = radius * 2;
  for (const a of anchors) {
    const keepInPlot = bounds && a.x >= bounds.left && a.x <= bounds.right && a.y >= bounds.top && a.y <= bounds.bottom;
    const free = (x: number, y: number) => (
      !keepInPlot || (x - radius >= bounds.left && x + radius <= bounds.right
        && y - radius >= bounds.top && y + radius <= bounds.bottom)
    ) && placed.every(p => Math.hypot(p.x - x, p.y - y) >= minGap)
      && markers.every(m => m.id === a.id || Math.hypot(m.x - x, m.y - y) >= clearance);
    let spot: BadgePlacement = { x: a.x, y: a.y + a.dy, moved: false };
    if (!free(spot.x, spot.y)) {
      search: for (const ring of [2.6, 3.7, 4.8, 6]) {
        for (const deg of ANGLES) {
          const t = deg * Math.PI / 180, x = a.x + Math.cos(t) * radius * ring, y = a.y + Math.sin(t) * radius * ring;
          if (free(x, y)) { spot = { x, y, moved: true }; break search; }
        }
      }
      // Preserve the full hit area at the plot edge even when all preferred positions are occupied.
      if (!spot.moved && keepInPlot) {
        spot = {
          x: Math.min(bounds.right - radius, Math.max(bounds.left + radius, a.x)),
          y: Math.min(bounds.bottom - radius, Math.max(bounds.top + radius, a.y + a.dy)),
          moved: true,
        };
      }
    }
    placed.push(spot); out.set(a.id, spot);
  }
  return out;
}
