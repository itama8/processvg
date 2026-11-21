import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { placeSymbol, SCREENING_CANDIDATES } from "../src/library.mjs";
import { render } from "../src/render.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = join(root, "review/family-08");
const evidence = join(root, "review/family-08-evidence");
execFileSync(process.execPath, [join(root, "scripts/build-family-08.mjs")]);
const scratch = mkdtempSync(join(evidence, ".chromium-"));
const { sheets } = JSON.parse(readFileSync(join(out, "fixtures.json"), "utf8"));
const sheetBody = (slug) => readFileSync(join(out, slug + ".svg"), "utf8");
const html = (basename, body, styles = "") => {
  const filename = join(scratch, basename + ".html");
  const font = new URL("../vendor/plotter/assets/fonts/CalSansVF.woff2", import.meta.url);
  writeFileSync(filename, `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:"Cal Sans";src:url("${font}");font-weight:100 900}
body{margin:0;background:#fff}svg{display:block}${styles}</style>${body}`);
  return pathToFileURL(filename).href;
};
const chrome = (...args) => execFileSync(process.env.CHROMIUM ?? "chromium", [
  "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--allow-file-access-from-files",
  "--force-color-profile=srgb", "--hide-scrollbars", `--user-data-dir=${join(scratch, "profile")}`, ...args,
], { timeout: 60000, maxBuffer: 32 * 1024 * 1024, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const variant = { variant: "candidate" };
const cell = 220;
const at = { x: cell / 2, y: cell / 2 };
const placements = [];
for (const id of Object.keys(SCREENING_CANDIDATES)) {
  for (const s of [0.95, 1.75, 3.5]) {
    for (let q = 0; q < 4; q++) {
      const { shapes, processInterfaces } = placeSymbol(id, { ...at, s, q }, variant);
      placements.push({ id, q, s, shapes, processInterfaces });
    }
  }
}
const specimen = (body) => `<svg width="${cell}" height="${cell}" viewBox="0 0 ${cell} ${cell}" fill="none" stroke="black">${body}</svg>`;
const gridStyle = `.grid{display:grid;grid-template-columns:repeat(12,${cell}px)}.grid path,.grid circle{vector-effect:non-scaling-stroke}`;
const withIdentities = placements.map(({ shapes }) => specimen(render(shapes))).join("");
const nativeBodies = new Map(Object.keys(SCREENING_CANDIDATES).map((id) => [id,
  render(placeSymbol(id, {}, variant).shapes.filter(({ identityInk }) => !identityInk))]));
const direct = placements.map(({ id, q, s }) => specimen(`<g transform="translate(${at.x} ${at.y}) rotate(${q * 90}) scale(${s})">${nativeBodies.get(id)}</g>`)).join("");
const baked = placements.map(({ shapes }) => specimen(render(shapes.filter(({ identityInk }) => !identityInk)))).join("");

function inspect(cases, sheets, cell) {
  const problems = [];
  let terminals = 0, driveMarks = 0;
  const fits = ({ x, y, width, height }, w, h) => x >= 0 && y >= 0 && x + width <= w && y + height <= h;
  const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  for (const [i, svg] of [...document.querySelectorAll(".grid > svg")].entries()) {
    const { id, s, q, processInterfaces, identityBounds } = cases[i];
    const name = `${id} at ${q * 90}° scale ${s}`;
    const geometry = [...svg.querySelectorAll("[data-plotter-role] :is(path,circle)")];
    for (const node of geometry) {
      if (!fits(node.getBBox(), cell, cell) || (node.tagName === "path" && !node.getTotalLength())) problems.push(name + " clipped or invalid geometry");
    }
    for (const { id, point: [x, y] } of processInterfaces) {
      terminals++;
      const probes = [[x, y], [x - 0.04, y], [x + 0.04, y], [x, y - 0.04], [x, y + 0.04]];
      if (!geometry.some((node) => probes.some(([a, b]) => node.isPointInStroke(new DOMPoint(a, b))))) problems.push(name + " detached " + id);
    }
    for (const [index, node] of [...svg.querySelectorAll("[data-processvg-identity]")].entries()) {
      driveMarks++;
      const bounds = node.getBBox(), matrix = node.transform.baseVal.consolidate().matrix;
      const observed = [bounds.x * matrix.a + matrix.e, bounds.y * matrix.d + matrix.f,
        (bounds.x + bounds.width) * matrix.a + matrix.e, (bounds.y + bounds.height) * matrix.d + matrix.f];
      if (matrix.b !== 0 || matrix.c !== 0 || observed.some((v, axis) => Math.abs(v - identityBounds[index][axis]) > 0.12)) {
        problems.push(name + " incorrect upright drive mark");
      }
    }
  }
  for (const [i, section] of [...document.querySelectorAll(".sheets > section")].entries()) {
    const { slug, width, height, theme, profile } = sheets[i];
    const svg = section.querySelector("svg");
    const color = profile === "print" ? "rgb(0, 0, 0)" : theme === "dark" ? "rgb(237, 237, 237)" : "rgb(23, 23, 23)";
    if (getComputedStyle(svg).color !== color) problems.push(slug + " wrong ink");
    const primary = [...svg.querySelectorAll('[data-plotter-role="primary"] :is(path,circle)')];
    for (const node of svg.querySelectorAll("[data-plotter-role], [data-processvg-identity]")) {
      const secondary = node.dataset.plotterRole === "secondary";
      if (+getComputedStyle(node).opacity !== (secondary && profile !== "print" ? 0.32 : 1)) problems.push(slug + " wrong ink hierarchy");
    }
    for (const node of svg.querySelectorAll("[data-plotter-role] :is(path,circle)")) {
      if (!fits(node.getBBox(), width, height)) problems.push(slug + " clipped geometry");
    }
    const labels = [...svg.querySelectorAll("text")];
    labels.forEach((node, index) => {
      const a = node.getBBox();
      if (!fits(a, width, height)) problems.push(slug + " clipped " + node.textContent);
      for (const other of labels.slice(index + 1)) {
        if (overlap(a, other.getBBox())) problems.push(slug + " labels overlap " + node.textContent + " / " + other.textContent);
      }
      for (const ink of primary) {
        const b = ink.getBBox();
        if (!overlap(a, { x: b.x - 0.5, y: b.y - 0.5, width: b.width + 1, height: b.height + 1 })) continue;
        let touches = false;
        for (let y = a.y + 1; y < a.y + a.height - 1 && !touches; y += 0.7) {
          for (let x = a.x + 0.5; x < a.x + a.width - 0.5 && !touches; x += 0.7) touches = ink.isPointInStroke(new DOMPoint(x, y));
        }
        if (touches) problems.push(slug + " primary ink touches " + node.textContent);
      }
    });
  }
  document.body.innerHTML = "<pre id=result></pre>";
  document.querySelector("#result").textContent = JSON.stringify({ placements: cases.length, terminals, driveMarks, sheets: sheets.length, problems });
}
try {
  const cases = placements.map(({ shapes, ...row }) => ({ ...row, identityBounds: shapes.filter(({ identityInk }) => identityInk).map(({ bounds }) => bounds) }));
  const inspectPage = html("inspect", `<div class="grid">${withIdentities}</div>
<div class="sheets">${sheets.map(({ slug }) => "<section>" + sheetBody(slug) + "</section>").join("")}</div>
<script>document.fonts.ready.then(()=>(${inspect})(${JSON.stringify(cases)},${JSON.stringify(sheets)},${cell}))</script>`, gridStyle);
  const dom = chrome("--dump-dom", "--virtual-time-budget=5000", inspectPage);
  const matched = dom.match(/<pre id="result">(.*?)<\/pre>/s);
  if (!matched) throw new Error("Chromium did not return a screening inspection report");
  const report = JSON.parse(matched[1].replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">"));
  writeFileSync(join(evidence, "layout.json"), JSON.stringify(report, null, 2) + "\n");
  if (report.problems.length) throw new Error(report.problems.join("\n"));

  for (const [name, body] of [["native", direct], ["baked", baked]]) {
    const url = html(name, `<div class="grid">${body}</div>`, gridStyle);
    chrome(`--window-size=${cell * 12},${cell * 21}`, `--screenshot=${join(scratch, name + ".png")}`, url);
  }
  const columns = 12, width = cell * columns, height = cell * 21;
  const pixels = (name) => execFileSync("magick", [join(scratch, name + ".png"), "-colorspace", "gray", "-depth", "8", "gray:-"],
    { maxBuffer: 32 * 1024 * 1024 });
  const nativePixels = pixels("native"), bakedPixels = pixels("baked");
  if (nativePixels.length !== width * height || bakedPixels.length !== width * height) throw new Error("Unexpected raster dimensions");
  report.rasterCases = placements.map(({ id, q, s }, index) => {
    const x0 = (index % columns) * cell, y0 = Math.floor(index / columns) * cell;
    let significantPixels = 0, inkPixels = 0;
    for (let y = y0; y < y0 + cell; y++) {
      for (let i = y * width + x0; i < y * width + x0 + cell; i++) {
        if (nativePixels[i] < 245) inkPixels++;
        if (Math.abs(nativePixels[i] - bakedPixels[i]) >= 35) significantPixels++;
      }
    }
    if (inkPixels < 16) throw new Error(`Blank raster: ${id} q=${q} s=${s}`);
    return { id, q, s, significantPixels, inkPixels };
  });
  for (const { id, q, s, significantPixels, inkPixels } of report.rasterCases) {
    // Decimal coordinate rounding and Chromium's two arc-flattening paths can move antialias pixels.
    if (significantPixels > Math.max(18, Math.ceil(inkPixels * 0.05))) report.problems.push(`Raster mismatch: ${id} q=${q} s=${s} (${significantPixels}/${inkPixels})`);
  }
  writeFileSync(join(evidence, "layout.json"), JSON.stringify(report, null, 2) + "\n");
  if (report.problems.length) throw new Error(report.problems.join("\n"));

  for (const { slug, width, height } of sheets) {
    chrome(`--window-size=${width},${height + 100}`, `--screenshot=${join(evidence, slug + ".png")}`, html(slug, sheetBody(slug)));
  }
  const nominal = sheets.find(({ slug }) => slug === "01-candidates-nominal-light");
  chrome("--force-device-scale-factor=2", `--window-size=${nominal.width},${nominal.height}`,
    `--screenshot=${join(evidence, "candidates-nominal-2x.png")}`, html("nominal-2x", sheetBody(nominal.slug)));
  const printSheets = sheets.filter(({ profile }) => profile === "print");
  const printPage = html("print", printSheets.map(({ slug }) => "<section>" + sheetBody(slug) + "</section>").join(""),
    "@page{size:860px 735px;margin:0}section{break-after:page}section:last-child{break-after:auto}body{print-color-adjust:exact}");
  const pdf = join(evidence, "family-08-print.pdf");
  chrome("--no-pdf-header-footer", `--print-to-pdf=${pdf}`, printPage);
  execFileSync("pdftoppm", ["-r", "96", "-gray", "-png", pdf, join(evidence, "print-gray")]);
  console.log(`Family 08 Chromium: ${report.placements} placements / pixel comparisons, ${report.terminals} terminal probes, ${report.driveMarks} drive marks, ${report.sheets} sheets`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
