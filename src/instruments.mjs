import { placePoint } from "./geometry.mjs";
import { identityRow, placeIdentity } from "./instrument-ink.mjs";

export const INSTRUMENT_VERSION = 1;
export const ENCLOSURES = Object.freeze(["discrete", "shared-primary", "shared-alternate", "computer"]);
export const CONNECTION_KINDS = Object.freeze([
  "process-sensing", "electrical", "pneumatic", "hydraulic", "digital-data", "logical-dependency", "mechanical",
  "filled-system", "thermal",
]);
const KINDS = ["physical-instrument", "computed-function", "control-function", "shared-display", "control-panel", "interlock-reference", "unclassified"];
const NORMALS = Object.freeze({ N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] });
const PRESET_DATA = {
  "inst-field": { kind: "physical-instrument", enclosure: "discrete", location: "field", tag: { letters: "FIT", loop: "101" } },
  "inst-panel": { kind: "control-panel", enclosure: "discrete", location: "main", panel: { identifier: "MCP", number: "102" } },
  "inst-local": { kind: "control-panel", enclosure: "discrete", location: "local", panel: { identifier: "LCP", number: "103" } },
  "inst-scada": { kind: "shared-display", enclosure: "shared-primary", location: "main", tag: { letters: "FI", loop: "101" } },
  "inst-plc": { kind: "control-function", enclosure: "shared-alternate", location: "field", tag: { letters: "LSH" } },
  "inst-interlock": { kind: "interlock-reference", form: "interlock" },
  "inst-transmitter-is": { kind: "physical-instrument", form: "transmitter-is" },
  "inst-computer": { kind: "computed-function", enclosure: "computer", location: "field", tag: { letters: "CALC", loop: "201" } },
  "inst-panel-inaccessible": { kind: "control-panel", enclosure: "discrete", location: "main", accessibility: "inaccessible", panel: { identifier: "MCP", number: "102" } },
  "inst-local-inaccessible": { kind: "control-panel", enclosure: "discrete", location: "local", accessibility: "inaccessible", panel: { identifier: "LCP", number: "103" } },
  "inst-shared-field": { kind: "shared-display", enclosure: "shared-primary", location: "field", tag: { letters: "FIT", loop: "101" } },
};
for (const preset of Object.values(PRESET_DATA)) {
  if (preset.tag) Object.freeze(preset.tag);
  if (preset.panel) Object.freeze(preset.panel);
  Object.freeze(preset);
}
export const INSTRUMENT_PRESETS = Object.freeze(PRESET_DATA);

const SQRT3 = Math.sqrt(3);
const directions = ["in", "out", "bidirectional"];
const validPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const stableId = (id) => typeof id === "string" && id.trim().length > 0;
const maxRadiusDefault = 64;
const fmt = (v) => String(Number(v.toPrecision(15)));

function transform(at, parent) {
  const x = at.x ?? 0, y = at.y ?? 0, s = at.s ?? 1;
  if (![x, y, s].every(Number.isFinite) || s <= 0 || (at.q !== undefined && !Number.isInteger(at.q))) {
    throw new RangeError("Invalid instrument placement");
  }
  if (parent && (![parent.x ?? 0, parent.y ?? 0, parent.s ?? 1].every(Number.isFinite) ||
      (parent.s ?? 1) <= 0 || !Number.isInteger(parent.q ?? 0))) throw new RangeError("Invalid instrument parent placement");
  return { origin: parent ? placePoint([x, y], parent) : [x, y], s: s * (parent?.s ?? 1) };
}

function enclosureGeometry(enclosure, r) {
  const hexHeight = r * SQRT3 / 2;
  const square = [[-r, -r], [r, -r], [r, r], [-r, r]];
  const diamond = [[0, -r], [r, 0], [0, r], [-r, 0]];
  const hex = [[-r / 2, -hexHeight], [r / 2, -hexHeight], [r, 0], [r / 2, hexHeight], [-r / 2, hexHeight], [-r, 0]];
  switch (enclosure) {
    case "shared-primary": return { polygons: [square], circle: true, height: r, extent: (y) => Math.sqrt(r * r - y * y) };
    case "shared-alternate": return { polygons: [square, diamond], height: r, extent: (y) => r - Math.abs(y) };
    case "computer": return { polygons: [hex], height: hexHeight, extent: (y) => r - Math.abs(y) / SQRT3 };
    case "discrete":
    case "transmitter-is": return { polygons: [], circle: true, height: r, extent: (y) => Math.sqrt(r * r - y * y) };
    case "interlock": return { polygons: [diamond], height: r, extent: (y) => r - Math.abs(y) };
    default: throw new RangeError(`Unknown instrument enclosure: ${enclosure}`);
  }
}

function locationBars(location, accessibility) {
  if (!["field", "main", "local"].includes(location)) throw new RangeError(`Unknown instrument location: ${location}`);
  if (accessibility !== undefined && !["accessible", "inaccessible"].includes(accessibility)) {
    throw new RangeError(`Unknown instrument accessibility: ${accessibility}`);
  }
  if (location === "field" && accessibility !== undefined) throw new RangeError("Field location has no accessibility mark");
  return { ys: location === "field" ? [] : location === "main" ? [0] : [-2, 2], dashed: accessibility === "inaccessible" };
}

// Fit whole dashes at the endpoints and center the pattern. Keeping butt caps preserves
// gaps under non-scaling stroke at compact display sizes.
function dashSegments(x, y) {
  const span = 2 * x;
  const count = Math.max(2, Math.round((span + 1.5) / 4));
  const unit = span / (count * 2.5 + (count - 1) * 1.5);
  return Array.from({ length: count }, (_, i) => [
    [-x + i * 4 * unit, y],
    [i === count - 1 ? x : -x + (i * 4 + 2.5) * unit, y],
  ]);
}

function checkedPorts(ports, anchors, kind) {
  if (!Array.isArray(ports)) throw new TypeError("Instrument ports must be an array");
  const ids = new Set(), usedAnchors = new Set();
  return ports.map((port) => {
    if (!stableId(port?.id) || ids.has(port.id)) throw new RangeError("Instrument port IDs must be unique nonempty strings");
    if (!Object.hasOwn(anchors, port.anchor)) throw new RangeError(`Unknown instrument anchor: ${port.anchor}`);
    if (!CONNECTION_KINDS.includes(port.kind) || !directions.includes(port.direction)) {
      throw new RangeError(`Invalid connection kind or direction for port ${port.id}`);
    }
    if (["process-sensing", "filled-system", "thermal"].includes(port.kind) && kind !== "physical-instrument") {
      throw new RangeError("Process sensing requires a physical instrument");
    }
    if (usedAnchors.has(port.anchor)) throw new RangeError(`Multiple interfaces at ${port.anchor} require distinct exits`);
    ids.add(port.id);
    usedAnchors.add(port.anchor);
    return { ...port, point: [...anchors[port.anchor]] };
  });
}

function overlap(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function externalIdentity(row, { origin, s }, radius, height, anchors, display) {
  const routeSegments = display.avoidRoutes ?? [];
  const obstacles = (display.avoidBounds ?? []).map((box) => {
    if (box.length !== 4 || !box.every(Number.isFinite) || box[0] > box[2] || box[1] > box[3]) {
      throw new RangeError("Invalid instrument avoidance bounds");
    }
    return box;
  });
  // Conservative segment extents avoid contact even with diagonal routes.
  for (const route of routeSegments) {
    if (!Array.isArray(route) || route.length < 2 || !route.every(validPoint)) throw new RangeError("Invalid instrument avoidance route");
    for (let i = 1; i < route.length; i++) {
      const [[x, y], [u, v]] = route.slice(i - 1, i + 1);
      obstacles.push([Math.min(x, u), Math.min(y, v), Math.max(x, u), Math.max(y, v)]);
    }
  }
  obstacles.push(...Object.values(anchors).map(([x, y]) => [x - s, y - s, x + s, y + s]));
  const gap = 4, w = row.halfWidth, h = row.halfHeight;
  const candidates = [
    [radius / 2 + w, height + gap + h], [-radius / 2 - w, height + gap + h],
    [radius / 2 + w, -height - gap - h], [-radius / 2 - w, -height - gap - h],
    [radius + gap + w, 0], [-radius - gap - w, 0],
  ];
  for (const [x, y] of candidates) {
    const shape = placeIdentity(row, [origin[0] + s * x, origin[1] + s * y], s);
    const padded = shape.bounds.map((v, i) => v + (i < 2 ? -s : s));
    if (!obstacles.some((box) => overlap(box, padded))) return shape;
  }
  throw new RangeError("No clear position for external instrument identity");
}

function normalizedIdentity(config, preset, kind, form) {
  const explicit = Object.hasOwn(config, "tag") || Object.hasOwn(config, "panel");
  const panel = explicit || kind !== preset.kind ? config.panel : preset.panel;
  const tag = explicit || kind !== preset.kind ? config.tag : preset.tag;
  if (kind === "control-panel") {
    if (panel === null && tag === undefined && config.measuredQuantity === undefined) return { rows: [] };
    if (tag !== undefined || !stableId(panel?.identifier) || config.measuredQuantity !== undefined) {
      throw new TypeError("Control panel identity uses panel.identifier and optional panel.number");
    }
    return { panel, rows: [panel.identifier, panel.number] };
  }
  if (panel !== undefined) throw new TypeError("Panel identity requires kind control-panel");
  if (tag === null && form !== "interlock") return { rows: [] }; // Migration can record missing historical identity.
  if (tag !== undefined && (typeof tag?.letters !== "string" || (tag.externalId !== undefined && !stableId(tag.externalId)))) throw new TypeError("Instrument tag requires letters");
  if (form === "interlock") {
    if (tag !== undefined) throw new TypeError("Use an interlock reference rather than an instrument tag");
    return { rows: ["I"] };
  }
  return { tag, rows: tag ? [tag.letters, tag.loop] : [] };
}

/** Compose the candidate P&ID glyph and named anchors from an authored instance. */
export function composeInstrument(config, at = {}, display = {}) {
  if ((display.mode ?? "candidate") !== "candidate") throw new RangeError("Instrument composition requires candidate mode");
  if (!stableId(config?.id)) throw new TypeError("Instrument requires a stable instance ID");
  if (config.version !== undefined && config.version !== INSTRUMENT_VERSION) throw new RangeError("Unknown instrument version");
  if (config.preset !== undefined && !Object.hasOwn(INSTRUMENT_PRESETS, config.preset)) throw new RangeError("Unknown instrument preset");
  const preset = INSTRUMENT_PRESETS[config.preset] ?? {};
  const kind = config.kind ?? preset.kind;
  if (!KINDS.includes(kind)) throw new RangeError(`Unknown instrument kind: ${kind}`);
  const placement = transform(at, display.parent);
  const { origin, s } = placement;
  const world = ([x, y]) => [origin[0] + x * s, origin[1] + y * s];
  const path = (points, close = false) => "M" + points.map((p) => world(p).map(fmt).join(" ")).join(" L") + (close ? " Z" : "");
  const form = preset.form;
  const enclosure = config.enclosure ?? preset.enclosure;
  if (form && (config.enclosure !== undefined || config.radius !== undefined || config.location !== undefined ||
      config.accessibility !== undefined || kind !== preset.kind)) throw new RangeError("Special instrument forms have fixed geometry and kind");
  if ((kind === "interlock-reference") !== (form === "interlock")) throw new RangeError("Use the interlock reference preset");
  const location = config.location ?? preset.location ?? (form ? "field" : undefined);
  const accessibility = Object.hasOwn(config, "accessibility") ? config.accessibility :
    location === preset.location ? preset.accessibility : undefined;
  const { ys, dashed } = locationBars(location, accessibility);
  const identity = normalizedIdentity(config, preset, kind, form);
  const fontSize = display.fontSize ?? 7.5;
  const minFontSize = display.minFontSize ?? 7.5;
  const maxRadius = display.maxRadius ?? maxRadiusDefault;
  const padding = display.padding ?? 1;
  const measure = display.measureInk;
  let radius = form ? 10 : (config.radius ?? 16);
  if (![fontSize, minFontSize, padding].every(Number.isFinite) || fontSize < minFontSize || minFontSize <= 0 ||
      padding < 1 || !Number.isSafeInteger(maxRadius) || maxRadius < 16 ||
      !Number.isFinite(radius) || (!form && (radius < 16 || radius > maxRadius))) throw new RangeError("Invalid instrument layout constraints");
  const rowText = identity.rows.filter((value) => value !== undefined);
  const rows = rowText.map((value) => identityRow(value, fontSize, measure));
  const external = config.tagPlacement === "external" || (form === "transmitter-is" && rows.length > 0);
  if (config.tagPlacement !== undefined && !["internal", "external"].includes(config.tagPlacement)) throw new RangeError("Invalid tag placement");
  if (form === "transmitter-is" && rows.length && config.tagPlacement === "internal") throw new RangeError("The crossed transmitter requires an external tag");
  if (external && !display.allowExternalTag && form !== "transmitter-is") throw new RangeError("External tags require project permission");
  if (form === "interlock" && external) throw new RangeError("Use an external reference for the interlock");
  const internal = external ? [] : rows;
  const offset = ys.length === 2 ? 9 : 6;
  const yPositions = internal.map(({ halfHeight }, i) => {
    if (internal.length === 1 && !ys.length) return 0;
    const bound = ys.length ? Math.abs(ys[0]) : 0;
    return (i === 0 ? -1 : 1) * Math.max(offset, bound + halfHeight + padding);
  });
  const fits = (geom) => internal.every(({ halfWidth, halfHeight }, i) => {
    const y = Math.abs(yPositions[i]) + halfHeight + padding;
    return y <= geom.height && halfWidth + padding <= geom.extent(y);
  });
  let geom = enclosureGeometry(form ?? enclosure, radius);
  while (!fits(geom) && !form && radius < maxRadius) {
    radius = Math.min(maxRadius, Math.floor(radius) + 1);
    geom = enclosureGeometry(enclosure, radius);
  }
  if (!fits(geom)) throw new RangeError(`Instrument tag overflow for ${config.id} at radius ${radius}`);
  const shapes = geom.polygons.map((points) => ({ d: path(points, true) }));
  if (geom.circle) shapes.push({ c: [...origin, radius * s], exact: true });
  if (form === "transmitter-is") {
    const leg = radius / Math.SQRT2;
    shapes.push({ d: path([[-leg, -leg], [leg, leg]]) + " " + path([[-leg, leg], [leg, -leg]]) });
  }
  const bars = ys.map((y) => {
    const x = geom.extent(y);
    const endpoints = [[-x, y], [x, y]];
    const segments = dashed ? dashSegments(x, y) : [endpoints];
    shapes.push({ d: segments.map((segment) => path(segment)).join(" "), cap: "butt" });
    return { endpoints: endpoints.map(world), segments: segments.map((segment) => segment.map(world)), dashed };
  });
  const anchors = Object.fromEntries(Object.entries(NORMALS).map(([key, [x, y]]) => [key, world([x * radius, y * geom.height])]));
  const ports = checkedPorts(config.ports ?? [], anchors, kind);
  if (config.reference !== undefined && (form !== "interlock" || !stableId(config.reference?.id) ||
      !stableId(config.reference?.logicId) || !stableId(config.reference?.label))) {
    throw new TypeError("Interlock reference requires id, logicId and label");
  }
  const identities = internal.map((row, i) => placeIdentity(row, world([0, yPositions[i]]), s));
  if (external && rows.length) {
    const row = identityRow(rowText.join("-"), fontSize, measure);
    identities.push(externalIdentity(row, placement, radius, geom.height, anchors, display));
  }
  if (config.reference) {
    const row = identityRow(config.reference.label, fontSize, measure);
    identities.push({
      ...externalIdentity(row, placement, radius, geom.height, anchors, display),
      interlockReference: config.reference,
    });
  }
  const annotations = [];
  if (config.annotation !== undefined) {
    const { service, value } = config.annotation ?? {};
    if (service === undefined && value === undefined) throw new TypeError("Instrument annotation requires service or value text");
    const avoidBounds = [...(display.avoidBounds ?? []), ...identities.map(({ bounds }) => bounds)];
    for (const [name, text] of Object.entries({ service, value })) {
      if (text === undefined) continue;
      const row = identityRow(text, fontSize, measure);
      const label = externalIdentity(row, placement, radius, geom.height, anchors, { ...display, avoidBounds });
      const { identityInk, ...ink } = label;
      annotations.push({ ...ink, annotationInk: identityInk, annotationRole: name });
      avoidBounds.push(label.bounds);
    }
  }
  const { panel, tag } = identity;
  if (identities.length) identities[0].identityTitle =
    [rowText.join("-"), tag?.externalId, config.reference?.label].filter(Boolean).join(" · ");
  const { tag: authoredTag, panel: authoredPanel, ports: authoredPorts, ...authored } = config;
  return {
    shapes: [...shapes, ...identities, ...annotations], anchors, bars, ports, radius,
    annotationBounds: annotations.map(({ bounds }) => bounds),
    identityBounds: identities.map(({ bounds }) => bounds),
    metadata: {
      ...authored, mode: "candidate", version: INSTRUMENT_VERSION, kind, enclosure, form, location,
      accessibility: accessibility ?? (ys.length ? "accessible" : undefined), orientation: 0,
      ...(panel && { panel }), ...(tag && { tag }),
      ...(form === "interlock" && { preferredAnchors: ["W", "E"] }),
    },
  };
}

/** Resolve stable assets and typed edges independently of their graphical attachment. */
export function instrumentNetwork(instances, connections = []) {
  const assets = new Map();
  for (const instance of instances) {
    const { id, kind } = instance.metadata;
    if (!stableId(id) || assets.has(id) || !KINDS.includes(kind)) throw new RangeError(`Invalid or duplicate asset ID: ${id}`);
    assets.set(id, instance);
  }
  for (const { metadata: { id, hostedBy } } of assets.values()) {
    if (hostedBy !== undefined && (hostedBy === id || assets.get(hostedBy)?.metadata.kind !== "control-panel")) {
      throw new RangeError(`Unknown hosting panel for ${id}: ${hostedBy}`);
    }
  }
  const endpoints = new Set(), ids = new Set();
  const edges = connections.map((edge) => {
    if (!stableId(edge.id) || ids.has(edge.id) || !CONNECTION_KINDS.includes(edge.kind)) {
      throw new RangeError("Invalid connection ID or kind");
    }
    ids.add(edge.id);
    const resolve = (ref, direction) => {
      const port = assets.get(ref?.assetId)?.ports.find(({ id }) => id === ref.portId);
      if (!port || port.kind !== edge.kind || (port.direction !== direction && port.direction !== "bidirectional")) {
        throw new RangeError(`Incompatible instrument connection ${edge.id}: expected ${edge.kind} ${direction} port`);
      }
      if (endpoints.has(port)) throw new RangeError(`Instrument port ${port.id} requires an explicit fan-out junction`);
      endpoints.add(port);
      return port.point;
    };
    return { ...edge, points: [resolve(edge.from, "out"), resolve(edge.to, "in")] };
  });
  const physical = instances.filter(({ metadata }) => metadata.kind === "physical-instrument");
  return { assets, edges, physicalDeviceIds: physical.map(({ metadata }) => metadata.id),
    measuringDeviceIds: physical.filter(({ metadata }) => stableId(metadata.measuredQuantity)).map(({ metadata }) => metadata.id) };
}
