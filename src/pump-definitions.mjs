import handoff from "./data/family-07-handoff.mjs";
import { normalizeEquipmentPath } from "./geometry.mjs";
import { driveIdentity } from "./drive-ink.mjs";

export const PUMP_APPROVAL = "Family 07 Revision 03";
export const PUMP_CANDIDATE = "User-approved Processvg proposal; drawing legend and standards verification pending";

const archiveVariants = {
  "pump-centrifugal": "compact",
  "pump-submersible": "legacy",
  "pump-pc": "legacy",
  "pump-dosing": "legacy-assembly",
  "blower-lobe": "legacy",
  "blower-centrifugal": "legacy",
};

const geometryCorrections = {
  "pump-airlift": [
    "M-3 18 V-16 H3 V18 M-3 18 L0 20 L3 18",
    "M-15 -5 V13 H-3",
    "M-8 10 L-3 8 L-8 6",
    "M0 11 V-12 M-2 -8 L0 -12 L2 -8",
    "M0 -16 V-22 M0 20 V23",
  ],
  "pump-eductor": ["M-24 0 H-12 L-3 -4 H5 L15 -8 V8 L5 4 H-3 L-12 0",
    "M0 17 V4 M-4 9 L0 5 L4 9", "M15 0 H24"],
  "drive-vfd": ["M-14 -11 H14 V11 H-14 Z", "M-10 -7 Q-5 -11 0 -7 T10 -7"],
  "accessory-pulsation-dampener": ["M0 12 V0.5", "M-7 -14 Q0 -18 7 -14 V-4 Q0 5 -7 -4 Z", "M-7 -8 H7"],
};

// These are plugs or mounts on a body outline. Their connection lines belong to the drawing.
const hiddenInterfaces = {
  "pump-piston": ["drive"],
  "pump-archimedes": ["drive"],
};
const terminalAnchors = {
  "pump-airlift": { air_injection: [-15, -5] },
  "drive-integral-motor": { electric_supply: [0, -14] },
};
const shaft = (anchor) => ({ id: "shaft", anchor, kind: "mechanical-drive", direction: "in", schematicVisible: true });
const optionalShafts = {
  "blower-lobe": [0, -15],
  "blower-centrifugal": [0, 9],
  "blower-screw": [0, -10],
  "blower-multistage": [0, -8],
  "compressor-piston": [0, -10],
};

function candidateShapes(id, variant, geometry) {
  const paths = geometryCorrections[id + "/" + variant] ?? geometryCorrections[id] ?? geometry.paths;
  return [
    ...paths.map((d) => ({ d: normalizeEquipmentPath(d) })),
    ...geometry.circles.map((c) => ({ c })),
    ...(geometry.texts ?? []).map(([x, y, label]) => driveIdentity(label, [x, y - 2.5], id === "drive-vfd" ? 7 : 9)),
  ];
}

function interfaces(id, ports) {
  return ports.map(({ name, anchor, kind, schematicVisible = true, physicalViewVisible, direction }) => ({
    id: name,
    anchor: terminalAnchors[id]?.[name] ?? anchor,
    kind: kind === "electrical" ? "electrical-power" : kind,
    direction,
    schematicVisible: schematicVisible && !hiddenInterfaces[id]?.includes(name),
    ...(physicalViewVisible && { physicalViewVisible }),
  }));
}

/** Join approved candidates with the six unchanged source records. */
export function pumpDefinitions(archive) {
  return handoff.symbols.map((source) => {
    const { id, group, label, notes, status: sourceStatus } = source;
    const historical = archive.find((record) => record.id === id);
    const archiveVariant = archiveVariants[id];
    const defaultVariant = source.defaultVariant ?? "refined";
    const candidates = source.variants ?? { [defaultVariant]: source.geometry };
    const baseInterfaces = interfaces(id, source.ports);
    const variants = Object.fromEntries(Object.entries(candidates).filter(([variant]) => variant !== archiveVariant)
      .map(([variant, geometry]) => [variant, { shapes: candidateShapes(id, variant, geometry),
        interfaces: [...baseInterfaces, ...(optionalShafts[id] ? [shaft(optionalShafts[id])] : [])], verification: PUMP_CANDIDATE }]));
    if (historical) {
      const archivedPorts = baseInterfaces.filter(({ id }) => id !== "shaft" && id !== "wet_well_intake" && id !== "power_cable");
      variants[archiveVariant] = {
        shapes: historical.draw({}),
        interfaces: archivedPorts.map((port, index) => ({ ...port, anchor: historical.ports[index] })),
        verification: "Historical source snapshot",
      };
    }
    if (id === "pump-dosing") {
      variants.head = { shapes: candidateShapes(id, "head", { ...source.geometry,
        paths: source.geometry.paths.slice(0, 2), texts: [] }),
        interfaces: [...baseInterfaces, shaft([0, 5])], verification: PUMP_CANDIDATE };
    }

    const listed = variants[archiveVariant ?? defaultVariant];
    return {
      id, name: historical?.name ?? label, cat: "Pumps and blowers",
      src: historical?.src ?? [{ std: "Processvg design", ref: PUMP_APPROVAL }],
      ports: historical?.ports ?? listed.interfaces.filter((port) => port.schematicVisible).map((port) => port.anchor),
      draw: historical?.draw ?? (() => listed.shapes),
      ...(!historical && { designApproval: PUMP_APPROVAL, verification: PUMP_CANDIDATE }),
      pump: {
        label, group, archiveVariant, defaultVariant, variants, sourceStatus, notes,
        ...(source.rehomeDecision && { rehomeDecision: source.rehomeDecision }),
        ...(id === "drive-vfd" && { connectionLayer: "electrical", shaftChainEligible: false }),
      },
    };
  });
}
