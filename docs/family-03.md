# Family 03 · Actuators

Implemented from the user-approved Family 03 revision 03 handoff on Family 02 commit `73602b3254b7a826d7de24c99ee0b78888586ec9`. The base includes the approved upward-flow foot-valve amendment. The Family 03 work uses that baseline directly. The existing gate catalogue entries and the inlet works and basin example drawings rebuild byte-for-byte.

## Placement

`placeSymbol("operator-handwheel", at)` places a head at its stem-side anchor. The ten `operator-*` entries and `modifier-spring-return` have empty process-port lists. `placeSymbol("modifier-spring-return", at)` returns two transformed graphic attachments. The legacy `act-hand`, `act-motor`, `act-solenoid`, `act-diaphragm` and `valve-control` entry points still place complete valve presets with their historical pipe faces and default stems. `valve-control` identifies a modulating valve function and uses the diaphragm head. `valve-float-operated` uses the shared float operator and defaults to the gate-valve body.

```js
import { composeValve, placeOperatingValve } from "../src/library.mjs";

const config = {
  bodyId: "valve-knife",
  tag: "KV-301",
  normalPosition: "open",
  operatingPosition: { position: "closed", openingPercent: 0 },
  failPosition: "closed",
  failEvent: "loss of air",
  actuator: {
    headId: "operator-pneumatic-cylinder",
    motion: "linear",
    controlMode: "on-off",
    stemLength: 8,
    modifiers: ["modifier-spring-return"],
  },
  endConnections: { in: { type: "flanged" } },
};
const at = { x: 120, y: 80, q: 1, s: 1.5 };
const design = composeValve(config, at);
const operating = placeOperatingValve(config, at);
```

Existing callers can keep `actuator.type` (for example `"hand"` or `"motor"`). New callers can specify `headId`. Supply energy source, output motion and control mode as separate fields where known. The library provides energy defaults for manual operators, motors, solenoids and the P/H cylinders. The gearbox and diaphragm leave drive energy unspecified by default. Float response is independently configurable as `"open-on-rise"`, `"close-on-rise"` or `"unknown"`. Drive selection, pilots, controls and power or signal connections require equipment and project input.

Family 02 owns valve positions and interpretation. FO means fail open, FC means fail closed and FLP means fail at last position for the stated event. An event can be left unspecified. Explicit unknown failure position produces an explanatory label without an abbreviation. `failPosition: "not-applicable"` records inapplicability and omits the failure label. Loss of utility supply and loss of command can have different consequences. This schema records one configured failure response and one optional event. A larger cause-and-effect schedule belongs in project data. Operating percentages describe reported travel. A spring callout carries no implied failure position.

## Mechanical mounting for other equipment

```js
import { composeActuator, placeSymbol } from "../src/library.mjs";

const at = { x: 140, y: 100, s: 1.5, q: 0 };
const gate = placeSymbol("gate-slide", at);
const operator = composeActuator(
  { point: [0, -10], normal: [0, -1] },
  { headId: "operator-hydraulic-cylinder", stemLength: 12 },
  at,
);
const shapes = [...gate.shapes, ...operator.shapes];
```

- The equipment supplies a local mount point, cardinal outward normal and optional `clearance` past the mount. Mount clearance reserves a strip for the equipment silhouette and its connection furniture. Schematic units are independent of physical equipment dimensions. The returned `stem`, `anchors.mount`, `anchors.head`, optional `anchors.spring` and `bounds` are in drawing space. The caller supplies process or channel terminals separately.
- `stemLength` requests a nonnegative outward reach. `metadata.mountedReach` records the final projection along the mount normal. For a short request, the renderer moves the head outward to clear the reserved strip, the head's own extent and the visible stroke. A flush cylinder can meet a knife or slide-gate top at zero reach. A wheel or T operator spanning a bowtie needs more room. The wheel keeps the approved centre attachment. Its ellipse has six units of intrinsic height.
- `headOrientation: "mount"` follows the mount. `"upright"` keeps the head upright in drawing space. Side jogs or a return jog provide a stem approach from the attachment side on rotated equipment. They are diagram routing for graphical clearance. The equipment renderer still owns selection of a suitable physical drive, installation and clearances.
- The spring draws alongside the head in secondary screen ink. Its two ends are graphic anchors, and it contributes its own extent. The assembly stem is unchanged by the modifier. Interpret the graphic as a spring-return callout. Use a project detail to show the construction and force path.
- Text stays upright at the rotated visual anchor. The geometry uses the existing absolute M/L/A/Z transform. Its odd-turn radius exchange already represents axis-aligned ellipses correctly. P/H share one piston path, and both identifiers sit in the upper chamber. The Plotter 10-unit text size is retained. At narrow chamber widths, small `s * renderScale` or a large measured ink box, the identifier moves outside. `composeActuator` returns `externalIdentifier` for the equipment label layout. `composeValve` puts it in the label block and standalone placement draws it below the head. A `measureText(text, font, "middle")` callback may supply actual ink metrics using the Family 01 convention. When present, `identifierBounds` reports the positioned ink box for a rendered identifier. Hosts with different fonts or crowded routes should use measurement and explicit label placement.
- Raw legacy `draw({})` keeps the original paths and M/S baselines. World placement centers the glyph at its rotated head anchor and can use the small-size fallback. No terminal counts or control and energy routes are derived from glyphs.

## Provenance and review limits

The handwheel, lever, gearbox, P/H cylinder and spring are approved library designs. The float reuses the Family 02 approved geometry. The T, motor, solenoid and diaphragm build on the repository's historical references. The Pahala P-002 sheet lists manual, motor and solenoid valve actuators and shows diaphragm-operated equipment. Exact correspondence, applicable project notation, and the cited IS 3232 clauses remain provisional. [Brown and Caldwell Pahala, P-002](https://www.epa.gov/system/files/documents/2021-08/pahala-wwtp-design-build-drawings-2021-07-23.pdf#page=7)

Emerson's FieldQ examples distinguish loss of pressure, signal and supply voltage and show the effects of assembly configuration. They support recording the event explicitly. The project defines its FLP wording and equipment behavior. [FieldQ installation manual, §2.2](https://www.emerson.com/is/content/emerson/en/final-control/actuation/documents/discontinued-product-installation-operation-and-maintenance-manual-fieldq-actuator-release-1-pre-2019.pdf#page=7)

Run `npm run all` for the tracked legends and catalogue, generated example SVGs, Plotter drawing-tree checks, semantic tests and review index. The gallery is generated in `review/family-03/`. Run `npm run check:actuator-layout` for Chromium checks of actual SVG label boxes, sampled label-to-stroke clearance and page bounds, computed ink and paper, and a four-page PDF print export. Evidence is written to `review/family-03-evidence/`. The review covers the library font and tested sizes and placements. Other fonts, crowded drawings and physical engineering layouts require their own review.

The upstream Plotter checker flags intentionally full-ink print labels under its screen rule; `scripts/check.py` waives that rule for print drawings only. Its static exporter rejects the existing processvg theme stylesheet. Chromium supports the print profile, and librsvg renders the standalone SVGs including the transparent variants.
