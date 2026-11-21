import { place, placePoint, round } from "./geometry.mjs";
import { primaryPlacement, stableId } from "./primary-elements.mjs";
import { isPoint } from "./primary-layout.mjs";
import { SCREENING_ARCHIVE_IDS, SCREENING_CANDIDATES } from "./screening-definitions.mjs";
import { SCREENING_PHYSICAL_VIEWS, screeningPhysical } from "./screening-physical.mjs";

export const SCREENING_STREAMS = Object.freeze({
  wastewater: "liquid-process", "wash-water": "liquid-process", "return-liquor": "liquid-process",
  "grit-slurry": "slurry-process", "gas-process": "gas-process", "liquid-process": "liquid-process",
  "screenings-solids": "bulk-handling", "solids-bulk": "bulk-handling",
  "washed-grit": "bulk-handling", "dewatered-grit": "bulk-handling",
});

const directions = ["in", "out"];
const streamExists = (kind) => Object.hasOwn(SCREENING_STREAMS, kind);
const compatibility = (actual, kind) => actual === kind || (actual === "liquid-process" && SCREENING_STREAMS[kind] === "liquid-process");
const opposite = { in: "out", out: "in" };

export function placeScreeningCandidate(symbolId, at, options) {
  const { variant, view = "schematic", id = symbolId, assetId = id, physical, reverse = false } = options;
  const source = Object.hasOwn(SCREENING_CANDIDATES, symbolId) && SCREENING_CANDIDATES[symbolId];
  if (variant !== "candidate" || !source || !stableId(id) || !stableId(assetId) ||
      !["schematic", ...SCREENING_PHYSICAL_VIEWS].includes(view) || typeof reverse !== "boolean" ||
      (reverse && symbolId !== "conveyor-screw")) throw new RangeError("Invalid or unavailable screening candidate");
  const placement = primaryPlacement(at);
  const metadata = { id, assetId, symbolId, variant, view, orientation: placement.q * 90, verification: source.verification,
    drive: source.drive, mechanism: source.mechanism, reverse };
  if (view !== "schematic") return { ...screeningPhysical(view, physical, placement), metadata,
    interfaces: [], processInterfaces: [], mounts: [], ports: [], portNames: [] };

  const interfaces = source.interfaces.map((port) => ({
    ...port, anchor: [...port.anchor], point: placePoint(port.anchor, placement).map(round), visible: port.schematicVisible,
    direction: reverse ? opposite[port.direction] : port.direction,
    connectionLayer: SCREENING_STREAMS[port.kind] ?? "mechanical",
  }));
  const processInterfaces = interfaces.filter(({ kind }) => streamExists(kind));
  const visible = processInterfaces.filter(({ visible }) => visible);
  return { shapes: place(source.shapes, placement), metadata, interfaces, processInterfaces,
    mounts: interfaces.filter(({ connectionLayer }) => connectionLayer === "mechanical"),
    ports: visible.map(({ point }) => point), portNames: visible.map(({ id }) => id) };
}

export function screeningMigration(library, { symbolId, id = symbolId, assetId = id, at = {} }, variant) {
  if (!SCREENING_ARCHIVE_IDS.includes(symbolId) || variant !== "candidate") throw new RangeError("Expected a legacy screening record and explicit candidate target");
  const { interfaces } = placeScreeningCandidate(symbolId, at, { id, assetId, variant });
  return { instance: { symbolId, id, assetId, at, variant },
    legacyPorts: library[symbolId].ports.map((anchor, index) => ({ index, point: placePoint(anchor, at).map(round) })),
    candidateInterfaces: interfaces,
    requiresConnectionReview: true };
}

/** Compose alternate views by asset identity. An integral drive cannot register a second asset. */
export function composeScreeningDocument(document, { view = "schematic" } = {}) {
  const { version = 1, assets, connections = [], tieIns = [] } = document ?? {};
  if (version !== 1 || !Array.isArray(assets) || !Array.isArray(tieIns) ||
      !Array.isArray(connections) || !["schematic", ...SCREENING_PHYSICAL_VIEWS].includes(view)) {
    throw new RangeError("Invalid screening document");
  }
  const ids = new Set();
  const schedule = assets.map(({ assetId, symbolId, variant, reverse, physical, views = {} }) => {
    if (!stableId(assetId) || ids.has(assetId) || variant !== "candidate" || !Object.hasOwn(SCREENING_CANDIDATES, symbolId) ||
        !Object.keys(views).every((key) => ["schematic", ...SCREENING_PHYSICAL_VIEWS].includes(key)) ||
        (reverse !== undefined && (typeof reverse !== "boolean" || (reverse && symbolId !== "conveyor-screw")))) {
      throw new RangeError(`Duplicate or invalid screening asset: ${assetId}`);
    }
    ids.add(assetId);
    return { assetId, symbolId, variant, reverse, physical, views, drive: SCREENING_CANDIDATES[symbolId].drive };
  });
  const blocks = schedule.flatMap(({ assetId, symbolId, variant, physical, views, reverse }) => {
    if (view !== "schematic" && !Object.hasOwn(views, view)) return [];
    return [placeScreeningCandidate(symbolId, views[view] ?? {}, { variant, view, id: assetId, assetId, physical, reverse })];
  });
  return { blocks, schedule,
    network: view === "schematic" ? screeningNetwork([...blocks, ...tieIns.map(screeningTieIn)], connections) : undefined };
}

/** Ports at a document boundary or explicit fork/join. A junction only carries one stream kind. */
export function screeningTieIn({ id, kind, point, ports }) {
  if (!stableId(id) || !streamExists(kind) || !isPoint(point) || !Array.isArray(ports) || !ports.length ||
      !ports.every((port) => stableId(port?.id) && directions.includes(port.direction)) ||
      new Set(ports.map((port) => port.id)).size !== ports.length ||
      (ports.length > 1 && (kind !== "wastewater" || !directions.every((direction) => ports.some((port) => port.direction === direction))))) {
    throw new RangeError("Invalid screening boundary or wastewater junction");
  }
  return { metadata: { id }, processInterfaces: ports.map(({ id, direction }) =>
    ({ id, kind, direction, point: [...point], visible: true, connectionLayer: SCREENING_STREAMS[kind] })) };
}

/** Route from an outlet to an inlet. External families may explicitly adapt process endpoints. */
export function screeningNetwork(blocks, connections) {
  const registry = new Map();
  const used = new Map(), ids = new Set();
  for (const block of blocks) {
    const { id } = block.metadata ?? {};
    const ports = block.processInterfaces;
    if (!stableId(id) || registry.has(id) || !Array.isArray(ports) ||
        !ports.every((port) => stableId(port.id) && streamExists(port.kind) && directions.includes(port.direction) && isPoint(port.point)) ||
        new Set(ports.map((port) => port.id)).size !== ports.length) {
      throw new RangeError(`Duplicate or invalid screening block: ${id}`);
    }
    registry.set(id, { ports, symbolId: block.metadata.symbolId });
    used.set(id, new Set());
  }
  const edges = connections.map(({ id, kind, from, to, via = [] }) => {
    if (!stableId(id) || ids.has(id) || !streamExists(kind) || from?.blockId === to?.blockId ||
        !Array.isArray(via) || !via.every(isPoint)) throw new RangeError(`Invalid screening edge: ${id}`);
    ids.add(id);
    const resolve = (ref, direction) => {
      const port = registry.get(ref?.blockId)?.ports.find(({ id }) => id === ref?.portId);
      if (!port?.visible || port.direction !== direction || !compatibility(port.kind, kind)) {
        throw new RangeError(`Incompatible screening edge ${id}: ${ref?.blockId}.${ref?.portId}`);
      }
      if (used.get(ref.blockId).has(port.id)) throw new RangeError(`Screening port in use: ${ref.blockId}.${port.id}`);
      used.get(ref.blockId).add(port.id);
      return port.point;
    };
    return { id, kind, connectionLayer: SCREENING_STREAMS[kind], from, to,
      points: [resolve(from, "out"), ...via, resolve(to, "in")].map((point) => [...point]) };
  });
  const streamByMixer = new Map();
  for (const edge of edges) {
    for (const { blockId } of [edge.from, edge.to]) {
      if (registry.get(blockId).symbolId !== "mixer-static") continue;
      const previous = streamByMixer.get(blockId);
      if (previous && previous !== edge.kind) throw new RangeError(`Static mixer requires the same liquid stream: ${blockId}`);
      streamByMixer.set(blockId, edge.kind);
    }
  }
  return { edges };
}
