import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const gallery = join(root, "review/family-05");
const evidence = join(root, "review/family-05-evidence");
const font = new URL("../vendor/plotter/assets/fonts/CalSansVF.woff2", import.meta.url);
execFileSync(process.execPath, ["scripts/build-family-05.mjs"], { cwd: root });
mkdirSync(evidence, { recursive: true });
const scratch = mkdtempSync(join(evidence, ".chrome-"));
const contract = JSON.parse(readFileSync(join(gallery, "contract.json"), "utf8"));
const load = (id) => readFileSync(join(gallery, `${id}.svg`), "utf8");
const styles = `@font-face{font-family:"Cal Sans";src:url("${font}");font-weight:100 900}
body{margin:0;background:#fff}svg{display:block}section{width:560px;height:440px}
@media print{@page{size:560px 440px;margin:0}section{break-after:page}section:last-child{break-after:auto}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
const html = (body) => `<!doctype html><meta charset="utf-8"><style>${styles}</style>${body}`;
const cards = (files) => files.map((id) => `<section data-sheet="${id}">${load(id)}</section>`).join("");
const set = (name, body) => {
  const path = join(scratch, `${name}.html`);
  writeFileSync(path, html(body));
  return pathToFileURL(path).href;
};

function chromium(...args) {
  return execFileSync(process.env.CHROMIUM ?? "chromium", [
    "--headless", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files",
    "--force-color-profile=srgb", `--user-data-dir=${join(scratch, "profile")}`, ...args,
  ], { encoding: "utf8", timeout: 45000, maxBuffer: 24 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

async function inspect(matrices) {
  await document.fonts.ready;
  const roundToThousandth = (value) => Math.round(value * 1000) / 1000;
  const overlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  function worldBox(node, svg) {
    const { x, y, width, height } = node.getBBox();
    const toSheet = svg.getScreenCTM().inverse().multiply(node.getScreenCTM());
    return [new DOMPoint(x, y), new DOMPoint(x + width, y + height)]
      .flatMap((p) => { const { x, y } = p.matrixTransform(toSheet); return [x, y]; });
  }
  const result = [];
  for (const section of document.querySelectorAll("section")) {
    const id = section.dataset.sheet;
    const svg = section.querySelector("svg");
    const errors = [];
    const expectedInk = id.endsWith("dark") ? "rgb(237, 237, 237)" : id.endsWith("print") ? "rgb(0, 0, 0)" : "rgb(23, 23, 23)";
    if (getComputedStyle(svg).color !== expectedInk) errors.push("Wrong profile ink");
    const textNodes = [...svg.querySelectorAll("text")];
    const outlines = [...svg.querySelectorAll("[data-processvg-identity], [data-processvg-annotation]")];
    const geometry = [...svg.querySelectorAll("g[data-plotter-role] :is(path,circle)")].map((node) => ({
      node, bounds: worldBox(node, svg).map((v, i) => v + (i < 2 ? -0.6 : 0.6)),
      inverse: node.getScreenCTM().inverse().multiply(svg.getScreenCTM()),
    }));
    const labels = [...textNodes, ...outlines].map((node) => ({
      node, name: node.getAttribute("aria-label") ?? node.textContent, bounds: worldBox(node, svg),
    }));
    for (const [i, { name, bounds, node }] of labels.entries()) {
      if (bounds[0] < 0 || bounds[1] < 0 || bounds[2] > 560 || bounds[3] > 440) errors.push("Clipped label " + name);
      if (id !== "00-archive") {
        for (const label of labels.slice(i + 1)) {
          if (overlap(bounds, label.bounds)) errors.push("Overlapping labels " + name + " / " + label.name);
        }
      }
      if (!node.hasAttribute("data-processvg-identity") && !node.hasAttribute("data-processvg-annotation")) continue;
      if (node.hasAttribute("data-processvg-identity") &&
          [node, node.parentNode].some((element) => getComputedStyle(element).opacity !== "1")) errors.push("Faded identity " + name);
      const near = geometry.filter((item) => overlap(bounds, item.bounds));
      let hit = false;
      for (let x = bounds[0]; x <= bounds[2] + 0.001 && !hit; x += 0.25) {
        for (let y = bounds[1]; y <= bounds[3] + 0.001 && !hit; y += 0.25) {
          hit = near.some(({ node, inverse }) => node.isPointInStroke(new DOMPoint(x, y).matrixTransform(inverse)));
        }
      }
      if (hit) errors.push("Ink bounds touch geometry " + name);
    }
    let dashSamples = 0;
    if (id.startsWith("01-")) {
      const fixtures = matrices[id.includes("-nominal-") ? "nominal" : "reduced"];
      const expected = fixtures.flatMap(({ identityBounds }) => identityBounds);
      if (outlines.length !== expected.length) errors.push("Wrong number of instrument identity rows");
      outlines.forEach((node, i) => {
        if (worldBox(node, svg).some((v, j) => Math.abs(v - expected[i][j]) > 0.025)) {
          errors.push("Browser ink differs from layout " + node.getAttribute("aria-label") + " " + worldBox(node, svg).map(roundToThousandth));
        }
      });
      const source = new XMLSerializer().serializeToString(svg);
      const image = new Image();
      image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 560;
      canvas.height = 440;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const contrast = (x, y) => {
        const rgba = Array.from(ctx.getImageData(Math.floor(x), Math.floor(y) - 1, 1, 3).data);
        const dark = id.endsWith("dark");
        const transparent = id.endsWith("transparent");
        return Math.max(...[0, 4, 8].map((i) => transparent ? rgba[i + 3] : dark ? rgba[i] - 23 : 255 - rgba[i]));
      };
      for (const { bars } of fixtures) {
        for (const { dashed, segments } of bars) {
          if (!dashed) continue;
          for (const [i, [[left, y], [right]]] of segments.entries()) {
            if (contrast((left + right) / 2, y) < 35) errors.push("Dash lacks contrast at " + [left, y].map(roundToThousandth));
            if (i > 0 && contrast((left + segments[i - 1][1][0]) / 2, y) > 65) errors.push("Dash gap closes at " + [left, y].map(roundToThousandth));
            dashSamples += i ? 2 : 1;
          }
        }
      }
    }
    result.push({ id, labels: labels.length, dashSamples, errors });
  }
  return result;
}

try {
  // The vendor checker expects one-unit strokes. Check the same markup with a
  // one-unit root stroke and verify the actual 0.65-unit review renders below.
  let plotterWarnings = 0;
  for (const id of contract.files.filter((id) => !id.endsWith("-print"))) {
    const path = join(scratch, `${id}.svg`);
    writeFileSync(path, load(id).replace('stroke-width="0.65" viewBox', 'stroke-width="1" viewBox'));
    const output = execFileSync("python3", ["vendor/plotter/scripts/check.py", path], { cwd: root, encoding: "utf8" });
    if (/WARN/i.test(output)) plotterWarnings++;
  }
  const matrix = JSON.stringify({ nominal: contract["matrix-nominal"], reduced: contract["matrix-reduced"] });
  const url = set("metrics", cards(contract.files) + `<pre id="results"></pre><script>
  (${inspect})(${matrix}).then(
    (report) => document.querySelector("#results").textContent = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(report)))),
    (error) => document.querySelector("#results").textContent = String(error));
  </script>`);
  const out = chromium("--virtual-time-budget=10000", "--dump-dom", url);
  const encoded = out.match(/<pre id="results">([A-Za-z0-9+/=]+)<\/pre>/)?.[1];
  if (!encoded) throw new Error("Chromium layout report missing: " + out.match(/<pre id="results">([^<]*)/)?.[1]);
  const report = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  const errors = report.flatMap(({ id, errors }) => errors.map((error) => id + ": " + error));
  writeFileSync(join(evidence, "layout.json"), JSON.stringify({ plotterWarnings, sheets: report, errors }, null, 2) + "\n");
  if (errors.length) throw new Error(errors.slice(0, 50).join("\n") + `\n${errors.length} layout errors`);

  const dimensions = ["nominal", "reduced"];
  const classes = ["01-matrix", "02-instruments", "03-logic"];
  const printSheets = classes.flatMap((category) => dimensions.map((size) => `${category}-${size}-print`));
  chromium("--no-pdf-header-footer", `--print-to-pdf=${join(evidence, "family-05-print.pdf")}`, set("print", cards(printSheets)));
  for (const category of classes) {
    const themes = category === "01-matrix" ? ["light", "dark", "transparent"] : ["light"];
    for (const theme of themes) {
      const ids = dimensions.map((size) => `${category}-${size}-${theme}`);
      const contact = `<style>main{display:grid;grid-template-columns:560px 560px}section[data-sheet$=transparent]{background:#e8dfcb}</style><main>${cards(ids)}</main>`;
      chromium("--hide-scrollbars", "--window-size=1120,440", `--screenshot=${join(evidence, `${category}-${theme}.png`)}`, set(`${category}-${theme}`, contact));
    }
  }
  const labels = report.reduce((n, sheet) => n + sheet.labels, 0);
  const dashes = report.reduce((n, sheet) => n + sheet.dashSamples, 0);
  console.log(`Chromium: ${report.length} sheets, ${labels} labels, ${dashes} dash/gap samples, 0 errors. Plotter: ${plotterWarnings} warnings.`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
