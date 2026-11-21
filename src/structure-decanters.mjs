// Signed arm angle is positive below the horizontal. The branch sets the
// horizontal side of the pivot, independently of the arm angle.
export const DECANTER_IDS = Object.freeze(["decanter-floating", "decanter-swing-arm"]);

export function segmentIntersectsBox(start, end, min, max) {
  let enter = 0;
  let exit = 1;
  for (const [axis, value] of start.entries()) {
    const delta = end[axis] - value;
    if (delta === 0) {
      if (value < min[axis] || value > max[axis]) return false;
      continue;
    }
    const a = (min[axis] - value) / delta;
    const b = (max[axis] - value) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return false;
  }
  return true;
}

export function solveStructureDecanter(model, levelRL = model.water.currentRL) {
  if (!model.decanter) throw new RangeError("Decanter presets apply to SBR basins");
  if (!Number.isFinite(levelRL)) throw new RangeError("Decanter water RL must be finite");
  const { id, immersionM, xM, yM, pivotM, armLengthM, branch, clearanceM,
    angleStopsDeg, obstacles } = model.decanter;
  const { lengthM, widthM, floorRL, wallTopRL } = model.geometry;
  const { bwlRL, twlRL } = model.water;
  const diagnostics = [];
  const flag = (code, severity = "error", detail) => diagnostics.push({ code, severity, detail });
  const intakeRL = levelRL - immersionM;
  let intakeM = [xM, yM, intakeRL];
  let angleDeg = null;

  if (levelRL < bwlRL - 1e-8) flag("BELOW_BWL");
  if (levelRL > twlRL + 1e-8) flag("ABOVE_TWL");
  if (Math.abs(levelRL - bwlRL) <= 1e-8) flag("AT_LOW_WATER_LIMIT", "info");
  if (Math.abs(levelRL - twlRL) <= 1e-8) flag("AT_HIGH_WATER_LIMIT", "info");
  if (immersionM <= 0) flag("INTAKE_NOT_SUBMERGED");

  if (id === "decanter-swing-arm") {
    const drop = pivotM[2] - intakeRL;
    if (Math.abs(drop) > armLengthM) {
      flag("ARM_TRAVEL_UNREACHABLE");
      intakeM = null;
    } else {
      const run = Math.sqrt(Math.max(0, (armLengthM - drop) * (armLengthM + drop)));
      intakeM = [pivotM[0] + (branch === "toward-inlet" ? -run : run), pivotM[1], intakeRL];
      angleDeg = Math.atan2(drop, run) * 180 / Math.PI;
      if (angleStopsDeg) {
        const [min, max] = angleStopsDeg;
        if (angleDeg < min - 1e-8) flag("HIGH_WATER_ANGLE_STOP_EXCEEDED");
        if (angleDeg > max + 1e-8) flag("LOW_WATER_ANGLE_STOP_EXCEEDED");
        if (Math.abs(angleDeg - min) <= 1e-8) flag("AT_HIGH_WATER_ANGLE_STOP", "info");
        if (Math.abs(angleDeg - max) <= 1e-8) flag("AT_LOW_WATER_ANGLE_STOP", "info");
      }
    }
  }

  const bounds = [lengthM, widthM, wallTopRL];
  const lower = [0, 0, floorRL];
  const checkPoint = (point, code) => {
    if (point.some((v, i) => v < lower[i] || v > bounds[i])) flag(code);
    else if (point.some((v, i) => v - lower[i] < clearanceM || bounds[i] - v < clearanceM)) {
      flag("BOUNDARY_CLEARANCE", "error", code);
    }
  };
  if (pivotM) checkPoint(pivotM, "PIVOT_OUT_OF_BOUNDS");
  if (intakeM) {
    checkPoint(intakeM, "INTAKE_OUT_OF_BOUNDS");
    const start = pivotM ?? [intakeM[0], intakeM[1], levelRL];
    for (const { id: obstacle, min, max } of obstacles) {
      const hits = (padding) => segmentIntersectsBox(start, intakeM,
        min.map((value) => value - padding), max.map((value) => value + padding));
      if (hits(0)) flag("COLLISION", "error", obstacle);
      else if (clearanceM > 0 && hits(clearanceM)) flag("OBSTACLE_CLEARANCE", "error", obstacle);
    }
  }
  return { id, assetId: model.assetId, levelRL, intakeM, pivotM, branch, angleDeg, immersionM,
    valid: diagnostics.every(({ severity }) => severity !== "error"), diagnostics };
}
