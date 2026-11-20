#!/usr/bin/env node
// Inlet works, fine screening: the earlier hand-drawn P&ID rebuilt from the symbol library.
// Flow meter FIT-1 on the inflow; LIT-1…4 read the level each side of the two duty screens
// and DLT-1, DLT-2 are their differences; the manual channel stands by behind normally closed slide gates (NC).

import { writeFileSync } from "node:fs";
import path from "node:path";
import { byId, place, placeSymbol } from "../src/library.mjs";
import { render, svgDoc } from "../src/render.mjs";

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../drawings");
const shapes = [];
const put = (id, at, opts = {}) => shapes.push(...place(byId[id].draw(opts), at));
const ln = (role, ...p) => shapes.push({ d: "M" + p.map(([x, y]) => `${x} ${y}`).join(" L"), role });
const channelLine = (duty, from, to) => {
  ln(duty ? "primary" : "secondary", from, to);
  if (!duty) shapes.at(-1).dash = "3 2";
};
const label = (x, y, s, value = false) => shapes.push({ t: [x, y, s], value });

const slideGate = (x, y, duty, role) => {
  const gate = placeSymbol("gate-slide", { x, y }, { closed: !duty, labelAnchor: [x, y + 22] });
  shapes.push(...gate.shapes.map((shape) => shape.t ? shape : { ...shape, role }));
};

const rows = { m1: 150, man: 220, m2: 290 };
const busIn = 166, chX0 = 200, chX1 = 340, busOut = 370, gritX = 414, busGrit = 456, screenX = 250;

// Inflow, flow meter and transmitter
put("inflow", { x: 34, y: 220 });
put("fe-mag", { x: 72, y: 220 });
ln("primary", [52, 220], [58, 220]);
put("inst-field", { x: 72, y: 168 }, { tag: ["FIT", "1"] });
ln("signal", [72, 182], [72, 213]);

// Stilling chamber and inlet bus
ln("primary", [86, 220], [104, 220]);
shapes.push({ d: "M104 198 L148 198 L148 242 L104 242 Z" });
label(126, 223.6, "Stilling");
ln("primary", [148, 220], [busIn, 220]);
ln("primary", [busIn, rows.m1], [busIn, rows.m2]);
shapes.push({ c: [busIn, 220, 2], fill: "solid", role: "dot" });

for (const [key, y] of Object.entries(rows)) {
  const duty = key !== "man";
  const role = duty ? "primary" : "secondary";
  channelLine(duty, [busIn, y], [183.5, y]);
  slideGate(186, y, duty, role);
  channelLine(duty, [188.5, y], [chX0, y]);
  shapes.push({ d: `M${chX0} ${y - 9} L${chX1} ${y - 9} L${chX1} ${y + 9} L${chX0} ${y + 9} Z`, role });
  shapes.push(...place(byId["screen-bar"].draw({}), { x: screenX, y, s: 0.62 }).map((s) => ({ ...s, role: s.role ?? role })));
  channelLine(duty, [chX1, y], [354.5, y]);
  slideGate(357, y, duty, role);
  channelLine(duty, [359.5, y], [busOut, y]);
}

// Each duty screen: a level transmitter each side (LIT), and the difference computed in
// the PLC as the differential level transmitter (DLT), drawn as a computed function.
for (const [y, side, lit, dlt] of [[rows.m1, -1, ["1", "2"], "1"], [rows.m2, 1, ["3", "4"], "2"]]) {
  const ey = y + side * 26, by = y + side * 64, dx = screenX + 82;
  [screenX - 26, screenX + 26].forEach((ex, i) => {
    put("fe-ultrasonic", { x: ex, y: ey, q: side < 0 ? 0 : 2 });
    ln("signal", [ex, ey + side * 8], [ex, by - side * 14]);
    put("inst-field", { x: ex, y: by }, { tag: ["LIT", lit[i]] });
  });
  // LIT (downstream) straight across; LIT (upstream) over the top of it
  ln("signal", [screenX + 40, by], [dx - 16, by]);
  ln("signal", [screenX - 26, by + side * 14], [screenX - 26, by + side * 24], [dx, by + side * 24], [dx, by + side * 16]);
  put("inst-scada", { x: dx, y: by }, { tag: ["DLT", dlt] });
}
// Labels inside each channel, downstream of its screen
label(304, rows.m1 + 3.6, "Screen 1");
label(304, rows.man + 3.6, "Standby");
label(304, rows.m2 + 3.6, "Screen 2");

// Outlet bus, grit chambers, to the SBR basins
ln("primary", [busOut, rows.m1], [busOut, rows.m2]);
for (const [gy, name] of [[185, "Grit 1"], [255, "Grit 2"]]) {
  shapes.push({ c: [busOut, gy, 2], fill: "solid", role: "dot" });
  ln("primary", [busOut, gy], [gritX - 22, gy]);
  shapes.push({ c: [gritX, gy, 22] });
  label(gritX, gy + 3.6, name);
  ln("primary", [gritX + 22, gy], [busGrit, gy]);
}
shapes.push({ c: [busOut, 220, 2], fill: "solid", role: "dot" });
ln("primary", [busGrit, 185], [busGrit, 255]);
shapes.push({ c: [busGrit, 220, 2], fill: "solid", role: "dot" });
put("outflow", { x: busGrit + 18, y: 220 });
label(busGrit + 18, 244, "To SBR");
label(34, 244, "Raw sewage");
label(280, 418, "Dashed process line = standby · DLT is computed from the two LITs", true);

writeFileSync(path.join(OUT, "inlet-works-pid.svg"), svgDoc(
  "inlet-works-pid", "Fine screening, duty and standby",
  "Raw sewage passes flow meter FIT-1 into the stilling chamber, splits across two mechanical fine screens on duty, each with a level transmitter either side (LIT-1 to LIT-4) and the difference computed as DLT-1 and DLT-2, while the manual channel stands by behind closed slide gates. Two grit chambers collect the screened flow for the SBR basins.",
  render(shapes),
));
console.log("inlet-works-pid.svg");
