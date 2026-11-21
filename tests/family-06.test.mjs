import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ANALYTE_PRESETS, composeEquipment, composeMeasuringStructure, composePrimaryElement, composePrimaryElements,
  composeValve, measurementBoundary, migratePrimaryElement, place, placePoint, placeSymbol, primaryInstrument,
  primaryNetwork, SYMBOLS,
} from "../src/library.mjs";
import { render } from "../src/render.mjs";

const element = (symbolId, at, overrides, display) => composePrimaryElement({ symbolId, ...overrides }, at, display);
const spec = (symbolId, id, x, y, q = 0) => ({ config: { symbolId, id }, at: { x, y, q } });

const archive = {
  "fe-mag": { paths: ["M-14 0 L-7 0 M7 0 L14 0", "M-7 -7 L7 -7 L7 7 L-7 7 Z"], ports: [[-14, 0], [14, 0], [0, -7]] },
  "fe-orifice": { paths: ["M-12 0 L-2 0 M2 0 L12 0", "M-2 -7 L-2 7 M2 -7 L2 7"], ports: [[-12, 0], [12, 0]] },
  "fe-flume": { paths: ["M-14 -8 L-4 -3 L4 -3 L14 -8 M-14 8 L-4 3 L4 3 L14 8"], ports: [[-14, 0], [14, 0]] },
  "fe-ultrasonic": { paths: ["M-4 -8 L4 -8 L4 2 L-4 2 Z", "M-5 6 A7 7 0 0 0 5 6 M-7 10 A10 10 0 0 0 7 10"], ports: [[0, -8]] },
  "fe-float": { paths: ["M0 -10 L0 4", "M-3 4 A3 3 0 1 0 3 4 L0 -1 Z"], ports: [[0, -10]] },
  "fe-hydrostatic": { paths: ["M0 -12 L0 -6", "M-4 -6 L4 -6 L4 8 L-4 8 Z"], ports: [[0, -12]] },
};

test("six archived IDs retain exact geometry and positional anchors; float and probe migration reports moved cables", () => {
  for (const [id, expected] of Object.entries(archive)) {
    const legacy = placeSymbol(id);
    assert.deepEqual(legacy.shapes.filter(({ d }) => d).map(({ d }) => d), expected.paths);
    assert.deepEqual(legacy.ports, expected.ports);
    for (let q = 0; q < 4; q++) {
      const at = { q, x: 100, y: 90, s: 1.25 };
      const explicit = placeSymbol(id, at, { mode: "legacy" });
      assert.deepEqual(explicit.shapes, place(legacy.shapes, at));
      assert.deepEqual(explicit.ports, legacy.ports.map((p) => placePoint(p, at)));
      const { current, portMap } = migratePrimaryElement({ symbolId: id }, at);
      if (["fe-float", "fe-hydrostatic"].includes(id)) {
        assert.deepEqual(portMap, [{ id: "instrument", before: explicit.ports[0], after: placePoint([0, -13], at), reroute: true }]);
      } else {
        assert.deepEqual(current.shapes, explicit.shapes);
        assert.deepEqual(current.ports, explicit.ports);
        assert(portMap.every(({ reroute }) => !reroute));
      }
    }
  }
});

test("catalogue accounts for each design ID and supports every schematic transform", () => {
  const ids = SYMBOLS.filter(({ cat }) => cat === "Primary elements").map(({ id }) => id);
  assert.equal(ids.length, 34);
  assert.equal(new Set(ids).size, 34);
  assert.equal(Object.keys(ANALYTE_PRESETS).length, 10);
  const catalogue = JSON.parse(readFileSync(new URL("../drawings/symbols/catalogue.json", import.meta.url)));
  assert.deepEqual(catalogue.symbols.filter(({ category }) => category === "Primary elements").map(({ id }) => id), ids);

  for (const id of ids) {
    const local = element(id, {}, { mode: "current" });
    for (let q = 0; q < 4; q++) {
      const at = { x: 97.5, y: 103.5, s: 1, q };
      const world = element(id, at, { mode: "current" });
      assert.equal(world.metadata.orientation, q * 90);
      assert.deepEqual(world.ports, local.ports.map((p) => placePoint(p, at).map((v) => Math.round(v * 100) / 100)));
      if (local.sensing) {
        assert.deepEqual(world.sensing.origin, placePoint(local.sensing.origin, at));
        assert.deepEqual(world.sensing.direction, local.sensing.direction && placePoint(local.sensing.direction, { q }));
      }
      if (local.identityLayout) assert.equal(world.identityLayout.status, "placed");
    }
  }
  const rotameter = element("fe-flow-variable-area");
  assert.deepEqual(rotameter.ports, [[0, 18], [0, -18]]);
  assert.equal(rotameter.metadata.defaultFlow, "bottom-to-top");
  assert.equal(rotameter.metadata.orientationPolicy, "vertical-default");
  assert.match(element("fe-level-radar", { x: 10, y: 20, q: 1 }).shapes[1].d, /^M4 15 Q1 20 4 25 M0 11 Q-6 20 0 29$/);
  assert.throws(() => element("fe-analysis-do", { q: 0.5 }), /placement/);
});

test("analyte identity is measured, full-ink, upright and independent of the installation, principle and loop", () => {
  for (const [symbolId, { identityGlyph }] of Object.entries(ANALYTE_PRESETS)) {
    for (const installation of ["immersion", "insertion", "cell", "cabinet"]) {
      const at = { x: 100, y: 100, q: 3, s: 0.5 };
      const settings = { id: symbolId, installation, principle: "defined by project", identityStyle: "unboxed" };
      const primary = element(symbolId, at, settings);
      const body = element(`fe-analysis-${installation}`, at);
      assert.deepEqual(primary.shapes.slice(0, body.shapes.length), body.shapes);
      assert.deepEqual(primary.interfaces, body.interfaces);
      assert.equal(primary.metadata.principle, settings.principle);
      assert.equal(primary.identityLayout.style, "unboxed");
      assert.equal(primary.identityLayout.inkSize, 6.5);
      const svg = render(primary.shapes, { profile: "print" });
      assert.match(svg, /fill="currentColor" stroke="none" opacity="1"/);
      assert(svg.includes(`aria-label="${identityGlyph}"`));
      assert(!svg.includes("rotate("));
    }
  }
  assert.equal(element("fe-analysis-ammonium").metadata.specificationComplete, false);
  const chlorine = element("fe-analysis-chlorine", {}, { analyteDefinition: "Free residual chlorine", reportingBasis: "mg/L as Cl2" });
  assert.equal(chlorine.metadata.specificationComplete, true);
  assert.equal(chlorine.metadata.identityGlyph, "Cl₂");
  assert.equal(element("fe-analysis-ph").metadata.principle, undefined);
});

test("measured placement exercises all sides, rotated bodies, route and anchor clearance, offset and explicit conflicts", () => {
  const center = { x: 100, y: 100 };
  const clear = element("fe-analysis-ph", center);
  assert.equal(clear.identityLayout.side, "right");
  assert.equal(clear.identityLayout.style, "outlined");
  assert.equal(element("fe-analysis-ph", center, {}, { avoidRoutes: [[[110, 40], [110, 160]]] }).identityLayout.side, "left");
  assert.equal(element("fe-analysis-ph", { ...center, q: 1 }).identityLayout.side, "above");
  assert.equal(element("fe-analysis-ph", { ...center, q: 1 }, {},
    { avoidRoutes: [[[60, 90], [140, 90]]] }).identityLayout.side, "below");
  const reserved = { avoidAnchors: [[111, 102]], reservedBounds: [[80, 88, 95, 115]] };
  const fallback = element("fe-analysis-mlss", center, { identityGlyph: "MLSS / LONG PROJECT IDENTIFIER" }, reserved);
  assert(fallback.identityLayout.leader);
  assert.deepEqual(element("fe-analysis-mlss", center, { identityGlyph: "MLSS / LONG PROJECT IDENTIFIER" }, reserved), fallback);
  assert(fallback.identityLayout.box[2] - fallback.identityLayout.box[0] > 100);
  const large = element("fe-analysis-ph", center, {}, { fontSize: 14 });
  assert(large.identityLayout.inkBounds[2] - large.identityLayout.inkBounds[0] >
    clear.identityLayout.inkBounds[2] - clear.identityLayout.inkBounds[0]);
  const external = element("fe-analysis-do", center, { identityStyle: "unboxed" }, {
    avoidBounds: [[67, 40, 95, 160], [107, 98, 110, 100.5]],
    sheetBounds: [96, 98, 210, 116],
  });
  assert.equal(external.identityLayout.status, "placed");
  assert(external.identityLayout.offset > 0);
  const conflict = element("fe-analysis-nitrate", center, { id: "c" }, { sheetBounds: [90, 90, 109, 109] });
  assert.equal(conflict.identityLayout.status, "conflict");
  assert(conflict.identityLayout.conflicts.includes("sheet-boundary"));
  assert.match(render(conflict.shapes), /data-layout-conflict="[^"]*sheet-boundary[^"]*"[^>]*aria-label="NO₃"/);
  const [first, second] = composePrimaryElements([
    spec("fe-analysis-do", "one", 100, 100), spec("fe-analysis-ph", "two", 118, 100, 1),
  ]);
  assert.notEqual(first.identityLayout.side, "right");
  assert.equal(second.identityLayout.assetId, "two");
});

const edge = (id, kind, a, portId, b, outPort) => ({
  id, kind, from: { blockId: a, portId }, to: { blockId: b, portId: outPort },
});
const field = (id, kind) => ({
  id, preset: "inst-field", tag: { letters: "PIT", loop: "207" },
  ports: [{ id: "sense", kind, direction: "in", anchor: "S" }],
});

test("taps branch into impulse sensing, seals transmit pressure without fluid continuity, and integral and remote IDs are explicit", () => {
  const boundary = measurementBoundary({ id: "p1", kind: "process-boundary", direction: "out", point: [0, 0] });
  const tap = element("fe-pressure-tap", {}, { id: "tap" });
  const seal = element("fe-diaphragm-seal", { y: -12 }, { id: "seal", assetId: "PIT-207" });
  const indicator = primaryInstrument(seal, { ...field("pit", "filled-system"), integral: true }, { y: -48, q: 3 });
  const remote = primaryInstrument(seal, { ...field("remote", "filled-system"), integral: false, assetId: "PIT-208" }, { x: 110 });
  const nodes = [boundary, tap, seal, indicator, remote];
  const edges = [
    edge("branch", "process-boundary", "p1", "boundary", "tap", "process"),
    edge("impulse", "process-sensing", "tap", "impulse", "seal", "process"),
    edge("filled", "filled-system", "seal", "instrument", "pit", "sense"),
  ];
  const result = primaryNetwork(nodes, edges);
  assert.deepEqual(result.assets.get("PIT-207"), ["seal", "pit"]);
  assert.deepEqual(result.assets.get("PIT-208"), ["remote"]);
  assert.deepEqual(result.edges[2].points, [[0, -32], [0, -32]]);
  assert.deepEqual(result.transfers.find(({ blockId }) => blockId === "seal"),
    { blockId: "seal", from: "process", to: "instrument", transfer: "pressure-only", mediumContinuity: false });
  for (const kind of ["process-flow", "sample-flow", "electrical", "filled-system"]) {
    assert.throws(() => primaryNetwork(nodes, [{ ...edges[1], kind }]), /Incompatible measurement edge/);
  }
  assert.throws(() => primaryNetwork(nodes, [...edges, edge("dup", "filled-system", "seal", "instrument", "remote", "sense")]), /fan-out/);
  assert.throws(() => primaryInstrument(seal, { ...field("wrong", "filled-system"), integral: true, assetId: "wrong" }), /share/);
  assert.throws(() => primaryNetwork([indicator]), /association/);
  assert.throws(() => primaryNetwork([seal, { ...indicator, metadata: { ...indicator.metadata, primaryId: undefined } }]),
    /association/);
});

test("sample extraction composes a Family 02 valve, with typed outlets and no inline process connection", () => {
  const source = measurementBoundary({ id: "main", kind: "process-boundary", direction: "out", point: [0, 0] });
  const point = element("fe-sample-point", {}, { id: "sample", samplingValve: { normalPosition: "closed" } });
  const valve = composeValve({ bodyId: "valve-gate", normalPosition: "closed" }, { y: -9, q: 1, s: 0.5 });
  assert.deepEqual(point.shapes.slice(2), valve.shapes);
  const cell = element("fe-analysis-ph", { x: 42, y: -19 }, { id: "cell", installation: "cell" });
  const drain = measurementBoundary({ id: "waste", kind: "sample-flow", direction: "in", point: [75, -19] });
  const edges = [
    edge("takeoff", "process-boundary", "main", "boundary", "sample", "process"),
    edge("sample", "sample-flow", "sample", "sample-out", "cell", "in"),
    edge("waste", "sample-flow", "cell", "out", "waste", "boundary"),
  ];
  const nodes = [source, point, cell, drain];
  assert.equal(primaryNetwork(nodes, edges).transfers[0].joinsNetworks, false);
  assert.equal(primaryNetwork(nodes, edges).transfers[0].valvePosition, "closed");
  assert.throws(() => primaryNetwork(nodes, [edge("illegal", "process-boundary", "main", "boundary", "cell", "in")]), /Incompatible/);
  assert.throws(() => primaryNetwork(nodes, [{ ...edges[1], kind: "process-flow" }]), /Incompatible/);
});

test("mechanical mounts, sensing vectors, unbound interfaces and Venturi stations cannot substitute for fluid ports", () => {
  const well = element("fe-thermowell", {}, { id: "well", bindings: { instrument: { kind: "thermal", direction: "out" } } });
  const transmitter = primaryInstrument(well, { ...field("tt", "thermal"), integral: false }, { y: -45 });
  const mount = measurementBoundary({ id: "wall", kind: "mechanical-mount", direction: "bidirectional", point: [0, 0] });
  assert.equal(primaryNetwork([well, transmitter, mount], [
    edge("mount", "mechanical-mount", "wall", "boundary", "well", "mount"),
    edge("read", "thermal", "well", "instrument", "tt", "sense"),
  ]).transfers[0].transfer, "heat-only");
  const radar = element("fe-level-radar", {}, { id: "radar" });
  const venturi = element("fe-flow-venturi", {}, { id: "v", tappingSpecification: {
    source: "Drawing V1", reference: "From upstream flange", unit: "mm", highStation: 80, lowStation: 250,
  } });
  assert.equal(venturi.stations[0].status, "schematic-marker");
  assert.equal(venturi.metadata.tappingSpecification.highStation, 80);
  for (const [id, portId, kind] of [
    ["radar", "sensing", "process-flow"], ["radar", "instrument", "thermal"],
    ["v", "H", "process-sensing"], ["well", "mount", "process-flow"],
  ]) assert.throws(() => primaryNetwork([well, transmitter, radar, venturi],
    [edge("illegal", kind, id, portId, "tt", "sense")]), /Incompatible/);
  assert.throws(() => element("fe-level-radar", {}, { bindings: { instrument: { kind: "process-flow", direction: "out" } } }), /binding/);
  assert.throws(() => element("fe-thermowell", {}, { bindings: { instrument: { kind: "electrical", direction: "out" } } }), /heat sensing/);
});

const weir = {
  type: "weir", physical: { unit: "m", width: 1.5, thickness: 0.12, crest: 0.45, notchDepth: 0.25,
    upstreamLength: 2.4, downstreamLength: 0.8, angle: 90 },
  measurement: { station: -1.0, datum: { id: "Fixture datum", unit: "m", invertRL: 100, headZeroRL: 100.45 },
    source: "Illustrative design input" },
};
test("flume is explicitly conceptual and weir reuses Family 04 in every supported measuring view", () => {
  for (let q = 0; q < 4; q++) {
    const at = { x: 190, y: 200, q };
    const flume = composeMeasuringStructure({ type: "fe-flume" }, at, { view: "plan" });
    assert.equal(flume.metadata.basis, "conceptual");
    assert.match(flume.shapes.at(-1).t[2], /not calibrated/);
    assert.deepEqual(flume.ports, []);
    assert.deepEqual(composeMeasuringStructure({ type: "fe-flume" }, at).shapes, placeSymbol("fe-flume", at).shapes);
    const display = { view: "plan", stateBasis: "design", scale: 40 };
    const plan = composeMeasuringStructure(weir, at, display);
    assert.deepEqual(plan.shapes.slice(0, 3), composeEquipment(weir, at, display).shapes);
    assert.deepEqual(plan.headReference.point, placePoint([-1, 0], { ...at, s: 40 }));
    if (q) {
      for (const config of [weir, { type: "fe-flume" }]) {
        assert.throws(() => composeMeasuringStructure(config, at, { view: "section" }), /gravity upright/);
      }
    }
  }
  const at = { x: 190, y: 200 };
  const display = { view: "section", stateBasis: "design", scale: 40, waterLevel: 100.56 };
  const result = composeMeasuringStructure(weir, at, display);
  assert.deepEqual(result.shapes.slice(0, 2), composeEquipment(weir, at, display).shapes);
  assert(Math.abs(result.headReference.point[1] - 182) < 1e-9);
  assert.equal(result.metadata.waterLevel, 100.56);
  assert.equal(composeMeasuringStructure({ type: "fe-flume" }, at, { view: "section" }).metadata.basis, "conceptual");
  assert.throws(() => composeMeasuringStructure({ ...weir, measurement: undefined }, at, display), /upstream station/);
  assert.throws(() => composeMeasuringStructure({ ...weir, measurement: { ...weir.measurement, station: -9 } }, at, display), /outside/);
  assert.throws(() => composeMeasuringStructure({ type: "fe-flume", physical: {} }, at, display), /graphical placement/);
});
