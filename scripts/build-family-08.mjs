import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { composeScreeningDocument, placeSymbol, SCREENING_ARCHIVE_IDS, SCREENING_CANDIDATES } from "../src/library.mjs";
import { esc, render, svgDoc } from "../src/render.mjs";
import { inletWorksFixture } from "../tests/fixtures/family-08-inlet.mjs";
import { physicalFixtures } from "../tests/fixtures/family-08-physical.mjs";

const out = fileURLToPath(new URL("../review/family-08/", import.meta.url));
const evidence = fileURLToPath(new URL("../review/family-08-evidence/", import.meta.url));
const ref = fileURLToPath(new URL("../tests/fixtures/family-08-reference/", import.meta.url));
const symbols = Object.values(SCREENING_CANDIDATES);
const text = (x, y, label, align = "middle") => ({ t: [x, y, label], align });
const views = ["schematic", "plan", "section", "elevation"];
mkdirSync(out, { recursive: true });
mkdirSync(evidence, { recursive: true });
const sheets = [];
function save(slug, title, desc, shapes, width, height, { theme = "light", profile = "screen" } = {}) {
  const svg = svgDoc(slug, title, desc, render(shapes, { profile }), { width, height, theme, profile });
  writeFileSync(join(out, slug + ".svg"), svg);
  sheets.push({ slug, width, height, theme, profile });
}

const scales = { nominal: 1.75, reduced: 0.95 };
for (const [size, s] of Object.entries(scales)) {
  for (const profile of ["light", "dark", "print"]) {
    const shapes = [text(24, 26, `Family 08 | Provisional screening and grit | ${size}`, "start")];
    symbols.forEach(({ id, label }, i) => {
      const x = 87 + (i % 5) * 171, y = 104 + Math.floor(i / 5) * 136;
      shapes.push(...placeSymbol(id, { x, y, s }, { variant: "candidate" }).shapes, text(x, y + 59, label), text(x, y + 74, id));
    });
    save(`01-candidates-${size}-${profile}`, "Provisional screening and grit candidates",
      "Twenty-one opt-in candidate glyphs. Visual and standards approval pending.", shapes, 860, 735,
      { theme: profile === "dark" ? "dark" : "light", profile: profile === "print" ? "print" : "screen" });
  }
}

const archive = [text(24, 26, "Family 08 | Legacy (left) and opt-in candidate (right)", "start")];
SCREENING_ARCHIVE_IDS.forEach((id, i) => {
  const x = 104 + (i % 4) * 203, y = 103 + Math.floor(i / 4) * 138;
  archive.push(...placeSymbol(id, { x: x - 39, y, s: 1.65 }).shapes,
    ...placeSymbol(id, { x: x + 40, y, s: 1.65 }, { variant: "candidate" }).shapes, text(x, y + 55, id));
});
save("02-legacy-comparison", "Legacy and candidate comparison",
  "Left glyphs are the unchanged legacy defaults. Right glyphs require candidate opt-in.", archive, 820, 315);

const inlet = inletWorksFixture();
for (const profile of ["screen", "print"]) {
  save(`03-inlet-works-${profile}`, "Inlet works | Provisional routing", "Parallel screens and isolation gates with bypass, separate wash and return, grit and solids paths and a separate control association.",
    inlet.shapes, 840, 560, { profile });
}

const assets = symbols.map(({ id }, i) => ({
  assetId: `F08-${String(i + 1).padStart(2, "0")}`, symbolId: id, variant: "candidate", physical: physicalFixtures[id],
  views: Object.fromEntries(views.map((view) => [view, {}])),
}));
const viewDocuments = Object.fromEntries(views.map((view) => [view, composeScreeningDocument({ assets }, { view })]));
for (let page = 0; page < 3; page++) {
  const physical = [text(24, 25, "Illustrative engineering inputs | metres | 8 drawing units/m", "start"),
    ...views.map((view, i) => text(227 + i * 174, 47, view))];
  const batch = assets.slice(page * 7, page * 7 + 7);
  for (const [row, asset] of batch.entries()) {
    const y = 99 + row * 81;
    physical.push(text(22, y + 3, asset.assetId, "start"), text(22, y + 17, asset.symbolId, "start"));
    for (const [col, view] of views.entries()) {
      const result = placeSymbol(asset.symbolId, { x: 227 + col * 174, y, s: view === "schematic" ? 1.1 : 1 },
        { variant: asset.variant, assetId: asset.assetId, physical: asset.physical, view });
      physical.push(...result.shapes);
    }
  }
  save(`04-dimensioned-views-${page + 1}`, "Dimensioned family review",
    "One asset identity across schematic, plan, section and elevation. Outline measurements come from explicit fixture witnesses.", physical, 840, 664);
}

writeFileSync(join(out, "fixtures.json"), JSON.stringify({
  scales, sheets, assets,
  dimensions: Object.fromEntries(views.slice(1).map((view) => [view, viewDocuments[view].blocks.map(
    ({ metadata: { assetId }, dimensions, physicalBasis }) => ({ assetId, dimensions, physicalBasis }))])),
  inletWorks: { assetIds: inlet.assets.map(({ assetId }) => assetId), schedule: inlet.schedule.map(({ assetId, symbolId, drive }) => ({ assetId, symbolId, drive })),
    routes: inlet.network.edges, control: inlet.controls, associations: inlet.control.edges },
}, null, 2) + "\n");

const comparisons = [
  ["Symbol contact sheet", "processvg-family-08-review.svg", "01-candidates-nominal-light.svg"],
  ["Inlet works topology", "processvg-family-08-inlet-works-example.svg", "03-inlet-works-screen.svg"],
];
for (const [, filename] of comparisons) copyFileSync(join(ref, filename), join(evidence, filename));
const comparison = comparisons.map(([label, source, result]) => `<h2>${esc(label)}</h2><section>
<figure><figcaption>Iteration 02 source plate</figcaption><img alt="Iteration 02 source" src="${source}"></figure>
<figure><figcaption>Generated from the library and fixtures</figcaption><img alt="Generated candidate proof" src="../family-08/${result}"></figure>
</section>`).join("\n");
const sourcePlate = readFileSync(join(ref, comparisons[0][1]), "utf8");
const sourceStyle = sourcePlate.match(/<style>.*?<\/style>/s)[0];
const sourceGroups = [...sourcePlate.matchAll(/<g transform="translate\([^)]+\) scale\(3.12\)" class="symbol">.*?<\/g>/gs)];
if (sourceGroups.length !== symbols.length) throw new Error("Unexpected source plate glyph count");
const paired = symbols.map(({ id, label }, i) => {
  const source = `<svg viewBox="0 0 202 186" aria-label="Handoff glyph" role="img">${sourceStyle}
    ${sourceGroups[i][0].replace(/translate\([^)]+\)/, "translate(101,92)")}</svg>`;
  const shapes = placeSymbol(id, { x: 101, y: 92, s: 3.12 }, { variant: "candidate" }).shapes;
  const generated = svgDoc("paired-" + id, "Generated " + label, "Candidate glyph", render(shapes),
    { width: 202, height: 186, theme: "light" });
  return `<figure><figcaption>${esc(label)} <small>${esc(id)}</small></figcaption>
  <div class="pair">${source}${generated}</div></figure>`;
}).join("\n");
writeFileSync(join(evidence, "comparison.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Family 08 plate comparison</title>
<style>body{font-family:system-ui;margin:24px;color:#171717}section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0}img{width:100%;height:auto;display:block}figcaption{padding:8px 0}@media(max-width:700px){section{grid-template-columns:1fr}}.pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}.pair{display:grid;grid-template-columns:repeat(2,1fr);border:1px solid #ddd}.pair svg{width:100%;height:auto;display:block}small{display:block}</style>
<h1>Family 08 plate comparison</h1>${comparison}
<h2>Individual glyphs</h2><p>Iteration 02 on the left, generated candidate on the right.</p><div class="pairs">${paired}</div></html>\n`);
console.log(`Family 08 generated ${sheets.length} sheets and plate comparison`);
