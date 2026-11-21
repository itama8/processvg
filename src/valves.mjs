// Family 02 valve bodies and assembly semantics. Coordinates are schematic drawing units.
import { place, placePoint, round } from "./geometry.mjs";
import { composeActuator, drawPresetHead } from "./actuators.mjs";
import { routeLine } from "./lines.mjs";

const path = (...points) => "M" + points.map((point) => point.join(" ")).join(" L");
const shape = (d, props = {}) => ({ d, ...props });
const circle = (x, y, r, props = {}) => ({ c: [x, y, r], ...props });
const solid = { fill: "solid" };
const bowtie = "M-8 -5 L0 0 L-8 5 Z M8 -5 L8 5 L0 0 Z";
const inline = [[-8, 0], [8, 0]];
const angle = [[-8, 0], [0, 8]];
const nrv = [shape("M-7 -5 L7 0 L-7 5 Z"), shape("M7 -6.2 L7 6.2")];
const needle = "M0 -9 L0 1 M-3 -5 L0 -1 L3 -5";
const sleeve = "M-8 -8 L-2 -5 L2 -5 L8 -8 L8 8 L2 5 L-2 5 L-8 8 Z";
const compression = "M-3 -3.5 L0 -1.5 L3 -3.5 M-3 3.5 L0 1.5 L3 3.5";
const regulatorLabel = "Pressure reducing";
const regulator = [
  shape("M0 0 L0 -9"),
  shape("M-6 -9 A6 6 0 0 1 6 -9 Z"),
];
const proposed = { std: "Proposed", ref: "Family 02" };
const is = (ref) => ({ std: "IS 3232", ref });
const bc = (ref = "P-002") => ({ std: "B&C", ref });
const design = {
  designApproval: "User-approved Family 02 design",
  verification: "Exact geometry not standards-verified",
};

function isolation(body, marks = [], knockout) {
  return ({ closed = false } = {}) => [
    shape(body, { ...(closed && solid), ...(knockout && { knockout }) }), ...marks,
  ];
}
const atTop = (y, clearance = 0) => ({ point: [0, y], normal: [0, -1], ...(clearance && { clearance }) });

function definition(id, name, src, draw, ports, valve, provenance = {}) {
  const terminal = (point, index) => {
    const [x, y] = point;
    return {
      id: (valve.portIds ?? ["in", "out"])[index],
      kind: "process",
      point,
      normal: [Math.sign(x), Math.sign(y)],
      role: valve.roles?.[index] ?? "bidirectional",
    };
  };
  const terminals = ports.map(terminal);
  const connectivity = ports.length === 2 && valve.mode !== "passive" ? [[0, 1]] : [];
  return {
    id: `valve-${id}`, name, cat: "Valves", src, draw, ports,
    portNames: terminals.map((port) => port.id),
    connectivity, states: valve.mode === "isolation" || undefined,
    valve: { ...valve, terminals }, ...provenance,
  };
}
function inlineIsolation(id, name, src, draw, valve = {}, provenance) {
  return definition(id, name, src, draw, valve.ports ?? inline, {
    mode: "isolation", bounds: [-8, -5, 8, 5], mount: atTop(0, 5), ...valve,
  }, provenance);
}

function regulatorGeometry({ representation = "compact", geometryOnly = false, renderScale = 1 } = {}) {
  const body = [shape(bowtie), ...regulator];
  if (!geometryOnly) body.push({ t: [0, 21, regulatorLabel], fontFamily: "sans-serif" });
  if (representation === "compact") return body;
  if (representation !== "downstream-sensing") throw new RangeError("Unknown pressure-reducing representation");
  return [
    ...body, shape("M8 0 L18 0"),
    ...routeLine("line-hydraulic", [[18, 0], [18, -18], [0, -18], [0, -15]], { renderScale }).shapes,
    circle(18, 0, 1.5, { ...solid, role: "dot" }),
  ];
}
export const VALVES = [
  inlineIsolation("gate", "Gate valve", [is("0401"), bc()], isolation(bowtie)),
  inlineIsolation("globe", "Globe valve", [is("0402"), bc()],
    isolation(bowtie, [circle(0, 0, 2.5, { ...solid, role: "dot" })], [circle(0, 0, 3.5)]),
    { mount: atTop(-3.5, 1.5), minFillScale: 1.25 }),
  inlineIsolation("ball", "Ball valve", [is("0407"), bc()],
    isolation(bowtie, [circle(0, 0, 3.5)], [circle(0, 0, 4.6)]),
    { mount: atTop(-4.6, 0.4), minFillScale: 1.25 }),
  inlineIsolation("plug", "Plug valve", [is("0413"), bc()],
    isolation(bowtie, [shape("M-2 -4 L2 -4 L2 4 L-2 4 Z", solid)], [shape("M-3 -5 L3 -5 L3 5 L-3 5 Z")]),
    { mount: atTop(-5), minFillScale: 1.25 }),
  inlineIsolation("butterfly", "Butterfly valve", [is("0410"), bc()], ({ closed } = {}) => [
    shape("M-5 -7 L-5 7 M5 -7 L5 7"),
    shape("M-3 6 L-0.89 1.79 M0.89 -1.79 L3 -6"),
    circle(0, 0, 2, closed ? solid : {}),
  ], { ports: [[-5, 0], [5, 0]], bounds: [-5, -7, 5, 7], mount: atTop(-2.3, 4.7), minFillScale: 1.5,
    designClosedLabel: true }),
  inlineIsolation("knife", "Knife gate valve", [bc()], ({ closed } = {}) => [
    shape("M-4 -7 L-4 7 M4 -7 L4 7"),
    shape("M-1.5 -11 L1.5 -11 L1.5 7 L-1.5 7 Z", closed ? solid : {}),
  ], { ports: [[-4, 0], [4, 0]], bounds: [-4, -11, 4, 7], mount: atTop(-11), minFillScale: 1 }),
  definition("check", "Check (non-return) valve", [{ std: "processvg design", ref: "Approved NRV" }],
    () => nrv.map((part) => ({ ...part })), [[-7, 0], [7, 0]], {
      mode: "passive", roles: ["inlet", "outlet"], permittedFlow: { from: "in", to: "out" },
      bounds: [-7, -6.2, 7, 6.2],
    }, { ...design, historicalSources: [is("0403"), bc()] }),
  inlineIsolation("diaphragm", "Diaphragm valve", [is("0405"), bc()],
    isolation(bowtie, [shape("M-6 -6 A7 7 0 0 1 6 -6")]),
    { mount: atTop(-9.4), bounds: [-8, -9.4, 8, 5] }),
  definition("angle", "Angle valve", [is("0404"), bc()],
    () => [shape("M-8 -5 L0 0 L-8 5 Z"), shape("M-5 8 L0 0 L5 8 Z")],
    angle, { mode: "angle", bounds: [-8, -5, 5, 8], mount: atTop(0, 5) }),
  definition("3way", "Three-way valve", [bc()],
    () => [shape("M-8 -5 L8 5 L8 -5 L-8 5 Z"), shape("M-5 8 L0 0 L5 8 Z")],
    [...inline, [0, 8]], { mode: "diverter", portIds: ["in", "out", "branch"], bounds: [-8, -5, 8, 8], mount: atTop(0, 5) }),
  definition("relief", "Pressure relief valve", [is("0406"), bc()],
    () => [shape("M-8 -5 L0 0 L-8 5 Z"), shape("M-5 8 L0 0 L5 8 Z"),
      shape("M0 0 L0 -6 L-4 -8 L4 -11 L-4 -14 L4 -17 L0 -19")],
    angle, { mode: "passive", roles: ["inlet", "outlet"], bounds: [-8, -19, 5, 8] }),
  definition("air", "Air release valve", [bc("P-003 (vent)"), proposed],
    () => [shape("M0 8 L0 2"), shape("M-5 2 L5 2 L0 -6 Z"), shape("M-4 -10 L4 -10")],
    [[0, 8]], {
      mode: "passive", portIds: ["process"], bounds: [-5, -10, 5, 8],
      interfaces: [{ id: "atmosphere", kind: "atmospheric-boundary", point: [0, -10], normal: [0, -1], role: "vent" }],
    }),
  inlineIsolation("needle", "Needle valve", [proposed],
    isolation(bowtie, [shape(needle)], [shape(needle, { cutWidth: 3.4 })]),
    { mount: atTop(-9), bounds: [-8, -9, 8, 5], minFillScale: 1.25 }, design),
  inlineIsolation("pinch", "Pinch valve", [proposed],
    ({ closed } = {}) => [
      shape(sleeve, closed ? { ...solid, knockout: [shape(compression, { cutWidth: 2.6 })] } : {}),
      shape(compression),
    ],
    { mount: null, bounds: [-8, -8, 8, 8], minFillScale: 1.25 }, design),
  definition("foot", "Foot valve with strainer", [proposed],
    () => [...place(nrv, { q: -1 }), shape("M0 -16 L0 -7 M0 7 L0 10"),
      shape("M-8 10 L8 10 L8 19 L-8 19 Z M-4 12 L-4 17 M0 12 L0 17 M4 12 L4 17")],
    [[0, -16]], {
      mode: "passive", portIds: ["out"], roles: ["outlet"], bounds: [-8, -16, 8, 19],
      interfaces: [{ id: "intake", kind: "screened-boundary", point: [0, 19], normal: [0, 1], role: "intake" }],
      permittedFlow: { from: "intake", to: "out" },
    }, { ...design, designApproval: "User-approved NRV derivative (Family 03 amendment to Family 02)" }),
  definition("pressure-reducing", "Pressure-reducing valve", [proposed], regulatorGeometry, inline, {
    mode: "regulating", roles: ["inlet", "outlet"], bounds: [-8, -15, 8, 5],
    representations: ["compact", "downstream-sensing"],
  }, design),
  definition("air-combination", "Combination air valve", [proposed],
    () => [shape("M0 16 L0 9 M-10 -9 L10 -9 L10 9 L-10 9 Z M0 -9 L0 -16"),
      shape("M-5 5 L-5 -5 M-8 -2 L-5 -5 L-2 -2 M5 -5 L5 5 M2 2 L5 5 L8 2")],
    [[0, 16]], {
      mode: "passive", portIds: ["process"], bounds: [-10, -16, 10, 16],
      interfaces: [{ id: "atmosphere", kind: "atmospheric-boundary", point: [0, -16], normal: [0, -1], role: "admit-and-vent-air" }],
      functions: ["large-orifice-air/vacuum", "small-orifice-air-release-under-pressure"],
    }, design),
  definition("float-operated", "Float-operated valve", [proposed],
    ({ closed } = {}) => [...isolation(bowtie)({ closed }), ...drawPresetHead("float")], inline, {
      mode: "isolation", preset: { bodyId: "valve-gate", actuator: { headId: "operator-float" } },
      bounds: [-8, -19, 22, 5], mount: atTop(0, 5),
    }, design),
];

const POSITIONS = ["open", "closed", "partial", "unknown"];
const OTHER_POSITIONS = ["open", "closed", "last", "unknown", "not-applicable"];
const validText = (text) => typeof text === "string" && !!text.trim() && !/[\t\r\n]/.test(text);
const validPoint = (point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);

function readState(config, mode, legacyClosed) {
  const { normalPosition = null, operatingPosition = null, failPosition = null, failEvent = null } = config;
  const percent = operatingPosition?.openingPercent;
  if ((normalPosition !== null && !POSITIONS.includes(normalPosition)) ||
      (operatingPosition !== null && !POSITIONS.includes(operatingPosition.position)) ||
      (failPosition !== null && !OTHER_POSITIONS.includes(failPosition)) ||
      (failEvent !== null && (!validText(failEvent) || failPosition === "not-applicable")) ||
      (percent !== undefined &&
       (!Number.isFinite(percent) || percent < 0 || percent > 100 ||
        (operatingPosition.position === "open" && percent !== 100) ||
        (operatingPosition.position === "closed" && percent !== 0) ||
        (operatingPosition.position === "partial" && (percent === 0 || percent === 100))))) {
    throw new RangeError("Invalid valve position, travel percentage or failure event");
  }
  if (mode === "passive" && [normalPosition, operatingPosition, failPosition === "not-applicable" ? null : failPosition, failEvent].some((value) => value !== null)) {
    throw new RangeError("This valve uses passive semantics");
  }
  if (mode === "diverter" && (normalPosition !== null || operatingPosition !== null || ["open", "closed"].includes(failPosition))) {
    throw new RangeError("Diverter positions require explicit port pairs");
  }
  if (legacyClosed !== undefined && typeof legacyClosed !== "boolean") throw new TypeError("closed must be Boolean");
  return {
    normalPosition,
    operatingPosition: operatingPosition === null ? null : { ...operatingPosition },
    failPosition,
    failEvent,
  };
}

function activePairs(pairs, valve) {
  if (pairs == null) return null;
  const seen = new Set();
  const ids = valve.terminals.map(({ id }) => id);
  if (valve.mode !== "diverter" || !Array.isArray(pairs)) throw new RangeError("Only a diverter supports active port pairs");
  return pairs.map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] || !pair.every((id) => ids.includes(id))) {
      throw new RangeError("Each active pair must join two distinct diverter ports");
    }
    const key = [...pair].sort().join("/");
    if (seen.has(key)) throw new RangeError("Duplicate active port pair");
    seen.add(key);
    return [...pair];
  });
}

const flangeHalfWidth = 6;

function endTreatment(port, end) {
  const point = port.point;
  if (end.type === "plain") return { shapes: [], points: [point], point };
  if (end.type !== "flanged") throw new RangeError("End type must be plain or flanged");
  const [x, y] = point, [dx, dy] = port.normal;
  const offset = (along, across = 0) => [x + dx * along - dy * across, y + dy * along + dx * across];
  const face = offset(9);
  const marks = [offset(2, -flangeHalfWidth), offset(2, flangeHalfWidth), offset(6, -flangeHalfWidth), offset(6, flangeHalfWidth)];
  return {
    shapes: [shape([path(point, face), path(...marks.slice(0, 2)), path(...marks.slice(2))].join(" "))],
    points: marks.concat([face]), point: face,
  };
}

function labelsFor(config, valve, state, view, fallback, position, pairs, quietUnspecified) {
  const { tag, setpoint } = config;
  const labels = [];
  if (tag != null) {
    if (!validText(tag)) throw new TypeError("Expected a one-line valve tag");
    labels.push(tag);
  }
  if (valve.mode === "regulating") labels.push(regulatorLabel);
  if (setpoint != null) {
    if (valve.mode !== "regulating" || !Number.isFinite(setpoint.value) || !validText(setpoint.units)) {
      throw new RangeError("A reducing-valve setpoint requires a finite value and units");
    }
    labels.push(`Setpoint ${setpoint.value} ${setpoint.units}`);
  }
  if (valve.mode === "diverter" && view === "operating") {
    labels.push(pairs === null ? "Routes unspecified" :
      pairs.length ? pairs.map((pair) => pair.join(" ↔ ")).join(", ") : "No active routes");
  }
  if (["isolation", "angle", "regulating"].includes(valve.mode)) {
    if (view === "operating") {
      const name = fallback ? "CLOSED · Operating" : `Operating ${position ?? "unspecified"}`;
      const percent = state.operatingPosition?.openingPercent;
      labels.push(percent === undefined ? name : `${name} · ${percent}% travel`);
    } else if (position === "closed" && (fallback || valve.mode !== "isolation")) labels.push("NC");
    else if (position === "partial" || position === "unknown") labels.push(`Normal ${position}`);
    else if (position === null && !quietUnspecified && valve.mode === "isolation") labels.push("Normal unspecified");
    else if (position === "open" && valve.mode !== "isolation") labels.push("NO");
  }
  const { failPosition, failEvent } = state;
  if ((failPosition !== null && failPosition !== "not-applicable") || failEvent !== null) {
    const fail = { open: "Fail open (FO)", closed: "Fail closed (FC)", last: "Fail last (FLP)", unknown: "Fail position unknown" };
    labels.push(`${fail[failPosition] ?? "Fail position unspecified"}${failEvent ? ` on ${failEvent}` : ""}`);
  }
  return labels;
}

export function assembleValve(library, config, at, display) {
  const { x = 0, y = 0, s = 1, q = 0 } = at;
  const { view = "design", renderScale = 1, closedStyle = "auto", legacyClosed, quietUnspecified, measureText } = display;
  if (![x, y, s, renderScale, s * renderScale].every(Number.isFinite) || s <= 0 || renderScale <= 0 ||
      !Number.isSafeInteger(q) || !["design", "operating"].includes(view) || !["auto", "label"].includes(closedStyle)) {
    throw new RangeError("Invalid valve placement or display");
  }
  const { bodyId, tag = null, endConnections = {}, labelAnchor } = config;
  const preset = library[bodyId]?.valve?.preset ?? library[bodyId]?.assemblyPreset;
  const body = library[preset?.bodyId ?? bodyId];
  if (!body?.valve) throw new RangeError(`Unknown valve body: ${bodyId}`);
  const { valve } = body;
  const { actuator = preset?.actuator ?? null, setpoint = null, representation = "compact" } = config;
  if (config.representation !== undefined && !valve.representations?.includes(representation)) {
    throw new RangeError("Unsupported valve representation");
  }
  const state = readState(config, valve.mode, legacyClosed);
  const pairs = activePairs(config.activePortPairs, valve);
  const position = view === "operating" ? state.operatingPosition?.position ?? null
    : state.normalPosition ?? (legacyClosed === undefined || valve.mode !== "isolation" ? null : legacyClosed ? "closed" : "open");
  const isolationClosed = valve.mode === "isolation" && position === "closed";
  const projectedScale = s * renderScale;
  const fallback = isolationClosed && (closedStyle === "label" || projectedScale < (valve.minFillScale ?? 0) ||
    (view === "design" && state.normalPosition === "closed" && valve.designClosedLabel));
  const closed = isolationClosed && !fallback;
  const local = library[bodyId].assemblyPreset && !closed ? library[bodyId].draw({}).slice(0, 1)
    : body.draw({ closed, representation, geometryOnly: true, renderScale: projectedScale });
  const explicit = representation === "downstream-sensing";
  const terminals = explicit ? [valve.terminals[0], { ...valve.terminals[1], point: [18, 0] }] : valve.terminals;
  if (!endConnections || typeof endConnections !== "object" || Array.isArray(endConnections) ||
      Object.keys(endConnections).some((id) => !terminals.some((port) => port.id === id))) {
    throw new RangeError("End treatments require a valve process port");
  }
  const [left, top, right, bottom] = explicit ? [-8, -22, 22, 5] : valve.bounds;
  const extent = [[left, top], [right, top], [right, bottom], [left, bottom]];
  const localPorts = terminals.map((port) => {
    const end = Object.hasOwn(endConnections, port.id) ? endConnections[port.id] : { type: "plain" };
    if (!end || typeof end !== "object") throw new TypeError("Expected a valve end treatment");
    const treatment = endTreatment(port, end);
    local.push(...treatment.shapes);
    extent.push(...treatment.points);
    return { ...port, point: treatment.point, bodyPoint: port.point, end: { type: end.type } };
  });
  const mount = valve.mount && { ...valve.mount };
  if (mount && !explicit && localPorts.some(({ end }) => end.type === "flanged") && mount.normal[1] === -1) {
    mount.clearance = Math.max(mount.clearance ?? 0, flangeHalfWidth + mount.point[1]);
  }
  const operator = actuator === null ? null : composeActuator(mount, actuator, at, { renderScale, measureText });
  const world = (p) => placePoint(p, { x, y, s, q }).map(round);
  const normal = (n) => placePoint(n, { q }).map(round);
  const transformInterface = (port) => ({ ...port, point: world(port.point), normal: normal(port.normal) });
  const processPorts = localPorts.map((port) => ({ ...transformInterface(port), bodyPoint: world(port.bodyPoint) }));
  const interfaces = (valve.interfaces ?? []).map(transformInterface);
  const shapes = [...place(local, { x, y, s, q }), ...(operator?.shapes ?? [])];
  const corners = extent.map(world);
  const bounds = {
    left: Math.min(...corners.map(([px]) => px)) - 1,
    right: Math.max(...corners.map(([px]) => px)) + 1,
    top: Math.min(...corners.map(([, py]) => py)) - 1,
    bottom: Math.max(...corners.map(([, py]) => py)) + 1,
  };
  if (operator) {
    for (const edge of ["left", "top"]) bounds[edge] = Math.min(bounds[edge], operator.bounds[edge]);
    for (const edge of ["right", "bottom"]) bounds[edge] = Math.max(bounds[edge], operator.bounds[edge]);
  }
  const labels = labelsFor(config, valve, state, view, fallback, position, pairs, quietUnspecified);
  if (explicit && local.some(({ role, dash }) => role === "secondary" && dash)) labels.push("Hydraulic impulse");
  if (operator?.externalIdentifier) labels.push(operator.externalIdentifier);
  if (labelAnchor !== undefined && !validPoint(labelAnchor)) throw new TypeError("Expected a drawing-space label anchor");
  const side = !labelAnchor && [...processPorts, ...interfaces].some(({ normal }) => normal[1] > 0);
  const [lx, ly] = labelAnchor ?? (side ? [bounds.right + 7, bounds.top + 10] : [x, bounds.bottom + 15]);
  const font = { family: "sans-serif", size: 10, weight: 400 };
  let baseline = ly;
  let previousMetrics;
  const labelBounds = labels.map((label) => {
    const align = side ? "start" : "middle";
    const metrics = measureText?.(label, font, align);
    if (measureText && (!metrics || !["left", "right", "ascent", "descent"].every((key) =>
      Number.isFinite(metrics[key]) && metrics[key] >= 0))) throw new RangeError("Invalid valve text bounds");
    if (previousMetrics) baseline += Math.max(0, previousMetrics.descent + metrics.ascent + 4 - 14);
    const box = metrics && { left: lx - metrics.left, right: lx + metrics.right,
      top: baseline - metrics.ascent, bottom: baseline + metrics.descent };
    shapes.push({ t: [lx, baseline, label], align, fontFamily: font.family });
    baseline += 14;
    previousMetrics = metrics;
    return box;
  });
  const anchors = operator?.anchors ?? (mount ? { mount: transformInterface({ point: mount.point, normal: mount.normal }) } : {});
  const direction = config.permittedFlow ?? valve.permittedFlow;
  if (config.permittedFlow != null && (valve.permittedFlow || terminals.length !== 2 ||
      !terminals.every(({ role }) => role === "bidirectional") ||
      direction.from === direction.to || ![direction.from, direction.to].every((id) => terminals.some((port) => port.id === id)))) {
    throw new RangeError("An explicit flow direction requires two distinct bidirectional process ports");
  }
  const permittedFlow = direction && {
    from: [...processPorts, ...interfaces].find((port) => port.id === direction.from),
    to: [...processPorts, ...interfaces].find((port) => port.id === direction.to),
  };
  return {
    shapes, processPorts, interfaces, anchors, bounds, labelBounds: measureText ? labelBounds : undefined,
    ...(operator?.identifierBounds && { identifierBounds: operator.identifierBounds }),
    ports: processPorts.map((port) => port.point), portNames: processPorts.map((port) => port.id),
    connectivity: body.connectivity,
    ...(permittedFlow && { permittedFlow }),
    ...(explicit && { sensing: { kind: "hydraulic-impulse", tap: world([18, 0]), receiver: world([0, -15]) } }),
    metadata: {
      id: bodyId, bodyId: body.id, tag, mode: valve.mode, view, ...state,
      ...(preset?.valveFunction && { valveFunction: preset.valveFunction }),
      activePortPairs: pairs, representation: valve.representations ? representation : null,
      actuator: operator?.metadata ?? null,
      ...(operator && { stem: operator.stem }),
      endConnections: Object.fromEntries(processPorts.map(({ id, end }) => [id, end])),
      setpoint: setpoint === null ? null : { ...setpoint }, closedDisplay: isolationClosed ? (fallback ? "label" : "filled") : null,
      orientation: ((q % 4 + 4) % 4) * 90, verification: library[bodyId].verification,
      ...(legacyClosed !== undefined && { closed: legacyClosed }),
    },
  };
}
