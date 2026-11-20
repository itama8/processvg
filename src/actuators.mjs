// Schematic actuator geometry. Mounts and modifier attachments are drawing anchors.
import { place, placePoint, round } from "./geometry.mjs";

const path = (d, role) => role ? { d, role } : { d };
const point = (value) => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
const turn = (q) => (q % 4 + 4) % 4;
const axes = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const verification = "Exact geometry not standards-verified";
const approved = { designApproval: "User-approved Family 03 design", verification };
const leftRight = ([l, t, r, b]) => [[l, t], [r, t], [r, b], [l, b]];
const bbox = (points, pad = 0) => ({
  left: Math.min(...points.map(([x]) => x)) - pad,
  right: Math.max(...points.map(([x]) => x)) + pad,
  top: Math.min(...points.map(([, y]) => y)) - pad,
  bottom: Math.max(...points.map(([, y]) => y)) + pad,
});

const proposed = [{ std: "Processvg design", ref: "Family 03" }];
const referenced = (ref) => [...(ref ? [{ std: "IS 3232", ref }] : []), { std: "B&C", ref: "P-002" }];
const font = { family: "sans-serif", size: 10, weight: 400 };
const text = (letter, y, fit, legacyBaseline) => ({ letter, y, fit, legacyBaseline });
const cylinder = () => [path("M-7 -14 L7 -14 L7 0 L-7 0 Z M-7 -5 L7 -5 M0 -5 L0 0")];

const heads = [
  ["hand-t", "Manual T operator", "hand", "manual", 10, [-5, 0, 5, 0],
    () => [path("M-5 0 L5 0")], null, referenced()],
  ["handwheel", "Manual handwheel", "handwheel", "manual", 10, [-8, -3, 8, 3],
    () => [path("M-8 0 A8 3 0 0 1 8 0 A8 3 0 0 1 -8 0 Z")]],
  ["lever", "Manual lever", "lever", "manual", 8, [0, -10, 14, 0],
    () => [path("M0 0 L12 -9 M10 -10 L14 -7")]],
  ["gearbox", "Gearbox operator", "gearbox", "gearbox", 10, [-12, -11, 6, 1],
    () => [path("M-6 -10 L6 -10 L6 0 L-6 0 Z M-6 -5 L-12 -5 M-12 -11 L-12 1")], text("G", -5, [6, 5])],
  ["motor", "Motor", "motor", "motor", 9, [-7, -14, 7, 0],
    () => [{ c: [0, -7, 7] }], text("M", -7, [7, 7], -12.4), referenced("§06 legend")],
  ["solenoid", "Solenoid", "solenoid", "solenoid", 8, [-6, -12, 6, 0],
    () => [path("M-6 -12 L6 -12 L6 0 L-6 0 Z")], text("S", -6, [6, 6], -10.4), referenced("0408")],
  ["diaphragm", "Diaphragm", "diaphragm", "diaphragm", 10, [-7, -7, 7, 0],
    () => [path("M-7 0 A7 7 0 0 1 7 0 Z")], null, referenced("0414")],
  ["pneumatic-cylinder", "Pneumatic cylinder", "pneumatic-cylinder", "cylinder", 8, [-7, -14, 7, 0],
    cylinder, text("P", -9.5, [7, 4.5])],
  ["hydraulic-cylinder", "Hydraulic cylinder", "hydraulic-cylinder", "cylinder", 8, [-7, -14, 7, 0],
    cylinder, text("H", -9.5, [7, 4.5])],
  ["float", "Float operator", "float", "float", 9, [0, -10, 22, 0],
    () => [path("M0 0 L14 -6"), { c: [18, -6, 4] }], null, [{ std: "Processvg design", ref: "Family 02 float" }]],
];

const definitions = Object.fromEntries(heads.map(([slug, name, type, mechanism, defaultStem, extent, geometry, identifier, src]) => {
  const id = `operator-${slug}`;
  const operator = { type, mechanism, defaultStem, extent, anchor: { point: [0, 0], normal: [0, -1] } };
  return [id, { id, name, cat: "Operator heads", ports: [], operator, src: src ?? proposed,
    ...(src && slug !== "float" ? { verification } : approved),
    geometry, identifier,
    draw: () => [...geometry(), ...(identifier ? [headText(identifier)] : [])],
  }];
}));
const headEnergy = {
  hand: "manual", handwheel: "manual", lever: "manual", motor: "electric", solenoid: "electric",
  "pneumatic-cylinder": "pneumatic", "hydraulic-cylinder": "hydraulic",
};
const byType = Object.fromEntries(Object.values(definitions).map(({ id, operator }) => [operator.type, id]));

const spring = {
  id: "modifier-spring-return", name: "Spring return", cat: "Operator modifiers", ports: [], src: proposed, ...approved,
  modifier: { extent: [0, -3, 19, 3], attachments: [[0, 0], [19, 0]] },
  draw: () => [path("M0 0 L3 0 L5 -3 L8 3 L11 -3 L14 3 L16 0 L19 0", "secondary")],
};
export const OPERATORS = [...Object.values(definitions), spring];

function headText({ letter, y }) {
  return { t: [0, y, letter], rotateAnchor: true, fontFamily: font.family, dy: 4 };
}

function placement(at, { renderScale = 1 } = {}) {
  const { x = 0, y = 0, s = 1, q = 0 } = at;
  if (![x, y, s, renderScale, s * renderScale].every(Number.isFinite) || s <= 0 || renderScale <= 0 || !Number.isSafeInteger(q)) {
    throw new RangeError("Invalid actuator placement or display");
  }
  return { x, y, s, q: turn(q), renderScale };
}

function inkMetrics(measureText, text) {
  if (!measureText) return;
  const metrics = measureText(text, { ...font }, "middle");
  if (!metrics || !["left", "right", "ascent", "descent"].every((key) =>
    Number.isFinite(metrics[key]) && metrics[key] >= 0)) throw new RangeError("Invalid actuator text bounds");
  return metrics;
}

function inkBounds(label, metrics) {
  const [x, y] = label.t;
  const baseline = y + (label.dy ?? 0);
  const center = x + (label.dx ?? 0);
  return { left: center - metrics.left, right: center + metrics.right,
    top: baseline - metrics.ascent, bottom: baseline + metrics.descent };
}

function drawHead(head, at, { renderScale, measureText }, identifierMode) {
  const geometry = place(head.geometry(), at);
  if (!head.identifier || identifierMode === "omit") return { shapes: geometry };
  const { letter, fit } = head.identifier;
  const scale = at.s * renderScale;
  const metrics = inkMetrics(measureText, letter);
  // Conservative ink half-extents for the default sans-serif capitals. A host can
  // supply the actual ink box, including bearings relative to the aligned baseline.
  const half = metrics ? [(metrics.left + metrics.right) / 2, (metrics.ascent + metrics.descent) / 2] : [4.2, 4];
  const room = at.q % 2 ? [fit[1], fit[0]] : fit;
  const [u, v] = half.map((edge) => edge / at.s + 0.75 / scale);
  const fits = head.operator.type === "motor" ? Math.hypot(u, v) <= room[0] : u <= room[0] && v <= room[1];
  if (scale < 1 || !fits) return { shapes: geometry, externalIdentifier: `${head.name} (${letter})` };

  const [label] = place([headText(head.identifier)], at);
  if (metrics) {
    label.dx = (metrics.left - metrics.right) / 2;
    label.dy = (metrics.ascent - metrics.descent) / 2;
  }
  return { shapes: [...geometry, label], ...(metrics && { identifierBounds: inkBounds(label, metrics) }) };
}

export function placeOperator(id, at = {}, display = {}) {
  const p = placement(at, display);
  const isSpring = id === spring.id;
  if (!isSpring && !Object.hasOwn(definitions, id)) throw new RangeError(`Unknown operator: ${id}`);
  const symbol = isSpring ? spring : definitions[id];
  const world = (value) => placePoint(value, p).map(round);
  const extent = symbol.operator?.extent ?? spring.modifier.extent;
  const bounds = bbox(leftRight(extent).map(world), 1 / p.renderScale);
  const result = isSpring ? { shapes: place(spring.draw(), p) } : drawHead(symbol, p, { ...display, renderScale: p.renderScale }, display.identifier);
  if (result.externalIdentifier) {
    const metrics = inkMetrics(display.measureText, result.externalIdentifier);
    const label = { t: [p.x, bounds.bottom + Math.max(14, (metrics?.ascent ?? 0) + 4), result.externalIdentifier], fontFamily: font.family };
    result.shapes.push(label);
    if (metrics) result.identifierBounds = inkBounds(label, metrics);
  }
  const anchors = isSpring
    ? { attachments: spring.modifier.attachments.map(world) }
    : { head: { point: world([0, 0]), normal: axes[p.q].slice() } };
  return { ...result, bounds, anchors, ports: [], processPorts: [],
    metadata: { id, orientation: p.q * 90, verification: symbol.verification } };
}

/** Lay out an operator against an equipment-local mechanical mount. Shapes are in drawing space.
 * An external identification label, if needed, is returned separately for the equipment's label block.
 */
export function composeActuator(mount, config, at = {}, display = {}) {
  const p = placement(at, display);
  const localQ = axes.findIndex(([x, y]) => x === mount?.normal?.[0] && y === mount?.normal?.[1]);
  const clearance = mount?.clearance ?? 0;
  if (!point(mount?.point) || !point(mount?.normal) || localQ < 0 || !Number.isFinite(clearance) || clearance < 0) {
    throw new RangeError("Expected a mechanical mount with a cardinal normal and nonnegative clearance");
  }
  const id = config?.headId ?? (Object.hasOwn(byType, config?.type) ? byType[config.type] : undefined);
  if (!Object.hasOwn(definitions, id)) throw new RangeError("Unsupported actuator head");
  const definition = definitions[id];
  const { type, mechanism, defaultStem, extent } = definition.operator;
  if (config.type !== undefined && config.type !== type) throw new RangeError("Actuator type and headId disagree");
  const { stemLength = defaultStem, headOrientation = "mount", modifiers = [],
    energySource = Object.hasOwn(headEnergy, type) ? headEnergy[type] : null,
    motion = null, controlMode = null, behavior } = config;
  if (!Number.isFinite(stemLength) || stemLength < 0) throw new RangeError("Stem length must be nonnegative");
  if (!["mount", "upright"].includes(headOrientation)) throw new RangeError("Unknown head orientation");
  if (!Array.isArray(modifiers) || modifiers.length > 1 || modifiers.some((id) => id !== spring.id)) {
    throw new RangeError("Unsupported or duplicate actuator modifier");
  }
  if (![energySource, motion, controlMode].every((value) => value === null ||
    (typeof value === "string" && value.trim() && !/[\t\r\n]/.test(value)))) {
    throw new TypeError("Expected one-line actuator energy, motion and control values");
  }
  if (behavior !== undefined && (type !== "float" || !["open-on-rise", "close-on-rise", "unknown"].includes(behavior))) {
    throw new RangeError("Invalid float behavior");
  }

  const mountPoint = placePoint(mount.point, p);
  const mountQ = turn(localQ + p.q);
  const headQ = headOrientation === "upright" ? 0 : mountQ;
  const relativeQ = turn(headQ - mountQ);
  const headExtent = bbox(leftRight(extent).map((xy) => placePoint(xy, { q: relativeQ })));
  const gap = 1 / (p.s * p.renderScale);
  // Keep the head outside the equipment's reserved region in mounting coordinates.
  const edgeGap = relativeQ === 2 ? 3 * gap : (clearance || headExtent.bottom ? gap : 0);
  const reach = Math.max(stemLength, clearance + headExtent.bottom + edgeGap);
  const stem = [[0, 0], [0, -reach]];
  // A separately upright head needs a final approach along its own stem axis.
  // The reversed case uses a side jog to keep the return leg clear of the head.
  if (relativeQ === 1) stem.push([Math.max(0, -headExtent.left) + gap * 3, -reach]);
  if (relativeQ === 3) stem.push([-Math.max(0, headExtent.right) - gap * 3, -reach]);
  if (relativeQ === 2) {
    const side = Math.max(0, -headExtent.left) + gap * 3;
    const jog = -reach - gap * 3;
    stem.splice(1, 0, [0, -clearance - gap], [-side, -clearance - gap], [-side, jog], [0, jog]);
  }

  const frame = { x: mountPoint[0], y: mountPoint[1], s: p.s, q: mountQ };
  const world = (xy) => placePoint(xy, frame).map(round);
  const headPoint = stem.at(-1);
  const [x, y] = placePoint(headPoint, frame);
  const headAt = { x, y, s: p.s, q: headQ };
  const result = drawHead(definition, headAt, { ...display, renderScale: p.renderScale });
  const points = stem.map(world);
  const hasStem = points.some(([px, py]) => px !== points[0][0] || py !== points[0][1]);
  const shapes = hasStem ? [path("M" + points.map((xy) => xy.join(" ")).join(" L")), ...result.shapes] : result.shapes;
  const corners = [...points, ...leftRight(extent).map((xy) => placePoint(xy, headAt).map(round))];
  const anchors = { mount: { point: points[0], normal: axes[mountQ].slice() },
    head: { point: points.at(-1), normal: axes[headQ].slice() } };
  const springReturn = modifiers.length > 0;
  if (springReturn) {
    const origin = [
      Math.max(...stem.map(([sx]) => sx), headPoint[0] + headExtent.right) + 5 * gap,
      Math.min(headPoint[1] + (headExtent.top + headExtent.bottom) / 2, -clearance - 3 - gap),
    ];
    const [sx, sy] = placePoint(origin, frame);
    const springAt = { x: sx, y: sy, q: mountQ, s: p.s };
    shapes.push(...place(spring.draw(), springAt));
    const springWorld = (xy) => placePoint(xy, springAt).map(round);
    anchors.spring = spring.modifier.attachments.map(springWorld);
    corners.push(...leftRight(spring.modifier.extent).map(springWorld));
  }
  return {
    shapes, bounds: bbox(corners, 1 / p.renderScale), anchors, stem: points,
    externalIdentifier: result.externalIdentifier, identifierBounds: result.identifierBounds,
    metadata: { headId: id, type, mechanism, energySource, motion, controlMode, stemLength, mountedReach: reach,
      headOrientation, head: anchors.head.point, modifiers: [...modifiers], springReturn,
      ...(type === "float" && { behavior: behavior ?? "unknown" }) },
  };
}

// Raw legacy preset glyphs preserve their original label baselines for archived local draws.
export function drawPresetHead(type) {
  const head = definitions[byType[type]];
  const y = -head.operator.defaultStem;
  const parts = [path(`M0 0 L0 ${y}`), ...place(head.geometry(), { y })];
  if (head.identifier) parts.push({ t: [0, head.identifier.legacyBaseline, head.identifier.letter] });
  return parts;
}
