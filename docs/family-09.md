# Family 09 structures · Revision 03

Family 09 has 24 approved assembly concepts. Each has a schematic, plan, section and exterior elevation from one illustrative metric model. The default views follow the handoff (17 sections, three plans and four elevations). The family is available through `src/library.mjs` and the `structures` section of the normal catalogue. The assemblies are eligible for illustrative review only.

## Model and drawing API

```js
import {
  composeStructure, createStructureModel, projectStructure, solveStructureDecanter,
  structureInventory, structureSitePoint, assertStructurePortConnection,
} from "./src/library.mjs";

const basin = createStructureModel("sbr-basin", {
  assetId: "SBR-201",
  water: { currentRL: 104.2 },
  decanter: { id: "decanter-swing-arm", branch: "toward-inlet" },
});

const preferred = composeStructure(basin);                // Section A–A
const transverse = composeStructure(basin, { view: "section", cut: "B-B" });
const exterior = composeStructure(basin, { view: "elevation", face: "north" });
const plan = projectStructure(basin, { view: "plan" });   // Coordinates in metres
const motion = solveStructureDecanter(basin);
const assets = structureInventory([basin]);
```

- X is inlet to outlet, Y is across the plan, and Z is RL in metres. Plans are X-right, Y-up. A–A measures X at fixed Y from the south. B–B measures Y at fixed X from the east. North and west elevations reverse the horizontal axis to match the observer's exterior view. Section overrides supply two local endpoints spanning the named axis. The drawing intersects model primitives with the selected plane and shows that intersection. It uses an orthographic exterior with interior features hidden.
- `lengthM`, `widthM`, `floorRL` and `depthM` are explicit model inputs. For resize, review XY anchors scale with the footprint, and component and port RL anchors scale relative to floor and overall depth. Explicit `portAnchors` and `components[id].mountM` use the resulting coordinates. Default water RLs and the swing pivot shift with the floor reference and retain their relative RL offsets. Supply new RLs and pivot dimensions if the changed envelope needs them. Round footprints require equal diameters.
- `datum.floorReferenceRL_m` changes the default vertical reference. Supply a new datum ID when shifting it. An explicit `floorRL` sets the model floor independently. Dimensions come from `fromM` and `toM`. Length, width, diameter or cut chord, overall depth and floor/top RL are annotated in the relevant views. An off-centre round cut can miss the lowest floor. The stated depth remains the overall model dimension. SVG viewBox values only control the drawing viewport.
- `siteTransform` accepts `originProjectM: [easting, northing]`, `rotationDeg` counterclockwise from project east, and a `horizontalCRS` identifier. `structureSitePoint` applies horizontal rotation and translation while preserving project RL. The default transform and survey benchmark are null. Supplying coordinates does not verify a survey or change the local drawing.
- Water modes are fixed per approved unit. Static units show WL. Variable units show BWL, current and TWL with coincident tags combined. Invalid level ordering is rejected. Pressure vessels, the membrane skid and dewatering machines have no free surface in the model. Generated elevations omit water and obscured internals.
- Ports have stable local anchor IDs, exact media, phase, direction, physical surface, attachment kind and placement status. `assertStructurePortConnection` requires matching media and complementary directions. A shared phase does not authorize a connection. `structureInventory` counts each parent and each distinct child once, and rejects duplicate IDs. Tank primitives, weirs, diffusers, integrated drives and the SBR decanter belong to their assembly. Pumps, both screen-channel gates, the bar screen, grit classifier, mixer and check valve have distinct IDs when present as equipment. Clarifier and thickener mixer references in the handoff are proxies, with actual scraper or rake geometry in the review model.

## Compatibility and visual conventions

Projects using `tank-open`, `diffuser-grid` or `decanter` continue to resolve the original symbols and ports. Existing drawings use their existing entry points. Adoption of a Family 09 assembly is explicit through `createStructureModel`; a legacy decanter has no inferred pivot, travel or asset placement. The revision package is stored byte-for-byte as [final model records](../src/data/family-09-final-models.json). The atlas and seven review plates guided recognition and layout comparison. Their geometry was excluded from the model.

The schematic includes the earlier library symbols through their actual registry ports, markup and quarter-turn placement. Family 04 uses canonical `gate-slide` and `weir` with the current convention. Family 07 uses `pump-submersible/refined` and `pump-dosing/legacy-assembly`. The screen, grit classifier and top-entry mixer use the Family 08-compatible legacy glyphs. For those parts, `components[id].variant: "candidate"` explicitly opts into the provisional glyph. Physical views use metric envelopes with illustrative mounts where the handoff provides them. Glyph quarter-turns and ports are in drawing space, kept separate from civil envelopes and metric nozzles.

Identity and outline strokes use full ink. Repeated tube, carrier, screen and filter-bed texture use 32% screen ink and full monochrome print ink. The drawings carry an illustrative scale notice. The actual cuts intentionally differ from the gallery artwork. The wet-well cut only shows the pump it intersects. The second pump retains its handed-off placement in plan. The MBBR transverse plane misses the end screen and the SBR transverse plane misses the default decanter. The circular clarifier shows a true diameter on centre cuts and a chord on offset cuts. The contact tank shows a serpentine route in plan and the baffles actually intersected in section.

## SBR motion evidence

The intake is at current RL minus the explicit immersion offset. Floating uses the nominal local X and Y or explicit replacements. Swing uses a fixed pivot, a fixed arm length, and a selected branch. The default review branch is toward the inlet. Signed angle is positive below horizontal. The solver reports water limits, out-of-range RLs, unreachable travel, unsubmerged intakes, pivot or intake bounds, supplied high and low angle stops, and clearance or collision against review-model envelopes and optional obstacle boxes. The repository uses an axis-aligned clearance envelope for obstacles. The default review inputs have zero minimum clearance and no manufacturer stops. Each solution describes the requested water state. Vendor swept volumes and continuous travel remain separate checks.

| Water state | Water RL m | Intake RL m | Floating X m | Swing X m | Swing angle |
|---|---:|---:|---:|---:|---:|
| BWL | 103.400 | 103.320 | 12.000 | 13.047 | 53.969° |
| Midpoint | 104.200 | 104.120 | 12.000 | 12.359 | 27.443° |
| TWL | 105.000 | 104.920 | 12.000 | 12.115 | 6.491° |

These are solved values for an illustrative 0.08 m immersion, a 2.3 m swing arm and a pivot at `[14.4, 3.5, 105.18]`. The package's example current RL is 104.4 m. The water-range midpoint is 104.2 m. The model and diffuser coordinates retain the parent SBR identity in each case. See `review/family-09/fixtures.json` for full precision, error cases and exact diagnostics.

## Decisions and unresolved inputs

- Profile geometry missing from the package includes shell thickness, hopper/depression plan extents, floor slopes, equipment sizes, retaining-screen sizes, baffle thicknesses, crest positions, rotor envelopes and head shapes. Review conventions are explicit in `src/structure-geometry.mjs`. The wet well treats RL 100 m as the low sump and raises its rim by the supplied 0.6 m parameter. Two gate mounts and additional pumps use candidate positions. Circular floors use a sloped annulus and flat central hopper; the tube settler uses a rectangular sloped hopper. No cover levels, foundations, excavation lines, vendor fit or survey data were supplied.
- Physical outline and cut geometry use simple envelopes, surfaces and centre lines. The conical profile uses an analytic floor and tessellated offset drawing. This supports the reviewed axis-aligned sections and cardinal faces. Arbitrary section planes, layer thicknesses, detailed occlusion, nozzle or piping routing, equipment fabrication, continuous decanter sweep clearance and clash checks across all equipment packages remain outside the supplied data and these fixtures.
- The received receiving/stilling inlet and outlet anchors have equal RL despite the low-inlet/high-outlet recognition target. Review crests remain visible and the supplied nozzle coordinates are flagged. Secondary clarifier RAS/WAS and both pressure vessels' backwash/waste pairs share nominal points. Pressure backwash/waste anchors also sit above the candidate cylindrical shell seam. The runtime preserves those independent typed ports, reports the conflicts and accepts explicit corrections in the appropriate surface. Exterior and plan views can also overlay otherwise distinct anchors when the orthogonal projection collapses their separation. `portDiagnostics` reports authored model conflicts. Each projection's `viewPortDiagnostics` separates `COINCIDENT_ILLUSTRATIVE_PORT_ANCHORS` from `PROJECTED_PORT_OVERLAP`. One example is ASP plan RAS/air, which share plan XY at different RL. Sheets without model flags carry a projection-overlap note. Both appear in the fixture report.
- The cited CPHEEO handles and edition/clause labels are preserved on the records and in the catalogue as unverified source leads. No clause-imposed angle, detention, fill, clearance, capacity or other design criterion is applied. For example, the 60° tube pitch and 0.6 m sump drop are values in the supplied approved illustration. Numerical validators enforce model consistency. They do not establish standards applicability. Fabrication and regulatory deliverable requests fail closed.
- In the six representative units, all supplied feature families are visible in at least one projection. Some weaker distinctions remain in the secondary views, especially exterior views of similar closed-off tanks and paired pressure filters. Receiving and stilling placement conflicts are called out above. Recognition has been visually compared to the supplied plates; independent engineering and reference review are pending.

## Reproduce the review

```sh
npm run all
node --test tests/family-09.test.mjs
npm run check:structure-layout
pdfinfo review/family-09-evidence/family-09-monochrome.pdf
pdftoppm -r 96 -gray -png review/family-09-evidence/family-09-monochrome.pdf /tmp/family-09-sheet
```

- `drawings/symbols/catalogue.json` contains the 24 records, view policies, ports, components and source dispositions. The three archive snapshots are in `tests/fixtures/family-09-legacy.json`, captured from base `d507072a8ba81a1207cd334da79a13866ef08c72`.
- `review/index.html` links to `review/family-09/index.html` with light, dark and print profiles. The fixtures include the 96 canonical views, representative transverse cuts, decanter checkpoints, shifted datum and invalid states. The six focused units and two decanter variants have A4 monochrome print sheets at nominal and 65% drawing size.
- Chromium evidence is under `review/family-09-evidence/`. Four atlas captures cover all 96 views. Representative and title-hidden captures, the transverse sheet, decanter travel and stress cases record visual inspection targets. `layout.json` records bounds, label spacing, ink and pressure-head checks. The 16-page PDF uses A4 landscape. Percentages describe panel reproduction size.
- For an independent source comparison, extract `processvg-family-09-atlas.png`, `processvg-family-09-decanter-presets.png` and the six `*-four-views.png` files from the supplied ZIP and compare them with the corresponding Chromium fixtures. The archive SHA-256 is `c527e34b15accaf8c9cc96c624ae26a85f1bd7af6e21ecce6959bed3dec0b266`. The final handoff SHA-256 is `cc3477de939dbcc31965d5058dc923f5e14edd82ea1be41e80ef09788cf999b3`.
