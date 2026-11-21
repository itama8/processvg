import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertStructurePortConnection, byId, composeStructure, createStructureModel, DECANTER_IDS,
  placeSymbol, projectStructure, solveStructureDecanter, STRUCTURE_RECORDS, STRUCTURE_VIEWS,
  structureInventory, structureSitePoint } from "../src/library.mjs";

const read = (path) => readFileSync(new URL(path,import.meta.url));
const close = (actual,expected,tolerance=1e-8) =>
  assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);
const features = ({ primitives }) => new Set(primitives.map(({ id }) => id));
const render = (kind,view,options = {}) => composeStructure(createStructureModel(kind),{ view,...options });
const code = (result,id) => assert.ok(result.diagnostics.some(({ code }) => code === id),id);

test("revision 03 source and three archived symbols are exact and additive",() => {
  const digest = createHash("sha256").update(read("../src/data/family-09-final-models.json")).digest("hex");
  assert.equal(digest,"8734dd9955b9228ce4e744987daa942b77571ba3145a194b3e68ead48506bd60");
  const snapshots = JSON.parse(read("./fixtures/family-09-legacy.json"));
  for (const { id,ports,shapes } of snapshots) {
    assert.deepEqual(byId[id].draw({}),shapes);
    assert.deepEqual(byId[id].ports,ports);
    assert.deepEqual(placeSymbol(id).shapes,shapes);
    assert.deepEqual(placeSymbol(id).ports,ports);
    assert.throws(()=>createStructureModel(id),/Unknown structure/);
  }
  const catalogue = JSON.parse(read("../drawings/symbols/catalogue.json"));
  assert.equal(catalogue.structures.records.length,24);
  for (const legacy of snapshots) {
    const { id,ports,shapes } = catalogue.symbols.find(({ id }) => id === legacy.id);
    assert.deepEqual({ id,ports,shapes },legacy);
  }
});

test("24 explicit records resolve 96 model-owned views and preferred view defaults",() => {
  const records = Object.values(STRUCTURE_RECORDS);
  assert.equal(records.length,24);
  const keys = new Set();
  const preferred = {};
  for (const record of records) {
    const model = createStructureModel(record.id);
    assert.ok(Object.isFrozen(model) && Object.isFrozen(model.civil.primitives));
    assert.equal(model.assetId,record.assetIdentity);
    const selection = composeStructure(model);
    assert.equal(selection.view,record.viewPolicy.preferred);
    preferred[selection.view] = (preferred[selection.view] ?? 0)+1;
    for (const view of STRUCTURE_VIEWS) {
      const result = composeStructure(model,{ view });
      assert.equal(result.assetId,model.assetId);
      assert.equal(result.view,view);
      assert.match(result.svg,/NOT TO SCALE \/ ILLUSTRATIVE/);
      assert.doesNotMatch(result.svg,/NaN|Infinity|undefined/);
      keys.add(result.kind+"/"+result.view);
    }
  }
  assert.equal(keys.size,96);
  assert.deepEqual(preferred,{ section:17,plan:3,elevation:4 });
});

test("wet well uses the preserved off-axis pump mount and cuts its real sloped sump",() => {
  const model = createStructureModel("raw-sewage-wet-well");
  const plan = projectStructure(model,{ view:"plan" });
  const a = projectStructure(model,{ view:"section",cut:"A-A" });
  const b = projectStructure(model,{ view:"section",cut:"B-B" });
  const aPump = a.primitives.filter(({ id }) => id === "submersible-pump");
  const bPump = b.primitives.filter(({ id }) => id === "submersible-pump");
  assert.deepEqual(aPump.map(({ partId })=>partId),["pump-submersible-2"]);
  assert.deepEqual(bPump.map(({ partId })=>partId),["pump-submersible-2"]);
  assert.deepEqual(plan.primitives.filter(({ id }) => id === "submersible-pump").map(({ centre })=>centre),[[5.85,3.9],[4.5,3]]);
  assert.notDeepEqual(a.floor,b.floor);
  close(a.floor[0][1],100.6);
  close(Math.min(...a.floor.map(([,z])=>z)),100);
  close(Math.min(...b.floor.map(([,z])=>z)),100);
  assert.deepEqual(a.ports.find(({ id })=>id === "drain").point,[4.5,100]);
  assert.throws(()=>createStructureModel(model.kind,{ components:{"pump-submersible-1":{mountM:[0,3,100.4]}} }),/envelope/);
  assert.throws(()=>createStructureModel(model.kind,{ components:{"pump-submersible-1":{mountM:[4.5,3,100.4]}} }),/overlap/);
  assert.throws(()=>createStructureModel(model.kind,{ parameters:{ sumpDropM:8 } }),/Sump drop/);
  const equalisation = createStructureModel("equalisation-tank");
  const pump = equalisation.components.find(({ id })=>id === "pump-submersible-2");
  assert.ok(pump.mountM[0]<equalisation.components.find(({ id })=>id === "mixer").mountM[0]);
  assert.throws(()=>createStructureModel(equalisation.kind,{
    components:{"pump-submersible-2":{mountM:[6,3.5,100.4]}},
  }),/Pump and mixer envelopes overlap/);
});

test("representative cuts and face visibility use the same nested geometry",() => {
  const mbbr = createStructureModel("mbbr-reactor");
  assert.ok(features(projectStructure(mbbr)).has("carrier-volume"));
  assert.ok(features(projectStructure(mbbr)).has("carrier-retention-screen"));
  assert.ok(!features(projectStructure(mbbr,{ cut:"B-B" })).has("carrier-retention-screen"));
  const lightMedia = createStructureModel("mbbr-reactor",{ parameters:{carrierRows:2,carrierColumns:3} });
  assert.equal(projectStructure(lightMedia).primitives.filter(({ id })=>id === "carrier-volume").length,6);
  assert.deepEqual(projectStructure(lightMedia).floor,projectStructure(mbbr).floor);
  const tube = createStructureModel("tube-settler");
  const slope = tube.civil.primitives.find(({ id })=>id === "inclined-tubes");
  const [a,,,d] = slope.points;
  close(Math.atan2(d[2]-a[2],d[0]-a[0])*180/Math.PI,60);
  assert.ok(features(projectStructure(tube)).has("inclined-tubes"));
  assert.ok(features(projectStructure(tube,{ cut:"B-B" })).has("inclined-tubes"));
  for (const kind of ["mbbr-reactor","raw-sewage-wet-well","tube-settler","sbr-basin","secondary-clarifier","chlorine-contact-tank"]) {
    const model = createStructureModel(kind);
    assert.notDeepEqual(projectStructure(model,{ view:"section" }).primitives,projectStructure(model,{ view:"section",cut:"B-B" }).primitives);
    const exterior = projectStructure(model,{ view:"elevation" });
    assert.deepEqual(exterior.levels,[]);
    assert.equal(exterior.decanter,null);
    assert.ok(exterior.primitives.every(({ id })=>["exterior-wall","access-bridge"].includes(id)));
  }
  const uf = projectStructure(createStructureModel("ultrafiltration-skid"));
  assert.equal(uf.view,"elevation");
  assert.equal(uf.primitives.filter(({ id })=>id === "membrane-module").length,6);
});

test("circular section chords, hopper floor, dimensions and pressure caps are coherent",() => {
  const model = createStructureModel("secondary-clarifier");
  const plan = projectStructure(model);
  const outline = plan.primitives.find(({ id })=>id === "footprint");
  assert.equal(outline.radius,7);
  const a = projectStructure(model,{ view:"section" });
  assert.deepEqual(a.span,[0,14]);
  assert.ok(features(a).has("feedwell") && features(a).has("peripheral-weir") && features(a).has("scraper-arm"));
  close(Math.min(...a.floor.map(([,z])=>z)),100);
  assert.deepEqual(model.dimensions.slice(0,2).map(({ valueM })=>valueM),[14,14]);
  const offset = createStructureModel(model.kind,{ cuts:{"A-A":[[0,9],[14,9]]} });
  const chord = projectStructure(offset,{ view:"section" });
  close(chord.span[1]-chord.span[0],2*Math.sqrt(49-4));
  assert.ok(chord.floor.every(([,z])=>z>100));
  assert.match(composeStructure(offset,{ view:"section" }).svg,/Cut chord 13\.416 m/);
  const pressure = createStructureModel("pressure-sand-filter",{ cuts:{"A-A":[[0,2.4],[3.2,2.4]]} });
  const capsule = projectStructure(pressure).primitives.find(({ id })=>id === "pressure-shell");
  close(capsule.half,Math.sqrt(1.6**2-0.8**2));
  assert.throws(()=>createStructureModel(model.kind,{lengthM:12}),/equal diameters/);
  assert.throws(()=>createStructureModel(model.kind,{cuts:{"A-A":[[0,7],[14,8]]}}),/selected local axis/);
});

test("serpentine route uses each physical baffle end gap with no straight shortcut",() => {
  const model = createStructureModel("chlorine-contact-tank");
  const plan = projectStructure(model);
  const baffles = plan.primitives.filter(({ id })=>id === "contact-baffle");
  const route = plan.primitives.find(({ id })=>id === "serpentine-route");
  assert.equal(baffles.length,5);
  for (const [i,{ points }] of baffles.entries()) {
    const x = (points[0][0]+points[1][0])/2;
    const y = route.points.find(([rx])=>Math.abs(rx-x)<1e-8)[1];
    const ys = points.map(([,y])=>y);
    assert.ok(i%2 ? y>Math.max(...ys) : y<Math.min(...ys));
  }
  const section = projectStructure(model,{view:"section"});
  assert.equal(section.levels[0].segments.length,6);
  assert.ok(!features(section).has("serpentine-route"));
  assert.equal(projectStructure(model,{view:"section",cut:"B-B"}).levels[0].segments.length,1);
});

test("both SBR presets obey actual immersion and circle geometry at BWL, midpoint and TWL",() => {
  let baseline;
  for (const id of DECANTER_IDS) {
    const model = createStructureModel("sbr-basin",{decanter:{id}});
    const { bwlRL,twlRL } = model.water;
    const solutions = [bwlRL,(bwlRL+twlRL)/2,twlRL].map((currentRL) => {
      const state = createStructureModel(model.kind,{water:{currentRL},decanter:{id,immersionM:0.08}});
      const result = projectStructure(state,{view:"plan"});
      const geometry = result.primitives.filter(({ id })=>["footprint","diffuser","diffuser-header"].includes(id));
      baseline ??= geometry;
      assert.deepEqual(geometry,baseline);
      const solved = solveStructureDecanter(state);
      assert.equal(solved.assetId,model.assetId);
      assert.equal(solved.id,id);
      assert.ok(solved.valid);
      assert.deepEqual(state.components.find(({ id })=>id === "decanter").mountM,solved.pivotM ?? solved.intakeM);
      close(solved.intakeM[2],currentRL-0.08);
      if (id === "decanter-floating") assert.deepEqual(solved.intakeM.slice(0,2),[12,3.5]);
      else {
        const delta = solved.intakeM.map((v,i)=>v-solved.pivotM[i]);
        close(Math.hypot(...delta),2.3);
        assert.deepEqual(solved.pivotM,[14.4,3.5,105.18]);
        assert.equal(solved.branch,"toward-inlet");
        assert.ok(delta[0]<0);
        close(solved.angleDeg,Math.atan2(-delta[2],-delta[0])*180/Math.PI);
      }
      return solved;
    });
    code(solutions[0],"AT_LOW_WATER_LIMIT");
    code(solutions[2],"AT_HIGH_WATER_LIMIT");
    if (id === "decanter-swing-arm") {
      const branch = createStructureModel(model.kind,{ decanter:{ id,branch:"toward-outlet",pivotM:[10,3.5,105.18] } });
      assert.ok(solveStructureDecanter(branch).intakeM[0]>10);
      assert.ok(solutions[0].angleDeg>solutions[1].angleDeg && solutions[1].angleDeg>solutions[2].angleDeg);
    }
  }
});

test("decanter rejects or diagnoses invalid travel, clearance, submergence, stops and collisions",() => {
  const id = "decanter-swing-arm";
  const solve = (decanter,level) => solveStructureDecanter(createStructureModel("sbr-basin",{decanter}),level);
  code(solve({id,armLengthM:0.5},103.4),"ARM_TRAVEL_UNREACHABLE");
  code(solve({id,branch:"toward-outlet"}),"INTAKE_OUT_OF_BOUNDS");
  code(solve({id,pivotM:[16,3.5,105.18]}),"PIVOT_OUT_OF_BOUNDS");
  code(solve({id,angleStopsDeg:[10,45]},105),"HIGH_WATER_ANGLE_STOP_EXCEEDED");
  code(solve({id,angleStopsDeg:[10,45]},103.4),"LOW_WATER_ANGLE_STOP_EXCEEDED");
  const high = solve({id},105).angleDeg;
  const low = solve({id},103.4).angleDeg;
  code(solve({id,angleStopsDeg:[high,low]},105),"AT_HIGH_WATER_ANGLE_STOP");
  code(solve({id,angleStopsDeg:[high,low]},103.4),"AT_LOW_WATER_ANGLE_STOP");
  code(solve({id,clearanceM:0.5}),"BOUNDARY_CLEARANCE");
  code(solve({id,obstacles:[{id:"beam",min:[13,3.4,103.5],max:[13.5,3.6,105]}]}),"COLLISION");
  code(solve({id,clearanceM:0.05,obstacles:[{id:"beam",min:[13,3.54,103.5],max:[13.5,3.6,105]}]}),"OBSTACLE_CLEARANCE");
  code(solve({immersionM:0}),"INTAKE_NOT_SUBMERGED");
  code(solve({immersionM:5}),"INTAKE_OUT_OF_BOUNDS");
  code(solve({id},103),"BELOW_BWL");
  code(solve({id},106),"ABOVE_TWL");
  const invalid = composeStructure(createStructureModel("sbr-basin",{decanter:{id,armLengthM:0.5}}));
  assert.match(invalid.svg,/ARM_TRAVEL_UNREACHABLE/);
  assert.doesNotMatch(invalid.svg,/data-feature="fixed-length-arm"/);
});

test("datum changes shift section RL, site coordinates and kinematics without changing relative geometry",() => {
  const opts = { assetId:"A-17", decanter:{id:"decanter-swing-arm"} };
  const baseline = createStructureModel("sbr-basin",opts);
  const shifted = createStructureModel("sbr-basin",{
    ...opts,datum:{ id:"LOCAL-RL",floorReferenceRL_m:280.75 },
    siteTransform:{ originProjectM:[3000,4000],rotationDeg:90,horizontalCRS:"example-local" },
  });
  assert.equal(shifted.assetId,baseline.assetId);
  assert.deepEqual(shifted.dimensions.map(({ valueM })=>valueM),baseline.dimensions.map(({ valueM })=>valueM));
  const path = (model) => projectStructure(model).primitives.find(({ id })=>id === "section-shell").points;
  for (const [[x,z],[X,Z]] of path(baseline).map((p,i)=>[p,path(shifted)[i]])) {
    close(x,X);
    close(Z-z,180.75);
  }
  const original = solveStructureDecanter(baseline), result = solveStructureDecanter(shifted);
  close(original.intakeM[0],result.intakeM[0]);
  close(original.angleDeg,result.angleDeg);
  close(result.intakeM[2]-original.intakeM[2],180.75);
  assert.deepEqual(structureSitePoint(shifted,[12,3,280.75]),[2997,4012,280.75]);
  assert.equal(baseline.siteTransform,null);
  assert.throws(()=>structureSitePoint(baseline,[0,0,0]),/no site transform/);
  assert.throws(()=>createStructureModel("sbr-basin",{ datum:{floorReferenceRL_m:280} }),/datum ID/);
  assert.match(composeStructure(shifted).svg,/Floor RL 280\.75 m/);
  const resized = createStructureModel("sbr-basin",{ lengthM:18,widthM:8,depthM:6,floorRL:182 });
  assert.deepEqual(resized.dimensions.map(({ valueM })=>valueM),[18,8,6]);
  assert.deepEqual(resized.ports.find(({ id })=>id === "air-in").anchorM,[9,8,188]);
  assert.equal(resized.water.currentRL,186.4);
});

test("water modes, extreme levels, pressure and fabrication gates fail closed",() => {
  const extremes = createStructureModel("raw-sewage-wet-well",{water:{bwlRL:100,currentRL:100.2,twlRL:106}});
  const view = projectStructure(extremes);
  assert.ok(view.levels[2].segments[0][0]>0);
  assert.ok(view.levels[2].segments[0][1]<9);
  assert.match(composeStructure(extremes).svg,/BWL/);
  const tied = createStructureModel("sbr-basin",{water:{bwlRL:103.4,currentRL:103.4,twlRL:103.4}});
  assert.match(composeStructure(tied).svg,/TWL \/ NOW \/ BWL/);
  for (const water of [{bwlRL:99},{currentRL:101},{twlRL:109},{wlRL:103}]) {
    assert.throws(()=>createStructureModel("sbr-basin",{water}),/water level/);
  }
  for (const kind of ["pressure-sand-filter","activated-carbon-filter","ultrafiltration-skid","belt-press","filter-press","dewatering-centrifuge"]) {
    assert.equal(createStructureModel(kind).water.mode,"none");
    assert.throws(()=>createStructureModel(kind,{water:{wlRL:101}}),/none water level/);
    assert.doesNotMatch(render(kind,"section").svg,/data-water-level/);
  }
  assert.throws(()=>createStructureModel("tube-settler",{lengthM:-1}),/positive/);
  assert.throws(()=>createStructureModel("tube-settler",{parameters:{tubeInclinationDeg:90}}),/inclination/);
  assert.throws(()=>createStructureModel("tube-settler",{parameters:{tubeRows:0}}),/count/);
  assert.throws(()=>createStructureModel("tube-settler",{deliverable:"fabrication"}),/review only/);
  assert.throws(()=>composeStructure(extremes,{deliverable:"regulatory"}),/review only/);
  assert.throws(()=>createStructureModel("tube-settler",{criteriaApplied:["WS-2024-A:8.6.8"]}),/verified design criteria/);
});

test("typed ports and assembly inventory do not merge media, projections or integral parts",() => {
  const models = Object.keys(STRUCTURE_RECORDS).map((kind)=>createStructureModel(kind));
  const ports = models.flatMap(({ports})=>ports);
  const media = new Map(ports.map(({ medium,phase })=>[medium,phase]));
  for (const [name,phase] of [["service-water","liquid"],["wastewater","liquid"],["sludge","slurry"],["grit-slurry","slurry"],
    ["air","gas"],["backwash-water","liquid"],["drain","liquid"],["reject","liquid"],["permeate","liquid"],
    ["polymer","reagent"],["screenings-solids","solid"],["sludge-cake","solid"]]) assert.equal(media.get(name),phase);
  const a = ports.find(({id})=>id === "overflow-out"), b = ports.find(({id})=>id === "sewage-in");
  assert.equal(assertStructurePortConnection(a,b),true);
  assert.throws(()=>assertStructurePortConnection(b,b),/opposite/);
  assert.throws(()=>assertStructurePortConnection(a,ports.find(({medium})=>medium === "air")),/matching media/);
  assert.throws(()=>assertStructurePortConnection(ports.find(({medium})=>medium === "sludge-cake"),b),/matching media/);
  assert.throws(()=>createStructureModel("sbr-basin",{portAnchors:{"air-in":[0,0,100]}}),/structure port/);
  const inventory = structureInventory(models);
  assert.equal(inventory.filter(({parentAssetId})=>!parentAssetId).length,24);
  assert.equal(inventory.filter(({kind})=>kind === "pump-submersible").length,4);
  assert.ok(inventory.every(({kind})=>!DECANTER_IDS.includes(kind) && kind !== "diffuser-grid"));
  assert.throws(()=>structureInventory([models[0],models[0]]),/Duplicate/);
  assert.throws(()=>createStructureModel("sbr-basin",{components:{decanter:{assetId:"bad"}}}),/Only distinct/);
  const { portDiagnostics } = createStructureModel("pressure-sand-filter");
  assert.ok(portDiagnostics.some(({ code,ports })=>code === "COINCIDENT_ILLUSTRATIVE_PORT_ANCHORS" &&
    ports.join("/") === "backwash-in/waste-out"));
  const filterPlan = projectStructure(createStructureModel("pressure-sand-filter"),{ view:"plan" }).viewPortDiagnostics;
  assert.deepEqual(filterPlan.map(({ code,ports })=>[code,ports.join("/")]),
    [["COINCIDENT_ILLUSTRATIVE_PORT_ANCHORS","backwash-in/waste-out"]]);
  // RAS and air share plan XY at different RL: a projection overlap, not an authored coincidence.
  const asp = createStructureModel("asp-aeration-tank");
  assert.deepEqual(asp.portDiagnostics,[]);
  assert.deepEqual(projectStructure(asp,{ view:"plan" }).viewPortDiagnostics.map(({ code,ports })=>[code,ports.join("/")]),
    [["PROJECTED_PORT_OVERLAP","return-sludge-in/air-in"]]);
  assert.deepEqual(projectStructure(asp,{ view:"section" }).viewPortDiagnostics,[]);
  assert.match(composeStructure(asp,{ view:"plan" }).svg,/Distinct ports overlap in this projection/);
  assert.equal(inventory.filter(({kind})=>kind === "gate-slide").length,2);
  assert.throws(()=>createStructureModel("screen-channel-assembly",{
    components:{"gate-slide-inlet":{mountM:[7.45,1.1,101.35]}},
  }),/conflicts with screen/);
});

test("explicit earlier registry references preserve rotated markup, terminals and Family 08 opt-in",() => {
  const model = createStructureModel("screen-channel-assembly",{components:{"screen-bar":{q:1}}});
  const output = composeStructure(model,{view:"schematic"});
  const part = output.libraryParts.find(({symbolId})=>symbolId==="screen-bar");
  const legacy = placeSymbol("screen-bar",{q:1},{variant:"legacy"});
  assert.deepEqual(part.library.shapes,legacy.shapes);
  assert.deepEqual(part.library.ports,legacy.ports);
  assert.equal(part.library.metadata.orientation,90);
  assert.match(output.svg,/data-library-symbol="gate-slide"/);
  const candidate = createStructureModel(model.kind,{components:{"screen-bar":{variant:"candidate"}}});
  const optedIn = composeStructure(candidate,{view:"schematic"}).libraryParts.find(({symbolId})=>symbolId==="screen-bar");
  assert.notDeepEqual(optedIn.library.shapes,legacy.shapes);
  assert.deepEqual(optedIn.library.shapes,placeSymbol("screen-bar",{},{variant:"candidate"}).shapes);
  const wetWell = render("raw-sewage-wet-well","schematic");
  const pump = wetWell.libraryParts.find(({symbolId})=>symbolId==="pump-submersible");
  assert.deepEqual(pump.library.ports,placeSymbol("pump-submersible",{},{variant:"refined"}).ports);
  assert.equal(pump.library.metadata.variant,"refined");
});
