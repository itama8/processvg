import { placePoint } from "./geometry.mjs";
import { stableId } from "./primary-elements.mjs";
import { isPoint } from "./primary-layout.mjs";

export const SCREENING_PHYSICAL_VIEWS = ["plan", "section", "elevation"];
const axes = { plan: ["length", "width"], section: ["length", "depth"], elevation: ["width", "height"] };
const roles = { outline: "primary", equipment: "primary", access: "secondary", waterline: "secondary", guide: "secondary" };
const clean = (number) => Number(number.toPrecision(12));
const path = (points, closed = false) => points.map((p, i) => (i === 0 ? "M" : "L") + p.map(clean).join(" ")).join(" ") + (closed ? " Z" : "");

/** Project engineering-input geometry. These features have no schematic interface identity. */
export function screeningPhysical(view, physical, at) {
  const { unit, source, datum, unitsPerMetre, projections } = physical ?? {};
  const { features, dimensions } = projections?.[view] ?? {};
  if (!["m", "mm"].includes(unit) || !stableId(source) || !stableId(datum) ||
      !Number.isFinite(unitsPerMetre) || unitsPerMetre <= 0 ||
      !Array.isArray(features) || !features.some(({ type } = {}) => type === "outline") ||
      !Array.isArray(dimensions) || dimensions.length !== 2) {
    throw new RangeError("Screening physical view requires source, datum, units, sheet scale, outline and two explicit dimensions");
  }
  const s = at.s * unitsPerMetre / (unit === "mm" ? 1000 : 1);
  const world = (point) => {
    const placed = placePoint(point, { ...at, s });
    if (!placed.every(Number.isFinite)) throw new RangeError("Screening physical projection exceeds numeric range");
    return placed;
  };
  const shapes = features.map(({ type, points, circle, closed = false }) => {
    if (!Object.hasOwn(roles, type) || typeof closed !== "boolean") throw new RangeError("Invalid screening physical feature");
    const role = roles[type];
    if (circle !== undefined) {
      const { center, radius } = circle ?? {};
      if (points !== undefined || closed || !isPoint(center) || !Number.isFinite(radius) || radius <= 0 ||
          !Number.isFinite(radius * s) || radius * s <= 0) throw new RangeError("Invalid screening physical circle");
      return { c: [...world(center).map(clean), clean(radius * s)], role };
    }
    if (!Array.isArray(points) || points.length < (closed ? 3 : 2) || !points.every(isPoint)) {
      throw new RangeError("Invalid screening physical polyline");
    }
    return { d: path(points.map(world), closed), role };
  });
  const evidence = dimensions.map(({ name, from, to, offset }, axis) => {
    const cross = 1 - axis;
    if (name !== axes[view][axis] || !isPoint(from) || !isPoint(to) || from[cross] !== to[cross] ||
        from[axis] >= to[axis] || !Number.isFinite(offset) || offset === 0) {
      throw new RangeError(`Expected explicit ${axes[view][axis]} dimension witnesses and offset`);
    }
    const shift = (point) => point.map((value, i) => i === cross ? value + offset : value);
    const a = world(shift(from)), b = world(shift(to));
    // Plotter's dimension role, with the approved geometry: Plotter's helper fixes an 8-unit slash,
    // which swamps assets drawn at a few units per metre, so these keep their 4-unit slashes.
    shapes.push({ d: [path([world(from), a]), path([world(to), b]), path([a, b])].join(" "), role: "dimension" });
    const ticks = [a, b].map(([x, y]) => path([[x - 2, y + 2], [x + 2, y - 2]]));
    shapes.push({ d: ticks.join(" "), role: "dimension" });
    const value = clean(to[axis] - from[axis]);
    const vertical = (at.q + axis) % 2 === 1;
    const witness = world(from);
    const outward = Math.sign(a[vertical ? 0 : 1] - witness[vertical ? 0 : 1]);
    shapes.push({ t: [(a[0] + b[0]) / 2 + (vertical ? 6 * outward : 0),
      (a[1] + b[1]) / 2 + (vertical ? 3 : outward > 0 ? 13 : -5), `${value} ${unit}`],
    align: vertical ? (outward > 0 ? "start" : "end") : "middle" });
    return { name, from: [...from], to: [...to], value, unit };
  });
  return { shapes, dimensions: evidence, physicalBasis: { unit, source, datum, unitsPerMetre, view,
    status: "illustrative projection of supplied engineering inputs" } };
}
