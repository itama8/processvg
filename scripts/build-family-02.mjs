#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { byId, composeValve, place, placeOperatingValve, placeSymbol } from "../src/library.mjs";
import { routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const output = new URL("../review/family-02/", import.meta.url);
mkdirSync(output, { recursive: true });
const text = (x, y, value, align = "middle") => ({ t: [x, y, value], align });
const line = (...points) => routeLine("line-process", points).shapes[0];
const pipeFrom = ({ point, normal }, length = 25) =>
  line(point, point.map((coordinate, index) => coordinate + length * normal[index]));
const valve = (id, x, y, config = {}, at = {}, display = {}) =>
  composeValve({ bodyId: `valve-${id}`, ...config }, { x, y, s: 1.5, ...at }, display);

function save(id, title, description, shapes, options = {}) {
  writeFileSync(new URL(`${id}.svg`, output), svgDoc(`f02-${id}`, title, description, render(shapes, options), options));
}

const isolationIds = ["gate", "globe", "ball", "plug", "needle", "diaphragm", "butterfly", "knife", "pinch"];
const stateMatrix = [
  text(24, 29, "Valve", "start"), text(204, 29, "Normal open"), text(316, 29, "Normal closed"),
  text(450, 29, "Reduced closed"),
];
isolationIds.forEach((id, index) => {
  const y = 52 + 39 * index;
  stateMatrix.push(text(24, y + 4, byId[`valve-${id}`].name, "start"));
  for (const [x, normalPosition, s] of [[204, "open", 1.5], [316, "closed", 1.5], [450, "closed", 0.65]]) {
    const v = valve(id, x, y, { normalPosition }, { s });
    stateMatrix.push(...v.shapes, ...v.processPorts.map((port) => pipeFrom(port, 15)));
  }
});
stateMatrix.push(text(280, 426, "NC means normally closed · Reduced symbols use a label where needed"));
for (const [name, options] of [
  ["light", { theme: "light" }], ["dark", { theme: "dark" }],
  ["transparent", {}], ["print", { profile: "print" }],
]) save(`01-states-${name}`, `Normal valve states (${name})`,
  "Nominal glyphs at 1.5× and reduced glyphs at 0.65×. Compare transparent identity halos and explicit NC fallbacks.", stateMatrix, options);

const beforeAfter = [
  text(140, 32, "Previous check valve"), text(420, 32, "Approved check valve"),
  text(140, 121, "Earlier foot-valve candidate"), text(420, 121, "Approved foot valve"),
  text(280, 258, "Permitted check-valve flow and routed endpoints"),
  ...place([{ d: "M-8 -5 L6 5 M6 -6 L6 6" }], { x: 140, y: 70, s: 2 }),
  ...place([{ d: "M0 -16 L0 -7 M-5 -7 L5 -7 M-5 5 L0 -6 L5 5 Z M0 5 L0 7 M-8 7 L8 7 L8 16 L-8 16 Z M-4 9 L-4 14 M0 9 L0 14 M4 9 L4 14" }],
    { x: 140, y: 178, s: 2 }),
  ...valve("check", 420, 70, {}, { s: 2 }).shapes,
  ...valve("foot", 420, 178, {}, { s: 2 }).shapes,
];
for (const q of [0, 1, 2, 3]) {
  const x = 82 + 132 * q, y = 336;
  const v = valve("check", x, y, {}, { q });
  const { from, to } = v.permittedFlow;
  const upstream = from.point.map((coordinate, index) => coordinate + 43 * from.normal[index]);
  const downstream = to.point.map((coordinate, index) => coordinate + 43 * to.normal[index]);
  beforeAfter.push(text(x, 420, `${90 * q}°`), ...v.shapes,
    ...routeLine("line-flow", [upstream, from.point]).shapes,
    ...routeLine("line-flow", [to.point, downstream]).shapes);
}
save("02-geometry", "Check and foot valve revision", "Earlier and approved forms with check-valve flow at four quarter turns.", beforeAfter);

const operating = [text(280, 31, "Design position of the four ball valves is normally open")];
for (const [index, position, openingPercent] of [
  [0, "open", 100], [1, "closed", 0], [2, "partial", 42], [3, "unknown", undefined],
]) {
  const x = index % 2 ? 414 : 142, y = index < 2 ? 87 : 226;
  const config = {
    bodyId: "valve-ball", tag: `BV-${10 + index}`, normalPosition: "open",
    operatingPosition: { position, ...(openingPercent !== undefined && { openingPercent }) },
    failPosition: "last", failEvent: "loss of power",
  };
  const live = placeOperatingValve(config, { x, y, s: index === 1 ? 0.7 : 1.5 });
  operating.push(...live.shapes, ...live.processPorts.map((port) => pipeFrom(port, 44)));
}
for (const [id, x, config] of [
  ["valve-check", 142, { tag: "Passive check" }],
  ["valve-3way", 414, { tag: "Three-way", activePortPairs: [["in", "branch"]] }],
]) {
  const v = placeOperatingValve({ bodyId: id, ...config, labelAnchor: [x, 399] }, { x, y: 343, s: 1.5 });
  operating.push(...v.shapes, ...v.processPorts.map((port) => pipeFrom(port, 24)));
}
save("03-operating", "Operating state and travel",
  "All ball valves are normally open and configured to hold last position on loss of power. Operating readouts show current position and travel. The check is passive and the diverter reports the stated route.",
  operating);

function header(y, title) {
  return text(22, y, title, "start");
}
const processOne = [header(27, "Sludge withdrawal"), header(170, "Pump suction"), header(308, "Water supply pressure control")];
const pinch = valve("pinch", 172, 78, { normalPosition: "closed", tag: "Sleeve pinch", endConnections: { in: { type: "flanged" } } });
const knife = valve("knife", 374, 78, { normalPosition: "open", tag: "Knife isolation", endConnections: { out: { type: "flanged" } } });
processOne.push(...pinch.shapes, ...knife.shapes, line([30, 78], pinch.ports[0]), line(pinch.ports[1], knife.ports[0]), line(knife.ports[1], [528, 78]));
const foot = valve("foot", 174, 232, { tag: "Screened intake", labelAnchor: [174, 285] });
const pump = placeSymbol("pump-centrifugal", { x: 368, y: 192 });
processOne.push(...foot.shapes, ...pump.shapes,
  line(foot.ports[0], [174, pump.ports[0][1]], pump.ports[0]), pipeFrom({ point: pump.ports[1], normal: [1, 0] }, 120),
  { d: "M82 224 L145 224 M202 224 L237 224 M82 224 L82 272 L237 272 L237 224", role: "secondary" },
  text(368, 251, "Suction pump"));
for (const [representation, x] of [["compact", 141], ["downstream-sensing", 417]]) {
  const v = valve("pressure-reducing", x, 365, { representation, setpoint: { value: 300, units: "kPa" } });
  processOne.push(...v.shapes, ...v.processPorts.map((port) => pipeFrom(port, 55)));
}
processOne.push(text(141, 324, "Compact"), text(417, 324, "Downstream sensing"),
  text(417, 425, "Short dashes = hydraulic impulse"));
save("04-process", "Valve applications, sheet 1", "Conceptual sludge withdrawal, foot valve on pump suction, and both pressure-reducing representations. Short dashes indicate hydraulic impulse.", processOne);

const processTwo = [header(27, "Rising-main high point"), header(162, "Makeup tank float control"), header(329, "Instrument sample line")];
const air = valve("air-combination", 278, 71);
const [airX, airY] = air.ports[0];
processTwo.push(...air.shapes, line(air.ports[0], [airX, 119]),
  line([30, 138], [90, 138], [124, 119], [472, 119], [528, 137]), { c: [airX, 119, 2], fill: "solid", role: "dot" },
  text(311, airY - 15, "Combination air valve", "start"));
const float = valve("float-operated", 281, 235, { tag: "Makeup", labelAnchor: [145, 262], normalPosition: "open", actuator: { type: "float", behavior: "close-on-rise" } });
processTwo.push(...float.shapes, line([30, 235], float.ports[0]), line(float.ports[1], [337, 235], [337, 249]),
  { d: "M297 225 L297 231 M297 239 L297 299 L438 299 L438 225 M297 264 L438 264", role: "secondary" },
  text(370, 219, "Closes on rise"));
const needle = valve("needle", 280, 380, { tag: "Sample metering", normalPosition: "closed", actuator: { type: "hand" } });
processTwo.push(...needle.shapes, line([30, 380], needle.ports[0]), line(needle.ports[1], [528, 380]));
save("05-process", "Valve applications, sheet 2", "Conceptual air management, float-operated makeup, and an instrument sampling branch.", processTwo);

const attachments = [
  header(26, "Individual pipe ends and mechanical mounting"),
  text(280, 429, "Pipe routes meet the outer flange face · Operator stems start at body-specific mounts"),
];
for (const [q, id, type] of [[0, "needle", "hand"], [1, "ball", "motor"], [2, "knife", "diaphragm"], [3, "globe", "solenoid"]]) {
  const x = q % 2 ? 419 : 141, y = q < 2 ? 105 : 302;
  const v = valve(id, x, y, {
    tag: byId[`valve-${id}`].name, normalPosition: "closed",
    endConnections: { [q % 2 ? "out" : "in"]: { type: "flanged" } }, actuator: { type, stemLength: 12 },
  }, { q });
  attachments.push(...v.shapes, ...v.processPorts.map((p) => pipeFrom(p, 30)));
}
save("06-attachments", "Valve ends and actuator mounting", "Existing operator heads and independent flange ends at four orientations.", attachments);
