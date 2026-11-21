import { composeInstrument, CONNECTION_KINDS } from "./instruments.mjs";
import { stableId } from "./primary-elements.mjs";
import { isPoint } from "./primary-layout.mjs";

const boundaryKinds = ["process-flow", "process-boundary", "sample-flow", "mechanical-mount"];
const edgeKinds = [...boundaryKinds, ...CONNECTION_KINDS];
const directions = ["in", "out", "bidirectional"];

/** A deliberate tie-in on a host pipe, vessel, sample system or mechanical support. */
export function measurementBoundary({ id, assetId = id, kind, direction, point }) {
  if (![id, assetId].every(stableId) || !boundaryKinds.includes(kind) || !directions.includes(direction) || !isPoint(point) ||
      (kind === "process-boundary" && direction !== "out")) throw new RangeError("Invalid measurement boundary");
  return { metadata: { id, assetId, kind: "measurement-boundary" }, interfaces: [{ id: "boundary", kind, direction, point: [...point] }] };
}

export function primaryInstrument(primary, config, at = {}, display = {}) {
  if (primary?.metadata?.kind !== "primary-element" || typeof config?.integral !== "boolean") {
    throw new TypeError("An instrument attachment requires a primary element and explicit integral or remote mounting");
  }
  const { integral, assetId = integral ? primary.metadata.assetId : config.id, ...instrument } = config;
  if (!stableId(assetId) || config.id === primary.metadata.id || integral !== (assetId === primary.metadata.assetId)) {
    throw new RangeError("Integral blocks share the primary asset ID; remote devices require a different asset ID");
  }
  const result = composeInstrument(instrument, at, display);
  if (result.metadata.kind !== "physical-instrument") throw new RangeError("A primary instrument attachment requires a physical instrument");
  return { ...result, metadata: { ...result.metadata, assetId, primaryId: primary.metadata.id, integral } };
}

/** Resolve typed endpoints without conflating drawing blocks, assets, and fluid domains. */
export function primaryNetwork(instances, connections = []) {
  const blocks = new Map(), assets = new Map(), primaryAssets = new Set();
  for (const instance of instances) {
    const { id, assetId = id, kind } = instance.metadata;
    if (![id, assetId].every(stableId) || blocks.has(id)) throw new RangeError(`Invalid or duplicate block ID: ${id}`);
    blocks.set(id, instance);
    if (["primary-element", "physical-instrument"].includes(kind)) {
      if (!assets.has(assetId)) assets.set(assetId, []);
      assets.get(assetId).push(id);
      if (kind === "primary-element") primaryAssets.add(assetId);
    }
  }
  for (const { metadata: { id, assetId = id, primaryId, integral, kind } } of blocks.values()) {
    if (primaryId === undefined && !(kind === "physical-instrument" && primaryAssets.has(assetId))) continue;
    const primary = blocks.get(primaryId)?.metadata;
    if (kind !== "physical-instrument" || primary?.kind !== "primary-element" ||
        typeof integral !== "boolean" || integral !== (assetId === primary.assetId)) {
      throw new RangeError(`Invalid primary asset association for ${id}`);
    }
  }

  const ids = new Set(), used = new Set();
  const edges = connections.map((edge) => {
    if (!stableId(edge.id) || ids.has(edge.id) || !edgeKinds.includes(edge.kind) || edge.from?.blockId === edge.to?.blockId) {
      throw new RangeError("Invalid measurement edge ID, kind or endpoints");
    }
    ids.add(edge.id);
    const resolve = (ref, direction) => {
      const block = blocks.get(ref?.blockId);
      const port = (block?.interfaces ?? block?.ports)?.find(({ id }) => id === ref?.portId);
      if (port?.kind !== edge.kind || ![direction, "bidirectional"].includes(port.direction) ||
          (edge.kind === "process-boundary" && direction === "out" && block.metadata.kind !== "measurement-boundary")) {
        throw new RangeError(`Incompatible measurement edge ${edge.id}: expected ${edge.kind} ${direction}`);
      }
      if (used.has(port)) throw new RangeError(`Interface ${ref.portId} requires an explicit branch or fan-out`);
      used.add(port);
      return port.point;
    };
    const start = resolve(edge.from, "out"), end = resolve(edge.to, "in");
    const via = edge.via ?? [];
    if (!Array.isArray(via) || !via.every(isPoint)) throw new RangeError("Invalid measurement route vertices");
    return { ...edge, points: [start, ...via, end] };
  });
  return { blocks, assets, edges, transfers: instances.flatMap(({ metadata, transfers }) =>
    (transfers ?? []).map((transfer) => ({ blockId: metadata.id, ...transfer }))) };
}
