import { readFileSync } from "node:fs";
import { structureGeometry } from "./structure-geometry.mjs";
import { DECANTER_IDS, solveStructureDecanter } from "./structure-decanters.mjs";

const source = JSON.parse(readFileSync(new URL("./data/family-09-final-models.json", import.meta.url)));
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
export const STRUCTURE_RECORDS = freeze(Object.fromEntries(source.structures.map((entry) => [entry.id, entry])));
export const STRUCTURE_VIEWS = freeze(["schematic", "plan", "section", "elevation"]);
export const STRUCTURE_DATUM = freeze(source.projectDatum);
export const STRUCTURE_SOURCE_LEADS = freeze(source.citations);
export { DECANTER_IDS, solveStructureDecanter };

const references = freeze({
  "tank-open": { representation: "legacy", membership: "integral" },
  "screen-bar": { options: { variant: "legacy" }, membership: "distinct" },
  "gate-slide": { options: { convention: "current" }, membership: "distinct" },
  "pump-submersible": { options: { variant: "refined" }, membership: "distinct" },
  weir: { options: { convention: "current" }, membership: "integral" },
  "grit-classifier": { options: { variant: "legacy" }, membership: "distinct" },
  mixer: { options: { variant: "legacy" }, membership: "distinct" },
  "diffuser-grid": { representation: "legacy", membership: "integral" },
  decanter: { representation: "preset", membership: "integral" },
  "valve-check": { membership: "distinct" },
  "operator-motor": { membership: "integral" },
  "pump-dosing": { options: { variant: "legacy-assembly" }, membership: "distinct" },
});

const media = new Map(Object.entries({
  air: "gas",
  "screenings-solids": "solid", "sludge-cake": "solid",
  "grit-slurry": "slurry", sludge: "slurry", "waste-sludge": "slurry", "thickened-sludge": "slurry",
  "return-activated-sludge": "slurry", "mixed-liquor": "slurry",
  water: "liquid", wastewater: "liquid", drain: "liquid", "treated-effluent": "liquid",
  "nitrate-recycle": "liquid", "clarified-effluent": "liquid", chemical: "liquid",
  "process-liquid": "liquid", filtrate: "liquid", "backwash-water": "liquid", "backwash-waste": "liquid",
  permeate: "liquid", reject: "liquid", supernatant: "liquid", centrate: "liquid",
  "service-water": "liquid", polymer: "reagent", "polymer-solution": "liquid", scum: "slurry",
}));
const faces = ["west", "east", "south", "north"];
const epsilon = 1e-8;
const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
};
const positive = (value, name) => {
  if (finite(value, name) <= 0) throw new RangeError(`${name} must be positive`);
  return value;
};
const token = (value, name) => {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} must be a nonempty string`);
  return value;
};
const localPoint = ({ x_m, y_m, z_RL_m }) => [x_m, y_m, z_RL_m];
const vector = (point, size, name) => {
  if (!Array.isArray(point) || point.length !== size || !point.every(Number.isFinite)) {
    throw new RangeError(`${name} must have ${size} finite coordinates`);
  }
  return point;
};
const countLimits = {
  screenBars: 30, pumpCount: 6, diffuserRows: 20, diffusersPerRow: 40, carrierRows: 16,
  carrierColumns: 32, tubeRows: 30, scraperArms: 12, flightMarkers: 30, baffleCount: 15,
  discCount: 20, membraneModuleCount: 20, picketCount: 60, plateCount: 30, rollerCount: 16,
};
const parameterInputs = new Set([...Object.keys(countLimits), "feedwellDiameterFraction",
  "baffleEndOpeningFraction", "tubeInclinationDeg", "sumpDropM"]);

function createWater(record, options, shift, floorRL, wallTopRL) {
  const { levels } = record;
  const mode = "twl_rl_m" in levels ? "variable" : "wl_rl_m" in levels ? "static" : "none";
  const keys = mode === "variable" ? ["bwlRL", "currentRL", "twlRL"] : mode === "static" ? ["wlRL"] : [];
  const supplied = { wlRL: levels.wl_rl_m, bwlRL: levels.bwl_rl_m,
    currentRL: levels.current_rl_m, twlRL: levels.twl_rl_m };
  if (Object.keys(options).some((key) => !keys.includes(key))) throw new RangeError(`Invalid ${mode} water level field`);
  const water = { mode };
  let previous = floorRL;
  for (const key of keys) {
    const value = finite(options[key] ?? supplied[key] + shift, key);
    if (value < previous - epsilon || value > wallTopRL + epsilon) throw new RangeError(`Invalid water level order at ${key}`);
    water[key] = value;
    previous = value;
  }
  return water;
}

function buildDecanter(record, options, scale, widthM, shift) {
  if (!record.decanterPresets) {
    if (options) throw new RangeError("Decanter presets apply to SBR basins");
    return null;
  }
  const id = options?.id ?? DECANTER_IDS[0];
  if (!DECANTER_IDS.includes(id)) throw new RangeError(`Unknown decanter preset ${id}`);
  const { parameters } = record.decanterPresets.registry[id.slice("decanter-".length)];
  const immersionM = finite(options?.immersionM ?? parameters.nominalSubmergenceM, "immersionM");
  const clearanceM = finite(options?.clearanceM ?? 0, "clearanceM");
  if (clearanceM < 0) throw new RangeError("clearanceM cannot be negative");
  const obstacles = (options?.obstacles ?? []).map(({ id: obstacle, min, max }) => {
    token(obstacle, "obstacle ID");
    vector(min, 3, "obstacle min");
    vector(max, 3, "obstacle max");
    if (min.some((value, i) => value >= max[i])) throw new RangeError(`Invalid obstacle bounds for ${obstacle}`);
    return { id: obstacle, min: [...min], max: [...max] };
  });
  const common = { id, immersionM, clearanceM, obstacles };
  if (id === DECANTER_IDS[0]) {
    if (["pivotM", "branch", "angleStopsDeg", "armLengthM"].some((key) => options?.[key] !== undefined)) {
      throw new RangeError("Swing-arm inputs require the swing-arm preset");
    }
    return { ...common, xM: finite(options?.xM ?? record.dimensions.length_m * scale[0] *
      parameters.intakeXFractionOfLength, "intake x"), yM: finite(options?.yM ?? widthM / 2, "intake y"),
      pivotM: null, branch: null };
  }
  if (options?.xM !== undefined || options?.yM !== undefined) throw new RangeError("Swing-arm position is solved from the pivot");
  const pivotM = [...vector(options?.pivotM ?? [
    parameters.pivotLocalM[0] * scale[0], parameters.pivotLocalM[1] * scale[1], parameters.pivotLocalM[2] + shift,
  ], 3, "pivotM")];
  const armLengthM = positive(options?.armLengthM ?? parameters.armLengthM, "armLengthM");
  const branch = options?.branch ?? "toward-inlet";
  if (!["toward-inlet", "toward-outlet"].includes(branch)) throw new RangeError("Invalid swing-arm branch");
  const angleStopsDeg = options?.angleStopsDeg ?? null;
  if (angleStopsDeg) {
    vector(angleStopsDeg, 2, "angleStopsDeg");
    if (angleStopsDeg[0] < -90 || angleStopsDeg[1] > 90 || angleStopsDeg[0] > angleStopsDeg[1]) {
      throw new RangeError("Angle stops must be ordered within [-90, 90]");
    }
  }
  return { ...common, pivotM, armLengthM, branch, angleStopsDeg: angleStopsDeg && [...angleStopsDeg] };
}

export function assertStructurePortConnection(a, b) {
  if (!a || !b || !media.has(a.medium) || a.medium !== b.medium ||
      !(a.direction === "out" && b.direction === "in" || a.direction === "in" && b.direction === "out")) {
    throw new RangeError("Structure port connection requires matching media and opposite directions");
  }
  return true;
}

export function structureSitePoint(model, localM) {
  vector(localM, 3, "localM");
  if (!model.siteTransform) throw new RangeError("Structure has no site transform");
  const { originProjectM: [easting, northing], rotationDeg } = model.siteTransform;
  const a = rotationDeg * Math.PI / 180;
  const [x, y, z] = localM;
  return [easting + x * Math.cos(a) - y * Math.sin(a), northing + x * Math.sin(a) + y * Math.cos(a), z];
}

export function structureInventory(models) {
  const inventory = [];
  const ids = new Set();
  function add(entry) {
    if (ids.has(entry.assetId)) throw new RangeError(`Duplicate assembly asset identity ${entry.assetId}`);
    ids.add(entry.assetId);
    inventory.push(entry);
  }
  for (const model of models) {
    add({ assetId: model.assetId, kind: model.kind });
    for (const part of model.components.filter(({ membership }) => membership === "distinct")) {
      add({ assetId: part.assetId, kind: part.symbolId, parentAssetId: model.assetId, partId: part.id });
    }
  }
  return inventory;
}

/** Options in metres. Explicit RL overrides are expressed in the resulting datum. */
export function createStructureModel(kind, options = {}) {
  if (!Object.hasOwn(STRUCTURE_RECORDS, kind)) throw new RangeError(`Unknown structure ${kind}`);
  if (options.deliverable && options.deliverable !== "review") throw new RangeError("Family 09 is eligible for illustrative review only");
  const record = STRUCTURE_RECORDS[kind];
  const assetId = token(options.assetId ?? record.assetIdentity, "assetId");
  const datum = { ...STRUCTURE_DATUM, ...structuredClone(options.datum ?? {}) };
  token(datum.id, "datum id");
  if (options.criteriaApplied?.length) throw new RangeError("Family 09 has no verified design criteria registry");
  if (datum.units !== "m") throw new RangeError("Structure datum must be expressed in metres");
  const datumShift = finite(datum.floorReferenceRL_m, "datum reference RL") - STRUCTURE_DATUM.floorReferenceRL_m;
  if (datumShift && datum.id === STRUCTURE_DATUM.id) throw new RangeError("Shifted datum needs an explicit datum ID");
  const siteTransform = structuredClone(options.siteTransform ?? null);
  if (siteTransform) {
    vector(siteTransform.originProjectM, 2, "site origin");
    finite(siteTransform.rotationDeg, "site rotation");
    token(siteTransform.horizontalCRS, "site CRS");
    if (datum.horizontalCRS && datum.horizontalCRS !== siteTransform.horizontalCRS) throw new RangeError("Datum and site CRS differ");
  }
  const lengthM = positive(options.lengthM ?? record.dimensions.length_m, "lengthM");
  const widthM = positive(options.widthM ?? record.dimensions.width_m, "widthM");
  const depthM = positive(options.depthM ?? record.dimensions.overall_depth_m, "depthM");
  const floorRL = finite(options.floorRL ?? record.levels.floor_rl_m + datumShift, "floorRL");
  const shift = floorRL - record.levels.floor_rl_m;
  const wallTopRL = finite(floorRL + depthM, "wallTopRL");
  if (wallTopRL <= floorRL) throw new RangeError("Depth must resolve within the selected datum precision");
  const shape = record.shape;
  if (["circular", "pressure"].includes(shape) && lengthM !== widthM) throw new RangeError("Circular footprint requires equal diameters");
  const scale = [lengthM / record.dimensions.length_m, widthM / record.dimensions.width_m];
  const place = ([x, y, z]) => [x * scale[0], y * scale[1],
    floorRL + (z - record.levels.floor_rl_m) * depthM / record.dimensions.overall_depth_m];
  const geometry = { shape, lengthM, widthM, depthM, floorRL, wallTopRL };
  const water = createWater(record, options.water ?? {}, shift, floorRL, wallTopRL);
  for (const key of Object.keys(options.parameters ?? {})) {
    if (!parameterInputs.has(key) || !Object.hasOwn(record.featureParameters,key)) {
      throw new RangeError(`Unknown ${kind} feature parameter ${key}`);
    }
  }
  const parameters = { ...record.featureParameters, ...options.parameters };
  for (const [key, max] of Object.entries(countLimits)) {
    if (!(key in parameters)) continue;
    if (!Number.isInteger(parameters[key]) || parameters[key] < 1 || parameters[key] > max) {
      throw new RangeError(`Invalid review feature count ${key} (1–${max})`);
    }
  }
  for (const key of ["feedwellDiameterFraction", "baffleEndOpeningFraction"]) {
    if (key in parameters && !(parameters[key] > 0 && parameters[key] < 0.5)) throw new RangeError(`Invalid ${key}`);
  }
  if ("tubeInclinationDeg" in parameters && !(parameters.tubeInclinationDeg > 0 && parameters.tubeInclinationDeg < 90)) {
    throw new RangeError("Tube inclination must be between 0 and 90 degrees");
  }
  if ("sumpDropM" in parameters && !(parameters.sumpDropM > 0 && parameters.sumpDropM < depthM)) {
    throw new RangeError("Sump drop must be positive and less than overall depth");
  }
  const within = (point) => point[0] >= 0 && point[0] <= lengthM && point[1] >= 0 && point[1] <= widthM &&
    point[2] >= floorRL - epsilon && point[2] <= wallTopRL + epsilon &&
    (!["circular", "pressure"].includes(shape) || Math.hypot(point[0] - lengthM / 2, point[1] - widthM / 2) <= lengthM / 2 + epsilon);
  const ports = record.ports.map((entry) => {
    const { id, medium, direction, physicalSurface: surface } = entry;
    const anchorM = [...vector(options.portAnchors?.[id] ?? place(localPoint(entry.localAnchorM)), 3, id)];
    const surfaceAxis = ["west", "east"].includes(surface) ? 0 : ["south", "north"].includes(surface) ? 1 : 2;
    const surfaceValue = { west: 0, east: lengthM, south: 0, north: widthM, floor: floorRL }[surface];
    if (!media.has(medium) || !["in", "out"].includes(direction) || !within(anchorM) ||
        (surface !== "floor" && Math.abs(anchorM[surfaceAxis] - surfaceValue) > epsilon)) throw new RangeError(`Invalid structure port ${id}`);
    return { id, medium, direction, surface, anchorM, phase: media.get(medium), attachmentKind: entry.attachment_kind,
      status: options.portAnchors?.[id] ? "user-placement" : entry.anchorStatus, assetId };
  });
  const decanter = buildDecanter(record, options.decanter, scale, widthM, shift);
  const components = record.components.flatMap((entry) => {
    const { symbolId } = entry;
    const spec = references[symbolId];
    const gates = symbolId === "gate-slide";
    const qty = symbolId === "pump-submersible" ? parameters.pumpCount : gates ? 2 : 1;
    return Array.from({ length: qty }, (_, i) => {
      const id = gates ? `${symbolId}-${i === 0 ? "inlet" : "outlet"}` :
        symbolId === "pump-submersible" ? `${symbolId}-${i + 1}` : symbolId;
      const input = options.components?.[id] ?? {};
      if (symbolId === "decanter" && input.mountM !== undefined) throw new RangeError("Set decanter placement through its preset");
      const point = place(localPoint(entry.mountLocalM));
      const supplemental = i > 0;
      // Added review pumps are spaced independently of the supplied first mount.
      const supplementalLane = kind === "equalisation-tank" ? 0.38 : 0.5;
      const additionalMount = [lengthM * (supplementalLane - (i - 1) * 0.085), widthM / 2, point[2]];
      const gateOffset = Math.min(lengthM * 0.2,point[0]/2,(lengthM-point[0])/2);
      const gateMount = [point[0]+(i === 0 ? -gateOffset : gateOffset),point[1],point[2]];
      const mountM = [...vector(input.mountM ?? (gates ? gateMount : supplemental ? additionalMount : point), 3, id)];
      if (!within(mountM)) throw new RangeError(`Invalid component placement for ${id}`);
      const proxy = symbolId === "tank-open" || symbolId === "mixer" && ["secondary-clarifier", "gravity-thickener"].includes(kind);
      const membership = proxy ? "reference" : spec.membership;
      if (input.assetId !== undefined && membership !== "distinct") throw new RangeError(`Only distinct parts may have an asset ID (${id})`);
      const q = input.q ?? 0;
      if (!Number.isInteger(q)) throw new RangeError(`Component rotation must be in quarter turns (${id})`);
      if (input.variant !== undefined && (!["screen-bar", "grit-classifier", "mixer"].includes(symbolId) ||
          !["legacy", "candidate"].includes(input.variant))) throw new RangeError(`Invalid component variant for ${id}`);
      return { id, sourceSymbolId: symbolId, symbolId: symbolId === "decanter" ? decanter.id : symbolId,
        membership, mountM, q, representation: spec.representation ?? "library",
        options: { ...spec.options, ...(input.variant && { variant: input.variant }) },
        status: input.mountM ? "user-placement" : gates ? "candidate-inlet-and-outlet-gate-mounts" :
          supplemental ? "candidate-supplemental-pump" : entry.mountStatus,
        ...(membership === "distinct" && { assetId: token(input.assetId ?? `${assetId}/${id}`, "component assetId") }) };
    });
  });
  for (const key of Object.keys(options.portAnchors ?? {})) {
    if (!ports.some(({ id }) => key === id)) throw new RangeError(`Unknown port placement ${key}`);
  }
  for (const key of Object.keys(options.components ?? {})) {
    if (!components.some(({ id }) => key === id)) throw new RangeError(`Unknown component placement ${key}`);
  }

  for (const id of Object.keys(options.cuts ?? {})) {
    if (!record.viewPolicy.sectionCuts.some((cut) => cut.id === id)) throw new RangeError(`Unknown section cut ${id}`);
  }
  const cuts = record.viewPolicy.sectionCuts.map((cut) => {
    const points = options.cuts?.[cut.id] ?? [cut.startLocalM, cut.endLocalM].map(([x, y]) => [x * scale[0], y * scale[1]]);
    vector(points[0], 2, cut.id);
    vector(points[1], 2, cut.id);
    const axis = cut.kind === "longitudinal" ? 0 : 1;
    const perpendicular = points[0][1 - axis];
    const extent = [lengthM, widthM];
    if (points.length !== 2 || perpendicular !== points[1][1 - axis] || perpendicular <= 0 ||
        perpendicular >= extent[1 - axis] || points[0][axis] !== 0 ||
        Math.abs(points[1][axis] - extent[axis]) > epsilon) {
      throw new RangeError(`Section ${cut.id} must span its selected local axis`);
    }
    return { id: cut.id, axis, perpendicular, points: structuredClone(points) };
  });
  const elevationFace = options.elevationFace ?? record.viewPolicy.elevationFace;
  if (!faces.includes(elevationFace)) throw new RangeError("Invalid elevation face");
  const dimensions = record.dimensionAnnotations.map(({ id, fromM, toM }) => {
    const from = place(fromM), to = place(toM);
    return { id, fromM: from, toM: to, valueM: Math.hypot(...to.map((v, i) => v - from[i])) };
  });
  const model = { assetId, kind, name: record.name, featureIds: [...record.features], parameters, geometry, water, ports,
    components, decanter, cuts, elevationFace, dimensions, viewPolicy: record.viewPolicy, datum, siteTransform,
    sourceLeads: record.provenance, criteriaApplied: [], status: "illustrative-review-only",
    evidenceGaps: ["ILLUSTRATIVE_DIMENSIONS", "VENDOR_FIT_UNVERIFIED", "DESIGN_CRITERIA_UNVERIFIED",
      datum.surveyBenchmark ? "SURVEY_DATUM_UNVERIFIED" : "SURVEY_DATUM_MISSING",
      siteTransform ? "SITE_TRANSFORM_UNVERIFIED" : "SITE_TRANSFORM_MISSING"] };
  structureInventory([model]);
  model.civil = structureGeometry(model);
  if (decanter) {
    decanter.obstacles.push(...model.civil.primitives.filter(({ id }) => id === "diffuser-header")
      .map(({ min, max }, i) => ({ id: `diffuser-header-${i+1}`, min, max })));
    decanter.obstacles.push(...model.civil.primitives.filter(({ id }) => id === "diffuser")
      .map(({ x, y, z0, z1, radius }, i) => ({ id: `diffuser-clearance-envelope-${i+1}`,
        min: [x-radius,y-radius,z0], max: [x+radius,y+radius,z1] })));
    const solved = solveStructureDecanter(model);
    const part = components.find(({ sourceSymbolId }) => sourceSymbolId === "decanter");
    part.referenceMountM = part.mountM;
    part.mountM = solved.valid ? solved.pivotM ?? solved.intakeM : null;
    part.status = solved.valid ? "resolved-illustrative-preset" : "invalid-preset";
  }
  model.portDiagnostics = ports.flatMap((port, i) => {
    const sameAnchor = ports.slice(0,i).filter(({ anchorM }) => anchorM.every((v,k) => Math.abs(v-port.anchorM[k]) <= epsilon));
    const diagnostics = sameAnchor.map(({ id }) => ({
      code: "COINCIDENT_ILLUSTRATIVE_PORT_ANCHORS", ports: [id,port.id],
    }));
    if (port.surface === "floor" && Math.abs(model.civil.floorAt(...port.anchorM)-port.anchorM[2]) > epsilon) {
      if (port.status === "user-placement") throw new RangeError(`Port ${port.id} must lie on the selected floor surface`);
      diagnostics.push({ code: "PORT_OFF_REVIEW_FLOOR", ports: [port.id] });
    }
    if (shape === "pressure" && (port.anchorM[2] < floorRL + model.civil.capM ||
        port.anchorM[2] > wallTopRL - model.civil.capM)) {
      if (port.status === "user-placement") throw new RangeError(`Port ${port.id} is outside the cylindrical shell course`);
      diagnostics.push({ code: "PORT_OFF_PRESSURE_SHELL", ports: [port.id] });
    }
    return diagnostics;
  });
  if (["receiving-chamber","stilling-chamber"].includes(kind) && ports[0].anchorM[2] >= ports[1].anchorM[2]) {
    model.portDiagnostics.push({ code: "INLET_NOT_BELOW_OUTLET_ANCHOR", ports: ports.slice(0,2).map(({ id }) => id) });
  }
  return freeze(model);
}
