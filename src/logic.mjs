import { identityRow, placeIdentity } from "./instrument-ink.mjs";

const gates = {
  "logic-and": {
    outline: "M-12 -10 H0 A10 10 0 0 1 0 10 H-12 Z",
    inputs: { A: [-20, -5, -12], B: [-20, 5, -12] }, outputs: { Y: [20, 0, 10] },
  },
  "logic-or": {
    outline: "M-12 -10 Q4 -10 10 0 Q4 10 -12 10 Q-4 0 -12 -10 Z",
    inputs: { A: [-20, -5, -9], B: [-20, 5, -9] }, outputs: { Y: [20, 0, 10] },
  },
  "logic-not": {
    outline: "M-12 -9 L8 0 L-12 9 Z", bubble: "M12 0 A2 2 0 1 1 8 0 A2 2 0 1 1 12 0 Z",
    inputs: { A: [-20, 0, -12] }, outputs: { Y: [20, 0, 12] },
  },
  "logic-timer-on": {
    outline: "M-14 -10 H14 V10 H-14 Z",
    inputs: { IN: [-20, 0, -14] }, outputs: { Q: [20, 0, 14] },
  },
};
export const LOGIC_IDS = Object.freeze(Object.keys(gates));

const stableId = (value) => typeof value === "string" && value.trim().length > 0;
const point = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

export function placeLogicPrimitive(type, at = {}, { mode, pt, exposedET = false } = {}) {
  if (mode !== "logic" || !Object.hasOwn(gates, type)) throw new RangeError("Logic primitives require the dedicated logic view");
  const { x = 0, y = 0, s = 1, q = 0 } = at;
  if (![x, y, s].every(Number.isFinite) || s <= 0 || q !== 0) throw new RangeError("Logic diagrams read left to right");
  const timer = type === "logic-timer-on";
  if ((!timer && (pt !== undefined || exposedET)) || typeof exposedET !== "boolean" ||
      (pt !== undefined && (!Number.isFinite(pt?.value) || pt.value < 0 || !["ms", "s", "min", "h"].includes(pt.unit)))) {
    throw new RangeError("Timer PT requires a nonnegative value and time unit");
  }
  const { outline, bubble, inputs, outputs } = gates[type];
  const pinEntries = [
    ...Object.entries(inputs).map(([id, p]) => [id, p, "in", "boolean"]),
    ...Object.entries(outputs).map(([id, p]) => [id, p, "out", "boolean"]),
    ...(exposedET ? [["ET", [20, 5, 14], "out", "elapsed-time"]] : []),
  ];
  const shapes = [{ d: outline, uprightAt: [x, y, s] }];
  if (bubble) shapes.push({ d: bubble, uprightAt: [x, y, s] });
  const pins = Object.fromEntries(pinEntries.map(([id, [u, v, edge], direction, signal]) => {
    shapes.push({ d: `M${u} ${v} H${edge}`, uprightAt: [x, y, s], cap: "butt" });
    return [id, { point: [x + u * s, y + v * s], direction, signal }];
  }));
  if (timer) {
    shapes.push(placeIdentity(identityRow("TON", 7.5), [x, y], s));
    if (pt) shapes.push(placeIdentity(identityRow(`PT ${pt.value} ${pt.unit}`, 7.5), [x, y - 16 * s], s));
    if (exposedET) shapes.push(placeIdentity(identityRow("ET", 7.5), [x + 28 * s, y + 5 * s], s));
  }
  return { shapes, pins, metadata: { type, mode, ...(timer && { execution: "diagram-only", pt, exposedET }) } };
}

/** Three-valued truth tables for combinational primitives, independent of drawing topology. */
export function logicTruth(type, inputs = {}) {
  if (!["logic-and", "logic-or", "logic-not"].includes(type)) throw new RangeError("Only combinational primitives have a truth table");
  const values = Object.keys(gates[type].inputs).map((key) => inputs[key] ?? "unknown");
  if (!values.every((value) => [true, false, "unknown"].includes(value))) throw new TypeError("Invalid Boolean signal");
  if (type === "logic-not") return values[0] === "unknown" ? "unknown" : !values[0];
  const decisive = type === "logic-or";
  return values.includes(decisive) ? decisive : values.includes("unknown") ? "unknown" : !decisive;
}

/** Resolve explicit dependencies by node and pin. Missing inputs stay visible and unknown. */
export function composeLogicDiagram({ id, referenceId, nodes, dependencies = [] } = {}) {
  if (!stableId(id) || !stableId(referenceId) || !Array.isArray(nodes)) throw new TypeError("Logic diagram requires stable IDs and nodes");
  const byId = new Map();
  const shapes = [];
  for (const node of nodes) {
    if (!stableId(node.id) || byId.has(node.id)) throw new RangeError("Logic node IDs must be unique");
    let placed;
    if (node.type === "input" || node.type === "output") {
      const { label, at, signal = "boolean" } = node;
      if (!point(at) || !["boolean", "elapsed-time"].includes(signal)) throw new RangeError("Invalid logic boundary pin");
      const input = node.type === "input";
      placed = {
        shapes: [{ t: [at[0] + (input ? -6 : 6), at[1], label], align: input ? "end" : "start", verticalCenter: true }],
        pins: { [input ? "Y" : "A"]: { point: at, direction: input ? "out" : "in", signal } },
      };
    } else {
      placed = placeLogicPrimitive(node.type, node.at, { ...node, mode: "logic" });
    }
    byId.set(node.id, placed);
    shapes.push(...placed.shapes);
  }
  const connected = new Set();
  const edgeIds = new Set();
  const edges = dependencies.map((edge) => {
    const from = byId.get(edge.from?.node)?.pins;
    const to = byId.get(edge.to?.node)?.pins;
    const source = from && Object.hasOwn(from, edge.from.pin) && from[edge.from.pin];
    const target = to && Object.hasOwn(to, edge.to.pin) && to[edge.to.pin];
    const via = edge.via ?? [];
    if (!stableId(edge.id) || edgeIds.has(edge.id) || source?.direction !== "out" || target?.direction !== "in" ||
        source.signal !== target.signal || connected.has(target) || edge.from.node === edge.to.node ||
        (edge.kind !== undefined && edge.kind !== "logical-dependency") || !Array.isArray(via) || !via.every(point)) throw new RangeError(`Invalid logic dependency: ${edge.id}`);
    connected.add(target);
    edgeIds.add(edge.id);
    const points = [source.point, ...via, target.point];
    return { ...edge, kind: "logical-dependency", points };
  });
  const unknownInputs = [];
  for (const [node, { pins }] of byId.entries()) {
    for (const [pin, info] of Object.entries(pins)) {
      if (info.direction !== "in" || connected.has(info)) continue;
      unknownInputs.push({ node, pin, value: "unknown" });
      shapes.push(placeIdentity(identityRow("?", 7.5), [info.point[0] - 5, info.point[1]]));
    }
  }
  return {
    metadata: { id, referenceId, mode: "logic", execution: "diagram-only" },
    edges, unknownInputs, nodes: byId,
    shapes: [...edges.map(({ points }) => ({ d: "M" + points.map((p) => p.join(" ")).join(" L") })), ...shapes],
  };
}

export function resolveInterlockReference(instrument, diagrams) {
  const ref = instrument.metadata.reference;
  if (instrument.metadata.kind !== "interlock-reference" || !ref) throw new TypeError("Expected a referenced interlock");
  const matches = diagrams.filter(({ metadata }) => metadata.id === ref.logicId);
  if (matches.length !== 1 || matches[0].metadata.mode !== "logic" || matches[0].metadata.referenceId !== ref.id) {
    throw new RangeError(`Unresolved interlock reference ${ref.id} to ${ref.logicId}`);
  }
  return matches[0];
}
