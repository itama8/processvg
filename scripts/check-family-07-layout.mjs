import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SYMBOLS, placeSymbol } from "../src/library.mjs";
import { render } from "../src/render.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const target = join(root, "review/family-07-evidence");
execFileSync(process.execPath, ["scripts/build-family-07.mjs"], { cwd: root });
const scratch = mkdtempSync(join(target, ".chromium-"));
const { evidence } = JSON.parse(readFileSync(join(root, "review/family-07/fixtures.json"), "utf8"));
const font = new URL("../vendor/plotter/assets/fonts/CalSansVF.woff2", import.meta.url);
const card = (name) => `<section data-sheet="${name}">${readFileSync(join(target, "svg", name + ".svg"), "utf8")}</section>`;
const styles = `@font-face{font-family:"Cal Sans";src:url("${font}");font-weight:100 900}
body{margin:0;background:white}svg{display:block}section{width:560px;height:440px}
@media print{@page{size:560px 440px;margin:0}section{break-after:page}section:last-child{break-after:auto}
body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}`;
const page = (name, body) => {
  const file = join(scratch, name + ".html");
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${styles}</style>${body}`);
  return pathToFileURL(file).href;
};
const chrome = (...args) => execFileSync(process.env.CHROMIUM ?? "chromium", [
  "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--allow-file-access-from-files",
  "--force-color-profile=srgb", `--user-data-dir=${join(scratch, "profile")}`, ...args,
], { timeout: 45000, maxBuffer: 32 * 1024 * 1024, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const placements = [];
const cases = [];
for (const { id, pump } of SYMBOLS.filter((item) => item.pump)) {
  for (const variant of Object.keys(pump.variants)) {
    for (const s of [1.5, 0.825]) {
      for (let q = 0; q < 4; q++) {
        const { shapes, interfaces } = placeSymbol(id, { x: 45, y: 45, q, s }, { variant });
        // Archival dosing follows its original fixed label attachment during rotation.
        const upright = variant !== pump.archiveVariant ? shapes.filter((shape) => shape.identityInk).map(({ bounds, identityInk }) => ({ bounds, label: identityInk })) : [];
        cases.push({ id, variant, q, s, ports: interfaces.filter((p) => p.visible), upright });
        placements.push(`<svg data-placement="" width="90" height="90" viewBox="0 0 90 90" fill="none"
          stroke="black" stroke-width="1" style="font-family:Cal Sans,sans-serif">${render(shapes)}</svg>`);
      }
    }
  }
}

async function inspect(cases) {
  await document.fonts.ready;
  const errors = [], lobeGaps = [];
  let anchors = 0, glyphs = 0;
  const near = (a, b, tolerance = 0.025) => Math.abs(a - b) <= tolerance;
  const inStroke = (node, x, y) => node.isPointInStroke(new DOMPoint(x, y));
  function fits(node, width, height) {
    const { x, y, width: w, height: h } = node.getBBox();
    return x >= 0 && y >= 0 && x + w <= width && y + h <= height;
  }
  const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width &&
    a.y < b.y + b.height && b.y < a.y + a.height;
  function samples(path) {
    const length = path.getTotalLength();
    return Array.from({ length: Math.ceil(length / 0.12) }, (_, i) => path.getPointAtLength(i * 0.12));
  }
  function distance(a, b) {
    let minSquared = Infinity;
    for (const { x, y } of a) {
      for (const point of b) minSquared = Math.min(minSquared, (x - point.x) ** 2 + (y - point.y) ** 2);
    }
    return Math.sqrt(minSquared);
  }

  for (const section of document.querySelectorAll("section")) {
    const name = section.dataset.sheet;
    const svg = section.querySelector("svg");
    const print = name.endsWith("-print");
    const expectedInk = print ? "rgb(0, 0, 0)" : name.endsWith("-dark") ? "rgb(237, 237, 237)" : "rgb(23, 23, 23)";
    if (getComputedStyle(svg).color !== expectedInk) errors.push(name + ": wrong profile ink");
    for (const node of svg.querySelectorAll("[data-plotter-role]")) {
      const expectedOpacity = print || node.dataset.plotterRole === "primary" ? 1 : 0.32;
      if (+getComputedStyle(node).opacity !== expectedOpacity) errors.push(name + ": wrong role opacity");
    }
    const ink = [...svg.querySelectorAll("[data-plotter-role] :is(path,circle)")];
    const texts = [...svg.querySelectorAll("text")];
    for (const [i, node] of texts.entries()) {
      if (!fits(node, 560, 440)) errors.push(name + ": clipped " + node.textContent);
      for (const other of texts.slice(i + 1)) {
        if (overlap(node.getBBox(), other.getBBox())) errors.push(name + ": overlapping " + node.textContent + " / " + other.textContent);
      }
      // The archived dosing preset has fixed-size text and retains its original reduced-scale overlap.
      if (/^(01-pumps|02-drives-accessories|05-physical)/.test(name) && !node.closest("[data-archive-dosing]")) {
        const box = node.getBBox();
        const nearby = ink.filter((item) => {
          const { x, y, width, height } = item.getBBox();
          return overlap(box, { x: x - 0.5, y: y - 0.5, width: width + 1, height: height + 1 });
        });
        let touches = false;
        for (let x = box.x; x <= box.x + box.width && !touches; x += 0.3) {
          for (let y = box.y; y <= box.y + box.height && !touches; y += 0.3) {
            touches = nearby.some((item) => inStroke(item, x, y));
          }
        }
        if (touches) errors.push(name + ": drawing ink touches label " + node.textContent);
      }
    }
    for (const node of ink) {
      if (!fits(node, 560, 440)) errors.push(name + ": clipped artwork");
    }
    for (const group of section.querySelectorAll('[data-lobe]:not([data-lobe="legacy"])')) {
      const [shell, first, second] = [...group.querySelectorAll("path")].map(samples);
      const casing = Math.min(distance(shell, first), distance(shell, second));
      const rotorPair = distance(first, second);
      lobeGaps.push({ sheet: name, variant: group.dataset.lobe, q: +group.dataset.q, casing, rotorPair });
      if (casing < 1.65 || rotorPair < 1.65) errors.push(name + ": insufficient lobe separation");
    }
  }

  for (const [i, svg] of [...document.querySelectorAll("[data-placement]")].entries()) {
    const { id, variant, q, s, ports, upright } = cases[i];
    const name = `${id}/${variant} q=${q} scale=${s}`;
    const geometry = [...svg.querySelectorAll("[data-plotter-role] :is(path,circle)")];
    for (const node of geometry) {
      if (!fits(node, 90, 90)) errors.push(name + ": clipped artwork");
      if (node.tagName === "path" && node.getTotalLength() === 0) errors.push(name + ": path failed to parse");
    }
    for (const { id: portId, point: [x, y] } of ports) {
      anchors++;
      if (!geometry.some((node) => inStroke(node, x, y))) errors.push(name + ": detached " + portId);
    }
    const text = svg.querySelectorAll("[data-processvg-identity]");
    for (const [index, { bounds, label }] of upright.entries()) {
      glyphs++;
      const node = text[index];
      if (!node) { errors.push(name + ": missing glyph " + label); continue; }
      const box = node.getBBox();
      const matrix = node.getCTM();
      const corners = [[box.x, box.y], [box.x + box.width, box.y + box.height]];
      const measured = corners.flatMap(([x, y]) => {
        const point = new DOMPoint(x, y).matrixTransform(matrix);
        return [point.x, point.y];
      });
      if (node.getAttribute("aria-label") !== label || matrix.b !== 0 || matrix.c !== 0 ||
          measured.some((value, axis) => !near(value, bounds[axis]))) errors.push(name + ": moved glyph " + label);
      const [left, top, right, bottom] = measured;
      for (let x = left; x <= right; x += 0.3) {
        for (let y = top; y <= bottom; y += 0.3) {
          if (geometry.some((path) => inStroke(path, x, y))) {
            errors.push(name + ": glyph bounds touch body ink " + label);
            x = right;
            break;
          }
        }
      }
    }
  }
  return { sheets: document.querySelectorAll("section").length, cases: cases.length, anchors, glyphs, lobeGaps, errors };
}

try {
  const plotter = [];
  for (const name of evidence) {
    const file = join(target, "svg", name + ".svg");
    execFileSync("xmllint", ["--noout", file]);
    execFileSync("rsvg-convert", [file, "-o", join(scratch, "parser.png")]);
    if (!name.endsWith("-print")) plotter.push(execFileSync("python3", ["vendor/plotter/scripts/check.py", file],
      { cwd: root, encoding: "utf8" }).trim());
  }
  const metricUrl = page("metrics", evidence.map(card).join("") + placements.join("") + `<pre id="results"></pre><script>
    (${inspect})(${JSON.stringify(cases)}).then(
      (result)=>document.querySelector("#results").textContent=btoa(JSON.stringify(result)),
      (error)=>document.querySelector("#results").textContent=String(error));</script>`);
  const dom = chrome("--virtual-time-budget=10000", "--dump-dom", metricUrl);
  const encoded = dom.match(/<pre id="results">([A-Za-z0-9+/=]+)<\/pre>/)?.[1];
  if (!encoded) throw new Error("Chromium report missing: " + dom.match(/<pre id="results">([^<]*)/)?.[1]);
  const report = JSON.parse(Buffer.from(encoded, "base64").toString());
  const warnings = plotter.filter((line) => /WARN/.test(line));
  writeFileSync(join(target, "layout.json"), JSON.stringify({ ...report, warnings }, null, 2) + "\n");

  const sheets = evidence.filter((name) => name.endsWith("-nominal-light")).map((name) => name.replace(/-nominal-light$/, ""));
  for (const sheet of sheets) {
    for (const profile of ["light", "dark"]) {
      const pair = ["nominal", "reduced"].map((size) => card(`${sheet}-${size}-${profile}`)).join("");
      chrome("--hide-scrollbars", "--window-size=1120,440", `--screenshot=${join(target, `${sheet}-${profile}.png`)}`,
        page(`${sheet}-${profile}`, `<main style="display:flex">${pair}</main>`));
    }
  }
  const paper = evidence.filter((name) => name.endsWith("-print"));
  const pdf = join(target, "family-07-print.pdf");
  chrome("--no-pdf-header-footer", `--print-to-pdf=${pdf}`, page("print", paper.map(card).join("")));
  execFileSync("pdftoppm", ["-r", "96", "-gray", "-png", pdf, join(target, "print")], { timeout: 20000 });
  writeFileSync(join(target, "print-pages.json"), JSON.stringify(paper, null, 2) + "\n");

  if (report.errors.length) throw new Error(report.errors.slice(0, 35).join("\n") + `\n${report.errors.length} layout errors`);
  console.log(`Chromium: ${report.sheets} sheets, ${report.cases} rotations and scales, ${report.anchors} visible anchor contacts, ${report.glyphs} upright glyph placements, ${report.lobeGaps.length} lobe comparisons. Plotter: ${warnings.length} warnings. Print: ${paper.length} rasterized pages.`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
