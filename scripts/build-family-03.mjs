#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { byId, composeActuator, composeValve, placeOperatingValve, placeSymbol } from "../src/library.mjs";
import { routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const output = new URL("../review/family-03/", import.meta.url);
mkdirSync(output, { recursive: true });
const profiles = {
  light: { theme: "light" }, dark: { theme: "dark" }, transparent: {}, print: { profile: "print" },
};
const rotations = [0, 1, 2, 3];
const label = (x, y, content, align = "middle") => ({ t: [x, y, content], align });
const path = (points, role = "primary") => ({ d: "M" + points.map((xy) => xy.join(" ")).join(" L"), role });
const spring = "modifier-spring-return";
const heads = Object.values(byId).filter(({ operator, modifier }) => operator || modifier);
const cell = (result) => ({ shapes: result.shapes });
const pipe = ({ point, normal }, length) => routeLine("line-process", [point, point.map((v, i) => v + normal[i] * length)]).shapes;
const bodyAndPipes = (result) => ({ shapes: [...result.shapes, ...result.processPorts.flatMap((p) => pipe(p, 22))] });

function save(id, title, desc, items, options = {}) {
  const body = items.map((item) => item.shapes
    ? `<g data-review-cell="">${render(item.shapes, options)}</g>`
    : render([item], options)).join("\n");
  writeFileSync(new URL(`${id}.svg`, output), svgDoc(`f03-${id}`, title, desc, body, options));
}

for (const [theme, profile] of Object.entries(profiles)) {
  for (const [index, group] of [heads.slice(0, 6), heads.slice(6)].entries()) {
    const items = rotations.map((q) => label(166 + 109 * q, 25, `${q * 90}°`));
    group.forEach(({ id, name }, i) => {
      const y = 63 + 62 * i + (index === 1 && i >= 3 ? 16 : 0);
      items.push(label(14, y + 3, name, "start"));
      for (const q of rotations) {
        const x = 166 + 109 * q;
        items.push(cell(placeSymbol(id, { x, y: y - 2, q, s: 1.1 })));
        items.push(cell(placeSymbol(id, { x, y: y + 22, q, s: 0.62 })));
      }
    });
    save(`heads-${index + 1}-${theme}`, `Operator heads ${index + 1} · ${theme}`,
      "Each row shows the head or spring at 1.1× above its 0.62× sample. Identification stays upright.", items, profile);
  }
  const presets = ["act-hand", "act-motor", "act-solenoid", "act-diaphragm", "valve-control", "valve-float-operated"];
  const presetsSheet = [label(244, 26, "Nominal · 1.25×"), label(426, 26, "Reduced · 0.62×")];
  presets.forEach((id, i) => {
    const y = 79 + 62 * i;
    presetsSheet.push(label(18, y + 3, byId[id].name, "start"));
    for (const [x, s] of [[244, 1.25], [426, 0.62]]) {
      const result = placeSymbol(id, { x, y, s });
      presetsSheet.push(bodyAndPipes(result));
    }
  });
  save(`presets-${theme}`, `Legacy valve assemblies · ${theme}`,
    "The established assembly IDs still supply a body, operator and pipe ends. The float valve remains a convenience preset.", presetsSheet, profile);
}

const stemSamples = [label(280, 27, "Requested stem lengths · 0, 8 and 16 drawing units")];
for (const [col, length] of [0, 8, 16].entries()) {
  const x = 102 + 176 * col;
  for (const [row, headId] of ["operator-hand-t", "operator-handwheel"].entries()) {
    const y = 100 + 92 * row;
    const result = composeValve({ bodyId: "valve-gate", normalPosition: "open", actuator: { headId, stemLength: length } }, { x, y, s: 1.5 });
    stemSamples.push(bodyAndPipes(result), label(x, y + 28, `${row ? "Handwheel" : "Manual T"} · reach ${Math.round(result.metadata.actuator.mountedReach * 10) / 10}`));
  }
}
for (const [i, bodyId, headId] of [[0, "valve-butterfly", "operator-lever"], [1, "valve-butterfly", "operator-motor"],
  [2, "valve-knife", "operator-pneumatic-cylinder"]]) {
  const x = 102 + 176 * i;
  const result = composeValve({ bodyId, normalPosition: "closed", actuator: { headId, stemLength: 8 },
    endConnections: { out: { type: "flanged" } } }, { x, y: 353, s: 1.5 });
  stemSamples.push(bodyAndPipes(result), label(x, 388, `${byId[bodyId].name} · ${byId[headId].name}`));
}
save("mounting", "Valve mounts and stem clearances", "The first column requests zero reach. The clearance reservation keeps the manual heads above the gate-valve bowtie. Other examples preserve the butterfly and knife identities.", stemSamples);

const gateSheet = [];
for (const [i, headId] of ["operator-handwheel", "operator-motor", "operator-hydraulic-cylinder"].entries()) {
  const at = { x: 102 + 176 * i, y: 108, s: 1.75 };
  const gate = placeSymbol("gate-slide", at);
  const op = composeActuator({ point: [0, -10], normal: [0, -1] }, { headId, stemLength: [8, 12, 16][i] }, at);
  gateSheet.push(cell({ shapes: [...gate.shapes, ...op.shapes] }), label(at.x, 151, byId[headId].name));
}
gateSheet.push(label(280, 208, "Independent head orientation · drawing-space upright"));
for (const q of rotations) {
  const at = { x: 90 + 127 * q, y: 312, s: 1.25, q };
  const valve = composeValve({ bodyId: "valve-knife", normalPosition: "open",
    actuator: { headId: "operator-pneumatic-cylinder", headOrientation: "upright", stemLength: 16 } }, at);
  gateSheet.push(bodyAndPipes(valve), label(at.x, 413, `${q * 90}° body`));
}
save("equipment", "Penstock mounts and independently upright heads", "The top row uses the existing slide-gate geometry with an equipment mount. Below, rotated knife valves retain their process routes and a drawing-space upright cylinder.", gateSheet);

const springSheet = [
  label(280, 29, "FO = fail open · FC = fail closed · FLP = fail at last position"),
  label(280, 45, "The failure event qualifies the response. FLP describes the project’s stated behavior."),
];
const cases = [
  ["Spring · fail open", { failPosition: "open", failEvent: "loss of air" }, true],
  ["Spring · fail closed", { failPosition: "closed", failEvent: "loss of control signal" }, true],
  ["Spring · response unspecified", {}, true],
  ["No spring callout · fail closed", { failPosition: "closed", failEvent: "loss of air" }, false],
  ["Failure position unknown", { failPosition: "unknown", failEvent: "loss of air" }, false],
  ["Failure position inapplicable", { failPosition: "not-applicable" }, false],
];
for (const [i, [title, failure, show]] of cases.entries()) {
  const x = i % 2 ? 410 : 139, y = 80 + Math.floor(i / 2) * 116;
  const result = composeValve({ bodyId: "valve-gate", normalPosition: "open", ...failure,
    actuator: { headId: "operator-pneumatic-cylinder", modifiers: show ? [spring] : [] } }, { x, y: y + 52, s: 1.15 });
  springSheet.push(label(x, y, title), bodyAndPipes(result));
}
for (const [id, profile] of [["spring-screen", {}], ["spring-print", { profile: "print" }]]) {
  save(id, "Spring return and failure events", "The spring is a separate graphic callout. The listed failure response comes from the valve data.", springSheet, profile);
}

const config = {
  bodyId: "valve-ball", tag: "BV-301", normalPosition: "open",
  operatingPosition: { position: "closed", openingPercent: 0 },
  failPosition: "last", failEvent: "loss of power",
  actuator: { headId: "operator-motor" },
};
const states = [label(152, 48, "Design · normally open"), label(409, 48, "Operating · currently closed"),
  bodyAndPipes(composeValve(config, { x: 152, y: 135, s: 1.5 })),
  bodyAndPipes(placeOperatingValve(config, { x: 409, y: 135, s: 1.5 }))];
const debug = composeValve({ bodyId: "valve-knife", normalPosition: "open", endConnections: { in: { type: "flanged" } },
  actuator: { headId: "operator-pneumatic-cylinder", modifiers: [spring] } }, { x: 248, y: 332, q: 1, s: 1.5 });
const dot = (xy) => ({ c: [...xy, 1.6], role: "dot", fill: "solid" });
states.push(label(280, 249, "Debug view · marked attachment coordinates only in this panel"),
  bodyAndPipes(debug), ...debug.processPorts.map(({ point }) => dot(point)),
  ...[debug.anchors.mount.point, debug.anchors.head.point, ...debug.anchors.spring].map(dot),
  label(280, 423, "Dots mark the pipe faces, mount, head and spring graphic attachments"));
save("state-and-anchors", "Valve state and attachment diagnostics", "Design and operating views share one valve declaration. The lower panel marks geometric attachments independently of routed process ports.", states);

const overlay = [label(280, 34, "P and H omitted for geometry comparison")];
for (const q of rotations) {
  const at = { x: 78 + 136 * q, y: 182, s: 2.8, q };
  const p = placeSymbol("operator-pneumatic-cylinder", at, { identifier: "omit" });
  const h = placeSymbol("operator-hydraulic-cylinder", at, { identifier: "omit" });
  overlay.push(cell(p), ...h.shapes.map((shape) => ({ ...shape, role: "secondary", dash: "3 2" })),
    label(at.x, 263, `${q * 90}°`));
}
save("cylinder-overlay", "Pneumatic and hydraulic cylinder overlay", "The dashed hydraulic trace lies directly over the pneumatic geometry at each orientation.", overlay);
