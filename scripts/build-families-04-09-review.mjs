// Families 04–09 second-pass review: before/after fixtures, Chromium checks and monochrome print proof.
//
//   node scripts/build-families-04-09-review.mjs            build, check in Chromium and print
//   node scripts/build-families-04-09-review.mjs --no-browser  build the page only
//
// "Before" is the first-pass commit read from local Git objects and rebuilt in an isolated copy;
// "after" is the working tree. The same fixture declarations run against both libraries.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const BASE = "fc88b585dc963e7da32c1997067e42351d3e5d63";
const repo = fileURLToPath(new URL("..", import.meta.url));
const out = join(repo, "review/families-04-09");
const evidence = join(repo, "review/families-04-09-evidence");
const baseDir = join(out, `base-${BASE.slice(0, 7)}`);
const SIZES = [[100, "nominal"], [65, "reduced"]];
const run = (cmd, args, cwd = repo) => execFileSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

function prepareBase() {
  if (!existsSync(join(baseDir, "package.json"))) {
    mkdirSync(baseDir, { recursive: true });
    const archive = execFileSync("git", ["archive", "--format=tar", BASE], { cwd: repo, maxBuffer: 256 * 1024 * 1024 });
    execFileSync("tar", ["-x", "-C", baseDir], { input: archive });
  }
  // Regenerate the first-pass family sheets inside the isolated copy.
  for (const family of ["05", "06", "09"]) run("node", [`scripts/build-family-${family}.mjs`], baseDir);
  for (const family of ["05", "06", "09"]) run("node", [`scripts/build-family-${family}.mjs`]);
}

const text = (x, y, value, align = "middle") => ({ t: [x, y, value], align });
const wrap = (value, width) => value.match(new RegExp(`.{1,${width}}(?:\\s|$)`, "g")).map((part) => part.trim());

/** Fixtures are declared once and evaluated against each library version. */
const fixtures = [
  {
    id: "f04-gate-pipe", family: "04", title: "Channel gates beside pipe valves",
    note: "Flap gate (Family 04) shares the Family 02 NRV drawing; its FG label is the visible distinction. A non-FG tag removes it. Slide and butterfly gates keep channel ports and NC text.",
    shapes: (L) => {
      const shapes = [];
      const cells = [
        ["gate-flap", {}, "Flap gate default"], ["gate-flap", { tag: "CK-201" }, "Flap gate tag CK-201"],
        ["valve-check", {}, "Pipe check valve"], ["gate-slide", { normalPosition: "closed" }, "Slide gate NC"],
        ["valve-knife", { normalPosition: "closed" }, "Pipe knife NC"], ["gate-butterfly", { normalPosition: "closed" }, "Butterfly gate NC"],
        ["valve-butterfly", { normalPosition: "closed" }, "Pipe butterfly NC"],
      ];
      for (const [row, s] of [[0, 1.6], [1, 0.65]]) {
        const y = 110 + row * 170;
        shapes.push(text(24, y - 62, row ? "Reduced 0.65×" : "Nominal 1.6×", "start"));
        cells.forEach(([id, options, label], i) => {
          const x = 52 + i * 76;
          const placed = L.placeSymbol(id, { x, y, s }, options);
          shapes.push(...L.routeLine("line-process", [[x - 30, y], placed.ports[0]]).shapes,
            ...L.routeLine("line-process", [placed.ports.at(-1), [x + 30, y]]).shapes, ...placed.shapes);
          wrap(label, 13).forEach((part, k) => shapes.push(text(x, y + 46 + k * 12, part)));
        });
      }
      return shapes;
    },
  },
  {
    id: "f05-panel-function", family: "05", title: "Panel identity versus function letters",
    note: "Location bars state where a function is mounted. LIC (controller) and PI (indicator) are function letters. The caption reports the kind each library assigns when the project omits it.",
    shapes: (L) => {
      const shapes = [];
      const cells = [
        ["inst-panel", { panel: { identifier: "MCP", number: "007" } }, "Panel asset"],
        ["inst-panel", { tag: ["LIC", "004"] }, "LIC on main panel"],
        ["inst-local", { tag: ["PI", "103"] }, "PI on local panel"],
        ["inst-local", { tag: ["PI", "103"], kind: "physical-instrument" }, "PI · declared"],
      ];
      cells.forEach(([id, options, label], i) => {
        const x = 75 + i * 135, y = 170;
        const placed = L.placeSymbol(id, { x, y, s: 2 }, { mode: "candidate", id: `${id}-${i}`, ...options });
        shapes.push(...placed.shapes, text(x, y + 56, label), text(x, y + 70, `kind: ${placed.metadata.kind}`));
      });
      shapes.push(text(24, 48, "Candidate placement, no project kind unless declared", "start"));
      return shapes;
    },
  },
  {
    id: "f07-line-grammar", family: "07", title: "Process, mechanical, power and signal routes",
    note: "Family 07 draws VFD power as a secondary 4 3 dash. The Family 01 electrical signal is a 6 4 dash. In print both are full-ink dashes. Pāhala P-001 instead draws a separate ES supply.",
    shapes: (L) => {
      const shapes = [];
      const rows = [
        ["Process (line-process)", L.routeLine("line-process", [[200, 0], [480, 0]]).shapes],
        ["Mechanical shaft (Family 07 fixture)", [{ d: "M200 0 L480 0" }]],
        ["VFD power (Family 07 fixture)", [{ d: "M200 0 L480 0", role: "secondary", dash: "4 3" }]],
        ["Electrical signal (line-electric)", L.routeLine("line-electric", [[200, 0], [480, 0]]).shapes],
        ["Data (line-data)", L.routeLine("line-data", [[200, 0], [480, 0]]).shapes],
      ];
      rows.forEach(([label, row], i) => {
        const y = 70 + i * 52;
        shapes.push(text(24, y + 4, label, "start"), ...L.place(row, { x: 0, y }));
      });
      return shapes;
    },
  },
  {
    id: "f08-taxonomy", family: "08", title: "Fine screen and grit separator naming",
    note: "Pāhala P-003 labels the hatched box FINE SCREEN and the hopper GRIT SEPARATOR. HYDROCYCLONE and GRIT CYCLONE are separate glyphs. Labels below are the current catalogue and candidate names.",
    shapes: (L) => {
      const shapes = [];
      const candidates = L.SCREENING_CANDIDATES ?? {};
      const cells = [
        ["screen-fine", "legacy"], ["screen-fine", "candidate"], ["screen-drum", "candidate"],
        ["grit-separator", "legacy"], ["grit-separator", "candidate"], ["grit-vortex", "candidate"],
      ];
      cells.forEach(([id, variant], i) => {
        const x = 52 + i * 90, y = 150;
        const placed = L.placeSymbol(id, { x, y, s: 1.4 }, variant === "candidate" ? { variant, id: `${id}-c` } : {});
        const name = variant === "legacy" ? L.byId[id].name : candidates[id]?.label ?? candidates[id]?.name ?? id;
        shapes.push(...placed.shapes, text(x, y + 52, id), text(x, y + 66, variant));
        wrap(name, 15).forEach((part, k) => shapes.push(text(x, y + 84 + k * 12, part)));
      });
      return shapes;
    },
  },
];

/** Family sheets regenerated from both trees: [family, title, relative path for light, print, note]. */
const sheets = [
  ["05", "Panel and hosted functions", "review/family-05/02-instruments-nominal-light.svg", "review/family-05/02-instruments-nominal-print.svg",
    "The authored PI fixture is now declared as a physical instrument. No geometry changed."],
  ["06", "Integral and remote transmitters", "review/family-06/process-nominal-light.svg", "review/family-06/process-nominal-print.svg",
    "The integral FIT sits on its element without a signal line. The remote FIT keeps its dashed signal."],
  ["06", "Integral and remote · reduced", "review/family-06/process-reduced-light.svg", "review/family-06/process-reduced-print.svg", ""],
  ["06", "Integral analyser and panel asset", "review/family-06/analysis-nominal-light.svg", "review/family-06/analysis-nominal-print.svg",
    "The integral AIT sits on its cabinet. The MCP 407 panel asset keeps the approved bubble, which reference legends read as a panel-mounted instrument."],
  ["09", "ASP plan · projection overlap", "review/family-09/light/asp-aeration-tank-plan.svg", "review/family-09/print/asp-aeration-tank-plan.svg",
    "RAS and air share plan XY at different RL. The view now reports a projection overlap."],
  ["09", "Secondary clarifier plan · authored coincidence", "review/family-09/light/secondary-clarifier-plan.svg", "review/family-09/print/secondary-clarifier-plan.svg",
    "RAS and WAS share an authored anchor. This is a model diagnostic, unchanged."],
  ["09", "Receiving chamber · equal-RL inlet and outlet", "review/family-09/light/receiving-chamber-section.svg", "review/family-09/print/receiving-chamber-section.svg",
    "Supplied anchors have equal RL. The flag is unchanged and the crest remains visible."],
  ["09", "Pressure sand filter · shared backwash/waste", "review/family-09/light/pressure-sand-filter-elevation.svg", "review/family-09/print/pressure-sand-filter-elevation.svg", ""],
  ["09", "Swing-arm decanter · BWL", "review/family-09/light/decanter-swing-arm-bwl.svg", "review/family-09/print/decanter-swing-arm-bwl.svg",
    "Reach and angle are solved from the illustrative pivot and arm. They are not vendor travel."],
  ["09", "Swing-arm decanter · TWL", "review/family-09/light/decanter-swing-arm-twl.svg", "review/family-09/print/decanter-swing-arm-twl.svg", ""],
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function library(root) {
  const L = await import(pathToFileURL(join(root, "src/library.mjs")).href);
  const R = await import(pathToFileURL(join(root, "src/render.mjs")).href);
  const lines = await import(pathToFileURL(join(root, "src/lines.mjs")).href);
  return { ...L, ...R, routeLine: lines.routeLine };
}

function fixtureSvgs(L, version) {
  return Object.fromEntries(fixtures.flatMap((fixture) => ["light", "print"].map((profile) => {
    const options = profile === "print" ? { profile: "print" } : { theme: "light" };
    const id = `${fixture.id}-${version}-${profile}`;
    const svg = L.svgDoc(id, fixture.title, fixture.note, L.render(fixture.shapes(L), options), options);
    return [`${fixture.id}/${profile}`, svg];
  })));
}

function page(profile) {
  const figure = (src, size, label) => `<figure class="s${size}"><img src="${esc(src)}" alt="${esc(label)}">` +
    `<figcaption>${esc(label)} · ${size}%</figcaption></figure>`;
  const pair = (title, note, before, after) => `<section><h2>${esc(title)}</h2>${note ? `<p>${esc(note)}</p>` : ""}` +
    SIZES.map(([size]) => `<div class="pair">${figure(before, size, "Before")}${figure(after, size, "After")}</div>`).join("") + "</section>";
  const body = [
    ...fixtures.map((f) => pair(`Family ${f.family} · ${f.title}`, f.note, `before/${f.id}-${profile}.svg`, `after/${f.id}-${profile}.svg`)),
    ...sheets.map(([family, title, light, print, note]) => {
      const file = profile === "print" ? print : light;
      return pair(`Family ${family} · ${title}`, note, `${baseDir.split("/").at(-1)}/${file}`, `../../${file}`);
    }),
  ];
  return `<!doctype html><meta charset="utf-8"><title>Families 04–09 review${profile === "print" ? " · print" : ""}</title>
<style>body{margin:24px;font:14px/1.4 system-ui,sans-serif;color:#171717;background:#fff;max-width:1160px}
h1{font-size:20px}h2{font-size:15px;margin:18px 0 4px}p{margin:0 0 6px;max-width:72ch}
.pair{display:flex;gap:12px;align-items:flex-start;margin:4px 0}figure{margin:0}figure img{display:block;border:1px solid #ddd}
figure.s100 img{width:560px}figure.s65 img{width:364px}figcaption{font-size:12px;color:#555}
${profile === "print" ? "@page{size:A4 landscape;margin:8mm}section{break-inside:avoid}figure.s100 img{width:500px}figure.s65 img{width:325px}" : ""}
</style><h1>Families 04–09 second-pass review · ${profile}</h1>
<p>Before is ${BASE.slice(0, 7)} rebuilt from local Git objects. After is the working tree. Nominal is 100% and reduced is 65% of the sheet width.</p>
${body.join("\n")}`;
}

export async function buildReview() {
  mkdirSync(out, { recursive: true });
  prepareBase();
  for (const [version, root] of [["before", baseDir], ["after", repo]]) {
    const L = await library(root);
    mkdirSync(join(out, version), { recursive: true });
    for (const [key, svg] of Object.entries(fixtureSvgs(L, version))) {
      const [id, profile] = key.split("/");
      writeFileSync(join(out, version, `${id}-${profile}.svg`), svg);
    }
  }
  writeFileSync(join(out, "index.html"), page("light"));
  writeFileSync(join(out, "print.html"), page("print"));
  const records = await Promise.all([["before", baseDir], ["after", repo]].map(async ([version, root]) => {
    const L = await library(root);
    const kinds = ["inst-panel", "inst-local"].map((id) => [id, L.placeSymbol(id, {}, { mode: "candidate", tag: ["PI", "1"] }).metadata.kind]);
    const asp = L.projectStructure(L.createStructureModel("asp-aeration-tank"), { view: "plan" });
    return { version, panelTagDefaultKind: Object.fromEntries(kinds), aspPlanViewDiagnostics: asp.viewPortDiagnostics ?? null };
  }));
  writeFileSync(join(out, "fixtures.json"), JSON.stringify({ base: BASE, fixtures: fixtures.map(({ id, family, title, note }) =>
    ({ id, family, title, note })), sheets, records }, null, 2) + "\n");
}

// Chromium: load each SVG, measure text bounds and clipping at both widths, screenshot and print.
function browserCheck() {
  mkdirSync(evidence, { recursive: true });
  const scratch = join(evidence, ".chromium");
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  const chrome = (...args) => run(process.env.CHROMIUM ?? "chromium", ["--headless", "--no-sandbox", "--disable-gpu",
    "--allow-file-access-from-files", "--force-color-profile=srgb", "--hide-scrollbars", `--user-data-dir=${join(scratch, "profile")}`, ...args]);
  const files = [];
  for (const profile of ["light", "print"]) {
    for (const f of fixtures) for (const v of ["before", "after"]) files.push(join(out, v, `${f.id}-${profile}.svg`));
    for (const [, , light, print] of sheets) for (const root of [baseDir, repo]) files.push(join(root, profile === "print" ? print : light));
  }
  const probe = `<!doctype html><meta charset="utf-8"><body>${files.map((file, i) =>
    SIZES.map(([size]) => `<iframe data-file="${esc(file)}" data-size="${size}" id="f${i}-${size}" src="${pathToFileURL(file).href}" style="border:0;width:600px;height:460px"></iframe>`).join("")).join("")}
<pre id="result"></pre><script>
addEventListener("load", () => {
  const results = [];
  for (const frame of document.querySelectorAll("iframe")) {
    const svg = frame.contentDocument?.querySelector("svg");
    const size = +frame.dataset.size / 100;
    const entry = { file: frame.dataset.file, size: frame.dataset.size, labels: 0, minTextPx: Infinity, errors: [] };
    if (!svg) { entry.errors.push("no svg"); results.push(entry); continue; }
    const [, , w, h] = svg.getAttribute("viewBox").split(/[ ,]+/).map(Number);
    const boxes = [...svg.querySelectorAll("text, [data-processvg-identity], [data-processvg-annotation]")].map((node) => {
      const b = node.getBBox(); const m = node.getCTM(); const r = svg.getCTM();
      const sx = m && r ? m.a / r.a : 1;
      const x = (m && r) ? (m.e - r.e) / r.a + b.x * sx : b.x, y = (m && r) ? (m.f - r.f) / r.d + b.y * sx : b.y;
      return { text: node.textContent.trim().slice(0, 40), x, y, w: b.width * sx, h: b.height * sx };
    }).filter(({ w, h }) => w > 0 && h > 0);
    entry.labels = boxes.length;
    for (const [i, a] of boxes.entries()) {
      entry.minTextPx = Math.min(entry.minTextPx, a.h * size);
      if (a.x < -0.5 || a.y < -0.5 || a.x + a.w > w + 0.5 || a.y + a.h > h + 0.5) entry.errors.push("clipped " + a.text);
      for (const b of boxes.slice(i + 1)) if (a.x < b.x + b.w + 1 && a.x + a.w > b.x - 1 && a.y < b.y + b.h - 0.5 && a.y + a.h > b.y + 0.5) entry.errors.push("overlap " + a.text + " / " + b.text);
    }
    results.push(entry);
  }
  document.getElementById("result").textContent = JSON.stringify(results);
});
</script>`;
  writeFileSync(join(scratch, "probe.html"), probe);
  const dom = chrome("--virtual-time-budget=20000", "--dump-dom", pathToFileURL(join(scratch, "probe.html")).href);
  const match = dom.match(/<pre id="result">([^<]*)<\/pre>/);
  if (!match?.[1]) throw new Error("Chromium did not report layout results");
  const results = JSON.parse(match[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">"));
  const relative = (file) => file.replace(repo, "");
  for (const r of results) r.file = relative(r.file);
  for (const [name, html, width] of [["screen", "index.html", 1220], ["print", "print.html", 1220]]) {
    chrome(`--window-size=${width},9000`, `--screenshot=${join(evidence, `${name}.png`)}`, pathToFileURL(join(out, html)).href);
  }
  const pdf = join(evidence, "families-04-09-print.pdf");
  chrome("--no-pdf-header-footer", `--print-to-pdf=${pdf}`, pathToFileURL(join(out, "print.html")).href);
  run("pdftoppm", ["-r", "300", "-mono", pdf, join(evidence, "print-mono")]);
  const pages = Number(run("pdfinfo", [pdf]).match(/Pages:\s+(\d+)/)[1]);
  const version = run(process.env.CHROMIUM ?? "chromium", ["--version"]).trim();
  const errors = results.flatMap(({ file, size, errors }) => errors.map((e) => `${file} ${size}%: ${e}`));
  const report = { chromium: version, sheets: results.length, labels: results.reduce((n, r) => n + r.labels, 0),
    minTextPx: Math.min(...results.map((r) => r.minTextPx)), pdfPages: pages, errors, results };
  writeFileSync(join(evidence, "layout.json"), JSON.stringify(report, null, 2) + "\n");
  rmSync(scratch, { recursive: true, force: true });
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildReview();
  console.log("review/families-04-09/index.html, print.html");
  if (!process.argv.includes("--no-browser")) {
    const report = browserCheck();
    console.log(`Chromium: ${report.sheets} sheet renders, ${report.labels} labels, minimum text ${report.minTextPx.toFixed(1)} px, ` +
      `${report.errors.length} layout findings. Print: ${report.pdfPages} PDF pages, 300 dpi monochrome rasters.`);
    for (const error of report.errors) console.log("  " + error);
  }
}
