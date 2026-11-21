import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildFamily09, canonical, decanters, representatives, stressCases, transverse } from "./build-family-09.mjs";
import { composeStructure } from "../src/library.mjs";

buildFamily09();
const out = fileURLToPath(new URL("../review/family-09/",import.meta.url));
const evidence = fileURLToPath(new URL("../review/family-09-evidence/",import.meta.url));
mkdirSync(evidence,{recursive:true});
const scratch = mkdtempSync(join(evidence,".chromium-"));
const entries = [...canonical,...transverse,...decanters,...stressCases];
const font = new URL("../vendor/plotter/assets/fonts/CalSansVF.woff2",import.meta.url);
const chrome = (...args) => execFileSync(process.env.CHROMIUM ?? "chromium",[
  "--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--allow-file-access-from-files",
  "--force-color-profile=srgb","--hide-scrollbars",`--user-data-dir=${join(scratch,"profile")}`,...args,
],{ encoding:"utf8",timeout:60000,maxBuffer:64*1024*1024,stdio:["ignore","pipe","pipe"] });
const dirURL = (where) => pathToFileURL(where).href;
const inline = (entry, profile, size) => readFileSync(join(out,profile,entry.slug+".svg"),"utf8")
  .replaceAll(entry.slug+"-title",entry.slug+"-"+size+"-title")
  .replaceAll(entry.slug+"-desc",entry.slug+"-"+size+"-desc");

function inspect(profile) {
  const errors = [];
  let panels = 0, labels = 0;
  const fits = (box, width, height) => box.x >= -0.1 && box.y >= -0.1 &&
    box.x + box.width <= width+0.1 && box.y + box.height <= height+0.1;
  const overlaps = (a,b) => a.x < b.x+b.width-0.1 && a.x+a.width > b.x+0.1 &&
    a.y < b.y+b.height-0.1 && a.y+a.height > b.y+0.1;
  for (const figure of document.querySelectorAll("figure")) {
    const [name, size, svg] = [figure.dataset.fixture, Number(figure.dataset.size), figure.querySelector("svg")];
    panels++;
    const label = name+" "+size+"%";
    const expectedColour = { light:"rgb(23, 23, 23)",dark:"rgb(237, 237, 237)",print:"rgb(0, 0, 0)" }[profile];
    if (getComputedStyle(svg).color !== expectedColour) errors.push(label+" wrong ink");
    const bounding = svg.getBoundingClientRect();
    if (Math.abs(bounding.width - 520*size/100) > 0.1) errors.push(label+" wrong scale");
    const graphic = svg.querySelector("[data-structure-asset]");
    if (!fits(graphic.getBBox(),520,340)) errors.push(label+" clipped graphic");
    const cap = svg.querySelector('[data-feature="pressure-shell"]');
    if (cap) {
      const { y, height } = cap.getBBox();
      if (y > 55 || height < 156) errors.push(label+" pressure heads bend inward");
    }
    for (const element of svg.querySelectorAll("[data-plotter-role]")) {
      const expected = element.dataset.plotterRole === "secondary" && profile !== "print" ? 0.32 : 1;
      if (+getComputedStyle(element).opacity !== expected) errors.push(label+" wrong primary/secondary opacity");
    }
    const titles = [...graphic.querySelectorAll("text")];
    for (const [i,node] of titles.entries()) {
      labels++;
      const a = node.getBoundingClientRect();
      const box = { x: a.x-bounding.x, y: a.y-bounding.y, width:a.width, height:a.height };
      if (!fits(box,bounding.width,bounding.height) || Math.min(a.height,a.width) < 4) {
        errors.push(label+" clipped or tiny "+node.textContent);
      }
      if (titles.slice(i+1).some((other) => overlaps(a,other.getBoundingClientRect()))) errors.push(label+" overlapping "+node.textContent);
    }
  }
  return { profile,panels,labels,errors };
}

const html = (body, style = "", js = "") => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:"Cal Sans";src:url("${font}");font-weight:100 900}
body{margin:0;font:15px system-ui}figure{margin:0}svg{display:block;width:100%;height:auto}
${style}</style>${body}${js}`;
const writePage = (file, body, style, js) => {
  const destination = join(scratch,file+".html");
  writeFileSync(destination,html(body,style,js));
  return dirURL(destination);
};
const figure = (entry, profile, size) =>
  `<figure data-fixture="${entry.slug}" data-size="${size}" style="width:${520*size/100}px">${inline(entry,profile,size)}</figure>`;

try {
  const reports = [];
  for (const profile of ["light","dark","print"]) {
    const body = entries.flatMap((entry) => [100,65].map((size) => figure(entry,profile,size))).join("");
    const url = writePage(profile,body,"body{display:grid;grid-template-columns:520px 338px}",
      `<pre id="results"></pre><script>document.fonts.ready.then(() => {
        document.querySelector("#results").textContent = JSON.stringify((${inspect})("${profile}"));
      })</script>`);
    const dom = chrome("--dump-dom","--virtual-time-budget=5000",url);
    const report = dom.match(/<pre id="results">(.*?)<\/pre>/)?.[1];
    if (!report) throw new Error("Chromium did not return a Family 09 layout report");
    reports.push(JSON.parse(report.replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">")));
  }
  // Screenshot every generated view in four contiguous atlas blocks, and capture
  // the representative transverse and decanter sheets at their own sizes.
  const screenshot = (slug, cases, profile, size, columns, options) => {
    const css = `body{display:grid;grid-template-columns:repeat(${columns},${520*size/100}px);background:${profile==="dark"?"#171717":"#fff"}}`;
    const page = writePage(slug,cases.map((entry) => options
      ? `<figure style="width:${520*size/100}px">${composeStructure(entry.model,{view:entry.view,hideTitle:true}).svg}</figure>`
      : figure(entry,profile,size)).join(""),css);
    const width = Math.ceil(520*size/100*columns), height = Math.ceil(340*size/100*Math.ceil(cases.length/columns));
    chrome(`--screenshot=${join(evidence,slug+".png")}`,`--window-size=${width},${height}`,
      "--run-all-compositor-stages-before-draw","--virtual-time-budget=3000",page);
  };
  for (let i=0;i<4;i++) screenshot(`atlas-${i+1}`,canonical.slice(i*24,(i+1)*24),"light",65,4);
  const representativeViews = canonical.filter(({ model }) => representatives.includes(model.kind));
  screenshot("representatives-dark",representativeViews,"dark",65,4);
  screenshot("representatives-nominal",representativeViews,"light",100,4);
  screenshot("recognition-no-titles",representativeViews,"light",65,4,true);
  screenshot("transverse-cuts",transverse,"light",100,3);
  screenshot("decanter-travel",decanters,"light",100,3);
  screenshot("stress-cases",stressCases,"light",100,3);
  chrome(`--print-to-pdf=${join(evidence,"family-09-monochrome.pdf")}`,"--no-pdf-header-footer",
    dirURL(join(out,"print-sheets.html")));
  const summary = { panels:reports.reduce((n,r)=>n+r.panels,0), labels:reports.reduce((n,r)=>n+r.labels,0),reports };
  writeFileSync(join(evidence,"layout.json"),JSON.stringify(summary,null,2)+"\n");
  const errors = reports.flatMap((r)=>r.errors);
  if (errors.length) throw new Error(errors.slice(0,32).join("\n")+ `\n${errors.length} total layout errors`);
  console.log(`Family 09 Chromium · ${summary.panels} panels, ${summary.labels} labels, 0 layout errors`);
} finally {
  rmSync(scratch,{recursive:true,force:true});
}
