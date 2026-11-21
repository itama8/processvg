import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  byId, composePumpDocument, migratePumpVariant, place, placePoint, placeSymbol, pumpBoundary, pumpNetwork, SYMBOLS,
} from "../src/library.mjs";
import { normalizeEquipmentPath, round } from "../src/geometry.mjs";
import { render } from "../src/render.mjs";
import handoff from "../src/data/family-07-handoff.mjs";
import { submersible, topology } from "./fixtures/family-07-documents.mjs";

const archived = JSON.parse(readFileSync(new URL("./fixtures/family-07-source-snapshots.json", import.meta.url)));
const catalogue = JSON.parse(readFileSync(new URL("../drawings/symbols/catalogue.json", import.meta.url)));
const select = (symbolId, extra = {}) => ({ symbolId, id: symbolId + "-symbol", assetId: symbolId + "-asset", ...extra });
const document = (...instances) => ({ assets: [...new Set(instances.map(({ assetId }) => assetId))].map((assetId) => ({ assetId })), instances });
const pair = (blockId, portId) => ({ blockId, portId });

test("Family 07 publishes the 31 handoff IDs in order and exactly 32 legend cards", () => {
  const family = SYMBOLS.filter((record) => record.pump);
  assert.deepEqual(family.map(({ id }) => id), handoff.symbols.map(({ id }) => id));
  assert.equal(new Set(family.map(({ id }) => id)).size, 31);
  const published = catalogue.symbols.filter((record) => record.pump);
  assert.deepEqual(published.map(({ id }) => id), family.map(({ id }) => id));
  assert.deepEqual(published.find(({ id }) => id === "blower-lobe").pump, byId["blower-lobe"].pump);
  const legends = ["", "-2", "-3"].map((suffix) => readFileSync(new URL(
    `../drawings/symbols/legend-pumps-and-blowers${suffix}.svg`, import.meta.url), "utf8")).join("");
  assert.equal((legends.match(/<text [^>]+>(?!M<)/g) ?? []).length, 64);
  assert.match(legends, /Rotary lobe blower \(2-lobe\)/);
  assert.match(legends, /Rotary lobe blower \(3-lobe\)/);
  assert.equal(family.filter(({ pump }) => pump.group === "accessory").length, 5);
});

test("exact historical source geometry and port order survive all placement and persisted-document entry points", () => {
  const doc = document(...archived.map(({ id }) => select(id, { at: { x: 73, y: 31, q: 3, s: 1.7 } })));
  const loaded = composePumpDocument(doc);
  for (const [i, { id, ports, shapes }] of archived.entries()) {
    const record = catalogue.symbols.find((entry) => entry.id === id);
    assert.deepEqual(record.shapes, shapes);
    assert.deepEqual(record.ports, ports);
    assert.deepEqual(byId[id].draw({}), shapes);
    const archivedVariant = record.pump.archiveVariant;
    assert.deepEqual(record.pump.variants[archivedVariant].shapes, shapes);
    assert.equal(loaded.document.instances[i].variant, archivedVariant);
    assert.equal(loaded.blocks[i].metadata.assetId, doc.instances[i].assetId);
    for (let q = 0; q < 4; q++) {
      const at = { ...doc.instances[i].at, q };
      const original = place(shapes, at);
      const direct = placeSymbol(id, at);
      assert.deepEqual(direct.shapes, original);
      assert.equal(render(direct.shapes), render(original));
      assert.equal(render(direct.shapes, { profile: "print" }), render(original, { profile: "print" }));
      assert.deepEqual(direct.ports, ports.map((point) => placePoint(point, at).map(round)));
      assert.deepEqual(placeSymbol(id, at, { variant: archivedVariant }).shapes, original);
      if (q === 3) assert.deepEqual(loaded.blocks[i].shapes, original);
    }
  }
  const compact = placeSymbol("pump-centrifugal", {}, { intent: "create" });
  assert.deepEqual(compact.shapes, [{ c: [0, 0, 9] }, { d: "M0 -9 L14 -9" }]);
  assert.deepEqual(compact.ports, [[-9, 0], [14, -9]]);
  assert.deepEqual(placeSymbol("pump-centrifugal", {}, { variant: "volute" }).ports, compact.ports);
});

test("new defaults are serialized while existing or already-explicit choices persist", () => {
  const choices = [
    select("blower-lobe"), select("pump-pc"), select("pump-submersible"),
    select("blower-lobe", { id: "explicit", variant: "3-lobe" }),
    select("pump-centrifugal", { variant: "volute" }),
    select("pump-dosing"),
  ];
  const saved = document(...choices);
  const fresh = composePumpDocument(saved, { intent: "create" });
  assert.deepEqual(fresh.document.instances.map(({ variant }) => variant),
    ["2-lobe", "refined", "refined", "3-lobe", "volute", "legacy-assembly"]);
  assert.deepEqual(composePumpDocument(JSON.parse(JSON.stringify(fresh.document))).document, fresh.document);
  assert.deepEqual(composePumpDocument({ ...saved, version: 1 }).document.instances.map(({ variant }) => variant),
    ["legacy", "legacy", "legacy", "3-lobe", "volute", "legacy-assembly"]);
  assert.throws(() => composePumpDocument(document(select("blower-lobe", { variant: "4-lobe" }))), /variant/);
  assert.equal(choices[0].variant, undefined);
});

test("explicit migration reports moved and added ports by stable identity across transformed placements", () => {
  const item = select("pump-submersible", { at: { x: 100, y: 100, q: 1, s: 2 } });
  const migrated = migratePumpVariant(item, "refined");
  assert.deepEqual(migrated.instance, { ...item, variant: "refined" });
  assert.deepEqual(migrated.portMap, [{ portId: "discharge", before: [132, 124], after: [126, 148], reroute: true }]);
  assert.deepEqual(migrated.addedPorts, ["wet_well_intake", "power_cable"]);
  const lobe = migratePumpVariant(select("blower-lobe"), "3-lobe");
  assert.ok(lobe.portMap.every(({ reroute }) => !reroute));
  assert.deepEqual(migratePumpVariant(select("pump-centrifugal"), "volute").portMap.map((port) => port.reroute), [false, false]);
  const authored = {
    ...document(item),
    boundaries: [{ id: "outlet", kind: "liquid-process", direction: "in", medium: "effluent", point: [170, 165] }],
    connections: [{ id: "discharge-line", kind: "liquid-process", medium: "effluent",
      from: pair(item.id, "discharge"), to: pair("outlet", "tie"), via: [[165, 151]] }],
  };
  assert.deepEqual(composePumpDocument(authored).network.edges[0].points, [[132, 124], [165, 151], [170, 165]]);
  const after = composePumpDocument({ ...authored, instances: [migrated.instance] });
  assert.deepEqual(after.network.edges[0].points, [[126, 148], [165, 151], [170, 165]]);
  assert.equal(after.schedule[0].assetId, item.assetId);
});

test("lobe variants share the approved casing and gas ports but have independent closed profiles", () => {
  const lobe = byId["blower-lobe"].pump;
  assert.deepEqual(Object.keys(lobe.variants).sort(), ["2-lobe", "3-lobe", "legacy"]);
  const two = placeSymbol("blower-lobe", {}, { variant: "2-lobe" });
  const three = placeSymbol("blower-lobe", {}, { variant: "3-lobe" });
  assert.deepEqual(two.shapes[0], three.shapes[0]);
  assert.notDeepEqual(two.shapes.slice(1), three.shapes.slice(1));
  for (const motif of [two, three]) {
    assert.equal(motif.shapes.length, 3);
    assert.ok(motif.shapes.slice(1).every(({ d }) => d.endsWith(" Z")));
    assert.deepEqual(motif.interfaces.filter(({ kind }) => kind === "gas-process").map(({ point, direction }) => [point, direction]),
      [[[-16, 0], "in"], [[16, 0], "out"]]);
  }
});

test("equipment path commands transform both controls and endpoints, with smooth quadratic reflection", () => {
  const d = normalizeEquipmentPath("M3 2 H5 V6 Q6 8 8 7 T10 6 C11 5 12 4 13 3 Z M1 2 T3 4");
  assert.equal(d, "M3 2 L5 2 L5 6 Q6 8 8 7 Q10 6 10 6 C11 5 12 4 13 3 Z M1 2 Q1 2 3 4");
  assert.equal(place([{ d }], { x: 20, y: 30, q: 1, s: 2 })[0].d,
    "M16 36 L16 40 L8 40 Q4 42 6 46 Q8 50 8 50 C10 52 12 54 14 56 Z M16 32 Q16 32 12 36");
  assert.throws(() => normalizeEquipmentPath("M1 2 l5 5"), /Unsupported/);
  assert.throws(() => normalizeEquipmentPath("M1 2 A1 2 60 1 1 3 4"), /Unsupported/);
  const smooth = placeSymbol("pump-pc", {}, { variant: "refined" });
  assert.match(render(smooth.shapes), /opacity="1".*\n.*\n<path d="M-11 0 Q/s);
  const drive = placeSymbol("drive-vfd", { q: 1, s: 2 });
  const [glyph] = drive.shapes.filter(({ identityInk }) => identityInk);
  assert.equal(glyph.identityInk, "VFD");
  assert.ok(Math.abs((glyph.bounds[0] + glyph.bounds[2]) / 2 + 7) < 0.0001);
  assert.match(render(drive.shapes), /data-processvg-identity/);
});

test("compact submersible hides intake and power on P&ID and preserves their typed physical interfaces", () => {
  const { document: stored, blocks, schedule } = composePumpDocument(submersible, { intent: "create" });
  const [pump] = blocks;
  assert.equal(pump.shapes.length, 3);
  assert.deepEqual(pump.ports, [[92, 93.5]]);
  assert.deepEqual(pump.interfaces.map(({ id, kind, visible }) => [id, kind, visible]), [
    ["wet_well_intake", "liquid-environment", false], ["discharge", "liquid-process", true],
    ["power_cable", "electrical-power", false],
  ]);
  for (const view of ["plan", "section", "electrical"]) {
    const output = composePumpDocument(stored, { view });
    const [block] = output.blocks;
    assert.equal(block.metadata.assetId, "P-701");
    assert.equal(block.metadata.id, "P-701-symbol");
    assert.equal(block.status, "illustrative");
    assert.equal(block.unit, "mm");
    assert.ok(block.shapes.some(({ t }) => t?.[2] === "Illustrative dimensions"));
    assert.deepEqual(output.schedule, schedule);
    assert.ok(block.shapes.some(({ t }) => t?.[2] === "1200 mm"));
    assert.equal(block.interfaces.find(({ id }) => id === "power_cable").kind, "electrical-power");
    assert.equal(block.interfaces.some(({ id }) => id === "wet_well_intake"), view !== "electrical");
  }
  const dimensioned = structuredClone(stored);
  dimensioned.assets[0].physical.basis = "dimensioned";
  assert.equal(composePumpDocument(dimensioned, { view: "section" }).blocks[0].status, "dimensioned");
  delete dimensioned.assets[0].physical.source;
  assert.throws(() => composePumpDocument(dimensioned, { view: "plan" }), /dimension basis/);
  delete dimensioned.assets[0].physical;
  const [unmeasured] = composePumpDocument(dimensioned, { view: "plan" }).blocks;
  assert.equal(unmeasured.status, "illustrative");
  assert.equal(unmeasured.shapes[0].t[2], "Dimensions unavailable");
  assert.equal(unmeasured.shapes.length, 1);
});

test("standby can run and its two speeds, identity and procurement stay independent of schematic ink", () => {
  const original = composePumpDocument(submersible, { intent: "create" });
  const modifiedInput = structuredClone(original.document);
  modifiedInput.assets[0].role = "duty";
  modifiedInput.assets[0].state = "fault";
  const modified = composePumpDocument(modifiedInput);
  assert.deepEqual(modified.blocks[0].shapes, original.blocks[0].shapes);
  assert.equal(original.schedule[0].actualRpm, 1280);
  assert.equal(original.schedule[0].setpointRpm, 1450);
  assert.equal(modified.schedule[0].role, "duty");
  assert.equal(modified.schedule[0].state, "fault");
  assert.equal(modified.schedule[0].speedControl, "VFD");
  const motor = select("drive-integral-motor", { assetId: "P-701", attachment: { parentId: "P-701-symbol", integral: true } });
  const packaged = composePumpDocument({ ...original.document, instances: [...original.document.instances, motor] });
  assert.equal(packaged.schedule.length, 1);
  assert.deepEqual(packaged.schedule[0].symbolIds, ["P-701-symbol", motor.id]);
  assert.throws(() => composePumpDocument({ ...packaged.document, instances: [motor] }), /parent asset ID/);
  assert.equal(composePumpDocument(topology).schedule.length, 6);
});

test("specialty terminals and drive/accessory networks reject cross-domain or incompatible joins", () => {
  const system = composePumpDocument(topology, { intent: "create" });
  const { edges } = system.network;
  assert.equal(edges.length, 9);
  const pump = (id) => system.blocks.find(({ metadata }) => metadata.id === id);
  assert.deepEqual(pump("airlift").interfaces.map(({ id, kind, direction, visible }) => [id, kind, direction, visible]), [
    ["liquid_intake", "liquid-environment", "in", true], ["air_injection", "gas-process", "in", true],
    ["mixed_discharge", "two-phase-process", "out", true],
  ]);
  assert.ok(pump("eductor").interfaces.every(({ kind, visible }) => visible && kind === "gas-process"));
  assert.ok(pump("vfd").interfaces.every(({ kind }) => ["electrical-power", "control-signal"].includes(kind)));
  for (const id of ["drive-gearbox", "drive-coupling"]) {
    assert.ok(placeSymbol(id).interfaces.every(({ kind }) => kind === "mechanical-drive"));
  }
  assert.equal(pump("dampener").interfaces.length, 1);
  const badDoc = (alter) => {
    const input = structuredClone(topology);
    alter(input);
    return () => composePumpDocument(input, { intent: "create" });
  };
  assert.throws(badDoc((value) => { value.connections[0].from = pair("vfd", "electric_out"); }), /Incompatible/);
  assert.throws(badDoc((value) => { value.connections[6].medium = "water"; }), /Incompatible/);
  assert.throws(badDoc((value) => { value.boundaries[0].terminal = "boundary"; }), /explicit process branch/);
  assert.throws(badDoc((value) => { value.connections.push({ ...value.connections[8], id: "duplicate-outlet" }); }), /explicit tie-in/);
  assert.throws(badDoc((value) => { value.connections[4].from = pair("eductor", "motive_fluid"); }), /Incompatible/);
  assert.throws(badDoc((value) => { value.instances[5].portKinds.suction = "mechanical-drive"; }), /Cannot configure/);
  const [powerPump] = composePumpDocument(submersible, { intent: "create" }).blocks;
  const supply = pumpBoundary({ id: "supply", kind: "electrical-power", direction: "out", point: [30, 20] });
  const cable = { id: "cable", kind: "electrical-power", from: pair("supply", "tie"), to: pair("P-701-symbol", "power_cable") };
  assert.throws(() => pumpNetwork([powerPump, supply], [cable]), /Incompatible/);
  assert.equal(pumpNetwork([powerPump, supply], [{ ...cable, layer: "topology" }]).edges[0].layer, "topology");
});

test("extension bellows support gas or liquid while maintaining one through service", () => {
  const bellows = placeSymbol("accessory-expansion-bellows");
  for (const kind of ["gas-process", "liquid-process"]) {
    const medium = kind === "gas-process" ? "air" : "water";
    const start = pumpBoundary({ id: "upstream", kind, direction: "out", point: [-30, 0], medium });
    const end = pumpBoundary({ id: "downstream", kind, direction: "in", point: [30, 0], medium });
    const route = [
      { id: "entry", kind, medium, from: pair("upstream", "tie"), to: pair("accessory-expansion-bellows", "end_a") },
      { id: "exit", kind, medium, from: pair("accessory-expansion-bellows", "end_b"), to: pair("downstream", "tie") },
    ];
    assert.deepEqual(pumpNetwork([bellows, start, end], route).edges.map(({ points }) => points),
      [[[-30, 0], [-24, 0]], [[24, 0], [30, 0]]]);
    delete end.interfaces[0].medium;
    assert.throws(() => pumpNetwork([bellows, start, end], [route[0], { ...route[1], medium: "other" }]), /same process kind and medium/);
  }
});
