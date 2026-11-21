import font from "./instrument-font.mjs";

export const INSTRUMENT_FONT = Object.freeze({ name: font.font, sourceSha256: font.sourceSha256 });

/** Outlines and true ink bounds in SVG coordinates relative to a left-aligned baseline. */
export function measureInstrumentInk(text, size) {
  const scale = size / font.unitsPerEm;
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const paths = [];
  let advance = 0;
  for (const char of text.normalize("NFC")) {
    const glyph = Object.hasOwn(font.glyphs, char) && font.glyphs[char];
    if (!glyph) throw new RangeError(`Unsupported instrument glyph U+${char.codePointAt(0).toString(16).toUpperCase()}`);
    const [width, ink, d] = glyph;
    if (ink) {
      bounds[0] = Math.min(bounds[0], advance + ink[0]);
      bounds[1] = Math.min(bounds[1], ink[1]);
      bounds[2] = Math.max(bounds[2], advance + ink[2]);
      bounds[3] = Math.max(bounds[3], ink[3]);
      paths.push({ x: advance, d });
    }
    advance += width;
  }
  return { bounds: bounds.map((v) => v * scale), paths, scale };
}

export function identityRow(text, size, measure = measureInstrumentInk) {
  if (typeof text !== "string" || !text.trim() || /[\u0000-\u001f\u007f]/u.test(text)) {
    throw new TypeError("Instrument identity must be a nonempty single-line string");
  }
  const { bounds, paths, scale } = measure(text, size);
  if (bounds?.length !== 4 || !bounds.every(Number.isFinite) || bounds[0] >= bounds[2] || bounds[1] >= bounds[3] ||
      !Array.isArray(paths) || !paths.length || !paths.every(({ x, d }) => Number.isFinite(x) && typeof d === "string" && d) ||
      !Number.isFinite(scale) || scale <= 0) throw new TypeError("Invalid measured instrument ink");
  return { text, paths, scale, bounds, halfWidth: (bounds[2] - bounds[0]) / 2, halfHeight: (bounds[3] - bounds[1]) / 2 };
}

export function placeIdentity(row, [x, y], s = 1) {
  const [left, top, right, bottom] = row.bounds;
  return {
    identityInk: row.text,
    at: [x - s * (left + right) / 2, y - s * (top + bottom) / 2],
    scale: row.scale * s,
    glyphs: row.paths,
    bounds: [x - s * row.halfWidth, y - s * row.halfHeight, x + s * row.halfWidth, y + s * row.halfHeight],
  };
}
