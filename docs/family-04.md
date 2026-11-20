# Family 04 · Gates and weirs

Implemented from the Family 04 revision 03 handoff on Family 03 commit `86a568776ba41c25024a576640d4e267823b8b30`. The catalogue has ten canonical entries, including the retained V-notch. The new glyphs reflect the approved workshop drawings. Exact correspondence with project legends and standards remains provisional.

## Placement and state

```js
import { composeEquipment, placeSymbol } from "../src/library.mjs";

const gate = {
  id: "sg-101", tag: "SG-101", type: "gate-slide", installation: "channel",
  normalPosition: "closed",
  designPosition: { lift: 0, unit: "m", position: "closed" },
  operatingPosition: { lift: 480, unit: "mm", position: "partial" },
  physical: {
    unit: "m", width: 1.5, height: 1.2, leafWidth: 1.7, leafHeight: 1.3,
    thickness: 0.12, guideWidth: 0.12, guideTop: 2.5, maxLift: 1.2,
    upstreamLength: 1.9, downstreamLength: 1.9,
  },
  actuator: { headId: "operator-motor", stemLength: 10 },
};
const schematic = composeEquipment(gate, { x: 100, y: 80, q: 1, s: 1.5 });
const operating = composeEquipment(gate, { x: 270, y: 210 }, {
  view: "section", stateBasis: "operating", scale: 60,
});
const oldFlap = placeSymbol("gate-flap", {}, { convention: "legacy" });
```

- The schematic returns `channelPorts` with IDs, coordinates and cardinal normals, the legacy coordinate array `ports`, and a separate mechanical `anchors.mount` where defined. `connectivity` describes schematic routing and carries no isolation or flow status. The directed flap shares the Family 02 NRV glyph and direction. Its equipment type, default FG label and physical view remain distinct. The slide, adjustable crest and butterfly expose the [Family 03 mechanical interface](family-03.md). Its stem lengths are in schematic units. Drive suitability and the mechanical arrangement are project inputs.
- Schematic `stateBasis` defaults to `"normal"`. Use `"operating"` for the reported snapshot. Normal state and a snapshot's optional `position` accept `open`, `closed`, `partial` and `unknown` on the slide, flap and butterfly. Slide uses isolation fill. Flap and butterfly keep their outlines and use explicit labels. States reported with a physical snapshot must agree with the prescribed endpoints or partial position. Failure position is independent. The slide, butterfly and adjustable crest accept `open`, `closed`, `last` (with FO, FC or FLP), `unknown` or `not-applicable`. An optional `failEvent` qualifies that response. A spring or actuator head supplies no implied state.
- The slide's closed mask uses a 1.2 local-unit butt-capped cut. The outline is drawn over the masked fill and the cut reveals the sheet beneath. When `s * renderScale < 1.25`, use the outlined diagonal with NC or CLOSED as appropriate. `closedStyle: "label"` also selects this fallback. The installed bulkhead uses an illustrative 1.6-unit seam and an Installed fallback below 1×. The seam is an identity mark for a single continuous plate. Its frame marks remain visible in both states. The butterfly uses the approved circle and diagonal with an NO or NC state label when supplied. A dedicated closed glyph is pending.
- Bulkhead snapshots use `installationState: "installed" | "removed" | "unknown"` in the schematic. Stop-log snapshots can additionally say `"partial"` or supply an integer `installedPanels`. Given the declared panel inventory, a partial stack stays outlined and is labeled Partial stack. A fully installed stack can use the original fill convention. That state reports installation only. The raw `draw({ closed })` and placement shorthand keep the original stop-log outlines and fill. Fixed weirs accept neither actuator nor position inputs. The adjustable crest uses a prescribed crest height in its physical snapshot.
- The object can carry `installation` (`channel`, `wall`, `other` or `unknown`), a free-text `sealArrangement`, `designDirection` (`in-to-out` or `out-to-in`, with flap fixed to `in-to-out`), `displayName`, `id` and `tag`. Installation, seals and direction remain explicit project properties. Include a tag or ID for the same identity across views. An optional `labelAnchor: [x, y]` in display options positions upright text in sheet coordinates. Reserve room for labels in a crowded layout.

## Physical inputs and geometry

Choose `view: "plan" | "elevation" | "section"`, `stateBasis: "design" | "operating"` and positive `scale` in sheet units per metre. Stateful equipment reads the matching `designPosition` or `operatingPosition`. Fixed weirs use the same profile for either basis. Provide `physical.unit` as `"m"` or `"mm"` for all lengths in that object. Linear snapshot readings specify their own unit. Angles are degrees, slopes are horizontal per unit vertical, and panel or serration counts are integers. Results report physical lengths in metres and nominal slide opening area in square metres. Endpoint validation allows floating-point conversion roundoff.

The sheet origin is the invert at the equipment centre. The section looks across the channel with downstream at the right, +X. The front elevation shows the width and height. The plan projects down with downstream at the right for `q: 0`; rotate that view in quarter turns. Keep gravity upright in section and elevation. `at.s` multiplies the sheet projection only. The physical result returns empty chart routing and mechanical anchors. `bounds` covers projected equipment geometry excluding text and level callouts.

| Equipment | Required physical design dimensions | Selected physical state and model |
| --- | --- | --- |
| Guided slide | Opening `width` and `height`, `leafWidth`, `leafHeight`, `thickness`, `guideTop`, `guideWidth`, `maxLift`, `upstreamLength` and `downstreamLength` | `{ lift, unit }` from zero to declared maximum, at most the opening height. Guides must reach the full leaf travel. The leaf translates vertically from the invert. Plan can stay identical through the stroke. Reports nominal width × lift before other occlusions. Guide envelopes depict the side strips and do not size slots or seals. |
| Flap | Wall installation, opening `width` and `height`, `wallThickness`, `headerHeight`, leaf `thickness`, `maxAngle`, `upstreamLength` and `downstreamLength` | `{ angle }` between zero and the supplied maximum (up to 90°). Top pivot is fixed at the downstream seat, with the rectangular leaf extending downstream as it opens. The seated toe meets the invert. The section shows the pivot, seat, invert and raised toe. Other hinge arrangements need separate project geometry. |
| Adjustable crest | `width`, `thickness`, `plateHeight`, `minCrest`, `maxCrest`, `pocketDepth`, `pocketWidth`, `pocketOffset`, `minEmbedment`, `upstreamLength` and `downstreamLength` | `{ crest, unit }` is height above invert. The pocket is behind the two floor lips, from `-pocketOffset` to `pocketWidth - pocketOffset` along the section. The plate runs from X=0 to its thickness and from the supplied crest to crest minus plate height. Its full declared stroke must fit the pocket and retain the supplied minimum embedment. |
| Butterfly | Explicit `bore: "circular"` and `axis: "centred-transverse"`, `boreDiameter`, `discDiameter`, `thickness`, `upstreamLength` and `downstreamLength` | `{ angle }` from 0° across the bore to 90° edge-on. The horizontal shaft is centred in the bore. The model checks that the full square-edge disc sweep fits and projects the actual disc thickness. The schematic circle, diagonal and top operator symbol supply no physical bore, shaft or drive arrangement. A rectangular-channel closure or alternate shaft cannot be derived from this candidate and needs its own design. |
| Stop logs | `width`, `height`, `leafWidth`, `thickness`, `guideTop`, `guideWidth`, bottom-up `panelHeights`, `upstreamLength` and `downstreamLength` | `{ installedPanels }` from zero to the inventory count. The installed height is the sum of the bottom-up installed panels. The guide extent must cover the full inventory. |
| Bulkhead | `width`, `height`, `leafWidth`, `leafHeight`, `thickness`, `guideTop`, `guideWidth`, `upstreamLength` and `downstreamLength` | `{ installationState }` must be installed or removed for a physical view. Installed renders a single continuous plate. Removed shows the guide envelope only. Lifting gear requires its own detail. |
| Fixed notches | Plate `width` and `thickness`, `crest` (notch bottom height above invert), `notchDepth`, `upstreamLength` and `downstreamLength`. V uses included `angle`. Rectangular uses bottom `notchWidth`. Trapezoidal uses bottom `notchWidth` and `sideSlope`. Serrated uses `pitch` and `count`. | The centred profile must fit the plate width. A full-width rectangular crest has no raised shoulders. The repeated V bays have uniform pitch and depth. For even bay counts the section centreline cuts a peak, while for odd counts it cuts a root. Plan shows the plate envelope. The schematic V stubs and the adjustable glyph's two horizontal strokes have no role in these physical profiles. |

Use optional `levels: { unit, datum, invertRL, upstream, downstream, crest: true, precision }` in display options. Prescribe upstream and downstream RL independently for a section. On fixed or adjustable crest views, `crest: true` shows the level of the prescribed physical crest above the supplied invert RL. This reuses Family 01's [level annotation](family-01.md). Levels and the drawing transform are independent of the geometry inputs.

Physical views depict the explicitly supplied arrangements. They establish no leakage class, bearing or guide design, structural loads, installation tolerances, hydraulic rating or discharge. Hydraulic measurement requires site and installation data beyond the crest profile. [US Bureau of Reclamation Water Measurement Manual, weir nomenclature](https://www.usbr.gov/tsc/techreferences/mands/wmm/chap07_03.html) · [Installation conditions](https://www.usbr.gov/tsc/techreferences/mands/wmm/chap07_05.html)

## Compatibility and provenance

- `gate-sluice` resolves to the same catalogue entry as `gate-slide`. `weir-v-notch` aliases `weir`. Both aliases are direct lookups and are excluded from enumeration and canonical catalogue counts. The catalogue exports an `aliases` map and separate `gateArchive` geometry for the historical plain slide, half-filled sluice and original flap. Keep the original lookup ID when replaying the archived visual. `placeSymbol(id, at, { convention: "legacy", closed })` selects the historical glyph and endpoints explicitly. The library does not rewrite persisted drawing data.
- Upgrading a flap requires rebuilding dependent routes from the returned endpoints. They move from `[-2,0], [4,0]` to `[-7,0], [7,0]` before transforming. Existing slide/sluice, stop-log and V-notch endpoints stay in place. The original V-notch already has integrated short stubs out to those endpoints. Start routes there.
- Stop-log and V-notch raw schematic paths are preserved exactly. Pahala P-002/P-003 citations for modified glyphs are retained as historical reference leads. The review compares archive and current package renders. [Pahala design/build sheets](https://www.epa.gov/system/files/documents/2021-08/pahala-wwtp-design-build-drawings-2021-07-23.pdf#page=7) · [Historical library](https://github.com/itama8/processvg/blob/main/src/library.mjs) · [Historical catalogue](https://github.com/itama8/processvg/blob/main/drawings/symbols/catalogue.json)

## Review

Run `npm run all` to regenerate the catalogue, gate legend, inlet works P&ID and review index with the fourteen Family 04 SVGs. Run `node --test tests/family-04.test.mjs` for exact legacy geometry, masks, ports, mounting, projections, dimensions and state validation. Run `npm run check:gate-layout` for measured Chromium label clearances, page bounds, ink, mask references and the eight-page print export in `review/family-04-evidence/gates-print.pdf`. The browser reports sampled label-to-stroke clearance in `layout.json`. The Plotter screen checker also accepts the six light, dark and transparent gate gallery sheets.

The existing sparse `legend-lines-2.svg` warning is unchanged. Plotter's screen rules flag full-opacity print labels, and its static exporter rejects the existing Processvg theme stylesheet. Chromium exports the print sheets. The SVGs can be viewed or rasterized directly.
