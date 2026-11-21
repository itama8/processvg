import { mkdirSync, writeFileSync } from "node:fs";
import {
  composeInstrument, composeLogicDiagram, instrumentNetwork, migrateInstrument, placeLogicPrimitive, placeSymbol,
  resolveInterlockReference, LEGACY_INSTRUMENT_ANCHORS,
} from "../src/library.mjs";
import { ENCLOSURES } from "../src/instruments.mjs";
import { routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const out = new URL("../review/family-05/", import.meta.url);
mkdirSync(out, { recursive: true });

const text = (x, y, value, align) => ({ t: [x, y, value], align });
const path = (points) => ({ d: "M" + points.map((p) => p.join(" ")).join(" L") });
const fixtureData = {};
const files = [];

function sheet(id, title, desc, shapes, options) {
  writeFileSync(new URL(`${id}.svg`, out), svgDoc(id, title, desc, render(shapes, options), options));
  files.push(id);
}

const locations = [
  ["Field", "field"], ["Main accessible", "main"], ["Main inaccessible", "main", "inaccessible"],
  ["Local accessible", "local"], ["Local inaccessible", "local", "inaccessible"],
];
const sizes = [["nominal", 1.35], ["reduced", 0.85]];
const profiles = {
  light: { theme: "light", strokeWidth: 0.65 }, dark: { theme: "dark", strokeWidth: 0.65 },
  print: { profile: "print", strokeWidth: 0.65 }, transparent: { strokeWidth: 0.65 },
};

const baseTag = { letters: "FIT", loop: "101" };
function matrix(size, s) {
  const labels = ["Discrete", "Shared primary", "Shared alternate", "Computer"];
  const shapes = locations.flatMap(([header], i) => {
    const [name, mark] = header.split(" ");
    const x = 166 + i * 85;
    return mark ? [text(x, 27, name), text(x, 40, mark)] : [text(x, 33, name)];
  });
  const results = [];
  for (const [row, enclosure] of ENCLOSURES.entries()) {
    const y = 81 + row * 93;
    shapes.push(text(92, y + 3.5, labels[row], "end"));
    for (const [i, [, location, accessibility]] of locations.entries()) {
      const panel = row === 0 && i > 0;
      const config = {
        id: `matrix-${enclosure}-${i}`, enclosure, location, accessibility,
        ...(panel ? { kind: "control-panel", panel: location === "main" ? { identifier: "MCP", number: "102" } :
          { identifier: "LCP", number: "103" } } : { kind: "physical-instrument", tag: baseTag }),
      };
      const result = composeInstrument(config, { x: 166 + i * 85, y, s });
      results.push(result);
      shapes.push(...result.shapes);
    }
  }
  fixtureData[`matrix-${size}`] = results;
  shapes.push(text(280, 419, "processvg review candidate · solid and dashed location marks"));
  return shapes;
}

function cases(s, size) {
  const instrument = (id, preset, x, y, config = {}, display = {}) => composeInstrument({ id, preset, ...config }, { x, y, s }, display);
  const tap = { id: "tap", kind: "process-sensing", direction: "in", anchor: "S" };
  const reading = { id: "reading", kind: "digital-data", direction: "out", anchor: "E" };
  const transmit = { letters: "LIT" };
  const up = instrument("screen-101-upstream", "inst-field", 92, 68, { tag: { ...transmit, loop: "101" }, measuredQuantity: "level",
    engineeringUnit: "m", datum: "screen-101-channel", ports: [reading, tap] });
  const down = instrument("screen-101-downstream", "inst-field", 92, 144, { tag: { ...transmit, loop: "102" }, measuredQuantity: "level",
    engineeringUnit: "m", datum: "screen-101-channel", ports: [reading, tap] });
  const calc = instrument("screen-101-delta", "inst-computer", 236, 108, {
    tag: { letters: "CALC", loop: "201" }, engineeringUnit: "m", executionHost: "PLC-01",
    operation: { type: "subtract", inputs: [up.metadata.id, down.metadata.id], commonDatum: "screen-101-channel" },
    ports: [{ id: "upstream", anchor: "W", kind: "digital-data", direction: "in" },
      { id: "downstream", anchor: "S", kind: "digital-data", direction: "in" }], annotation: { service: "Level difference" },
  }, { avoidRoutes: [[[92, 144], [236, 144], [236, 108]]] });
  const panel = instrument("panel-room-7", "inst-panel", 380, 70, { panel: { identifier: "MCP", number: "007" } });
  const lic = instrument("influent-lic", "inst-panel", 494, 70,
    { kind: "control-function", tag: { letters: "LIC", loop: "004" }, hostedBy: panel.metadata.id });
  const pi = instrument("gauge-pi", "inst-local", 494, 154, { kind: "physical-instrument", tag: { letters: "PI" } });
  const network = instrumentNetwork([up, down, calc, panel, lic, pi], [up, down].map((source, i) => ({
    id: `reading-${i}`, kind: "digital-data", from: { assetId: source.metadata.id, portId: "reading" },
    to: { assetId: calc.metadata.id, portId: i === 0 ? "upstream" : "downstream" },
  })));
  const long = instrument("long-tag", "inst-shared-field", 195, 247, { tag: { letters: "LSHH", loop: "AREA-02/PUMP-TRAIN/0007É" } });
  const pressure = instrument("pressure-example", "inst-field", 308, 247, { tag: { letters: "PDIT", loop: "0007B" } });
  const suffix = instrument("suffix-tag", "inst-field", 403, 247, { tag: { letters: "LSHH", loop: "1201A" } });
  const plc = instrument("control-plc", "inst-plc", 492, 247);
  const references = { id: "interlock-101", logicId: "screen-101-request", label: "I-101" };
  const reference = instrument("screen-101-callout", "inst-interlock", 108, 365, { reference: references },
    { avoidRoutes: [[[85, 365], [131, 365]], [[131, 365], [131, 401]]] });
  const crossed = instrument("crossed-is", "inst-transmitter-is", 257, 365, { tag: { letters: "LT", loop: "045" } });
  const external = instrument("external", "inst-shared-field", 425, 365, {
    tag: { letters: "LSHH", loop: "AREA-02/007" }, tagPlacement: "external",
  }, { allowExternalTag: true });
  const [high, low] = network.edges.map(({ points }) => points);
  const shapes = [
    ...[
      [high[0], [165, high[0][1]], [165, high[1][1]], high[1]],
      [low[0], [161, low[0][1]], [161, 164], [low[1][0], 164], low[1]],
    ].flatMap((route) => routeLine("line-data", route).shapes),
    ...[up, down, calc, panel, lic, pi, long, pressure, suffix, plc, reference, crossed, external].flatMap((result) => result.shapes),
    path([[85, 365], reference.anchors.W]), path([reference.anchors.E, [131, 365], [131, 401]]),
    text(164, 26, "Measured levels to computed difference"),
    text(437, 26, "Panel and hosted function"),
    text(380, 112, "Panel hardware"), text(494, 112, "Hosted LIC"),
    text(494, 189, "Authored PI, no loop"),
    text(195, long.anchors.S[1] + 16, "Grown enclosure"),
    text(308, 288, "Leading zeros"), text(403, 288, "Loop suffix"), text(492, 288, "Alternate preset"),
    text(108, 418, "Interlock reference"), text(257, 418, "Crossed IS transmitter"), text(425, 418, "External project tag"),
  ];
  fixtureData[`identities-${size}`] = {
    devices: [...network.assets.values()].map(({ metadata }) => metadata),
    edges: network.edges, measuredDevices: network.measuringDeviceIds, reference: reference.metadata.reference,
  };
  return { shapes, reference };
}

function logic(s, size, reference) {
  const at = (x, y) => ({ x, y, s });
  const gate = (id, type, x, y) => ({ id, type: `logic-${type}`, at: at(x, y) });
  const node = (id, type, x, y, label) => ({ id, type, at: [x, y], label });
  const nodes = [
    node("diff", "input", 126, 87, "Differential high"), node("manual", "input", 126, 121, "Manual request"),
    node("available", "input", 126, 153, "Available"), node("fault", "input", 126, 195, "Fault"),
    gate("request", "or", 194, 104), gate("ready", "and", 279, 137), gate("healthy", "not", 279, 195),
    gate("requestAvailable", "and", 386, 166), node("screen-request", "output", 448, 166, "Screen request"),
  ];
  const y = (n) => 5 * s * n;
  const edge = (source, target, pin, via = [], from = "Y") => ({
    id: `${source}-${target}-${pin}`, from: { node: source, pin: from }, to: { node: target, pin }, via,
  });
  const diagram = composeLogicDiagram({
    id: "screen-101-request", referenceId: "interlock-101", nodes, dependencies: [
      edge("diff", "request", "A", [[151, 87], [151, 104 - y(1)]]),
      edge("manual", "request", "B", [[151, 121], [151, 104 + y(1)]]),
      edge("request", "ready", "A", [[236, 104], [236, 137 - y(1)]]),
      edge("available", "ready", "B", [[236, 153], [236, 137 + y(1)]]),
      edge("fault", "healthy", "A"),
      edge("ready", "requestAvailable", "A", [[332, 137], [332, 166 - y(1)]]),
      edge("healthy", "requestAvailable", "B", [[332, 195], [332, 166 + y(1)]]),
      edge("requestAvailable", "screen-request", "A"),
    ],
  });
  resolveInterlockReference(reference, [diagram]);
  const unknown = composeLogicDiagram({
    id: "unknown-fixture", referenceId: "fixture-only", nodes: [gate("missing", "or", 405, 305)],
  });
  const timer = placeLogicPrimitive("logic-timer-on", at(158, 305), { mode: "logic", pt: { value: 5, unit: "s" }, exposedET: true });
  fixtureData[`logic-${size}`] = { metadata: diagram.metadata, dependencies: diagram.edges, timer: timer.metadata, unknownInputs: unknown.unknownInputs };
  return [
    text(280, 30, "I-101 · Screen request logic"), ...diagram.shapes, ...timer.shapes, ...unknown.shapes,
    text(158, 355, "On-delay timer · diagram only"), text(405, 355, "Unconnected inputs shown unknown"),
    text(280, 413, "Illustrative logic · candidate glyphs · no safety rating"),
  ];
}

const archive = [];
Object.keys(LEGACY_INSTRUMENT_ANCHORS).forEach((id, i) => {
  const x = 80 + (i % 4) * 130, y = 95 + Math.floor(i / 4) * 125;
  const archived = placeSymbol(id, { x, y, s: 1.35 }, { mode: "legacy" });
  archive.push(...archived.shapes, text(x, y + 43, id));
});
sheet("00-archive", "Family 05 · archive glyphs", "Existing presets at their archived defaults. Historical panel examples retain LIC and PI.", archive, {});
fixtureData.migration = migrateInstrument({
  id: "archive-lic", symbolId: "inst-panel", at: { x: 50, y: 50, q: 1 }, options: { tag: ["LIC", "004"] },
}).report;

for (const [size, s] of sizes) {
  const matrixShapes = matrix(size, s);
  const examples = cases(s, size);
  const logicShapes = logic(s, size, examples.reference);
  for (const [theme, options] of Object.entries(profiles)) {
    sheet(`01-matrix-${size}-${theme}`, `Enclosure and location candidates · ${size} · ${theme}`,
      "Twenty combinations of the four enclosures and five location or accessibility marks.", matrixShapes, options);
    if (!["light", "print"].includes(theme)) continue;
    sheet(`02-instruments-${size}-${theme}`, `Instrument identities · ${size} · ${theme}`,
      "Separate panel hardware, hosted functions, two level transmitters, computed differential, and linked interlock I-101.", examples.shapes, options);
    sheet(`03-logic-${size}-${theme}`, `Referenced logic view · ${size} · ${theme}`,
      "The screen request uses explicit Boolean dependencies. The timer and missing-input example sit outside the request logic.", logicShapes, options);
  }
}
writeFileSync(new URL("contract.json", out), JSON.stringify({ files, ...fixtureData }, null, 2) + "\n");
console.log(`Family 05: ${files.length} review SVGs and contract.json`);
