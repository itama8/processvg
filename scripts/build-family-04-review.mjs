#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as current from "../src/library.mjs";
import { routeLine } from "../src/lines.mjs";
import { render, svgDoc } from "../src/render.mjs";

const base = "a10f64e8c245090bbf28328774092caa91082dce";
const referenceReview = "bcb662ccf4bdda859c43460b95c8d5cffc8620a2";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = new URL("../review/family-04/", import.meta.url);
const scratch = mkdtempSync(join(tmpdir(), "processvg-family-04-base-"));
const print = { profile: "print" };
const label = (x, y, text) => ({ t: [x, y, text] });
const sheets = [];

function save(id, title, description, shapes) {
  const file = `08-${id}-print.svg`;
  writeFileSync(new URL(file, out), svgDoc(`f04-${id}`, title, description, render(shapes, print), print));
  sheets.push({ file, title, description });
}

function routed(result, directionPort, showArrow = true) {
  return [
    ...result.shapes,
    ...result.channelPorts.flatMap((port) => {
      const { point, normal } = port;
      const end = point.map((v, i) => v + (port === directionPort ? 64 : 27) * normal[i]);
      return port === directionPort && showArrow ? routeLine("line-flow", [end, point]).shapes :
        routeLine("line-process", [point, end]).shapes;
    }),
  ];
}

function schematic(api, x, s) {
  const valve = api.placeSymbol("valve-check", { x: x - 53, y: 90, s });
  const flap = api.composeEquipment({ type: "gate-flap", tag: "FG-201", normalPosition: "closed" }, { x: x + 53, y: 90, s });
  const turned = api.composeEquipment({ type: "gate-flap" }, { x, y: 204, q: 2, s });
  const penstock = api.composeEquipment({
    type: "gate-sluice", tag: "SG-101", installation: "wall", normalPosition: "closed", designDirection: "out-to-in",
    actuator: { headId: "operator-motor", stemLength: 14 },
  }, { x, y: 366, s });
  const logs = api.composeEquipment({ type: "gate-stop", designPosition: { installedPanels: 2 } }, { x, y: 268, s });
  return [
    label(x - 53, 65, "Pipe check"), label(x + 53, 65, "Flap gate"),
    ...routed({ ...valve, channelPorts: valve.processPorts }), ...routed(flap),
    label(x, 174, "Flap gate turned 180°"), ...routed(turned),
    label(x, 244, "Stop logs, inventory unspecified"), ...logs.shapes,
    ...routed(penstock, penstock.designFlow?.from ?? penstock.channelPorts[1], Boolean(penstock.designFlow)),
    label(x, 429, "Wall penstock, shown schematically"),
  ];
}

const physical = { unit: "m", width: 1.5, thickness: 0.1, crest: 1.2, notchDepth: 0.25,
  pitch: 0.4, count: 2, upstreamLength: 1.15, downstreamLength: 1.15 };
const levels = { unit: "mm", datum: "Site", invertRL: 1000, upstream: 3020, downstream: 1250, crest: true, precision: 0 };
const serrated = { type: "weir-serrated", tag: "W-203", physical };

function section(api, x, y, scale, config) {
  return api.composeEquipment(config, { x, y }, {
    view: "section", stateBasis: "design", scale, levels, labelAnchor: [x, y + 14],
  }).shapes;
}

function physicalColumn(api, x, scale) {
  const shapes = [
    label(x, 69, "Longitudinal section through centre peak"),
    ...section(api, x - 56, 171, scale, serrated),
    label(x, 202, "Short section reaches the plate edge"),
  ];
  const short = { ...serrated, physical: { ...physical, upstreamLength: 0.12, downstreamLength: physical.thickness } };
  try {
    shapes.push(...section(api, x - 46, 307, scale, short));
  } catch (error) {
    if (api === current || error.message !== "Invalid level annotation or drawing transform") throw error;
    shapes.push(label(x, 272, "Level callout rejected by base"), label(x, 293, "Section span below 10 sheet units"));
  }
  shapes.push(label(x, 340, "Front elevation, same plate and datum"),
    ...api.composeEquipment(serrated, { x: x - 28, y: 413 }, {
      view: "elevation", stateBasis: "design", scale,
      levels: { ...levels, upstream: undefined, downstream: undefined }, labelAnchor: [x - 28, 429],
    }).shapes);
  return shapes;
}

function loadSnapshot(commit) {
  const directory = join(scratch, commit);
  mkdirSync(directory);
  const snapshot = execFileSync("git", ["archive", commit, "src"], { cwd: root });
  execFileSync("tar", ["-x", "-C", directory], { input: snapshot });
  return import(pathToFileURL(join(directory, "src/library.mjs")));
}

try {
  const beforeLevels = await loadSnapshot(base);
  const beforeSchematic = await loadSnapshot(referenceReview);
  mkdirSync(out, { recursive: true });
  for (const [size, s, scale] of [["nominal", 1.6, 40], ["reduced", 0.65, 25]]) {
    const after = label(417, 25, "Final handoff · revision 03");
    save(`schematic-${size}`, `Schematic · ${size} (${s}× glyphs)`,
      "Revision 03 assigns the same schematic glyph to the flap gate and pipe check. The FG tag and legend identify the flap, and its hinged leaf appears in physical views. Stop-log counts and the declared penstock direction carry through from the reference review.",
      [label(140, 25, "Before · bcb662c"), after, ...schematic(beforeSchematic, 140, s), ...schematic(current, 417, s)]);
    save(`levels-${size}`, `Physical projections · ${size} (${scale} sheet units/m)`,
      "Design sections and front elevation use the same two-bay plate, invert RL +1000 mm and notch root 1.20 m above invert. The longitudinal centreline cuts a peak at RL +2450 mm. Water levels are prescribed.",
      [label(140, 25, "Before · a10f64e"), after, ...physicalColumn(beforeLevels, 120, scale), ...physicalColumn(current, 397, scale)]);
  }
  const cards = sheets.map(({ file, title, description }) =>
    `<figure><img src="family-04/${file}" alt="${title}"><figcaption><strong>${title}</strong><p>${description}</p></figcaption></figure>`);
  writeFileSync(new URL("../family-04-reference-review.html", out), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Family 04 reference review</title>
<style>
body{color:#181818;background:#fff;font:16px/1.5 system-ui,sans-serif;max-width:1160px;margin:2rem auto;padding:0 1rem}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 500px),1fr));gap:1rem}
figure{margin:0;border:1px solid #ccc;break-inside:avoid}img{display:block;width:100%}figcaption{padding:0 1rem}
</style>
<h1>Family 04 gate and weir reference review</h1>
<p>Schematic comparisons use <code>${referenceReview}</code> as the baseline. Physical comparisons use <code>${base}</code> to show the retained level callout fixes. Final renders use the current checkout.</p>
<p><a href="../docs/family-04.md#final-handoff-reconciliation">Source decisions and limits</a> ·
<a href="family-04-evidence/gates-print.pdf">Chromium print sheets</a> ·
<a href="index.html">Full gallery</a></p>
<main>${cards.join("\n")}</main></html>
`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
