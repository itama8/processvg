// Shared rendering: shapes from the library -> Plotter-style SVG.
import { standard } from "../vendor/plotter/assets/foundation/standard.mjs";

// Ink follows the viewer's colour scheme (dark ink on light, light ink on dark). A host page
// sets the ink with the --plotter-ink custom property on any ancestor (the token Plotter's
// roles.css also reads), or sets data-host-ink on the svg and styles its colour directly.
// Strokes stay one pixel at any display size.
export const THEME_CSS = "svg[data-plotter]{color:var(--plotter-ink,#171717)}@media (prefers-color-scheme:dark){svg[data-plotter]:not([data-host-ink]){color:var(--plotter-ink,#ededed)}}svg[data-plotter] :is(path,circle,rect,line,polyline,polygon,ellipse){vector-effect:non-scaling-stroke}";
export const THEME_STYLE = `<style>${THEME_CSS}</style>`;
// Explicit themes and print paint their own paper, so they ignore host ink.
const THEME_CSS_BY_NAME = { light: "svg[data-plotter][data-theme=light]{color:#171717}", dark: "svg[data-plotter][data-theme=dark]{color:#ededed}" };
// Print stays full ink even when a host also loads Plotter's roles.css, which sets role opacity.
const PRINT_CSS = "svg[data-plotter][data-profile=print]{color:#000!important}svg[data-plotter][data-profile=print] [data-plotter-role]{opacity:1!important}";
// Profiles: screen (host or explicit theme, one scoped <style>), print (black on white, full ink),
// inline (presentation attributes only, for hosts that cannot be trusted to apply <style>).
export const PROFILES = Object.freeze(["screen", "print", "inline"]);
// [opacity, dash] per role. primary, secondary and signal are processvg's original three; signal is
// an electrical line that renders as Plotter's secondary role with a 6/4 dash. Every other role
// comes from Plotter's standard.json, so its values cannot drift from the vendored standard.
const plotterRole = ({ opacity, dash }) => [standard.tokens[opacity], dash === "none" ? null : dash];
const ROLE = { primary: [1, null], secondary: [0.32, null], signal: [0.32, "6 4"] };
for (const [name, role] of Object.entries(standard.roles)) ROLE[name] ??= plotterRole(role);
export const ROLES = Object.freeze([...Object.keys(ROLE), "dot"]);
// Paint order: faint scaffold under the form, annotation over it. The first three keep their
// original relative order so drawings that use only them are byte-identical.
const ROLE_ORDER = ["grid", "guide", "hatch", "primary", "secondary", "signal", "section", "hidden", "absent",
  "proposed", "centerline", "dimension", "leader", "transfer"];
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const KNOCKOUT = "processvg-knockout-";
const precision = (v) => Number(v.toPrecision(15));
const fmt = (v) => (Math.round(v * 100) / 100).toString();

/**
 * Shapes -> grouped SVG markup in Plotter roles.
 * Knockout masks are numbered per call. With `idPrefix` they are `${idPrefix}-knockout-n`; without it
 * they are placeholders that `svgDoc` renumbers under the document id.
 */
export function render(shapes, { profile = "screen", idPrefix } = {}) {
  if (!PROFILES.includes(profile)) throw new RangeError(`Unknown render profile: ${profile}`);
  const print = profile === "print", inline = profile === "inline";
  const nonScaling = inline ? ' vector-effect="non-scaling-stroke"' : "";
  const maskBase = idPrefix === undefined ? KNOCKOUT : `${esc(idPrefix)}-knockout-`;
  let maskSerial = 0;
  const groups = Object.fromEntries(ROLE_ORDER.map((role) => [role, []]));
  const defs = [], dots = [], names = [], values = [], identities = [];
  for (const sh of shapes) {
    if (sh.identityInk || sh.annotationInk) {
      const label = esc(sh.identityInk ?? sh.annotationInk);
      const description = sh.identityTitle ? ` aria-description="${esc(sh.identityTitle)}"` : "";
      const ref = sh.interlockReference
        ? ` data-interlock-id="${esc(sh.interlockReference.id)}" data-logic-id="${esc(sh.interlockReference.logicId)}"` : "";
      const transform = `translate(${sh.at.map(precision).join(" ")}) scale(${precision(sh.scale)})`;
      const glyphs = sh.glyphs.map(({ x, d }) => `<path transform="translate(${precision(x)} 0)" d="${esc(d)}" />`);
      const style = sh.annotationInk
        ? `data-processvg-annotation="${esc(sh.annotationRole)}" opacity="${print ? 1 : sh.annotationRole === "service" ? 0.72 : 0.5}"`
        : 'data-processvg-identity=""';
      const analyte = sh.analyteIdentity;
      const owner = analyte ? ` data-primary-owner="${esc(analyte.id)}" data-primary-asset="${esc(analyte.assetId)}"${analyte.conflicts.length
        ? ` data-layout-conflict="${esc(analyte.conflicts.join(" "))}"` : ""}` : "";
      const title = analyte?.conflicts.length ? `${label} (layout conflict: ${esc(analyte.conflicts.join(", "))})` : label;
      identities.push(`<g ${style}${owner} role="img" aria-label="${label}"${description}${ref} transform="${transform}"><title>${title}</title>${glyphs.join("")}</g>`);
      continue;
    }
    if (sh.t) {
      const font = sh.fontFamily ? ` font-family="${esc(sh.fontFamily)}"` : "";
      const baseline = sh.verticalCenter ? ' dominant-baseline="central"' : "";
      const shift = ["dx", "dy"].map((axis) => sh[axis] ? ` ${axis}="${fmt(sh[axis])}"` : "").join("");
      (sh.value ? values : names).push(`<text x="${fmt(sh.t[0])}" y="${fmt(sh.t[1])}" text-anchor="${esc(sh.align ?? "middle")}"${font}${baseline}${shift}>${esc(sh.t[2])}</text>`);
      continue;
    }
    const fill = sh.fill === "solid" ? ' fill="currentColor"' : "";
    // Signal paths carry their dash themselves: roles.css resets dashes on role groups.
    const pathDash = sh.dash ?? (sh.role === "signal" ? ROLE.signal[1] : null);
    const dash = pathDash ? ` stroke-dasharray="${esc(pathDash)}"` : "";
    const cap = sh.cap ? ` stroke-linecap="${esc(sh.cap)}"` : "";
    let mask = "";
    if (sh.knockout) {
      const id = `${maskBase}${++maskSerial}`;
      const cuts = sh.knockout.map((cut) => cut.d
        ? `<path d="${esc(cut.d)}" ${cut.cutWidth
          ? `fill="none" stroke="#000" stroke-width="${Number(cut.cutWidth.toPrecision(15))}" stroke-linecap="${cut.cap === "butt" ? "butt" : "round"}" stroke-linejoin="round"${inline ? "" : ' style="vector-effect:none"'}`
          : 'fill="#000" stroke="none"'} />`
        : `<circle cx="${fmt(cut.c[0])}" cy="${fmt(cut.c[1])}" r="${fmt(cut.c[2])}" fill="#000" stroke="none" />`);
      defs.push(`<mask id="${id}" maskUnits="objectBoundingBox" maskContentUnits="userSpaceOnUse" mask-type="luminance"><path d="${esc(sh.d)}" fill="#fff" stroke="#fff" />${cuts.join("")}</mask>`);
      mask = ` mask="url(#${id})"`;
    }
    const transform = sh.uprightAt
      ? ` transform="translate(${sh.uprightAt.slice(0, 2).map(precision).join(" ")}) scale(${precision(sh.uprightAt[2])})"` : "";
    const circleNumber = sh.exact ? precision : fmt;
    const role = sh.role ?? "primary";
    if (!ROLES.includes(role)) throw new RangeError(`Unknown drawing role: ${role}`);
    const stroke = role === "dot" ? ' stroke="none"' : nonScaling;
    const el = sh.d ? `<path d="${esc(sh.d)}"${fill}${dash}${cap}${mask}${transform}${stroke} />`
      : `<circle cx="${circleNumber(sh.c[0])}" cy="${circleNumber(sh.c[1])}" r="${circleNumber(sh.c[2])}"${fill}${stroke} />`;
    (role === "dot" ? dots : groups[role]).push(el);
  }
  const out = defs.length ? [`<defs>${defs.join("")}</defs>`] : [];
  for (const [role, items] of Object.entries(groups)) {
    if (!items.length) continue;
    const [op, dash] = ROLE[role];
    const name = role === "signal" ? "secondary" : role;
    out.push(`<g data-plotter-role="${name}" opacity="${print ? 1 : op}" stroke-dasharray="${dash ?? "none"}"${dash ? ` stroke-linecap="butt"` : ""}>`, ...items, `</g>`);
  }
  if (dots.length) out.push(`<g fill="currentColor">`, ...dots, `</g>`);
  if (names.length) out.push(`<g fill="currentColor" stroke="none" font-size="10" opacity="${print ? 1 : 0.72}">`, ...names, `</g>`);
  if (values.length) out.push(`<g fill="currentColor" stroke="none" font-size="10" opacity="${print ? 1 : 0.5}">`, ...values, `</g>`);
  if (identities.length) out.push(`<g fill="currentColor" stroke="none" opacity="1">`, ...identities, `</g>`);
  return out.join("\n");
}

/**
 * Give placeholder knockout masks ids scoped to one document, numbered in document order, so many
 * drawings inlined on one page never share a mask id. Each render() call emits its <defs> before the
 * paths that use them, so a reference always resolves to the most recent definition of its number.
 */
function scopeMaskIds(body, scope) {
  let serial = 0;
  const current = new Map();
  return body.replace(/id="processvg-knockout-(\d+)"|url\(#processvg-knockout-(\d+)\)/g, (match, def, ref) => {
    if (def) {
      const id = `${scope}-knockout-${++serial}`;
      current.set(def, id);
      return `id="${id}"`;
    }
    return current.has(ref) ? `url(#${current.get(ref)})` : match;
  });
}

export function svgDoc(id, title, desc, body, { profile = "screen", theme = "auto", strokeWidth, width = 560, height = 440 } = {}) {
  if (!PROFILES.includes(profile) || !["auto", "light", "dark"].includes(theme)) {
    throw new RangeError("Invalid SVG profile or theme");
  }
  if (profile === "inline" && theme !== "auto") throw new RangeError("The inline profile takes its ink from the host; omit theme");
  if (strokeWidth !== undefined && (!Number.isFinite(strokeWidth) || strokeWidth <= 0)) throw new RangeError("Invalid SVG stroke width");
  if (![width, height].every((size) => Number.isFinite(size) && size > 0)) throw new RangeError("Invalid SVG viewport");
  const print = profile === "print";
  id = esc(id);
  body = scopeMaskIds(body, id);
  const head = (attrs, style) => `<svg xmlns="http://www.w3.org/2000/svg"${attrs} fill="none" stroke="currentColor" stroke-width="${strokeWidth ?? 1}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="${id}-title" aria-describedby="${id}-desc"${style}>`;
  const labels = [`<title id="${id}-title">${esc(title)}</title>`, `<desc id="${id}-desc">${esc(desc)}</desc>`];
  if (profile === "inline") {
    // Presentation attributes only: no <style>, no paper, no web font. Ink is the host's currentColor.
    // No data-plotter on the root, so a page stylesheet aimed at full-mode drawings cannot restyle it.
    return [head(' data-processvg-profile="inline"', ' font-family="sans-serif" font-weight="400"'),
      ...labels, body, `</svg>`].filter(Boolean).join("\n") + "\n";
  }
  const paper = print ? "#fff" : { dark: "#171717", light: "#fff" }[theme];
  const themeAttrs = theme === "auto" ? "" : ` data-host-ink="" data-theme="${theme}"`;
  return [
    head(` data-plotter=""${themeAttrs}${print ? ' data-profile="print"' : ""}`, ` style="font-family:Cal Sans, sans-serif;font-optical-sizing:auto;font-synthesis:none;font-variation-settings:'GEOM' 25;font-weight:400"`),
    ...labels,
    `<style>${THEME_CSS}${print ? "" : THEME_CSS_BY_NAME[theme] ?? ""}${print ? PRINT_CSS : ""}</style>`,
    paper ? `<rect width="${width}" height="${height}" fill="${paper}" stroke="none" />` : "",
    body,
    `</svg>`,
  ].filter(Boolean).join("\n") + "\n";
}
