import { placePoint } from "./geometry.mjs";
import { composeEquipment } from "./gates.mjs";
import { primaryPlacement, stableId } from "./primary-elements.mjs";
import { linePath } from "./primary-layout.mjs";

// A single, dimensionless drawing record. Station and z values are drawing coordinates.
const conceptualFlume = [
  { x: -46, width: 38, invert: 0 }, { x: -13, width: 16, invert: 0 },
  { x: 12, width: 16, invert: -8 }, { x: 46, width: 31, invert: -2 },
];
const weirs = ["weir", "weir-v-notch", "weir-rectangular", "weir-trapezoidal", "weir-serrated", "gate-weir-adjustable"];
const path = (points, role) => ({ d: linePath(points), ...(role && { role }) });
const text = (point, label, align) => ({ t: [...point, label], ...(align && { align }) });

export function measurementView(config, at = {}, display = {}) {
  const { type, measurement } = config;
  const { view = "schematic", scale, waterLevel } = display;
  if (!["schematic", "plan", "section"].includes(view)) throw new RangeError("Unknown measuring structure view");
  const placement = primaryPlacement(at);
  const { q, s } = placement;
  if (view === "section" && q !== 0) throw new RangeError("Longitudinal sections keep gravity upright");
  if (type === "fe-flume") {
    if (view === "schematic") throw new RangeError("Use placeSymbol for the archived flume schematic");
    if ([config.physical, measurement, scale, waterLevel].some((value) => value !== undefined)) {
      throw new RangeError("The conceptual flume accepts only graphical placement");
    }
    const world = (p) => placePoint(p, placement);
    const shapes = view === "plan"
      ? [-1, 1].map((side) => path(conceptualFlume.map(({ x, width }) => world([x, side * width / 2]))))
      : [path(conceptualFlume.map(({ x, invert }) => world([x, -invert])))];
    const captionY = placement.y + (q % 2 ? 46 : 30) * s + 12;
    shapes.push(path([world([-40, -29]), world([40, -29])], "secondary"),
      path([[33, -32], [40, -29], [33, -26]].map(world), "secondary"),
      text([placement.x, captionY], "Conceptual flume"),
      text([placement.x, captionY + 12], "not calibrated"));
    return { shapes, ports: [], interfaces: [], metadata: { type, view, orientation: q * 90, basis: "conceptual" } };
  }
  if (!weirs.includes(type)) throw new RangeError(`Unknown measuring structure: ${type}`);
  if (view === "schematic") return composeEquipment(config, placement, display);
  if (display.levels !== undefined) throw new RangeError("Supply the water level in the measuring weir datum");
  const { station, datum, source } = measurement ?? {};
  if (!Number.isFinite(station) || station >= 0 || !stableId(source) || !stableId(datum?.id) ||
      datum?.unit !== "m" || ![datum?.invertRL, datum?.headZeroRL].every(Number.isFinite) ||
      (waterLevel !== undefined && (view !== "section" || !Number.isFinite(waterLevel)))) {
    throw new RangeError("A measuring weir needs an upstream station in metres, explicit invert and head-zero datum, and source");
  }
  const geometry = composeEquipment({ ...config, id: null, tag: null }, placement, display);
  const { upstream, width } = geometry.physical;
  if (station < -upstream) throw new RangeError("Head station is outside the modelled upstream approach");
  const world = (p) => placePoint(p, { ...placement, s: s * scale });
  const headZero = datum.headZeroRL - datum.invertRL;
  const point = world([station, view === "plan" ? 0 : -headZero]);
  const shapes = [...geometry.shapes];
  if (view === "plan") {
    shapes.push({ ...path([world([station, -width / 2]), world([station, width / 2])], "secondary"), dash: "3 2" },
      { c: [...point, 2] });
  } else {
    shapes.push({ c: [...point, 2] }, path([[point[0] - 5, point[1]], [point[0] + 5, point[1]]], "secondary"));
    if (waterLevel !== undefined) {
      const y = datum.invertRL - waterLevel;
      shapes.push(path([world([-upstream, y]), world([0, y])], "secondary"));
      const [x, labelY] = world([-upstream, y]);
      shapes.push(text([x, labelY - 6], `Input water level RL ${waterLevel} m`, "start"));
    }
  }
  const mark = view === "plan" ? world([station, -width / 2]) : point;
  const annotateLeft = view === "plan" && q === 3;
  const captionY = Math.max(geometry.bounds.bottom, point[1]) + 18;
  shapes.push(text([mark[0] + (annotateLeft ? -7 : 7), mark[1] + (view === "section" ? 10 : -7)], "H", annotateLeft ? "end" : "start"),
    text([placement.x, captionY], `H station ${station} m`),
    text([placement.x, captionY + 13], `Head zero RL ${datum.headZeroRL} m · ${datum.id}`));
  return { ...geometry, shapes, interfaces: [], headReference: { station, datum: { ...datum }, point, source },
    metadata: { ...geometry.metadata, id: config.id ?? null, tag: config.tag ?? null, waterLevel } };
}
