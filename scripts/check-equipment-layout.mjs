#!/usr/bin/env node
// Inspect actual Chromium layout and export the print-profile review sheets.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const suites = {
  actuators: { family: "03", title: "Actuators", legends: ["actuators", "operator-heads-and-modifiers"] },
  gates: { family: "04", title: "Gates", legends: ["gates"] },
};
const suite = process.argv[2];
if (!Object.hasOwn(suites, suite)) throw new RangeError("Choose the actuator or gate review suite");
const { family, title, legends: categories } = suites[suite];
const gallery = path.join(root, `review/family-${family}`);
const evidence = path.join(root, `review/family-${family}-evidence`);
const sheets = readdirSync(gallery).filter((file) => file.endsWith(".svg")).sort().map((file) => path.join(gallery, file));
const legends = categories.map((category) => path.join(root, "drawings/symbols", `legend-${category}.svg`));
const dir = mkdtempSync(path.join(tmpdir(), `processvg-${suite}-layout-`));
const font = new URL("../vendor/plotter/assets/fonts/CalSansVF.woff2", import.meta.url);
const styles = `@font-face{font-family:"Cal Sans";src:url("${font}")}body{margin:0}svg{display:block}
  .reference-copy svg{width:364px;height:auto}`;
const load = (file) => readFileSync(file, "utf8").replace(
  /(id="|url\(#)processvg-knockout-/g, `$1${path.basename(file, ".svg")}-knockout-`,
);
let sectionId = 0;
function section(file, reduced = false) {
  const prefix = `sheet-${++sectionId}-`;
  const svg = load(file).replace(/(\bid="|\burl\(#|\baria-labelledby="|\baria-describedby=")([\w-]+)/g,
    (_, attribute, id) => attribute + prefix + id);
  const name = path.basename(file) + (reduced ? " (65%)" : "");
  return `<section data-file="${name}"${reduced ? ' class="reference-copy"' : ""}>${svg}</section>`;
}

function chromium(...args) {
  const result = spawnSync(process.env.CHROMIUM ?? "chromium", [
    "--headless", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files",
    "--force-color-profile=srgb", `--user-data-dir=${path.join(dir, "browser")}`, ...args,
  ], { encoding: "utf8", timeout: 45000, maxBuffer: 12 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Chromium: ${result.error ?? result.stderr}`);
  return result.stdout;
}

// Runs in Chromium. SVG getBBox includes font leading. Recover the baseline
// shift from the SVG layout engine and use Canvas actual ink metrics for the glyph.
async function inspect() {
  await document.fonts.ready;
  const context = document.createElement("canvas").getContext("2d");
  const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate SVG IDs");
  const results = [...document.querySelectorAll("section")].map((section) => {
    const errors = [];
    const svg = section.querySelector("svg");
    const { width, height } = svg.viewBox.baseVal;
    const cssWidth = svg.getBoundingClientRect().width;
    const strokePad = 0.5 * width / cssWidth;
    const items = [...svg.querySelectorAll("text")];
    const boxes = items.map((item) => item.getBBox());
    const geometry = [...svg.querySelectorAll("path,circle")].filter((node) => !node.closest("defs"));
    for (const node of svg.querySelectorAll("[mask]")) {
      const id = node.getAttribute("mask").slice(5, -1);
      if (!svg.querySelector(`mask[id="${id}"]`)) errors.push("Unresolved mask " + id);
    }
    const outside = (b, pad) => b.x - pad < 0 || b.y - pad < 0 || b.x + b.width + pad > width || b.y + b.height + pad > height;
    let identifiers = 0;
    for (const [i, item] of items.entries()) {
      const name = item.textContent;
      if (outside(boxes[i], 0)) errors.push("Clipped label " + name);
      for (let j = i + 1; j < boxes.length; j++) {
        if (overlap(boxes[i], boxes[j])) errors.push("Label overlap " + name + " / " + items[j].textContent);
      }
      const inHead = /^[GMPHS]$/.test(name);
      if (inHead) identifiers++;
      const style = getComputedStyle(item);
      context.font = style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
      context.textAlign = item.getAttribute("text-anchor") === "middle" ? "center" : item.getAttribute("text-anchor") ?? "start";
      const metrics = context.measureText(name);
      const probe = item.cloneNode(true);
      probe.removeAttribute("dominant-baseline");
      item.after(probe);
      const shift = boxes[i].y - probe.getBBox().y;
      probe.remove();
      const x = item.x.baseVal[0].value + (item.dx.baseVal[0]?.value ?? 0);
      const y = item.y.baseVal[0].value + (item.dy.baseVal[0]?.value ?? 0) + shift;
      const pad = 0.1;
      const left = x - metrics.actualBoundingBoxLeft - pad, right = x + metrics.actualBoundingBoxRight + pad;
      const top = y - metrics.actualBoundingBoxAscent - pad, bottom = y + metrics.actualBoundingBoxDescent + pad;
      const ink = { x: left, y: top, width: right - left, height: bottom - top };
      const candidates = geometry.filter((node) => {
        const { x, y, width, height } = node.getBBox();
        return overlap(ink, { x: x - strokePad, y: y - strokePad,
          width: width + 2 * strokePad, height: height + 2 * strokePad });
      });
      let collision;
      for (let px = left; px <= right + 0.001; px += Math.min((right - left) / 20, 0.75)) {
        for (let py = top; py <= bottom + 0.001; py += Math.min((bottom - top) / 20, 0.75)) {
          if (candidates.some((node) => node.isPointInStroke(new DOMPoint(px, py)) ||
            (node.getAttribute("fill") === "currentColor" && node.isPointInFill(new DOMPoint(px, py))))) collision = [px, py];
        }
      }
      if (collision) errors.push("Label crosses geometry " + name + " at " + collision.map((v) => v.toFixed(2)).join(", "));
    }
    for (const shape of geometry) {
      if (outside(shape.getBBox(), strokePad)) errors.push("Clipped geometry " + (shape.getAttribute("d") ?? "circle"));
    }
    const ink = getComputedStyle(svg).color;
    const roles = [...svg.querySelectorAll("[data-plotter-role=secondary]")].map((g) => getComputedStyle(g).opacity);
    const print = svg.getAttribute("data-profile") === "print";
    const expectedInk = print ? "rgb(0, 0, 0)" : svg.dataset.theme === "dark" ? "rgb(237, 237, 237)" : "rgb(23, 23, 23)";
    if (ink !== expectedInk || roles.some((opacity) => opacity !== (print ? "1" : "0.32"))) errors.push("Unexpected ink or secondary opacity");
    const paper = Boolean(svg.querySelector(":scope > rect"));
    if (section.dataset.file.includes("transparent") && paper) errors.push("Transparent profile has page paint");
    if (print && (!paper || items.some((item) => getComputedStyle(item.parentElement).opacity !== "1"))) errors.push("Print page or label ink");
    if (cssWidth !== (section.classList.contains("reference-copy") ? 364 : 560)) errors.push("Unexpected sheet width");
    return { file: section.dataset.file, cssWidth, labels: items.length, identifiers, shapes: geometry.length, ink, paper, errors };
  });
  document.querySelector("output").textContent = JSON.stringify(results);
}

try {
  mkdirSync(evidence, { recursive: true });
  const referenceCopies = sheets.filter((file) => path.basename(file).startsWith("comparison-") && file.endsWith("-print.svg"));
  const html = path.join(dir, "layout.html");
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>:root{color-scheme:light}${styles}</style>
    ${[...sheets, ...legends].map((file) => section(file)).join("")}
    ${referenceCopies.map((file) => section(file, true)).join("")}
    <output>pending</output><script>(${inspect})().catch((err) => document.querySelector("output").textContent = JSON.stringify(err.message));</script>`);
  const dom = chromium("--virtual-time-budget=5000", "--dump-dom", html);
  const output = dom.match(/<output>(.*?)<\/output>/)?.[1];
  if (!output || output === "pending") throw new Error("Chromium did not return a layout report");
  const report = JSON.parse(output.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">"));
  if (!Array.isArray(report)) throw new Error(report);
  writeFileSync(path.join(evidence, "layout.json"), JSON.stringify(report, null, 2) + "\n");
  const errors = report.flatMap(({ file, errors }) => errors.map((error) => `${file}: ${error}`));
  console.log(`${report.length} sheets, ${report.reduce((sum, { labels }) => sum + labels, 0)} labels, ${errors.length} layout errors`);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    const print = path.join(dir, "print.html");
    writeFileSync(print, `<!doctype html><meta charset="utf-8"><title>processvg Family ${family} · ${title}</title><style>${styles}
      @page{size:560px 440px;margin:0} section{width:560px;height:440px}section + section{break-before:page}
      .reference-copy svg{margin:auto}
      *{print-color-adjust:exact}</style>${sheets.filter((file) => file.endsWith("-print.svg"))
        .map((file) => section(file)).join("")}
      ${referenceCopies.map((file) => section(file, true)).join("")}`);
    const pdf = path.join(evidence, `${suite}-print.pdf`);
    chromium("--no-pdf-header-footer", `--print-to-pdf=${pdf}`, print);
    console.log(path.relative(root, pdf));
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
