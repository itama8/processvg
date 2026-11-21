#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const base = "86a568776ba41c25024a576640d4e267823b8b30";
const root = fileURLToPath(new URL("../", import.meta.url));
const gallery = join(root, "review/family-03");
const snapshot = mkdtempSync(join(tmpdir(), "processvg-family-03-base-"));
const label = (x, y, value) => ({ t: [x, y, value] });
const path = (...points) => ({ d: "M" + points.map((point) => point.join(" ")).join(" L") });

async function fixtures(source, revision) {
  const read = (name) => import(pathToFileURL(join(source, "src", name)).href);
  const { composeActuator, composeValve, placeOperatingValve, placePoint } = await read("library.mjs");
  const { routeLine } = await read("lines.mjs");
  const { render, svgDoc } = await read("render.mjs");
  const write = (name, desc, shapes, print) => {
    const profile = print ? { profile: "print" } : { theme: "light" };
    const id = `comparison-${name}-${revision}-${print ? "print" : "screen"}`;
    const ink = render(shapes, profile).replace(/\bprocessvg-knockout-\d+\b/g, (mask) => `${id}-${mask}`);
    writeFileSync(join(gallery, id + ".svg"), svgDoc(id, `${name} · ${revision}`, desc, ink, profile));
    return id;
  };

  const geometry = [];
  for (const [row, [s, renderScale]] of [[1.25, 1], [0.62, 0.65]].entries()) {
    const y = 110 + 201 * row;
    geometry.push(label(280, y - 76, row ? "Reduced symbol · 0.62×" : "Nominal symbol · 1.25×"));
    for (const [col, [q, headId]] of [[1, "operator-lever"], [1, "operator-float"], [2, "operator-pneumatic-cylinder"]].entries()) {
      const at = { x: 98 + col * 178, y, q, s };
      const { shapes, externalIdentifier } = composeActuator(
        { point: [0, 0], normal: [0, -1] },
        { headId, headOrientation: "upright", stemLength: 0 }, at, { renderScale },
      );
      const local = [[-25, 0], [25, 0], [25, 22], [-25, 22], [-25, 0]];
      geometry.push(path(...local.map((point) => placePoint(point, at))), ...shapes);
      geometry.push(label(at.x, y + 73, externalIdentifier ?? ["Upright lever", "Upright float", "Reversed upright cylinder"][col]));
    }
  }

  const aux = [label(280, 28, "Air pilot, command and open/closed feedback")];
  for (const [col, s] of [1.25, 0.62].entries()) {
    const x = 146 + col * 275, y = 293;
    const config = { bodyId: "valve-ball", tag: "HV-301", normalPosition: "open",
      operatingPosition: { position: "closed", openingPercent: 0 },
      failPosition: "closed", failEvent: "loss of air", labelAnchor: [x, 325],
      actuator: { headId: "operator-pneumatic-cylinder", controlMode: "on-off" } };
    const host = (col ? placeOperatingValve : composeValve)(config, { x, y, s });
    const stemTap = [x, (host.anchors.head.point[1] + host.anchors.mount.point[1]) / 2];
    const airInlet = [x, host.anchors.head.point[1] - 14 * s];
    const pilotAt = { x: x - 58, y: 161, s: 1.25 };
    const pilot = composeValve({ bodyId: "valve-3way", actuator: { headId: "operator-solenoid" } }, pilotAt);
    const [airSupply, airOutlet, exhaust] = pilot.processPorts.map(({ point }) => point);
    const pilotCommand = [pilotAt.x, pilot.anchors.head.point[1] - 12 * pilotAt.s];
    const route = (id, ...points) => routeLine(id, points).shapes;
    aux.push(label(x, 53, col ? "Operating snapshot · 0.62×" : "Normal design · 1.25×"),
      ...host.shapes, ...pilot.shapes,
      ...host.processPorts.flatMap(({ point: [px, py], normal: [nx, ny] }) =>
        route("line-process", [px, py], [px + 44 * nx, py + 44 * ny])),
      ...route("line-pneumatic", [x - 118, pilotAt.y], airSupply),
      ...route("line-pneumatic", airOutlet, [x, pilotAt.y], airInlet),
      ...route("line-pneumatic", exhaust, [pilotAt.x, 209]),
      ...route("line-electric", [pilotAt.x, 92], pilotCommand),
      label(x - 110, 151, "IAS"), label(pilotAt.x, 82, "Command"), label(pilotAt.x, 223, "Exhaust"));
    aux.push(path(stemTap, [x + 90, stemTap[1]]));
    for (const [index, name] of ["ZSO", "ZSC"].entries()) {
      const fx = x + 46 + index * 44, fy = 220;
      aux.push(path([fx, stemTap[1]], [fx, fy + 15]),
        { c: [fx, fy, 15] }, label(fx, fy + 3, name),
        ...route("line-electric", [fx, fy - 15], [fx, 112]),
        label(fx, 103, index ? "Closed" : "Open"));
    }
  }
  aux.push(label(280, 417, "IAS · instrument air supply     ZSO / ZSC · open / closed position switches"));
  const motor = [label(280, 36, "Motor power and command use separately identified links")];
  for (const [col, s] of [1.25, 0.62].entries()) {
    const x = 145 + col * 270, y = 287;
    const valve = composeValve({
      bodyId: "valve-gate", tag: "MOV-301", normalPosition: "closed",
      failPosition: "last", failEvent: "loss of power",
      actuator: { headId: "operator-motor" },
      endConnections: { in: { type: "flanged" }, out: { type: "flanged" } },
    }, { x, y, s }, { closedStyle: col ? "label" : "auto" });
    const [, headY] = valve.anchors.head.point;
    const centerY = headY - 7 * s;
    // This fixture uses two electrical links with explicit functions. The library
    // does not infer the service, route, or attachment points from the M glyph.
    motor.push(label(x, 82, col ? "Reduced · 0.62×" : "Nominal · 1.25×"), ...valve.shapes,
      ...valve.processPorts.flatMap(({ point: [px, py], normal: [nx, ny] }) =>
        routeLine("line-process", [[px, py], [px + 48 * nx, py + 48 * ny]]).shapes),
      { ...path([x - 100, centerY - 4], [x - 94, centerY], [x - 100, centerY + 4]), role: "secondary" },
      { ...path([x - 94, centerY], [x - 7 * s, centerY]), role: "secondary" },
      ...routeLine("line-electric", [[x, headY - 14 * s], [x, 151]]).shapes,
      label(x - 68, centerY - 11, "ES · Power supply"), label(x, 141, "Open/close command"));
  }
  const entries = [];
  for (const [name, desc, shapes] of [
    ["mounting", "Zero requested reach on a flat host face. The first two examples turn sideways, and the third uses a return jog.", geometry],
    ["auxiliaries", "Study circuit with a separate solenoid pilot. Dashed command and feedback routes are distinct from paired-slash air and solid mechanical links. Pilot and feedback endpoints are explicit study inputs.", aux],
    ["motor", "The forked ES supply line is distinct from the dashed command. The motor stem is a solid connection to the process valve body.", motor],
  ]) {
    entries.push({ name, screen: write(name, desc, shapes, false), print: write(name, desc, shapes, true) });
  }
  return entries;
}

try {
  mkdirSync(gallery, { recursive: true });
  const archive = execFileSync("git", ["archive", base, "src"], { cwd: root });
  execFileSync("tar", ["-x", "-C", snapshot], { input: archive });
  const before = await fixtures(snapshot, "before");
  const after = await fixtures(root, "after");
  const sections = before.map(({ name }, index) => {
    const title = { mounting: "Mounting clearance", auxiliaries: "Auxiliary and feedback routing", motor: "Motor power and command" }[name];
    const cards = [before[index], after[index]].map(({ screen, print }, side) => `<figure>
      <figcaption>${side ? "Reviewed implementation" : "First-pass implementation"} · <a href="${print}.svg">Print SVG</a></figcaption>
      ${readFileSync(join(gallery, screen + ".svg"), "utf8")}
    </figure>`).join("");
    return `<section><h2>${title}</h2><div class="pair">${cards}</div></section>`;
  }).join("");
  writeFileSync(join(gallery, "index.html"), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Family 03 actuator review</title>
<style>
@font-face{font-family:"Cal Sans";src:url("../../vendor/plotter/assets/fonts/CalSansVF.woff2")}
body{font:16px/1.5 system-ui,sans-serif;margin:2rem auto;padding:0 1rem;max-width:1160px;color:#171717;background:#fff}
h1,h2{line-height:1.2} h2{font-size:1.2rem;margin-top:2rem}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(480px,100%),1fr));gap:1rem}
figure{margin:0;border:1px solid #ddd}figcaption{padding:.5rem 1rem}
figure svg{display:block;width:100%;height:auto}
</style>
<h1>Family 03 actuator review</h1>
<p>Both columns use the same declarations. The first pass renders from <code>${base.slice(0, 12)}</code>.
<a href="../../docs/family-03-review.md">Review decisions and sources</a> · <a href="../index.html">Full drawing gallery</a></p>
${sections}
</html>
`);
  console.log("review/family-03/index.html");
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
