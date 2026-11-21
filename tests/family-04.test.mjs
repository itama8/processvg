import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { byId, SYMBOLS, composeActuator, composeEquipment, gateArchive, placePoint, placeSymbol } from "../src/library.mjs";
import { routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const rotations = [0, 1, 2, 3];
const glyph = ({ shapes }) => shapes.filter(({ t }) => !t);
const labels = ({ shapes }) => shapes.filter(({ t }) => t).map(({ t }) => t[2]);
const draw = (d) => ({ d });
const body = "M-2.5 -10 L2.5 -10 L2.5 10 L-2.5 10 Z";
const stop = "M-2.5 -6 L2.5 -6 L2.5 10 L-2.5 10 Z";
const diagonal = "M-2.5 10 L2.5 -10";
const p = { unit: "m", width: 1.5, thickness: 0.1, upstreamLength: 2, downstreamLength: 2 };
const guides = { ...p, height: 1.2, leafWidth: 1.7, guideTop: 2.5, guideWidth: 0.12, leafHeight: 1.3 };
const equipment = (type, physical, designPosition, operatingPosition, extra) =>
  ({ id: "g-1", tag: "G-101", type, physical, designPosition, operatingPosition, ...extra });
const slide = equipment("gate-slide", { ...guides, maxLift: 1.2 }, { lift: 0, unit: "m", position: "closed" },
  { lift: 1200, unit: "mm", position: "open" }, { normalPosition: "closed" });
const flap = equipment("gate-flap", { ...p, height: 1, wallThickness: 0.25, headerHeight: 0.25, maxAngle: 90 },
  { angle: 0, position: "closed" }, { angle: 90, position: "open" }, { installation: "wall" });
const adjustable = equipment("gate-weir-adjustable", { ...p, plateHeight: 1.2,
  minCrest: 0.4, maxCrest: 1, pocketDepth: 0.8, pocketOffset: 0.2, pocketWidth: 0.4, minEmbedment: 0.2 },
{ crest: 400, unit: "mm" }, { crest: 1, unit: "m" });
const physical = (config, view, stateBasis = "design", at = {}, extra) =>
  composeEquipment(config, at, { view, stateBasis, scale: 100, ...extra });
const replace = (config, dimensions) => ({ ...config, physical: { ...config.physical, ...dimensions } });

test("canonical aliases, original archive geometry and immutable historical stop and V profiles", () => {
  assert.equal(byId["gate-sluice"], byId["gate-slide"]);
  assert.equal(byId["weir-v-notch"], byId.weir);
  const alias = placeSymbol("gate-sluice", {}, { closed: true });
  assert.equal(alias.metadata.id, "gate-sluice");
  assert.equal(alias.metadata.type, "gate-slide");
  assert.equal(alias.metadata.closed, true);
  assert.equal(SYMBOLS.filter(({ gate }) => gate).length, 10);
  assert.equal(Object.values(byId).filter(({ gate }) => gate).length, 10);
  const oldSlide = [draw(body)];
  const oldSluice = [draw(body), draw(diagonal)];
  const oldFlap = [draw("M-2 -10 L-2 10 M-2 -10 L6 4")];
  assert.deepEqual(glyph(placeSymbol("gate-slide", {}, { convention: "legacy" })), oldSlide);
  assert.deepEqual(glyph(placeSymbol("gate-slide", {}, { convention: "legacy", closed: true })), [{ d: body, fill: "solid" }]);
  assert.deepEqual(glyph(placeSymbol("gate-sluice", {}, { convention: "legacy" })), oldSluice);
  assert.deepEqual(glyph(placeSymbol("gate-sluice", {}, { convention: "legacy", closed: true })), [
    draw(body), { d: "M2.5 -10 L2.5 10 L-2.5 10 Z", fill: "solid" },
  ]);
  assert.deepEqual(glyph(placeSymbol("gate-flap", {}, { convention: "legacy" })), oldFlap);
  assert.deepEqual(placeSymbol("gate-flap", {}, { convention: "legacy" }).ports, [[-2, 0], [4, 0]]);
  assert.deepEqual(gateArchive["gate-sluice"].shapes.open, oldSluice);
  for (const closed of [false, true]) {
    assert.deepEqual(byId["gate-stop"].draw({ closed }), [
      closed ? { d: stop, fill: "solid" } : draw(stop), draw("M-2.5 -10 L2.5 -10"),
    ]);
    assert.deepEqual(glyph(placeSymbol("gate-stop", {}, { closed })), byId["gate-stop"].draw({ closed }));
  }
  assert.deepEqual(byId.weir.draw({}), [draw("M-12 0 L-6 0 M6 0 L12 0"), draw("M-6 -6 L0 2 L6 -6"),
    draw("M-6 -6 L-6 6 L6 6 L6 -6")]);
  const catalogue = JSON.parse(readFileSync(new URL("../drawings/symbols/catalogue.json", import.meta.url)));
  assert.equal(catalogue.aliases["gate-sluice"], "gate-slide");
  assert.equal(catalogue.symbols.filter(({ category }) => category === "Gates").length, 10);
  assert.deepEqual(catalogue.gateArchive, gateArchive);
  assert.deepEqual(catalogue.symbols.find(({ id }) => id === "gate-slide").historicalSources, [{ std: "B&C", ref: "P-002, P-003" }]);
});

test("slide and bulkhead knockouts use transparent shared masks; small slides carry NC", () => {
  for (const q of rotations) {
    const at = { s: 2, q, x: 50, y: 80 };
    assert.deepEqual(glyph(placeSymbol("gate-slide", at)), glyph(placeSymbol("gate-sluice", at)));
    const closed = placeSymbol("gate-slide", at, { closed: true });
    const [fill, outline] = glyph(closed);
    assert.deepEqual(fill.knockout.map(({ cutWidth, cap }) => [cutWidth, cap]), [[2.4, "butt"]]);
    assert.deepEqual(outline, { d: fill.d });
    assert.equal(byId["gate-slide"].draw({ closed: true })[0].knockout[0].cutWidth, 1.2);
    const fallback = placeSymbol("gate-sluice", at, { closed: true, renderScale: 0.5 });
    assert.deepEqual(fallback.shapes.slice(0, 2), glyph(placeSymbol("gate-slide", at)));
    assert.deepEqual(labels(fallback), ["NC"]);
  }
  const closed = byId["gate-slide"].draw({ closed: true });
  assert.match(render(placeSymbol("gate-slide", { s: 1.333 }, { closed: true }).shapes), /stroke-width="1\.5996"/);
  const bulkhead = byId["gate-bulkhead"].draw({ closed: true });
  assert.equal(bulkhead[0].knockout[0].d, "M-4 0 L4 0");
  assert.deepEqual(bulkhead.at(-1), draw("M-7 -12 L7 -12 M-7 12 L7 12"));
  for (const options of [{ theme: "light" }, { theme: "dark" }, {}, { profile: "print" }]) {
    const svg = svgDoc("mask-test", "Mask", "Mask test", render([...closed, ...bulkhead], options), options);
    const ids = [...svg.matchAll(/<mask id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, 2);
    for (const id of ids) assert.ok(svg.includes(`mask="url(#${id})"`));
    assert.match(svg, /stroke="#000" stroke-width="1\.2" stroke-linecap="butt"/);
    assert.equal(svg.includes("<rect"), Object.keys(options).length > 0);
  }
});

test("flap has a dedicated hinge and leaf with compatible endpoints and direction at every turn", () => {
  for (const q of rotations) {
    const at = { q, x: 50, y: 30, s: 2 };
    const gate = placeSymbol("gate-flap", at);
    const nrv = placeSymbol("valve-check", at);
    assert.notDeepEqual(glyph(gate), glyph(nrv));
    assert.deepEqual(glyph(gate)[1].c.slice(0, 2), placePoint([-3, -7], at));
    assert.deepEqual(labels(gate), ["FG"]);
    assert.equal(gate.metadata.type, "gate-flap");
    assert.deepEqual(gate.ports, nrv.ports);
    assert.deepEqual(gate.connectivity, [[0, 1]]);
    assert.deepEqual(gate.permittedFlow.from.normal, nrv.permittedFlow.from.normal);
    assert.deepEqual(gate.permittedFlow.to.point, nrv.permittedFlow.to.point);
    const reverse = composeEquipment({ type: "gate-sluice", designDirection: "out-to-in", normalPosition: "closed" }, at);
    assert.deepEqual(reverse.designFlow, { from: reverse.channelPorts[1], to: reverse.channelPorts[0] });
    assert.equal(reverse.permittedFlow, undefined);
    assert.deepEqual(reverse.connectivity, [[0, 1]]);
    assert.deepEqual(composeEquipment({ ...flap, designDirection: "in-to-out" }, at).designFlow, gate.permittedFlow);
    for (const { point, normal } of gate.channelPorts) {
      const end = point.map((n, i) => n + 10 * normal[i]);
      assert.equal(routeLine("line-process", [point, end]).shapes[0].d, `M${point.join(" ")} L${end.join(" ")}`);
    }
  }
});

test("explicit stop-log counts remain visible without assuming the full inventory", () => {
  const config = { type: "gate-stop", designPosition: { installedPanels: 2 } };
  const result = composeEquipment(config);
  assert.deepEqual(labels(result), ["2 logs installed"]);
  assert.equal(result.metadata.installationState, null);
  assert.equal(result.metadata.closedDisplay, null);
  assert.throws(() => composeEquipment({ ...config, designPosition: {
    ...config.designPosition, installationState: "removed",
  } }), /disagrees/);
});

test("schematic mounts use Family 03, keep ports independent and label explicit failure states", () => {
  for (const q of rotations) {
    for (const [headId, stemLength] of [["operator-motor", 5], ["operator-handwheel", 12], ["operator-hydraulic-cylinder", 18]]) {
      const at = { x: 120, y: 60, q, s: 1.7 };
      const config = { headId, stemLength, headOrientation: "upright" };
      const plain = composeEquipment(slide, at);
      const mounted = composeEquipment({ ...slide, actuator: config, failPosition: "unknown" }, at);
      const operator = composeActuator(byId["gate-slide"].gate.mount, config, at);
      assert.deepEqual(mounted.anchors, operator.anchors);
      assert.deepEqual(mounted.metadata.stem, operator.stem);
      assert.deepEqual(mounted.channelPorts, plain.channelPorts);
      assert.deepEqual(glyph(mounted).slice(0, glyph(plain).length), glyph(plain));
      assert.deepEqual(labels(mounted).filter((label) => label.length > 1).slice(0, 3), ["G-101", "NC", "Fail position unknown"]);
    }
  }
  assert.deepEqual(labels(composeEquipment({ ...slide, failPosition: "not-applicable" })), ["G-101", "NC"]);
  assert.deepEqual(labels(placeSymbol("gate-slide", {}, { failPosition: "closed", failEvent: "loss of power" })), ["FC on loss of power"]);
  assert.throws(() => placeSymbol("gate-stop", {}, { actuator: { type: "motor" } }), /no schematic actuator/);
  assert.throws(() => placeSymbol("weir", {}, { normalPosition: "open" }), /Unsupported gate position/);
  assert.throws(() => placeSymbol("weir", {}, { operatingPosition: { lift: 1 } }), /no position snapshots/);
  assert.throws(() => placeSymbol("gate-weir-adjustable", {}, { closed: true }), /Boolean state/);
  for (const q of rotations) {
    const open = placeSymbol("gate-butterfly", { q }, { normalPosition: "open" });
    const closed = placeSymbol("gate-butterfly", { q }, { normalPosition: "closed" });
    assert.deepEqual(glyph(open), glyph(closed));
    assert.deepEqual(labels(open), ["NO"]);
    assert.deepEqual(labels(closed), ["NC"]);
    assert.equal(closed.metadata.closedDisplay, null);
  }
});

test("slide travels inside fixed guides and reports nominal clear geometry with explicit basis and units", () => {
  const closed = physical(slide, "elevation");
  const open = physical(slide, "elevation", "operating");
  const part = { ...slide, operatingPosition: { lift: 480, unit: "mm", position: "partial" } };
  const partial = physical(part, "elevation", "operating");
  assert.deepEqual(glyph(closed).slice(0, 4), glyph(open).slice(0, 4));
  assert.deepEqual(glyph(open).at(-1), draw("M-85 -250 L85 -250 L85 -120 L-85 -120 Z"));
  assert.deepEqual(glyph(closed).at(-1), draw("M-85 -130 L85 -130 L85 0 L-85 0 Z"));
  assert.deepEqual(glyph(physical(part, "section", "operating")).at(-1), draw("M0 -178 L10 -178 L10 -48 L0 -48 Z"));
  assert.deepEqual([closed, partial, open].map(({ physical }) => physical.clearOpeningHeight), [0, 0.48, 1.2]);
  assert.deepEqual([closed, partial, open].map(({ physical }) => Number(physical.clearOpeningArea.toFixed(6))), [0, 0.72, 1.8]);
  const plan = physical(slide, "plan"), spun = physical(slide, "plan", "operating", { q: 1, s: 2 });
  assert.deepEqual(glyph(plan), glyph(physical(slide, "plan", "operating")));
  assert.deepEqual(glyph(spun).at(-1), draw("M170 0 L170 20 L-170 20 L-170 0 Z"));
  assert.deepEqual(spun.physical, open.physical);
  assert.deepEqual(spun.channelPorts, []);
  assert.deepEqual(spun.anchors, {});
  assert.equal(open.metadata.id, composeEquipment(slide).metadata.id);
  assert.equal(open.metadata.tag, composeEquipment(slide).metadata.tag);
  assert.deepEqual(labels(open), ["G-101"]);
  const mm = replace(slide, Object.fromEntries(Object.entries(slide.physical).map(([k, v]) => [k, k === "unit" ? "mm" : v * 1000])));
  assert.deepEqual(glyph(open), glyph(physical(mm, "elevation", "operating")));
  assert.throws(() => composeEquipment(slide, {}, { view: "plan", scale: 100 }), /require a design or operating basis/);
  assert.throws(() => physical(slide, "section", "design", { q: 2 }), /gravity upright/);
  assert.throws(() => physical(replace(slide, { width: -1 }), "section"), /dimension: width/);
  assert.throws(() => physical(replace(slide, { guideTop: 2.45 }), "section"), /full declared travel/);
  for (const lift of [-1, 1201, NaN]) assert.throws(() => physical({ ...slide, operatingPosition: { lift, unit: "mm" } }, "section", "operating"));
  assert.throws(() => physical({ ...slide, designPosition: { lift: 0, unit: "m", position: "open" } }, "section"), /disagrees/);
});

test("stop logs stack bottom-up and bulkhead retains continuous installed geometry", () => {
  for (const [count, height, state] of [[0, 0, "removed"], [2, 0.75, "partial"], [3, 1.25, "installed"]]) {
    const config = equipment("gate-stop", { ...guides, panelHeights: [0.25, 0.5, 0.5] }, { installedPanels: count });
    const result = physical(config, "elevation");
    assert.equal(result.physical.installedHeight, height);
    assert.equal(result.metadata.installationState, state);
    assert.equal(glyph(result).length, 4 + count);
    const schematic = composeEquipment(config);
    assert.equal(glyph(schematic)[0].fill === "solid", count === 3);
    if (count === 2) {
      assert.deepEqual(glyph(result).slice(-2), [draw("M-85 -25 L85 -25 L85 0 L-85 0 Z"), draw("M-85 -75 L85 -75 L85 -25 L-85 -25 Z")]);
      assert.ok(labels(schematic).includes("Partial stack"));
    }
  }
  const bulk = equipment("gate-bulkhead", guides, { installationState: "removed" }, { installationState: "installed" });
  const removed = glyph(physical(bulk, "section")), installed = glyph(physical(bulk, "section", "operating"));
  assert.deepEqual(installed, [...removed, draw("M0 -130 L10 -130 L10 0 L0 0 Z")]);
  assert.throws(() => physical(equipment("gate-stop", { ...guides, panelHeights: [0.4] }, { installedPanels: 2 }), "section"), /panel count/);
  assert.throws(() => physical(equipment("gate-stop", { ...guides, panelHeights: new Array(1) }, { installedPanels: 0 }), "plan"), /panel height/);
});

test("flap closes against the wall seat and swings its toe downstream about a fixed pivot", () => {
  const closed = physical(flap, "section"), opened = physical(flap, "section", "operating");
  assert.deepEqual(closed.physical.hinge, opened.physical.hinge);
  assert.deepEqual(closed.physical.toe, { x: 0, z: 0 });
  assert.deepEqual(opened.physical.toe, { x: 1, z: 1 });
  assert.deepEqual(glyph(closed).slice(-2), [draw("M0 -100 L0 0 L10 0 L10 -100 Z"), { c: [0, -100, 1.6], role: "dot", fill: "solid" }]);
  assert.deepEqual(glyph(opened).at(-2), draw("M0 -100 L100 -100 L100 -90 L0 -90 Z"));
  assert.throws(() => physical({ ...flap, installation: "channel" }, "plan"), /wall-mounted/);
  assert.throws(() => physical(replace(flap, { downstreamLength: 1 }), "plan"), /extent/);
  assert.throws(() => physical({ ...flap, operatingPosition: { angle: -10 } }, "plan", "operating"), /Flap angle/);
});

test("butterfly requires a coherent circular-bore model and projects finite geometry through barrel rotation", () => {
  const butterfly = equipment("gate-butterfly", { ...p, bore: "circular", axis: "centred-transverse", boreDiameter: 1.2, discDiameter: 1.1 },
    { angle: 0 }, { angle: 90 });
  assert.deepEqual(glyph(physical(butterfly, "section")).at(-1), draw("M-5 -5 L-5 -115 L5 -115 L5 -5 Z"));
  assert.deepEqual(glyph(physical(butterfly, "section", "operating")).at(-1), draw("M-55 -65 L55 -65 L55 -55 L-55 -55 Z"));
  assert.deepEqual(glyph(physical(butterfly, "elevation", "operating"))[1], draw("M-55 -65 L55 -65 L55 -55 L-55 -55 Z"));
  assert.match(glyph(physical({ ...butterfly, designPosition: { angle: 45 } }, "plan", "design", { q: 1 }))[2].d, / A55 38.89 /);
  assert.throws(() => physical(equipment("gate-butterfly", p, { angle: 0 }), "section"), /explicit circular bore/);
  assert.throws(() => physical(replace(butterfly, { discDiameter: 1.2 }), "section"), /sweep exceeds/);
});

test("adjustable crest retains the supplied pocket and full-stroke embedment independent of the RL datum", () => {
  const low = physical(adjustable, "section"), high = physical(adjustable, "section", "operating");
  const pocket = { d: "M-200 0 L-20 0 L-20 80 L20 80 L20 0 L200 0", role: "secondary" };
  assert.deepEqual(glyph(low), [pocket, draw("M0 -40 L10 -40 L10 80 L0 80 Z")]);
  assert.deepEqual(glyph(high), [pocket, draw("M0 -100 L10 -100 L10 20 L0 20 Z")]);
  assert.ok(Math.abs(high.physical.embedment - 0.2) < 1e-12);
  const levels = { unit: "mm", datum: "Survey", invertRL: 10_000, upstream: 11_450, downstream: 10_100, crest: true };
  const annotated = physical(adjustable, "section", "operating", { x: 300, y: 200 }, { levels });
  assert.equal(annotated.shapes[2].d, "M100 55 L280 55");
  assert.ok(labels(annotated).includes("Crest RL +11000.000 mm (Survey)"));
  assert.deepEqual(annotated.physical, high.physical);
  assert.throws(() => physical(replace(adjustable, { minEmbedment: 0.21 }), "plan"), /embedment/);
  assert.throws(() => physical(replace(adjustable, { pocketWidth: 0.29 }), "section"), /pocket/);
  assert.throws(() => physical({ ...adjustable, operatingPosition: { crest: 1.01, unit: "m" } }, "section", "operating"), /Crest must be within/);
  assert.throws(() => physical(adjustable, "plan", "operating", {}, { levels }), /compatible section/);
});

test("fixed notch shapes use declared angle, width, side slope and pitch; the section cuts the centreline", () => {
  const fixed = (type, dims) => equipment(type, { ...p, crest: 0.5, notchDepth: 0.25, ...dims });
  const v = fixed("weir-v-notch", { angle: 90 });
  const r = fixed("weir-rectangular", { notchWidth: 0.5 });
  const t = fixed("weir-trapezoidal", { notchWidth: 0.5, sideSlope: 0.5 });
  const s = fixed("weir-serrated", { pitch: 0.5, count: 2 });
  assert.equal(physical(v, "elevation").metadata.type, "weir");
  assert.deepEqual(glyph(physical(v, "elevation")), [draw("M-75 -75 L-25 -75 L0 -50 L25 -75 L75 -75 L75 0 L-75 0 Z")]);
  assert.deepEqual(glyph(physical(r, "elevation")), [draw("M-75 -75 L-25 -75 L-25 -50 L25 -50 L25 -75 L75 -75 L75 0 L-75 0 Z")]);
  assert.deepEqual(glyph(physical(t, "elevation")), [draw("M-75 -75 L-37.5 -75 L-25 -50 L25 -50 L37.5 -75 L75 -75 L75 0 L-75 0 Z")]);
  assert.deepEqual(glyph(physical(s, "elevation")), [draw("M-75 -75 L-50 -75 L-25 -50 L0 -75 L25 -50 L50 -75 L75 -75 L75 0 L-75 0 Z")]);
  assert.deepEqual(glyph(physical(s, "section")).at(-1), draw("M0 -75 L10 -75 L10 0 L0 0 Z"));
  assert.deepEqual(glyph(physical(replace(s, { count: 3 }), "section")).at(-1), draw("M0 -50 L10 -50 L10 0 L0 0 Z"));
  const suppressed = replace(r, { notchWidth: 1.5 });
  assert.deepEqual(glyph(physical(suppressed, "elevation")), [draw("M-75 -50 L75 -50 L75 0 L-75 0 Z")]);
  assert.throws(() => physical(replace(r, { crest: 0 }), "section"), /dimension: crest/);
  assert.throws(() => physical(replace(t, { notchWidth: 1.5 }), "section"), /plate width/);
  assert.throws(() => physical(replace(v, { angle: 180 }), "elevation"), /included angle/);
  assert.throws(() => physical({ ...r, actuator: { type: "motor" } }, "elevation"), /no schematic actuator/);
});

test("short sectional level runs keep their RL and even serrations identify the off-section root", () => {
  const config = equipment("weir-serrated", { ...p, crest: 0.5, notchDepth: 0.25, pitch: 0.4, count: 2,
    upstreamLength: 0.12, downstreamLength: p.thickness });
  const levels = { unit: "mm", datum: "Site", invertRL: 1000, upstream: 1950, downstream: 1300, crest: true, precision: 0 };
  const section = physical(config, "section", "design", { x: 100, y: 150, s: 0.5 }, { levels });
  assert.deepEqual(section.shapes.slice(2).filter(({ d }) => d).map(({ d }) => d).filter((d) => !d.endsWith("Z")),
    ["M84 102.5 L94 102.5", "M112 135 L122 135", "M117 125 L182 125"]);
  assert.ok(labels(section).includes("Notch root RL +1500 mm (Site)"));
  assert.ok(labels(physical(config, "elevation", "design", {}, {
    levels: { ...levels, upstream: undefined, downstream: undefined },
  })).includes("Crest RL +1500 mm (Site)"));
});
