import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  byId, composeInstrument, composeLogicDiagram, instrumentNetwork, logicTruth, migrateInstrument,
  placeLogicPrimitive, placeSymbol, resolveInterlockReference, LEGACY_INSTRUMENT_ANCHORS,
} from "../src/library.mjs";
import { ENCLOSURES } from "../src/instruments.mjs";
import { INSTRUMENT_FONT, measureInstrumentInk } from "../src/instrument-ink.mjs";
import { render, svgDoc } from "../src/render.mjs";

const file = (path) => readFileSync(new URL(path, import.meta.url));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const rows = (result) => result.shapes.flatMap((shape) => shape.identityInk ?? []);
const almost = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const make = (config = {}, at = {}, display) => composeInstrument({
  id: "test", kind: "physical-instrument", enclosure: "discrete", location: "field", ...config,
}, at, display);

test("version 0 catalogue, default drawing, source citations and numeric port order are preserved", () => {
  const archive = JSON.parse(file("../drawings/symbols/catalogue.json")).symbols
    .filter(({ id }) => Object.hasOwn(LEGACY_INSTRUMENT_ANCHORS, id))
    .map(({ instrument, ...symbol }) => symbol);
  assert.equal(sha(JSON.stringify(archive)), "c0347f90680f412a954dd05b69482b29d2cb47abcea76413474c0216e3d0a0e3");
  assert.equal(sha(file("../drawings/symbols/legend-instruments.svg")), "e28c4b0eae67e68ca8c87dd2664197dfb0c387687b3098b5e84d3ffb79b1c181");
  for (const { id, shapes, ports } of archive) {
    assert.deepEqual(placeSymbol(id).shapes, shapes);
    assert.deepEqual(placeSymbol(id).ports, ports);
    assert.deepEqual(placeSymbol(id, {}, { mode: "legacy" }).ports, ports);
    assert.deepEqual(byId[id].draw({}), shapes);
  }
  assert.deepEqual(placeSymbol("inst-panel", { q: 1 }, { tag: ["LIC", "004"] }).ports, [[-16, 0], [16, 0]]);
  assert.deepEqual(placeSymbol("inst-interlock").ports, [[-10, 0], [10, 0]]);
  assert.deepEqual(placeSymbol("inst-transmitter-is").ports, [[0, 10]]);
});

test("all enclosure and location pairs meet exact inner endpoints, tangencies and centered dash clearance", () => {
  for (const enclosure of ENCLOSURES) {
    for (const [location, accessibility, ys] of [
      ["field", undefined, []], ["main", "accessible", [0]], ["main", "inaccessible", [0]],
      ["local", "accessible", [-2, 2]], ["local", "inaccessible", [-2, 2]],
    ]) {
      const shape = make({ enclosure, location, accessibility, tag: { letters: "FIT", loop: "101" } });
      const r = shape.radius;
      assert.equal(shape.bars.length, ys.length);
      assert.deepEqual(shape.anchors.E, [r, 0]);
      assert.deepEqual(shape.anchors.W, [-r, 0]);
      assert.deepEqual(shape.ports, []);
      almost(shape.anchors.N[1], enclosure === "computer" ? -r * Math.sqrt(3) / 2 : -r);
      almost(shape.anchors.S[1], -shape.anchors.N[1]);
      if (enclosure.startsWith("shared-")) {
        assert.equal(shape.shapes[0].d, `M${-r} ${-r} L${r} ${-r} L${r} ${r} L${-r} ${r} Z`);
        if (enclosure === "shared-primary") assert.deepEqual(shape.shapes[1].c, [0, 0, r]);
        else assert.equal(shape.shapes[1].d, `M0 ${-r} L${r} 0 L0 ${r} L${-r} 0 Z`);
      }
      for (const [i, bar] of shape.bars.entries()) {
        const y = ys[i];
        const expected = enclosure === "computer" ? r - Math.abs(y) / Math.sqrt(3) :
          enclosure === "shared-alternate" ? r - Math.abs(y) : Math.sqrt(r * r - y * y);
        assert.deepEqual(bar.endpoints, [[-expected, y], [expected, y]]);
        assert.equal(bar.dashed, accessibility === "inaccessible");
        assert.equal(bar.segments.length === 1, !bar.dashed);
        assert.deepEqual(bar.segments[0][0], bar.endpoints[0]);
        assert.deepEqual(bar.segments.at(-1)[1], bar.endpoints[1]);
        for (const [j, [[left], [right]]] of bar.segments.entries()) {
          if (bar.dashed) {
            almost(left, -bar.segments.at(-j - 1)[1][0]);
            if (j > 0) assert.ok(left - bar.segments[j - 1][1][0] > 1.3);
          }
          assert.ok(right > left);
        }
      }
      if (shape.bars.length === 2) assert.deepEqual(
        shape.bars[0].segments.map((segment) => segment.map(([x]) => x)),
        shape.bars[1].segments.map((segment) => segment.map(([x]) => x)),
      );
    }
  }
  assert.throws(() => make({ accessibility: "inaccessible" }), /Field/);
  assert.throws(() => make({ location: "unknown" }), /location/);
});

test("measured full-ink tags grow to the first fitting radius, preserve Unicode and remain portable", () => {
  const font = file("../vendor/plotter/assets/fonts/CalSansVF.woff2");
  assert.equal(sha(font), INSTRUMENT_FONT.sourceSha256);
  assert.notEqual(measureInstrumentInk("IIII", 7.5).bounds[2], measureInstrumentInk("WWWW", 7.5).bounds[2]);
  const tag = { letters: "LSHH", loop: "AREA-02/TRAIN/0007E\u0301", externalId: "plant:station07" };
  const result = make({ tag, enclosure: "shared-alternate", location: "local" });
  assert.ok(result.radius > 16);
  assert.deepEqual(rows(result), [tag.letters, tag.loop]);
  assert.equal(result.metadata.tag.loop, tag.loop);
  assert.throws(() => make({ tag, enclosure: "shared-alternate", location: "local" }, {}, { maxRadius: result.radius - 1 }), /overflow/);
  for (const [left, top, right, bottom] of result.identityBounds) {
    assert.ok(Math.max(-left, right) + 1 <= result.radius - (Math.max(-top, bottom) + 1));
    assert.ok(bottom <= -3 || top >= 3);
  }
  const svg = render(result.shapes);
  assert.equal(svg, render(make({ tag, enclosure: "shared-alternate", location: "local" }).shapes));
  assert.match(svg, /fill="currentColor" stroke="none" opacity="1"/);
  assert.match(svg, /aria-description="LSHH-AREA-02\/TRAIN\/0007É · plant:station07"/);
  assert.match(render(result.shapes, { profile: "print" }), /data-processvg-identity/);
  for (const loop of ["101", "1201A", "0007B", "1É", undefined]) {
    assert.deepEqual(rows(make({ tag: { letters: "PDIT", loop } })), ["PDIT", ...(loop ? [loop] : [])]);
  }
  assert.throws(() => make({ tag: { letters: "FIT", loop: 7 } }), /string/);
  assert.throws(() => make({ tag: { letters: "漢" } }), /Unsupported instrument glyph/);
  assert.throws(() => make({ tag }, {}, { fontSize: 7 }), /constraints/);
  const custom = (value, size) => {
    assert.equal(size, 7.5);
    return { bounds: [0, -4, value.length + 1, 0], paths: [{ x: 0, d: "M0 0 L1 -4 L2 0 Z" }], scale: 1 };
  };
  assert.deepEqual(rows(make({ tag: { letters: "漢" } }, {}, { measureInk: custom })), ["漢"]);
});

test("panel identities have their own number and leave authored LIC and PI intact", () => {
  for (const [id, identifier, number] of [
    ["inst-panel", "MCP", "102"], ["inst-panel-inaccessible", "MCP", "102"],
    ["inst-local", "LCP", "103"], ["inst-local-inaccessible", "LCP", "103"],
  ]) {
    const panel = placeSymbol(id, {}, { mode: "candidate" });
    assert.deepEqual(rows(panel), [identifier, number]);
    assert.deepEqual(panel.metadata.panel, { identifier, number });
    assert.equal(panel.metadata.tag, undefined);
    assert.equal(panel.metadata.kind, "control-panel");
    const authored = placeSymbol(id, {}, { mode: "candidate", tag: [identifier === "MCP" ? "LIC" : "PI", "0004"] });
    assert.deepEqual(authored.metadata.tag, { letters: identifier === "MCP" ? "LIC" : "PI", loop: "0004" });
    assert.equal(authored.metadata.kind, "control-function");
    assert.throws(() => placeSymbol(id, {}, { mode: "candidate", measuredQuantity: "level" }), /Control panel identity/);
  }
});

test("placement follows parent quarter turns while geometry and named exits stay upright", () => {
  const config = { enclosure: "computer", location: "local", accessibility: "inaccessible",
    tag: { letters: "CALC", loop: "0007B" }, ports: [{ id: "data", kind: "digital-data", direction: "out", anchor: "E" }] };
  for (const [q, [x, y]] of [[0, [102, 203]], [1, [97, 202]], [2, [98, 197]], [3, [103, 198]]]) {
    const result = make(config, { x: 2, y: 3, q }, { parent: { x: 100, y: 200, q } });
    assert.deepEqual(result, make(config, { x, y }));
    assert.equal(result.metadata.orientation, 0);
    assert.deepEqual(result.ports[0].point, result.anchors.E);
  }
});

test("external identity avoids route and other label ink; versioned migration reports every moved attachment", () => {
  const result = placeSymbol("inst-interlock", {}, {
    mode: "candidate", reference: { id: "interlock-101", label: "I-101", logicId: "screen-logic" },
    display: { avoidRoutes: [[[5, 11], [5, 50]], [[10, 0], [35, 0]]] },
  });
  assert.deepEqual(rows(result), ["I", "I-101"]);
  assert.match(render(result.shapes), /data-interlock-id="interlock-101" data-logic-id="screen-logic"/);
  assert.deepEqual(result.metadata.preferredAnchors, ["W", "E"]);
  assert.ok(result.identityBounds[1][2] < 0);
  assert.deepEqual(result.anchors, { N: [0, -10], E: [10, 0], S: [0, 10], W: [-10, 0] });
  const crossed = placeSymbol("inst-transmitter-is", {}, { mode: "candidate", tag: ["LT", "045"] });
  assert.deepEqual(rows(crossed), ["LT-045"]);
  assert.ok(crossed.identityBounds[0][1] > 10);
  assert.throws(() => make({ tag: { letters: "FIT" }, tagPlacement: "external" }), /permission/);
  const annotation = make({ tag: { letters: "FIT" }, annotation: { service: "Inlet flow", value: "1.50 L/s" } });
  assert.deepEqual(rows(annotation), ["FIT"]);
  assert.equal(annotation.annotationBounds.length, 2);
  assert.match(render(annotation.shapes), /data-processvg-annotation="value" opacity="0.5"/);
  assert.throws(() => placeSymbol("inst-interlock", {}, {
    mode: "candidate", reference: { id: "i", label: "I-101", logicId: "d" }, display: { avoidBounds: [[-100, -100, 100, 100]] },
  }), /No clear position/);
  const old = { id: "arbitrary-id", symbolId: "inst-local", at: { x: 20, y: 50, q: 1 }, options: { tag: ["PI", "0003"], processState: "unknown" } };
  const moved = migrateInstrument(old);
  assert.equal(moved.config.version, 1);
  assert.equal(moved.candidate.metadata.processState, "unknown");
  assert.deepEqual(rows(moved.candidate), ["PI", "0003"]);
  assert.deepEqual(moved.report.portMap.map(({ index, anchor, before, reroute }) => [index, anchor, before, reroute]),
    [[0, "S", [6, 50], true], [1, "N", [34, 50], true]]);
  const absent = migrateInstrument({ id: "unknown-tag", symbolId: "inst-plc" });
  assert.deepEqual(rows(absent.candidate), []);
  assert.equal(absent.report.missingIdentity, true);
  const unidentified = migrateInstrument({ id: "unknown-panel", symbolId: "inst-panel" });
  assert.equal(unidentified.candidate.metadata.kind, "unclassified");
  assert.equal(unidentified.report.needsClassification, true);
  assert.deepEqual(rows(unidentified.candidate), []);
  const knownPanel = migrateInstrument({ id: "known-panel", symbolId: "inst-panel", options: { kind: "control-panel" } });
  assert.equal(knownPanel.candidate.metadata.kind, "control-panel");
  assert.deepEqual(rows(knownPanel.candidate), []);
  assert.equal(knownPanel.report.needsClassification, false);
  assert.throws(() => migrateInstrument({ ...old, version: 1 }), /version 0/);
});

test("physical inventory, hosted displays and connections use stable instance IDs and typed ports", () => {
  const port = (id, anchor, kind, direction) => ({ id, anchor, kind, direction });
  const up = make({ id: "up", measuredQuantity: "level", datum: "basin", ports: [port("signal", "E", "digital-data", "out")] });
  const down = make({ id: "down", measuredQuantity: "level", datum: "basin" });
  const panel = placeSymbol("inst-panel", {}, { mode: "candidate", id: "mcp-01" });
  const calc = placeSymbol("inst-computer", { x: 100 }, {
    mode: "candidate", id: "delta", hostedBy: "mcp-01", executionHost: "PLC-01", engineeringUnit: "m",
    operation: { type: "subtract", inputs: ["up", "down"], commonDatum: "basin" },
    ports: [port("upstream", "W", "digital-data", "in")],
  });
  const edge = { id: "reading", kind: "digital-data", from: { assetId: "up", portId: "signal" }, to: { assetId: "delta", portId: "upstream" } };
  const network = instrumentNetwork([up, down, panel, calc], [edge]);
  assert.deepEqual(network.measuringDeviceIds, ["up", "down"]);
  assert.deepEqual(network.physicalDeviceIds, ["up", "down"]);
  assert.deepEqual(network.edges[0].points, [up.anchors.E, calc.anchors.W]);
  assert.equal(calc.metadata.enclosure, "computer");
  assert.deepEqual(calc.metadata.operation.inputs, ["up", "down"]);
  assert.throws(() => instrumentNetwork([up, calc], [edge]), /hosting panel/);
  assert.throws(() => instrumentNetwork([up, down, panel, calc], [{ ...edge, kind: "electrical" }]), /Incompatible/);
  assert.throws(() => instrumentNetwork([up, panel, calc], [edge, { ...edge, id: "other" }]), /fan-out/);
  assert.throws(() => make({ ports: [port("a", "N", "electrical", "out"), port("b", "N", "pneumatic", "in")] }), /distinct exits/);
  assert.throws(() => make({ ports: [port("a", "N", "pipe", "out")] }), /connection kind/);
  assert.throws(() => make({ ports: [port("a", "C", "digital-data", "out")] }), /anchor/);
  assert.throws(() => make({ kind: "computed-function", ports: [port("tap", "N", "process-sensing", "in")] }), /physical/);
  const larger = make({ id: "up", tag: { letters: "FIT", loop: "A-VERY-LONG-PLANT-REFERENCE" },
    ports: [port("signal", "E", "digital-data", "out")] });
  assert.notDeepEqual(instrumentNetwork([larger, panel, calc], [edge]).edges[0].points[0], network.edges[0].points[0]);
});

test("logic is view-scoped, uses exact pin intersections and validates P&ID reference identity", () => {
  assert.throws(() => placeSymbol("logic-or"), /dedicated/);
  const or = placeLogicPrimitive("logic-or", {}, { mode: "logic" });
  assert.match(or.shapes[0].d, /Q-4 0 -12 -10/);
  for (const [i, t] of [0.75, 0.25].entries()) {
    const x = -12 + 16 * t * (1 - t), y = 10 - 20 * t;
    assert.equal(or.shapes[i + 1].d, `M-20 ${y} H${x}`);
  }
  const inputs = [false, true, "unknown"];
  const and = [[false, false, false], [false, true, "unknown"], [false, "unknown", "unknown"]];
  const orTable = [[false, true, "unknown"], [true, true, true], ["unknown", true, "unknown"]];
  inputs.forEach((A, i) => {
    assert.equal(logicTruth("logic-not", { A }), [true, false, "unknown"][i]);
    inputs.forEach((B, j) => {
      assert.equal(logicTruth("logic-and", { A, B }), and[i][j]);
      assert.equal(logicTruth("logic-or", { A, B }), orTable[i][j]);
    });
  });
  assert.equal(logicTruth("logic-or", { A: false }), "unknown");
  assert.throws(() => logicTruth("logic-not", { A: 0 }), /Boolean/);
  const timer = placeLogicPrimitive("logic-timer-on", {}, { mode: "logic", pt: { value: 2.5, unit: "s" }, exposedET: true });
  assert.equal(timer.pins.ET.signal, "elapsed-time");
  assert.deepEqual(timer.pins.Q.point, [20, 0]);
  assert.equal(timer.metadata.execution, "diagram-only");
  assert.throws(() => logicTruth("logic-timer-on"), /combinational/);
  assert.throws(() => placeLogicPrimitive("logic-timer-on", {}, { mode: "logic", pt: { value: -1, unit: "s" } }), /PT/);
  const reference = placeSymbol("inst-interlock", {}, { mode: "candidate", reference: { id: "i-101", label: "I-101", logicId: "d-101" } });
  const nodes = [{ id: "timer", type: "logic-timer-on", exposedET: true }, { id: "or", type: "logic-or", at: { x: 70 } }];
  const diagram = composeLogicDiagram({ id: "d-101", referenceId: "i-101", nodes });
  assert.equal(diagram.unknownInputs.length, 3);
  assert.equal(resolveInterlockReference(reference, [diagram]), diagram);
  assert.throws(() => resolveInterlockReference(reference, [diagram, diagram]), /Unresolved/);
  assert.throws(() => resolveInterlockReference(reference, [composeLogicDiagram({ id: "d-101", referenceId: "other", nodes })]), /Unresolved/);
  assert.throws(() => composeLogicDiagram({ id: "d", referenceId: "i", nodes, dependencies: [
    { id: "edge", from: { node: "timer", pin: "ET" }, to: { node: "or", pin: "A" } },
  ] }), /dependency/);
  assert.match(svgDoc("x", "x", "x", render(or.shapes)), /vector-effect:non-scaling-stroke/);
});
