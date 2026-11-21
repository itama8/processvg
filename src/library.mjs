// P&ID symbol library for water and wastewater treatment drafts.
//
// Each symbol is drawn in local units around (0, 0), typically inline left to right, sized for a
// 560 × 440 Plotter canvas (a valve body is 16 × 10). Geometry uses absolute M, L, A, Z
// path commands with quadratic and cubic controls, so it can be moved, scaled and quarter-turned.
//
// Sources, cited per symbol:
//   IS 3232:1999  Recommendations on graphical symbols for PFDs and P&IDs (BIS), by symbol no.
//   ISA-5.1       ANSI/ISA-5.1-2009 Instrumentation symbols and identification
//   B&C           Brown and Caldwell legend sheets P-002 and P-003, Pahala WWTP design-build
//                 documents (County of Hawaii, 2021; published by US EPA)
//   Proposed      Not in those sources; drafted here, to agree with the firm before use
//
// Conventions agreed with the user: a valve or gate drawn filled is normally closed.

import { place, placePoint, round } from "./geometry.mjs";
import { assembleValve, VALVES } from "./valves.mjs";
import { GATES, GATE_ALIASES, composeEquipment } from "./gates.mjs";
import { OPERATORS, drawPresetHead, placeOperator } from "./actuators.mjs";

import { composeInstrument, INSTRUMENT_PRESETS } from "./instruments.mjs";
import { LOGIC_IDS, placeLogicPrimitive } from "./logic.mjs";
import { ANALYTE_PRESETS, PRIMARY_ARCHIVE_IDS, PRIMARY_DEFINITIONS, layoutPrimaryElements, primaryBody,
  primaryMigration, primaryMode } from "./primary-elements.mjs";
import { measurementView } from "./measuring-structures.mjs";

import { pumpDefinitions } from "./pump-definitions.mjs";
import { placePumpSymbol, composePumpDrawing, migratePumpInstance } from "./pumps.mjs";

import { SCREENING_ARCHIVE_IDS, SCREENING_CANDIDATES } from "./screening-definitions.mjs";
import { placeScreeningCandidate, screeningMigration } from "./screening.mjs";

import { drawStructure } from "./structure-drawing.mjs";
export { createStructureModel, assertStructurePortConnection, structureInventory, structureSitePoint,
  STRUCTURE_RECORDS, STRUCTURE_VIEWS, STRUCTURE_DATUM, STRUCTURE_SOURCE_LEADS,
  DECANTER_IDS, solveStructureDecanter } from "./structures.mjs";
export { projectStructure } from "./structure-projections.mjs";

/** Render one of the four Family 09 views from a validated metric assembly. */
export function composeStructure(model, options = {}) {
  return drawStructure(placeSymbol, model, options);
}

export { SCREENING_ARCHIVE_IDS, SCREENING_CANDIDATES };
export { composeScreeningDocument, screeningTieIn, screeningNetwork, SCREENING_STREAMS } from "./screening.mjs";

export { pumpBoundary, pumpNetwork, PUMP_DOCUMENT_VERSION } from "./pumps.mjs";

export { composeInstrument, instrumentNetwork, INSTRUMENT_VERSION, INSTRUMENT_PRESETS } from "./instruments.mjs";
export { composeLogicDiagram, logicTruth, placeLogicPrimitive, resolveInterlockReference } from "./logic.mjs";
export { ANALYTE_PRESETS, PRIMARY_ARCHIVE_IDS, PRIMARY_VERSION } from "./primary-elements.mjs";
export { measurementBoundary, primaryInstrument, primaryNetwork } from "./primary-network.mjs";

export { GATE_ALIASES, composeEquipment, gateArchive } from "./gates.mjs";
export { composeActuator, placeOperator } from "./actuators.mjs";

export { place, placePoint };

const IS = (no) => ({ std: "IS 3232", ref: no });
const ISA = (ref) => ({ std: "ISA-5.1", ref });
const BC = (sheet) => ({ std: "B&C", ref: sheet });
const PROPOSED = { std: "Proposed", ref: "to agree" };
const primaryApproval = { designApproval: "Family 06 Revision 03", verification: "Workshop convention; standards verification pending" };
const primaryCatalogueSymbols = Object.entries({ ...PRIMARY_DEFINITIONS, ...ANALYTE_PRESETS })
  .filter(([id]) => !PRIMARY_ARCHIVE_IDS.includes(id))
  .map(([id, { name, interfaces, base }]) => ({
    id, name, cat: "Primary elements", src: [{ std: "processvg design", ref: "Family 06 Revision 03" }],
    ...primaryApproval, ports: (interfaces ?? PRIMARY_DEFINITIONS[base].interfaces).map(({ anchor }) => anchor),
    draw: () => composePrimaryElement({ symbolId: id }).shapes,
  }));

// Path helpers -------------------------------------------------------------------------
const pt = (x, y) => `${x} ${y}`;
const line = (...p) => "M" + p.map(([x, y]) => pt(x, y)).join(" L");
const poly = (...p) => line(...p) + " Z";
const arc = (x0, y0, r, x1, y1, large = 0, sweep = 1) => `M${pt(x0, y0)} A${r} ${r} 0 ${large} ${sweep} ${pt(x1, y1)}`;
const rect = (x, y, w, h) => poly([x, y], [x + w, y], [x + w, y + h], [x, y + h]);

// A shape is { d, role?, fill? } (role defaults to primary) or { c: [cx, cy, r], ... } or
// { t: [x, y, text] }. fill: "solid" for a closed state or a filled mark.
const S = (d, extra = {}) => ({ d, ...extra });
const C = (cx, cy, r, extra = {}) => ({ c: [cx, cy, r], ...extra });
const T = (x, y, text, extra = {}) => ({ t: [x, y, text], ...extra });

// Valve body: two triangles tip to tip. Filled when normally closed.
const bowtie = (closed) => S(poly([-8, -5], [8, 5], [8, -5], [-8, 5]), closed ? { fill: "solid" } : {});
const VALVE_PORTS = [[-8, 0], [8, 0]];

function legacyActuator(id, name, src, type, extras = {}) {
  return { id, name, cat: "Actuators", src, ports: VALVE_PORTS,
    verification: "Exact geometry not standards-verified",
    assemblyPreset: { bodyId: "valve-gate", actuator: { type }, ...extras },
    draw: () => [bowtie(false), ...drawPresetHead(type)],
  };
}

const THROUGH = [[0, 1]];
const ENDS = ["in", "out"];
const CROSS_PORTS = [[-12, 0], [12, 0], [0, -12], [0, 12]];
const CROSS_NAMES = ["left", "right", "top", "bottom"];

export function crossover({ radius = 4, clearance = 1.5 } = {}) {
  if (!Number.isFinite(radius) || !Number.isFinite(clearance) ||
      radius <= 0 || clearance <= 0 || radius + clearance >= 12) {
    throw new RangeError("Crossover requires positive radius and clearance with a sum below 12");
  }
  return [S(`M-12 0 L${-radius} 0 A${radius} ${radius} 0 0 1 ${radius} 0 L12 0 M0 -12 L0 ${-radius - clearance} M0 ${-radius + clearance} L0 12`,
    { cap: "butt" })];
}

function fitting(id, name, d, ports, flatSide) {
  return { id, name, cat: "Lines", src: [PROPOSED], draw: () => [S(d)], ports,
    portNames: ENDS, connectivity: THROUGH, verification: "Proposed", flatSide };
}

const candidateInstruments = [
  ["inst-computer", "Computer function"],
  ["inst-panel-inaccessible", "Main panel, inaccessible"],
  ["inst-local-inaccessible", "Local panel, inaccessible"],
  ["inst-shared-field", "Field shared display"],
].map(([id, name]) => ({
  id, name, cat: "Instrument candidates", src: [PROPOSED], ports: [],
  draw: () => composeInstrument({ id, preset: id }).shapes,
}));

const pumpCatalogueSymbols = pumpDefinitions([
  { id: "pump-centrifugal", name: "Centrifugal pump", cat: "Pumps and blowers", src: [IS("0701"), BC("P-003")],
    draw: () => [C(0, 0, 9), S(line([0, -9], [14, -9]))], ports: [[-9, 0], [14, -9]] },
  { id: "pump-submersible", name: "Submersible pump", cat: "Pumps and blowers", src: [BC("P-003")],
    draw: () => [S(rect(-7, -4, 14, 14)), S(rect(-4, -10, 8, 6)), S(line([4, -7], [12, -7], [12, -16]))], ports: [[12, -16]] },
  { id: "pump-pc", name: "Progressing cavity pump", cat: "Pumps and blowers", src: [BC("P-003")],
    draw: () => [S(rect(-14, -5, 28, 10)), S(line([-10, 0], [-7, -3], [-1, 3], [5, -3], [10, 0]), { role: "secondary" })], ports: [[-14, 0], [14, 0]] },
  { id: "pump-dosing", name: "Dosing (metering) pump", cat: "Pumps and blowers", src: [IS("0703"), BC("P-003")],
    draw: () => [S(line([-12, 0], [-6, 0]) + " " + line([6, 0], [12, 0])), S(rect(-6, -5, 12, 10)), S(line([0, 5], [0, 9])), S(rect(-6, 9, 12, 12)), T(0, 18.6, "M")],
    ports: [[-12, 0], [12, 0]] },
  { id: "blower-lobe", name: "Blower, rotary lobe", cat: "Pumps and blowers", src: [IS("0701 (gear form)"), BC("P-003")],
    draw: () => [C(0, 0, 10), C(0, -4, 3.5), C(0, 4, 3.5), S(line([10, 0], [16, 0]) + " " + line([-16, 0], [-10, 0]))], ports: [[-16, 0], [16, 0]] },
  { id: "blower-centrifugal", name: "Blower, centrifugal (turbo)", cat: "Pumps and blowers", src: [BC("P-003")],
    draw: () => [C(0, 0, 9), C(0, 0, 3.5), S(line([0, -9], [14, -9]))], ports: [[-9, 0], [14, -9]] },
]);

export const SYMBOLS = [
  // Lines and connectors -----------------------------------------------------------------
  { id: "line-process", name: "Process line", cat: "Lines", src: [IS("0314"), BC("P-002")], w: 40,
    draw: () => [S(line([-20, 0], [20, 0]))], ports: [[-20, 0], [20, 0]], portNames: ENDS, connectivity: THROUGH },
  { id: "line-flow", name: "Flow direction", cat: "Lines", src: [IS("0305")], w: 40,
    draw: () => [S(line([-20, 0], [20, 0])), S(line([14, -4], [20, 0], [14, 4]))], ports: [[-20, 0], [20, 0]], portNames: ENDS, connectivity: THROUGH },
  { id: "line-electric", name: "Electric signal", cat: "Lines", src: [IS("0602"), ISA("")], w: 40,
    draw: () => [S(line([-20, 0], [20, 0]), { role: "signal" })], ports: [[-20, 0], [20, 0]], portNames: ENDS, connectivity: THROUGH },
  { id: "line-data", name: "Data link (SCADA)", cat: "Lines", src: [IS("0606"), ISA("")], w: 40,
    draw: () => [S(line([-20, 0], [-10, 0]) + " " + line([-6, 0], [6, 0]) + " " + line([10, 0], [20, 0]), { role: "secondary" }),
      C(-8, 0, 2, { role: "secondary" }), C(8, 0, 2, { role: "secondary" })], ports: [[-20, 0], [20, 0]], portNames: ENDS, connectivity: THROUGH },
  { id: "line-pneumatic", name: "Instrument air signal", cat: "Lines", src: [IS("0601")], w: 40,
    draw: () => [S(line([-20, 0], [20, 0]), { role: "secondary" }),
      S(line([-9, 4], [-5, -4]) + " " + line([-5, 4], [-1, -4]) + " " + line([5, 4], [9, -4]) + " " + line([9, 4], [13, -4]), { role: "secondary" })],
    ports: [[-20, 0], [20, 0]], portNames: ENDS, connectivity: THROUGH },
  { id: "junction", name: "Connected junction", cat: "Lines", src: [IS("0303")], w: 24,
    draw: () => [S(line([-12, 0], [12, 0]) + " " + line([0, 0], [0, 10])), C(0, 0, 2, { fill: "solid", role: "dot" })], ports: [[-12, 0], [12, 0], [0, 10]], portNames: ["left", "right", "bottom"], connectivity: [[0, 1, 2]] },
  { id: "junction-cross", name: "Four-way junction", cat: "Lines", src: [PROPOSED], w: 24,
    draw: () => [S("M-12 0 L12 0 M0 -12 L0 12"), C(0, 0, 2, { fill: "solid", role: "dot" })],
    ports: CROSS_PORTS, portNames: CROSS_NAMES, connectivity: [[0, 1, 2, 3]], verification: "Proposed" },
  { id: "crossover", name: "Lines crossing, not connected", cat: "Lines", src: [IS("0304"), PROPOSED], w: 24,
    draw: crossover, ports: CROSS_PORTS, portNames: CROSS_NAMES, connectivity: [[0, 1], [2, 3]], verification: "Proposed" },
  { id: "inflow", name: "Inflow from another sheet", cat: "Lines", src: [IS("0301"), BC("P-101")], w: 36,
    draw: () => [S(poly([-18, -5], [-6, -5], [-6, -9], [4, 0], [-6, 9], [-6, 5], [-18, 5])), S(line([4, 0], [18, 0]))], ports: [[18, 0]], portNames: ["out"], connectivity: [] },
  { id: "outflow", name: "Outflow to another sheet", cat: "Lines", src: [IS("0302"), BC("P-101")], w: 36,
    draw: () => [S(line([-18, 0], [-6, 0])), S(poly([-6, -5], [6, -5], [6, -9], [16, 0], [6, 9], [6, 5], [-6, 5]))], ports: [[-18, 0]], portNames: ["in"], connectivity: [] },
  { id: "dead-end", name: "Dead end, blind flange", cat: "Lines", src: [IS("0307"), BC("P-003")], w: 24,
    draw: () => [S(line([-12, 0], [6, 0])), S(line([6, -6], [6, 6]) + " " + line([9, -6], [9, 6]))], ports: [[-12, 0]], portNames: ["in"], connectivity: [] },
  { id: "water-level", name: "Water level", cat: "Lines", src: [BC("C-001"), BC("P-101")], w: 24,
    draw: () => [S(poly([-5, -8], [5, -8], [0, -1]), { role: "secondary" }), S(line([-10, 0], [10, 0]), { role: "secondary" }),
      S(line([-6, 3], [6, 3]) + " " + line([-3, 6], [3, 6]), { role: "secondary" })], ports: [], portNames: [], connectivity: [] },

  fitting("fitting-reducer-concentric", "Concentric reducer",
    "M-20 0 L-12 0 M-12 -6 L12 -3 L12 3 L-12 6 Z M12 0 L20 0", [[-20, 0], [20, 0]]),
  fitting("fitting-reducer-eccentric", "Eccentric reducer (flat top)",
    "M-20 0 L-12 0 M-12 -6 L12 -6 L12 0 L-12 6 Z M12 -3 L20 -3", [[-20, 0], [20, -3]], "top"),
  fitting("fitting-reducer-eccentric-flat-bottom", "Eccentric reducer (flat bottom)",
    "M-20 0 L-12 0 M-12 -6 L12 0 L12 6 L-12 6 Z M12 3 L20 3", [[-20, 0], [20, 3]], "bottom"),
  fitting("fitting-flanged-joint", "Flanged joint",
    "M-12 0 L12 0 M-2 -6 L-2 6 M2 -6 L2 6", [[-12, 0], [12, 0]]),
  fitting("fitting-flexible-coupling", "Flexible coupling",
    "M-16 0 L-8 0 M8 0 L16 0 M-8 -5 L8 -5 L8 5 L-8 5 Z M-4 -5 L-4 5 M4 -5 L4 5", [[-16, 0], [16, 0]]),
  fitting("line-break", "Pipe break",
    "M-20 0 L-4 0 M4 0 L20 0 M-7 5 L-3 -5 M3 5 L7 -5", [[-20, 0], [20, 0]]),

  ...VALVES,
  legacyActuator("valve-control", "Control valve, modulating", [IS("0414"), BC("P-002")], "diaphragm",
    { valveFunction: "modulating" }),
  legacyActuator("act-hand", "Manual operator", [BC("P-002")], "hand"),
  legacyActuator("act-motor", "Motor-operated valve (MOV)", [IS("§06 legend"), BC("P-002")], "motor"),
  legacyActuator("act-solenoid", "Solenoid-operated valve (SOV)", [IS("0408"), BC("P-002")], "solenoid"),
  legacyActuator("act-diaphragm", "Diaphragm actuator", [IS("0414"), BC("P-002")], "diaphragm"),
  ...OPERATORS,

  ...GATES,

  // Instruments ------------------------------------------------------------------------------
  { id: "inst-field", name: "Field instrument", cat: "Instruments", src: [IS("0607"), ISA("")], tag: true,
    draw: ({ tag = ["FIT", "101"] }) => [C(0, 0, 14), T(0, -1, tag[0]), T(0, 10, tag[1], { value: true })], ports: [[0, 14], [0, -14]] },
  { id: "inst-panel", name: "MCP", cat: "Instruments", src: [IS("0608"), ISA("")], tag: true,
    draw: ({ tag = ["LIC", "102"] }) => [C(0, 0, 16), S(line([-16, 0], [16, 0])), T(0, -4, tag[0]), T(0, 12, tag[1], { value: true })], ports: [[0, 16], [0, -16]] },
  { id: "inst-local", name: "LCP", cat: "Instruments", src: [IS("0609"), ISA("")], tag: true,
    draw: ({ tag = ["PI", "103"] }) => [C(0, 0, 14), S(line([-13.2, -4.5], [13.2, -4.5]) + " " + line([-13.2, 4.5], [13.2, 4.5])), T(0, 3.6, tag[0])],
    ports: [[0, 14], [0, -14]] },
  { id: "inst-scada", name: "SCADA function (shared display)", cat: "Instruments", src: [IS("0614"), ISA(""), BC("P-002")], tag: true,
    draw: ({ tag = ["FI", "101"] }) => [S(rect(-16, -16, 32, 32)), C(0, 0, 16), S(line([-16, 0], [16, 0])), T(0, -4, tag[0]), T(0, 12, tag[1], { value: true })],
    ports: [[0, 16], [0, -16]] },
  { id: "inst-plc", name: "PLC function", cat: "Instruments", src: [ISA("")], tag: true,
    draw: ({ tag = ["LSH", "104"] }) => [S(rect(-14, -14, 28, 28)), S(poly([0, -14], [14, 0], [0, 14], [-14, 0])), T(0, 3.6, tag[0])],
    ports: [[0, 14], [0, -14]] },
  { id: "inst-interlock", name: "Interlock", cat: "Instruments", src: [BC("P-002"), ISA("")],
    draw: () => [S(poly([0, -10], [10, 0], [0, 10], [-10, 0])), T(0, 3.6, "I")], ports: [[-10, 0], [10, 0]] },
  { id: "inst-transmitter-is", name: "Transmitter, locally mounted (IS form)", cat: "Instruments", src: [IS("0610")],
    draw: () => [C(0, 0, 10), S(line([-7.07, -7.07], [7.07, 7.07]) + " " + line([-7.07, 7.07], [7.07, -7.07]))], ports: [[0, 10]] },

  ...candidateInstruments,

  // Primary elements -------------------------------------------------------------------------
  { id: "fe-mag", name: "Magnetic flowmeter", cat: "Primary elements", src: [BC("P-002")],
    draw: () => [S(line([-14, 0], [-7, 0]) + " " + line([7, 0], [14, 0])), S(rect(-7, -7, 14, 14)), T(0, 3.6, "M")], ports: [[-14, 0], [14, 0], [0, -7]] },
  { id: "fe-ultrasonic", name: "Ultrasonic or radar level element", cat: "Primary elements", src: [BC("P-002")],
    draw: () => [S(rect(-4, -8, 8, 10)), S(arc(-5, 6, 7, 5, 6, 0, 0) + " " + arc(-7, 10, 10, 7, 10, 0, 0), { role: "secondary" })], ports: [[0, -8]] },
  { id: "fe-float", name: "Float level switch", cat: "Primary elements", src: [BC("P-002")],
    draw: () => [S(line([0, -10], [0, 4])), S(arc(-3, 4, 3, 3, 4, 1, 0) + " L0 -1 Z")], ports: [[0, -10]] },
  { id: "fe-hydrostatic", name: "Submersible level transmitter", cat: "Primary elements", src: [BC("P-002")],
    draw: () => [S(line([0, -12], [0, -6])), S(rect(-4, -6, 8, 14))], ports: [[0, -12]] },
  { id: "fe-flume", name: "Parshall flume", cat: "Primary elements", src: [BC("P-002")],
    draw: () => [S(line([-14, -8], [-4, -3], [4, -3], [14, -8]) + " " + line([-14, 8], [-4, 3], [4, 3], [14, 8]))], ports: [[-14, 0], [14, 0]] },
  { id: "fe-orifice", name: "Orifice plate", cat: "Primary elements", src: [BC("P-002")],
    draw: () => [S(line([-12, 0], [-2, 0]) + " " + line([2, 0], [12, 0])), S(line([-2, -7], [-2, 7]) + " " + line([2, -7], [2, 7]))], ports: [[-12, 0], [12, 0]] },
  ...primaryCatalogueSymbols,

  // Pumps and blowers ------------------------------------------------------------------------
  ...pumpCatalogueSymbols,

  // Screening, grit and solids handling ------------------------------------------------------
  { id: "screen-bar", name: "Bar screen, mechanical", cat: "Screening and grit", src: [IS("1505"), BC("P-003")],
    draw: () => [S(line([-7.2, 11.4], [5.2, -10.1]) + " " + line([-2.8, 13.9], [9.6, -7.6]) + " " +
      arc(5.2, -10.1, 2.54, 9.6, -7.6, 0, 1) + " " + arc(-2.8, 13.9, 2.54, -7.2, 11.4, 0, 1)), C(7.4, -8.85, 1.2, { role: "secondary" })], ports: [] },
  { id: "screen-fine", name: "Fine screen, drum", cat: "Screening and grit", src: [BC("P-003")],
    draw: () => [S(rect(-12, -7, 14, 14)), S(line([-9, 7], [-5, -7]) + " " + line([-5, 7], [-1, -7]), { role: "secondary" }), S(rect(2, -2, 10, 4))], ports: [[-12, 0], [12, 0]] },
  { id: "conveyor-screw", name: "Screw conveyor", cat: "Screening and grit", src: [IS("2101 (conveyor)"), BC("P-003")],
    draw: () => [S(poly([-16, 6], [14, -10], [16, -6.3], [-14, 9.7])),
      S(line([-10, 3.4], [-6, 8.4]) + " " + line([-4, 0.2], [0, 5.2]) + " " + line([2, -3], [6, 2]) + " " + line([8, -6.2], [12, -1.2]), { role: "secondary" })], ports: [[-15, 8], [15, -8]] },
  { id: "grit-classifier", name: "Grit classifier", cat: "Screening and grit", src: [BC("P-003")],
    draw: () => [S(poly([-16, 6], [14, -10], [16, -6.3], [-14, 9.7])), S(line([-16, 6], [-16, -2], [-8, -2], [-8, 1.7]))], ports: [[-12, -2], [15, -8]] },
  { id: "grit-separator", name: "Grit separator (cyclone)", cat: "Screening and grit", src: [BC("P-003")],
    draw: () => [S(line([-8, -12], [8, -12], [8, 0], [2, 12], [-2, 12], [-8, 0], [-8, -12])), S(line([-14, -8], [-8, -8]))], ports: [[-14, -8], [0, 12], [0, -12]] },
  { id: "container", name: "Screenings bin or skip", cat: "Screening and grit", src: [BC("P-101")],
    draw: () => [S(poly([-12, -6], [12, -6], [9, 6], [-9, 6]))], ports: [[0, -6]] },
  { id: "mixer", name: "Mixer, top-entry", cat: "Screening and grit", src: [IS("1907"), BC("P-003")],
    draw: () => [S(rect(-5, -18, 10, 10)), S(line([0, -8], [0, 10])), S(line([-8, 10], [8, 10])), C(-5, 10, 2.5), C(5, 10, 2.5)], ports: [] },
  { id: "mixer-static", name: "Static mixer, in-line", cat: "Screening and grit", src: [BC("P-003")],
    draw: () => [S(line([-16, 0], [-12, 0]) + " " + line([12, 0], [16, 0])), S(rect(-12, -5, 24, 10)),
      S(line([-12, -5], [-4, 5]) + " " + line([-12, 5], [-4, -5]) + " " + line([-4, -5], [4, 5]) + " " + line([-4, 5], [4, -5]) + " " + line([4, -5], [12, 5]) + " " + line([4, 5], [12, -5]), { role: "secondary" })],
    ports: [[-16, 0], [16, 0]] },

  // Treatment structures: to define with the firm -------------------------------------------
  { id: "tank-open", name: "Open tank or channel, section", cat: "Structures (proposed)", src: [BC("P-101"), PROPOSED],
    draw: () => [S(line([-16, -10], [-16, 10], [16, 10], [16, -10])), S(line([-16, -4], [16, -4]), { role: "secondary" }), S(poly([4, -11], [12, -11], [8, -5]), { role: "secondary" })],
    ports: [[-16, -6], [16, -6]] },
  { id: "diffuser-grid", name: "Fine-bubble diffuser grid", cat: "Structures (proposed)", src: [PROPOSED],
    draw: () => [S(line([-16, -12], [-16, 6], [16, 6])), C(-8, 3, 2), C(0, 3, 2), C(8, 3, 2)], ports: [[-16, -12]] },
  { id: "decanter", name: "Decanter, SBR", cat: "Structures (proposed)", src: [PROPOSED],
    draw: () => [S(rect(-10, -8, 12, 5)), S(line([-4, -3], [10, 10])), C(10, 10, 2)], ports: [[10, 10]] },
];

// Pipe service codes, as used on the B&C Pahala set (C-001), for line labels such as 150-RS.
export const SERVICE_CODES = {
  RS: "Raw sewage", SCR: "Screenings", GT: "Grit", PE: "Primary effluent", ML: "Mixed liquor",
  RAS: "Return activated sludge", WAS: "Waste activated sludge", A: "Aeration air", SE: "Secondary effluent",
  FSE: "Filtered secondary effluent", PL: "Plant effluent", HOCL: "Sodium hypochlorite", POL: "Polymer",
  SN: "Supernatant", CEN: "Centrate", D: "Drain", OF: "Overflow", SW: "Service water",
};

export const byId = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]));
for (const [alias, id] of Object.entries(GATE_ALIASES)) {
  Object.defineProperty(byId, alias, { value: byId[id] });
}

/** Compose a valve body, optional operator, pipe ends and state annotations. */
export function composeValve(config, at = {}, display = {}) {
  return assembleValve(byId, config, at, display);
}

/** Live state rendering shares the same placement, with an independent ink profile in render(). */
export function placeOperatingValve(config, at = {}, display = {}) {
  return composeValve(config, at, { ...display, view: "operating" });
}

const isPrimary = (id) => Object.hasOwn(PRIMARY_DEFINITIONS, id) || Object.hasOwn(ANALYTE_PRESETS, id);
const primaryLibrary = Object.assign({ composeValve }, byId);

/** Compose a typed primary element in the same coordinate space as the drawing. */
export function composePrimaryElement(config, at = {}, display = {}) {
  return composePrimaryElements([{ config, at }], display)[0];
}

/** Place bodies together before placing each analyte identity in authored drawing order. */
export function composePrimaryElements(instances, display = {}) {
  return layoutPrimaryElements(instances.map(({ config, at }) => primaryBody(primaryLibrary, config, at, display)), display);
}

export function migratePrimaryElement(config, at = {}, display = {}) {
  return primaryMigration(primaryLibrary, config, at, display);
}

export function composeMeasuringStructure(config, at = {}, display = {}) {
  if (config.type === "fe-flume" && (display.view ?? "schematic") === "schematic") {
    return composePrimaryElement({ ...config, symbolId: config.type }, at, display);
  }
  return measurementView(config, at, display);
}

export const LEGACY_INSTRUMENT_ANCHORS = Object.freeze({
  "inst-field": Object.freeze(["S", "N"]),
  "inst-panel": Object.freeze(["S", "N"]),
  "inst-local": Object.freeze(["S", "N"]),
  "inst-scada": Object.freeze(["S", "N"]),
  "inst-plc": Object.freeze(["S", "N"]),
  "inst-interlock": Object.freeze(["W", "E"]),
  "inst-transmitter-is": Object.freeze(["S"]),
});

function authoredInstrument(id, options) {
  const { mode, display, tag, ...config } = options;
  const authoredTag = Array.isArray(tag) ? { letters: tag[0], ...(tag[1] === undefined ? {} : { loop: tag[1] }) } : tag;
  const hasTag = Object.hasOwn(options, "tag");
  // A location bar records where a function is mounted, not what it does. An authored tag on a
  // panel preset (LIC, PI, ...) therefore stays unclassified until the project declares its kind.
  const kind = config.kind ?? (hasTag && INSTRUMENT_PRESETS[id].kind === "control-panel" ? "unclassified" : undefined);
  return { ...config, id: config.id ?? id, preset: id, kind, ...(hasTag && { tag: authoredTag }) };
}

/** Migrate a saved archive instance against the versioned candidate contract and report edge moves. */
export function migrateInstrument({ version = 0, symbolId, at = {}, id, options = {} } = {}, display = {}) {
  if (version !== 0 || !Object.hasOwn(LEGACY_INSTRUMENT_ANCHORS, symbolId) || typeof id !== "string" || !id.trim()) {
    throw new RangeError("Expected a version 0 instrument with an archived symbol and a stable ID");
  }
  const legacy = placeSymbol(symbolId, at, { ...(Array.isArray(options.tag) && { tag: options.tag }) });
  const missingIdentity = Boolean(byId[symbolId].tag && options.tag == null && options.panel == null);
  const needsClassification = INSTRUMENT_PRESETS[symbolId].kind === "control-panel" && options.kind === undefined &&
    options.panel == null;
  const config = authoredInstrument(symbolId, {
    ...options, id,
    ...(missingIdentity && (options.kind === "control-panel" ? { tag: undefined, panel: null } : { tag: null, panel: undefined })),
    ...(needsClassification && { kind: "unclassified" }),
  });
  const candidate = composeInstrument(config, at, display);
  const portMap = LEGACY_INSTRUMENT_ANCHORS[symbolId].map((anchor, index) => {
    const before = legacy.ports[index], after = candidate.anchors[anchor];
    return { index, anchor, before, after, reroute: before.some((v, i) => v !== after[i]) };
  });
  return { config: { ...config, version: candidate.metadata.version }, at, candidate,
    report: { fromVersion: 0, toVersion: candidate.metadata.version, missingIdentity: Boolean(missingIdentity), needsClassification: Boolean(needsClassification), portMap } };
}

/** Resolve and serialize Family 07 asset and symbol instances. */
export function composePumpDocument(document, options) {
  return composePumpDrawing(byId, document, options);
}

export function migratePumpVariant(instance, variant) {
  return migratePumpInstance(byId, instance, variant);
}

export function migrateScreeningVariant(instance, variant) {
  return screeningMigration(byId, instance, variant);
}

/** Place a library symbol and its ports in the same drawing coordinate system. */
export function placeSymbol(id, at = {}, options = {}) {
  if (Object.hasOwn(SCREENING_CANDIDATES, id)) {
    const archived = SCREENING_ARCHIVE_IDS.includes(id);
    if (options.variant === "candidate") return placeScreeningCandidate(id, at, options);
    if (!archived || (options.variant !== undefined && options.variant !== "legacy") ||
        (options.view !== undefined && options.view !== "schematic")) {
      throw new RangeError(`Screening symbol ${id} requires explicit variant: "candidate"`);
    }
  }
  if (isPrimary(id)) {
    const { mode, view, display, ...config } = options;
    if (view !== undefined && view !== "schematic") {
      if (id !== "fe-flume") throw new RangeError("Only the flume supports measuring structure views");
      return composeMeasuringStructure({ ...config, type: id }, at, { ...display, view });
    }
    const selected = primaryMode(id, mode);
    if (selected === "current") return composePrimaryElement({ ...config, symbolId: id, mode: selected }, at, display);
  }
  if (LOGIC_IDS.includes(id)) return placeLogicPrimitive(id, at, options);
  if (Object.hasOwn(INSTRUMENT_PRESETS, id)) {
    const archive = Object.hasOwn(LEGACY_INSTRUMENT_ANCHORS, id);
    const mode = options.mode ?? (archive ? "legacy" : "candidate");
    if (mode === "candidate") return composeInstrument(authoredInstrument(id, options), at, options.display);
    if (mode !== "legacy" || !archive) throw new RangeError(`Unavailable instrument mode ${mode} for ${id}`);
  }
  const symbol = byId[id];
  if (!Object.hasOwn(byId, id)) throw new RangeError(`Unknown symbol: ${id}`);
  if (symbol.pump) return placePumpSymbol(symbol, at, options);
  if (symbol.gate) {
    const { renderScale, closedStyle, closed, convention, stateBasis, measureText, labelAnchor, ...config } = options;
    const placed = composeEquipment({ ...config, type: id }, at, {
      renderScale, closedStyle, closed, convention, stateBasis, measureText, labelAnchor,
    });
    return { ...placed, metadata: { ...placed.metadata, id: config.id ?? id, ...(closed !== undefined && { closed }) } };
  }
  if (symbol.operator || symbol.modifier) return placeOperator(id, at, options);
  if (symbol.valve || symbol.assemblyPreset) {
    const { renderScale, measureText, closed, ...config } = options;
    return assembleValve(byId, { ...config, bodyId: id }, at,
      { renderScale, measureText, legacyClosed: closed, quietUnspecified: !Object.hasOwn(config, "normalPosition") });
  }
  const q = ((at.q ?? 0) % 4 + 4) % 4;
  let drawOptions = options;
  if (id === "crossover") {
    const projectedScale = (at.s ?? 1) * (options.renderScale ?? 1);
    if (!Number.isFinite(projectedScale) || projectedScale <= 0) throw new RangeError("Invalid crossover render scale");
    if (projectedScale < 1) {
      // Leave 1.5 CSS pixels beside a half-pixel bridge stroke on compact placements.
      drawOptions = { ...options, clearance: Math.max(options.clearance ?? 1.5, 2 / projectedScale) };
    }
  }
  return {
    shapes: place(symbol.draw(drawOptions), at),
    ports: symbol.ports.map((point) => placePoint(point, at).map(round)),
    portNames: symbol.portNames,
    connectivity: symbol.connectivity,
    metadata: {
      ...options, id, orientation: q * 90, verification: symbol.verification,
      ...(symbol.flatSide && {
        flatSide: symbol.flatSide,
        drawingFlatSide: ["top", "right", "bottom", "left"][(q + (symbol.flatSide === "top" ? 0 : 2)) % 4],
      }),
    },
  };
}
