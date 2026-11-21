#!/usr/bin/env python3
"""processvg check: Plotter's checker plus documented P&ID exceptions.

Plotter (vendor/plotter, unmodified) is the visual standard; processvg is the validity authority
for P&IDs. This layer runs Plotter's own `check()` and then waives only the messages listed in
EXCEPTIONS, each for a stated reason and a stated scope. Every waived message is still printed as
`excepted`, so nothing disappears silently. See docs/agents.md, "Checking".

Usage: python3 scripts/check.py [--compact] [file.svg ...]
With no files, checks every committed drawing (drawings/*.svg, drawings/symbols/*.svg).
"""

import argparse
import importlib.util
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Importing Plotter's checker must not write a __pycache__ into vendor/, which stays unmodified.
sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location("plotter_check", ROOT / "vendor" / "plotter" / "scripts" / "check.py")
plotter = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(plotter)

# The rule processvg's screen stylesheet applies to every shape in a full-mode drawing.
NON_SCALING_RULE = "svg[data-plotter] :is(path,circle,rect,line,polyline,polygon,ellipse){vector-effect:non-scaling-stroke}"


def facts(source, path):
    """What the exceptions need to know about a drawing, read from its root and file name."""
    try:
        root = ET.fromstring(source)
    except ET.ParseError:
        return {}
    styles = " ".join("".join(node.itertext()) for node in root.iter() if plotter.local(node.tag) == "style")
    return {
        "print": root.get("data-profile") == "print",
        "legend": root.get("data-processvg-sheet") == "legend" or (path is not None and Path(path).name.startswith("legend-")),
        "theme_non_scaling": NON_SCALING_RULE in styles,
    }


# (id, applies(facts), matches(message), reason). Keep this list short and documented.
EXCEPTIONS = [
    (
        "print-full-ink-labels",
        lambda f: f.get("print"),
        lambda m: re.match(r"Text “.*” is at 1\.00 ink; labels are never full ink\.", m),
        "profile: \"print\" is black on white for export; its labels are full ink on purpose.",
    ),
    (
        "legend-density",
        lambda f: f.get("legend"),
        lambda m: m.startswith("Sparse: "),
        "A legend sheet shows symbols one by one with names; it is not a construction drawing.",
    ),
    (
        "theme-stylesheet-non-scaling",
        lambda f: f.get("theme_non_scaling"),
        lambda m: re.match(r"\d+ stroked elements lack vector-effect=\"non-scaling-stroke\"", m),
        "processvg's scoped <style> sets vector-effect on every shape; Plotter reads attributes only.",
    ),
]


def check(source, path=None, compact=False):
    """Return (errors, warnings, excepted) where excepted is [(exception id, kind, message)]."""
    errors, warnings = plotter.check(source, compact)
    found = facts(source, path)
    excepted = []

    def keep(kind, messages):
        kept = []
        for message in messages:
            waiver = next((name for name, applies, matches, _ in EXCEPTIONS if applies(found) and matches(message)), None)
            if waiver:
                excepted.append((waiver, kind, message))
            else:
                kept.append(message)
        return kept

    return keep("error", errors), keep("warning", warnings), excepted


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", type=Path, nargs="*")
    parser.add_argument("--compact", action="store_true", help="Check a compact version (Plotter's --compact).")
    args = parser.parse_args()
    inputs = args.input or sorted([*ROOT.glob("drawings/*.svg"), *ROOT.glob("drawings/symbols/*.svg")])
    failed = False
    for path in inputs:
        shown = path.relative_to(ROOT) if path.is_absolute() and path.is_relative_to(ROOT) else path
        errors, warnings, excepted = check(path.read_text(encoding="utf-8"), path, args.compact)
        seen = set()
        for kind, messages in (("error", errors), ("warning", warnings)):
            for message in messages:
                if message not in seen:
                    seen.add(message)
                    print(f"{shown}: {kind}: {message}")
        waived = {}
        for name, kind, _ in excepted:
            waived[name] = waived.get(name, 0) + 1
        for name, count in waived.items():
            print(f"{shown}: excepted: {name} ({count} message{'s' if count > 1 else ''})")
        if errors:
            failed = True
        elif not warnings:
            print(f"{shown}: ok")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
