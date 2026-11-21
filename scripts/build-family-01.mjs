#!/usr/bin/env node
// Reproducible review sheets for Family 01.
import { mkdirSync, writeFileSync } from "node:fs";
import { SYMBOLS, placeSymbol } from "../src/library.mjs";
import { checkSheetContinuations, levelAnnotation, offSheet, routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const output = new URL("../review/family-01/", import.meta.url);
mkdirSync(output, { recursive: true });
const family = SYMBOLS.filter(({ cat }) => cat === "Lines");
const text = (x, y, label, extra) => ({ t: [x, y, label], ...extra });
const start = (x, y, label) => text(x, y, label, { align: "start" });
const path = (d) => ({ d });

function matrix(symbols) {
  const shapes = [start(20, 29, "Symbol")];
  for (let q = 0; q < 4; q++) shapes.push(text(220 + q * 94, 29, `${q * 90}°`));
  symbols.forEach(({ id, name, verification }, row) => {
    const y = 67 + row * 40;
    shapes.push(start(20, y + 3, name));
    if (verification) shapes.push(text(20, y + 15, verification, { align: "start", value: true }));
    for (let q = 0; q < 4; q++) {
      shapes.push(...placeSymbol(id, { x: 220 + q * 94, y, s: 0.85, q }).shapes);
    }
  });
  return shapes;
}

function connections() {
  const shapes = [start(20, 28, "Crossover and junction"), start(20, 123, "Routed lines"),
    start(20, 351, "Pump discharge")];
  for (let q = 0; q < 4; q++) {
    const at = { x: 80 + 125 * q, y: 75, q, s: 0.5 };
    shapes.push(...placeSymbol("crossover", at).shapes);
    shapes.push(...placeSymbol("junction-cross", { ...at, x: at.x + 24 }).shapes);
  }
  for (const [index, id] of ["line-process", "line-flow", "line-electric", "line-data", "line-pneumatic", "line-hydraulic"].entries()) {
    const y = 148 + index * 32;
    shapes.push(start(20, y + 3, family.find((symbol) => symbol.id === id).name));
    shapes.push(...routeLine(id, [[145, y], [217, y], [242, y - 12], [310, y - 12], [310, y + 11], [532, y + 11]]).shapes);
  }

  const pump = placeSymbol("pump-centrifugal", { x: 110, y: 399 });
  const reducer = placeSymbol("fitting-reducer-eccentric", { x: 250, y: 399 });
  const pipeBreak = placeSymbol("line-break", { x: 377, y: 396 });
  const flange = placeSymbol("fitting-flanged-joint", { x: 500, y: 396 });
  const [[, suctionY], [dischargeX, dischargeY]] = pump.ports;
  shapes.push(...pump.shapes, ...reducer.shapes, ...pipeBreak.shapes, ...flange.shapes);
  for (const points of [
    [[20, suctionY], pump.ports[0]],
    [pump.ports[1], [dischargeX + 26, dischargeY], [dischargeX + 26, 399], reducer.ports[0]],
    [reducer.ports[1], pipeBreak.ports[0]],
    [pipeBreak.ports[1], flange.ports[0]],
    [flange.ports[1], [540, 396]],
  ]) shapes.push(...routeLine("line-process", points).shapes);
  return shapes;
}

const streamId = "RS-104 · Raw sewage transfer";
const lineId = "150-RS-104-01";
const service = "Raw sewage to the treatment train";
const inlet = "PID-101 · Inlet works and screening";
const discharge = "PID-102 · Wet well and discharge";
// Actual centered Chromium canvas ink boxes at 10 px sans-serif, rounded up.
const measured = {
  [streamId]: [69, 70, 8, 2],
  [lineId]: [34, 34, 8, 1],
  [`TO ${discharge}`]: [83, 84, 8, 2],
  [`FROM ${inlet}`]: [96, 96, 8, 2],
  [service]: [77, 76, 8, 2],
};
function measureText(label) {
  const [left, right, ascent, descent] = measured[label];
  return { left, right, ascent, descent };
}

function components() {
  const shapes = [start(20, 32, inlet), start(20, 137, discharge), start(20, 251, "Wet well levels")];
  const outgoing = offSheet({ direction: "out", streamId, lineId, sheetRef: discharge, service, detail: "full", x: 403, y: 72, measureText });
  const incoming = offSheet({ direction: "in", streamId, lineId, sheetRef: inlet, service, detail: "full", x: 143, y: 178, measureText });
  const issues = checkSheetContinuations([
    { sheetId: inlet, ...outgoing.metadata }, { sheetId: discharge, ...incoming.metadata },
  ]);
  if (issues.length) throw new Error(`Invalid continuation fixture: ${JSON.stringify(issues)}`);
  shapes.push(...outgoing.shapes, ...incoming.shapes,
    ...routeLine("line-flow", [[20, 72], outgoing.ports[0]]).shapes,
    ...routeLine("line-flow", [incoming.ports[0], [540, 178]]).shapes,
    { d: "M20 115 L540 115 M20 226 L540 226", role: "secondary", dash: "1 4" });
  shapes.push(path("M35 280 L35 410 L269 410 L269 280"));
  const anchor = { x: 56, yDatum: 410, datumRL: 100, scale: 32 };
  for (const [kind, elevation, lineStyle] of [["TWL", 103.25, "solid"], ["HWL", 102.05, "dashed"], ["LWL", 100.6, "dotted"]]) {
    shapes.push(...levelAnnotation({ kind, elevation, datum: "Plant datum", anchor, lineStyle, span: 197, levelBounds: [100, 104] }).shapes);
  }
  shapes.push(...offSheet({ direction: "in", streamId, sheetRef: inlet, service, x: 405, y: 330, measureText }).shapes);
  shapes.push(text(405, 366, "Compact connector"));
  return shapes;
}

function rotations() {
  const shapes = [];
  for (let q = 0; q < 4; q++) {
    const x = q % 2 ? 416 : 144, y = q > 1 ? 320 : 103;
    const orientation = q * 90, direction = q % 2 ? "in" : "out";
    const connector = offSheet({ direction, streamId, sheetRef: direction === "in" ? inlet : discharge,
      service, detail: "full", orientation, x, y, measureText });
    shapes.push(text(x, y - 70, `${orientation}° · ${direction === "in" ? "Incoming" : "Outgoing"}`));
    shapes.push(...connector.shapes);
    const end = connector.ports[0];
    const [dx, dy] = [[-44, 0], [0, 38], [44, 0], [0, -26]][q];
    shapes.push(...routeLine("line-process", [[end[0] + dx, end[1] + dy], end]).shapes);
  }
  return shapes;
}

const pages = [
  ["01-symbols", "Symbols 1 of 2", "Original line and connection symbols at four orientations.", matrix(family.slice(0, 9))],
  ["02-symbols", "Symbols 2 of 2", "Symbolic level and proposed fittings at four orientations.", matrix(family.slice(9))],
  ["03-connections", "Connections and routes", "Dense junction and crossover pairs, patterned routes and a pump discharge composition.", connections()],
  ["04-components", "Sheet references and levels", "Reciprocal references between two sheets and elevations on a wet well section.", components()],
  ["05-orientation", "Connector orientations", "Full off-sheet connectors with upright text and drawing-side ports.", rotations()],
];

for (const [name, options] of [["light", { theme: "light" }], ["dark", { theme: "dark" }], ["print", { profile: "print" }]]) {
  for (const [page, title, desc, shapes] of pages) {
    const id = `family-01-${name}-${page}`;
    writeFileSync(new URL(`${page}-${name}.svg`, output), svgDoc(id, `${title} (${name})`, desc, render(shapes, options), options));
  }
}
