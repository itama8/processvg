import { place, placePoint, round } from "./geometry.mjs";
import { identityRow, placeIdentity } from "./instrument-ink.mjs";
import { ANALYTE_PRESETS, PRIMARY_DEFINITIONS } from "./primary-definitions.mjs";
import { boundsOf, boxAt, expand, layoutAnalyte, linePath } from "./primary-layout.mjs";

export { ANALYTE_PRESETS, PRIMARY_DEFINITIONS };
export const PRIMARY_VERSION = 1;
export const PRIMARY_ARCHIVE_IDS = Object.freeze(["fe-mag", "fe-orifice", "fe-flume", "fe-ultrasonic", "fe-float", "fe-hydrostatic"]);
const REVISED = new Set(["fe-float", "fe-hydrostatic"]);
const bodyBoxes = {
  "fe-analysis-immersion": [-4, -8, 4, 12],
  "fe-analysis-insertion": [-4, -7, 4, 12],
  "fe-analysis-cell": [-12, -9, 12, 9],
  "fe-analysis-cabinet": [-13, -11, 13, 11],
};
const legacyBounds = { "fe-ultrasonic": [-7, -8, 7, 13], "fe-float": [-3, -10, 3, 7] };
const bindingKinds = ["electrical", "pneumatic", "hydraulic", "digital-data", "mechanical", "thermal"];
const directions = ["in", "out", "bidirectional"];
export const stableId = (value) => typeof value === "string" && Boolean(value.trim()) && !/[\r\n]/u.test(value);

export function primaryMode(symbolId, mode) {
  const archived = PRIMARY_ARCHIVE_IDS.includes(symbolId);
  const result = mode ?? (archived ? "legacy" : "current");
  if (result !== "current" && (result !== "legacy" || !archived)) throw new RangeError(`Unavailable primary element mode for ${symbolId}: ${result}`);
  return result;
}

export function primaryPlacement(at) {
  const { x = 0, y = 0, s = 1, q = 0 } = at;
  if (![x, y, s].every(Number.isFinite) || s <= 0 || !Number.isSafeInteger(q)) throw new RangeError("Invalid primary element placement");
  return { x, y, s, q: ((q % 4) + 4) % 4 };
}

function shapeBounds(shapes) {
  return boundsOf(shapes.flatMap(({ d, c, bounds }) => {
    if (bounds) return [bounds.slice(0, 2), bounds.slice(2)];
    if (c) return [[c[0] - c[2], c[1] - c[2]], [c[0] + c[2], c[1] + c[2]]];
    // Family 06 candidate curves use quadratic controls. Their hull bounds the curve.
    return d ? [...d.matchAll(/(-?[\d.e+-]+) (-?[\d.e+-]+)/g)].map(([, x, y]) => [+x, +y]) : [];
  }));
}

function portDirection(port) {
  if (port.kind === "mechanical-mount") return "bidirectional";
  if (port.id === "in" || port.id === "sample-in" || port.id === "process") return "in";
  return "out";
}

function interfacesFor(interfaces, bindings, world) {
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) throw new TypeError("Primary bindings must be an object");
  for (const [id, binding] of Object.entries(bindings)) {
    if (!interfaces.some((port) => port.id === id && port.kind === "instrument-interface") ||
      !bindingKinds.includes(binding?.kind) || !directions.includes(binding.direction)) {
      throw new RangeError(`Invalid primary interface binding: ${id}`);
    }
  }
  return interfaces.map(({ id, anchor, kind }) => {
    const binding = Object.hasOwn(bindings, id) ? bindings[id] : null;
    return { id, point: world(anchor), kind: binding?.kind ?? kind,
      direction: binding?.direction ?? (kind === "instrument-interface" ? null : portDirection({ id, kind })) };
  });
}

function internalConnections(symbolId, interfaces, valve) {
  const links = {
    "fe-pressure-tap": { from: "process", to: "impulse", transfer: "process-pressure-branch" },
    "fe-diaphragm-seal": { from: "process", to: "instrument", transfer: "pressure-only", mediumContinuity: false },
    "fe-sample-point": { from: "process", to: "sample-out", transfer: "sample-extraction", joinsNetworks: false,
      valvePosition: valve?.metadata.normalPosition },
    "fe-thermowell": { from: "mount", to: "instrument", transfer: "heat-only", mediumContinuity: false },
  };
  if (Object.hasOwn(links, symbolId)) return [links[symbolId]];
  const pair = interfaces.filter(({ kind }) => kind === "process-flow" || kind === "sample-flow");
  return pair.length === 2 ? [{ from: pair[0].id, to: pair[1].id, transfer: pair[0].kind }] : [];
}

export function primaryBody(library, config, at = {}, display = {}) {
  const { symbolId, id = symbolId, assetId = id, mode, installation, principle,
    analyteDefinition, reportingBasis, identityGlyph, identityStyle, bindings = {},
    version = PRIMARY_VERSION, samplingValve, tappingSpecification } = config;
  const preset = Object.hasOwn(ANALYTE_PRESETS, symbolId) ? ANALYTE_PRESETS[symbolId] : null;
  if (!preset && !Object.hasOwn(PRIMARY_DEFINITIONS, symbolId)) throw new RangeError(`Unknown primary element: ${symbolId}`);
  if (version !== PRIMARY_VERSION || !stableId(id) || !stableId(assetId) ||
      ![principle, analyteDefinition, reportingBasis, identityGlyph].every((value) => value === undefined || stableId(value))) {
    throw new RangeError("Invalid primary element identity or version");
  }
  const install = installation ?? preset?.base.slice("fe-analysis-".length);
  const bodyId = preset ? `fe-analysis-${install}` : symbolId;
  if ((preset && !Object.hasOwn(bodyBoxes, bodyId)) || (!preset && (installation !== undefined ||
      [analyteDefinition, reportingBasis, identityGlyph, identityStyle].some((value) => value !== undefined)))) {
    throw new RangeError("Installation and analyte identity overrides require an analyte preset");
  }
  const selectedMode = primaryMode(symbolId, mode);
  const found = PRIMARY_DEFINITIONS[bodyId];
  const legacy = PRIMARY_ARCHIVE_IDS.includes(bodyId) && (selectedMode === "legacy" || !REVISED.has(bodyId));
  const placement = primaryPlacement(at);
  const world = (p) => placePoint(p, placement).map(round);
  const { s, q } = placement;
  if (bodyId === "fe-thermowell" && Object.hasOwn(bindings ?? {}, "instrument") &&
      !["thermal", "mechanical"].includes(bindings.instrument?.kind)) {
    throw new RangeError("A thermowell interface supports heat sensing or mechanical attachment");
  }
  const raw = legacy ? library[bodyId].draw({}) : found.shapes;
  const shapes = place(raw.filter(({ fontSize }) => fontSize === undefined), placement);
  for (const { t, fontSize } of raw.filter((shape) => shape.fontSize !== undefined)) {
    shapes.push(placeIdentity(identityRow(t[2], fontSize, display.measureInk), world(t), s));
  }
  const localInterfaces = found.interfaces.map((port, index) => ({
    ...port, anchor: legacy ? library[bodyId].ports[index] : port.anchor,
  }));
  const interfaces = interfacesFor(localInterfaces, bindings, world);
  let valve;
  if (bodyId === "fe-sample-point") {
    if (samplingValve !== undefined && (!samplingValve || typeof samplingValve !== "object" ||
        Object.keys(samplingValve).some((key) => key !== "normalPosition"))) throw new RangeError("Invalid sampling valve specification");
    const [x, y] = placePoint([0, -9], placement);
    valve = library.composeValve({ bodyId: "valve-gate", ...samplingValve }, { x, y, s: s / 2, q: q + 1 }, { quietUnspecified: true });
    shapes.push(...valve.shapes);
  } else if (samplingValve !== undefined) throw new RangeError("Sampling valve requires a sampling point");

  const worldBox = (box) => boundsOf([world(box.slice(0, 2)), world(box.slice(2))]);
  const sensing = found.sensing && {
    origin: world(found.sensing.origin),
    direction: found.sensing.direction && placePoint(found.sensing.direction, { q }),
  };
  if (legacy && REVISED.has(bodyId)) {
    sensing.origin = world([0, bodyId === "fe-float" ? 4 : 8]);
  }
  const stations = found.sensingStations?.map(({ id, anchor }) => ({ id, point: world(anchor), status: "schematic-marker" })) ?? [];
  if (tappingSpecification !== undefined && (bodyId !== "fe-flow-venturi" ||
      !stableId(tappingSpecification?.source) || !stableId(tappingSpecification?.reference) ||
      !["m", "mm"].includes(tappingSpecification?.unit) ||
      ![tappingSpecification?.highStation, tappingSpecification?.lowStation].every(Number.isFinite))) {
    throw new RangeError("Venturi tapping specifications require source, station reference, units and explicit H/L stations");
  }
  for (const { id, anchor: [x, y] } of found.sensingStations ?? []) {
    shapes.push({ d: linePath([world([x, y - 2]), world([x, y - 5])]), role: "secondary" },
      placeIdentity(identityRow(id, 4.5, display.measureInk), world([x, y - 8]), s));
  }
  const bounds = expand(legacy && Object.hasOwn(legacyBounds, bodyId) ? worldBox(legacyBounds[bodyId]) : shapeBounds(shapes), 0.51);
  const specificationRequired = ["chlorine", "ammonium", "nitrate", "phosphate"].includes(preset?.analyte);
  const metadata = {
    id, assetId, kind: "primary-element", symbolId, bodyId, mode: selectedMode, version, orientation: q * 90, principle,
    verification: legacy ? "Archived B&C provenance" : "Design-approved workshop convention; standards verification pending",
    ...(found.defaultFlow && { defaultFlow: found.defaultFlow, orientationPolicy: found.orientationPolicy }),
    ...(tappingSpecification && { tappingSpecification: { ...tappingSpecification } }),
    ...(preset && { installation: install, analyte: preset.analyte, identityGlyph: identityGlyph ?? preset.identityGlyph,
      identityStyle, analyteDefinition, reportingBasis, specificationRequired,
      specificationComplete: !specificationRequired || Boolean(analyteDefinition && reportingBasis) }),
    ...(valve && { samplingValve: valve.metadata }),
  };
  const transfers = internalConnections(bodyId, interfaces, valve);
  return { shapes, bounds, scale: s, interfaces, ports: interfaces.map(({ point }) => point),
    portNames: interfaces.map(({ id }) => id), sensing, stations, metadata, transfers,
    ...(preset && { attachmentBounds: worldBox(bodyBoxes[bodyId]) }) };
}

export function layoutPrimaryElements(instances, display = {}) {
  const ids = new Set();
  for (const { metadata: { id } } of instances) {
    if (ids.has(id)) throw new RangeError(`Duplicate primary element ID: ${id}`);
    ids.add(id);
  }
  const labels = [];
  return instances.map((instance) => {
    if (!instance.metadata.identityGlyph) return instance;
    const boxes = instances.filter((other) => other !== instance).flatMap((other) => [
      { kind: "equipment", bounds: other.bounds },
      ...[...other.interfaces.map(({ point }) => point), ...other.stations.map(({ point }) => point),
        ...(other.sensing ? [other.sensing.origin] : [])]
        .map((point) => ({ kind: "anchor", bounds: boxAt(point, display.clearance ?? 1.5) })),
    ]);
    const { shapes, layout } = layoutAnalyte(instance, display, {
      boxes: [...boxes, ...labels.map(({ box }) => ({ kind: "identifier", bounds: box }))],
      routes: labels.flatMap(({ leader }) => leader ? [leader] : []),
    });
    labels.push(layout);
    return { ...instance, shapes: [...instance.shapes, ...shapes], identityLayout: layout };
  });
}

export function primaryMigration(library, config, at, display) {
  if (!PRIMARY_ARCHIVE_IDS.includes(config.symbolId)) throw new RangeError("Migration requires an archived primary element ID");
  const before = primaryBody(library, { ...config, mode: "legacy" }, at, display);
  const current = primaryBody(library, { ...config, mode: "current" }, at, display);
  return { current, portMap: before.interfaces.map(({ id, point }, i) => {
    const after = current.interfaces[i].point;
    return { id, before: point, after, reroute: point.some((v, j) => v !== after[j]) };
  }) };
}
