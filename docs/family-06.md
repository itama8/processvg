# Family 06 · Primary elements

Family 06 implements the revision 03 design package on local base
`99822ce6490a6c64ad537b4838d4a844f1984500`. The Markdown handoff, JSON,
revision 03 SVG and iteration 02 PNG were inspected together. The revision 03
handoff and JSON governed when the artwork differed. The designs are approved
workshop conventions. Exact IS/ISA conformance and the inherited Brown and
Caldwell P-002 provenance remain unverified in this review.

| Input | SHA-256 |
| --- | --- |
| Final handoff Markdown | `b58288f332c32a70f5f42db5aafa251de1a5f95b009ba37f8458deecc0a38760` |
| Final symbols JSON | `05cc65134d86e086e9510988711ce87bbf6ab32721ad3c63d02247392542e49f` |
| Revision 03 reference SVG | `adab35a816964899b06088cc02bcf5e3bae59fa9790c07e1813326153cf7ab54` |
| Iteration 02 preview PNG | `f670e1387070f05c854dfe3e64b2d4dec1ec51e9b4c09b469a0ff952229e70ae` |

## ID reconciliation

The geometry index and final JSON agree on 34 unique IDs. The acceptance
check's 19 new or refined total conflicts with the enumerated geometry, which
has 20 new or refined IDs, four retained geometries and ten analyte presets.
Eighteen IDs add new bodies, and two revise existing bodies. Plan and
longitudinal section are representations of existing structures.

| Count | Explicit IDs |
| --- | --- |
| 4 retained | `fe-mag`, `fe-orifice`, `fe-flume`, `fe-ultrasonic` |
| 6 new flow | `fe-flow-ultrasonic`, `fe-flow-turbine`, `fe-flow-thermal`, `fe-flow-coriolis`, `fe-flow-variable-area`, `fe-flow-venturi` |
| 4 new level | `fe-level-ultrasonic`, `fe-level-radar`, `fe-level-guided-radar`, `fe-level-conductivity` |
| 2 revised level | `fe-float`, `fe-hydrostatic` |
| 4 new analytical bodies | `fe-analysis-immersion`, `fe-analysis-insertion`, `fe-analysis-cell`, `fe-analysis-cabinet` |
| 4 new contact and sampling | `fe-pressure-tap`, `fe-diaphragm-seal`, `fe-thermowell`, `fe-sample-point` |
| 10 analyte presets | `fe-analysis-do`, `fe-analysis-ph`, `fe-analysis-orp`, `fe-analysis-conductivity`, `fe-analysis-mlss`, `fe-analysis-turbidity`, `fe-analysis-chlorine`, `fe-analysis-ammonium`, `fe-analysis-nitrate`, `fe-analysis-phosphate` |

## Placement and migration

Import the placement and composition functions from [src/library.mjs](../src/library.mjs).

- `placeSymbol(id, at)` preserves archive defaults and the positional `ports`
  array for the six pre-existing IDs. Use `mode: "legacy"` explicitly to pin
  those defaults. `composePrimaryElement(config, at, display)` supplies typed
  `interfaces` even in legacy mode. Use `mode: "current"` with either function
  for revised float and probe geometry. New IDs default to current.
- Magnetic, orifice, flume and generic non-contact geometry and port order are
  byte-for-byte identical at the library shape level. The magnetic text retains
  its original 3.6-unit upright baseline and inherited rendering. The generic
  `fe-ultrasonic` remains a non-contact level symbol and has dedicated
  technology-specific siblings.
- `migratePrimaryElement(config, at)` previews each named port's transformed
  `before`, `after` and `reroute`. Float and hydrostatic probe move their top
  interface from local `[0, -10]` and `[0, -12]` respectively to `[0, -13]`.
  Callers apply any reroute themselves.
- Local `q` is a clockwise quarter turn. The transform moves port points,
  sensing origins and station markers with the body, rotates sensing vectors
  without translation, and keeps identifier ink and Family 05 instrument
  bubbles upright. Float sensing has a point and an unspecified direction.
  Rotameter local design flow is bottom to top. Drawing rotation alone conveys
  no approval of the installed orientation.

## Analyte layout

`composePrimaryElements([{ config, at }, …], display)` places transformed
bodies first and resolves identifiers in authored order. Pass existing drawing
obstacles using `avoidBounds` for text and equipment, `reservedBounds` for
clearance zones, `avoidRoutes` for route polylines, `avoidAnchors` for
additional connection or sensing points, and `sheetBounds` for the usable
sheet. Boxes use `[left, top, right, bottom]` in drawing coordinates. The
caller supplies obstacles drawn outside that batch. Widen the clearance
for wider strokes or use a reserved box for their full footprint.

- The default outlined style uses an ink-sized frame and a leader. The unboxed
  style uses the same full-ink glyph with a leader for offset or ambiguous
  positions. Override via `config.identityStyle` or `display.identityStyle`
  for a project profile. `identityGlyph` can supply project shorthand.
- Cal Sans outlines and measured ink bounds include the actual subscript
  glyphs. Set `display.measureInk` for alternate portable glyph outlines
  and metrics, and `display.fontSize` for a larger glyph. The minimum is
  6.5 rendered CSS units per em. Supply `display.renderScale` when exporting
  at a different viewport scale so that placement compensates for reduction.
- The solver checks right, left, above and below in sheet coordinates. It
  ranks ordinary fits by leader length and displacement, with right, left,
  above, below as the final tie-break. Further offsets are bounded to 36
  sheet units. The drawing keeps the glyph and records `identityLayout.status`
  and `conflicts` when the fit fails. The rendered title and
  `data-layout-conflict` carry the reason for inspection. A conflict can
  require a larger sheet allocation. Arbitrary manual placement and curved
  or multi-segment leader routing are outside this implementation.
- `installation` selects immersion, insertion, cell or cabinet. `principle`,
  `analyteDefinition` and `reportingBasis` are independently authored. Preview
  instances for chlorine, ammonium, nitrate and phosphate report incomplete
  specification until the definition and basis are supplied. The subscripts
  encode shorthand. Define chlorine as free, total or the applicable residual
  and specify the reporting basis. EC and TUR are project conventions.
  Commercial suitability, reporting units and ionic species require project
  specification. The instrument's AE/AIT and panel's MCP/LCP remain Family 05
  identities.

## Connectivity and asset inventory

`primaryNetwork(instances, edges)` resolves edges against named ports and
validates type and direction. Edges use `{ blockId, portId }` endpoints and
optional `via` route vertices. Create deliberate pipe or vessel takeoffs with
`measurementBoundary`. A port accepts one edge; declare separate branches
for additional connections. `primaryInstrument(primary, config, at)`
composes a Family 05 instrument with a distinct functional block ID and
explicit `integral` mounting. An integral attachment shares the primary's
`assetId`. A remote transmitter uses a separate asset ID. In the process
fixture the integral FIT sits directly on its element with no drawn signal
line, while the remote FIT keeps its dashed signal (Art of the P&ID slide 17;
Pāhala P-002). The analysis sheet's integral AIT sits on its cabinet the same way. The electrical edge remains in the topology either way.

| Component | Connectivity contract |
| --- | --- |
| Inline meters | Process in and out. Orifice pressure takeoffs use separate branch components. |
| Pressure tap | Host process boundary to one impulse sensing outlet. Two taps for a differential measurement stay separate. |
| Venturi | H and L are schematic marks. Project tapping metadata uses `tappingSpecification` with explicit source, station reference, units, and high and low stations. Those stations create no pipe junctions. |
| Diaphragm seal | Process-sensing side and filled-system side. Internal transfer is pressure only, with medium continuity disabled. |
| Sampling point | Process branch with composed Family 02 gate valve and a sample outlet. Transfers report the valve's authored normal position and preserve process and sample as different networks. Routes depict topology, including a line behind a closed valve. |
| Cell and cabinet | Sample network in and out. |
| Thermowell | Mechanical mount and optional thermal or mechanical interface. Heat transfer carries no process medium. |
| Level and probe sensing | Sensing points and vectors are graphical metadata. `instrument-interface` is inactive until bound to a specific compatible kind and direction in `bindings`. |

The drawing resolves interfaces and topology. Actuation, operating state,
routing clearance outside the supplied layout, and fluid or heat response
require separate design inputs.

## Measuring views

Use `composeMeasuringStructure(config, at, display)` with `view` set to
`schematic`, `plan` or `section`.

- The archived flume schematic retains its two process ports. Plan and section
  share one dimensionless drawing record with a conceptual, uncalibrated
  caption. There was no size-specific calibrated record in the package. These
  views have no fabrication dimensions, physical ports, head station or
  rating calculation.
- A measuring weir reuses the Family 04 physical renderer and its documented
  profiles and state inputs. Supply the Family 04 dimensions, `stateBasis`
  and sheet scale, plus
  `measurement: { station, datum: { id, unit: "m", invertRL, headZeroRL }, source }`.
  `station` is the signed distance in metres along the channel from the
  upstream plate face, so an upstream measuring station is negative.
  The datum and source are authored. An optional section `waterLevel` is an
  absolute RL in that datum. The fixtures use illustrative input and do not
  establish a design's head station or calibration.
- Plan supports all four quarter turns. Longitudinal sections keep gravity
  upright and reject other orientations.

## Rendering choices and evidence

The JSON's fixed 23-unit outlined-right labels were replaced by measured
placement. The sample-point reference valve was replaced by a scaled Family 02
gate, joined at exactly the same branch coordinates. Venturi references gain
upright H/L marks with small offset ticks. New non-contact beams use the
existing secondary ink role, at 0.32 opacity on screen and full ink in print.
The fitted thermal T uses measured primary ink. These are implementation
choices for the approved symbol design, with no independent standards claim.

Run `npm run all` for the normal catalogue, legends, review page and repository
tests. Run `npm run check:primary-layout` for Chromium SVG checks,
the PDF and grayscale rasters. The focused command runs Plotter against the
screen fixtures. The vendor checker expects faded labels, while the existing
print profile uses full ink. The print fixtures use Chromium metrics and actual
PDF rasterization.

| Path | Evidence |
| --- | --- |
| [Catalogue](../drawings/symbols/catalogue.json) and [legend](../drawings/symbols/legend-primary-elements.svg) | Archived geometry plus the current typed contract and migration deltas. Three primary-element legend pages cover the 34 IDs. |
| [Review entry](../review/index.html) and [fixture contract](../review/family-06/contract.json) | Repeatable schematic rotations, plan rotations, upright sections, both identity styles and the intentional conflict. The examples cover thermal and magnetic meters, differential-pressure orifice, tank level, basin probes and a sample analyser. |
| [Chromium report](../review/family-06-evidence/layout.json) | Measured ink bounds, full-opacity glyphs, ownership, text clearance and rendered anchor checks at nominal and reduced body scale. |
| [Print PDF](../review/family-06-evidence/family-06-print.pdf) and [page index](../review/family-06-evidence/print-pages.json) | Eighteen Chromium print pages with matching `print-01.png` through `print-18.png` grayscale rasters. |

The nominal and reduced body scales are 1.30 and 0.88 sheet units per local
unit. Evidence covers 560 × 440 SVG sheets, the resulting 420 × 330 point
PDF pages and the 96 dpi grayscale raster. Readability on a physical printer
or at other imposed scales, project-specified flume calibration or weir
rating, external standards review, and compatibility of specific commercial
installations remain open.

The full build passed 49 tests, including eight focused Family 06 tests.
Valve, actuator, gate and instrument layout checks also passed. The existing
sparse lines legend still reports a Plotter advisory. Family 06's Chromium
run checked 38 sheets, 314 measured analyte glyphs and 912 transformed anchor
marks with zero layout errors and zero Plotter warnings. Of those anchors,
880 touch their rendered body and 32 are the archived flume's centreline
anchors between the channel walls.
