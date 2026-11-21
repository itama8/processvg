import { composeActuator } from "./actuators.mjs";
import { place, placePoint, round } from "./geometry.mjs";
import { physicalGate } from "./gate-physical.mjs";
import { VALVES } from "./valves.mjs";

const bc = (ref) => ({ std: "B&C", ref });
const historical = bc("P-002, P-003");
const approved = [{ std: "Processvg design", ref: "Family 04 revision 03" }];
const verification = "Exact glyph pending standards verification";
const nrv = VALVES.find(({ id }) => id === "valve-check");
const mount = { point: [0, -10], normal: [0, -1] };
const slide = "M-2.5 -10 L2.5 -10 L2.5 10 L-2.5 10 Z";
const diagonal = "M-2.5 10 L2.5 -10";
const bulkhead = "M-4 -12 L4 -12 L4 12 L-4 12 Z";
const seam = "M-4 0 L4 0";
const path = (d) => ({ d });
const solid = (d) => ({ d, fill: "solid" });
const pair = (x) => [[-x, 0], [x, 0]];
const masked = (d, cut, cutWidth) => [
  { ...solid(d), knockout: [{ d: cut, cutWidth, cap: "butt" }] },
  path(d),
];

const historicalGlyphs = {
  "gate-slide": { ports: pair(2.5), draw: ({ closed }) => [closed ? solid(slide) : path(slide)] },
  "gate-sluice": { ports: pair(2.5), draw: ({ closed }) => [
    path(slide), closed ? solid("M2.5 -10 L2.5 10 L-2.5 10 Z") : path(diagonal),
  ] },
  "gate-flap": { ports: [[-2, 0], [4, 0]], draw: () => [path("M-2 -10 L-2 10 M-2 -10 L6 4")] },
};

export const GATE_ALIASES = { "gate-sluice": "gate-slide", "weir-v-notch": "weir" };
export const gateArchive = Object.fromEntries(Object.entries(historicalGlyphs).map(([id, { ports, draw }]) =>
  [id, { ports, shapes: id === "gate-flap" ? draw() : { open: draw({}), closed: draw({ closed: true }) } }]));

function definition(id, name, kind, ports, bounds, draw, extra = {}) {
  return {
    id, name, cat: "Gates", ports, portNames: ["in", "out"], connectivity: [[0, 1]],
    src: approved, designApproval: "Approved processvg schematic (Family 04)", verification,
    gate: { kind, bounds, mount: null }, draw, ...extra,
  };
}

export const GATES = [
  definition("gate-slide", "Slide / sluice gate", "slide", pair(2.5), [-2.5, -10, 2.5, 10],
    ({ closed } = {}) => closed ? masked(slide, diagonal, 1.2) : [path(slide), path(diagonal)], {
      states: true, historicalSources: [historical], gate: { kind: "slide", bounds: [-2.5, -10, 2.5, 10], mount, minFillScale: 1.25 },
    }),
  definition("gate-stop", "Stop logs", "stop", pair(2.5), [-2.5, -10, 2.5, 10],
    ({ closed } = {}) => [
      (closed ? solid : path)("M-2.5 -6 L2.5 -6 L2.5 10 L-2.5 10 Z"), path("M-2.5 -10 L2.5 -10"),
    ], { states: true, stateLabels: ["Removed", "Installed"], src: [bc("P-002 (stop gate)")], designApproval: undefined, verification: undefined }),
  definition("gate-flap", "Flap gate (FG)", "flap", nrv.ports, nrv.valve.bounds, nrv.draw,
    { historicalSources: [historical], glyphRef: nrv.id }),
  definition("gate-weir-adjustable", "Adjustable crest gate", "adjustable", pair(5), [-5, -10, 5, 10],
    () => [path("M-5 -10 L5 -10 L5 10 L-5 10 Z M-5 -3 L5 -3 M-5 3 L5 3")], {
      gate: { kind: "adjustable", bounds: [-5, -10, 5, 10], mount },
    }),
  definition("gate-butterfly", "Butterfly gate", "butterfly", pair(10), [-10, -10, 10, 10],
    () => [{ c: [0, 0, 10] }, path("M-6 7 L6 -7")], {
      gate: { kind: "butterfly", bounds: [-10, -10, 10, 10], mount },
    }),
  definition("gate-bulkhead", "Bulkhead / stop plate", "bulkhead", pair(4), [-7, -12, 7, 12],
    ({ closed } = {}) => [
      ...(closed ? masked(bulkhead, seam, 1.6) : [path(bulkhead), path(seam)]),
      path("M-7 -12 L7 -12 M-7 12 L7 12"),
    ], {
      states: true, stateLabels: ["Removed", "Installed"],
      gate: { kind: "bulkhead", bounds: [-7, -12, 7, 12], mount: null, minFillScale: 1 },
    }),
  definition("weir", "Weir, V-notch", "v-notch", pair(12), [-12, -6, 12, 6],
    () => [path("M-12 0 L-6 0 M6 0 L12 0"), path("M-6 -6 L0 2 L6 -6"), path("M-6 -6 L-6 6 L6 6 L6 -6")],
    { src: [bc("P-002 (weir)")], designApproval: undefined, verification: undefined }),
  definition("weir-rectangular", "Rectangular-notch weir", "rectangular", pair(12), [-12, -9, 12, 10],
    () => [path("M-12 -9 L-5 -9 L-5 2 L5 2 L5 -9 L12 -9 L12 10 L-12 10 Z")]),
  definition("weir-trapezoidal", "Trapezoidal-notch weir", "trapezoidal", pair(12), [-12, -9, 12, 10],
    () => [path("M-12 -9 L-8 -9 L-4 2 L4 2 L8 -9 L12 -9 L12 10 L-12 10 Z")]),
  definition("weir-serrated", "Serrated weir", "serrated", pair(20), [-20, -6, 20, 10],
    () => [path("M-20 -6 L-15 0 L-10 -6 L-5 0 L0 -6 L5 0 L10 -6 L15 0 L20 -6 L20 10 L-20 10 Z")]),
];

const byId = Object.fromEntries(GATES.map((gate) => [gate.id, gate]));
const fixed = new Set(["v-notch", "rectangular", "trapezoidal", "serrated"]);
const removable = new Set(["stop", "bulkhead"]);
const positioned = new Set(["slide", "flap", "butterfly"]);
const positions = ["open", "closed", "partial", "unknown"];
const failLabels = { open: "FO", closed: "FC", last: "FLP", unknown: "Fail position unknown" };
const point = (value) => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
const positionLabels = { open: "OPEN", closed: "CLOSED", partial: "PARTIAL", unknown: "Position unknown" };
const normalLabels = { ...positionLabels, open: "NO", closed: "NC", partial: "Normally partial", unknown: "Normal position unknown" };
const installationLabels = { installed: "Installed", removed: "Removed", partial: "Partial stack", unknown: "Installation unknown" };

function stateFor(config, kind) {
  const { normalPosition = null, failPosition = null, failEvent = null } = config;
  const snapshots = [config.designPosition, config.operatingPosition];
  if (snapshots.some((state) => state != null && (typeof state !== "object" || Array.isArray(state)))) {
    throw new TypeError("Gate snapshots must be objects");
  }
  const reported = snapshots.map((state) => state?.position ?? null);
  const installed = snapshots.map((state) => state?.installationState ?? null);
  const panels = snapshots.map((state) => state?.installedPanels);
  if ([normalPosition, ...reported].some((state) => state !== null && !positions.includes(state)) ||
      (failPosition !== null && failPosition !== "not-applicable" && !Object.hasOwn(failLabels, failPosition)) ||
      (failEvent !== null && (typeof failEvent !== "string" || !failEvent.trim() || /[\r\n]/.test(failEvent) ||
        failPosition === "not-applicable"))) {
    throw new RangeError("Invalid gate isolation or failure position");
  }
  if (((fixed.has(kind) || removable.has(kind) || kind === "adjustable") &&
      [normalPosition, ...reported].some((state) => state !== null)) ||
      (!["slide", "butterfly", "adjustable"].includes(kind) && (failPosition !== null || failEvent !== null))) {
    throw new RangeError("Unsupported gate position or failure input for this equipment");
  }
  if (fixed.has(kind) && snapshots.some((state) => state != null)) {
    throw new RangeError("Fixed weirs take no position snapshots");
  }
  for (const [i, state] of installed.entries()) {
    if ((state !== null && (!removable.has(kind) || !Object.hasOwn(installationLabels, state) ||
      (kind === "bulkhead" && state === "partial"))) ||
      (panels[i] !== undefined && (kind !== "stop" || !Number.isSafeInteger(panels[i]) || panels[i] < 0))) {
      throw new RangeError("Invalid removable plate or stop-log state");
    }
  }
  return { normalPosition, failPosition, failEvent };
}

function installationFor(config, kind, snapshot) {
  if (kind !== "stop" || snapshot?.installedPanels === undefined) return snapshot?.installationState ?? null;
  const { installedPanels: count, installationState } = snapshot;
  const total = config.physical?.panelHeights?.length;
  if (total !== undefined && count > total) throw new RangeError("Installed count exceeds supplied stop logs");
  const actual = count === 0 ? "removed" : total === undefined ? null : count === total ? "installed" : "partial";
  if ((count > 0 && installationState === "removed") ||
      (actual && installationState != null && installationState !== "unknown" && installationState !== actual)) {
    throw new RangeError("Stop-log installation state disagrees with the installed count");
  }
  return actual ?? installationState ?? null;
}

export function composeEquipment(config, at = {}, display = {}) {
  const { type, id = null, tag = null, installation = "unknown", actuator = null,
    sealArrangement = null, designDirection = null, displayName = null } = config;
  const canonical = Object.hasOwn(GATE_ALIASES, type) ? GATE_ALIASES[type] : type;
  if (!Object.hasOwn(byId, canonical)) throw new RangeError(`Unknown gate or weir: ${type}`);
  const body = byId[canonical];
  const { kind, mount: localMount } = body.gate;
  const { view = "schematic", stateBasis = view === "schematic" ? "normal" : undefined, convention = "current",
    renderScale = 1, closedStyle = "auto", measureText, labelAnchor, closed } = display;
  const { x = 0, y = 0, q = 0, s = 1 } = at;
  const orientation = ((q % 4 + 4) % 4) * 90;
  if (![x, y, s, renderScale, s * renderScale].every(Number.isFinite) || s <= 0 || renderScale <= 0 ||
      !Number.isSafeInteger(q) || !["auto", "label"].includes(closedStyle) ||
      !["schematic", "plan", "elevation", "section"].includes(view) ||
      !["channel", "wall", "other", "unknown"].includes(installation) ||
      ![id, tag, sealArrangement, designDirection, displayName].every((value) =>
        value === null || typeof value === "string" && value.trim() && !/[\r\n]/.test(value)) ||
      (labelAnchor !== undefined && !point(labelAnchor))) {
    throw new RangeError("Invalid gate placement or equipment data");
  }
  if (actuator !== null && !localMount) throw new RangeError("This equipment has no schematic actuator mount");
  if (designDirection !== null && (!["in-to-out", "out-to-in"].includes(designDirection) ||
      (kind === "flap" && designDirection !== "in-to-out"))) throw new RangeError("Invalid gate design direction");
  const state = stateFor(config, kind);
  const metadata = { id, tag, type: canonical, requestedType: type, kind, verification: body.verification,
    installation, sealArrangement, designDirection, displayName, view, stateBasis, orientation, ...state };
  if (view !== "schematic") {
    if (convention !== "current" || closed !== undefined) throw new RangeError("Physical views require explicit dimensions and state");
    const snapshot = stateBasis === "operating" ? config.operatingPosition : config.designPosition;
    const result = physicalGate(kind, config.physical, snapshot, { x, y, s, q }, display, installation);
    const installationState = installationFor(config, kind, snapshot);
    const shapes = [...result.shapes];
    if (tag || id) {
      const [lx, ly] = labelAnchor ?? [x, result.bounds.bottom + 15];
      shapes.push({ t: [lx, ly, tag ?? id] });
    }
    return { ...result, shapes, ports: [], portNames: [], channelPorts: [], anchors: {}, connectivity: [],
      metadata: { ...metadata, installationState } };
  }
  if (!["normal", "operating"].includes(stateBasis) || !["current", "legacy"].includes(convention)) {
    throw new RangeError("Invalid schematic state basis or convention");
  }
  const archive = convention === "legacy" && Object.hasOwn(historicalGlyphs, type) ? historicalGlyphs[type] : null;
  if (convention === "legacy" && !archive && !["gate-stop", "weir"].includes(canonical)) {
    throw new RangeError("No archived glyph for this gate");
  }
  if (closed !== undefined && (typeof closed !== "boolean" || (!body.states && kind !== "butterfly"))) {
    throw new RangeError("Boolean state requires an isolation or removable gate");
  }
  const snapshot = stateBasis === "operating" ? config.operatingPosition : config.designPosition;
  const installationState = installationFor(config, kind, snapshot);
  const position = positioned.has(kind)
    ? (stateBasis === "operating" ? snapshot?.position : state.normalPosition) ?? (closed === undefined ? null : closed ? "closed" : "open")
    : null;
  const filled = body.states && (removable.has(kind) ? installationState === "installed" || (installationState === null && closed === true)
    : position === "closed");
  const fallback = filled && convention !== "legacy" && body.gate.minFillScale !== undefined &&
    (closedStyle === "label" || s * renderScale < body.gate.minFillScale);
  const world = (p) => placePoint(p, { x, y, s, q }).map(round);
  const localPorts = archive?.ports ?? body.ports;
  const channelPorts = localPorts.map((p, i) => ({
    id: body.portNames[i], point: world(p), normal: placePoint([i ? 1 : -1, 0], { q }).map(round),
    role: kind === "flap" ? (i ? "outlet" : "inlet") : "channel",
  }));
  const operator = actuator === null ? null : composeActuator(localMount, actuator, at, { renderScale, measureText });
  const shapes = [...place((archive?.draw ?? body.draw)({ closed: filled && !fallback }), at), ...(operator?.shapes ?? [])];
  const [l, t, r, b] = archive && kind === "flap" ? [-2, -10, 6, 10] : body.gate.bounds;
  const corners = [[l, t], [r, t], [r, b], [l, b]].map(world);
  const bounds = {
    left: Math.min(...corners.map(([px]) => px), operator?.bounds.left ?? Infinity) - 1,
    right: Math.max(...corners.map(([px]) => px), operator?.bounds.right ?? -Infinity) + 1,
    top: Math.min(...corners.map(([, py]) => py), operator?.bounds.top ?? Infinity) - 1,
    bottom: Math.max(...corners.map(([, py]) => py), operator?.bounds.bottom ?? -Infinity) + 1,
  };
  const labels = [tag ?? id ?? (kind === "flap" && convention === "current" ? "FG" : null)];
  if (convention === "current") {
    if (position && (closed === undefined || fallback || kind === "butterfly")) {
      labels.push((stateBasis === "normal" ? normalLabels : positionLabels)[position]);
    }
    const removableLabel = installationState ?? (fallback && removable.has(kind) ? "installed" : null);
    if (removableLabel) labels.push(installationLabels[removableLabel]);
    if (kind === "stop" && snapshot?.installedPanels > 0 && (installationState === null || installationState === "unknown")) {
      const count = snapshot.installedPanels;
      labels.push(`${count} ${count === 1 ? "log" : "logs"} installed`);
    }
    if ((state.failPosition !== null && state.failPosition !== "not-applicable") || state.failEvent !== null) {
      labels.push(`${failLabels[state.failPosition] ?? "Fail position unspecified"}${state.failEvent ? ` on ${state.failEvent}` : ""}`);
    }
  }
  labels.push(operator?.externalIdentifier);
  const side = !labelAnchor && orientation % 180 !== 0;
  const [lx, ly] = labelAnchor ?? (side ? [bounds.right + 7, y + 4] : [x, bounds.bottom + 14]);
  labels.filter(Boolean).forEach((label, i) => shapes.push({ t: [lx, ly + i * 14, label], align: side ? "start" : "middle" }));
  const anchors = operator?.anchors ?? (localMount ? {
    mount: { point: world(localMount.point), normal: placePoint(localMount.normal, { q }).map(round) },
  } : {});
  const [inlet, outlet] = channelPorts;
  const permittedFlow = kind === "flap" ? { from: inlet, to: outlet } : null;
  const designFlow = designDirection === "in-to-out" ? { from: inlet, to: outlet } :
    designDirection === "out-to-in" ? { from: outlet, to: inlet } : null;
  return { shapes, ports: channelPorts.map(({ point }) => point), portNames: body.portNames, channelPorts,
    connectivity: body.connectivity, anchors, bounds, ...(permittedFlow && { permittedFlow }),
    ...(designFlow && { designFlow }),
    metadata: { ...metadata, convention, position, installationState, actuator: operator?.metadata ?? null,
      ...(operator && { stem: operator.stem }), closedDisplay: filled ? fallback ? "label" : "filled" : null },
  };
}
