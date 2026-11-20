// Shared rendering: shapes from the library -> Plotter-style SVG.

// Ink follows the viewer's colour scheme (dark ink on light, light ink on dark); a host page that sets data-host-ink on the svg controls the colour itself. Strokes stay one pixel at any display size.
export const THEME_STYLE = "<style>svg[data-plotter]{color:#171717}@media (prefers-color-scheme:dark){svg[data-plotter]:not([data-host-ink]){color:#ededed}}svg[data-plotter] :is(path,circle,rect,line,polyline,polygon,ellipse){vector-effect:non-scaling-stroke}</style>";
const ROLE = { primary: [1, null], secondary: [0.32, null], signal: [0.32, "6 4"] };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (v) => (Math.round(v * 100) / 100).toString();

/** Shapes -> grouped SVG markup in Plotter roles. */
export function render(shapes) {
  const groups = { primary: [], secondary: [], signal: [] };
  const dots = [], names = [], values = [];
  for (const sh of shapes) {
    if (sh.t) { (sh.value ? values : names).push(`<text x="${fmt(sh.t[0])}" y="${fmt(sh.t[1])}" text-anchor="middle">${esc(sh.t[2])}</text>`); continue; }
    const fill = sh.fill === "solid" ? ` fill="currentColor"` : "";
    const el = sh.d ? `<path d="${sh.d}"${fill} />` : `<circle cx="${fmt(sh.c[0])}" cy="${fmt(sh.c[1])}" r="${fmt(sh.c[2])}"${fill} />`;
    if (sh.role === "dot") dots.push(el.replace(" />", ` stroke="none" />`));
    else groups[sh.role ?? "primary"].push(el);
  }
  const out = [];
  for (const [role, items] of Object.entries(groups)) {
    if (!items.length) continue;
    const [op, dash] = ROLE[role];
    const plotterRole = role === "signal" ? "secondary" : role;
    out.push(`<g data-plotter-role="${plotterRole}" opacity="${op}" stroke-dasharray="${dash ?? "none"}"${dash ? ` stroke-linecap="butt"` : ""}>`, ...items, `</g>`);
  }
  if (dots.length) out.push(`<g fill="currentColor">`, ...dots, `</g>`);
  if (names.length) out.push(`<g fill="currentColor" stroke="none" font-size="10" opacity="0.72">`, ...names, `</g>`);
  if (values.length) out.push(`<g fill="currentColor" stroke="none" font-size="10" opacity="0.5">`, ...values, `</g>`);
  return out.join("\n");
}

export function svgDoc(id, title, desc, body) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" data-plotter="" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 560 440" width="560" height="440" role="img" aria-labelledby="${id}-title" aria-describedby="${id}-desc" style="font-family:Cal Sans, sans-serif;font-optical-sizing:auto;font-synthesis:none;font-variation-settings:'GEOM' 25;font-weight:400">`,
    `<title id="${id}-title">${esc(title)}</title>`,
    `<desc id="${id}-desc">${esc(desc)}</desc>`,
    THEME_STYLE,
    body,
    `</svg>`,
  ].join("\n") + "\n";
}

