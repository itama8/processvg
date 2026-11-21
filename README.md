# processvg

Beautiful drawings for process engineers. P&IDs, process flow diagrams, sections and
layouts of water and wastewater treatment plants, drawn as clean, editable SVG in the
[Plotter](https://github.com/pasqualevitiello/plotter) style: one ink, one-unit strokes,
opacity for hierarchy, and per-symbol source and review status.

## What is here

| Path | What |
|---|---|
| `src/library.mjs` | The symbol library: lines, valves (open and closed), actuators, channel gates, instruments, primary elements, pumps and blowers, screening and grit. Each symbol has ports, states and its sources. |
| `src/render.mjs` | Shapes to SVG in Plotter roles, with screen and print profiles. |
| `docs/family-01.md` | Family 01 ports, routed line patterns, off-sheet connectors, elevation annotations, and the review gallery. |
| `docs/family-02.md` | Valve body composition, normal and operating states, typed interfaces and review fixtures. |
| `docs/family-03.md` | Actuator heads and legacy presets, shared equipment mounting, and layout/export review. |
| `docs/family-05.md` | Instrument modes, identity and ports, archived compatibility, and referenced logic diagrams. |
| `docs/structures.md` | What each treatment structure symbol must show (SBR, MBBR, tube settler, clarifier, grit chambers, …): the test drafts are judged against. |
| `docs/sources.md` | IS 3232, ISA-5.1, the Brown and Caldwell reference set, CPHEEO, Metcalf & Eddy, and utility standards. |
| `examples/` | Drafts built from the library: an inlet-works P&ID and an SBR basin section. |
| `drawings/` | Generated SVGs: the examples, the legend sheets, and `symbols/catalogue.json` (every symbol's geometry for other tools). |
| `vendor/plotter/` | The Plotter skill package (MIT; Cal Sans under OFL 1.1), unmodified. `UPSTREAM` records the commit. |
| `private/` | Ignored by git. Drawings made from client or project files. |

## Conventions

- In the design view, a filled isolation valve is normally closed. A hollow valve may carry an explicit position label, including NC at reduced scale. See [Family 02](docs/family-02.md) for passive valves and the separate operating view. See [Family 04](docs/family-04.md) for channel-gate states, archive placement and physical views.
- Instrument tags are kept simple: `FIT-1`, `LIT-1`, `LIT-2`. A differential level across a
  screen is computed from two LITs and tagged `DLT-1`, drawn as a computed (PLC/SCADA)
  function.
- Treatment structures are drawn as open-top sections: walls and floor at full ink, water
  level and internals faint, ports on the outline.
- **Screen drawings follow the reader's theme by default**: dark ink on light, light ink on dark, through
  `prefers-color-scheme`. A host page can set the ink itself with `data-host-ink` on the svg.
  Strokes stay one pixel at any display size. The SVG print profile uses black ink on white paper.

## Use

```sh
npm run build    # regenerate drawings/ from src/ and examples/
npm run check    # Plotter checks and family geometry and semantics
npm run review   # review/index.html: drawings and family galleries
```

Needs Node 20+ and Python 3. Rendering PNGs uses `python3 vendor/plotter/scripts/render.py`
and a Chromium browser.

## Relation to Plotter

processvg builds on Plotter's drafting standard and tooling and keeps a copy of its skill
package in `vendor/plotter`. To update it, copy `skills/plotter/` from a newer Plotter
checkout and record the commit in `vendor/plotter/UPSTREAM`.

## Licence

processvg is licensed under the [MIT License](LICENSE). Vendored Plotter is
covered by its [MIT license](vendor/plotter/LICENSE), and the Cal Sans font is
covered by the [SIL Open Font License 1.1](vendor/plotter/assets/fonts/OFL.txt).
