// Family 09 review primitives, in local metres and RL. These are explicitly
// authored layout conventions for dimensions omitted by the handoff.
const tolerance = 1e-8;
const mix = (a, b, t) => a + (b - a) * t;
const fractions = (count, start = 0, end = 1) =>
  Array.from({ length: count }, (_, i) => mix(start, end, count === 1 ? 0.5 : i / (count - 1)));

export function structureGeometry(model) {
  const { kind, geometry: { lengthM: L, widthM: W, depthM: D, floorRL: F, wallTopRL: T, shape },
    water, components, parameters: p, featureIds } = model;
  const features = new Set(featureIds);
  const centre = [L / 2, W / 2];
  const round = ["circular", "pressure"].includes(shape);
  const r = L / 2;
  const nominalWL = water.wlRL ?? water.twlRL;
  const part = (symbol) => components.find(({ sourceSymbolId }) => sourceSymbolId === symbol);
  const primitives = [];
  const rect = (x0, y0, x1, y1) => [x0 * L, y0 * W, x1 * L, y1 * W];
  const point = (x, y, z) => [x * L, y * W, F + z * D];
  const box = (id, min, max, exterior = false, partId) => {
    primitives.push({ id, type: "box", min, max, exterior, partId });
  };
  const block = (id, x0, y0, z0, x1, y1, z1, exterior, partId) =>
    box(id, point(x0, y0, z0), point(x1, y1, z1), exterior, partId);
  const cylinder = (id, x, y, z0, z1, radius, options = {}) =>
    primitives.push({ id, type: "cylinder", x, y, z0, z1, radius, ...options });
  const line = (id, points, options = {}) => primitives.push({ id, type: "line", points, ...options });
  const slope = (id, points, options = {}) => primitives.push({ id, type: "panel", points, ...options });
  const thin = Math.min(L, W) * 0.012;
  let pit = null;
  if (features.has("depression")) {
    pit = { bounds: rect(0.43, 0.35, 0.79, 0.78), rim: rect(0.25, 0.14, 0.96, 0.96), rise: p.sumpDropM };
  } else if (!round && (features.has("hopper") || features.has("grit-hopper"))) {
    const local = kind === "primary-clarifier" || kind === "square-detritor";
    pit = { bounds: rect(0.46, 0.43, 0.54, 0.57),
      rim: local ? rect(0.31, 0.22, 0.70, 0.78) : rect(0, 0, 1, 1), rise: D * (local ? 0.22 : 0.31) };
  }
  const coneRise = shape === "circular" ? D * (features.has("steep-cone") ? 0.36 : 0.23) : 0;
  const coneFlatR = r * 0.08;
  const pitFraction = (x, y) => {
    const [a, b, c, d] = pit.bounds;
    const [e, f, g, h] = pit.rim;
    return Math.min(1, Math.max(0, (a - x) / (a - e), (x - c) / (g - c), (b - y) / (b - f), (y - d) / (h - d)));
  };
  const floorAt = (x, y) => F + (pit ? pit.rise * pitFraction(x, y) : coneRise *
    Math.max(0, (Math.hypot(x - centre[0], y - centre[1]) - coneFlatR) / (r - coneFlatR)));

  if (features.has("overflow")) block("overflow-crest", 0.91, 0.08, 0.76, 0.95, 0.92, 0.82);
  if (features.has("screen")) {
    const screen = part("screen-bar");
    const [x, y, z] = screen.mountM;
    const span = Math.min(y, W - y) * 0.89;
    const height = Math.min(z - F, T - z) * 0.92;
    const lean = Math.min(x, L - x, D) * 0.17;
    if (Math.min(span, height, lean) <= tolerance) throw new RangeError("Screen envelope cannot fit its mount");
    const panel = [[x + lean, y - span, z - height], [x + lean, y + span, z - height],
      [x - lean, y + span, z + height], [x - lean, y - span, z + height]];
    slope("inclined-screen", panel, { partId: screen.id, blocksWater: false });
    const barLanes = fractions(p.screenBars, -span, span);
    for (const dy of barLanes) line("screen-bar-texture", [
      [x + lean, y + dy, z - height], [x - lean, y + dy, z + height],
    ], { secondary: true });
    const gates = components.filter(({ sourceSymbolId }) => sourceSymbolId === "gate-slide");
    const [inlet,outlet] = gates.map(({ mountM }) => mountM[0]);
    if (inlet + thin >= x - lean || outlet - thin <= x + lean) throw new RangeError("Gate leaf conflicts with screen envelope");
    for (const { id, mountM: [gx,gy,gz] } of gates) {
      const halfWidth = Math.min(gy,W-gy) * 0.89;
      const halfHeight = Math.min(gz-F,T-gz);
      box("gate-leaf",[gx-thin,gy-halfWidth,gz-halfHeight],[gx+thin,gy+halfWidth,gz+halfHeight],false,id);
    }
  }

  for (const { id, mountM: [x, y, z] } of components.filter(({ sourceSymbolId }) => sourceSymbolId === "pump-submersible")) {
    const radius = Math.min(L * 0.035, W * 0.085, D * 0.12);
    if (x - radius < 0 || x + radius > L || y - radius < 0 || y + radius > W ||
        z < Math.max(...[-1, 1].flatMap((a) => [-1, 1].map((b) => floorAt(x + a * radius, y + b * radius)))) - tolerance ||
        z + D * 0.12 >= T) throw new RangeError(`Pump envelope conflicts with civil geometry (${id})`);
    for (const pump of primitives.filter(({ id: feature }) => feature === "submersible-pump")) {
      if (Math.hypot(pump.x - x, pump.y - y) < pump.radius + radius && z < pump.z1 && z + D * 0.12 > pump.z0) {
        throw new RangeError(`Pump envelopes overlap (${pump.partId} / ${id})`);
      }
    }
    cylinder("submersible-pump", x, y, z, z + D * 0.12, radius, { partId: id });
    cylinder("pump-riser", x, y, z + D * 0.12, T, radius * 0.26, { partId: id });
  }
  if (features.has("mixer")) {
    const mixer = part("mixer");
    const [x, y, z] = mixer.mountM;
    const radius = Math.min(L, W) * 0.11;
    if (x - radius < 0 || x + radius > L || y - radius < 0 || y + radius > W || z + D * 0.12 >= T) {
      throw new RangeError("Mixer envelope conflicts with civil geometry");
    }
    cylinder("mixer-drive", x, y, T - D * 0.06, T, radius * 0.55, { partId: mixer.id });
    cylinder("mixer-shaft", x, y, z, T - D * 0.06, radius * 0.12, { partId: mixer.id });
    cylinder("mixer-impeller", x, y, z - D * 0.04, z, radius, { partId: mixer.id });
    const pumpsAndRisers = primitives.filter(({ id }) => ["submersible-pump","pump-riser"].includes(id));
    for (const envelope of primitives.filter(({ id }) => id.startsWith("mixer-"))) {
      for (const pump of pumpsAndRisers) {
        if (Math.hypot(pump.x-x,pump.y-y) < pump.radius+envelope.radius && pump.z0 < envelope.z1 && pump.z1 > envelope.z0) {
          throw new RangeError(`Pump and mixer envelopes overlap (${pump.partId} / ${mixer.id})`);
        }
      }
    }
  }
  const weir = part("weir");
  if (weir && !round) {
    const [x, y, z] = weir.mountM;
    const span = Math.min(y, W - y) * 0.86;
    box("weir-crest", [x - thin, y - span, z - D * 0.055], [x + thin, y + span, z], false, weir.id);
  }

  if (features.has("diffusers")) {
    const grid = part("diffuser-grid");
    const [x, y, z] = grid.mountM;
    const dx = Math.min(x, L - x) * 0.8;
    const dy = Math.min(y, W - y) * 0.69;
    const radius = Math.min(L / (p.diffusersPerRow * 5), W / (p.diffuserRows * 5), D * 0.035,
      p.diffusersPerRow > 1 ? dx / p.diffusersPerRow : Infinity, p.diffuserRows > 1 ? dy / p.diffuserRows : Infinity);
    if (dx <= 0 || dy <= 0 || z + radius > T) throw new RangeError("Diffuser envelope cannot fit its mount");
    for (const lane of fractions(p.diffuserRows, y - dy, y + dy)) {
      box("diffuser-header", [x - dx, lane - radius * 0.19, z], [x + dx, lane + radius * 0.19, z + radius * 0.15],
        false, grid.id);
      for (const col of fractions(p.diffusersPerRow, x - dx, x + dx)) {
        cylinder("diffuser", col, lane, z, z + radius, radius, { partId: grid.id });
      }
    }
  }
  if (features.has("carriers")) {
    const z1 = nominalWL - D * 0.12;
    const z0 = F + D * 0.24;
    if (z1 > z0) block("carrier-volume", 0.12, 0.13, (z0-F)/D, 0.79, 0.87, (z1-F)/D);
    block("carrier-retention-screen", 0.86, 0.06, 0.17, 0.885, 0.94, 0.91);
  }
  if (features.has("tube-pack")) {
    const lowX = 0.16 * L;
    const highX = 0.84 * L;
    const height = Math.min(D * 0.24, (highX - lowX) * 0.45 * Math.tan(p.tubeInclinationDeg * Math.PI / 180));
    const run = height / Math.tan(p.tubeInclinationDeg * Math.PI / 180);
    const lowZ = F + D * 0.43;
    box("tube-pack-envelope", [lowX, W * 0.17, lowZ], [highX, W * 0.83, lowZ + height]);
    for (const [i,x] of fractions(p.tubeRows, lowX, highX - run).entries()) {
      slope("inclined-tubes", [[x, W * 0.17, lowZ], [x, W * 0.83, lowZ],
        [x + run, W * 0.83, lowZ + height], [x + run, W * 0.17, lowZ + height]], { secondary: i > 0 });
    }
  }
  if (shape === "circular") {
    const [x, y] = centre;
    const feedR = r * (p.feedwellDiameterFraction ?? 0.32);
    if (features.has("feedwell")) {
      cylinder("feedwell", x, y, F + D * 0.48, T - D * 0.04, feedR, { hollow: true });
    }
    cylinder("central-drive", x, y, T - D * 0.12, T, r * 0.045);
    cylinder("scraper-shaft", x, y, F + D * 0.1, T - D * 0.12, thin * 1.6);
    cylinder("peripheral-weir", x, y, nominalWL - D * 0.05, nominalWL, weir ? Math.hypot(weir.mountM[0]-x, weir.mountM[1]-y) : r * 0.88,
      { hollow: true, partId: weir?.id });
    for (let arm = 0; arm < (p.scraperArms ?? 2); arm++) {
      const angle = arm * 2 * Math.PI / (p.scraperArms ?? 2);
      const tip = [x + r * 0.82 * Math.cos(angle), y + r * 0.82 * Math.sin(angle)];
      const z = floorAt(...tip) + D * 0.055;
      // Snap the nominal orthogonal arms onto their plane.
      if (Math.abs(tip[0] - x) < tolerance) tip[0] = x;
      if (Math.abs(tip[1] - y) < tolerance) tip[1] = y;
      line("scraper-arm", [[x, y, F + D * 0.055], [...tip, z]]);
      line("access-bridge", [[x, y, T], [...tip, T]], { exterior: true });
    }
    if (features.has("picket")) {
      for (const xM of fractions(p.picketCount, L * 0.16, L * 0.84)) {
        const z = floorAt(xM, y) + D * 0.075;
        line("thickener-picket", [[xM, y, z], [xM, y, z + D * 0.16]]);
      }
    }
  } else if (features.has("scraper")) {
    block("detritor-scraper", 0.12, 0.48, 0.3, 0.88, 0.52, 0.39);
    block("scraper-drive", 0.46, 0.46, 0.39, 0.54, 0.54, 1);
  }
  if (features.has("chain-flight")) {
    const path = [point(0.11, 0.5, 0.35), point(0.86, 0.5, 0.35),
      point(0.86, 0.5, 0.64), point(0.11, 0.5, 0.64), point(0.11, 0.5, 0.35)];
    line("chain-flight", path);
    for (const x of fractions(p.flightMarkers, 0.13, 0.83)) block("scraper-flight", x, 0.14, 0.29, x + 0.01, 0.86, 0.36);
    block("inlet-baffle", 0.09, 0.04, 0.52, 0.108, 0.96, 0.95);
  }
  if (features.has("serpentine")) {
    const g = p.baffleEndOpeningFraction;
    const xs = fractions(p.baffleCount + 2).slice(1, -1);
    for (const [i, x] of xs.entries()) {
      const [y0, y1] = i % 2 === 0 ? [g, 1] : [0, 1 - g];
      block("contact-baffle", x - thin / L, y0, 0, x + thin / L, y1, 1);
    }
    // Route through alternate end gaps using the same baffle parameters.
    const route = [[0, W / 2, F + D * 0.5]];
    for (const [i, x] of xs.entries()) {
      const y = i % 2 ? 1 - g / 2 : g / 2;
      const midX = (x + (xs[i-1] ?? 0)) / 2;
      route.push(point(midX, (route.at(-1)[1] / W), 0.5), point(midX, y, 0.5), point(x, y, 0.5));
    }
    const lastX = (xs.at(-1) + 1) / 2;
    route.push(point(lastX, route.at(-1)[1]/W, 0.5), point(lastX, 0.5, 0.5), point(1, 0.5, 0.5));
    line("serpentine-route", route, { planOnly: true, dash: "4 3" });
  }
  if (shape === "pressure") {
    cylinder(features.has("sand-bed") ? "sand-bed" : "carbon-bed", ...centre, F + 0.25 * D, F + 0.51 * D, r * 0.9);
  }
  if (features.has("discs")) {
    const steps = fractions(p.discCount, 0.18, 0.82);
    const radius = Math.min(W * 0.31, D * 0.34);
    const halfThickness = Math.min(L * 0.012, L * 0.18 / p.discCount);
    for (const cx of steps) primitives.push({ id: "filter-disc", type: "drum", x: W/2, z: F + D * 0.49,
      y0: cx * L - halfThickness, y1: cx * L + halfThickness, radius, axialAxis: 0 });
    line("disc-drive-shaft", [point(0.10, 0.5, 0.49), point(0.9, 0.5, 0.49)]);
  }
  if (shape === "skid") {
    for (const x of fractions(p.membraneModuleCount, 0.12, 0.88)) {
      const radius = Math.min(L * 0.30 / p.membraneModuleCount, W * 0.13);
      cylinder("membrane-module", L * x, W / 2, F + D * 0.12, F + D * 0.91, radius, { exterior: true });
    }
    for (const [y, z] of [[0.28, 0.83], [0.38, 0.44], [0.68, 0.18]]) {
      block("skid-header", 0.06, y - 0.028, z - 0.025, 0.94, y + 0.028, z + 0.025, true);
    }
  }
  if (shape === "machine" || shape === "skid") block("base-frame", 0, 0, 0, 1, 1, 0.12, true);
  if (features.has("centrifuge")) {
    block("centrifuge-case", 0.12, 0.18, 0.24, 0.89, 0.82, 1, true);
    const axis = [point(0.18, 0.5, 0.61), point(0.83, 0.5, 0.61)];
    line("centrifuge-axis", axis);
    slope("centrifuge-bowl", [point(0.2, 0.5, 0.82), point(0.72, 0.5, 0.82),
      point(0.82, 0.5, 0.64), point(0.72, 0.5, 0.42), point(0.2, 0.5, 0.42)]);
  }
  if (features.has("plate-stack")) {
    for (const x of fractions(p.plateCount, 0.18, 0.82)) {
      const dx = Math.min(0.021, 0.23 / p.plateCount);
      block("press-plate", x - dx, 0.15, 0.2, x + dx, 0.85, 0.91, true);
    }
    block("press-rail", 0.13, 0.12, 0.76, 0.88, 0.17, 0.82, true);
  }
  if (features.has("belt-rollers")) {
    const rollers = fractions(p.rollerCount, 0.15, 0.85).map((x, i) =>
      ({ id: "belt-roller", type: "drum", x: x * L, z: F + (i % 2 ? 0.47 : 0.71) * D,
        y0: W * 0.16, y1: W * 0.84, radius: Math.min(D * 0.1, L * 0.25 / p.rollerCount), exterior: true }));
    primitives.push(...rollers);
    for (const dz of [-1, 1]) line("belt-run", rollers.map(({ x, z, radius, y0 }) =>
      [x, y0, z + radius * dz]), { exterior: true });
  }
  if (features.has("cake")) {
    const outlet = model.ports.find(({ id }) => id === "cake-out");
    const [x,y] = outlet.anchorM;
    const dx = Math.min(L * 0.09,x,L-x);
    const dy = Math.min(W * 0.12,y,W-y);
    if (dx <= tolerance || dy <= tolerance) throw new RangeError("Cake chute does not fit its port anchor");
    box("cake-chute",[x-dx,y-dy,F],[x+dx,y+dy,F + D * 0.29],true);
  }

  for (const primitive of primitives) {
    const { id, type, min, max, x, y, radius, z, y0, y1, z0, z1, points } = primitive;
    if (type === "box" && min.some((v, i) => !(v < max[i]) || v < [0,0,F][i]-tolerance ||
        max[i] > [L,W,T][i]+tolerance)) throw new RangeError(`Invalid or out-of-bounds structure box ${id}`);
    if (type === "cylinder" && !(radius > 0 && z1 > z0 && x-radius >= -tolerance && x+radius <= L+tolerance &&
        y-radius >= -tolerance && y+radius <= W+tolerance && z0 >= F-tolerance && z1 <= T+tolerance)) {
      throw new RangeError(`Invalid structure cylinder ${id}`);
    }
    if (type === "drum" && !(radius > 0 && y1 > y0 && z-radius >= F && z+radius <= T)) {
      throw new RangeError(`Invalid structure drum ${id}`);
    }
    if (points?.some(([a,b,c]) => a < -tolerance || a > L+tolerance || b < -tolerance || b > W+tolerance ||
        c < F-tolerance || c > T+tolerance)) throw new RangeError(`Invalid structure feature coordinates ${id}`);
  }
  return { primitives, floorAt, pit, coneRise, coneFlatR, centre, round, capM: shape === "pressure" ? Math.min(D * 0.18, r * 0.55) : 0 };
}

// Piecewise linear cross profile of a rectangular depression. The circle
// profile retains analytic radial RL evaluation for water and floor queries.
export function floorProfile(civil, cut, [a, b]) {
  const { axis, perpendicular } = cut;
  const { pit, coneFlatR, coneRise, centre, floorAt } = civil;
  const xy = (u) => axis === 0 ? [u, perpendicular] : [perpendicular, u];
  const at = (u) => floorAt(...xy(u));
  const values = [a, b];
  if (pit) {
    const [l, t, r, d] = pit.bounds;
    const [ll, tt, rr, dd] = pit.rim;
    const fraction = axis === 0
      ? Math.min(1, Math.max(0, (t-perpendicular)/(t-tt), (perpendicular-d)/(dd-d)))
      : Math.min(1, Math.max(0, (l-perpendicular)/(l-ll), (perpendicular-r)/(rr-r)));
    const [min, max, rimMin, rimMax] = axis === 0 ? [l,r,ll,rr] : [t,d,tt,dd];
    values.push(rimMin, mix(min, rimMin, fraction), mix(max, rimMax, fraction), rimMax);
  }
  if (coneRise) {
    const cross = perpendicular - centre[1-axis];
    const flat = Math.sqrt(Math.max(0, coneFlatR**2 - cross**2));
    values.push(centre[axis] - flat, centre[axis] + flat);
    if (Math.abs(cross) > tolerance) {
      // Tessellation for display. The governing floor remains analytic.
      values.push(...fractions(49, a, b));
    }
  }
  return [...new Set(values.filter((u) => u >= a && u <= b))].sort((x,y) => x-y).map((u) => [u, at(u)]);
}
