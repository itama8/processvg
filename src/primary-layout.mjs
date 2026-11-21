import { identityRow, placeIdentity } from "./instrument-ink.mjs";

export const linePath = (points) => "M" + points.map((point) => point.join(" ")).join(" L");
export const boxAt = ([x, y], rx, ry = rx) => [x - rx, y - ry, x + rx, y + ry];
export const expand = (box, n) => box.map((v, i) => v + (i < 2 ? -n : n));
export const boundsOf = (points) => [
  Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y)),
  Math.max(...points.map(([x]) => x)), Math.max(...points.map(([, y]) => y)),
];
export const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const isBox = (b) => Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[0] <= b[2] && b[1] <= b[3];
const center = (b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
const meets = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const inside = (a, b) => a[0] >= b[0] && a[1] >= b[1] && a[2] <= b[2] && a[3] <= b[3];
const segments = (points) => points.slice(1).map((p, i) => [points[i], p]);

function segmentHits([a, b], rect) {
  let start = 0, end = 1;
  for (let i = 0; i < 2; i++) {
    const delta = b[i] - a[i];
    if (delta === 0) {
      if (a[i] < rect[i] || a[i] > rect[i + 2]) return false;
    } else {
      const t0 = (rect[i] - a[i]) / delta, t1 = (rect[i + 2] - a[i]) / delta;
      start = Math.max(start, Math.min(t0, t1));
      end = Math.min(end, Math.max(t0, t1));
    }
  }
  return start <= end;
}

function segmentsMeet([a, b], [c, d], clearance) {
  const cross = ([x, y], [u, v], [p, q]) => (u - x) * (q - y) - (v - y) * (p - x);
  if (meets(boundsOf([a, b]), boundsOf([c, d])) &&
      cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0) return true;
  const distance = ([x, y], [u, v], [p, q]) => {
    const dx = p - u, dy = q - v;
    const t = Math.max(0, Math.min(1, ((x - u) * dx + (y - v) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - u - t * dx, y - v - t * dy);
  };
  return [distance(a, c, d), distance(b, c, d), distance(c, a, b), distance(d, a, b)].some((n) => n <= clearance);
}

const sides = ["right", "left", "above", "below"];
const directions = [[1, 0], [-1, 0], [0, -1], [0, 1]];
const faces = [2, 0, 1, 3];

export function layoutAnalyte(instance, display, occupied) {
  const { id, assetId, identityGlyph, identityStyle, installation } = instance.metadata;
  const style = identityStyle ?? display.identityStyle ?? "outlined";
  const { bounds, attachmentBounds, scale } = instance;
  const { fontSize = 6.5, renderScale = 1, clearance = 1.5, sheetBounds, avoidBounds = [],
    avoidRoutes = [], reservedBounds = [], avoidAnchors = [], measureInk } = display;
  if (!["outlined", "unboxed"].includes(style) || !(fontSize >= 6.5) || !(renderScale > 0) || !(clearance >= 1) ||
      ![fontSize, renderScale, clearance].every(Number.isFinite) || (sheetBounds !== undefined && !isBox(sheetBounds)) ||
      ![...avoidBounds, ...reservedBounds].every(isBox) || !avoidAnchors.every(isPoint) ||
      !avoidRoutes.every((route) => Array.isArray(route) && route.length >= 2 && route.every(isPoint))) {
    throw new RangeError("Invalid analyte layout constraints");
  }
  // Outline glyphs and layout use the same font metrics, including the subscripts.
  const inkSize = Math.max(fontSize * scale, 6.5 / renderScale);
  const row = identityRow(identityGlyph, inkSize, measureInk);
  const outlined = style === "outlined";
  const padding = outlined ? 1.7 : 0;
  const extent = [row.halfWidth + padding, row.halfHeight + padding];
  const ownAnchors = [...instance.interfaces.map(({ point }) => point), ...(instance.sensing ? [instance.sensing.origin] : [])];
  const boxes = [
    ...occupied.boxes.map((item) => [item.kind, item.bounds]),
    ...avoidBounds.map((b) => ["equipment-or-text", b]),
    ...reservedBounds.map((b) => ["reserved-zone", b]),
    ...[...ownAnchors, ...avoidAnchors].map((p) => ["anchor", boxAt(p, clearance)]),
  ];
  const routes = [...occupied.routes, ...avoidRoutes.flatMap(segments)];
  const candidates = [];
  for (const offset of [0, 4, 8, 16, 24, 36]) {
    for (const [order, side] of sides.entries()) {
      const axis = order < 2 ? 0 : 1, normal = directions[order][axis], face = faces[order];
      const attach = center(attachmentBounds);
      attach[axis] = attachmentBounds[face];
      const label = [...attach];
      label[axis] = bounds[face] + normal * (clearance + 1 + extent[axis] + offset);
      const box = boxAt(label, ...extent);
      const leaderEnd = [...label];
      leaderEnd[axis] -= normal * extent[axis];
      // An unboxed glyph has typographic space at the end of its leader.
      if (!outlined) leaderEnd[axis] -= normal * 0.8;
      // Cabinet/cell stems can make a no-leader label visually ambiguous.
      const leader = outlined || offset > 0 || (axis === 0 && ["cell", "cabinet"].includes(installation))
        ? [attach, leaderEnd] : undefined;
      const association = [attach, leaderEnd];
      const conflicts = new Set();
      const padded = expand(box, clearance / 2);
      if (meets(padded, bounds)) conflicts.add("body");
      if (ownAnchors.some((p) => meets(padded, boxAt(p, clearance)))) conflicts.add("anchor");
      if (sheetBounds && (!inside(padded, sheetBounds) || (leader && !inside(boundsOf(leader), sheetBounds)))) {
        conflicts.add("sheet-boundary");
      }
      for (const [kind, obstacle] of boxes) {
        if (meets(padded, obstacle) || segmentHits(association, expand(obstacle, clearance / 2))) conflicts.add(kind);
      }
      if (routes.some((segment) => segmentHits(segment, padded) || segmentsMeet(association, segment, clearance))) {
        conflicts.add("route");
      }
      candidates.push({ side, order, box, label, offset, leader, conflicts: [...conflicts],
        length: leader ? Math.abs(leaderEnd[axis] - attach[axis]) : 0,
        displacement: Math.hypot(...label.map((v, i) => v - center(bounds)[i])) });
    }
    if (candidates.some(({ conflicts }) => !conflicts.length)) break;
  }

  candidates.sort((a, b) => Number(a.conflicts.includes("sheet-boundary")) - Number(b.conflicts.includes("sheet-boundary")) ||
    a.conflicts.length - b.conflicts.length ||
    Math.round(a.length * 1e6) - Math.round(b.length * 1e6) ||
    Math.round(a.displacement * 1e6) - Math.round(b.displacement * 1e6) || a.order - b.order);
  const { side, box, label, offset, leader, conflicts } = candidates[0];
  const ink = { ...placeIdentity(row, label), analyteIdentity: { id, assetId, conflicts } };
  const shapes = [
    ...(leader ? [{ d: linePath(leader) }] : []),
    ...(outlined ? [{ d: linePath([[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]]) + " Z" }] : []),
    ink,
  ];
  return { shapes, layout: { id, assetId, style, side, offset, box, inkBounds: ink.bounds, inkSize,
    leader, conflicts, status: conflicts.length ? "conflict" : "placed" } };
}
