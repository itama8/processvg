#!/usr/bin/env node
// Review page: every drawing inlined at native size (max 560 px) on a light sheet, white or
// parchment. The page sets the ink itself (data-host-ink), so the drawings ignore the
// viewer's dark mode here; outside this page they still follow it.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "review");
const FONT = path.relative(OUT, path.join(ROOT, "vendor/plotter/assets/fonts/CalSansVF.woff2"));

const svgs = (f) => f.endsWith(".svg");
const groups = [
  ["Drawings", path.join(ROOT, "drawings"), svgs],
  ["Symbol library", path.join(ROOT, "drawings/symbols"), (f) => f.startsWith("legend-") && svgs(f)],
  ["Family 01 regression gallery", path.join(OUT, "family-01"), svgs],
  ["Family 02 valve review", path.join(OUT, "family-02"), svgs],
  ["Family 03 actuator review", path.join(OUT, "family-03"), svgs],
  ["Family 04 gate and weir review", path.join(OUT, "family-04"), svgs],
  // Client-derived drawings live in private/, which git ignores; they appear here when present.
  ["Private, not committed", path.join(ROOT, "private"), svgs],
].filter(([, dir]) => existsSync(dir) && readdirSync(dir).some(svgs));

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const unesc = (s) => s.replace(/&(amp|lt|gt|quot);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"' })[e]);

// Inline one SVG: unique ids (two drawings may both use "plot-region"), host-controlled ink.
function inline(svg, prefix) {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  let out = svg.replace(/<\?xml[^>]*>\s*/, "");
  for (const id of ids) {
    const re = new RegExp(`(id="|url\\(#|aria-labelledby="|aria-describedby="|href="#)${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=["\\)])`, "g");
    out = out.replace(re, `$1${prefix}-${id}`);
  }
  return /<svg [^>]*\bdata-host-ink=/.test(out) ? out : out.replace("<svg ", '<svg data-host-ink="" ');
}

let n = 0;
const sections = groups.map(([name, dir, keep]) => {
  const files = readdirSync(dir).filter(keep).sort();
  const cards = files.map((f) => {
    const src = readFileSync(path.join(dir, f), "utf8");
    const title = unesc(src.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? f);
    const desc = unesc(src.match(/<desc[^>]*>([^<]*)<\/desc>/)?.[1] ?? "");
    return `<figure class="sheet"><div class="art">${inline(src, `d${n++}`)}</div>
<figcaption><span class="title">${esc(title)}</span><span class="file">${esc(path.relative(ROOT, path.join(dir, f)))}</span>${desc ? `<p>${esc(desc)}</p>` : ""}</figcaption></figure>`;
  });
  return `<section><h2>${esc(name)}</h2><div class="grid">${cards.join("\n")}</div></section>`;
});

const html = `<!doctype html>
<html lang="en" data-paper="white">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Drawing review</title>
<style>
@font-face { font-family: "Cal Sans"; src: url("${FONT}") format("woff2"); font-weight: 100 900; }
:root { color-scheme: light; }
:root[data-paper="white"] { --paper: #ffffff; --sheet: #ffffff; --ink: #171717; --muted: #737373; --rule: #e5e5e5; }
:root[data-paper="parchment"] { --paper: #efe6d2; --sheet: #f6efdf; --ink: #2b2418; --muted: #6f6450; --rule: #ddd0b4; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 "Cal Sans", system-ui, sans-serif; font-variation-settings: "GEOM" 25; }
header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 24px; padding: 24px 16px 8px; max-width: 1200px; margin: 0 auto; }
h1 { font-size: 20px; font-weight: 500; margin: 0; }
h2 { font-size: 15px; font-weight: 500; margin: 32px 0 12px; color: var(--muted); }
.paper { margin-inline-start: auto; display: inline-flex; border: 1px solid var(--rule); border-radius: 999px; padding: 2px; }
.paper button { font: inherit; font-size: 13px; color: var(--muted); background: none; border: 0; border-radius: 999px; padding: 4px 12px; cursor: pointer; }
.paper button[aria-pressed="true"] { background: var(--ink); color: var(--sheet); }
main { max-width: 1200px; margin: 0 auto; padding: 0 16px 48px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 560px), 1fr)); gap: 16px; }
.sheet { margin: 0; background: var(--sheet); border: 1px solid var(--rule); border-radius: 4px; }
.art { max-width: 560px; margin: 0 auto; padding: 24px 0 8px; }
.art > svg { display: block; width: 100%; height: auto; }
svg[data-plotter][data-host-ink] { color: var(--ink); }
figcaption { padding: 8px 20px 18px; font-size: 14px; }
figcaption .title { font-weight: 500; }
figcaption .file { float: right; color: var(--muted); font-size: 12px; font-family: ui-monospace, monospace; }
figcaption p { margin: 4px 0 0; color: var(--muted); max-width: 60ch; }
</style>
</head>
<body>
<header><h1>Drawing review</h1><span style="color:var(--muted)">${n} drawings, shown at native size</span>
<div class="paper" role="group" aria-label="Paper"><button data-paper="white">White</button><button data-paper="parchment">Parchment</button></div></header>
<main>${sections.join("\n")}</main>
<script>
const root = document.documentElement;
const set = (p) => { root.dataset.paper = p; document.querySelectorAll(".paper button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.paper === p))); try { localStorage.setItem("paper", p); } catch {} };
let saved = null; try { saved = localStorage.getItem("paper"); } catch {}
set(saved === "parchment" ? "parchment" : "white");
document.querySelectorAll(".paper button").forEach((b) => b.addEventListener("click", () => set(b.dataset.paper)));
</script>
</body>
</html>
`;
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "index.html"), html);
console.log(`${path.relative(ROOT, path.join(OUT, "index.html"))}  (${n} drawings)`);
