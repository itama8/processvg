#!/usr/bin/env node
// Build the symbol legend sheets (560 × 440 Plotter drawings) and
// catalogue.json (every symbol's geometry, ports, states and sources) from library.mjs.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SYMBOLS, SERVICE_CODES, GATE_ALIASES, gateArchive, INSTRUMENT_PRESETS, LEGACY_INSTRUMENT_ANCHORS, place, placeSymbol } from "../src/library.mjs";
import { PRIMARY_ARCHIVE_IDS, composePrimaryElement, migratePrimaryElement } from "../src/library.mjs";
import { byId, SCREENING_ARCHIVE_IDS, SCREENING_CANDIDATES, SCREENING_STREAMS } from "../src/library.mjs";
import { LOGIC_IDS, placeLogicPrimitive } from "../src/logic.mjs";
import { render, svgDoc } from "../src/render.mjs";

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../drawings/symbols");
const srcLine = (sym) => sym.designApproval ? "Approved · verify standard" : sym.src.map((s) => (s.std === "Proposed" ? "proposed" : s.ref ? `${s.std} ${s.ref}` : s.std)).join(" · ");

// Legend sheets: 3 × 4 cells, one category per run of sheets.
const COLS = 3, ROWS = 4, CW = 176, CH = 100, X0 = 16, Y0 = 20, SCALE = 1.5;
mkdirSync(OUT, { recursive: true });
const sheets = [];
const legendCategory = (s) => s.operator || s.modifier ? "Operator heads and modifiers" : s.cat;
const candidateNames = {
  "inst-scada": "Main shared display",
  "inst-plc": "Alternate shared control",
  "inst-transmitter-is": "Crossed IS transmitter",
};
const cats = [...new Set(SYMBOLS.map(legendCategory))];
for (const cat of cats) {
  const isCandidate = cat === "Instrument candidates";
  const list = isCandidate ? SYMBOLS.filter((s) => Object.hasOwn(INSTRUMENT_PRESETS, s.id)) :
    SYMBOLS.filter((s) => legendCategory(s) === cat);
  if (cat === "Pumps and blowers") {
    const lobe = list.find((symbol) => symbol.id === "blower-lobe");
    list.splice(list.indexOf(lobe) + 1, 0, { ...lobe, legendVariant: "3-lobe" });
  }
  for (let page = 0; page * COLS * ROWS < list.length; page++) {
    const chunk = list.slice(page * COLS * ROWS, (page + 1) * COLS * ROWS);
    const shapes = [];
    chunk.forEach((sym, i) => {
      const cx = X0 + (i % COLS) * CW + CW / 2;
      const cy = Y0 + Math.floor(i / COLS) * CH + 38;
      if (sym.states) {
        shapes.push(...place(sym.draw({ closed: false }), { x: cx - 26, y: cy, s: SCALE }));
        shapes.push(...place(sym.draw({ closed: true }), { x: cx + 26, y: cy, s: SCALE }));
        const [open, closed] = sym.stateLabels ?? ["Open", "Closed"];
        shapes.push({ t: [cx - 26, cy + 30, open], value: true }, { t: [cx + 26, cy + 30, closed], value: true });
      } else if (isCandidate) {
        shapes.push(...placeSymbol(sym.id, { x: cx, y: cy, s: SCALE }, { mode: "candidate" }).shapes);
      } else if (sym.cat === "Primary elements") {
        shapes.push(...placeSymbol(sym.id, { x: cx, y: cy, s: SCALE }, { mode: "current" }).shapes);
      } else if (sym.pump) {
        shapes.push(...placeSymbol(sym.id, { x: cx, y: cy, s: SCALE }, {
          variant: sym.legendVariant ?? sym.pump.defaultVariant,
        }).shapes);
      } else if (sym.operator || sym.modifier || sym.assemblyPreset) {
        shapes.push(...placeSymbol(sym.id, { x: cx, y: cy, s: SCALE }).shapes);
      } else {
        shapes.push(...place(sym.draw({}), { x: cx, y: cy, s: SCALE }));
      }
      const name = sym.id === "blower-lobe" ? `Rotary lobe blower (${sym.legendVariant ?? "2-lobe"})` :
        isCandidate ? candidateNames[sym.id] ?? sym.name : ({
        "fe-ultrasonic": "Generic non-contact level",
        "fe-hydrostatic": "Hydrostatic probe",
        "fe-analysis-chlorine": "Residual chlorine",
        "fe-analysis-ammonium": "Ammonium",
        "fe-analysis-nitrate": "Nitrate",
        "fe-analysis-phosphate": "Phosphate",
        "fe-analysis-mlss": "Mixed liquor suspended solids",
        "fe-analysis-orp": "Oxidation-reduction potential",
      })[sym.id] ?? sym.name;
      const candidatePump = sym.pump && (sym.legendVariant ?? sym.pump.defaultVariant) !== sym.pump.archiveVariant;
      const source = candidatePump ? "Processvg candidate" :
        ["fe-float", "fe-hydrostatic"].includes(sym.id) ? "Approved · verify standard" : srcLine(sym);
      shapes.push({ t: [cx, cy + 46, name] }, { t: [cx, cy + 59, isCandidate ? "Processvg candidate" : source], value: true });
    });
    const slug = `legend-${cat.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "")}${page ? `-${page + 1}` : ""}`;
    const description = isCandidate ? "Candidate P&ID enclosures and panel identities. Original symbols remain in the instrument archive." :
      `P&ID symbols: ${chunk.map((s) => s.name).join(", ")}.`;
    writeFileSync(path.join(OUT, `${slug}.svg`), svgDoc(slug, `${cat} symbols`, description, render(shapes)));
    sheets.push({ slug, cat });
  }
}

// Catalogue: geometry at scale 1, for other tools to place and connect.
const catalogue = {
  about: "P&ID symbols for water and wastewater treatment drafts. Units: Plotter canvas units, symbol local origin (0, 0); use port and flow metadata for direction. Valve variants depict normal state; see docs/family-02.md for valves and docs/family-04.md for gates and weirs. See docs/family-05.md for instrument modes, docs/family-06.md for primary elements and measuring views, and docs/family-07.md for pump variants and equipment views. See docs/family-08.md for provisional screening and grit.",
  sources: {
    "IS 3232": "IS 3232:1999 Recommendations on graphical symbols for process flow diagrams, piping and instrumentation diagrams (BIS), by symbol number",
    "ISA-5.1": "ANSI/ISA-5.1-2009 Instrumentation symbols and identification",
    "B&C": "Brown and Caldwell, Pahala WWTP design-build documents, sheets C-001, P-002, P-003, P-101 (County of Hawaii, 2021; published by US EPA)",
    Proposed: "Drafted here; agree with the firm before use",
    "Processvg design": "User-approved library geometry; exact standards verification pending",
  },
  aliases: GATE_ALIASES,
  gateArchive,
  logicView: {
    mode: "logic", verification: "Processvg candidate conventions, diagram only",
    primitives: Object.fromEntries(LOGIC_IDS.map((id) => [id, placeLogicPrimitive(id, {}, { mode: "logic" })])),
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
    gate: s.gate,
    instrument: Object.hasOwn(INSTRUMENT_PRESETS, s.id) ? (() => {
      const { metadata, shapes, anchors, ports, bars, radius } = placeSymbol(s.id, {}, { mode: "candidate" });
      const legacyPortAnchors = LEGACY_INSTRUMENT_ANCHORS[s.id];
      return {
        defaultMode: legacyPortAnchors ? "legacy" : "candidate",
        legacyPortAnchors,
        verification: "Processvg candidate geometry; exact standards verification pending",
        candidate: { metadata, shapes, anchors, ports, bars, radius },
      };
    })() : undefined,
    glyphRef: s.glyphRef,
    pump: s.pump,
    primaryElement: s.cat === "Primary elements" ? (() => {
      const archived = PRIMARY_ARCHIVE_IDS.includes(s.id);
      const config = { symbolId: s.id };
      const { shapes, metadata, interfaces, sensing, stations, transfers, identityLayout } = composePrimaryElement({ ...config, mode: "current" });
      return { defaultMode: archived ? "legacy" : "current",
        current: { shapes, metadata, interfaces, sensing, stations, transfers, identityLayout },
        ...(identityLayout && { identityStyles: ["outlined", "unboxed"],
          installations: ["immersion", "insertion", "cell", "cabinet"] }),
        ...(s.id === "fe-flume" && { views: { schematic: "archive", plan: "conceptual", section: "conceptual" } }),
        ...(archived && { migration: migratePrimaryElement(config).portMap }) };
    })() : undefined,
    stateLabels: s.stateLabels,
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
  screeningReview: {
    optIn: { variant: "candidate" },
    physicalViews: ["plan", "section", "elevation"],
    streams: SCREENING_STREAMS,
    symbols: Object.values(SCREENING_CANDIDATES).map((candidate) => ({
      ...candidate,
      defaultVariant: candidate.legacyId ? "legacy" : null,
      variants: {
        ...(SCREENING_ARCHIVE_IDS.includes(candidate.id) && {
          legacy: { shapes: byId[candidate.id].draw({}), ports: byId[candidate.id].ports },
        }),
        candidate: { shapes: candidate.shapes, interfaces: candidate.interfaces },
      },
      shapes: undefined,
      interfaces: undefined,
    })),
  },
  serviceCodes: SERVICE_CODES,
};
writeFileSync(path.join(OUT, "catalogue.json"), JSON.stringify(catalogue, null, 1));

console.log(sheets.map((s) => s.slug).join("\n"));
