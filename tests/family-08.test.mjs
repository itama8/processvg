import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import handoff from "../src/data/family-08-handoff.mjs";
import { normalizeEquipmentPath, round } from "../src/geometry.mjs";
import { byId, composeScreeningDocument, migrateScreeningVariant, placePoint, placeSymbol, screeningNetwork,
  screeningTieIn, SCREENING_ARCHIVE_IDS, SCREENING_CANDIDATES } from "../src/library.mjs";
import { render } from "../src/render.mjs";
import { inletWorksFixture } from "./fixtures/family-08-inlet.mjs";
import { physicalFixtures } from "./fixtures/family-08-physical.mjs";

const archive = JSON.parse(readFileSync(new URL("./fixtures/family-08-source-snapshots.json", import.meta.url)));
const candidate = (id, at = {}, options = {}) => placeSymbol(id, at, { variant: "candidate", ...options });
const pair = (id, kind, direction, point = [0, 0]) => screeningTieIn({ id, kind, point, ports: [{ id: "tie", direction }] });
const ref = (blockId, portId = "tie") => ({ blockId, portId });
const edge = (kind, from, to, id = "route") => ({ id, kind, from, to });

test("all 21 handoff IDs are opt-in and the 8 base source definitions and placements stay exact", () => {
  assert.equal(Object.keys(SCREENING_CANDIDATES).length, 21);
  assert.equal(new Set(handoff.symbols.map(({ id }) => id)).size, 21);
  assert.deepEqual(SCREENING_ARCHIVE_IDS, Object.keys(archive));
  for (const { id, variants } of handoff.symbols) {
    const result = candidate(id);
    assert.match(result.metadata.verification, /Provisional.*pending/);
    assert.ok(result.shapes.length > 0);
    if (!variants) {
      assert.equal(Object.hasOwn(byId, id), false);
      assert.throws(() => placeSymbol(id), /explicit variant/);
      continue;
    }
    const { shapes, ports, placements } = archive[id];
    assert.deepEqual(byId[id].ports, ports);
    assert.deepEqual(byId[id].draw({}), shapes);
    const migrate = migrateScreeningVariant({ symbolId: id, id: "inst-1", assetId: "asset-1" }, "candidate");
    assert.deepEqual(migrate.legacyPorts.map(({ point }) => point), ports);
    assert.equal(migrate.requiresConnectionReview, true);
    assert.equal(migrate.instance.assetId, "asset-1");
    assert.throws(() => migrateScreeningVariant({ symbolId: id }), /explicit candidate/);
    assert.deepEqual(placeSymbol(id, {}, { variant: "legacy" }).shapes, placeSymbol(id).shapes);
    for (const q of [0, 1, 2, 3]) {
      assert.deepEqual(JSON.parse(JSON.stringify(placeSymbol(id, { x: 32, y: 61, q, s: 1.35 }))), placements[q]);
    }
    // The handoff uses shorthand and different subpath grouping. Compare line commands and roles.
    const flatten = (paths) => paths.flatMap(normalizeEquipmentPath).join(" ").split(/ (?=M)/).filter(Boolean);
    const supplied = variants.legacy;
    for (const role of ["primary", "secondary"]) {
      const expected = flatten(role === "primary" ? supplied.paths : supplied.secondaryPaths);
      const observed = flatten(shapes.filter(({ d, role: r = "primary" }) => d && r === role).map(({ d }) => d));
      if (id === "grit-separator" && role === "primary") {
        // The archived base has an explicit closing L, the handoff specifies a Z.
        expected[0] = expected[0].replace(/ Z$/, " L-8 -12");
      }
      assert.deepEqual(observed.sort(), expected.sort(), id + " " + role);
    }
    assert.deepEqual(shapes.filter(({ c }) => c).map(({ c }) => c), supplied.circles);
    assert.deepEqual(shapes.filter(({ c }) => c).map(({ role = "primary" }) => role),
      supplied.circleRoles ?? supplied.circles.map(() => "primary"));
  }
});

test("quarter turns and scales carry typed anchors and keep full-ink drive identity upright", () => {
  for (const id of Object.keys(SCREENING_CANDIDATES)) {
    const local = candidate(id);
    for (const s of [0.95, 1.75, 3.5]) {
      for (const q of [0, 1, 2, 3, -1]) {
        const at = { x: 51.5, y: 63, s, q };
        const placed = candidate(id, at);
        assert.deepEqual(placed.interfaces.map(({ point }) => point),
          local.interfaces.map(({ anchor }) => placePoint(anchor, at).map(round)));
        assert.deepEqual(placed.ports, placed.processInterfaces.map(({ point }) => point));
        assert.ok(placed.shapes.every(({ role }) => role === undefined || role === "primary"));
        const identity = local.shapes.find(({ identityInk }) => identityInk);
        if (identity) {
          const set = (value) => [value.bounds[2] - value.bounds[0], value.bounds[3] - value.bounds[1]];
          assert.deepEqual(set(placed.shapes.find(({ identityInk }) => identityInk)).map(round), set(identity).map((n) => round(n * s)));
          assert.match(render(placed.shapes), /opacity="1">\n<g data-processvg-identity/);
        }
      }
    }
  }
  for (const id of ["screen-bar", "screen-fine", "screen-step", "screen-perforated", "screen-drum", "screen-band", "screen-grinder", "mixer"]) {
    assert.equal(candidate(id).metadata.drive, "integral-motor");
    assert.equal(candidate(id).shapes.filter(({ identityInk }) => identityInk === "M").length, 1);
  }
  assert.equal(candidate("screen-manual").metadata.drive, "manual-rake");
  assert.equal(candidate("screen-manual").shapes.some(({ identityInk }) => identityInk), false);
  assert.equal(candidate("screen-perforated").shapes.filter(({ c }) => c?.[2] === 1.1).length, 9);
  assert.equal(candidate("mixer").processInterfaces.length, 0);
  assert.equal(candidate("mixer").mounts.length, 1);
  assert.equal(candidate("mixer-static").metadata.drive, undefined);
});

test("media, flow direction, receiving-only bins and grinder behavior stay independent", () => {
  const ports = (id) => candidate(id).processInterfaces.map(({ kind, direction }) => [kind, direction]);
  assert.deepEqual(ports("screen-grinder"), [["wastewater", "in"], ["wastewater", "out"]]);
  assert.deepEqual(ports("grit-bin"), [["washed-grit", "in"]]);
  assert.deepEqual(ports("container"), [["screenings-solids", "in"]]);
  assert.deepEqual(ports("screenings-chute"), [["screenings-solids", "in"], ["screenings-solids", "out"]]);
  assert.deepEqual(ports("screen-washer-compactor"), [
    ["screenings-solids", "in"], ["screenings-solids", "out"], ["wash-water", "in"], ["return-liquor", "out"]]);
  assert.deepEqual(ports("grit-washer"), [
    ["grit-slurry", "in"], ["washed-grit", "out"], ["wash-water", "in"], ["return-liquor", "out"]]);
  assert.deepEqual(candidate("conveyor-screw", {}, { reverse: true }).processInterfaces.map(({ direction }) => direction), ["out", "in"]);
  assert.throws(() => candidate("grit-bin", {}, { reverse: true }));
  const grinder = candidate("screen-grinder");
  const raw = pair("raw", "wastewater", "out");
  const valid = edge("wastewater", ref("raw"), ref("screen-grinder", "sewage_in"));
  assert.equal(screeningNetwork([raw, grinder], [valid]).edges.length, 1);
  assert.throws(() => screeningNetwork([raw, grinder], [{ ...valid, kind: "screenings-solids" }]), /Incompatible/);
  assert.throws(() => screeningNetwork([raw, grinder], [{ ...valid, from: valid.to, to: valid.from }]), /Incompatible/);
  assert.throws(() => screeningNetwork([raw, grinder], [valid, { ...valid, id: "again" }]), /in use/);
  assert.throws(() => screeningTieIn({ id: "join", kind: "washed-grit", point: [3, 2],
    ports: [{ id: "a", direction: "in" }, { id: "b", direction: "out" }] }), /junction/);
  const mixer = candidate("mixer-static");
  const output = pair("out", "return-liquor", "in");
  assert.throws(() => screeningNetwork([raw, mixer, output], [
    edge("wastewater", ref("raw"), ref("mixer-static", "liquid_in")),
    edge("return-liquor", ref("mixer-static", "liquid_out"), ref("out"), "out"),
  ]), /same liquid stream/);
});

test("four different grit mechanisms have mechanism-specific geometry and interfaces", () => {
  const ids = ["grit-separator", "grit-vortex", "grit-aerated", "grit-horizontal"];
  const types = ids.map((id) => candidate(id));
  assert.equal(new Set(types.map(({ shapes }) => JSON.stringify(shapes))).size, 4);
  assert.deepEqual(types.map(({ metadata }) => metadata.mechanism), ["hydrocyclone", "open-vortex", "aerated-chamber", "horizontal-flow"]);
  assert.deepEqual(types.map(({ ports }) => ports.length), [3, 3, 4, 3]);
  assert.deepEqual(types.flatMap(({ processInterfaces }) => processInterfaces.filter(({ kind }) => kind === "gas-process"))
    .map(({ id, direction }) => [id, direction]), [["air_supply", "in"]]);
  assert.deepEqual(types[1].shapes.find(({ c }) => c).c, [0, 0, 17]);
  assert.equal(types[1].shapes[0].d, "M-25 -17 L0 -17");
});

test("each asset survives all views with supplied dimensions and separate physical features", () => {
  const viewNames = ["schematic", "plan", "section", "elevation"];
  const assets = Object.keys(SCREENING_CANDIDATES).map((symbolId) => ({ assetId: "A-" + symbolId, symbolId,
    variant: "candidate", physical: physicalFixtures[symbolId], views: Object.fromEntries(viewNames.map((view) => [view, { q: 1 }])) }));
  for (const view of viewNames) {
    const { blocks, schedule, network } = composeScreeningDocument({ assets }, { view });
    assert.deepEqual(blocks.map(({ metadata }) => metadata.assetId), schedule.map(({ assetId }) => assetId));
    assert.equal(schedule.length, 21);
    if (view === "schematic") continue;
    assert.equal(network, undefined);
    for (const [index, result] of blocks.entries()) {
      const input = assets[index].physical;
      assert.equal(result.metadata.orientation, 90);
      assert.equal(result.physicalBasis.source, input.source);
      assert.equal(result.physicalBasis.datum, input.datum);
      assert.deepEqual(result.dimensions.map(({ value }) => value), input.projections[view].dimensions.map(
        ({ from, to }, axis) => Number((to[axis] - from[axis]).toPrecision(12))));
      assert.equal(result.ports.length, 0);
    }
  }
  assert.throws(() => candidate("screen-bar", {}, { view: "section" }), /requires source/);
  const input = structuredClone(physicalFixtures["grit-vortex"]);
  const base = candidate("grit-vortex", {}, { view: "plan", physical: input });
  input.unit = "mm";
  const plan = input.projections.plan;
  for (const feature of plan.features) {
    if (feature.circle) {
      feature.circle.center = feature.circle.center.map((n) => 1000 * n);
      feature.circle.radius *= 1000;
    } else feature.points = feature.points.map((point) => point.map((n) => 1000 * n));
  }
  for (const dim of plan.dimensions) {
    dim.from = dim.from.map((n) => 1000 * n);
    dim.to = dim.to.map((n) => 1000 * n);
    dim.offset *= 1000;
  }
  const mm = candidate("grit-vortex", {}, { view: "plan", physical: input });
  assert.deepEqual(mm.shapes.filter(({ t }) => !t), base.shapes.filter(({ t }) => !t));
  assert.equal(mm.dimensions[0].value, 4800);
  plan.dimensions[0].to[1] = 0;
  assert.throws(() => candidate("grit-vortex", {}, { view: "plan", physical: input }), /dimension witnesses/);
  assert.throws(() => composeScreeningDocument({ assets: [assets[0], assets[0]] }), /Duplicate/);
});

test("inlet works exercises parallel gated routes, closed bypass, isolated controls and four wash/return tie-ins", () => {
  const { network, schedule, control, controls, gates } = inletWorksFixture();
  const edges = network.edges;
  assert.deepEqual(gates.map(({ metadata }) => metadata.position), ["open", "open", "closed"]);
  assert.deepEqual(edges.filter(({ from }) => from.blockId === "Split").map(({ from }) => from.portId), ["primary", "parallel", "bypass"]);
  assert.equal(edges.filter(({ to }) => to.blockId === "Join").length, 3);
  assert.deepEqual(edges.filter(({ kind }) => kind === "wash-water" || kind === "return-liquor").map(({ kind }) => kind),
    ["wash-water", "return-liquor", "wash-water", "return-liquor"]);
  assert.equal(edges.find(({ kind }) => kind === "grit-slurry").to.blockId, "GW-101");
  assert.equal(edges.find(({ kind }) => kind === "washed-grit").to.blockId, "GB-101");
  assert.equal(schedule.filter(({ drive }) => drive === "integral-motor").length, 1);
  assert.equal(schedule.filter(({ assetId }) => assetId === controls.equipmentId).length, 1);
  assert.deepEqual(control.edges.map(({ kind }) => kind), ["digital-data", "digital-data"]);
  assert.ok(edges.every(({ from, to }) => ![from.blockId, to.blockId].includes(controls.differential)));
});
