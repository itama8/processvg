import { place, placePoint, round } from "./geometry.mjs";
import { stableId } from "./primary-elements.mjs";
import { dimension as plotterDimension } from "../vendor/plotter/assets/foundation/index.mjs";

const point3 = (point) => Array.isArray(point) && point.length === 3 && point.every(Number.isFinite);
const positive = (value) => Number.isFinite(value) && value > 0;
const box = ([x, y], w, h, role = "primary") => ({
  d: `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`, role,
});
const segment = ([x, y], [u, v]) => ({ d: `M${x} ${y} L${u} ${v}`, role: "secondary" });
const label = (x, y, value) => ({ t: [x, y, value], rotateAnchor: true, verticalCenter: true });
// Sheet-space spacing for envelope dimensions; Plotter's helper owns the slash geometry.
const DIMENSION = { offset: 14, gap: 3, overshoot: 3, label: 8 };

/**
 * An envelope dimension through Plotter's `dimension()` helper, built in drawing space so the slash
 * extent stays Plotter's at any placement scale. `a`, `b` are local witnesses; `away` is the local
 * unit vector pointing out of the envelope.
 */
function dimension(a, b, away, text, at) {
  const [pa, pb] = [a, b].map((point) => placePoint(point, at));
  const out = placePoint(away, { q: at.q });
  const axis = Math.abs(pa[0] - pb[0]) > Math.abs(pa[1] - pb[1]) ? "x" : "y";
  const along = axis === "x" ? 0 : 1, across = 1 - along;
  const position = pa[across] + out[across] * DIMENSION.offset;
  const middle = (pa[along] + pb[along]) / 2, beside = position + out[across] * DIMENSION.label;
  const anchor = axis === "x" ? [middle, beside] : [beside, middle];
  const { witnessD, lineD, slashD } = plotterDimension({
    axis, witnesses: [pa, pb].sort((p, q) => p[along] - q[along]), position,
    extensions: { gap: DIMENSION.gap, overshoot: DIMENSION.overshoot }, label: { text, anchor },
  });
  const align = axis === "x" ? "middle" : out[0] < 0 ? "end" : "start";
  return [witnessD, lineD, slashD].map((d) => ({ d, role: "dimension" }))
    .concat({ t: [...anchor.map(round), text], verticalCenter: true, align });
}

/** Project an explicitly supplied envelope, installation features and interfaces. */
export function pumpPhysical(view, input, ports, at, { unitsPerDrawingUnit = 1, sectionY } = {}) {
  if (!["plan", "section", "electrical"].includes(view) || !positive(unitsPerDrawingUnit)) {
    throw new RangeError("Invalid pump physical view or drawing scale");
  }
  if (!input) return { status: "illustrative", shapes: place([label(0, 0, "Dimensions unavailable")], at), interfaces: [] };
  const { basis, source, unit, envelope, features = [], interfaces = {} } = input;
  if (!["illustrative", "dimensioned"].includes(basis) || (basis === "dimensioned" && !stableId(source)) ||
      !["mm", "m", "in", "ft"].includes(unit) || !point3(envelope) || !envelope.every(positive) ||
      !Array.isArray(features)) throw new RangeError("Physical views require explicit units, envelope and dimension basis");
  const [length, width, height] = envelope;
  const cut = sectionY ?? width / 2;
  if (!Number.isFinite(cut) || cut < 0 || cut > width) throw new RangeError("Section plane must intersect the equipment envelope");
  const scale = (value) => value / unitsPerDrawingUnit;
  const plan = view === "plan";
  const project = ([x, y, z]) => plan ? [scale(x), scale(y)] : [scale(x), scale(height - z)];
  const [w, h] = [scale(length), scale(plan ? width : height)];
  const shapes = [box([0, 0], w, h)];
  const names = new Set();
  for (const { id, kind, origin, size } of features) {
    if (!stableId(id) || names.has(id) || !point3(origin) || !point3(size) ||
        !size.every((value) => value >= 0) || size.every((value) => value === 0)) {
      throw new RangeError("Invalid physical feature geometry");
    }
    names.add(id);
    if (view === "electrical" ? !["electrical-power", "control-signal"].includes(kind)
      : !plan && (cut < origin[1] || cut > origin[1] + size[1])) continue;
    const start = plan ? project(origin) : project([origin[0], origin[1], origin[2] + size[2]]);
    const dx = scale(size[0]), dy = scale(plan ? size[1] : size[2]);
    if (dx && dy) shapes.push(box(start, dx, dy, "secondary"));
    else if (dx || dy) shapes.push(segment(start, [start[0] + dx, start[1] + dy]));
  }
  const available = [];
  for (const [id, point] of Object.entries(interfaces)) {
    const port = ports.find((candidate) => candidate.id === id);
    if (!port || !point3(point)) throw new RangeError(`Invalid physical interface ${id}`);
    if (view === "electrical" ? !["electrical-power", "control-signal"].includes(port.kind) :
      !plan && point[1] !== cut) continue;
    const anchor = project(point);
    shapes.push({ c: [...anchor, 1.5] });
    available.push({ ...port, location: [...point], point: placePoint(anchor, at).map(round), visible: true });
  }
  const padding = 1 / (at.s ?? 1);
  const dimensions = [...dimension([0, h], [w, h], [0, 1], `${length} ${unit}`, at),
    ...dimension([0, 0], [0, h], [-1, 0], `${plan ? width : height} ${unit}`, at)];
  const notes = basis === "illustrative" ? [label(w / 2, h + 42 * padding, "Illustrative dimensions")] : [];
  return {
    status: basis, source, unit, ...(plan ? {} : { sectionY: cut }),
    shapes: [...place(shapes, at), ...dimensions, ...place(notes, at)], interfaces: available,
  };
}
