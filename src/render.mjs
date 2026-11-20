// Shared rendering: shapes from the library -> Plotter-style SVG.

// Ink follows the viewer's colour scheme (dark ink on light, light ink on dark); a host page that sets data-host-ink on the svg controls the colour itself. Strokes stay one pixel at any display size.
export const THEME_STYLE = "<style>svg[data-plotter]{color:#171717}@media (prefers-color-scheme:dark){svg[data-plotter]:not([data-host-ink]){color:#ededed}}svg[data-plotter] :is(path,circle,rect,line,polyline,polygon,ellipse){vector-effect:non-scaling-stroke}</style>";
const DARK_STYLE = "<style>svg[data-plotter][data-theme=dark]{color:#ededed}</style>";
const PRINT_STYLE = '<style>svg[data-plotter][data-profile=print]{color:#000!important}</style>';
const ROLE = { primary: [1, null], secondary: [0.32, null], signal: [0.32, "6 4"] };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let knockoutSerial = 0;
const fmt = (v) => (Math.round(v * 100) / 100).toString();

/** Shapes -> grouped SVG markup in Plotter roles. */
export function render(shapes, { profile = "screen" } = {}) {
  if (!["screen", "print"].includes(profile)) throw new RangeError(`Unknown render profile: ${profile}`);
  const print = profile === "print";
  const groups = { primary: [], secondary: [], signal: [] };
  const defs = [], dots = [], names = [], values = [];
  for (const sh of shapes) {
    if (sh.t) {
      const font = sh.fontFamily ? ` font-family="${esc(sh.fontFamily)}"` : "";
      const baseline = sh.verticalCenter ? ' dominant-baseline="central"' : "";
      const shift = ["dx", "dy"].map((axis) => sh[axis] ? ` ${axis}="${fmt(sh[axis])}"` : "").join("");
      (sh.value ? values : names).push(`<text x="${fmt(sh.t[0])}" y="${fmt(sh.t[1])}" text-anchor="${esc(sh.align ?? "middle")}"${font}${baseline}${shift}>${esc(sh.t[2])}</text>`);
      continue;
    }
    const fill = sh.fill === "solid" ? ' fill="currentColor"' : "";
    const dash = sh.dash ? ` stroke-dasharray="${esc(sh.dash)}"` : "";
    const cap = sh.cap ? ` stroke-linecap="${esc(sh.cap)}"` : "";
    let mask = "";
    if (sh.knockout) {
      const id = `processvg-knockout-${++knockoutSerial}`;
      const cuts = sh.knockout.map((cut) => cut.d
        ? `<path d="${esc(cut.d)}" ${cut.cutWidth
          ? `fill="none" stroke="#000" stroke-width="${Number(cut.cutWidth.toPrecision(15))}" stroke-linecap="${cut.cap === "butt" ? "butt" : "round"}" stroke-linejoin="round" style="vector-effect:none"`
          : 'fill="#000" stroke="none"'} />`
        : `<circle cx="${fmt(cut.c[0])}" cy="${fmt(cut.c[1])}" r="${fmt(cut.c[2])}" fill="#000" stroke="none" />`);
      defs.push(`<mask id="${id}" maskUnits="objectBoundingBox" maskContentUnits="userSpaceOnUse" mask-type="luminance"><path d="${esc(sh.d)}" fill="#fff" stroke="#fff" />${cuts.join("")}</mask>`);
      mask = ` mask="url(#${id})"`;
    }
    const el = sh.d ? `<path d="${esc(sh.d)}"${fill}${dash}${cap}${mask} />`
      : `<circle cx="${fmt(sh.c[0])}" cy="${fmt(sh.c[1])}" r="${fmt(sh.c[2])}"${fill} />`;
    if (sh.role === "dot") dots.push(el.replace(" />", ` stroke="none" />`));
    else groups[sh.role ?? "primary"].push(el);
  }
  const out = defs.length ? [`<defs>${defs.join("")}</defs>`] : [];
  for (const [role, items] of Object.entries(groups)) {
    if (!items.length) continue;
    const [op, dash] = ROLE[role];
    const plotterRole = role === "signal" ? "secondary" : role;
    out.push(`<g data-plotter-role="${plotterRole}" opacity="${print ? 1 : op}" stroke-dasharray="${dash ?? "none"}"${dash ? ` stroke-linecap="butt"` : ""}>`, ...items, `</g>`);
  }
  if (dots.length) out.push(`<g fill="currentColor">`, ...dots, `</g>`);
  if (names.length) out.push(`<g fill="currentColor" stroke="none" font-size="10" opacity="${print ? 1 : 0.72}">`, ...names, `</g>`);
  if (values.length) out.push(`<g fill="currentColor" stroke="none" font-size="10" opacity="${print ? 1 : 0.5}">`, ...values, `</g>`);
  return out.join("\n");
}

export function svgDoc(id, title, desc, body, { profile = "screen", theme = "auto" } = {}) {
  if (!["screen", "print"].includes(profile) || !["auto", "light", "dark"].includes(theme)) {
    throw new RangeError("Invalid SVG profile or theme");
  }
  const print = profile === "print";
  const paper = print ? "#fff" : { dark: "#171717", light: "#fff" }[theme];
  const themeAttrs = theme === "auto" ? "" : ` data-host-ink="" data-theme="${theme}"`;
  id = esc(id);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" data-plotter=""${themeAttrs}${print ? ' data-profile="print"' : ""} fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 560 440" width="560" height="440" role="img" aria-labelledby="${id}-title" aria-describedby="${id}-desc" style="font-family:Cal Sans, sans-serif;font-optical-sizing:auto;font-synthesis:none;font-variation-settings:'GEOM' 25;font-weight:400">`,
    `<title id="${id}-title">${esc(title)}</title>`,
    `<desc id="${id}-desc">${esc(desc)}</desc>`,
    THEME_STYLE,
    theme === "dark" && !print ? DARK_STYLE : "",
    print ? PRINT_STYLE : "",
    paper ? `<rect width="560" height="440" fill="${paper}" stroke="none" />` : "",
    body,
    `</svg>`,
  ].filter(Boolean).join("\n") + "\n";
}

