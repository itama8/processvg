import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { byId, composeActuator, composeValve, placeOperatingValve, placePoint, placeSymbol } from "../src/library.mjs";
import { routeLine } from "../src/lines.mjs";
import { render } from "../src/render.mjs";

const mount = { point: [0, -10], normal: [0, -1] };
const modifier = "modifier-spring-return";
const configurations = ["hand-t", "handwheel", "lever", "gearbox", "motor", "solenoid", "diaphragm", "pneumatic-cylinder", "hydraulic-cylinder", "float"];
const rotations = [0, 1, 2, 3];
const catalogue = JSON.parse(readFileSync(new URL("../drawings/symbols/catalogue.json", import.meta.url)));
const geometry = ({ shapes }) => shapes.filter(({ t }) => !t);
const labels = ({ shapes }) => shapes.filter(({ t }) => t).map(({ t }) => t[2]);
const cylinder = (fluid) => `operator-${fluid}-cylinder`;

test("catalogue and normal placement keep ten head identities and modifier attachments portless", () => {
  assert.deepEqual(catalogue.symbols.filter(({ operator }) => operator).map(({ id }) => id), configurations.map((name) => `operator-${name}`));
  for (const name of configurations) {
    const id = `operator-${name}`;
    const head = placeSymbol(id, { x: 31, y: 14, q: 3, s: 1.25 });
    assert.deepEqual(head.anchors.head, { point: [31, 14], normal: [-1, 0] });
    assert.deepEqual(head.processPorts, []);
    assert.deepEqual(head.ports, []);
    assert.deepEqual(geometry(head).length, byId[id].draw({}).filter(({ t }) => !t).length);
  }
  const spring = placeSymbol(modifier, { x: 20, y: 40, q: 1, s: 2 });
  assert.deepEqual(spring.anchors.attachments, [[20, 40], [20, 78]]);
  assert.deepEqual(spring.processPorts, []);
  assert.throws(() => composeActuator(mount, { headId: "act-motor" }), /head/);
  assert.throws(() => composeActuator(mount, { headId: modifier }), /head/);
});

test("handwheel arcs exchange unequal radii and preserve sweep through all turns", () => {
  const arcs = [
    "M-8 0 A8 3 0 0 1 8 0 A8 3 0 0 1 -8 0 Z",
    "M0 -8 A3 8 0 0 1 0 8 A3 8 0 0 1 0 -8 Z",
    "M8 0 A8 3 0 0 1 -8 0 A8 3 0 0 1 8 0 Z",
    "M0 8 A3 8 0 0 1 0 -8 A3 8 0 0 1 0 8 Z",
  ];
  for (const q of [...rotations, -1, 5]) {
    const index = (q % 4 + 4) % 4;
    const head = placeSymbol("operator-handwheel", { q });
    assert.equal(head.shapes[0].d, arcs[index]);
    assert.equal(head.bounds.right, index % 2 ? 4 : 9);
    assert.equal(head.bounds.bottom, index % 2 ? 9 : 4);
    assert.match(placeSymbol("operator-diaphragm", { q }).shapes[0].d, /A7 7 0 0 1/);
  }
});

test("shared cylinder geometry, measured upright identification and small-size fallback", () => {
  const metrics = (text, font, align) => {
    assert.equal(font.size, 10);
    assert.equal(align, "middle");
    return { left: 3, right: 2, ascent: 7, descent: 0 };
  };
  for (const q of rotations) {
    const at = { x: 45, y: 50, q, s: 1.25 };
    const p = cylinder("pneumatic"), h = cylinder("hydraulic");
    assert.deepEqual(geometry(placeSymbol(p, at)), geometry(placeSymbol(h, at)));
    assert.deepEqual(placeSymbol(p, at, { identifier: "omit" }).shapes, placeSymbol(h, at, { identifier: "omit" }).shapes);
    for (const [id, letter, y] of [[p, "P", -9.5], [h, "H", -9.5], ["operator-gearbox", "G", -5],
      ["operator-motor", "M", -7], ["operator-solenoid", "S", -6]]) {
      const head = placeSymbol(id, at, { measureText: metrics });
      const text = head.shapes.at(-1);
      assert.deepEqual(text.t, [...placePoint([0, y], at), letter]);
      assert.equal(text.dx, 0.5);
      assert.equal(text.dy, 3.5);
      assert.deepEqual(head.identifierBounds, { left: text.t[0] - 2.5, right: text.t[0] + 2.5,
        top: text.t[1] - 3.5, bottom: text.t[1] + 3.5 });
      assert.doesNotMatch(render(head.shapes), /rotate\(/);
      const small = placeSymbol(id, at, { renderScale: 0.62 });
      assert.equal(small.externalIdentifier, `${byId[id].name} (${letter})`);
      assert.equal(small.shapes.at(-1).t[2], small.externalIdentifier);
    }
  }
  assert.equal(placeSymbol(cylinder("pneumatic"), {}, { measureText: () =>
    ({ left: 8, right: 8, ascent: 9, descent: 1 }) }).externalIdentifier, "Pneumatic cylinder (P)");
  assert.throws(() => placeSymbol(cylinder("pneumatic"), {}, { measureText: () => ({}) }), /text bounds/);
});

test("legacy assemblies retain their stem endpoints and share the typed valve routing", () => {
  const defaults = { "act-hand": 10, "act-motor": 9, "act-solenoid": 8, "act-diaphragm": 10, "valve-control": 10, "valve-float-operated": 9 };
  for (const [id, stemLength] of Object.entries(defaults)) {
    const legacy = byId[id].draw({});
    for (const q of rotations) {
      const at = { x: 40, y: 30, q };
      const placed = placeSymbol(id, at);
      assert.equal(placed.metadata.id, id);
      assert.equal(placed.metadata.actuator.stemLength, stemLength);
      assert.deepEqual(placed.metadata.stem, [placePoint([0, 0], at), placePoint([0, -stemLength], at)]);
      assert.deepEqual(placed.ports, [[-8, 0], [8, 0]].map((p) => placePoint(p, at)));
      assert.deepEqual(placed.processPorts.map(({ kind }) => kind), ["process", "process"]);
      assert.equal(placed.shapes.length, legacy.length);
    }
  }
  assert.equal(placeSymbol("valve-control").metadata.valveFunction, "modulating");
  assert.equal(placeSymbol("valve-control").metadata.actuator.mechanism, "diaphragm");
  assert.equal(placeSymbol("valve-float-operated").metadata.actuator.headId, "operator-float");
});

test("equipment layouts respect head clearance and keep pipe and mechanical coordinates independent", () => {
  for (const headId of ["operator-hand-t", "operator-handwheel"]) {
    for (const stemLength of [0, 8, 16]) {
      const result = composeValve({ bodyId: "valve-gate", actuator: { headId, stemLength } });
      assert.equal(result.metadata.actuator.stemLength, stemLength);
      assert.ok(result.anchors.head.point[1] <= (headId.endsWith("wheel") ? -9 : -6));
      assert.ok(result.metadata.actuator.mountedReach >= stemLength);
    }
  }
  // A flush-mounted cylinder can meet the top silhouette of the existing gate.
  const gate = placeSymbol("gate-slide");
  const flush = composeActuator(mount, { headId: cylinder("hydraulic"), stemLength: 0 });
  assert.deepEqual(flush.anchors.mount, flush.anchors.head);
  assert.equal(geometry(flush).length, 1);
  assert.deepEqual(gate.ports, [[-2.5, 0], [2.5, 0]]);
  const side = composeActuator({ point: [3, 0], normal: [1, 0], clearance: 2 },
    { headId: "operator-hand-t", stemLength: 0 }, { x: 10, y: 20, q: 1, s: 2 });
  assert.deepEqual(side.anchors.mount, { point: [10, 26], normal: [0, 1] });
  assert.deepEqual(side.anchors.head, { point: [10, 31], normal: [0, 1] });
  const config = { bodyId: "valve-knife", endConnections: { in: { type: "flanged" } } };
  for (const q of rotations) {
    const at = { x: 125, y: 110, s: 1.5, q };
    const valve = composeValve(config, at);
    const mounted = composeValve({ ...config, actuator: { headId: cylinder("hydraulic"), stemLength: 12, headOrientation: "upright" } }, at);
    assert.deepEqual(mounted.processPorts, valve.processPorts);
    assert.deepEqual(mounted.anchors.mount, valve.anchors.mount);
    assert.deepEqual(mounted.anchors.head.normal, [0, -1]);
    const { stem } = mounted.metadata;
    assert.deepEqual(stem.at(-1), mounted.anchors.head.point);
    assert.equal(stem.at(-1)[0], stem.at(-2)[0]);
    assert.ok(stem.at(-1)[1] < stem.at(-2)[1]);
    for (const port of mounted.processPorts) {
      const next = port.point.map((v, i) => v + port.normal[i] * 15);
      assert.equal(routeLine("line-process", [port.point, next]).shapes[0].d, `M${port.point.join(" ")} L${next.join(" ")}`);
    }
  }
  assert.throws(() => composeActuator(mount, { headId: "operator-motor", stemLength: -1 }), /nonnegative/);
  assert.throws(() => composeActuator({ ...mount, normal: [1, 1] }, { headId: "operator-motor" }), /cardinal/);
});

test("upright stem jogs leave room for the host stroke at nominal and reduced display scales", () => {
  for (const renderScale of [1, 0.65]) {
    for (const q of [1, 2, 3]) {
      for (const headId of ["operator-lever", "operator-float", cylinder("pneumatic")]) {
        const result = composeActuator({ ...mount, clearance: 2 },
          { headId, headOrientation: "upright", stemLength: 0 }, { q, s: 0.62 }, { renderScale });
        const [origin, turn] = result.stem;
        const [nx, ny] = result.anchors.mount.normal;
        const reach = (turn[0] - origin[0]) * nx + (turn[1] - origin[1]) * ny;
        assert.ok((reach - 2 * 0.62) * renderScale >= 1.99, `${headId} at turn ${q}`);
        assert.deepEqual(result.stem.at(-1), result.anchors.head.point);
      }
    }
  }
  const sideways = composeActuator(mount,
    { headId: "operator-lever", headOrientation: "upright", stemLength: 0 }, { q: 1 });
  assert.deepEqual(sideways.stem.slice(0, 2), [[10, 0], [12, 0]]);
});

test("spring and command metadata remain independent of valve states and failure events", () => {
  const actuator = { headId: cylinder("pneumatic"), motion: "linear", controlMode: "on-off" };
  const config = { bodyId: "valve-gate", normalPosition: "open", operatingPosition: { position: "closed", openingPercent: 0 }, actuator };
  const plain = composeValve(config);
  const sprung = composeValve({ ...config, actuator: { ...actuator, modifiers: [modifier] } });
  assert.deepEqual(sprung.processPorts, plain.processPorts);
  assert.deepEqual(sprung.metadata.stem, plain.metadata.stem);
  assert.deepEqual(geometry(sprung).slice(0, -1), geometry(plain));
  assert.deepEqual(labels(sprung), labels(plain));
  assert.equal(geometry(sprung).at(-1).role, "secondary");
  assert.equal(sprung.metadata.failPosition, null);
  assert.equal(sprung.metadata.actuator.springReturn, true);
  assert.equal(sprung.metadata.actuator.energySource, "pneumatic");
  assert.equal(sprung.metadata.actuator.motion, "linear");
  assert.equal(sprung.metadata.actuator.controlMode, "on-off");
  assert.match(render(sprung.shapes), /"secondary" opacity="0.32"/);
  assert.match(render(sprung.shapes, { profile: "print" }), /"secondary" opacity="1"/);
  for (const [failPosition, annotation] of [["open", "Fail open (FO)"], ["closed", "Fail closed (FC)"], ["last", "Fail last (FLP)"], ["unknown", "Fail position unknown"]]) {
    const state = { ...config, failPosition, failEvent: "loss of control signal" };
    const design = composeValve(state);
    const live = placeOperatingValve(state);
    assert.equal(design.metadata.closedDisplay, null);
    assert.equal(live.metadata.closedDisplay, "filled");
    assert.ok(labels(design).includes(annotation + " on loss of control signal"));
    assert.ok(labels(live).includes(annotation + " on loss of control signal"));
  }
  const na = composeValve({ ...config, failPosition: "not-applicable" });
  assert.deepEqual(labels(na), labels(plain));
  assert.equal(na.metadata.failPosition, "not-applicable");
  assert.throws(() => composeValve({ ...config, failPosition: "not-applicable", failEvent: "loss of air" }), /failure event/);
  assert.throws(() => composeActuator(mount, { ...actuator, modifiers: [modifier, modifier] }), /duplicate/);
  assert.equal(composeActuator(mount, { headId: "operator-gearbox" }).metadata.energySource, null);
  assert.equal(composeActuator(mount, { headId: "operator-diaphragm" }).metadata.energySource, null);
});
