import { place, placePoint, round } from "./geometry.mjs";
import { stableId } from "./primary-elements.mjs";
import { isPoint } from "./primary-layout.mjs";
import { pumpPhysical } from "./pump-physical.mjs";

export const PUMP_DOCUMENT_VERSION = 1;

const DIRECTIONS = ["in", "out", "bidirectional"];
const PIPE_KINDS = ["liquid-process", "gas-process", "two-phase-process"];
const MEDIA_KINDS = [...PIPE_KINDS, "liquid-environment", "gas-environment", "fuel-process", "process-connector"];
const PORT_KINDS = [...MEDIA_KINDS, "mechanical-drive", "mechanical-integral", "electrical-power", "control-signal"];
const choice = (selected, values, description) => {
  if (!values.includes(selected)) throw new RangeError(`Invalid ${description}: ${selected}`);
  return selected;
};

function variantFor(symbol, variant, intent) {
  const { pump } = symbol;
  const fallback = intent === "create" ? pump.defaultVariant : pump.archiveVariant ?? pump.defaultVariant;
  const selected = variant === undefined ? fallback : variant;
  return choice(selected, Object.keys(pump.variants), `variant for ${symbol.id}`);
}

function validatePlacement({ x = 0, y = 0, s = 1, q = 0 }) {
  if (![x, y, s].every(Number.isFinite) || s <= 0 || !Number.isSafeInteger(q)) throw new RangeError("Invalid pump symbol placement");
}

function configuredPorts(symbol, variant, media = {}, portKinds = {}) {
  const ports = symbol.pump.variants[variant].interfaces;
  const compatibleKinds = symbol.id === "pump-eductor" ? PIPE_KINDS : [];
  for (const [key, kind] of Object.entries(portKinds)) {
    if (!ports.some(({ id }) => id === key) || !compatibleKinds.includes(kind)) {
      throw new RangeError(`Cannot configure kind for ${symbol.id}.${key}`);
    }
  }
  for (const [key, medium] of Object.entries(media)) {
    if (!ports.some(({ id, kind }) => id === key && MEDIA_KINDS.includes(kind)) || !stableId(medium)) {
      throw new RangeError(`Invalid medium for ${symbol.id}.${key}`);
    }
  }
  if (symbol.id === "accessory-expansion-bellows" && media.end_a && media.end_b && media.end_a !== media.end_b) {
    throw new RangeError("Expansion bellows ends must use the same medium");
  }
  return ports.map((port) => ({ ...port, anchor: [...port.anchor],
    kind: Object.hasOwn(portKinds, port.id) ? portKinds[port.id] : port.kind,
    ...(Object.hasOwn(media, port.id) && { medium: media[port.id] }),
  }));
}

/** The original placement entry point defaults to archived geometry when available. */
export function placePumpSymbol(symbol, at = {}, options = {}) {
  const { intent = "load", media, portKinds } = options;
  choice(intent, ["load", "create"], "authorship intent");
  validatePlacement(at);
  const variant = variantFor(symbol, options.variant, intent);
  const entry = symbol.pump.variants[variant];
  const interfaces = configuredPorts(symbol, variant, media, portKinds)
    .map((port) => ({ ...port, point: placePoint(port.anchor, at).map(round), visible: port.schematicVisible }));
  const visible = interfaces.filter((port) => port.visible);
  const archive = variant === symbol.pump.archiveVariant;
  const shapes = place(entry.shapes, at);
  return { shapes, ports: visible.map((port) => port.point),
    portNames: archive ? undefined : visible.map((port) => port.id), connectivity: undefined, interfaces,
    metadata: { ...options, id: symbol.id, orientation: (((at.q ?? 0) % 4 + 4) % 4) * 90,
      verification: archive ? symbol.verification : entry.verification, variant, symbolId: symbol.id, group: symbol.pump.group } };
}

function pumpSymbol(library, id) {
  const symbol = Object.hasOwn(library, id) && library[id];
  if (!symbol?.pump) throw new RangeError(`Unknown Family 07 symbol: ${id}`);
  return symbol;
}

/** Report stable port identities and coordinates before an explicit variant switch. */
export function migratePumpInstance(library, instance, variant) {
  if (typeof variant !== "string" || !stableId(instance?.id) || !stableId(instance.assetId)) {
    throw new RangeError("Variant migration requires a target variant and stable symbol and asset IDs");
  }
  const { symbolId, at, media, portKinds } = instance;
  const symbol = pumpSymbol(library, symbolId);
  const before = placePumpSymbol(symbol, at, { variant: instance.variant, media, portKinds });
  const target = placePumpSymbol(symbol, at, { variant, media, portKinds });
  const portMap = before.interfaces.map((old) => {
    const next = target.interfaces.find((port) => port.id === old.id);
    return { portId: old.id, before: old.point, after: next?.point ?? null,
      reroute: !next || old.visible !== next.visible || old.point.some((value, axis) => value !== next.point[axis]) };
  });
  return { instance: { ...instance, variant }, portMap,
    addedPorts: target.interfaces.filter((port) => !before.interfaces.some(({ id }) => id === port.id)).map(({ id }) => id) };
}

function assetRecord(asset, library) {
  if (!stableId(asset?.assetId)) throw new RangeError("A pump asset requires a stable ID");
  const { role = "unspecified", state = "unknown", speedControl = "unspecified",
    actualRpm, setpointRpm, accessories = [] } = asset;
  choice(role, ["duty", "standby", "duty-assist", "unspecified"], "design role");
  choice(state, ["running", "stopped", "fault", "unknown"], "operating state");
  choice(speedControl, ["fixed", "VFD", "other", "unspecified"], "speed control");
  for (const speed of [actualRpm, setpointRpm]) {
    if (speed !== undefined && (!Number.isFinite(speed) || speed < 0)) throw new RangeError("Speed must be a nonnegative RPM");
  }
  const ids = new Set();
  if (!Array.isArray(accessories)) throw new RangeError("Expected asset accessories");
  for (const { id, symbolId, status, assetId } of accessories) {
    if (!stableId(id) || ids.has(id) || pumpSymbol(library, symbolId).pump.group !== "accessory" ||
        (assetId !== undefined && (!stableId(assetId) || assetId === asset.assetId || status !== "installed"))) {
      throw new RangeError("Invalid accessory association");
    }
    choice(status, ["installed", "optional"], "accessory status");
    ids.add(id);
  }
  return { ...asset, role, state, speedControl, accessories };
}

/** Load or author one view while retaining all other views in the serialized document. */
export function composePumpDrawing(library, document, { intent = "load", view = "schematic" } = {}) {
  choice(intent, ["load", "create"], "authorship intent");
  choice(view, ["schematic", "plan", "section", "electrical"], "pump view");
  const { version = 0, assets = [], instances = [], connections = [], boundaries = [] } = document;
  if (![0, PUMP_DOCUMENT_VERSION].includes(version) ||
      ![assets, instances, connections, boundaries].every(Array.isArray)) throw new RangeError("Invalid pump document");
  const registered = new Map();
  for (const input of assets) {
    const asset = assetRecord(input, library);
    if (registered.has(asset.assetId)) throw new RangeError(`Duplicate asset ${asset.assetId}`);
    registered.set(asset.assetId, asset);
  }
  for (const asset of registered.values()) {
    for (const accessory of asset.accessories) {
      if (accessory.assetId !== undefined && !registered.has(accessory.assetId)) throw new RangeError("Unknown installed accessory asset");
    }
  }

  const ids = new Set();
  const selected = instances.map((instance) => {
    const { id, assetId, symbolId, views = {}, attachment, at = {} } = instance;
    const symbol = pumpSymbol(library, symbolId);
    if (!stableId(id) || ids.has(id) || !registered.has(assetId)) throw new RangeError(`Duplicate symbol instance or unknown asset: ${id}`);
    ids.add(id);
    validatePlacement(at);
    for (const [key, options] of Object.entries(views)) {
      choice(key, ["schematic", "plan", "section", "electrical"], "pump instance view");
      if (options !== false) validatePlacement(options.at ?? at);
    }
    if (attachment && (!stableId(attachment.parentId) || typeof attachment.integral !== "boolean" || symbol.pump.group !== "drive" ||
        (symbolId === "drive-integral-motor" && !attachment.integral))) throw new RangeError("Drive attachment requires an explicit parent and integral choice");
    if (symbolId === "drive-integral-motor" && !attachment) throw new RangeError("Integral motor requires a parent instance");
    return { ...instance, variant: variantFor(symbol, instance.variant, intent) };
  });
  const byInstance = new Map(selected.map((instance) => [instance.id, instance]));
  for (const { id, assetId, attachment } of selected) {
    if (!attachment) continue;
    const parent = byInstance.get(attachment.parentId);
    if (!parent || parent.id === id || !["pump", "blower"].includes(pumpSymbol(library, parent.symbolId).pump.group) ||
        attachment.integral !== (assetId === parent.assetId)) {
      throw new RangeError("Integral drives share the parent asset ID and independent drives have their own");
    }
  }

  const blocks = selected.flatMap((instance) => {
    const { id, assetId, symbolId, variant, views = {}, media, portKinds, attachment } = instance;
    const placement = views[view];
    if (placement === false || (view !== "schematic" && placement === undefined)) return [];
    const at = placement?.at ?? instance.at ?? {};
    const symbol = pumpSymbol(library, symbolId);
    const asset = registered.get(assetId);
    const schematic = placePumpSymbol(symbol, at, { variant, media, portKinds });
    const result = view === "schematic" ? schematic : pumpPhysical(view, asset.physical,
      schematic.interfaces, at, placement);
    return [{ ...result, metadata: { ...schematic.metadata, id, assetId, symbolId, view,
      role: asset.role, state: asset.state, speedControl: asset.speedControl, actualRpm: asset.actualRpm,
      setpointRpm: asset.setpointRpm, ...(attachment && { attachment }) } }];
  });
  const network = view === "schematic" ? pumpNetwork([...blocks, ...boundaries.map(pumpBoundary)], connections) : undefined;
  const schedule = [...registered.values()].map((asset) => ({
    ...asset, symbolIds: selected.filter(({ assetId }) => assetId === asset.assetId).map(({ id }) => id),
  }));
  return { document: { ...document, version: PUMP_DOCUMENT_VERSION, assets: schedule.map(({ symbolIds, ...asset }) => asset),
    instances: selected, connections, boundaries }, blocks, network, schedule };
}

/** Author an explicit host tie-in, supply or branch for the typed equipment network. */
export function pumpBoundary({ id, kind, point, direction, medium, terminal = "boundary" }) {
  if (!stableId(id) || !isPoint(point) || !PORT_KINDS.includes(kind) || !DIRECTIONS.includes(direction) ||
      (medium !== undefined && (!MEDIA_KINDS.includes(kind) || !stableId(medium))) ||
      !["boundary", "branch"].includes(terminal) || (terminal === "branch" && !PIPE_KINDS.includes(kind))) {
    throw new RangeError("Invalid equipment connection boundary");
  }
  return { metadata: { id, kind: "pump-boundary", terminal },
    interfaces: [{ id: "tie", kind, direction, point: [...point], medium, visible: true }] };
}

function compatibleKind(kind, actual) {
  if (actual === "process-connector") return PIPE_KINDS.includes(kind);
  return kind === actual;
}

/** Resolve explicitly typed routes. Hidden engineering interfaces can join topology-only edges. */
export function pumpNetwork(instances, connections = []) {
  const blocks = new Map(), usedPorts = new Set(), ids = new Set(), bellows = new Map();
  for (const instance of instances) {
    const id = instance.metadata?.id;
    if (!stableId(id) || blocks.has(id)) throw new RangeError(`Duplicate or invalid equipment network block: ${id}`);
    blocks.set(id, instance);
  }
  const edges = connections.map(({ id, kind, medium, from, to, via = [], layer = "schematic" }) => {
    if (!stableId(id) || ids.has(id) || !PORT_KINDS.includes(kind) || kind === "process-connector" ||
        from?.blockId === to?.blockId || !Array.isArray(via) || !via.every(isPoint) ||
        !["schematic", "topology"].includes(layer) || (MEDIA_KINDS.includes(kind) !== stableId(medium))) {
      throw new RangeError("Invalid equipment connection");
    }
    ids.add(id);
    const resolve = (ref, direction) => {
      const block = blocks.get(ref?.blockId);
      const port = block?.interfaces?.find((iface) => iface.id === ref?.portId);
      if (!port || !compatibleKind(kind, port.kind) || ![direction, "bidirectional"].includes(port.direction) ||
          (layer === "schematic" && !port.visible) || (port.medium !== undefined && medium !== port.medium)) {
        throw new RangeError(`Incompatible equipment connection ${id}: ${ref?.blockId}.${ref?.portId}`);
      }
      if (usedPorts.has(port)) throw new RangeError(`Interface ${ref.blockId}.${ref.portId} needs an explicit tie-in`);
      usedPorts.add(port);
      if (port.kind === "process-connector") {
        const previous = bellows.get(block);
        if (previous && (previous.kind !== kind || previous.medium !== medium)) throw new RangeError("Bellows ends require the same process kind and medium");
        bellows.set(block, { kind, medium });
      }
      return { block, port };
    };
    const a = resolve(from, "out"), b = resolve(to, "in");
    for (const [end, other] of [[a, b], [b, a]]) {
      if (end.block.metadata.symbolId === "accessory-pulsation-dampener") {
        if (other.block.metadata.terminal !== "branch") throw new RangeError("A dampener requires an explicit process branch tie-in");
      }
    }
    return { id, kind, medium, from, to, layer, points: [a.port.point, ...via, b.port.point] };
  });
  return { blocks, edges };
}
