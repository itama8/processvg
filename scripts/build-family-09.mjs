import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { composeStructure, createStructureModel, DECANTER_IDS, STRUCTURE_RECORDS, STRUCTURE_VIEWS,
  solveStructureDecanter, structureInventory } from "../src/library.mjs";
import { esc } from "../src/render.mjs";

const out = fileURLToPath(new URL("../review/family-09/", import.meta.url));
export const representatives = ["sbr-basin", "mbbr-reactor", "raw-sewage-wet-well", "tube-settler",
  "secondary-clarifier", "chlorine-contact-tank"];
const models = Object.keys(STRUCTURE_RECORDS).map((kind) => createStructureModel(kind));
export const canonical = models.flatMap((model) => STRUCTURE_VIEWS.map((view) =>
  ({ model, view, slug: `${model.kind}-${view}` })));
export const transverse = representatives.map((kind) => ({
  model: createStructureModel(kind), view: "section", cut: "B-B", slug: `${kind}-section-b-b`,
}));
export const decanters = DECANTER_IDS.flatMap((id) => {
  const { water: { bwlRL, twlRL } } = createStructureModel("sbr-basin");
  const variants = [["BWL",bwlRL],["Midpoint",(bwlRL+twlRL)/2],["TWL",twlRL]];
  return variants.map(([state,currentRL]) => ({
    title: `${id} · ${state}`, heading: `${id === "decanter-floating" ? "Floating decanter" : "Swing-arm decanter"} · ${state}`,
    model: createStructureModel("sbr-basin",{ water:{ currentRL },decanter:{ id } }),
    view:"section", slug:`${id}-${state.toLowerCase()}`, state,
  }));
});

const swing = { id:"decanter-swing-arm" };
export const stressCases = [
  ["wet-well-level-extremes", "Wet well · floor to wall top", "raw-sewage-wet-well",
    { water:{ bwlRL:100,currentRL:100.2,twlRL:106 } }],
  ["sbr-shifted-datum", "SBR · shifted datum", "sbr-basin",
    { datum:{ id:"EXAMPLE_RL280_75",floorReferenceRL_m:280.75 },decanter:swing }],
  ["sbr-arm-unreachable", "Swing arm · unreachable", "sbr-basin",
    { decanter:{ ...swing,armLengthM:0.5 } }],
  ["sbr-arm-clearance", "Swing arm · clearance", "sbr-basin",
    { decanter:{ ...swing,clearanceM:0.5 } }],
  ["sbr-arm-stop-conflict", "Swing arm · high stop", "sbr-basin",
    { water:{ currentRL:105 },decanter:{ ...swing,angleStopsDeg:[10,45] } }],
  ["sbr-arm-obstruction", "Swing arm · obstruction", "sbr-basin",
    { decanter:{ ...swing,obstacles:[{ id:"beam",min:[13,3.4,103.5],max:[13.5,3.6,105] }] } }],
].map(([slug,heading,kind,options]) => ({ slug,heading,view:"section",model:createStructureModel(kind,options) }));

const profiles = {
  light: { theme:"light" }, dark: { theme:"dark" }, print: { profile:"print" },
};
const fixture = (entry, options = {}) => {
  const { model, view, cut, slug } = entry;
  return composeStructure(model,{ view,cut,id:slug,heading:entry.heading,...options }).svg;
};
const font = "../../vendor/plotter/assets/fonts/CalSansVF.woff2";
const html = (title, body, style = "") => `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${esc(title)}</title><style>
@font-face{font-family:"Cal Sans";src:url("${font}");font-weight:100 900}
*{box-sizing:border-box}body{font:15px/1.45 system-ui;margin:20px auto;padding:0 18px;max-width:2200px;color:#171717}
h1{font-size:24px}h2{font-size:18px}p{max-width:85ch}a{color:inherit}
nav{display:flex;flex-wrap:wrap;gap:12px}.unit{border-top:1px solid #ccc;margin-top:22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,335px),1fr));gap:12px}
figure{margin:0;min-width:0}figcaption{font-size:13px;margin:3px 8px 8px}img,svg{display:block;width:100%;height:auto}
${style}</style><main><h1>${esc(title)}</h1>${body}</main></html>`;

export function buildFamily09() {
  mkdirSync(out,{recursive:true});
  const entries = [...canonical,...transverse,...decanters,...stressCases];
  for (const [key,profile] of Object.entries(profiles)) {
    const dir = join(out,key);
    mkdirSync(dir,{recursive:true});
    for (const entry of entries) writeFileSync(join(dir,entry.slug+".svg"),fixture(entry,profile));
  }
  const card = (entry, key) => `<figure>
<a href="${key}/${entry.slug}.svg"><img loading="lazy" alt="${esc(entry.title ?? entry.heading ?? entry.model.name+" "+entry.view)}" src="${key}/${entry.slug}.svg"></a>
<figcaption>${esc(entry.title ?? entry.heading ?? (entry.cut ? "Section B–B" :
    entry.view === "section" ? "Section A–A" : entry.view))}${entry.view === entry.model.viewPolicy.preferred && !entry.cut &&
    !entry.state ? " · preferred" : ""}</figcaption></figure>`;
  for (const key of Object.keys(profiles)) {
    const sections = models.map((model) => `<section class="unit" id="${model.kind}"><h2>${esc(model.name)}</h2><div class="grid">${
      [...canonical,...transverse].filter((entry) => entry.model.kind === model.kind).map((entry) => card(entry,key)).join("")}
</div></section>`).join("");
    const page = key === "light" ? "index" : key;
    writeFileSync(join(out,page+".html"),html("Family 09 · Structures",`
<p>Revision 03 · 24 assemblies and 96 views. Dimensions and placements are illustrative. Survey, vendor fit and design criteria require verification.</p>
<nav><a href="../index.html">Drawing review</a><a href="index.html">Light</a><a href="dark.html">Dark</a><a href="print.html">Print ink</a>
<a href="print-sheets.html">Print sheets</a><a href="fixtures.json">Model and fixture evidence</a><a href="#decanter">Decanter travel</a></nav>
<nav>${representatives.map((kind) => `<a href="#${kind}">${esc(STRUCTURE_RECORDS[kind].name)}</a>`).join("")}</nav>
${sections}
<section class="unit" id="decanter"><h2>SBR decanter travel</h2><div class="grid">${decanters.map((entry) => card(entry,key)).join("")}</div></section>
<section class="unit"><h2>Datum, travel and placement checks</h2><div class="grid">${stressCases.map((entry) => card(entry,key)).join("")}</div></section>`,
    key === "dark" ? "body{background:#171717;color:#ededed}.unit{border-color:#555}" : ""));
  }
  const figures = (entries, key, reduced) => entries.map((entry) =>
    `<figure class="${reduced ? "reduced" : ""}">${fixture(entry,{ ...profiles[key],id:`print-${reduced ? "reduced-" : ""}${entry.slug}` })}</figure>`).join("");
  const printPages = representatives.map((kind) => ({
    name: STRUCTURE_RECORDS[kind].name,
    entries: canonical.filter((entry) => entry.model.kind === kind),
  })).concat(DECANTER_IDS.map((id) => ({
    name: id, entries: decanters.filter((entry) => entry.model.decanter.id === id),
  })));
  writeFileSync(join(out,"print-sheets.html"),html("Family 09 monochrome sheets",
    [false,true].flatMap((reduced) => printPages.map(({ name,entries }) =>
      `<section class="paper"><h2>${esc(name)} · ${reduced ? "65%" : "100%"}</h2>
<div class="print-grid">${figures(entries,"print",reduced)}</div></section>`)).join(""),`
@page{size:A4 landscape;margin:9mm}body{max-width:1120px}.paper{break-before:page;margin:0}
.paper:first-of-type{break-before:auto}.print-grid{display:grid;grid-template-columns:repeat(2,520px);gap:4px}
.print-grid .reduced{width:338px}h2{margin:0 0 5px}figcaption:empty{display:none}
@media print{body{margin:0;padding:0}h1{display:none}}`));
  writeFileSync(join(out,"fixtures.json"),JSON.stringify({
    canonicalViews: canonical.map(({ model,view,slug }) => ({ assetId:model.assetId,kind:model.kind,view,slug })),
    inventory: structureInventory(models),
    transverse: transverse.map(({ slug }) => slug),
    decanters: decanters.map(({ state,model,slug }) => ({ state,slug,...solveStructureDecanter(model) })),
    stressCases: stressCases.map(({ slug,model }) => ({ slug,datum:model.datum,water:model.water,
      ...(model.decanter && { decanter:solveStructureDecanter(model) }) })),
    portDiagnostics: models.flatMap(({ kind,portDiagnostics }) => portDiagnostics.map((diagnostic) => ({ kind,...diagnostic }))),
  },null,2)+"\n");
  console.log(`Family 09 · ${models.length} assemblies, ${canonical.length} views, ${transverse.length} B–B cuts, ${decanters.length} decanter states, ${stressCases.length} stress cases`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildFamily09();
