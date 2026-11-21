// Geometry transform: place a symbol's shapes at (x, y), scale s, quarter turns q (clockwise).
export function placePoint([px, py], { x = 0, y = 0, s = 1, q = 0 } = {}) {
  let [u, v] = [px * s, py * s];
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) [u, v] = [-v, u];
  return [x + u, y + v];
}

export const round = (value) => Math.round(value * 100) / 100;

// Normalize the explicit absolute commands used by the equipment handoff before placement.
// Archived paths bypass this step so their serialized geometry stays byte-for-byte stable.
export function normalizeEquipmentPath(d) {
  const arity = { M: 2, L: 2, H: 1, V: 1, Q: 4, T: 2, C: 6, A: 7, Z: 0 };
  const tokens = d.match(/[A-Za-z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? [];
  if (tokens[0] !== "M" || d.replace(/[A-Za-z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[\s,]/g, "")) {
    throw new SyntaxError("Invalid equipment path");
  }
  let point = [0, 0], start = point, previousControl;
  const segments = [];
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    const count = arity[command];
    const args = tokens.slice(i, i + count).map(Number);
    if (count === undefined || args.length !== count || !args.every(Number.isFinite) ||
        (command === "A" && (args[2] !== 0 || !args.slice(3, 5).every((flag) => flag === 0 || flag === 1)))) {
      throw new SyntaxError(`Unsupported equipment path segment: ${command}`);
    }
    i += count;
    let control;
    switch (command) {
      case "M": start = args; break;
      case "H": args.push(point[1]); break;
      case "V": args.unshift(point[0]); break;
      case "T": {
        // Reflect the last quadratic control across the current endpoint.
        control = previousControl ? point.map((value, axis) => 2 * value - previousControl[axis]) : point;
        args.unshift(...control);
        break;
      }
      case "Q": control = args.slice(0, 2); break;
    }
    point = command === "Z" ? start : args.slice(-2);
    previousControl = control;
    const normalized = { H: "L", V: "L", T: "Q" }[command] ?? command;
    segments.push(normalized + args.join(" "));
  }
  return segments.join(" ");
}

export function place(shapes, { x = 0, y = 0, s = 1, q = 0 } = {}) {
  const turn = (point) => placePoint(point, { x, y, s, q });
  const fmt = (value) => String(round(value));
  const number = String.raw`(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)`;
  const endpoints = new RegExp(`([ML])\\s*${number}\\s+${number}`, "gi");
  const arcs = new RegExp(`A${number} ${number} 0 ([01]) ([01]) ${number} ${number}`, "gi");
  const quadratics = new RegExp(`Q${number} ${number} ${number} ${number}`, "gi");
  const cubics = new RegExp(`C${number} ${number} ${number} ${number} ${number} ${number}`, "g");
  const mapPath = (d) =>
    d.replace(endpoints, (_, c, a, b) => {
      const [u, v] = turn([+a, +b]);
      return `${c}${fmt(u)} ${fmt(v)}`;
    }).replace(arcs, (_, rx, ry, l, sw, a, b) => {
      const [u, v] = turn([+a, +b]);
      return `A${fmt((q % 2 ? ry : rx) * s)} ${fmt((q % 2 ? rx : ry) * s)} 0 ${l} ${sw} ${fmt(u)} ${fmt(v)}`;
    }).replace(quadratics, (_, cx, cy, a, b) => {
      const control = turn([+cx, +cy]).map(fmt).join(" ");
      return `Q${control} ${turn([+a, +b]).map(fmt).join(" ")}`;
    }).replace(cubics, (_, cx, cy, dx, dy, a, b) => {
      return "C" + [[cx, cy], [dx, dy], [a, b]].flatMap((pair) => turn(pair.map(Number)).map(fmt)).join(" ");
    });
  return shapes.map((sh) => {
    if (sh.knockout) {
      const knockout = place(sh.knockout, { x, y, s, q });
      return { ...sh, d: mapPath(sh.d), knockout };
    }
    if (sh.d) return { ...sh, d: mapPath(sh.d), ...(sh.cutWidth && { cutWidth: sh.cutWidth * s }) };
    if (sh.c) { const [u, v] = turn([sh.c[0], sh.c[1]]); return { ...sh, c: [u, v, sh.c[2] * s] }; }
    if (sh.identityInk && sh.rotateAnchor) {
      const [left, top, right, bottom] = sh.bounds;
      const center = [(left + right) / 2, (top + bottom) / 2];
      const [u, v] = turn(center);
      const shift = ([a, b]) => [u + (a - center[0]) * s, v + (b - center[1]) * s];
      return { ...sh, at: shift(sh.at), bounds: [...shift([left, top]), ...shift([right, bottom])], scale: sh.scale * s };
    }
    if (sh.t) { const [u, v] = sh.rotateAnchor ? turn(sh.t) : [x + sh.t[0] * s, y + sh.t[1] * s]; return { ...sh, t: [u, v, sh.t[2]] }; } // text stays upright
    return sh;
  });
}
