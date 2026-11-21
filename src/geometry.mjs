// Geometry transform: place a symbol's shapes at (x, y), scale s, quarter turns q (clockwise).
export function placePoint([px, py], { x = 0, y = 0, s = 1, q = 0 } = {}) {
  let [u, v] = [px * s, py * s];
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) [u, v] = [-v, u];
  return [x + u, y + v];
}

export const round = (value) => Math.round(value * 100) / 100;

export function place(shapes, { x = 0, y = 0, s = 1, q = 0 } = {}) {
  const turn = (point) => placePoint(point, { x, y, s, q });
  const fmt = (value) => String(round(value));
  const number = String.raw`(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)`;
  const endpoints = new RegExp(`([ML])\\s*${number}\\s+${number}`, "gi");
  const arcs = new RegExp(`A${number} ${number} 0 ([01]) ([01]) ${number} ${number}`, "gi");
  const quadratics = new RegExp(`Q${number} ${number} ${number} ${number}`, "gi");
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
    });
  return shapes.map((sh) => {
    if (sh.knockout) {
      const knockout = place(sh.knockout, { x, y, s, q });
      return { ...sh, d: mapPath(sh.d), knockout };
    }
    if (sh.d) return { ...sh, d: mapPath(sh.d), ...(sh.cutWidth && { cutWidth: sh.cutWidth * s }) };
    if (sh.c) { const [u, v] = turn([sh.c[0], sh.c[1]]); return { ...sh, c: [u, v, sh.c[2] * s] }; }
    if (sh.t) { const [u, v] = sh.rotateAnchor ? turn(sh.t) : [x + sh.t[0] * s, y + sh.t[1] * s]; return { ...sh, t: [u, v, sh.t[2]] }; } // text stays upright
    return sh;
  });
}
