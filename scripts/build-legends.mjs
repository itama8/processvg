#!/usr/bin/env node
// Build the symbol legend sheets (560 × 440 Plotter drawings) and
// catalogue.json (every symbol's geometry, ports, states and sources) from library.mjs.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SYMBOLS, SERVICE_CODES, place, placeSymbol } from "../src/library.mjs";
import { esc, render, svgDoc } from "../src/render.mjs";

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../drawings/symbols");
const srcLine = (sym) => sym.designApproval ? "Approved · verify standard" : sym.src.map((s) => (s.std === "Proposed" ? "proposed" : s.ref ? `${s.std} ${s.ref}` : s.std)).join(" · ");

// Legend sheets: 3 × 4 cells, one category per run of sheets.
const COLS = 3, ROWS = 4, CW = 176, CH = 100, X0 = 16, Y0 = 20, SCALE = 1.5;
mkdirSync(OUT, { recursive: true });
const sheets = [];
const legendCategory = (s) => s.operator || s.modifier ? "Operator heads and modifiers" : s.cat;
const cats = [...new Set(SYMBOLS.map(legendCategory))];
for (const cat of cats) {
  const list = SYMBOLS.filter((s) => legendCategory(s) === cat);
  for (let page = 0; page * COLS * ROWS < list.length; page++) {
    const chunk = list.slice(page * COLS * ROWS, (page + 1) * COLS * ROWS);
    const shapes = [];
    chunk.forEach((sym, i) => {
      const cx = X0 + (i % COLS) * CW + CW / 2;
      const cy = Y0 + Math.floor(i / COLS) * CH + 38;
      if (sym.states) {
        shapes.push(...place(sym.draw({ closed: false }), { x: cx - 26, y: cy, s: SCALE }));
        shapes.push(...place(sym.draw({ closed: true }), { x: cx + 26, y: cy, s: SCALE }));
        shapes.push({ t: [cx - 26, cy + 30, "Open"], value: true }, { t: [cx + 26, cy + 30, "Closed"], value: true });
      } else if (sym.operator || sym.modifier || sym.assemblyPreset) {
        shapes.push(...placeSymbol(sym.id, { x: cx, y: cy, s: SCALE }).shapes);
      } else {
        shapes.push(...place(sym.draw({}), { x: cx, y: cy, s: SCALE }));
      }
      shapes.push({ t: [cx, cy + 46, sym.name] }, { t: [cx, cy + 59, srcLine(sym)], value: true });
    });
    const slug = `legend-${cat.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "")}${page ? `-${page + 1}` : ""}`;
    writeFileSync(path.join(OUT, `${slug}.svg`), svgDoc(slug, `${cat} symbols`, `P&ID symbols: ${chunk.map((s) => s.name).join(", ")}.`, render(shapes)));
    sheets.push({ slug, cat });
  }
}

// Catalogue: geometry at scale 1, for other tools to place and connect.
const catalogue = {
  about: "P&ID symbols for water and wastewater treatment drafts. Units: Plotter canvas units, symbol local origin (0, 0); use port and flow metadata for direction. Valve variants depict normal state; see docs/family-02.md for fill and label rules.",
  sources: {
    "IS 3232": "IS 3232:1999 Recommendations on graphical symbols for process flow diagrams, piping and instrumentation diagrams (BIS), by symbol number",
    "ISA-5.1": "ANSI/ISA-5.1-2009 Instrumentation symbols and identification",
    "B&C": "Brown and Caldwell, Pahala WWTP design-build documents, sheets C-001, P-002, P-003, P-101 (County of Hawaii, 2021; published by US EPA)",
    Proposed: "Drafted here; agree with the firm before use",
    "Processvg design": "User-approved library geometry; exact standards verification pending",
  },
  symbols: SYMBOLS.map((s) => ({
    id: s.id, name: s.name, category: s.cat, sources: s.src, states: s.states ? ["open", "closed"] : undefined, tagged: s.tag || undefined,
    ports: s.ports,
    portNames: s.portNames,
    connectivity: s.connectivity,
    verification: s.verification,
    flatSide: s.flatSide,
    designApproval: s.designApproval,
    historicalSources: s.historicalSources,
    valve: s.valve,
    operator: s.operator,
    modifier: s.modifier,
    assemblyPreset: s.assemblyPreset,
    representations: s.valve?.representations && Object.fromEntries(s.valve.representations.map((representation) => {
      const { shapes, processPorts, sensing } = placeSymbol(s.id, {}, { representation });
      return [representation, { shapes, processPorts, sensing }];
    })),
    shapes: s.states ? { open: s.draw({ closed: false }), closed: s.draw({ closed: true }) } : s.draw({}),
  })),
  serviceCodes: SERVICE_CODES,
};
writeFileSync(path.join(OUT, "catalogue.json"), JSON.stringify(catalogue, null, 1));

console.log(sheets.map((s) => s.slug).join("\n"));
