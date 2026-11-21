import { place } from "./geometry.mjs";
import { levelAnnotation } from "./lines.mjs";

const units = new Map([["m", 1], ["mm", 0.001]]);
const length = (value, unit, name, min = 0, inclusive = false) => {
  const metres = value * unit;
  if (!Number.isFinite(value) || !Number.isFinite(metres) || (inclusive ? metres < min : metres <= min)) {
    throw new RangeError(`Invalid physical dimension: ${name}`);
  }
  return metres;
};
const same = (a, b) => Number.isFinite(a) && Number.isFinite(b) &&
  Math.abs(a - b) <= 8 * Number.EPSILON * Math.max(Math.abs(a), Math.abs(b));
const below = (a, b) => a < b && !same(a, b);
const between = (value, low, high, name) => {
  if (!Number.isFinite(value) || below(value, low) || below(high, value)) throw new RangeError(`${name} must be within [${low}, ${high}]`);
  return Math.max(low, Math.min(high, value));
};
const line = (...points) => "M" + points.map((p) => p.join(" ")).join(" L");
const outline = (points) => ({ d: line(...points) + " Z" });
const rect = (x0, y0, x1, y1) => outline([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const secondary = (shape) => ({ ...shape, role: "secondary" });
const reference = (...points) => ({ d: line(...points), role: "secondary" });
const hidden = (...points) => ({ ...reference(...points), dash: "3 2" });
const radians = (value) => value * Math.PI / 180;

function prescribed(snapshot, min, max, value) {
  const expected = same(value, min) ? "closed" : same(value, max) ? "open" : "partial";
  if (snapshot?.position && snapshot.position !== "unknown" && snapshot.position !== expected) {
    throw new RangeError("Reported position disagrees with the prescribed geometry");
  }
}

function channelPlan(width, upstream, downstream) {
  return [reference([-upstream, -width / 2], [downstream, -width / 2]),
    reference([-upstream, width / 2], [downstream, width / 2])];
}

function requireFootprint(left, right, upstream, downstream) {
  if (below(left, -upstream) || below(downstream, right)) {
    throw new RangeError("Supplied section extents do not enclose the equipment footprint");
  }
}

function guidedGate(kind, data, snapshot, view, dim) {
  const width = dim("width");
  const height = dim("height");
  const thickness = dim("thickness");
  const upstream = dim("upstreamLength"), downstream = dim("downstreamLength");
  requireFootprint(0, thickness, upstream, downstream);
  const guideTop = dim("guideTop"), guideWidth = dim("guideWidth");
  const leafWidth = dim("leafWidth");
  if (below(leafWidth, width) || below(guideTop, height)) throw new RangeError("Guides must span the opening and the leaf must cover its width");
  const halfLeaf = leafWidth / 2;
  const section = [reference([-upstream, 0], [downstream, 0]), hidden([0, -height], [0, -guideTop])];
  const elevation = [
    reference([-halfLeaf, 0], [halfLeaf, 0]),
    secondary(rect(-halfLeaf - guideWidth, -guideTop, -halfLeaf, 0)),
    secondary(rect(halfLeaf, -guideTop, halfLeaf + guideWidth, 0)),
    hidden([-width / 2, 0], [-width / 2, -height], [width / 2, -height], [width / 2, 0]),
  ];
  const plan = [
    ...channelPlan(width, upstream, downstream),
    secondary(rect(0, -halfLeaf - guideWidth, thickness, -halfLeaf)),
    secondary(rect(0, halfLeaf, thickness, halfLeaf + guideWidth)),
  ];

  const panels = [];
  const model = { width, height, leafWidth, thickness, guideTop, guideWidth, upstream, downstream };
  if (kind === "slide") {
    const leafHeight = dim("leafHeight"), maxLift = dim("maxLift");
    const lift = between(length(snapshot?.lift, units.get(snapshot?.unit), "lift", 0, true), 0, maxLift, "Lift");
    if (below(leafHeight, height) || below(height, maxLift) || below(guideTop, leafHeight + maxLift)) {
      throw new RangeError("Slide leaf and guides must cover the opening and full declared travel");
    }
    prescribed(snapshot, 0, maxLift, lift);
    panels.push([lift, lift + leafHeight]);
    Object.assign(model, { lift, maxLift, leafHeight, clearOpeningHeight: lift, clearOpeningArea: width * lift });
  } else if (kind === "stop") {
    if (!Array.isArray(data.panelHeights) || data.panelHeights.length < 1 || data.panelHeights.length > 1000) {
      throw new RangeError("Supply 1 to 1000 ordered stop-log panel heights");
    }
    const panelHeights = Array.from(data.panelHeights, (value) => length(value, units.get(data.unit), "panel height"));
    const count = snapshot?.installedPanels;
    if (!Number.isSafeInteger(count)) throw new RangeError("Supply installedPanels for this stop-log snapshot");
    between(count, 0, panelHeights.length, "Installed panel count");
    let installedHeight = 0;
    panelHeights.forEach((panelHeight, i) => {
      if (i < count) {
        panels.push([installedHeight, installedHeight + panelHeight]);
        installedHeight += panelHeight;
      }
    });
    if (below(guideTop, panelHeights.reduce((sum, value) => sum + value, 0))) {
      throw new RangeError("The full stop-log stack exceeds the guide top");
    }
    Object.assign(model, { panelHeights, installedPanels: count, installedHeight });
  } else {
    const leafHeight = dim("leafHeight");
    const state = snapshot?.installationState;
    if (!["installed", "removed"].includes(state)) throw new RangeError("Supply a known bulkhead installation state");
    if (below(leafHeight, height) || below(guideTop, leafHeight)) throw new RangeError("Bulkhead must cover the opening and fit the guide height");
    if (state === "installed") panels.push([0, leafHeight]);
    Object.assign(model, { leafHeight, installationState: state });
  }
  for (const [bottom, top] of panels) {
    elevation.push(rect(-halfLeaf, -top, halfLeaf, -bottom));
    section.push(rect(0, -top, thickness, -bottom));
  }
  if (panels.length) plan.push(rect(0, -halfLeaf, thickness, halfLeaf));
  return { shapes: { elevation, section, plan }[view], model };
}

function flapGate(snapshot, view, dim, installation) {
  if (installation !== "wall") throw new RangeError("The flap section requires a wall-mounted top-hinged arrangement");
  const width = dim("width"), height = dim("height"), thickness = dim("thickness");
  const wallThickness = dim("wallThickness"), headerHeight = dim("headerHeight");
  const upstream = dim("upstreamLength"), downstream = dim("downstreamLength");
  // A top hinge on the downstream seat plane, with the rectangular leaf on the downstream side.
  const maxAngle = between(dim("maxAngle", 1), Number.EPSILON, 90, "Maximum flap angle");
  const angle = between(snapshot?.angle, 0, maxAngle, "Flap angle");
  prescribed(snapshot, 0, maxAngle, angle);
  const sn = angle === 90 ? 1 : Math.sin(radians(angle));
  const cs = angle === 90 ? 0 : Math.cos(radians(angle));
  const toe = [height * sn, -height + height * cs];
  const offset = [thickness * cs, thickness * sn];
  const sectionLeaf = [[0, -height], toe, [toe[0] + offset[0], toe[1] + offset[1]],
    [offset[0], -height + offset[1]]];
  const sweep = Math.max(...sectionLeaf.map(([x]) => x));
  const maxFootprintAngle = Math.min(radians(maxAngle), Math.atan2(height, thickness));
  const reach = height * Math.sin(maxFootprintAngle) + thickness * Math.cos(maxFootprintAngle);
  requireFootprint(-wallThickness, reach, upstream, downstream);
  const section = [
    reference([-upstream, 0], [downstream, 0]),
    rect(-wallThickness, -height - headerHeight, 0, -height), outline(sectionLeaf),
  ];
  const plan = [...channelPlan(width, upstream, downstream), reference([-wallThickness, -width / 2], [-wallThickness, width / 2]),
    rect(0, -width / 2, sweep, width / 2), reference([0, -width / 2], [0, width / 2])];
  const projectedToe = -height + height * cs + offset[1];
  const elevation = [
    hidden([-width / 2, 0], [-width / 2, -height], [width / 2, -height], [width / 2, 0], [-width / 2, 0]),
    rect(-width / 2, -height, width / 2, projectedToe),
  ];
  return {
    shapes: { elevation, section, plan }[view],
    model: { width, height, thickness, wallThickness, headerHeight, upstream, downstream, angle, maxAngle, reach,
      hinge: { x: 0, z: height }, toe: { x: toe[0], z: height * (1 - cs) } },
  };
}

// The extremal profile of a projected disc with its two faces offset by half its thickness.
function discProfile(radius, projectedRadius, halfOffset, centre, swap) {
  const xy = (x, y) => swap ? [y + centre, x] : [x, y + centre];
  const a = xy(-radius, -halfOffset), b = xy(radius, -halfOffset);
  const c = xy(radius, halfOffset), d = xy(-radius, halfOffset);
  if (projectedRadius === 0) return outline([a, b, c, d]);
  const radii = swap ? [projectedRadius, radius] : [radius, projectedRadius];
  const arc = (p) => ` A${radii.join(" ")} 0 0 ${swap ? 0 : 1} ${p.join(" ")}`;
  return { d: `M${a.join(" ")}${arc(b)} L${c.join(" ")}${arc(d)} Z` };
}

function butterflyGate(data, snapshot, view, dim) {
  if (data.bore !== "circular" || data.axis !== "centred-transverse") {
    throw new RangeError("Physical butterfly views require an explicit circular bore and centred transverse shaft");
  }
  const boreDiameter = dim("boreDiameter"), discDiameter = dim("discDiameter"), thickness = dim("thickness");
  const upstream = dim("upstreamLength"), downstream = dim("downstreamLength");
  const angle = between(snapshot?.angle, 0, 90, "Butterfly angle");
  prescribed(snapshot, 0, 90, angle);
  const radius = discDiameter / 2, half = thickness / 2, z = boreDiameter / 2;
  const sn = angle === 90 ? 1 : Math.sin(radians(angle));
  const cs = angle === 90 ? 0 : Math.cos(radians(angle));
  const sectionDisc = [[-radius, -half], [radius, -half], [radius, half], [-radius, half]]
    .map(([r, t]) => [r * sn + t * cs, -z - r * cs + t * sn]);
  const sweep = Math.hypot(radius, half);
  if (below(z, sweep)) throw new RangeError("The full square-edge disc sweep exceeds the circular bore");
  requireFootprint(-sweep, sweep, upstream, downstream);
  const section = [reference([-upstream, 0], [downstream, 0]),
    reference([-upstream, -boreDiameter], [downstream, -boreDiameter]), outline(sectionDisc)];
  const plan = [...channelPlan(boreDiameter, upstream, downstream), discProfile(radius, radius * sn, half * cs, 0, true),
    hidden([0, -z], [0, z])];
  const elevation = [{ c: [0, -z, z], role: "secondary" }, discProfile(radius, radius * cs, half * sn, -z, false),
    hidden([-z, -z], [z, -z])];
  return {
    shapes: { elevation, section, plan }[view],
    model: { boreDiameter, discDiameter, thickness, angle, sweep, upstream, downstream, axis: { x: 0, z } },
  };
}

function adjustableGate(data, snapshot, view, dim) {
  const width = dim("width"), thickness = dim("thickness"), plateHeight = dim("plateHeight");
  const minCrest = dim("minCrest", units.get(data.unit), true), maxCrest = dim("maxCrest");
  const pocketDepth = dim("pocketDepth"), pocketWidth = dim("pocketWidth"), pocketOffset = dim("pocketOffset");
  const minEmbedment = dim("minEmbedment");
  const upstream = dim("upstreamLength"), downstream = dim("downstreamLength");
  if (!(minCrest < maxCrest) || below(pocketDepth, plateHeight - minCrest) || below(plateHeight - maxCrest, minEmbedment) ||
      below(pocketWidth, pocketOffset + thickness)) {
    throw new RangeError("The full crest travel must fit the supplied pocket and retain the specified embedment");
  }
  const crest = between(length(snapshot?.crest, units.get(snapshot?.unit), "crest above invert", 0, true), minCrest, maxCrest, "Crest");
  const left = -pocketOffset, right = pocketWidth - pocketOffset;
  requireFootprint(left, right, upstream, downstream);
  const bottom = crest - plateHeight;
  const section = [
    reference([-upstream, 0], [left, 0], [left, pocketDepth], [right, pocketDepth], [right, 0], [downstream, 0]),
    rect(0, -crest, thickness, -bottom),
  ];
  const plan = [...channelPlan(width, upstream, downstream), hidden([left, -width / 2], [left, width / 2]),
    hidden([right, -width / 2], [right, width / 2]), rect(0, -width / 2, thickness, width / 2)];
  const elevation = [reference([-width / 2, 0], [width / 2, 0]),
    hidden([-width / 2, 0], [-width / 2, pocketDepth], [width / 2, pocketDepth], [width / 2, 0]),
    { d: line([-width / 2, 0], [-width / 2, -crest], [width / 2, -crest], [width / 2, 0]) },
    hidden([-width / 2, 0], [-width / 2, -bottom], [width / 2, -bottom], [width / 2, 0])];
  return {
    shapes: { elevation, section, plan }[view],
    model: { width, thickness, plateHeight, upstream, downstream, crest, minCrest, maxCrest, bottom,
      embedment: -bottom, pocketDepth, pocketWidth, pocketOffset, minEmbedment },
  };
}

function fixedWeir(kind, data, view, dim) {
  const width = dim("width"), thickness = dim("thickness"), crest = dim("crest");
  const depth = dim("notchDepth"), high = crest + depth;
  const upstream = dim("upstreamLength"), downstream = dim("downstreamLength");
  requireFootprint(0, thickness, upstream, downstream);
  const model = { width, thickness, crest, notchDepth: depth, upstream, downstream };
  let profile, mouthWidth, centreCrest = crest;
  if (kind === "v-notch") {
    const { angle } = data;
    if (!Number.isFinite(angle) || angle <= 0 || angle >= 180) throw new RangeError("Supply a V-notch included angle between 0 and 180 degrees");
    mouthWidth = 2 * depth * Math.tan(radians(angle / 2));
    profile = [[-mouthWidth / 2, -high], [0, -crest], [mouthWidth / 2, -high]];
    Object.assign(model, { angle });
  } else if (kind === "serrated") {
    const pitch = dim("pitch"), { count } = data;
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000) throw new RangeError("Supply 1 to 1000 serration bays");
    mouthWidth = pitch * count;
    profile = Array.from({ length: 2 * count + 1 }, (_, i) => [(i - count) * pitch / 2, i % 2 ? -crest : -high]);
    centreCrest = count % 2 ? crest : high;
    Object.assign(model, { pitch, count });
  } else {
    const notchWidth = dim("notchWidth");
    const sideSlope = kind === "trapezoidal" ? dim("sideSlope", 1) : 0;
    mouthWidth = notchWidth + 2 * depth * sideSlope;
    profile = [[-mouthWidth / 2, -high], [-notchWidth / 2, -crest],
      [notchWidth / 2, -crest], [mouthWidth / 2, -high]];
    Object.assign(model, { notchWidth, sideSlope });
  }
  if (!(mouthWidth > 0 && !below(width, mouthWidth))) throw new RangeError("Notch profile exceeds the supplied plate width");
  const section = [reference([-upstream, 0], [downstream, 0])];
  section.push(rect(0, -centreCrest, thickness, 0));
  const plan = [...channelPlan(width, upstream, downstream), rect(0, -width / 2, thickness, width / 2)];
  const unique = (points) => points.filter(([x, y], i) => !i || x !== points[i - 1][0] || y !== points[i - 1][1]);
  const elevation = kind === "rectangular" && same(mouthWidth, width)
    ? [rect(-width / 2, -crest, width / 2, 0)]
    : [outline(unique([[-width / 2, -high], ...profile, [width / 2, -high], [width / 2, 0], [-width / 2, 0]]))];
  return { shapes: { elevation, section, plan }[view], model: { ...model, mouthWidth, centreCrest } };
}

function levelsFor(levels, model, at, scale, view) {
  if (levels === undefined) return [];
  if (view === "plan" || !levels || !units.has(levels.unit) || !Number.isFinite(levels.invertRL) ||
      ![levels.upstream, levels.downstream, levels.crest].some((value) => value !== undefined) ||
      (view !== "section" && (levels.upstream !== undefined || levels.downstream !== undefined))) {
    throw new RangeError("Level data require a physical datum and a compatible section or elevation view");
  }
  const { datum, unit, invertRL, precision } = levels;
  const crest = levels.crest;
  if (crest !== undefined && (crest !== true || model.crest === undefined)) {
    throw new RangeError("Crest RL requires a fixed or adjustable crest");
  }
  const localScale = scale * units.get(unit);
  const annotate = (kind, elevation, x, span) => levelAnnotation({
    kind, elevation, datum, units: unit, precision, span,
    anchor: { x, yDatum: at.y, datumRL: invertRL, scale: localScale },
  }).shapes;
  const shapes = [];
  // Keep short level callouts outboard when there is too little room for the level marker.
  const minSpan = 10;
  if (levels.upstream !== undefined) {
    const left = model.pocketOffset ?? model.sweep ?? model.wallThickness ?? 0;
    const start = at.x - model.upstream * scale;
    const span = (model.upstream - left) * scale;
    shapes.push(...annotate("Upstream", levels.upstream, span < minSpan ? start - minSpan : start, Math.max(minSpan, span)));
  }
  if (levels.downstream !== undefined) {
    const right = model.pocketWidth !== undefined ? model.pocketWidth - model.pocketOffset :
      model.sweep ?? model.reach ?? model.thickness;
    // The level symbol extends five sheet units to the left of its anchor.
    const markerClearance = 7;
    const span = (model.downstream - right) * scale - markerClearance;
    const start = at.x + (span < minSpan ? model.downstream : right) * scale + markerClearance;
    shapes.push(...annotate("Downstream", levels.downstream, start,
      Math.max(minSpan, span)));
  }
  if (crest) {
    const right = view === "elevation" ? model.width / 2 : model.downstream;
    const name = view === "section" && model.centreCrest > model.crest ? "Notch root" : "Crest";
    shapes.push(...annotate(name, invertRL + model.crest / units.get(unit), at.x + right * scale + 12, 65));
  }
  return shapes;
}

export function physicalGate(kind, data, snapshot, at, { view, stateBasis, scale, levels }, installation) {
  if (!["design", "operating"].includes(stateBasis) || !units.has(data?.unit) ||
      !Number.isFinite(scale) || scale <= 0 || !Number.isFinite(scale * at.s) || scale * at.s === 0) {
    throw new RangeError("Physical views require a design or operating basis, m or mm dimensions, and a positive sheet scale per metre");
  }
  if (view !== "plan" && at.q % 4 !== 0) throw new RangeError("Sections and elevations keep gravity upright; rotate the plan instead");
  const dim = (name, factor = units.get(data.unit), inclusive = false) => length(data[name], factor, name, 0, inclusive);
  let result;
  if (["slide", "stop", "bulkhead"].includes(kind)) result = guidedGate(kind, data, snapshot, view, dim);
  else if (kind === "flap") result = flapGate(snapshot, view, dim, installation);
  else if (kind === "butterfly") result = butterflyGate(data, snapshot, view, dim);
  else if (kind === "adjustable") result = adjustableGate(data, snapshot, view, dim);
  else result = fixedWeir(kind, data, view, dim);

  const sheetScale = scale * at.s;
  const geometry = place(result.shapes, { ...at, s: sheetScale });
  // All drawing extents use projected geometry, excluding label ink.
  const coordinates = geometry.flatMap((shape) => {
    if (shape.c) {
      const [x, y, r] = shape.c;
      return [[x - r, y - r], [x + r, y + r]];
    }
    return [...shape.d.matchAll(/[ML](-?[\d.e+-]+) (-?[\d.e+-]+)/g)].map(([, x, y]) => [+x, +y]);
  });
  const measures = Object.values(result.model).flat();
  if (measures.some((v) => typeof v === "number" && !Number.isFinite(v)) ||
      geometry.some((shape) => /Infinity|NaN/.test(shape.d) || shape.c?.some((value) => !Number.isFinite(value)))) {
    throw new RangeError("Physical model or projection is outside the supported numeric range");
  }
  const bounds = {
    left: Math.min(...coordinates.map(([x]) => x)) - 1, right: Math.max(...coordinates.map(([x]) => x)) + 1,
    top: Math.min(...coordinates.map(([, y]) => y)) - 1, bottom: Math.max(...coordinates.map(([, y]) => y)) + 1,
  };
  if (kind === "flap" && view === "section") {
    geometry.push({ c: [at.x, at.y - result.model.hinge.z * sheetScale, 1.6], role: "dot", fill: "solid" });
  }
  return { shapes: [...geometry, ...levelsFor(levels, result.model, at, sheetScale, view)], bounds,
    physical: { ...result.model, unit: "m", ...(result.model.clearOpeningArea !== undefined && { areaUnit: "m²" }) } };
}
