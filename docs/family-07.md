# Family 07 pumps, blowers, drives and accessories

Family 07 implements the user-approved Revision 03 design. The catalogue contains 31 IDs. The normal legends and the two Family 07 gallery sheets show 32 cards, with a card for each approved rotary lobe blower motif. Candidate names describe drawing conventions. Standards and vendor verification are pending.

## Library and document entry points

Import `placeSymbol`, `composePumpDocument`, `migratePumpVariant`, `pumpBoundary` and `pumpNetwork` from `src/library.mjs`. Direct placement returns `shapes`, positional `ports` for visible schematic terminals, and named typed `interfaces` including hidden ones. Coordinates follow the same scale and clockwise quarter turns as the symbols. `render` consumes the returned shapes.

```js
const result = composePumpDocument({
  assets: [{ assetId: "B-701", role: "standby", state: "running", speedControl: "VFD",
    actualRpm: 1280, setpointRpm: 1450 }],
  instances: [{ id: "blower-on-pid", assetId: "B-701", symbolId: "blower-lobe",
    variant: "3-lobe", at: { x: 160, y: 110, q: 1 } }],
}, { intent: "create" });
const stored = JSON.stringify(result.document);
const restored = composePumpDocument(JSON.parse(stored));
```

Persist the returned document. Loading is the default intent. It resolves missing variants to the historical choice for the six archive IDs and writes that choice explicitly to the returned document. Creating with `intent: "create"` selects the new defaults for omitted variants. An explicit valid variant always wins. The direct `placeSymbol` and catalogue consumers keep their existing default geometry, with `{ intent: "create" }` or `{ variant }` available at placement. The catalogue stores archived shapes and ports at the original fields and exposes the choices under `pump.variants`.

| ID | New choice | Choice for existing documents with variant omitted | Additional choice |
| --- | --- | --- | --- |
| `pump-centrifugal` | `compact` | `compact` | `volute` |
| `blower-lobe` | `2-lobe` | `legacy` | `3-lobe` |
| `pump-submersible` | `refined` | `legacy` | |
| `pump-pc` | `refined` | `legacy` | |
| `blower-centrifugal` | `refined` | `legacy` | |
| `pump-dosing` | `legacy-assembly` | `legacy-assembly` | `head` |

`migratePumpVariant(instance, variant)` preserves instance and asset IDs and returns the updated instance, the previous and new coordinates of named ports, reroute flags, and added port names. Replace the instance in the document to apply the change. Stored edges address ports by name, so their first and last points resolve from the new geometry. Review authored `via` points after a change. The refined submersible moves local discharge from `[12,-16]` to `[24,-13]` and adds hidden intake and power interfaces. Lobe gas ports stay at `[-16,0]` and `[16,0]`. The compact centrifugal pump retains the exact source circle and discharge line and `[[-9,0],[14,-9]]`.

## Equipment and connections

The 25 additional IDs comprise ten pump IDs including the vertical turbine, airlift and eductor, four blower/compressor or vacuum IDs, six drives, and five accessories. See the checked-in handoff manifest for the ordered ID inventory. The five accessories retain their Family 07 IDs. The expansion bellows records the possible future comparison with Family 01 flexible connectors.

Role (`duty`, `standby`, `duty-assist`), operating state (`running`, `stopped`, `fault`, `unknown`), speed control (`fixed`, `VFD`, `other`), actual RPM and setpoint RPM are separate asset data. A standby pump can run. Changes to these fields leave schematic ink and other equipment states alone. An installed or optional accessory is recorded on its parent asset. An installed accessory can reference a separate registered asset.

Schedule rows are keyed by asset ID. Symbol instances have their own stable IDs and can recur as drawing representations of the same asset. Independent purchased drives use their own asset IDs. A drive block can declare `attachment: { parentId, integral }`. Integral drives share the equipment asset and schedule row. The independent metering head uses `pump-dosing/head` and accepts a mechanical shaft. The assembly preset preserves the source envelope. Six drive glyphs are separately available to Family 08 through the same placement API, with gearbox and coupling endpoints typed as mechanical shafts, and the VFD typed as electrical power and control.

Airlift has liquid-environment intake, gas injection and two-phase discharge. Eductor has visible named motive, suction and discharge terminals. Use the instance's `portKinds` to choose the phase for each eductor interface (`liquid-process`, `gas-process` or `two-phase-process`) and `media` to specify the medium at named endpoints. Specify the medium on each fluid edge. The network checks that edge kinds, directions and any declared endpoint media agree. It can validate a steam/vapour topology with an explicitly specified discharge stream. Fluid mix feasibility remains an engineering input.

`pumpNetwork` accepts placed equipment and explicit host interfaces created with `pumpBoundary`. An edge names `from` and `to` as `{ blockId, portId }`, a connection kind, optional `via` waypoints, and for fluid edges `medium`. It returns routes with resolved endpoints for the caller to draw. The dampener has one bidirectional liquid branch and requires a host boundary declared as `terminal: "branch"`. Bellows accept one liquid, gas or two-phase through service with consistent kind and medium on both sides. A VFD cannot join a mechanical shaft. Hidden intake and power can be referenced with `layer: "topology"`; use visible terminals for schematic routes. The fixture shows process and mechanical paths at full ink and an electrical route in secondary ink with a distinct dash pattern.

## Physical views

Define `instance.views.plan`, `instance.views.section` and optionally `instance.views.electrical` with the placement and `unitsPerDrawingUnit`. Call `composePumpDocument(storedDocument, { view: "section" })`, or select the plan, schematic or electrical view. Each result carries the same `assetId` and symbol instance ID and shares the equipment schedule. A view can be explicitly suppressed with `false`.

Define `asset.physical` with `basis` (`illustrative` or `dimensioned`), `source` (required for dimensioned), `unit` (`mm`, `m`, `in`, `ft`), `envelope: [length, width, height]`, optional rectangular or linear `features: [{ id, origin: [x,y,z], size: [dx,dy,dz], kind }]`, and optional named `interfaces: { portId: [x,y,z] }`. The plan projects X/Y. The longitudinal section projects X/Z with elevation up and draws features intersected by the chosen `sectionY` (default half the supplied width). The electrical projection shows supplied electrical points and features. Dimensions label the supplied envelope at the drawing scale. A view with illustrative inputs labels that basis on the sheet. Without dimensions it displays “Dimensions unavailable.” The fixture supplies an illustrative cable, guide rail and elbow. These are datum-based schematic projections. Vendor geometry, installation clearances, water levels and screw inclination require author-supplied data.

## Artwork decisions and verification

- The reviewed historical catalogue blob is `4711845074bc854d6750008c170f20d2dabee505`. Its six Family 07 shape records and port orders match the pre-change repository and `tests/fixtures/family-07-source-snapshots.json`. The JSON payload exported by `src/data/family-07-handoff.mjs` is the unedited Revision 03 manifest with SHA-256 `8b9b2bca4c7f7853d76b3b7a2083ba0af4c776ae14aa36cbe6b010972a3eb9bc`. Both supplied SVG and PNG were inspected. The source design files cite IS 3232 and B&C P-003 for historical symbols. This implementation did not perform a standards or vendor reference review.
- Both approved sample sets are used for the lobe rotors. They have separate closed outlines and share the candidate casing and the gas terminals. The candidate casing accepts a shaft at its top. Screw chevrons and the centrifugal volute give separate schematic silhouettes. The liquid rotary-lobe pump retains its distinct approved cubic motif. Actual rotor count and mechanical clearance come from equipment data.
- The airlift's gas anchor is at the open stub tip `[-15,-5]`. Its lower casing meets the intake stem. The eductor suction line meets the body and the motive line is stroked once. The dampener stem meets the vessel. The integral motor's power anchor sits at the top stub. Candidate blower casings expose shaft mounts. The piston and Archimedes drive data anchors remain hidden because their marks do not have an exposed schematic terminal.
- The shared placement layer normalizes explicit absolute `H`, `V` and `T` commands to the existing commands and also transforms cubic controls. The supported grammar matches this package. Equipment labels use Family 05 outlined glyphs with transformed centers and upright letters. The VFD waveform sits higher and its lettering is smaller so these stay separate at quarter turns. Historical dosing retains its original fixed-size motor letter and rotation behavior. Its motor letter can crowd the enclosure at the reduced scale.

Run `npm run all` and `npm run check:pump-layout`. The second command uses Chromium, xmllint, librsvg and Poppler. It checks SVG parsing and rasterization, visible terminal contact, rotated glyph placement, clipping and ink profiles, and measures both lobe motifs against the casing and each other. Its reduced geometry is 55% of nominal with the same one-pixel stroke. Printed pages use the explicit monochrome profile. Plotter lint runs against the screen profiles because its label opacity rules are for screen. Chromium independently checks full ink in the print profile, and Poppler rasterizes each printed page.

The Chromium fixture measured the following minimum stroke-centerline separation across the four orientations. Values are SVG units at the tested display size.

| Motif | Casing gap, nominal / reduced | Rotor pair gap, nominal / reduced |
| --- | --- | --- |
| Two lobe | 7.11 / 3.91 | 7.84 / 4.32 |
| Three lobe | 6.03 / 3.31 | 5.59 / 3.07 |

| Artifact | Path |
| --- | --- |
| Normal catalogue and three legends | `drawings/symbols/catalogue.json` and `drawings/symbols/legend-pumps-and-blowers*.svg` |
| Normal review page and reproducible authored fixtures | `review/index.html`, `review/family-07/fixtures.json` |
| Family review SVG and browser contact sheets | `review/family-07/`, `review/family-07-evidence/svg/` and `review/family-07-evidence/*.png` |
| Measured layout, monochrome print and page map | `review/family-07-evidence/layout.json`, `review/family-07-evidence/family-07-print.pdf`, `review/family-07-evidence/print-pages.json` |
| Reproduction inputs and focused semantic tests | `scripts/build-family-07.mjs`, `scripts/check-family-07-layout.mjs`, `tests/fixtures/family-07-documents.mjs`, `tests/family-07.test.mjs` |

Review artifacts are generated locally. Application-specific drawing legends, vendor clearances and installed dimensions remain for the separate reference review.
