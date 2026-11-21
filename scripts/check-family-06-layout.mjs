import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const gallery = join(root, "review/family-06");
const evidence = join(root, "review/family-06-evidence");
const font = new URL("../vendor/plotter/assets/fonts/CalSansVF.woff2", import.meta.url);
execFileSync(process.execPath, ["scripts/build-family-06.mjs"], { cwd: root });
mkdirSync(evidence, { recursive: true });
const scratch = mkdtempSync(join(evidence, ".chrome-"));
const { sheets } = JSON.parse(readFileSync(join(gallery, "contract.json"), "utf8"));
const names = Object.keys(sheets);
const styles = `@font-face{font-family:"Cal Sans";src:url("${font}");font-weight:100 900}
body{margin:0;background:white}svg{display:block}section{width:560px;height:440px}
@media print{@page{size:560px 440px;margin:0}section{break-after:page}
section:last-child{break-after:auto}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}`;
const card = (id) => `<section data-sheet="${id}">${readFileSync(join(gallery, id + ".svg"), "utf8")}</section>`;
const page = (name, body) => {
  const path = join(scratch, `${name}.html`);
  writeFileSync(path, `<!doctype html><meta charset="utf-8"><style>${styles}</style>${body}`);
  return pathToFileURL(path).href;
};
const chromium = (...args) => execFileSync(process.env.CHROMIUM ?? "chromium", [
  "--headless", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files",
  "--force-color-profile=srgb", `--user-data-dir=${join(scratch, "profile")}`, ...args,
], { timeout: 45000, maxBuffer: 24 * 1024 * 1024, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

async function inspect(contract) {
  await document.fonts.ready;
  const overlap = (a, b) => a[0] < b[2] && a[1] < b[3] && a[2] > b[0] && a[3] > b[1];
  const expand = (b, n) => b.map((v, i) => v + (i < 2 ? -n : n));
  const same = (a, b, tolerance = 0.03) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
  function box(node, svg) {
    const { x, y, width, height } = node.getBBox();
    const matrix = svg.getScreenCTM().inverse().multiply(node.getScreenCTM());
    return [new DOMPoint(x, y), new DOMPoint(x + width, y + height)]
      .flatMap((p) => { const { x, y } = p.matrixTransform(matrix); return [x, y]; });
  }

  return [...document.querySelectorAll("section")].map((section) => {
    const id = section.dataset.sheet;
    const svg = section.querySelector("svg");
    const { labels, rotations } = contract[id];
    const errors = [];
    const expectedInk = id.endsWith("dark") ? "rgb(237, 237, 237)" : id.endsWith("print") ? "rgb(0, 0, 0)" : "rgb(23, 23, 23)";
    if (getComputedStyle(svg).color !== expectedInk) errors.push("Profile ink differs");
    const identity = [...svg.querySelectorAll("[data-primary-owner]")];
    const captions = [...svg.querySelectorAll("text,[data-processvg-identity]")].map((node) => ({
      label: node.getAttribute("aria-label") ?? node.textContent, node, bounds: box(node, svg),
    }));
    const inkShapes = [...svg.querySelectorAll("[data-plotter-role] :is(path,circle)")];
    const geometries = inkShapes.map((node) => ({ node, bounds: expand(box(node, svg), 0.52),
      inverse: node.getScreenCTM().inverse().multiply(svg.getScreenCTM()) }));
    for (const [i, caption] of captions.entries()) {
      const { label, bounds } = caption;
      if (bounds[0] < 0 || bounds[1] < 0 || bounds[2] > 560 || bounds[3] > 440) errors.push("Clipped text " + label);
      for (const other of captions.slice(i + 1)) {
        if (overlap(bounds, other.bounds)) errors.push("Overlapping text " + label + " / " + other.label);
      }
    }
    if (identity.length !== labels.length) errors.push("Unexpected analyte identity count");
    identity.forEach((node, i) => {
      const model = labels[i];
      if (!model) return;
      const bounds = box(node, svg);
      if (!same(bounds, model.bounds) || node.getAttribute("aria-label") !== model.glyph ||
          node.dataset.primaryOwner !== model.id || node.dataset.primaryAsset !== model.assetId) {
        errors.push("Ink differs from measured fixture " + model.id);
      }
      if ([node, node.parentElement].some((item) => getComputedStyle(item).opacity !== "1")) errors.push("Faded analyte " + model.id);
      if ((node.dataset.layoutConflict ?? "") !== model.conflicts.join(" ")) errors.push("Conflict metadata differs " + model.id);
      if (model.conflicts.length) return;
      const near = geometries.filter((geometry) => overlap(bounds, geometry.bounds));
      for (let x = bounds[0]; x <= bounds[2]; x += 0.25) {
        for (let y = bounds[1]; y <= bounds[3]; y += 0.25) {
          if (near.some(({ node, inverse }) => node.isPointInStroke(new DOMPoint(x, y).matrixTransform(inverse)))) {
            errors.push("Analyte bounds touch rendered geometry " + model.id);
            return;
          }
        }
      }
    });
    let anchorCount = 0, joinedCount = 0;
    if (rotations) {
      const anchors = rotations.flatMap(({ id, interfaces }) => interfaces.map(({ point }) => ({ id, point })));
      const markers = inkShapes.filter((node) =>
        node.tagName === "circle" && node.getAttribute("r") === "1.5" && node.parentElement.dataset.plotterRole === "secondary");
      if (markers.length !== anchors.length) errors.push("Rotation anchor count differs");
      for (const [i, { id: symbolId, point }] of anchors.entries()) {
        const marker = markers[i];
        if (!marker || !same([+marker.getAttribute("cx"), +marker.getAttribute("cy")], point)) errors.push("Anchor moved " + symbolId);
        anchorCount++;
        if (symbolId === "fe-flume") continue; // The archive flow anchors sit between the two walls.
        const radius = 0.02;
        const touches = geometries.some(({ node, bounds, inverse }) => node !== marker &&
          node.parentElement.dataset.plotterRole === "primary" &&
          overlap([point[0] - radius, point[1] - radius, point[0] + radius, point[1] + radius], bounds) &&
          [[0, 0], [-radius, 0], [radius, 0], [0, radius], [0, -radius]].some(([dx, dy]) =>
            node.isPointInStroke(new DOMPoint(point[0] + dx, point[1] + dy).matrixTransform(inverse))));
        if (!touches) errors.push("Anchor misses visible primary body " + symbolId + " " + point);
        else joinedCount++;
      }
    }
    return { id, identities: identity.length, captions: captions.length, anchorCount, joinedCount, errors };
  });
}

try {
  const plotter = names.filter((id) => !id.endsWith("-print")).map((id) => execFileSync("python3", ["vendor/plotter/scripts/check.py", join(gallery, id + ".svg")],
    { cwd: root, encoding: "utf8" }).trim());
  const metrics = page("metrics", names.map(card).join("") + `<pre id="results"></pre><script>
    (${inspect})(${JSON.stringify(sheets)}).then(
      (result)=>document.querySelector("#results").textContent=btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(result)))),
      (error)=>document.querySelector("#results").textContent=String(error));
    </script>`);
  const dom = chromium("--virtual-time-budget=10000", "--dump-dom", metrics);
  const encoded = dom.match(/<pre id="results">([A-Za-z0-9+/=]+)<\/pre>/)?.[1];
  if (!encoded) throw new Error("Chromium report missing: " + dom.match(/<pre id="results">([^<]*)/)?.[1]);
  const report = JSON.parse(Buffer.from(encoded, "base64").toString());
  const errors = report.flatMap(({ id, errors }) => errors.map((error) => id + ": " + error));
  const warnings = plotter.filter((entry) => /WARN/.test(entry));
  writeFileSync(join(evidence, "layout.json"), JSON.stringify({ sheets: report, warnings, errors }, null, 2) + "\n");

  const categories = [...new Set(names.map((id) => id.replace(/-(nominal|reduced)-(light|dark|print)$/, "")))];
  const paper = categories.flatMap((category) => ["nominal", "reduced"].map((size) => `${category}-${size}-print`));
  const pdf = join(evidence, "family-06-print.pdf");
  chromium("--no-pdf-header-footer", `--print-to-pdf=${pdf}`, page("print", paper.map(card).join("")));
  execFileSync("pdftoppm", ["-r", "96", "-gray", "-png", pdf, join(evidence, "print")], { timeout: 20000 });
  writeFileSync(join(evidence, "print-pages.json"), JSON.stringify(paper, null, 2) + "\n");

  for (const category of categories) {
    for (const theme of category === "identity" ? ["light", "dark"] : ["light"]) {
      const pair = ["nominal", "reduced"].map((size) => card(`${category}-${size}-${theme}`)).join("");
      const contact = page(`${category}-${theme}`, `<main style="display:flex">${pair}</main>`);
      chromium("--hide-scrollbars", "--window-size=1120,440",
        `--screenshot=${join(evidence, `${category}-${theme}.png`)}`, contact);
    }
  }
  if (errors.length) throw new Error(errors.slice(0, 40).join("\n") + `\n${errors.length} layout errors`);
  const total = (key) => report.reduce((sum, item) => sum + item[key], 0);
  console.log(`Chromium: ${report.length} sheets, ${total("identities")} measured analyte glyphs, ${total("anchorCount")} anchor marks, ${total("joinedCount")} touching body geometry. Plotter: ${warnings.length} warnings. Print: ${paper.length} rasterized pages.`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
