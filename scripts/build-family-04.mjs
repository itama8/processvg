#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { SYMBOLS, byId, composeEquipment, placeSymbol } from "../src/library.mjs";
import { routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const output = new URL("../review/family-04/", import.meta.url);
mkdirSync(output, { recursive: true });
const label = (x, y, text, align = "middle") => ({ t: [x, y, text], align });
const profiles = { light: { theme: "light" }, dark: { theme: "dark" }, transparent: {}, print: { profile: "print" } };
const gates = SYMBOLS.filter(({ gate }) => gate);
const rotate = [0, 1, 2, 3];

function save(id, title, desc, shapes, options = {}) {
  writeFileSync(new URL(`${id}.svg`, output), svgDoc(`f04-${id}`, title, desc, render(shapes, options), options));
}

for (const [theme, options] of Object.entries(profiles)) {
  for (const [page, group] of [gates.slice(0, 5), gates.slice(5)].entries()) {
    const shapes = rotate.map((q) => label(181 + q * 99, 22, `${90 * q}°`));
    group.forEach(({ id, name, states }, i) => {
      const y = 61 + i * 77;
      shapes.push(label(14, y + 12, name, "start"));
      for (const q of rotate) {
        const x = 181 + q * 99;
        const top = states ? { closed: true } : {};
        const bottom = { ...top, labelAnchor: [x + (id === "gate-bulkhead" ? 34 : 18), y + 31] };
        if (id === "gate-butterfly") {
          top.normalPosition = "closed";
          top.labelAnchor = [x + 22, y + 3];
          bottom.normalPosition = "open";
        }
        if (id === "gate-flap") {
          top.labelAnchor = [x + 20, y + 3];
        }
        shapes.push(...placeSymbol(id, { x, y, q, s: 1.35 }, top).shapes);
        shapes.push(...placeSymbol(id, { x, y: y + (id === "weir-serrated" ? 45 : 29), q, s: 0.62 }, bottom).shapes);
      }
    });
    save(`01-symbols-${page + 1}-${theme}`, `Gate symbols ${page + 1} · ${theme}`,
      "Each cell shows a nominal glyph above a reduced sample. The slide knockout retains its approved local width, with NC used at reduced scale.", shapes, options);
  }
}

const routed = (result, reach = 14) => [
  ...result.shapes,
  ...result.channelPorts.flatMap(({ point, normal }) =>
    routeLine("line-process", [point, point.map((n, i) => n + normal[i] * reach)]).shapes),
];
const mounts = [];
["operator-handwheel", "operator-motor", "operator-hydraulic-cylinder"].forEach((headId, i) => {
  const x = 98 + i * 182;
  mounts.push(...routed(composeEquipment({
    type: i === 1 ? "gate-sluice" : "gate-slide", tag: `SG-10${i + 1}`, normalPosition: i === 1 ? "closed" : "open",
    failPosition: [null, "unknown", "not-applicable"][i], actuator: { headId, stemLength: [4, 10, 17][i] },
  }, { x, y: 104, s: 1.7 })), label(x, 194, byId[headId].name));
});
mounts.push(label(280, 236, "Archived drawings retain their original glyphs and channel endpoints"));
["gate-slide", "gate-sluice", "gate-flap", "weir"].forEach((id, i) => {
  const x = 77 + i * 136;
  const state = i < 2 ? { closed: true } : {};
  mounts.push(...routed(placeSymbol(id, { x, y: 276, s: 1.35 }, { ...state, convention: "legacy" })),
    ...routed(placeSymbol(id, { x, y: 340, s: 1.35 }, state)), label(x, 402, id));
});
save("02-assemblies-print", "Mounted gates and archive comparison",
  "The upper row shows handwheel, motor and hydraulic heads with distinct stems. The lower rows show archive and current geometry, with channel runs attached to the endpoints for each convention.",
  mounts, profiles.print);

const common = { unit: "m", width: 1.5, thickness: 0.12, upstreamLength: 1.9, downstreamLength: 1.9 };
const guided = { ...common, height: 1.2, leafWidth: 1.7, leafHeight: 1.3, guideTop: 2.5, guideWidth: 0.12 };
const slide = { id: "sg-201", tag: "SG-201", type: "gate-slide", installation: "channel", normalPosition: "closed",
  physical: { ...guided, maxLift: 1.2 }, designPosition: { lift: 0, unit: "m", position: "closed" },
  operatingPosition: { lift: 480, unit: "mm", position: "partial" } };
const flap = { type: "gate-flap", id: "fg-201", tag: "FG-201", installation: "wall",
  physical: { ...common, height: 1.1, wallThickness: 0.3, headerHeight: 0.45, maxAngle: 70 },
  designPosition: { angle: 0, position: "closed" }, operatingPosition: { angle: 46, position: "partial" } };
const adjustable = { type: "gate-weir-adjustable", id: "aw-201", tag: "AW-201", physical: {
  ...common, plateHeight: 1.32, minCrest: 0.42, maxCrest: 1, pocketDepth: 0.98, pocketOffset: 0.18,
  pocketWidth: 0.42, minEmbedment: 0.3,
}, designPosition: { crest: 0.42, unit: "m" }, operatingPosition: { crest: 1000, unit: "mm" } };
const butterfly = { type: "gate-butterfly", id: "bg-201", tag: "BG-201", physical: {
  ...common, bore: "circular", axis: "centred-transverse", boreDiameter: 1.3, discDiameter: 1.25,
}, designPosition: { angle: 0, position: "closed" }, operatingPosition: { angle: 90, position: "open" } };
const logs = { type: "gate-stop", id: "sl-201", tag: "SL-201", physical: { ...guided, panelHeights: [0.34, 0.38, 0.48] } };
const bulk = { type: "gate-bulkhead", id: "bp-201", tag: "BP-201", physical: { ...guided, guideTop: 1.6 },
  designPosition: { installationState: "removed" }, operatingPosition: { installationState: "installed" } };

function physical(equipment, view, stateBasis, x, y, scale, options = {}) {
  const { q, levels, labelAnchor } = options;
  return composeEquipment(equipment, { x, y, q }, { view, stateBasis, scale, levels, labelAnchor }).shapes;
}

const translation = [];
for (const [i, [basis, caption, snapshot]] of [
  ["design", "Seated · lift 0 m", slide.designPosition],
  ["operating", "Mid-travel · lift 0.48 m", slide.operatingPosition],
  ["operating", "Fully raised · lift 1.20 m", { lift: 1.2, unit: "m", position: "open" }],
].entries()) {
  const x = 99 + 181 * i;
  const equipment = { ...slide, operatingPosition: snapshot };
  translation.push(label(x, 24, caption), ...physical(equipment, "elevation", basis, x, 181, 53),
    ...physical(equipment, "section", basis, x, 319, 38),
    ...physical(equipment, "plan", basis, x, 388, 36, { labelAnchor: [x, 434] }));
}
save("03-slide-travel-print", "Guided slide gate · closed, partial and open",
  "Elevation above, longitudinal section in the middle and plan below. The leaf stays inside the full-height guides. Identical plans are expected for vertical travel.",
  translation, profiles.print);

const rotary = [];
for (const [i, [equipment, basis, caption]] of [
  [flap, "design", "Flap seated · 0°"], [flap, "operating", "Flap swung downstream · 46°"],
  [butterfly, "design", "Butterfly closed · 0°"], [butterfly, "operating", "Butterfly open · 90°"],
].entries()) {
  const x = i % 2 ? 411 : 129;
  const y = i < 2 ? 120 : 323;
  rotary.push(label(x, y - 92, caption), ...physical(equipment, "section", basis, x, y, 48),
    ...physical(equipment, "plan", basis, x, y + 56, 41, { labelAnchor: [x, y + 99] }));
}
save("04-rotary-print", "Flap hinge and butterfly disc",
  "Each column contains a longitudinal section and plan at the marked angle. The flap pivot is fixed at the downstream seat. The butterfly uses the supplied circular bore and transverse shaft arrangement.",
  rotary, profiles.print);

const removal = [];
[0, 2, 3].forEach((installedPanels, i) => {
  const x = 99 + 181 * i;
  const config = { ...logs, designPosition: { installedPanels } };
  removal.push(label(x, 26, `${installedPanels} of 3 logs installed`),
    ...physical(config, "elevation", "design", x, 155, 46),
    ...physical(config, "plan", "design", x, 211, 38));
});
for (const [i, basis] of ["design", "operating"].entries()) {
  const x = 137 + 286 * i;
  removal.push(label(x, 280, i ? "Bulkhead installed" : "Bulkhead removed"),
    ...physical(bulk, "elevation", basis, x, 379, 47));
}
save("05-removable-print", "Stop logs and removable bulkhead",
  "Stop-log elevation and plan show the supplied individual panel heights. The two bulkhead elevations show the guide location and the continuous plate when fitted.",
  removal, profiles.print);

const pocket = [];
for (const [i, basis] of ["design", "operating"].entries()) {
  const y = 159 + 204 * i;
  pocket.push(label(268, y - (i ? 111 : 128), i ? "Upper crest · 1.00 m · embedment 0.32 m" : "Lower crest · 0.42 m · embedment 0.90 m"),
    ...physical(adjustable, "section", basis, 266, y, 59, {
      labelAnchor: [266, y + 72], levels: { unit: "m", datum: "site", invertRL: 18, upstream: 19.55, downstream: 18.1, crest: true },
    }));
}
save("06-crest-pocket-print", "Adjustable crest · prescribed pocket and RLs",
  "Longitudinal sections show the same pocket at both travel limits. The levels are independent prescribed values. The drawn pocket and overlap describe an arrangement only.",
  pocket, profiles.print);

const notch = [];
[
  ["weir", { angle: 90 }, "90° V-notch"],
  ["weir-rectangular", { notchWidth: 0.58 }, "Rectangular · 0.58 m bottom"],
  ["weir-trapezoidal", { notchWidth: 0.48, sideSlope: 0.5 }, "Trapezoidal · 0.48 m bottom · 0.5H:1V"],
  ["weir-serrated", { pitch: 0.30, count: 4 }, "Serrated · 4 bays at 0.30 m pitch"],
].forEach(([type, dimensions, caption], i) => {
  const x = i % 2 ? 413 : 134;
  const y = i < 2 ? 158 : 367;
  const equipment = { type, id: `w-${i + 1}`, tag: `W-20${i + 1}`, physical: {
    ...common, crest: 0.67, notchDepth: 0.31, ...dimensions,
  } };
  notch.push(label(x, y - 126, caption), ...physical(equipment, "elevation", "design", x, y, 110));
});
save("07-fixed-notches-print", "Fixed weirs · dimensioned crest profiles",
  "Front elevations use plates 1.50 m wide, a crest 0.67 m above invert and a notch depth of 0.31 m. An even serration count puts a peak on the section centreline.",
  notch, profiles.print);
