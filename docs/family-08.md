# Family 08 screening, grit and solids handling

The Iteration 02 architecture is implemented. All detailed candidate glyphs are provisional and require visual review. The production catalogue, default placements and legacy legend retain the eight original IDs and their geometry, including the original line roles, port lists and placement behavior.

## Placement and migration

```js
import { placeSymbol, migrateScreeningVariant } from "../src/library.mjs";

const legacy = placeSymbol("screen-bar", { x: 100, y: 80 });
const candidate = placeSymbol("screen-bar", { x: 100, y: 80 }, {
  variant: "candidate", id: "screen-symbol-1", assetId: "SCR-101",
});
const review = migrateScreeningVariant({
  symbolId: "screen-bar", id: "screen-symbol-1", assetId: "SCR-101", at: { x: 100, y: 80 },
}, "candidate");
```

The public `SCREENING_CANDIDATES` registry and the generated catalogue's `screeningReview` section expose 21 IDs. The eight archived IDs use the legacy variant when callers omit the selector. The thirteen additions exist only in the candidate registry and require `variant: "candidate"` even in new drawings. The migration report retains the asset and placement, presents the historical indexed ports and candidate typed interfaces, and requires manual connection review. Existing diagrams and routes load without a geometry or topology rewrite.

| New candidates | Equipment |
| --- | --- |
| `screen-manual`, `screen-step`, `screen-perforated`, `screen-drum`, `screen-band` | Manual rake, steps, perforations, drum and travelling band |
| `screen-washer-compactor`, `screen-grinder`, `screenings-chute` | Washing/compaction, comminution, gravity screenings transfer |
| `grit-vortex`, `grit-aerated`, `grit-horizontal`, `grit-washer`, `grit-bin` | Open vortex, aerated, horizontal-flow, washing and receiving |

## Interfaces and engineering views

- The screen and its drive form one equipment asset. The motor reuses Family 07 vector identity geometry, with the circular head from these plates. The manual rack uses a rake. The top-entry mixer uses its rectangular head and mechanical mount. The static mixer uses baffles and two liquid terminals with a common stream kind. Equipment-identifying marks use primary ink at full opacity in every profile.
- `processInterfaces` includes stable IDs, schematically visible anchor points, stream kind, direction and routing layer. The visible `ports` and `portNames` are the ordered drawing-space projection of those process interfaces. `mounts` is separate. Instrumentation and digital signals use Family 05. The inlet example references two levels and their differential as a separate association to the motorised screen asset.
- `screeningNetwork` requires matching typed endpoints and outlet-to-inlet direction. A generic static mixer may carry one declared liquid stream through both ends. Reused endpoints require separate ports at an explicit junction. The screw's `reverse: true` switches directions and retains the anchor and bulk-solids type. The grinder has two wastewater terminals. Receiving bins have a single bulk-handling terminal. Washer inputs, products and liquid returns are separate terminals. The inlet-works example routes each service to explicit tie-ins and distinct receiving assets.
- `composeScreeningDocument({ assets }, { view })` keeps one schedule record per `assetId`. To add a physical view, provide the asset's `physical` record and a placement under `views.plan`, `views.section` or `views.elevation`. Direct placement accepts the same `view` and `physical` options. Set `unit` to `m` or `mm`, supply the dimensional `source`, local `datum` and drawing `unitsPerMetre`, then provide a `projections[view]` record. The record contains explicit `features` and two dimension witnesses. Each witness records the dimension's name, axis-aligned `from` and `to` coordinates and signed `offset`. The axes are length/width in plan, length/depth in section and width/height in elevation. Dimension values come from the witnesses. These drawings are illustrative projections and carry the source and datum in their metadata.
- Projection features use typed polylines, polygons or circles in engineering units. Screen fixtures supply channel outline, access, inclination or equipment profile, discharge and motor or rake location. The four grit structures have separate projection inputs for the cone, open circular chamber, diffuser and hopper, and horizontal channel with sump. Schematic terminal coordinates are independent of physical features. Fixture dimensions describe the indicated outline or channel, with accessory extents supplied separately as feature geometry.

## Comparison with Iteration 02

The source snapshots match the base drawings after normalizing shorthand, subpath grouping and the cyclone's closing segment. Production output continues to use the original byte-for-byte paths. The committed handoff data retain the original proposed defaults as review provenance. The catalogue and renderer require a named opt-in for those proposals.

Candidate departures visible in the comparison:

- The mechanical bar screen gains wastewater stubs and a motor stem that meets the circle. The fine-screen and step-screen stems meet their motor heads. Drive letters use the Family 07 vector glyph and remain upright through rotation. The manual rake gains teeth. Drum ribs have clearance inside the basket at reduced scale.
- The cyclone has separate overflow and underflow stubs. The vortex inlet is tangent to the circle and the swirl clears the central mark. The aerated chamber shows the connection between air input and its diffuser header. The horizontal channel has its own sump and wastewater ends.
- The classifier's inlet and return have separate attached positions. The classifier produces **dewatered grit**, which has its own kind separate from washed grit. The screenings skip uses a top receiving stub in place of the duplicated rim. The inlet-works proof adds parallel screens, a normally closed bypass, gated branches and a separate differential-level association. Routes end at resolved typed anchors. Short neutral channel stubs around the manual and step glyphs are a schematic convention.

Taxonomy and process behavior were checked against the EPA fact sheet *Screening and Grit Removal*, EPA 832-F-03-011. Visual approval, project legend conventions, formal standards, vendor connection details, clearances, hydraulic calculations, equipment sizing, process performance, and control settings remain outside this review. The PDF proof uses Chromium and a Poppler grayscale raster, with physical printer output unverified. [EPA fact sheet](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P1000S7N.TXT)

## Reproduce and review

- `npm run all` builds the catalogue, normal legends and local review index and runs the Plotter and Node checks.
- `npm run check:screening-layout` builds the focused proof using headless Chromium, ImageMagick and Poppler. It checks all 21 candidates at four rotations and three placement scales, compares Chromium rasters with native SVG transformation, probes the placed ports and upright drive marks, and checks the review sheets for clipping, ink roles and label collisions.
- `review/index.html#family-08` links to editable full-size SVGs. `review/family-08/fixtures.json` records the physical exercise inputs, measured axes, inlet asset schedule, process routes and control associations. The gallery includes light, dark and print profiles at nominal (1.75 drawing units per glyph unit) and reduced (0.95) placement, the legacy comparison, three dimensioned-view sheets and the inlet works.
- `review/family-08-evidence/comparison.html` reproduces the symbol and inlet-works source plates and provides individual matched glyphs. `layout.json` records the Chromium checks. `candidates-nominal-2x.png` is the two-device-pixel proof. `family-08-print.pdf` contains the nominal glyphs, reduced glyphs and inlet topology as print pages. `print-gray-1.png` through `print-gray-3.png` are their grayscale raster proofs.
- The original handoff SVGs are in `tests/fixtures/family-08-reference/`. The handoff JSON survives in `src/data/family-08-handoff.mjs`. The attachment SHA-256 is `bcf27bcee1a22317f5f14d82f3503f3b661d029db395e44fab6922baafe27605`. The compatibility baseline is `cd2e8ed869b4179a38d91163ffc092f704d42e0c`.
