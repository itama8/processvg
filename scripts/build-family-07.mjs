import { mkdirSync, writeFileSync } from "node:fs";
import { composePumpDocument, placeSymbol, SYMBOLS } from "../src/library.mjs";
import { render, svgDoc } from "../src/render.mjs";
import { submersible, topology } from "../tests/fixtures/family-07-documents.mjs";

const out = new URL("../review/family-07/", import.meta.url);
mkdirSync(out, { recursive: true });
const profiles = { light: { theme: "light" }, dark: { theme: "dark" }, print: { profile: "print" } };
const equipment = SYMBOLS.filter((symbol) => symbol.pump);
const cards = equipment.flatMap(({ id, pump }) => [pump.defaultVariant, ...(id === "blower-lobe" ? ["3-lobe"] : [])]
  .map((variant) => ({ id, variant })));
const text = (x, y, label, extra = {}) => ({ t: [x, y, label], ...extra });
const route = (points, extra = {}) => ({ d: "M" + points.map((point) => point.join(" ")).join(" L"), ...extra });
const galleryNames = { "pump-liquid-ring": "Liquid ring vacuum pump", "pump-submersible": "Submersible pump",
  "blower-centrifugal": "Centrifugal blower", "blower-multistage": "Multistage blower", "drive-vfd": "Variable frequency drive" };

function save(id, title, description, groups, labels, profile = "light", prefix = out) {
  const options = profiles[profile];
  const body = groups.map(({ shapes, attrs = "" }) => `<g ${attrs}>${render(shapes, options)}</g>`).join("\n");
  writeFileSync(new URL(id + ".svg", prefix), svgDoc(id, title, description, body + "\n" + render(labels, options), options));
}

function gallery(entries, scale) {
  const groups = [], labels = [];
  for (const [index, { id, variant }] of entries.entries()) {
    const x = 73 + 138 * (index % 4), y = 72 + 96 * Math.floor(index / 4);
    const record = equipment.find((symbol) => symbol.id === id);
    const name = galleryNames[id] ?? record.pump.label;
    const block = placeSymbol(id, { x, y, s: scale }, { variant });
    groups.push({ ...block, attrs: variant === "legacy-assembly" ? 'data-archive-dosing=""' : "" });
    labels.push(text(x, y + 45, id === "blower-lobe" ? `Rotary lobe blower (${variant})` : name));
  }
  return { groups, labels };
}

function lobeRotations(scale) {
  const groups = [], labels = [];
  for (const [row, variant] of ["2-lobe", "3-lobe", "legacy"].entries()) {
    labels.push(text(17, 80 + 115 * row, variant, { align: "start" }));
    for (let q = 0; q < 4; q++) {
      const x = 124 + 112 * q, y = 77 + 115 * row;
      const block = placeSymbol("blower-lobe", { x, y, q, s: scale }, { variant });
      groups.push({ shapes: block.shapes, attrs: `data-lobe="${variant}" data-q="${q}"` });
      if (row === 0) labels.push(text(x, 27, `${q * 90}°`));
    }
  }
  return { groups, labels };
}

function topologyView(scale) {
  const model = composePumpDocument(topology, { intent: "create" });
  const move = ([x, y]) => [x * scale + (1 - scale) * 280, y * scale + (1 - scale) * 220];
  const groups = model.document.instances.map(({ symbolId, at, variant }) => {
    const [x, y] = move([at.x, at.y]);
    return placeSymbol(symbolId, { ...at, x, y, s: at.s * scale }, { variant });
  });
  groups.push({ shapes: model.network.edges.map(({ kind, points }) => route(points.map(move),
    kind === "electrical-power" ? { role: "secondary", dash: "4 3" } : {})) });
  groups.push({ shapes: [route([[278, 90], [440, 90]].map(move)),
    { c: [...move([350, 90]), 1.5], role: "dot", fill: "solid" }] });
  const notes = [[280, 32, "Polymer dosing with independent motor and VFD"],
    [446, 66, "Branch dampener"], [171, 195, "Electrical supply"], [273, 120, "Shaft", { align: "start" }],
    [145, 244, "Airlift"], [391, 244, "Steam eductor"], [87, 333, "Air"], [145, 389, "Wet well"], [211, 268, "Two-phase"],
    [311, 302, "Steam"], [393, 390, "Vapour"], [462, 299, "Mixed discharge"]];
  const labels = notes.map(([x, y, label, opts]) => text(...move([x, y]), label, opts));
  return { groups, labels };
}

function physicalViews(scale) {
  const { document } = composePumpDocument(structuredClone(submersible), { intent: "create" });
  const resize = (at) => ({ ...at, s: (at.s ?? 1) * scale });
  const instance = document.instances[0];
  instance.at = resize(instance.at);
  for (const spec of Object.values(instance.views)) spec.at = resize(spec.at);
  const views = ["schematic", "plan", "section", "electrical"];
  const groups = views.flatMap((view) => composePumpDocument(document, { view }).blocks);
  const notes = [[280, 33, "P-701   Standby • Running • VFD   1280 rpm actual / 1450 rpm setpoint"],
    [56, 69, "Schematic"], [260, 69, "Plan"], [450, 59, "Section"], [260, 245, "Electrical projection"]];
  const labels = notes.map(([x, y, label]) => text(x, y, label));
  return { groups, labels };
}

const sheets = [
  ["01-pumps", "Pump and blower symbols", "Candidate motifs, the compact centrifugal source and the legacy dosing assembly.", (scale) => gallery(cards.slice(0, 16), 1.45 * scale)],
  ["02-drives-accessories", "Blowers, drives and accessories", "Candidate motifs with independent electrical and mechanical interfaces.", (scale) => gallery(cards.slice(16), 1.45 * scale)],
  ["03-lobe-rotations", "Rotary lobe variants in four orientations", "The upper rows share one casing. The historical glyph is shown in the lower row.", (scale) => lobeRotations(1.5 * scale)],
  ["04-topology", "Dosing, airlift and eductor topology", "The dashed route is electrical. The solid link to the dosing head is a mechanical shaft. The dampener has a single process branch.", topologyView],
  ["05-physical", "Submersible pump asset views", "One asset ties schematic, plan, section, electrical projection and operating data together. Dimensions are illustrative.", physicalViews],
];
const variants = new URL("../family-07-evidence/svg/", out);
mkdirSync(variants, { recursive: true });
const evidence = [];
for (const [id, title, description, build] of sheets) {
  for (const [size, scale] of Object.entries({ nominal: 1, reduced: 0.55 })) {
    const { groups, labels } = build(scale);
    for (const profile of Object.keys(profiles)) {
      const name = `${id}-${size}-${profile}`;
      save(name, title, description, groups, labels, profile, variants);
      evidence.push(name);
    }
    if (size === "nominal") save(id, title, description, groups, labels);
  }
}
const authored = Object.fromEntries(Object.entries({ submersible, topology }).map(([key, document]) =>
  [key, composePumpDocument(document, { intent: "create" }).document]));
writeFileSync(new URL("fixtures.json", out), JSON.stringify({ authored, cards, evidence }, null, 2) + "\n");
