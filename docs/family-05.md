# Family 05 instruments and logic

The 11 instrument presets include the seven archived IDs. Family 05 implements the approved composition and identity contract. The new enclosure, location and logic geometry is a Processvg review candidate. The instrument preset geometry draws on the broad conventions in the handoff's cited [ANSI/ISA-5.1-2009 Tables 5.1.1 and 5.1.2](https://upmation.com/wp-content/uploads/2023/02/ISA5.1-1984R2009.pdf#page=36). The legend records candidate status. Pending review includes current ISA edition compliance, exact IS 3232 forms, dimensions, project-specific conventions, physical printer legibility, and project control or safety validation. The alternate square-diamond and shared-display presets carry no equipment, execution-host, or safety classification.

## Placement and compatibility

`placeSymbol(id, at, options)`, `byId[id].draw(options)`, the archived instrument legend, and the original catalogue fields preserve the seven archive glyphs and source citations. For the seven archived IDs, `placeSymbol` defaults to legacy and also accepts `mode: "legacy"`. This preserves placements, quarter turns, tags, opacity and indexed ports for existing drawings. The archive's original LIC and PI examples remain historical fixtures. `placeSymbol(id, at, { mode: "candidate" })` explicitly selects the refined presets. New IDs are candidate-only. The normal catalogue keeps archived shapes and port indices in the original fields and exposes candidate shapes, named anchors, modes and verification separately under `instrument`.

Use `composeInstrument(config, at, display)` for an authored candidate instance. Enclosure and location can be explicit or supplied by a preset. `at` specifies the instance position and scale. Optional `display.parent` transforms an offset relative to associated equipment. The rendered enclosure, bars, identity and cardinal directions stay upright at every quarter turn.

```js
import { composeInstrument, instrumentNetwork, placeSymbol } from "../src/library.mjs";

const panel = placeSymbol("inst-panel", { x: 100, y: 120 }, {
  mode: "candidate",
  id: "asset-panel-7",
  panel: { identifier: "MCP", number: "007" },
});

const levelController = composeInstrument({
  id: "function-level-4",
  kind: "control-function",
  hostedBy: "asset-panel-7",
  enclosure: "discrete",
  location: "main",
  tag: { letters: "LIC", loop: "004" },
  ports: [{ id: "reading", anchor: "W", kind: "digital-data", direction: "in" }],
}, { x: 200, y: 120 });

const inventory = instrumentNetwork([panel, levelController]);
```

## Identity and connections for Family 06

- `id` is the stable instance key. A tag, panel number, preset ID, enclosure and drawing anchor each serve separate purposes. Supply an instance ID when using a preset for authored equipment. Preset IDs and their examples serve the legends.
- `kind` distinguishes a physical instrument, computed function, control function, shared display, control panel, and interlock reference. `panel.identifier` and optional `panel.number` are panel identity. MCP and LCP mean Main Control Panel and Local Control Panel in this library. Authored LIC and PI remain instrument function letters at any location. Candidate placement with an authored tag on a panel preset is `unclassified` until the project sets `kind`. The location bar states where the function is mounted and does not distinguish a controller (LIC) from an indicator (PI). Archive migration of such an instance also reports `needsClassification`. See the [Families 04–09 review](families-04-09-review.md).
- `tag.letters`, optional `tag.loop` and optional `tag.externalId` preserve exact strings, including leading zeros and namespace spelling. `hostedBy` resolves a distinct panel asset ID. `executionHost` is independent metadata. It can refer to an execution-system registry owned by the calling project. The selected enclosure remains independent of both host relationships. `instrumentNetwork` returns physical-device IDs and separately returns declared measuring-device IDs (physical instruments with `measuredQuantity`). The example shows two measured levels and a computed difference in metres with a declared common datum. The operation descriptor records the intended computation. Execution, datum validation, and unit conversion belong to the project.
- Geometric `anchors` always give four named sheet-space points. Use `ports` for authored interfaces with an ID, anchor, kind and direction. The network resolves kind-compatible pairs to their current endpoints and supplies no pipe continuity. Port kinds cover process-sensing, electrical, pneumatic, hydraulic, digital-data, logical-dependency and mechanical. Process sensing is limited to physical instruments. Multiple interfaces need distinct exits. Fan-out uses an explicit junction in the caller's topology. The network checks repeated use of one interface, mismatched kinds and directions, and unknown assets or ports. Line graphics are chosen by the drawing caller.
- `migrateInstrument({ version: 0, symbolId, id, at, options }, display)` is opt-in. Supply the saved tag tuple or authored tag object, or supply a panel identity when that was actually known. An unavailable legacy identity is flagged and omitted. Ambiguous main/local archive instances without an identity or a declared kind are marked unclassified until the project resolves them. No loop or panel number is invented. The report carries old numeric indices, corresponding named anchors, old and new sheet points, and a reroute flag for each change. The original placement is returned. Review and reroute edges when the candidate grows or becomes upright. Legacy slots do not assign typed interfaces. Existing file formats and drawings carry on through legacy placement.

## Geometry, ink and documented departures

The 4 × 5 matrix covers discrete, shared primary, shared alternate, and computer enclosures with field, main accessible, main inaccessible, local accessible, and local inaccessible marks. The nested shapes are tangent. Bar endpoints lie on the inner shape. Computer height uses the exact square-root expression. The two local bars are at −2 and +2. Dashed bars use explicit butt-capped segments around a nominal 2.5:1.5 dash-to-gap pattern. Fitting a whole symmetric pattern to each span puts a full dash at each boundary and prevents short residual dashes or phase changes between the two bars. Unsupported field accessibility is rejected. Review sheets use 0.65-unit strokes and production defaults to the shared non-scaling one-unit stroke. Projects can pass `strokeWidth` to `svgDoc`.

The layout fits declared identity strings at 7.5 local units by default using actual Cal Sans Regular ink extents. It centers ink optically, clears outlines and bars by a local-unit minimum, and grows from radius 16 to the first fitting integer radius with a default cap of 64. Larger measured glyphs can move the rows apart. An overflowing tag produces a diagnostic unless the caller explicitly chooses the permitted external variant. The crossed transmitter keeps its fixed circle, uses exact inscribed endpoints for the X, and puts supplied identity outside it. External identity, reference, and optional `annotation.service` or `annotation.value` use collision-aware placement against supplied `display.avoidBounds` and `display.avoidRoutes`. Pass planned adjacent routes when composing a callout.

Cal Sans glyphs are bundled as measured outlines with their original license and font hash. The same ink is used for fit and output. Screen and print identities are full ink. The authoring strings and accessible SVG labels remain available. Exported glyph outlines sacrifice editable SVG text and rely on source tags for editing. The bundled layout uses fixed advances without kerning, NFC for visual composition, and a documented Latin subset with selected symbols. Unsupported glyphs fail explicitly. A project can supply deterministic `display.measureInk(text, size)` returning baseline-relative y-down `bounds: [left, top, right, bottom]`, outline `paths: [{x, d}]` and a positive `scale`. Source tag strings are preserved even when NFC is used for rendering. The stock Plotter checker evaluates ordinary captions on screen sheets with its standard one-unit stroke. Candidate identity paths, compact dash contrast and print ink are checked independently in Chromium.

## Logic and references

`placeLogicPrimitive` and `placeSymbol` require `mode: "logic"` for the AND, OR, NOT, and TON primitives. `composeLogicDiagram` resolves explicitly routed logical dependencies by node and pin. The two-input OR stubs meet its quadratic at x = −9, y = ±5; the review example cascades two-input AND gates for a three-condition result. Crossings have no connectivity meaning. Unconnected inputs display `?` and carry an unknown state. `logicTruth` tests combinational primitives with true, false, and unknown.

A candidate P&ID interlock uses the fixed diamond and may declare `reference: { id, logicId, label }`. Its external reference preserves the W/E routing convention and can move around routes. `resolveInterlockReference` requires one diagram with a matching stable diagram ID and reference ID in both directions. The logic catalogue is separate from the P&ID symbol list. Timer PT is a declared value with units and ET is an optional elapsed-time output. The diagram API contains no runtime timer or equipment commands.

## Reproduction and evidence

```sh
npm run all
npm run check:instrument-layout
pdftoppm -r 96 -gray -png review/family-05-evidence/family-05-print.pdf review/family-05-evidence/print
uv run --script scripts/build-instrument-font.py
```

- `drawings/symbols/catalogue.json`, `legend-instruments.svg` and `legend-instrument-candidates.svg` are the normal entry points.
- `review/index.html` includes the archive, matrices, identity examples and separate logic sheets. `review/family-05/contract.json` records fixture inputs and resolved geometry/identities. SVGs include light, dark, transparent and print matrices at 1.35× and 0.85×.
- `review/family-05-evidence/layout.json`, the Chromium PNG comparisons, and `family-05-print.pdf` record the automated and visual review. Chromium checked 17 sheets, 644 labels and 1,488 dash/gap samples with zero errors. The print proof is six pages. The archived SVG and the rasterized base/current archive legend matched. Reduced glyphs and dashes were inspected at these review scales; smaller production sizes and physical printer output are unverified.
- Inputs were the iteration 03 panel-label correction handoff (SHA-256 `e9499a525c3a4a452e30e8b514c3a62f63e079da3604352de7eb74385347fa48`) and its review SVG (SHA-256 `5234a1321cf88932e1e74924dffd573aab388d66ebcf5d384317e3f11f424a0f`).
