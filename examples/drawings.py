#!/usr/bin/env python3
"""Hand-composed Plotter-style section of an SBR basin.

Basin length and side water depth (25.4 m, 5.6 m SWD) are typical of a municipal SBR;
wall, slab, freeboard and BWL are illustrative. Run from the repository root.
"""

import math
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "drawings"
# Ink follows the viewer's colour scheme (dark ink on light, light ink on dark); a host page that sets data-host-ink on the svg controls the colour itself. Strokes stay one pixel at any display size.
THEME_STYLE = '<style>svg[data-plotter]{color:#171717}@media (prefers-color-scheme:dark){svg[data-plotter]:not([data-host-ink]){color:#ededed}}svg[data-plotter] :is(path,circle,rect,line,polyline,polygon,ellipse){vector-effect:non-scaling-stroke}</style>'
ROLE = {
    "primary": ("1", None),
    "secondary": ("0.32", None),
    "guide": ("0.14", None),
    "hatch": ("0.18", None),
    "center": ("0.14", "8 3 1 3"),
    "hidden": ("0.32", "3 5"),
    "transfer": ("0.32", "4 6"),
}


def f(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


class Sheet:
    def __init__(self, title, desc):
        self.title, self.desc = title, desc
        self.layers = {k: [] for k in ROLE}
        self.fills = []
        self.names, self.values = [], []

    def add(self, role, d):
        self.layers[role].append(d)

    def path(self, role, pts, close=False):
        d = "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts) + (" Z" if close else "")
        self.add(role, f'<path d="{d}" />')

    def rect(self, role, x, y, w, h, rx=0):
        r = f' rx="{f(rx)}"' if rx else ""
        self.add(role, f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}"{r} />')

    def circle(self, role, cx, cy, r):
        self.add(role, f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" />')

    def text(self, x, y, s, value=False, anchor="start", rotate=None):
        t = f' transform="rotate({rotate} {f(x)} {f(y)})"' if rotate else ""
        (self.values if value else self.names).append(
            f'<text x="{f(x)}" y="{f(y)}" text-anchor="{anchor}"{t}>{s}</text>'
        )

    def highlight(self, x, y, w, h):
        self.fills.append(
            f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" fill="currentColor" stroke="none" '
            f'fill-opacity="0.055" data-plotter-fill="highlight" />'
        )

    # Marks -----------------------------------------------------------------
    def arrow(self, pts, role="transfer"):
        """Dashed shaft drawn from the tip back, solid 6-unit legs at 45°."""
        tip, prev = pts[-1], pts[-2]
        self.path(role, list(reversed(pts)))
        dx, dy = tip[0] - prev[0], tip[1] - prev[1]
        n = math.hypot(dx, dy)
        ux, uy = dx / n, dy / n
        legs = []
        for s in (1, -1):
            c, si = math.cos(math.radians(45 * s)), math.sin(math.radians(45 * s))
            bx, by = -(ux * c - uy * si), -(ux * si + uy * c)
            legs.append((tip[0] + 6 * bx, tip[1] + 6 * by))
        self.layers[role].append(
            f'<path d="M{f(legs[0][0])} {f(legs[0][1])} L{f(tip[0])} {f(tip[1])} L{f(legs[1][0])} {f(legs[1][1])}" stroke-dasharray="none" />'
        )

    def dim_h(self, x1, x2, y, from_y, label, gap):
        """Horizontal dimension; witnesses rise or drop from from_y to 8 past the line."""
        sgn = 1 if y > from_y else -1
        for x in (x1, x2):
            self.path("secondary", [(x, from_y + 8 * sgn), (x, y + 8 * sgn)])
            self.path("secondary", [(x - 4, y + 4), (x + 4, y - 4)])
        mid = (x1 + x2) / 2
        self.path("secondary", [(x1, y), (mid - gap, y)])
        self.path("secondary", [(mid + gap, y), (x2, y)])
        self.text(mid, y + 3.6, label, value=True, anchor="middle")

    def dim_v(self, x, y1, y2, from_x, label, gap):
        sgn = 1 if x > from_x else -1
        for y in (y1, y2):
            self.path("secondary", [(from_x + 8 * sgn, y), (x + 8 * sgn, y)])
            self.path("secondary", [(x - 4, y + 4), (x + 4, y - 4)])
        mid = (y1 + y2) / 2
        self.path("secondary", [(x, y1), (x, mid - gap)])
        self.path("secondary", [(x, mid + gap), (x, y2)])
        self.text(x + 3.6, mid, label, value=True, anchor="middle", rotate=-90)

    def hatch(self, x, y, w, h, pitch=12):
        """H1: −45° lines (x+y=c) clipped analytically to the rectangle."""
        segs = []
        c = pitch
        while c < w + h:
            a = (x + max(0, c - h), y + min(h, c))
            b = (x + min(w, c), y + max(0, c - w))
            segs.append(f"M{f(a[0])} {f(a[1])}L{f(b[0])} {f(b[1])}")
            c += pitch
        if segs:
            self.add("hatch", f'<path d="{" ".join(segs)}" stroke-linecap="butt" />')

    def level(self, x, y, label):
        """Water-level mark: an open triangle standing on the level line."""
        self.path("secondary", [(x - 4, y - 7), (x + 4, y - 7), (x, y - 1)], close=True)
        self.text(x + 8, y - 3, label)

    def bubble(self, cx, cy, tag):
        self.circle("secondary", cx, cy, 12)
        self.text(cx, cy + 3.6, tag, anchor="middle")

    def gate(self, cx, cy, closed=False, role="primary"):
        """Bow-tie gate across a horizontal line; filled when closed."""
        d = (
            f"M{f(cx - 5)} {f(cy - 5)} L{f(cx + 5)} {f(cy + 5)} L{f(cx + 5)} {f(cy - 5)} "
            f"L{f(cx - 5)} {f(cy + 5)} Z"
        )
        fill = ' fill="currentColor" fill-opacity="0.32"' if closed else ""
        self.add(role, f'<path d="{d}"{fill} />')

    def dot(self, cx, cy):
        self.add("primary", f'<circle cx="{f(cx)}" cy="{f(cy)}" r="2" fill="currentColor" stroke="none" />')

    # Output ----------------------------------------------------------------
    def svg(self, slug):
        out = [
            f'<svg xmlns="http://www.w3.org/2000/svg" data-plotter="" fill="none" stroke="currentColor" '
            f'stroke-width="1" viewBox="0 0 560 440" width="560" height="440" role="img" '
            f'aria-labelledby="{slug}-title" aria-describedby="{slug}-desc" '
            f'style="font-family:Cal Sans, sans-serif;font-optical-sizing:auto;'
            f"font-synthesis:none;font-variation-settings:'GEOM' 25;font-weight:400\">",
            f'<title id="{slug}-title">{self.title}</title>',
            f'<desc id="{slug}-desc">{self.desc}</desc>',
            THEME_STYLE,
        ]
        out += self.fills
        order = ["guide", "center", "hatch", "secondary", "hidden", "transfer", "primary"]
        for role in order:
            if not self.layers[role]:
                continue
            op, dash = ROLE[role]
            role_attr = {"center": "guide", "transfer": "transfer", "hidden": "hidden"}.get(role, role)
            dash_attr = f' stroke-dasharray="{dash}" stroke-linecap="butt"' if dash else ' stroke-dasharray="none"'
            out.append(f'<g data-plotter-role="{role_attr}" opacity="{op}"{dash_attr}>')
            out += self.layers[role]
            out.append("</g>")
        for items, op in ((self.names, "0.72"), (self.values, "0.5")):
            if items:
                out.append(f'<g fill="currentColor" stroke="none" font-size="10" opacity="{op}">')
                out += items
                out.append("</g>")
        out.append("</svg>")
        (OUT / f"{slug}.svg").write_text("\n".join(out) + "\n")


# SBR basin section ------------------------------------------------------
def section():
    s = Sheet(
        "One SBR basin, decanting",
        "Section through a 25.4 m SBR basin with 5.6 m side water depth. The decanter "
        "travels from top water level down to bottom water level and draws off the band "
        "between them. Wall, slab, freeboard and BWL are illustrative, not from the drawing.",
    )
    k = 16  # units per metre
    L, swd, fb, t, base = 25.4, 5.6, 0.5, 0.4, 0.5
    bwl = 4.0  # illustrative
    W = (L + 2 * t) * k
    x0 = (560 - W) / 2
    xi0, xi1 = x0 + t * k, x0 + (t + L) * k
    floor = 272
    bottom = floor + base * k
    twl = floor - swd * k
    bwl_y = floor - bwl * k
    top = twl - fb * k

    # Section cut: walls and base slab, hatched
    s.path("primary", [(x0, top), (x0, bottom), (x0 + W, bottom), (x0 + W, top), (xi1, top),
                       (xi1, floor), (xi0, floor), (xi0, top)], close=True)
    s.hatch(x0, top, t * k, floor - top)
    s.hatch(xi1, top, t * k, floor - top)
    s.hatch(x0, floor, W, base * k)

    # Water levels and the decanted band
    s.highlight(xi0, twl, xi1 - xi0, bwl_y - twl)
    s.path("secondary", [(xi0, twl), (xi1, twl)])
    s.path("hidden", [(xi0, bwl_y), (xi1, bwl_y)])
    s.level(xi0 + 48, twl, "TWL")
    s.level(xi0 + 48, bwl_y, "BWL")
    s.text((xi0 + xi1) / 2 - 40, (twl + bwl_y) / 2 + 3.6, "Decanted volume", anchor="middle")

    # Decanter: weir trough at TWL, its lowest position at BWL, travel between
    dw, dh = 1.8 * k, 0.45 * k
    dx = xi1 - 3.2 * k
    s.rect("primary", dx, twl - dh / 2, dw, dh)
    s.rect("hidden", dx, bwl_y - dh / 2, dw, dh)
    piv = (xi1 - 0.6 * k, floor - 1.0 * k)
    s.path("secondary", [(dx + dw / 2, twl + dh / 2), piv])
    s.circle("secondary", piv[0], piv[1], 3)
    s.arrow([(dx - 10, twl + dh / 2 + 2), (dx - 10, bwl_y - dh / 2 - 2)])
    s.text(dx + dw / 2, top - 10, "Decanter", anchor="middle")
    s.path("secondary", [(dx + dw / 2, top - 6), (dx + dw / 2, twl - dh / 2 - 3)])

    # Air: drop pipe at the inlet wall, diffuser grid on the floor
    ax = xi0 + 1.2 * k
    gy = floor - 0.3 * k
    s.path("secondary", [(ax, top - 18), (ax, gy), (xi1 - 1.6 * k, gy)])
    x = ax + 1.6 * k
    while x < xi1 - 1.8 * k:
        s.circle("secondary", x, gy - 3, 2.5)
        x += 1.6 * k
    s.text(ax + 6, top - 12, "Air")
    s.text(xi0 + 6.2 * k, gy - 9, "Diffuser grid")

    # Fill from the central channel
    s.arrow([(x0 - 34, twl + 1.2 * k), (x0 - 2, twl + 1.2 * k)])
    s.text(x0 - 34, twl + 1.2 * k - 7, "Fill")


    # Dimensions
    s.dim_h(xi0, xi1, bottom + 26, floor, "25.4 m", 18)
    s.dim_v(x0 + W + 22, twl, floor, x0 + W, "5.6 m SWD", 26)
    s.svg("sbr-basin-section")


if __name__ == "__main__":
    section()
