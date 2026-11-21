# Family 01 · Lines and connectors

Build the legends and the 15-sheet light, dark and print regression gallery with `npm run build`. Open `review/index.html` after `npm run review`. The gallery covers all static Family 01 symbols and both eccentric variants, routed lines, the dense crossings, a pump discharge, two reciprocal sheet references, and a wet-well section.

## Static symbols and catalogue

`placeSymbol(id, { x, y, s, q }, options)` returns drawing-space shapes and ports with the same scale and clockwise quarter-turn. Existing `byId`, `draw`, `place`, and `ports` callers can continue using their existing signatures. The catalogue adds optional `portNames` in port order and `connectivity` as groups of zero-based port indices. All indices within a group are mutually connected. An empty list gives a symbol no internal path between ports. The crossover preserves two independent groups, the four-way junction has one group, and the blind flange terminates at one port. The pipe break retains a single through connection across its gap.

The crossover uses a radius of 4 and centerline clearance of 1.5 drawing units per side at its apex. Override `radius` and `clearance` in the drawing options. Butt caps protect the gap with one-pixel non-scaling strokes. At compact placement scales, `placeSymbol` widens the gap to leave at least 1.5 CSS px on each side of the bridge at the intended size. Pass `renderScale` in the drawing options when one drawing unit projects to a size other than one CSS pixel. The API reports an error if the widened gap would consume the upper vertical leg.

The fitted reducers are schematic. Optional fitting placement metadata can include `diameterIn`, `diameterOut`, and `nominalUnits`. The eccentric entries export `flatSide` in local coordinates and placement also gives `drawingFlatSide`. The fitting geometry, four-way junction, and revised crossover geometry are proposed. See [source notes](sources.md).

## Routed lines

`routeLine(id, points)` accepts at least two distinct drawing-space vertices ordered downstream and skips consecutive duplicates. Process and electrical routes keep a continuous polyline, with electrical dashed 6/4 in both profiles. Data circles and paired pneumatic slashes use a nominal pitch of 16 drawing units. Flow arrows use a pitch of 64. The phase follows accumulated arc length from the start. Mark centers within 8 units of a vertex are skipped, or within 10 for flow arrows. Treat route vertices as equipment boundaries when supplying separate routed runs. If the pattern fits no marks, the longest eligible run gets one centered mark. If all runs are shorter than 16 units (20 for flow), use the connecting line alone. A data circle replaces a four-unit section of the line at its center.

The inlet-works example shows standby process runs with a labeled 3/2 dash pattern as well as secondary screen ink.

## Off-sheet connectors

`offSheet({ direction, streamId, sheetRef, service, detail, orientation, x, y, measureText })` uses `"in"` or `"out"` for direction, `"compact"` or `"full"` for detail, and 0, 90, 180 or 270 clockwise degrees for orientation. The initial outline points right. The port is at the tip for incoming flow and on the flat edge for outgoing flow. Matching stream IDs and reciprocal sheet references belong to the caller.

Pass a text measurer that returns nonnegative `{ left, right, ascent, descent }` centered ink extents using the supplied 10 px, weight 400, sans-serif font. For example, use a Canvas 2D context with the font set to the supplied values and `textAlign = "center"`. Map `actualBoundingBoxLeft`, `actualBoundingBoxRight`, `actualBoundingBoxAscent` and `actualBoundingBoxDescent` to the four fields, clamping negative values to zero. The gallery records measured bounds for its fixture labels so building does not require a browser.

The outline grows around upright labels after rotation. Full connectors include the sheet direction and an external service label when supplied. The external label sits above the outline when the port faces down and below it otherwise. Compact connectors retain the metadata and show the stream ID. The returned bounds include the external text and exclude stroke width. Long labels are never truncated. Allow the returned extents when setting drawing placement and canvas size.

## Elevation annotations

`levelAnnotation({ kind, elevation, datum, units, precision, lineStyle, anchor, span, levelBounds })` takes a level kind such as TWL, BWL, HWL, LWL, FSL, or a custom label. The default label is signed RL in metres to three decimals. `anchor` contains `x`, `yDatum`, `datumRL`, and positive `scale` in drawing units per elevation unit. Supply elevations and `datumRL` in the stated units. The baseline is `yDatum - (elevation - datumRL) * scale`. Optional `levelBounds` is an inclusive `[min, max]`. Line styles are `solid`, `dashed`, and `dotted`. The separate `water-level` catalogue entry remains available for symbolic use.

## Profiles

Use the same options with `render(shapes, options)` and `svgDoc(id, title, description, body, options)`. The default screen profile follows the host theme and preserves the Plotter text hierarchy. Set `theme: "light"` or `"dark"` for an explicit screen background. Use `profile: "print"` for black-on-white drawings with full-opacity linework and labels. Dashes are retained, and guide and hatch roles from other drawing code retain their own treatment. Use `profile: "inline"` for hosts that cannot apply `<style>`; see [agents](agents.md#the-inline-profile-departs-from-full-mode-on-purpose). Run `python3 scripts/check.py` on any profile. It waives Plotter's screen label rule for print drawings only; see [agents](agents.md#checking).
