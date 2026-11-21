import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { composeEquipment, composePumpDocument, composeStructure, createStructureModel, placeSymbol } from "../src/library.mjs";
import { routeLine } from "../src/lines.mjs";
import { render, ROLES, svgDoc } from "../src/render.mjs";
import { standard } from "../vendor/plotter/assets/foundation/index.mjs";
import { screeningPhysical } from "../src/screening-physical.mjs";
import { submersible } from "./fixtures/family-07-documents.mjs";
import { physicalFixtures } from "./fixtures/family-08-physical.mjs";

const root = new URL("..", import.meta.url).pathname;
const run = (script, svg, ...flags) => {
  const dir = mkdtempSync(join(tmpdir(), "processvg-check-"));
  try {
    const file = join(dir, "drawing.svg");
    writeFileSync(file, svg);
    const result = spawnSync("python3", [join(root, script), ...flags, file], { encoding: "utf8" });
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const plotterCheck = (svg, ...flags) => run("vendor/plotter/scripts/check.py", svg, ...flags);
const processvgCheck = (svg, ...flags) => run("scripts/check.py", svg, ...flags);

// A small pumping drawing with a knockout gate, labels and every Plotter role.
function scene() {
  const pump = placeSymbol("pump-centrifugal", { x: 160, y: 220 });
  const [, outlet] = pump.ports;
  const valve = placeSymbol("valve-gate", { x: 280, y: outlet[1] }, { closed: false });
  const gate = placeSymbol("gate-slide", { x: 400, y: outlet[1], s: 2 }, { closed: true });
  const pipe = routeLine("line-flow", [outlet, valve.ports[0]]);
  const signal = routeLine("line-electric", [[160, 300], [400, 300]]);
  const roles = Object.keys(standard.roles).map((role, i) => ({ d: `M60 ${330 + i * 6} L500 ${330 + i * 6}`, role }));
  return [...pump.shapes, ...pipe.shapes, ...valve.shapes, ...gate.shapes, ...signal.shapes, ...roles,
    { c: [160, 300, 1.6], role: "dot", fill: "solid" },
    { t: [160, 260, "P-101"] }, { t: [280, 190, "Gate valve"] }, { t: [400, 160, "Slide gate"] },
    { t: [160, 276, "12 L/s"], value: true }];
}
const groupOf = (svg, role) => svg.match(new RegExp(`<g data-plotter-role="${role}"[^>]*>`))?.[0];

test("inline profile uses presentation attributes only and takes ink from currentColor", () => {
  const svg = svgDoc("inline-pump", "Pump P-101", "Inline test drawing.", render(scene(), { profile: "inline" }), { profile: "inline" });
  assert.doesNotMatch(svg, /<style|style="/);
  assert.doesNotMatch(svg, /<rect /, "no paper rectangle");
  assert.doesNotMatch(svg, /Cal Sans|@font-face|font-variation/);
  assert.doesNotMatch(svg, /data-plotter=""/, "page stylesheets for full-mode drawings must not restyle inline drawings");
  assert.doesNotMatch(svg, /color:/);
  assert.match(svg, /^<svg [^>]*data-processvg-profile="inline" fill="none" stroke="currentColor"/);
  assert.doesNotMatch(svg.replace(/<defs>.*?<\/defs>/s, ""), /#fff|#000|#171717|#ededed/, "ink is only currentColor outside masks");
  // Every stroked shape outside <defs> carries the attribute; filled dots and mask cuts do not need it.
  const shapes = svg.replace(/<defs>.*?<\/defs>/s, "").match(/<(path|circle)\b[^>]*>/g);
  for (const el of shapes) {
    if (/stroke="none"/.test(el)) continue;
    assert.match(el, /vector-effect="non-scaling-stroke"/, el);
  }
  assert.doesNotMatch(svg.match(/<defs>.*?<\/defs>/s)[0], /vector-effect/);
  const check = plotterCheck(svg);
  assert.equal(check.status, 0, check.output);
  assert.match(check.output, /: ok$/m, check.output);
  const compact = plotterCheck(svg, "--compact");
  assert.doesNotMatch(compact.output, /lack vector-effect/, compact.output);
  assert.throws(() => svgDoc("x", "x", "x", "", { profile: "inline", theme: "dark" }), /host/);
});

test("every role's opacity and dash survive as attributes in each profile", () => {
  const shapes = scene();
  for (const profile of ["screen", "inline", "print"]) {
    const svg = render(shapes, { profile });
    for (const [role, { opacity, dash }] of Object.entries(standard.roles)) {
      const group = groupOf(svg, role);
      assert.ok(group, `${profile}: ${role} group`);
      const expected = profile === "print" ? 1 : standard.tokens[opacity];
      assert.match(group, new RegExp(`opacity="${expected}"`), `${profile}: ${role} opacity`);
      assert.match(group, new RegExp(`stroke-dasharray="${dash}"`), `${profile}: ${role} dash`);
    }
    // signal stays an electrical line: secondary ink, the 6/4 dash on its group and on its paths.
    assert.match(svg, /<g data-plotter-role="secondary" opacity="(0\.32|1)" stroke-dasharray="6 4" stroke-linecap="butt">/);
    assert.match(svg, /<path d="M160 300 L400 300" stroke-dasharray="6 4"/);
  }
  assert.deepEqual(ROLES, [...new Set(["primary", "secondary", "signal", ...Object.keys(standard.roles), "dot"])]);
  assert.throws(() => render([{ d: "M0 0 L1 1", role: "bold" }]), /Unknown drawing role: bold/);
});

test("drawings that use only the original roles render as before", () => {
  const shapes = [{ d: "M1 1 L25 1" }, { d: "M1 5 L25 5", role: "signal" }, { d: "M1 9 L25 9", role: "secondary" }];
  assert.equal(render(shapes), [
    '<g data-plotter-role="primary" opacity="1" stroke-dasharray="none">', '<path d="M1 1 L25 1" />', "</g>",
    '<g data-plotter-role="secondary" opacity="0.32" stroke-dasharray="none">', '<path d="M1 9 L25 9" />', "</g>",
    '<g data-plotter-role="secondary" opacity="0.32" stroke-dasharray="6 4" stroke-linecap="butt">',
    '<path d="M1 5 L25 5" stroke-dasharray="6 4" />', "</g>"].join("\n"));
});

test("knockout mask ids are scoped to each drawing and deterministic", () => {
  const closed = (x) => placeSymbol("gate-slide", { x, y: 100, s: 2 }, { closed: true }).shapes;
  const body = [render(closed(100)), render(closed(200))].join("\n");
  const a = svgDoc("sheet-a", "A", "A", body), b = svgDoc("sheet-b", "B", "B", body);
  const ids = (svg) => [...svg.matchAll(/<mask id="([^"]+)"/g)].map(([, id]) => id);
  assert.deepEqual(ids(a), ["sheet-a-knockout-1", "sheet-a-knockout-2"]);
  assert.deepEqual(ids(b), ["sheet-b-knockout-1", "sheet-b-knockout-2"]);
  for (const svg of [a, b]) {
    const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map(([, id]) => id);
    assert.deepEqual(refs, ids(svg), "each body references its own mask");
  }
  assert.equal(svgDoc("sheet-a", "A", "A", body), a);
  assert.match(render(closed(100), { idPrefix: "p1" }), /<mask id="p1-knockout-1"[^]*url\(#p1-knockout-1\)/);
});

test("processvg check waives only documented P&ID exceptions", () => {
  const labelled = render(scene(), { profile: "print" });
  const print = svgDoc("print-pump", "Pump", "Print test.", labelled, { profile: "print" });
  assert.match(plotterCheck(print).output, /labels are never full ink/);
  const checked = processvgCheck(print);
  assert.equal(checked.status, 0, checked.output);
  assert.match(checked.output, /excepted: print-full-ink-labels \(\d+ messages\)/);
  // A screen drawing at full ink is still an error: the waiver is scoped to the print profile.
  const loud = svgDoc("loud", "Loud", "Full-ink labels on screen.", labelled);
  assert.notEqual(processvgCheck(loud).status, 0);
  // The theme stylesheet sets vector-effect, which Plotter's attribute-only scan cannot see.
  const compact = svgDoc("compact", "Compact", "Compact.", render([{ d: "M0 0 L9 9" }]), { width: 24, height: 24 });
  assert.match(plotterCheck(compact, "--compact").output, /lack vector-effect/);
  assert.match(processvgCheck(compact, "--compact").output, /excepted: theme-stylesheet-non-scaling/);
  // Legend density applies to legend sheets only.
  const sparse = svgDoc("sparse", "Sparse", "Sparse.", render([{ d: "M0 0 L9 9" }]));
  assert.match(processvgCheck(sparse).output, /warning: Sparse/);
  const legend = sparse.replace('data-plotter=""', 'data-plotter="" data-processvg-sheet="legend"');
  assert.match(processvgCheck(legend).output, /excepted: legend-density/);
  // With no arguments it checks every committed drawing.
  assert.match(execFileSync("python3", [join(root, "scripts/check.py")], { encoding: "utf8" }), /legend-valves\.svg: ok/);
});

test("structure panels support the inline profile and tag dimensions and leaders with Plotter roles", () => {
  const model = createStructureModel("sbr-basin");
  const { svg } = composeStructure(model, { view: "section", profile: "inline" });
  assert.doesNotMatch(svg, /<style|<rect /);
  for (const el of svg.match(/<(path|circle)\b[^>]*>/g)) assert.match(el, /vector-effect="non-scaling-stroke"/, el);
  const screen = composeStructure(model, { view: "section" }).svg;
  assert.match(screen, /data-plotter-role="dimension" opacity="0\.32"/);
  assert.match(screen, /stroke-dasharray="2 3" data-plotter-role="leader" opacity="0\.32"/);
  assert.match(composeStructure(model, { view: "section", profile: "print" }).svg, /data-plotter-role="dimension" opacity="1"/);
});

test("pump dimensions use Plotter's helper; screening keeps its geometry in the dimension role; gate hidden edges use the hidden role", () => {
  const { document } = composePumpDocument(submersible, { intent: "create" });
  for (const view of ["plan", "section"]) {
    const [block] = composePumpDocument(document, { view }).blocks;
    const dims = block.shapes.filter(({ role }) => role === "dimension");
    assert.equal(dims.length, 6, "witnesses, line and slashes for two dimensions");
    // Plotter's slash: slashExtent 8, so each slash spans ±4 on both axes.
    const slash = dims[2].d.match(/M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/).slice(1).map(Number);
    assert.deepEqual([slash[2] - slash[0], slash[1] - slash[3]], [8, 8]);
    assert.ok(block.shapes.some(({ t }) => t?.[2] === "1200 mm"));
  }
  const screen = screeningPhysical("plan", physicalFixtures["grit-vortex"], { x: 0, y: 0, s: 1, q: 0 });
  const measured = screen.shapes.filter(({ role }) => role === "dimension");
  assert.equal(measured.length, 4);
  for (const ticks of measured.filter((_, i) => i % 2)) {
    const [x0, y0, x1, y1] = ticks.d.match(/^M(-?[\d.]+) (-?[\d.]+) L(-?[\d.]+) (-?[\d.]+)/).slice(1).map(Number);
    assert.deepEqual([x1 - x0, y0 - y1].map((n) => Math.round(n * 1e9) / 1e9), [4, 4], "approved 4-unit slashes");
  }
  const gate = composeEquipment({ id: "g-1", tag: "G-101", type: "gate-slide", normalPosition: "closed",
    physical: { unit: "m", width: 1.5, thickness: 0.1, upstreamLength: 2, downstreamLength: 2, height: 1.2,
      leafWidth: 1.7, guideTop: 2.5, guideWidth: 0.12, leafHeight: 1.3, maxLift: 1.2 },
    designPosition: { lift: 0, unit: "m", position: "closed" } }, {}, { view: "elevation", stateBasis: "design", scale: 100 });
  const hidden = gate.shapes.filter(({ role }) => role === "hidden");
  assert.ok(hidden.length > 0 && hidden.every(({ dash }) => dash === undefined));
  assert.match(render(gate.shapes), /<g data-plotter-role="hidden" opacity="0.32" stroke-dasharray="3 5" stroke-linecap="butt">/);
});
