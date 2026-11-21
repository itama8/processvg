import { mkdirSync, writeFileSync } from "node:fs";
import {
  ANALYTE_PRESETS, composeInstrument, composeMeasuringStructure, composePrimaryElement, composePrimaryElements,
  measurementBoundary, migratePrimaryElement, primaryInstrument, primaryNetwork, SYMBOLS,
} from "../src/library.mjs";
import { routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const out = new URL("../review/family-06/", import.meta.url);
mkdirSync(out, { recursive: true });

const text = (x, y, value, align) => ({ t: [x, y, value], align });
const pipe = (...points) => routeLine("line-process", points).shapes;
const route = (points, role = "secondary") => ({ d: "M" + points.map((p) => p.join(" ")).join(" L"), role });
const profiles = { light: { theme: "light" }, dark: { theme: "dark" }, print: { profile: "print" } };
const records = {};
const ids = SYMBOLS.filter(({ cat }) => cat === "Primary elements").map(({ id }) => id);
const cell = { width: 89, height: 68 };
const config = (symbolId, id, x, y, s, q = 0, options = {}) =>
  ({ config: { symbolId, id, ...options }, at: { x, y, s, q } });
const compose = (...args) => {
  const item = config(...args);
  return composePrimaryElement(item.config, item.at);
};
const endpoint = (block, portId) => ({ blockId: block.metadata.id, portId });
const link = (id, kind, from, fromPort, to, toPort, via) =>
  ({ id, kind, from: endpoint(from, fromPort), to: endpoint(to, toPort), via });

function save(name, title, description, data, theme) {
  const options = profiles[theme];
  const id = `${name}-${theme}`;
  const body = render(data.shapes, options);
  writeFileSync(new URL(`${id}.svg`, out), svgDoc(id, title, description, body, options));
  records[id] = { labels: data.shapes.filter((sh) => sh.analyteIdentity).map(({ analyteIdentity, identityInk, bounds }) =>
    ({ ...analyteIdentity, glyph: identityInk, bounds })), layouts: data.layouts ?? [], ...data.contract };
}

function rotations(s, q) {
  const shapes = [text(280, 20, `Schematic quarter turn ${q * 90}° · circles mark verification anchors`)];
  const contract = [];
  for (const [i, symbolId] of ids.entries()) {
    const col = i % 6, row = Math.floor(i / 6);
    const x = 57 + col * cell.width, y = 51 + row * cell.height;
    const item = config(symbolId, `rotation-${q}-${symbolId}`, x, y, s, q, { mode: "current" });
    const display = { sheetBounds: [x - 43, y - 30, x + 43, y + 30] };
    const result = composePrimaryElement(item.config, item.at, display);
    if (result.identityLayout?.status === "conflict") throw new Error(`Unexpected rotation conflict ${symbolId} q${q}`);
    const caption = symbolId.replace(/^fe-(?:(flow|level|analysis)-)?/, (_, group) =>
      group === "flow" ? "F · " : group === "level" ? "L · " : group === "analysis" ? "A · " : "");
    shapes.push(...result.shapes, ...result.ports.map((point) => ({ c: [...point, 1.5], role: "secondary" })),
      text(x, y + 37, caption, "middle"));
    contract.push({ id: symbolId, at: item.at, interfaces: result.interfaces, sensing: result.sensing,
      stations: result.stations, layout: result.identityLayout });
  }
  return { shapes, contract: { rotations: contract } };
}

function identityCases(s) {
  const layouts = [], shapes = [text(280, 24, "Analyte identifiers · one glyph per element")];
  for (const [index, symbolId] of Object.keys(ANALYTE_PRESETS).entries()) {
    const x = 67 + (index % 5) * 106, y = 83 + Math.floor(index / 5) * 49;
    const installation = ["immersion", "insertion", "cell", "cabinet"][index % 4];
    for (const [r, identityStyle] of ["outlined", "unboxed"].entries()) {
      const yy = y + 114 * r;
      const item = config(symbolId, `${symbolId}-${identityStyle}`, x, yy, s, index % 4, { installation, identityStyle });
      const result = composePrimaryElement(item.config, item.at, { sheetBounds: [x - 48, yy - 31, x + 48, yy + 31] });
      if (result.identityLayout.status !== "placed") throw new Error(`Unexpected identity matrix conflict ${symbolId}`);
      shapes.push(...result.shapes);
      layouts.push(result.identityLayout);
    }
  }
  shapes.push(text(280, 46, "Outlined · installation bodies alternate across the row"), text(280, 163, "Unboxed · same bodies and analytes"));

  const long = config("fe-analysis-mlss", "long", 164, 328, s, 1, { identityGlyph: "MLSS / LONG PROJECT ID" });
  const nearby = config("fe-analysis-do", "adjacent", 186, 304, s, 2, { identityStyle: "unboxed" });
  const conflictSpec = config("fe-analysis-nitrate", "crowded", 448, 323, s, 0);
  const a = [[82, 312], [158, 312], [158, 285]];
  const b = [[178, 349], [255, 349]];
  const results = composePrimaryElements([long, nearby], {
    avoidRoutes: [a, b], avoidAnchors: [[164, 348]], reservedBounds: [[95, 328, 116, 360]], sheetBounds: [16, 267, 325, 404],
  });
  const conflict = composePrimaryElement(conflictSpec.config, conflictSpec.at, { sheetBounds: [439, 313, 458, 333] });
  if (results.some(({ identityLayout }) => identityLayout.status !== "placed") || conflict.identityLayout.status !== "conflict") {
    throw new Error(JSON.stringify([...results, conflict].map(({ identityLayout }) => identityLayout)));
  }
  shapes.push(route(a), route(b), { d: "M95 328 L116 328 L116 360 L95 360 Z", role: "secondary", dash: "2 2" }, { c: [164, 348, 1.8], role: "secondary" },
    ...[...results, conflict].flatMap((result) => result.shapes),
    text(166, 396, "Transformed bodies, routes and reserved area"),
    text(448, 395, "Conflict · sheet boundary too tight"),
    { d: "M439 313 L458 313 L458 333 L439 333 Z", role: "secondary", dash: "2 2" });
  layouts.push(...[...results, conflict].map(({ identityLayout }) => identityLayout));
  return { shapes, layouts };
}

function processCases(s) {
  const shapes = [text(280, 25, "Aeration air, water and differential pressure")];
  const air = compose("fe-flow-thermal", "air-fe", 128, 143, s, 0,
    { assetId: "AIR-FIT", bindings: { instrument: { kind: "electrical", direction: "out" } } });
  const water = compose("fe-mag", "water-fe", 382, 143, s, 0,
    { assetId: "WATER-FIT", bindings: { instrument: { kind: "electrical", direction: "out" } } });
  const instrument = (id, letters, loop, ports = []) => ({ id, preset: "inst-field", tag: { letters, loop }, ports });
  const input = (id, kind, anchor = "S") => ({ id, kind, anchor, direction: "in" });
  // An integral transmitter sits on its element (Art of the P&ID slide 17; Pahala P-002 integral
  // instrument), so its internal connection is topology only. A remote one is joined by a signal.
  const airProbe = air.interfaces.find(({ id }) => id === "instrument").point;
  const airFit = primaryInstrument(air, { ...instrument("air-fit", "FIT", "105", [input("probe", "electrical")]), integral: true },
    { x: airProbe[0], y: airProbe[1] - 16 * s, s, q: 1 });
  const waterFit = primaryInstrument(water, { ...instrument("water-fit", "FIT", "106", [input("probe", "electrical")]), integral: false },
    { x: 382, y: 86, s, q: 3 });
  const orifice = compose("fe-orifice", "orifice", 278, 337, s);
  const high = compose("fe-pressure-tap", "high", 183, 337, s);
  const low = compose("fe-pressure-tap", "low", 373, 337, s);
  const delta = primaryInstrument(orifice, { integral: false,
    ...instrument("dp", "FDIT", "219", [input("H", "process-sensing", "W"), input("L", "process-sensing", "E")]) },
  { x: 278, y: 242, s });
  const sealTap = compose("fe-pressure-tap", "seal-tap", 92, 337, s);
  const seal = compose("fe-diaphragm-seal", "seal", 92, 306, s);
  const gauge = primaryInstrument(seal, { integral: true, ...instrument("gauge", "PI", "221", [input("fill", "filled-system")]) },
    { x: 92, y: 234, s });
  const boundary = (tap) => measurementBoundary({
    id: `${tap.metadata.id}-host`, assetId: "ORIFICE-PIPE", kind: "process-boundary", direction: "out", point: tap.ports[0],
  });
  const taps = [high, low, sealTap].map(boundary);
  const network = primaryNetwork([air, water, airFit, waterFit, orifice, sealTap, high, low, delta, seal, gauge, ...taps], [
    link("air-integral", "electrical", air, "instrument", airFit, "probe"),
    link("water-remote", "electrical", water, "instrument", waterFit, "probe"),
    ...taps.map((host, i) => link(`process-branch-${i}`, "process-boundary", host, "boundary", [high, low, sealTap][i], "process")),
    link("high-impulse", "process-sensing", high, "impulse", delta, "H", [[183, 242]]),
    link("low-impulse", "process-sensing", low, "impulse", delta, "L", [[373, 242]]),
    link("seal-impulse", "process-sensing", sealTap, "impulse", seal, "process"),
    link("sealed-fill", "filled-system", seal, "instrument", gauge, "fill"),
  ]);
  const lineStyles = { electrical: "signal", "process-sensing": "primary", "filled-system": "primary" };
  shapes.push(...pipe([38, 143], air.ports[0]), ...pipe(air.ports[1], [216, 143]),
    ...pipe([292, 143], water.ports[0]), ...pipe(water.ports[1], [470, 143]),
    ...pipe([44, 337], orifice.ports[0]), ...pipe(orifice.ports[1], [497, 337]),
    ...network.edges.filter(({ id, kind }) => id !== "air-integral" && Object.hasOwn(lineStyles, kind)).map(({ kind, points }) =>
      ({ ...route(points, lineStyles[kind]), ...(kind === "filled-system" && { dash: "3 2" }) })),
    ...[...network.blocks.values()].flatMap((block) => block.shapes ?? []),
    text(128, 171, "Thermal meter · integral FIT"), text(382, 171, "Mag meter · remote FIT"),
    text(278, 373, "Orifice with separate high and low taps"), text(85, 263, "Fill system", "end"),
    text(280, 408, "The diaphragm transmits pressure across a sealed boundary"));
  return { shapes, contract: { edges: network.edges, transfers: network.transfers, assets: [...network.assets] } };
}

function analysisCases(s) {
  const shapes = [text(280, 22, "Tank level, basin probes and sample analyser")];
  const probeTypes = ["fe-level-radar", "fe-float", "fe-hydrostatic"];
  const tank = probeTypes.map((id, i) => compose(id, id, 108 + 60 * i, i ? 105 : 65, s, 0, { mode: "current" }));
  const probes = ["fe-analysis-do", "fe-analysis-ph", "fe-analysis-mlss"].map((id, i) => config(id, id, 105 + i * 59, 246, s, 0,
    { identityStyle: i === 1 ? "unboxed" : "outlined" }));
  const valve = compose("fe-sample-point", "sample-draw", 352, 355, s, 0, { samplingValve: { normalPosition: "open" } });
  const sample = config("fe-analysis-chlorine", "cl-analyser", 449, 276, s, 0, { assetId: "AIT-407",
    installation: "cabinet", analyteDefinition: "Free residual chlorine", reportingBasis: "mg/L as Cl2",
    bindings: { instrument: { kind: "electrical", direction: "out" } } });
  const process = measurementBoundary({ id: "sample-host", kind: "process-boundary", direction: "out", point: valve.ports[0] });
  const drain = measurementBoundary({ id: "sample-waste", kind: "sample-flow", direction: "in", point: [520, 276] });
  const provisional = composePrimaryElement(sample.config, sample.at);
  const cabinetTop = provisional.interfaces.find(({ id }) => id === "instrument").point;
  const ait = primaryInstrument(provisional, { id: "AIT-block", preset: "inst-field", tag: { letters: "AIT", loop: "407" },
    integral: true, ports: [{ id: "signal", anchor: "S", kind: "electrical", direction: "in" }] },
  { x: cabinetTop[0], y: cabinetTop[1] - 16 * s, s });
  const network = primaryNetwork([valve, provisional, ait, process, drain], [
    link("branch", "process-boundary", process, "boundary", valve, "process"),
    link("sample-feed", "sample-flow", valve, "sample-out", provisional, "sample-in", [[352, 276]]),
    link("sample-drain", "sample-flow", provisional, "sample-out", drain, "boundary"),
    link("integral", "electrical", provisional, "instrument", ait, "signal"),
  ]);
  const water = [[62, 260], [261, 260]];
  const [feed, waste, wiring] = network.edges.slice(1);
  const results = composePrimaryElements([...probes, sample], {
    avoidRoutes: [water, feed.points, waste.points, wiring.points], avoidBounds: [[421, 174, 477, 229]],
    sheetBounds: [32, 228, 535, 321],
  });
  if (results.some(({ identityLayout }) => identityLayout.status === "conflict")) throw new Error("Example identity collided");
  shapes.push(...tank.flatMap(({ shapes }) => shapes), route([[62, 58], [62, 139], [264, 139], [264, 58]], "primary"),
    route([[62, 91], [264, 91]]), text(163, 163, "Radar, float and hydrostatic probe"),
    ...composeInstrument({ id: "panel", preset: "inst-panel", panel: { identifier: "MCP", number: "407" } }, { x: 449, y: 91, s }).shapes,
    route([[62, 218], [62, 299], [261, 299], [261, 218]], "primary"), route(water), text(163, 320, "Aeration basin"),
    ...pipe([304, 355], [523, 355]), ...valve.shapes,
    { ...route(feed.points, "primary"), dash: "5 2" }, { ...route(waste.points, "primary"), dash: "5 2" },
    ...ait.shapes, ...results.flatMap((result) => result.shapes),
    text(418, 377, "Main process"), text(452, 316, "Sample feed and drain"), text(280, 408, "Cl₂ identifies the analyte; AIT identifies the loop function"));
  return { shapes, layouts: results.map(({ identityLayout }) => identityLayout),
    contract: { edges: network.edges, transfers: network.transfers, assets: [...network.assets] } };
}

const weir = {
  type: "weir", physical: { unit: "m", width: 1.5, thickness: 0.12, crest: 0.45, notchDepth: 0.25,
    upstreamLength: 2.4, downstreamLength: 0.8, angle: 90 },
  measurement: { station: -1, datum: { id: "Demo datum", unit: "m", invertRL: 100, headZeroRL: 100.45 },
    source: "Illustrative design input, not a field or rating record" },
};

function structures(s, sections) {
  const shapes = [], views = [];
  const scale = s * 22;
  if (sections) {
    shapes.push(text(280, 26, "Measuring structures · schematic and longitudinal section"));
    for (const [i, cfg] of [{ type: "fe-flume" }, weir].entries()) {
      const x = i ? 399 : 138;
      const schematic = composeMeasuringStructure(cfg, { x, y: 94, s });
      const section = composeMeasuringStructure(cfg, { x: i ? 438 : x, y: 259, s }, i
        ? { view: "section", stateBasis: "design", scale: 36, waterLevel: 100.56 } : { view: "section" });
      shapes.push(...schematic.shapes, ...section.shapes, text(x, 133, i ? "V-notch weir schematic" : "Flume archive schematic"));
      views.push(section);
    }
    shapes.push(text(280, 376, "Longitudinal sections keep gravity upright"), text(280, 399, "Weir station, datum and water level are authored inputs"));
  } else {
    shapes.push(text(280, 23, "Plan · flume at left and Family 04 V-notch weir at right"));
    for (let q = 0; q < 4; q++) {
      const x = 123 + (q % 2) * 249, y = 83 + Math.floor(q / 2) * 195;
      const flume = composeMeasuringStructure({ type: "fe-flume" }, { x, y, q, s: 0.77 * s }, { view: "plan" });
      const weirPlan = composeMeasuringStructure(weir, { x: x + (q % 2 ? 88 : 77), y: y + (q === 0 ? 86 : 70), q, s: 0.8 }, { view: "plan", stateBasis: "design", scale });
      views.push(flume, weirPlan);
      shapes.push(...flume.shapes, ...weirPlan.shapes, text(x - 70, y - 20, `${90 * q}°`));
    }
  }
  return { shapes, contract: { views: views.map(({ metadata, headReference, physical }) => ({ metadata, headReference, physical })) } };
}

const descriptions = {
  identity: "Both measured styles, four installation bodies, route clearance, long text and a retained identifier with an explicit sheet-boundary conflict.",
  process: "Thermal and magnetic meters, integral and remote transmitters, differential-pressure taps and an isolated diaphragm fill system.",
  analysis: "Radar, float and hydrostatic probes, basin DO, pH and MLSS, and an isolated chlorine sample takeoff with an integral AIT.",
  plans: "All four plan rotations. Flume geometry is conceptual and the weir station and datum are explicit design inputs.",
  sections: "The archived schematics and upright longitudinal sections. Weir geometry comes from Family 04.",
};

for (const [size, s] of [["nominal", 1.3], ["reduced", 0.88]]) {
  const samples = { identity: identityCases(s), process: processCases(s), analysis: analysisCases(s),
    sections: structures(s, true), plans: structures(s, false) };
  for (const [kind, data] of Object.entries(samples)) {
    for (const theme of Object.keys(profiles).filter((theme) => kind === "identity" || theme !== "dark")) {
      save(`${kind}-${size}`, `Family 06 · ${kind} · ${size} · ${theme}`, descriptions[kind], data, theme);
    }
  }
  for (let q = 0; q < 4; q++) {
    const data = rotations(s, q);
    for (const theme of ["light", "print"]) save(`rotation-${90 * q}-${size}`,
      `Family 06 · ${90 * q}° schematic · ${size} · ${theme}`,
      "Every Family 06 catalogue ID at the indicated quarter turn. Open circles show transformed verification anchors.", data, theme);
  }
}

const migrations = ["fe-float", "fe-hydrostatic"].map((symbolId) => ({
  symbolId, portMap: migratePrimaryElement({ symbolId }, { x: 100, y: 100, q: 1 }).portMap,
}));
writeFileSync(new URL("contract.json", out), JSON.stringify({ sheets: records, migrations }, null, 2) + "\n");
console.log(`Family 06: ${Object.keys(records).length} review SVGs and contract.json`);
