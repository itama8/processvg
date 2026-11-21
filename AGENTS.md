# AGENTS.md

processvg draws P&IDs, process flow diagrams and treatment-structure sections as editable
SVG in the Plotter style. These notes are for coding agents (Claude Code, Codex, Sushi
contributors) working in or with this repo.

## Make a drawing

Compose from the library. Never hand-write symbol geometry or invent a symbol ID.

```js
import { placeSymbol, routeLine, render, svgDoc } from "processvg"; // or ./src/index.mjs

const pump = placeSymbol("pump-centrifugal", { x: 200, y: 220 });
const [, outlet] = pump.ports;                  // [suction, discharge]; discharge sits high
const valve = placeSymbol("valve-gate", { x: 300, y: outlet[1] }, { closed: false });
const pipe = routeLine("line-flow", [outlet, valve.ports[0]]);
const body = render([...pump.shapes, ...pipe.shapes, ...valve.shapes,
  { t: [200, 250, "P-101"] }]);
const svg = svgDoc("p101", "Raw sewage pump", "Pump P-101 discharging through an open gate valve.", body);
```

- Canvas is 560 × 440. `placeSymbol(id, { x, y, s, q })` scales by `s` and turns `q`
  clockwise quarter turns; its `ports` and `portNames` are in drawing space, so join lines
  to ports, not to guessed coordinates.
- IDs, names, ports and sources for every symbol: `drawings/symbols/catalogue.json`.
- Shapes are `{ d, role?, fill?, dash? }`, `{ c: [x, y, r] }` or `{ t: [x, y, text], value? }`.
  Roles: `primary` (default), `secondary`, `signal`, `dot`, and every Plotter role
  (`dimension`, `leader`, `hidden`, `centerline`, `guide`, `hatch`, `proposed`, …) with ink and
  dash from `vendor/plotter/assets/foundation/standard.json`. For dimensions, arrows and
  rectangular hatching, use Plotter's helpers (`vendor/plotter/assets/foundation/index.mjs`).
- `svgDoc(..., { profile: "print" })` for black on white; `{ theme: "light" | "dark" }` for an
  explicit screen background. The default follows the reader's colour scheme.
- `profile: "inline"` (in both `render` and `svgDoc`) is for hosts that cannot import modules or
  trust `<style>`, such as ChatGPT's inline UI. It uses attributes only, `currentColor` ink and no
  paper. Knockout mask IDs are scoped to the `svgDoc` id; use `render(shapes, { idPrefix })` when
  you inline without `svgDoc`.
- Line patterns, off-sheet connectors and elevation annotations: `docs/family-01.md`.
  What a structure section must show: `docs/structures.md`.

## Before delivering

1. `python3 scripts/check.py drawing.svg` and fix every error. It runs Plotter's checker with
   the documented P&ID exceptions (print labels, legend density, theme stylesheet).
2. Render and look (`python3 vendor/plotter/scripts/render.py`), or say the visual review is pending.
3. Symbols whose source is `Proposed` must be called out as needing the firm's agreement.

## Rules of the house

- A valve or gate drawn filled is normally closed; hollow is open.
- Tags stay simple (`FIT-1`, `LIT-2`); a computed difference is `DLT-1`.
- Labels follow Plotter: 10 units, weight 400, never bold or all caps for emphasis.
- Embedding hosts set ink with the `--plotter-ink` CSS custom property; do not edit the
  inline `<style>` per host.
- `private/` holds client drawings. Never commit it, quote it, or send it to an outside service.
- `vendor/plotter/` is upstream and unmodified; change it only by re-vendoring.

## Repo commands

```sh
npm run build    # regenerate drawings/ and the Family 01 gallery
npm run check    # processvg check (Plotter + P&ID exceptions) on every drawing, plus node tests
npm run review   # review/index.html
```

How other agents and Omakase Sushi consume this repo, the Plotter alignment and the check
exceptions: `docs/agents.md`.
