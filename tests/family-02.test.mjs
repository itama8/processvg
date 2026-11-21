import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { byId, composeValve, place, placeOperatingValve, placePoint, placeSymbol } from "../src/library.mjs";
import { routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const build = (bodyId, config, at, options) => composeValve({ bodyId, ...config }, at, options);
const drawing = (result) => result.shapes.filter(({ t }) => !t);
const labels = (result) => result.shapes.filter(({ t }) => t).map(({ t }) => t[2]);
const catalogue = JSON.parse(readFileSync(new URL("../drawings/symbols/catalogue.json", import.meta.url)));
const expectedIds = [
  "gate", "globe", "ball", "plug", "butterfly", "knife", "check", "diaphragm", "angle", "3way", "relief", "air",
  "needle", "pinch", "foot", "pressure-reducing", "air-combination", "float-operated",
].map((id) => `valve-${id}`);

test("catalogue, legacy draws, actuator assemblies and upstream instrumentation keep their entry points", () => {
  assert.deepEqual(catalogue.symbols.filter(({ category }) => category === "Valves").map(({ id }) => id), expectedIds);
  for (const id of expectedIds) assert.deepEqual(byId[id].ports, placeSymbol(id).ports);
  for (const id of ["act-hand", "act-motor", "act-solenoid", "act-diaphragm", "valve-control"]) {
    assert.deepEqual(placeSymbol(id).ports, [[-8, 0], [8, 0]]);
    assert.ok(byId[id].draw({})[0].d);
  }
  assert.equal(byId["inst-panel"].name, "MCP");
  assert.equal(byId["inst-local"].name, "LCP");
  assert.equal(byId["valve-gate"].draw({ closed: true })[0].fill, "solid");
  assert.equal(byId["valve-gate"].draw({ closed: false })[0].fill, undefined);
  assert.equal(placeSymbol("valve-gate", {}, { closed: true }).metadata.normalPosition, null);
  const nrv = catalogue.symbols.find(({ id }) => id === "valve-check");
  assert.deepEqual(nrv.historicalSources.map(({ ref }) => ref), ["0403", "P-002"]);
  assert.ok(nrv.verification);
  assert.equal(nrv.states, undefined);
  const butterfly = catalogue.symbols.find(({ id }) => id === "valve-butterfly");
  assert.deepEqual(labels({ shapes: butterfly.shapes.closed }), ["NC"]);
  const regulator = catalogue.symbols.find(({ id }) => id === "valve-pressure-reducing");
  assert.deepEqual(labels(regulator), ["Pressure reducing"]);
  assert.deepEqual(labels(regulator.representations.compact), ["Pressure reducing"]);
});

test("approved hollow NRV and derived foot preserve exact geometry and route-aligned direction", () => {
  const check = byId["valve-check"];
  assert.deepEqual(check.draw({ closed: true }), [
    { d: "M-7 -5 L7 0 L-7 5 Z" }, { d: "M7 -6.2 L7 6.2" },
  ]);
  const foot = byId["valve-foot"];
  assert.deepEqual(foot.draw({}).slice(0, 2), place(check.draw({}), { q: -1 }));
  assert.deepEqual(foot.draw({}).slice(2).map(({ d }) => d), [
    "M0 -16 L0 -7 M0 7 L0 10",
    "M-8 10 L8 10 L8 19 L-8 19 Z M-4 12 L-4 17 M0 12 L0 17 M4 12 L4 17",
  ]);
  assert.match(foot.designApproval, /Family 03 amendment/);
  for (const q of [0, 1, 2, 3, -1]) {
    const at = { x: 40, y: 70, q, s: 0.5 };
    const result = placeSymbol(check.id, at);
    for (const [index, end] of Object.values(result.permittedFlow).entries()) {
      assert.deepEqual(end.point, placePoint(check.ports[index], at));
      assert.deepEqual(end.normal, placePoint([index ? 1 : -1, 0], { q }));
      const far = end.point.map((value, axis) => value + end.normal[axis] * 40);
      const route = routeLine("line-flow", index ? [end.point, far] : [far, end.point]);
      assert.deepEqual(route.ports[index ? 0 : 1], end.point);
      assert.match(route.shapes[0].d, new RegExp(end.point.join(" ")));
    }
    const screened = placeSymbol(foot.id, at);
    assert.deepEqual(screened.ports, [placePoint([0, -16], at)]);
    assert.deepEqual(screened.permittedFlow.from.point, placePoint([0, 19], at));
    assert.equal(screened.permittedFlow.from.kind, "screened-boundary");
    assert.equal(screened.permittedFlow.to.id, "out");
  }
  const needle = build("valve-needle", { permittedFlow: { from: "out", to: "in" } });
  assert.deepEqual(needle.permittedFlow.from.normal, [1, 0]);
  assert.throws(() => build(check.id, { permittedFlow: { from: "out", to: "in" } }), /explicit flow direction/);
});

test("closed body masks stay on each body and round-trip as transparent paint", () => {
  const bodyIds = ["valve-globe", "valve-ball", "valve-plug", "valve-needle"];
  const closed = bodyIds.flatMap((bodyId, index) =>
    build(bodyId, { normalPosition: "closed" }, { x: 50 + index * 50, y: 100, s: 1.5, q: index }).shapes);
  assert.equal(closed.filter(({ knockout }) => knockout).length, 4);
  assert.equal(closed.find(({ knockout }) => knockout?.[0]?.cutWidth).knockout[0].cutWidth, 5.1);
  // Mask ids are per drawing, not per process: callers scope them with idPrefix or svgDoc's id.
  const light = render(closed, { idPrefix: "light" });
  const dark = render(closed, { idPrefix: "dark" });
  assert.equal(render(closed), render(closed));
  const ids = (markup) => Array.from(markup.matchAll(/<mask id="([^"]+)"/g), ([, id]) => id);
  assert.equal(new Set([...ids(light), ...ids(dark)]).size, 8);
  for (const id of ids(light)) assert.equal(light.split(`url(#${id})`).length, 2);
  assert.doesNotMatch(light.replace(/<defs>.*?<\/defs>/s, ""), /#fff|#000/);
  const svg = svgDoc("valves", "Closed valve test", "Test", light);
  assert.doesNotMatch(svg, /<rect /);
  for (const bodyId of bodyIds.concat(["valve-butterfly", "valve-knife", "valve-pinch"])) {
    const config = { bodyId, normalPosition: "closed", operatingPosition: { position: "closed", openingPercent: 0 } };
    const small = composeValve(config, { s: 0.6 });
    const open = composeValve({ bodyId, normalPosition: "open" }, { s: 0.6 });
    assert.deepEqual(drawing(small), drawing(open));
    assert.deepEqual(labels(small), ["NC"]);
    assert.deepEqual(labels(placeOperatingValve(config, { s: 1.5 }, { renderScale: 0.4 })), ["CLOSED · Operating · 0% travel"]);
  }
});

test("design, current state and event-specific failure stay independent", () => {
  const config = {
    bodyId: "valve-gate", tag: "GV-1", normalPosition: "open", operatingPosition: { position: "closed", openingPercent: 0 },
    failPosition: "last", failEvent: "loss of air",
  };
  const design = composeValve(config);
  const live = placeOperatingValve(config);
  assert.equal(design.shapes[0].fill, undefined);
  assert.equal(live.shapes[0].fill, "solid");
  assert.deepEqual(labels(design), ["GV-1", "Fail last (FLP) on loss of air"]);
  assert.deepEqual(labels(live), ["GV-1", "Operating closed · 0% travel", "Fail last (FLP) on loss of air"]);
  assert.equal(live.metadata.normalPosition, "open");
  assert.equal(live.metadata.failPosition, "last");
  assert.deepEqual(labels(build("valve-gate", { normalPosition: "unknown" })), ["Normal unknown"]);
  assert.deepEqual(labels(build("valve-gate")), ["Normal unspecified"]);
  assert.deepEqual(labels(placeSymbol("valve-gate", {}, { normalPosition: null })), ["Normal unspecified"]);
  assert.deepEqual(labels(placeSymbol("valve-gate")), []);
  assert.deepEqual(labels(placeOperatingValve({ bodyId: "valve-gate", normalPosition: "open" })), ["Operating unspecified"]);
  assert.deepEqual(labels(placeOperatingValve({ bodyId: "valve-gate", operatingPosition: { position: "partial", openingPercent: 35 } })),
    ["Operating partial · 35% travel"]);
  for (const value of [-1, 101, NaN, 0, 100]) {
    assert.throws(() => build("valve-gate", { operatingPosition: { position: "partial", openingPercent: value } }), /position/);
  }
  assert.throws(() => build("valve-gate", { failPosition: "partial" }), /position/);
});

test("passive interfaces remain outside process piping; diverter route pairs retain unknown and empty distinctly", () => {
  for (const bodyId of ["valve-check", "valve-foot", "valve-air", "valve-air-combination", "valve-relief"]) {
    assert.throws(() => build(bodyId, { normalPosition: "closed" }), /passive/);
    assert.deepEqual(drawing(placeSymbol(bodyId, {}, { closed: true })), drawing(placeSymbol(bodyId)));
  }
  const air = build("valve-air-combination", {}, { q: 1 });
  assert.equal(air.processPorts.length, 1);
  assert.deepEqual(air.interfaces[0].point, [16, 0]);
  assert.equal(air.interfaces[0].kind, "atmospheric-boundary");
  assert.throws(() => build("valve-air-combination", { endConnections: { atmosphere: { type: "flanged" } } }), /process port/);
  assert.throws(() => build("valve-foot", { endConnections: { intake: { type: "flanged" } } }), /process port/);
  const bodyId = "valve-3way";
  assert.throws(() => build(bodyId, { activePortPairs: [["branch", "branch"]] }), /distinct/);
  assert.throws(() => build(bodyId, { activePortPairs: [["branch", "out"], ["out", "branch"]] }), /Duplicate/);
  assert.deepEqual(labels(placeOperatingValve({ bodyId })), ["Routes unspecified"]);
  assert.deepEqual(labels(placeOperatingValve({ bodyId, failPosition: "last" })),
    ["Routes unspecified", "Fail last (FLP)"]);
  assert.throws(() => build(bodyId, { failPosition: "open" }), /port pairs/);
  assert.deepEqual(labels(placeOperatingValve({ bodyId, activePortPairs: [] })), ["No active routes"]);
  const route = placeOperatingValve({ bodyId, activePortPairs: [["in", "branch"]] });
  assert.deepEqual(route.connectivity, []);
  assert.deepEqual(route.metadata.activePortPairs, [["in", "branch"]]);
  assert.deepEqual(drawing(route), drawing(placeSymbol(bodyId)));
});

test("pressure reducing representations keep the downstream tap, receiver and pipe faces distinct", () => {
  const bodyId = "valve-pressure-reducing";
  const compact = build(bodyId);
  const explicit = build(bodyId, {
    representation: "downstream-sensing", setpoint: { value: 300, units: "kPa" },
    endConnections: { out: { type: "flanged" } },
  }, { x: 29, y: 50, q: 1 });
  assert.deepEqual(compact.ports, [[-8, 0], [8, 0]]);
  assert.deepEqual(labels(compact), ["Pressure reducing"]);
  assert.deepEqual(labels(placeSymbol(bodyId)), ["Pressure reducing"]);
  assert.deepEqual(byId[bodyId].draw().filter(({ t }) => t).map(({ t }) => t[2]), ["Pressure reducing"]);
  assert.equal(compact.sensing, undefined);
  assert.deepEqual(explicit.ports, [[29, 42], [29, 77]]);
  assert.deepEqual(explicit.processPorts[1].bodyPoint, [29, 68]);
  assert.deepEqual(explicit.sensing, { kind: "hydraulic-impulse", tap: [29, 68], receiver: [44, 50] });
  assert.equal(explicit.shapes.filter(({ role }) => role === "dot").length, 1);
  assert.equal(explicit.shapes.filter(({ role }) => role === "secondary").length, 3);
  assert.deepEqual(labels(explicit), ["Pressure reducing", "Setpoint 300 kPa"]);
  assert.throws(() => build(bodyId, { setpoint: { value: 300 } }), /units/);
  assert.throws(() => build(bodyId, { actuator: { type: "hand" } }), /mount/);
  const short = build(bodyId, { representation: "downstream-sensing" }, { s: 0.65 });
  assert.match(render(short.shapes, { profile: "print" }), /stroke-dasharray="2 2"/);
  assert.deepEqual(labels(short), ["Pressure reducing", "Hydraulic impulse"]);
});

test("butterfly design specifies NC while operating closure uses the reported position", () => {
  const bodyId = "valve-butterfly";
  const config = { bodyId, normalPosition: "closed", operatingPosition: { position: "open", openingPercent: 100 } };
  const at = { s: 2 };
  const closed = composeValve(config, at);
  assert.deepEqual(drawing(closed), drawing(build(bodyId, { normalPosition: "open" }, at)));
  assert.deepEqual(labels(closed), ["NC"]);
  assert.deepEqual(labels(placeSymbol(bodyId, at, { normalPosition: "closed" })), ["NC"]);
  assert.deepEqual(labels(placeOperatingValve(config, at)), ["Operating open · 100% travel"]);
  const live = placeOperatingValve({ ...config, operatingPosition: { position: "closed", openingPercent: 0 } }, at);
  assert.deepEqual(labels(live), ["Operating closed · 0% travel"]);
  assert.equal(live.shapes.find(({ c }) => c).fill, "solid");
  assert.equal(placeSymbol(bodyId, at, { closed: true }).shapes.find(({ c }) => c).fill, "solid");
});

test("pinch keeps its compression identity without an exposed blade", () => {
  const bodyId = "valve-pinch";
  const open = byId[bodyId].draw({ closed: false });
  const closed = byId[bodyId].draw({ closed: true });
  assert.deepEqual(open[1], closed[1]);
  assert.equal(closed[0].knockout[0].d, open[1].d);
  assert.notDeepEqual(drawing(build(bodyId, { normalPosition: "open" }, { s: 0.65 })),
    drawing(build("valve-knife", { normalPosition: "open" }, { s: 0.65 })));
  assert.deepEqual(build(bodyId).ports, [[-8, 0], [8, 0]]);
});

test("mount and process normals rotate together while identification stays upright", () => {
  const config = {
    bodyId: "valve-knife", actuator: { type: "motor", stemLength: 8 },
    endConnections: { in: { type: "flanged" }, out: { type: "plain" } }, tag: "KV-2", normalPosition: "closed",
  };
  for (const q of [0, 1, 2, 3]) {
    const at = { q, x: 100, y: 95, s: 1.5 };
    const result = composeValve(config, at, {
      measureText: (text) => text === "M" ? { left: 4, right: 4, ascent: 7, descent: 0 }
        : { left: 12, right: 12, ascent: 8, descent: 2 },
    });
    assert.deepEqual(result.ports, [[-13, 0], [4, 0]].map((point) => placePoint(point, at)));
    assert.deepEqual(result.anchors.mount, { point: placePoint([0, -11], at), normal: placePoint([0, -1], { q }) });
    assert.deepEqual(result.anchors.head.point, placePoint([0, -19], at));
    const operator = result.shapes.find(({ t }) => t?.[2] === "M");
    assert.deepEqual(operator.t.slice(0, 2), placePoint([0, -26], at));
    assert.match(render(result.shapes), /dy="3.5"/);
    assert.doesNotMatch(render(result.shapes), /rotate\(/);
    const box = result.labelBounds[0];
    assert.ok(box.top > result.bounds.bottom || box.left > result.bounds.right - 6);
  }
  const reduced = composeValve(config, { s: 0.65, q: 1 });
  assert.deepEqual(labels(reduced), ["KV-2", "NC", "Motor (M)"]);
  const float = build("valve-float-operated");
  assert.equal(float.metadata.bodyId, "valve-gate");
  assert.equal(float.metadata.actuator.behavior, "unknown");
  const needle = build("valve-needle", { actuator: { type: "float", behavior: "close-on-rise" } });
  assert.deepEqual(needle.anchors.mount.point, [0, -9]);
  assert.equal(needle.metadata.actuator.behavior, "close-on-rise");
  assert.throws(() => build("valve-pinch", { actuator: { type: "hand" } }), /mount/);
  assert.deepEqual(place([{ d: "M-8 0 A8 3 0 0 1 8 0" }], { q: 1 }), [{ d: "M0 -8 A3 8 0 0 1 0 8" }]);
});
