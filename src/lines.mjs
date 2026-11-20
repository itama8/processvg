// Family 01 components with drawing-space geometry and metadata.
import { placePoint } from "./library.mjs";

const path = (...points) => "M" + points.map((point) => point.join(" ")).join(" L");
const finitePoint = (point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);
const twoPorts = { portNames: ["in", "out"], connectivity: [[0, 1]] };

/** Route a Family 01 line through drawing-space vertices ordered downstream. */
export function routeLine(id, points) {
  if (!["line-process", "line-flow", "line-electric", "line-data", "line-pneumatic"].includes(id)) {
    throw new RangeError(`Unsupported route: ${id}`);
  }
  if (!Array.isArray(points) || !points.every(finitePoint)) throw new TypeError("Expected finite route vertices");
  const vertices = points.filter(([x, y], i) => i === 0 || x !== points[i - 1][0] || y !== points[i - 1][1]);
  if (vertices.length < 2) throw new RangeError("A route needs two distinct consecutive vertices");

  const role = { "line-electric": "signal", "line-data": "secondary", "line-pneumatic": "secondary" }[id] ?? "primary";
  const shapes = [];
  if (id !== "line-data") shapes.push({ d: path(...vertices), role });
  if (id !== "line-process" && id !== "line-electric") {
    let travelled = 0;
    const segments = vertices.slice(1).map(([x, y], i) => {
      const [sx, sy] = vertices[i];
      const length = Math.hypot(x - sx, y - sy);
      if (!Number.isFinite(length) || !Number.isFinite(travelled + length)) throw new RangeError("Route length is too large");
      const ux = (x - sx) / length, uy = (y - sy) / length;
      const at = (along, across = 0) => [sx + ux * along - uy * across, sy + uy * along + ux * across];
      const segment = { at, length, start: travelled, marks: [] };
      travelled += length;
      return segment;
    });
    const inset = id === "line-flow" ? 10 : 8;
    const pitch = id === "line-flow" ? 64 : 16;
    for (const segment of segments) {
      const { start, length, marks } = segment;
      const first = Math.ceil((start + inset - pitch / 2) / pitch);
      for (let mark = first * pitch + pitch / 2 - start; mark <= length - inset; mark += pitch) marks.push(mark);
    }
    if (!segments.some(({ marks }) => marks.length)) {
      const longest = segments.reduce((a, b) => b.length > a.length ? b : a);
      if (longest.length >= inset * 2) longest.marks.push(longest.length / 2);
    }
    const dataRuns = [[vertices[0]]];
    for (const { at, length, marks } of segments) {
      for (const mark of marks) {
        if (id === "line-flow") shapes.push({ d: path(at(mark - 6, -4), at(mark), at(mark - 6, 4)), role });
        if (id === "line-pneumatic") {
          shapes.push({ d: path(at(mark - 4, 4), at(mark, -4)) + " " + path(at(mark, 4), at(mark + 4, -4)), role });
        }
        if (id === "line-data") {
          dataRuns.at(-1).push(at(mark - 2));
          dataRuns.push([at(mark + 2)]);
          shapes.push({ c: [...at(mark), 2], role });
        }
      }
      if (id === "line-data") dataRuns.at(-1).push(at(length));
    }
    if (id === "line-data") shapes.unshift({ d: dataRuns.map((run) => path(...run)).join(" "), role, cap: "butt" });
  }
  return { shapes, ports: [vertices[0], vertices.at(-1)], ...twoPorts };
}

const FONT = Object.freeze({ family: "sans-serif", size: 10, weight: 400 });

/**
 * measureText(text, font) supplies the centered ink box as nonnegative
 * { left, right, ascent, descent }, in drawing units.
 */
export function offSheet({
  direction, streamId, sheetRef = "", service = "", detail = "compact",
  orientation = 0, x = 0, y = 0, measureText,
}) {
  if (!["in", "out"].includes(direction) || !["compact", "full"].includes(detail) ||
      ![0, 90, 180, 270].includes(orientation) || ![x, y].every(Number.isFinite) ||
      ![streamId, sheetRef, service].every((text) => typeof text === "string" && !/[\t\r\n]/.test(text)) ||
      !streamId.trim() || (detail === "full" && !sheetRef.trim())) {
    throw new RangeError("Invalid off-sheet direction, labels, detail, orientation or position");
  }
  if (typeof measureText !== "function") throw new TypeError("Off-sheet connectors require a text measurer");
  const measure = (text) => {
    const { left, right, ascent, descent } = measureText(text, FONT);
    if (![left, right, ascent, descent].every((value) => Number.isFinite(value) && value >= 0)) {
      throw new RangeError("Invalid off-sheet text bounds");
    }
    return { width: 2 * Math.max(left, right), ascent, descent };
  };
  const labels = [streamId];
  if (detail === "full") labels.push(`${direction === "in" ? "FROM" : "TO"} ${sheetRef}`);
  const metrics = labels.map(measure);
  const textWidth = Math.max(...metrics.map(({ width }) => width));
  const lineGap = 4;
  const blockHeight = metrics.reduce((sum, { ascent, descent }) => sum + ascent + descent, 0)
    + (metrics.length - 1) * lineGap;
  const q = orientation / 90;
  const vertical = q % 2 === 1;
  const nose = 12;
  const width = Math.max(70, nose + (vertical ? blockHeight + 8 : textWidth + 16));
  const height = Math.max(26, vertical ? textWidth + 16 : blockHeight + 8);
  const left = -width / 2, right = width / 2, top = -height / 2, bottom = height / 2;
  const at = { x, y, q };
  const outline = [[left, top], [right - nose, top], [right, 0], [right - nose, bottom], [left, bottom]];
  const corners = outline.map((point) => placePoint(point, at));
  const shapes = [{ d: path(...corners) + " Z" }];
  const bounds = {
    left: Math.min(...corners.map(([u]) => u)), right: Math.max(...corners.map(([u]) => u)),
    top: Math.min(...corners.map(([, v]) => v)), bottom: Math.max(...corners.map(([, v]) => v)),
  };
  const [textX, textY] = placePoint([-nose / 2, 0], at);
  let baseline = textY - blockHeight / 2;
  labels.forEach((label, index) => {
    const { ascent, descent } = metrics[index];
    shapes.push({ t: [textX, baseline + ascent, label], fontFamily: FONT.family });
    baseline += ascent + descent + lineGap;
  });
  if (detail === "full" && service) {
    const { width: serviceWidth, ascent, descent } = measure(service);
    const portPointsDown = (q === 1 && direction === "in") || (q === 3 && direction === "out");
    const serviceBaseline = portPointsDown ? bounds.top - 6 - descent : bounds.bottom + 6 + ascent;
    shapes.push({ t: [textX, serviceBaseline, service], fontFamily: FONT.family, value: true });
    bounds.left = Math.min(bounds.left, textX - serviceWidth / 2);
    bounds.right = Math.max(bounds.right, textX + serviceWidth / 2);
    bounds.top = Math.min(bounds.top, serviceBaseline - ascent);
    bounds.bottom = Math.max(bounds.bottom, serviceBaseline + descent);
  }
  return {
    shapes, ports: [placePoint([direction === "in" ? right : left, 0], at)],
    portNames: [direction === "in" ? "out" : "in"], connectivity: [], bounds,
    metadata: { direction, streamId, sheetRef, service, detail, orientation, verification: "Proposed" },
  };
}

const LEVEL_STYLES = { solid: undefined, dashed: "6 4", dotted: "1 3" };

/** Anchor x, yDatum are drawing coordinates. Elevation and datumRL use units. */
export function levelAnnotation({
  kind, elevation, datum, units = "m", precision = 3, lineStyle = "solid",
  anchor: { x, yDatum, datumRL, scale }, span = 80, levelBounds,
}) {
  const y = yDatum - (elevation - datumRL) * scale;
  const lineEnd = x + span;
  if (![elevation, x, yDatum, datumRL, scale, span, y, lineEnd].every(Number.isFinite) ||
      scale <= 0 || span < 10 || !Number.isInteger(precision) || precision < 0 || precision > 20 ||
      !Object.hasOwn(LEVEL_STYLES, lineStyle) ||
      ![kind, datum, units].every((label) => typeof label === "string" && label.trim())) {
    throw new RangeError("Invalid level annotation or drawing transform");
  }
  if (levelBounds && (!finitePoint(levelBounds) || elevation < levelBounds[0] || elevation > levelBounds[1])) {
    throw new RangeError("Elevation is outside the supplied basin bounds");
  }
  const magnitude = Math.abs(elevation).toFixed(precision);
  const signed = `${elevation < 0 && Number(magnitude) !== 0 ? "-" : "+"}${magnitude}`;
  return {
    y, shapes: [
      { d: path([x, y], [lineEnd, y]), role: "secondary", dash: LEVEL_STYLES[lineStyle] },
      { d: path([x, y], [x - 5, y - 7], [x + 5, y - 7]) + " Z", role: "secondary" },
      { t: [x + 10, y - 6, `${kind} RL ${signed} ${units} (${datum})`], align: "start", value: true },
    ],
    ports: [], portNames: [], connectivity: [],
    metadata: { kind, elevation, datum, units, precision, lineStyle, span, verification: "Proposed" },
  };
}
