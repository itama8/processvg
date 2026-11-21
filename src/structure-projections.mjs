import { floorProfile } from "./structure-geometry.mjs";
import { solveStructureDecanter } from "./structure-decanters.mjs";

const eps = 1e-8;
const same = (a, b) => Math.abs(a - b) <= eps;
const inRange = (a, lo, hi) => a >= lo - eps && a <= hi + eps;
const ordered = (a, b) => a < b ? [a, b] : [b, a];
const crossPoint = (a, b, axis, at) => a.map((value, i) => value + (b[i] - value) * (at - a[axis]) / (b[axis] - a[axis]));
const path = (points, closed = false) => ({ type: "path", points, closed });
const rect = (x0, y0, x1, y1) => path([[x0,y0],[x1,y0],[x1,y1],[x0,y1]], true);
const circle = (x, y, radius) => ({ type: "circle", centre: [x,y], radius });
const line = (x0, y0, x1, y1) => path([[x0,y0],[x1,y1]]);
const tag = (entry, shapes) => shapes.map(shape => ({ ...shape, id: entry.id,
  ...(entry.secondary && { secondary: true }), ...(entry.dash && { dash: entry.dash }),
  ...(entry.partId && { partId: entry.partId }) }));

function intersectEdges(points, closed, orth, at, axis) {
  const output = [];
  const edgeCount = closed ? points.length : points.length - 1;
  for (let i = 0; i < edgeCount; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aIn = same(a[orth], at), bIn = same(b[orth], at);
    if (aIn && bIn) output.push(line(a[axis], a[2], b[axis], b[2]));
    else if (inRange(at, ...ordered(a[orth], b[orth]))) {
      const result = aIn ? a : bIn ? b : crossPoint(a, b, orth, at);
      if (!output.some((entry) => entry.type === "point" &&
          same(entry.at[0], result[axis]) && same(entry.at[1], result[2]))) {
        output.push({ type: "point", at: [result[axis], result[2]] });
      }
    }
  }
  if (closed && output.every(({ type }) => type === "point") && output.length === 2) {
    return [path(output.map(({ at: point }) => point))];
  }
  return output;
}

function projectPrimitive(entry, view, axis, at, parameters) {
  const { type, min, max, x, y, z, z0, z1, y0, y1, radius, points, hollow, id, axialAxis = 1 } = entry;
  const orth = 1 - axis;
  let result;
  if (view === "plan") {
    if (type === "box") result = [rect(min[0], min[1], max[0], max[1])];
    else if (type === "cylinder") result = [circle(x, y, radius)];
    else if (type === "drum") result = [axialAxis === 1 ? rect(x-radius,y0,x+radius,y1) :
      rect(y0,x-radius,y1,x+radius)];
    else result = [path(points.map(([u,v]) => [u,v]), type === "panel")];
  } else if (type === "box") {
    result = at === null || inRange(at,min[orth],max[orth]) ? [rect(min[axis],min[2],max[axis],max[2])] : [];
  } else if (type === "cylinder") {
    const centre = [x,y];
    const offset = at === null ? 0 : at - centre[orth];
    const half = Math.sqrt(Math.max(0, radius**2 - offset**2));
    const [left,right] = [centre[axis]-half, centre[axis]+half];
    result = Math.abs(offset) > radius + eps ? [] : hollow
      ? [line(left,z0,left,z1), ...(half > eps ? [line(right,z0,right,z1)] : [])]
      : [half > eps ? rect(left,z0,right,z1) : line(left,z0,left,z1)];
  } else if (type === "drum") {
    if (axis !== axialAxis) result = at === null || inRange(at,y0,y1) ? [circle(x,z,radius)] : [];
    else {
      const half = at === null ? radius : Math.sqrt(Math.max(0, radius**2 - (at-x)**2));
      result = at !== null && Math.abs(at-x) > radius + eps ? [] :
        [half > eps ? rect(y0,z-half,y1,z+half) : line(y0,z,y1,z)];
    }
  } else {
    result = at === null ? [path(points.map((point) => [point[axis],point[2]]), type === "panel")]
      : intersectEdges(points, type === "panel", orth, at, axis);
  }
  const outline = result[0];
  if (outline?.closed && id === "carrier-volume") {
    const [[a,b],[c],[,d]] = outline.points;
    const rows = parameters.carrierRows;
    const cols = parameters.carrierColumns;
    const r = Math.min((c-a)/cols, (d-b)/rows) * 0.14;
    // Carriers are a review texture in the model volume, not installed quantities.
    result = Array.from({ length: rows * cols }, (_, i) => ({
      ...circle(a + (0.5 + i % cols) * (c-a)/cols, b + (0.5 + Math.floor(i/cols)) * (d-b)/rows, r),
      secondary: i > 0,
    }));
  }
  if (outline?.closed && id === "carrier-retention-screen") {
    const [[a,b],[c],[,d]] = outline.points;
    const vertical = view !== "plan" && axis === 0 || view === "plan" && d-b > c-a;
    result.push(...Array.from({ length: 7 }, (_, i) => {
      const t = (i+1)/8;
      return { ...(vertical ? line(a,b+(d-b)*t,c,b+(d-b)*t) : line(a+(c-a)*t,b,a+(c-a)*t,d)), secondary: true };
    }));
  }
  if (view !== "plan" && outline?.closed && ["sand-bed", "carbon-bed"].includes(id)) {
    const [[a,b],[c],[,d]] = outline.points;
    for (let j = 1; j < 5; j++) {
      const y = b + (d-b)*j/5;
      if (id === "sand-bed") result.push({ ...line(a,y,c,y), secondary: j > 1 });
      else for (let i = 1; i < 10; i++) result.push({
        ...circle(a+(c-a)*i/10,y,Math.min((c-a)/45,(d-b)/25)), secondary: i + j > 3,
      });
    }
  }
  return tag(entry, result);
}

function portProjection(model, project, view, axis, at, face, span) {
  const { geometry: { lengthM, widthM } } = model;
  const normal = { west: [-1,0,0], east: [1,0,0], south: [0,-1,0], north: [0,1,0], floor: [0,0,-1] };
  return model.ports.filter(({ surface, anchorM }) => {
    if (view === "plan" || view === "schematic") return true;
    if (view === "section") return same(anchorM[1-axis], at) &&
      (!span || inRange(anchorM[axis],...span));
    if (surface === face) return true;
    // At the exterior silhouette a side nozzle can be seen in profile.
    return surface !== "floor" && normal[surface][axis] !== 0 &&
      (anchorM[axis] === 0 || same(anchorM[axis], [lengthM,widthM][axis]));
  }).map(port => ({ ...port, point: project(port.anchorM), normal: view === "plan"
    ? normal[port.surface].slice(0,2) : [normal[port.surface][axis], normal[port.surface][2]] }));
}

function pressureShell(model, civil, axis, at) {
  const { geometry: { floorRL: F, wallTopRL: T, lengthM: L } } = model;
  const r = L / 2;
  const { capM: cap, centre } = civil;
  const cross = at === null ? 0 : at - centre[1-axis];
  const ratio = Math.sqrt(Math.max(0, 1 - (cross/r)**2));
  const half = r * ratio;
  const cx = centre[axis];
  return { type: "capsule", x: cx, half, endRise: cap * ratio, bottomSeam: F + cap, topSeam: T - cap, id: "pressure-shell" };
}

function levelSegments(u0, u1, levelRL, profile, occupied, floorAtU) {
  const knots = [u0, u1, ...profile.map(([x]) => x), ...occupied.flat()];
  for (let i = 1; i < profile.length; i++) {
    let [a, za] = profile[i-1];
    let [b, zb] = profile[i];
    if ((za-levelRL)*(zb-levelRL) < 0) {
      // Bisection also works at offset cuts in the analytic conical floor.
      for (let iteration = 0; iteration < 45; iteration++) {
        const m = (a+b)/2, zm = floorAtU(m);
        if ((za-levelRL)*(zm-levelRL) > 0) [a, za] = [m, zm];
        else [b, zb] = [m, zm];
      }
      knots.push((a+b)/2);
    }
  }
  const sorted = [...new Set(knots.filter((u) => inRange(u,u0,u1)))].sort((a,b) => a-b);
  const wet = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i-1], b = sorted[i], mid = (a+b)/2;
    if (b-a <= eps || floorAtU(mid) > levelRL + eps || occupied.some(([l,r]) => inRange(mid,l,r))) continue;
    if (wet.length && same(wet.at(-1)[1],a)) wet.at(-1)[1] = b;
    else wet.push([a,b]);
  }
  return wet;
}

export function projectStructure(model, { view = model.viewPolicy.preferred, cut = "A-A", face = model.elevationFace } = {}) {
  if (!model.viewPolicy.available.includes(view)) throw new RangeError(`Unknown structure view ${view}`);
  if (!["south","north","east","west"].includes(face)) throw new RangeError(`Unknown exterior face ${face}`);
  const selected = model.cuts.find(({ id }) => id === cut);
  if (!selected) throw new RangeError(`Unknown structure cut ${cut}`);
  const { geometry: { shape, lengthM: L, widthM: W, floorRL: F, wallTopRL: T }, water } = model;
  const { civil } = model;
  const plan = view === "plan", section = view === "section", exterior = view === "elevation";
  const axis = section ? selected.axis : exterior && ["west","east"].includes(face) ? 1 : 0;
  const at = section ? selected.perpendicular : null;
  const reverse = exterior && ["north","west"].includes(face);
  const project = (point) => plan ? point.slice(0,2) : [point[axis],point[2]];
  const extent = [L,W][axis];
  const circularSpan = (centre, r, cross) => {
    const half = Math.sqrt(Math.max(0,r**2-cross**2));
    return [centre-half,centre+half];
  };
  const span = section && civil.round ? circularSpan(civil.centre[axis], L/2, at-civil.centre[1-axis]) : [0,extent];
  const [left,right] = span;
  const floor = floorProfile(civil,section ? selected : { axis, perpendicular: civil.centre[1-axis] },span);
  const primitives = [];
  const emit = (id, drawing) => primitives.push({ ...drawing,id });
  if (plan) {
    if (civil.round) emit("footprint",circle(...civil.centre,L/2));
    else if (shape !== "machine" && shape !== "skid") emit("footprint",rect(0,0,L,W));
    if (civil.coneRise) emit("hopper-bottom",circle(...civil.centre,civil.coneFlatR));
    if (civil.pit) for (const key of ["rim","bounds"]) emit(key === "rim" ? "sump-rim" : "hopper-bottom",rect(...civil.pit[key]));
  } else if (shape === "pressure") primitives.push(pressureShell(model,civil,axis,at));
  else if (shape !== "skid" && shape !== "machine") {
    if (exterior) {
      const wallToe = F + (civil.coneRise || (civil.pit?.rise ?? 0));
      emit("exterior-wall",rect(left,wallToe,right,T));
    } else emit("section-shell",path([[left,T],...floor,[right,T]]));
  }
  for (const entry of civil.primitives) {
    if (exterior && !entry.exterior || !plan && entry.planOnly || exterior && face !== "south" &&
        entry.id === "belt-run") continue;
    primitives.push(...projectPrimitive(entry,view,axis,at,model.parameters));
  }
  const levels = [];
  if (!plan && !exterior && water.mode !== "none") {
    const levelTable = water.mode === "variable"
      ? [["TWL",water.twlRL],["CURRENT",water.currentRL],["BWL",water.bwlRL]] : [["WL",water.wlRL]];
    const floorAt = (u) => axis === 0 ? civil.floorAt(u,at ?? W/2) : civil.floorAt(at ?? L/2,u);
    for (const [name, rl] of levelTable) {
      const occupied = civil.primitives.filter(({ id,type,min,max }) => type === "box" &&
        ["contact-baffle","inlet-baffle"].includes(id) && inRange(rl,min[2],max[2]) &&
        (at === null || inRange(at,min[1-axis],max[1-axis]))).map(({ min,max }) => [min[axis],max[axis]]);
      const segments = levelSegments(left,right,rl,floor,occupied,floorAt);
      levels.push({ name, rl, segments });
    }
  }
  let decanter = null;
  if (model.decanter && !exterior) {
    decanter = solveStructureDecanter(model);
    if (decanter.valid) {
      const { intakeM, pivotM, levelRL } = decanter;
      const [x,y,rl] = intakeM;
      // Open review envelope centred on the float or intake, bounded by the shell.
      const dx = Math.min(L * 0.045, x, L-x);
      const dy = Math.min(W * 0.1, y, W-y);
      const top = Math.min(T,(pivotM ? rl : levelRL) + model.geometry.depthM * 0.035);
      const lower = Math.max(F,rl-model.geometry.depthM * 0.02);
      const float = { id: pivotM ? "swing-intake" : "float", type: "box", partId: "decanter",
        min: [x-dx,y-dy,lower], max: [x+dx,y+dy,top] };
      if (dx > 0 && dy > 0 && top > lower) primitives.push(...projectPrimitive(float,view,axis,at,model.parameters));
      const linePart = { id: pivotM ? "fixed-length-arm" : "float-intake-offset", type: "line", partId: "decanter",
        points: [pivotM ?? [x,y,levelRL],intakeM] };
      primitives.push(...projectPrimitive(linePart,view,axis,at,model.parameters));
      for (const [name, anchor] of [["decanter-intake",intakeM],["decanter-pivot",pivotM]]) {
        if (anchor && (!section || same(at,anchor[1-axis]))) emit(name,{ type: "point", at: project(anchor) });
      }
    }
  }
  const ports = portProjection(model,project,view,axis,at,face,span);
  return { assetId: model.assetId, kind: model.kind, view, axis, reverse, span,
    extent, verticalExtent: plan ? [0,W] : [F,T], primitives, levels, ports, decanter,
    portDiagnostics: model.portDiagnostics, cuts: plan ? model.cuts : [], cut: section ? selected : null, face: exterior ? face : null,
    floor: section ? floor : null };
}
