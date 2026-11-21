import handoff from "./data/family-08-handoff.mjs";
import { driveIdentity } from "./drive-ink.mjs";
import { normalizeEquipmentPath } from "./geometry.mjs";

export const SCREENING_VERIFICATION = "Provisional Processvg geometry. Visual and standards approval pending.";

const alternatives = {
  "screen-bar": { add: ["M-14 0 H-0.63 M5.22 0 H14"], replace: { 1: "M7.4 -10.05 V-13" } },
  "screen-fine": { replace: { 3: "M-2 -7 V-12 H8" } },
  "screen-step": { replace: { 2: "M11 -12 V-15" } },
  "screen-drum": {
    replace: { 1: "M-6 -4.5 V4.5 M-2 -6 V6 M2 -6 V6 M6 -4.5 V4.5" },
  },
  "screen-manual": { add: ["M4 -13 V-15.8 M1 -13 V-15.8"] },
  "grit-classifier": {
    replace: { 1: "M-12 -2 V-10", 2: "M-16 1 H-21 V-13" },
    ports: { grit_slurry_in: { anchor: [-12, -10] }, return_liquor: { anchor: [-21, -13] },
      dewatered_grit_out: { kind: "dewatered-grit" } },
  },
  "grit-separator": { add: ["M0 -12 V-18 M0 12 V17"],
    ports: { overflow_liquid: { anchor: [0, -18] }, underflow_grit: { anchor: [0, 17] } } },
  "container": { replace: { 1: "M0 -13 V-6" }, ports: { screenings_in: { anchor: [0, -13] } } },
  "grit-vortex": {
    replace: { 0: "M-25 -17 H0", 3: "M-8 -6 C1 -16 14 -4 9 5 C5 13 -7 10 -6 2" },
    ports: { influent: { anchor: [-25, -17] } },
  },
  "grit-aerated": { replace: { 3: "M-12 -19 V-10 M-12 -10 H-16 V12 H-12" } },
};

const distinctMechanisms = {
  "grit-separator": "hydrocyclone", "grit-vortex": "open-vortex",
  "grit-aerated": "aerated-chamber", "grit-horizontal": "horizontal-flow",
};

function candidate({ id, geometry, ports, group, label, notes, variants }) {
  const { replace = {}, add = [], ports: overrides = {} } = alternatives[id] ?? {};
  const manual = id === "screen-manual";
  const motor = geometry.texts.some(([, , glyph]) => glyph === "M");
  return {
    id, group, label, notes, verification: SCREENING_VERIFICATION,
    legacyId: variants ? id : undefined,
    drive: manual ? "manual-rake" : motor ? "integral-motor" : undefined,
    mechanism: distinctMechanisms[id],
    shapes: [
      ...[...geometry.paths.map((d, index) => replace[index] ?? d), ...add].map((d) => ({ d: normalizeEquipmentPath(d) })),
      ...geometry.secondaryPaths.map((d) => ({ d: normalizeEquipmentPath(d), role: "secondary" })),
      ...geometry.circles.map((c) => ({ c })),
      ...geometry.texts.map(([x, y, label, size]) => driveIdentity(label, [x, y], size)),
    ],
    interfaces: ports.map(({ name, ...port }) => ({ id: name, ...port, ...overrides[name] })),
  };
}

export const SCREENING_CANDIDATES = Object.fromEntries(handoff.symbols.map((source) => [source.id, candidate(source)]));
export const SCREENING_ARCHIVE_IDS = handoff.symbols.filter(({ variants }) => variants).map(({ id }) => id);
