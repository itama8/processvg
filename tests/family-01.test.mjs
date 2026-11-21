import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { byId, crossover, placePoint, placeSymbol } from "../src/library.mjs";
import { levelAnnotation, offSheet, routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const catalogue = JSON.parse(readFileSync(new URL("../drawings/symbols/catalogue.json", import.meta.url)));
const points = (d) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((match) => match.slice(1).map(Number));

test("catalogue preserves Family 01 IDs and declares independent connectivity groups", () => {
  for (const id of ["line-process", "line-flow", "line-electric", "line-data", "line-pneumatic",
    "junction", "crossover", "inflow", "outflow", "dead-end", "water-level"]) {
    const exported = catalogue.symbols.find((entry) => entry.id === id);
    assert.deepEqual(exported.portNames, byId[id].portNames);
    assert.deepEqual(exported.ports, byId[id].ports);
  }
  assert.deepEqual(byId.crossover.connectivity, [[0, 1], [2, 3]]);
  assert.deepEqual(byId["junction-cross"].connectivity, [[0, 1, 2, 3]]);
  assert.deepEqual(byId.junction.connectivity, [[0, 1, 2]]);
  assert.deepEqual(byId["line-break"].connectivity, [[0, 1]]);
  assert.deepEqual(byId["dead-end"].connectivity, []);
  assert.equal(byId["dead-end"].ports.length, 1);
  assert.equal(byId.crossover.src[0].ref, "0304");
  assert.equal(byId["fitting-flexible-coupling"].verification, "Proposed");
});

test("rotated Family 01 ports meet geometry at the rendered placement", () => {
  for (const symbol of catalogue.symbols.filter(({ category }) => category === "Lines")) {
    for (const q of [0, 1, 2, 3]) {
      const placed = placeSymbol(symbol.id, { x: 73, y: -27, s: 0.33, q });
      const endpoints = placed.shapes.filter(({ d }) => d).flatMap(({ d }) => points(d));
      for (const point of placed.ports) assert(endpoints.some(([x, y]) => x === point[0] && y === point[1]), symbol.id);
      if (symbol.flatSide) {
        const offset = symbol.flatSide === "top" ? 1 : -1;
        const expectedDelta = [[0, -0.99], [0.99, 0], [0, 0.99], [-0.99, 0]][q].map((n) => n * offset);
        const nominal = placePoint([20, 0], { x: 73, y: -27, s: 0.33, q });
        placed.ports[1].forEach((value, index) => assert(Math.abs(value - nominal[index] - expectedDelta[index]) < 1e-10));
        assert.equal(placed.metadata.flatSide, symbol.flatSide);
        assert.equal(placed.metadata.drawingFlatSide, ["top", "right", "bottom", "left"][(q + (offset < 0 ? 2 : 0)) % 4]);
      }
    }
  }
});

test("crossover preserves 3 units of centerline gap and butt caps", () => {
  const [bridge] = crossover();
  assert.equal(bridge.d, "M-12 0 L-4 0 A4 4 0 0 1 4 0 L12 0 M0 -12 L0 -5.5 M0 -2.5 L0 12");
  assert.equal(bridge.cap, "butt");
  assert.match(crossover({ radius: 5, clearance: 2 })[0].d, /A5 5 0 0 1 5 0 .*L0 -7 M0 -3/);
  assert.throws(() => crossover({ radius: 11 }), RangeError);
  const [compact] = placeSymbol("crossover", { s: 0.5 }).shapes;
  assert.equal(compact.d, "M-6 0 L-2 0 A2 2 0 0 1 2 0 L6 0 M0 -6 L0 -4 M0 0 L0 6");
  assert.equal(placeSymbol("crossover", {}, { renderScale: 0.5 }).shapes[0].d,
    "M-12 0 L-4 0 A4 4 0 0 1 4 0 L12 0 M0 -12 L0 -8 M0 0 L0 12");
  assert.match(render([bridge]), /stroke-linecap="butt"/);
});

test("routes use downstream markers, arc-length spacing, clean data circles and short-run fallback", () => {
  const vertices = [[0, 0], [50, 0], [50, 70], [82, 70]];
  const process = routeLine("line-process", vertices);
  assert.deepEqual(process.ports, [vertices[0], vertices.at(-1)]);
  assert.deepEqual(process.shapes, [{ d: "M0 0 L50 0 L50 70 L82 70", role: "primary" }]);
  assert.equal(routeLine("line-electric", vertices).shapes[0].role, "signal");
  const flow = routeLine("line-flow", vertices).shapes;
  assert.equal(flow[1].d, "M26 -4 L32 0 L26 4");
  assert.equal(flow[2].d, "M54 40 L50 46 L46 40");
  assert.equal(routeLine("line-flow", [[0, 0], [0, -20]]).shapes[1].d, "M-4 -4 L0 -10 L4 -4");
  const data = routeLine("line-data", [[0, 0], [40, 0]]).shapes;
  assert.deepEqual(data.slice(1).map(({ c }) => c), [[8, 0, 2], [24, 0, 2]]);
  assert.equal(data[0].d, "M0 0 L6 0 M10 0 L22 0 M26 0 L40 0");
  assert.deepEqual(routeLine("line-data", [[0, 0], [0, 0], [2, 0], [2, 2]]).shapes,
    [{ d: "M0 0 L2 0 L2 2", role: "secondary", cap: "butt" }]);
  assert.equal(routeLine("line-pneumatic", [[0, 0], [16, 0]]).shapes[1].d, "M4 4 L8 -4 M8 4 L12 -4");
  assert.throws(() => routeLine("line-data", [[0, 0], [NaN, 0]]), TypeError);
});

test("print raises line and text ink and retains dash patterns", () => {
  const shapes = [{ d: "M1 1 L25 1" }, { d: "M1 5 L25 5", role: "signal" },
    { d: "M1 9 L25 9", role: "secondary", dash: "3 2" }, { t: [10, 22, "Name"] }, { t: [10, 30, "Value"], value: true }];
  const screen = render(shapes);
  const print = render(shapes, { profile: "print" });
  assert.match(screen, /opacity="0.32" stroke-dasharray="6 4"/);
  assert.match(screen, /opacity="0.72"/);
  assert.match(screen, /opacity="0.5"/);
  assert.match(print, /opacity="1" stroke-dasharray="6 4"/);
  assert.match(print, /stroke-dasharray="3 2"/);
  assert.doesNotMatch(print, /opacity="0\./);
  assert.match(svgDoc("x", "x", "x", print, { profile: "print", theme: "dark" }), /color:#000!important.*\n<rect .*fill="#fff"/);
});

test("off-sheet rotation swaps available dimensions and preserves upright labels and metadata", () => {
  const measureText = (text) => ({ left: text.includes("Sheet") ? 103 : 30, right: 70, ascent: 8, descent: 3 });
  const common = { streamId: 'Waste <&> "route"', service: "Long external service", measureText };
  const outbound = offSheet({ ...common, direction: "out", sheetRef: "Sheet B", detail: "full" });
  const inbound = offSheet({ ...common, direction: "in", sheetRef: "Sheet A", detail: "full" });
  const compact = offSheet({ ...common, direction: "in", sheetRef: "Sheet A" });
  assert.equal(outbound.metadata.streamId, inbound.metadata.streamId);
  assert.equal(compact.metadata.service, common.service);
  assert.equal(compact.metadata.sheetRef, "Sheet A");
  assert.equal(compact.shapes.length, 2);
  assert.equal(outbound.shapes[2].t[2], "TO Sheet B");
  assert.equal(inbound.shapes[2].t[2], "FROM Sheet A");
  assert.match(render(inbound.shapes), /Waste &lt;&amp;&gt; &quot;route&quot;/);
  for (const orientation of [0, 90, 180, 270]) {
    for (const direction of ["in", "out"]) {
      const placed = offSheet({ ...common, direction, sheetRef: "Sheet X", detail: "full", orientation });
      const [tl, tr, tip, br, bl] = points(placed.shapes[0].d);
      assert.deepEqual(placed.ports[0].map((n) => n || 0),
        direction === "in" ? tip : tl.map((n, i) => (n + bl[i]) / 2));
      const inner = [tl, tr, br, bl];
      for (const { t: [x, y, label] } of placed.shapes.slice(1, 3)) {
        const { left, right, ascent, descent } = measureText(label);
        assert(x - left > Math.min(...inner.map(([u]) => u)));
        assert(x + right < Math.max(...inner.map(([u]) => u)));
        assert(y - ascent > Math.min(...inner.map(([, v]) => v)));
        assert(y + descent < Math.max(...inner.map(([, v]) => v)));
      }
      const serviceBaseline = placed.shapes.at(-1).t[1];
      const outlineBottom = Math.max(...inner.map(([, v]) => v), tip[1]);
      const outlineTop = Math.min(...inner.map(([, v]) => v), tip[1]);
      if ((orientation === 90 && direction === "in") || (orientation === 270 && direction === "out")) {
        assert(serviceBaseline < outlineTop);
      } else {
        assert(serviceBaseline > outlineBottom);
      }
      assert(!render(placed.shapes).includes("rotate("));
    }
  }
});

test("levels use relative datum coordinates and keep displayed elevations explicit", () => {
  const input = { kind: "TWL", elevation: 105.25, datum: "Plant datum", lineStyle: "dashed",
    anchor: { x: 25, yDatum: 200, datumRL: 100, scale: 10 } };
  const original = levelAnnotation(input);
  const raised = levelAnnotation({ ...input, elevation: 106.25 });
  const shifted = levelAnnotation({ ...input, elevation: 5.25, anchor: { ...input.anchor, datumRL: 0 } });
  assert.equal(original.y, 147.5);
  assert.equal(raised.y, original.y - 10);
  assert.deepEqual(original.shapes.slice(0, 2), shifted.shapes.slice(0, 2));
  assert.equal(original.shapes[1].d, "M25 147.5 L20 140.5 L30 140.5 Z");
  assert.equal(original.shapes[2].t[2], "TWL RL +105.250 m (Plant datum)");
  assert.equal(shifted.shapes[2].t[2], "TWL RL +5.250 m (Plant datum)");
  assert.throws(() => levelAnnotation({ ...input, levelBounds: [100, 105] }), RangeError);
  assert.throws(() => levelAnnotation({ ...input, anchor: { ...input.anchor, scale: 0 } }), RangeError);
});

test("stylesheet lets hosts set ink, keeps signal dashes and print ink under Plotter roles.css", async () => {
  const { THEME_CSS, THEME_STYLE } = await import("../src/render.mjs");
  const { readFileSync } = await import("node:fs");
  assert.match(THEME_CSS, /color:var\(--plotter-ink,#171717\)/);
  assert.match(THEME_CSS, /:not\(\[data-host-ink\]\)\{color:var\(--plotter-ink,#ededed\)\}/);
  // roles.css sets stroke-dasharray:none on every role group, so the dash must sit on the path.
  assert.match(render([{ d: "M0 0 L9 0", role: "signal" }]), /<path d="M0 0 L9 0" stroke-dasharray="6 4" \/>/);
  const doc = svgDoc("p", "t", "d", "", { profile: "print" });
  assert.match(doc, /\[data-profile=print\] \[data-plotter-role\]\{opacity:1!important\}/);
  assert.equal(doc.match(/<style>/g).length, 1);
  assert.match(svgDoc("l", "t", "d", "", { theme: "light" }), /\[data-theme=light\]\{color:#171717\}/);
  // The Python section generator duplicates the stylesheet; keep them identical.
  assert.ok(readFileSync(new URL("../examples/drawings.py", import.meta.url), "utf8").includes(THEME_STYLE));
});
