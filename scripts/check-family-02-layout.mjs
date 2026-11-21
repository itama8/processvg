#!/usr/bin/env node
// Check real SVG label extents and mask references with Chromium's layout engine.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = new URL("../", import.meta.url);
const gallery = new URL("review/family-02/", root);
const family01 = new URL("review/family-01/", root);
const sheets = [
  ...(process.argv.includes("--include-family-01") ? [
    ...readdirSync(family01).filter((file) => file.endsWith(".svg")).sort().map((file) => new URL(file, family01)),
    ...["legend-lines.svg", "legend-lines-2.svg"].map((file) => new URL(`drawings/symbols/${file}`, root)),
  ] : []),
  ...readdirSync(gallery).filter((file) => file.endsWith(".svg")).sort().map((file) => new URL(file, gallery)),
  ...["legend-valves.svg", "legend-valves-2.svg"].map((file) => new URL(`drawings/symbols/${file}`, root)),
];
const dir = mkdtempSync(path.join(tmpdir(), "processvg-valve-layout-"));
const html = path.join(dir, "layout.html");
const report = [];
try {
  // Use a separate SVG document for each sheet, like a standalone export.
  for (const sheet of sheets) {
    const code = `
      async function check() {
        await document.fonts.ready;
        const svg = document.querySelector("svg");
        const { width, height } = svg.viewBox.baseVal;
        const labels = [...svg.querySelectorAll("text")];
        const boxes = labels.map((label) => label.getBBox());
        const errors = [];
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i];
          if (a.x < 0 || a.y < 0 || a.x + a.width > width || a.y + a.height > height) {
            errors.push("Clipped text: " + labels[i].textContent);
          }
          for (let j = i + 1; j < boxes.length; j++) {
            const b = boxes[j];
            if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) {
              errors.push("Overlapping labels: " + labels[i].textContent + " / " + labels[j].textContent);
            }
          }
        }
        const masks = [...svg.querySelectorAll("mask")];
        const ids = new Set(masks.map((mask) => mask.id));
        if (ids.size !== masks.length) errors.push("Duplicate mask ID");
        for (const item of svg.querySelectorAll("[mask]")) {
          const id = item.getAttribute("mask").slice(5, -1);
          if (!ids.delete(id)) errors.push("Missing or reused mask: " + id);
        }
        if (ids.size) errors.push("Unused mask");
        if (svg.hasAttribute("data-profile")) {
          if (getComputedStyle(svg).color !== "rgb(0, 0, 0)" ||
              labels.some((label) => getComputedStyle(label.parentElement).opacity !== "1")) {
            errors.push("Print ink must resolve to full black");
          }
        }
        document.querySelector("output").textContent = JSON.stringify({ labels: labels.length, masks: masks.length, errors });
      }
      check();
    `;
    const font = new URL("vendor/plotter/assets/fonts/CalSansVF.woff2", root);
    writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:"Cal Sans";src:url("${font}")}</style>${readFileSync(sheet, "utf8")}<output>pending</output><script>${code}</script>`);
    const result = spawnSync(process.env.CHROMIUM ?? "chromium", [
      "--headless", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
      "--allow-file-access-from-files", "--virtual-time-budget=4000", `--user-data-dir=${path.join(dir, path.basename(sheet.pathname))}`, "--dump-dom", html,
    ], { encoding: "utf8", timeout: 30000 });
    const output = result.stdout?.match(/<output>(.*?)<\/output>/)?.[1];
    if (result.status !== 0 || !output || output === "pending") {
      throw new Error(`Chromium did not return layout results for ${sheet.pathname}: ${result.error ?? (result.stderr || `status ${result.status}, output ${output}`)}`);
    }
    report.push({ file: decodeURIComponent(sheet.pathname.slice(root.pathname.length)),
      ...JSON.parse(output.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">")) });
  }
} finally {
  rmSync(dir, { force: true, recursive: true });
}
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
if (report.some(({ errors }) => errors.length)) process.exitCode = 1;
