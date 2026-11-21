# processvg for agents

Two consumers matter: **Sushi** in Omakase Civil (primary), and **general agents**. General
agents are coding agents with a shell (Claude Code, Codex) and chat agents (ChatGPT, claude.ai)
that draw inline. All of them fail the same way. Asked for a tank, a wet well or a P&ID, a
model writes SVG from memory. The result breaks the Plotter rules, leaves pumps
discharging into nowhere, and has nothing that verifies it.

Evidence (November 2026): ChatGPT's inline tank and SBR widgets called no processvg API and
opened no repo file. Plotter's checker reports 13 errors on the tank: a 340 × 245 canvas,
stroke widths of 1.35 to 2.3, a filled blue water body, and bold all-caps labels at full ink.
The interaction was the good part: one parameter drove consistent plan and section geometry.
processvg should give agents that interaction with correct geometry.

## Decision 1: models write a scene, processvg draws it

A model writes a small JSON **scene** that names library symbols and structure models and
joins ports by name. The model never writes path data.

```json
{
  "title": "Raw sewage pumping",
  "desc": "Duty and standby pumps lift from the wet well to the inlet chamber.",
  "symbols": {
    "P1": { "id": "pump-submersible", "at": [180, 260], "tag": "P-101" },
    "V1": { "id": "valve-check", "at": [260, 200] },
    "V2": { "id": "valve-gate", "at": [320, 200], "closed": true }
  },
  "lines": [
    { "type": "line-process", "from": "P1.discharge", "to": "V1.in", "via": [[180, 200]] },
    { "type": "line-flow", "from": "V1.out", "to": "V2.in" }
  ],
  "offSheet": [{ "direction": "out", "streamId": "RS-1", "sheetRef": "P-102", "from": "V2.out" }]
}
```

Structures use the Family 09 model instead of placed symbols. For example,
`{ "structure": "sbr-basin", "params": { "water": { "currentRL": 104.2 } }, "view": "section" }`
is drawn with `createStructureModel` and `composeStructure`. A slider changes the parameter,
never the paths.

- **Verifiable.** `validateScene` rejects unknown IDs, unknown or unconnected ports, lines that
  miss a port, off-canvas placements, and `Proposed` symbols used without a note. Every error
  names a path (`lines[1].to`) and a fix.
- **Small.** A scene fits in a prompt; the geometry stays in the library.
- **Same pattern as Sushi charts.** That pattern is a bundled skill, a validator tool, and a
  fenced block rendered inline.
- **Editable.** The scene stays in the note or widget, so the drawing can be revised.

## Decision 2: two delivery modes, one source

| Mode | Where | What runs |
|---|---|---|
| **Full** | Node, Omakase Sushi, Claude Code, Codex | `import … from "processvg"`, `validateScene`, `scripts/check.py`, all profiles |
| **Inline** | ChatGPT's inline UI (DIL), and any host that cannot import modules | A generated, self-contained snippet pasted into the widget's code |

What ChatGPT's inline UI allows: it can define JavaScript functions and hold a few KB of code.
It **cannot import external modules**. It doesn't guarantee that **`<style>` will apply**.
`currentColor` follows the chat theme.

So the inline mode is:

1. **An `inline` render profile.** It uses presentation attributes only: no `<style>`, no
   paper rectangle, no web font. Ink is `currentColor` from the host, and strokes carry
   `vector-effect="non-scaling-stroke"` as an attribute. Roles, opacity, dashes and stroke
   width are already attributes, so the drawing language carries over unchanged.
2. **A generated snippet.** `npm run build:inline -- --symbols … --structures …` tree-shakes the
   real source down to the scene interpreter plus the requested symbols and models. It
   minifies the result into one block and reports the size. Nobody writes it by hand.
3. **Parity tests.** For every fixture scene, the snippet's SVG must match the full library's
   SVG byte for byte, and both must pass `check.py`.
4. **Provenance in the output.** The `<desc>` says `processvg-inline@<commit>`. An inline
   widget that renders is not a validated drawing: verification means running the same
   scene through the full mode.

## Work order

| Step | Piece | Notes |
|---|---|---|
| 1 | One port vocabulary | Ports are named three ways today: catalogue `portNames` (103 of 149 entries have none, legacy pumps included), Family 07 `interfaces`, and Family 09 structure `port.id`. Scenes need one. |
| 2 | `inline` render profile | **Done.** `profile: "inline"` in `render` and `svgDoc`. Knockout mask IDs are scoped per drawing. See "Plotter alignment". |
| 3 | `src/scene.mjs`, `schema/scene.schema.json` | `validateScene`, `renderScene`. Pure, with no DOM and no fs. Start with Family 09 structures, which the tank and SBR widgets needed. |
| 4 | Inline snippet builder and parity tests | Size budget a few KB per drawing. |
| 5 | `skills/processvg/SKILL.md`, `agents/openai.yaml` | Generated from the catalogue. Covers how to write a scene, paste the snippet, wire sliders to scene parameters, and verify. |
| 6 | A/B trial | In separate fresh chats, with the same brief: (A) repo only, (B) repo and skill. Record the model, commit, transcript, SVG and checker output. Repeat the trial. |

## Plotter alignment

**Plotter is the visual standard; processvg is the validity authority.** Plotter
(`vendor/plotter/`, pinned in `UPSTREAM`, never edited) owns the look: one-unit strokes, the role
opacities and dashes in `assets/foundation/standard.json`, label typography, and the drafting
helpers. processvg owns what a P&ID or structure drawing must mean: symbol IDs, ports, states,
sources and scenes. Where Plotter's generic rules misread a P&ID, processvg records a named
exception in its own check layer and never patches the vendored checker.

### What a comparison with Plotter found (November 2026)

- `render` emitted only 3 of Plotter's 13 roles (primary, secondary, and signal as dashed secondary).
- Pump physical views reimplemented dimensions instead of using Plotter's `dimension()` helper.
- Plotter's checker misfires on P&IDs: "sparse" warnings on legend sheets, full-ink print labels
  as errors, and stroke rules it cannot see because processvg's stylesheet applies them.
- An unmerged branch (`t3/processvg-symbols-pid-deck-audit`) patched `vendor/plotter/scripts/check.py`.
  That breaks the vendor rule. Its exceptions belong in `scripts/check.py`.

### Roles

Shapes can carry any Plotter role. `render` groups them under `data-plotter-role` with opacity
and dash taken from `standard.json`, as presentation attributes, so the values cannot drift from
the vendored standard.

| Role | Ink | Dash | Drawn by processvg today |
|---|---|---|---|
| `primary` | 1 | none | Symbol outlines, process lines, structure walls |
| `secondary` | 0.32 | none | Subordinate detail, channel references, structure internals |
| `signal` (processvg) | 0.32 | 6 4, also on each path | Electrical lines. Emitted as `data-plotter-role="secondary"` |
| `dimension` | 0.32 | none | Pump envelope dimensions (Plotter's `dimension()`), screening dimensions, Family 09 dimensions |
| `leader` | 0.32 | none | Family 09 water-level leaders, which keep their own 2 3 dash |
| `hidden` | 0.32 | 3 5 | Gate physical views: guide slots, openings and pockets behind the cut |
| `guide`, `grid`, `hatch`, `section`, `centerline`, `absent`, `proposed`, `transfer` | per `standard.json` | per `standard.json` | Available; no module draws them yet |
| `dot` (processvg) | 1 | none | Filled junction dots, unstroked |

Paint order is faint scaffold (grid, guide, hatch) first, then primary, secondary, signal, then
annotation. Drawings that use only the original three roles render byte for byte as before. An
unknown role throws. Print sets every role to full ink, as it always has.

**Audit of hatching, hidden lines and dimensions (this change):**

- *Hatching:* no module draws any. Pressure-filter media beds in `docs/structures.md` call for
  hatching, but Family 09 has none. Plotter's `hatch()` covers rectangles only, so cut walls and
  conical floors still need native paths. Deferred.
- *Hidden lines:* `gate-physical.mjs` drew them as secondary with a 3 2 dash. **Migrated** to
  `hidden` (same 0.32 ink, Plotter's 3 5 dash). `measuring-structures.mjs` draws its head
  station as secondary 3 2. That is a measurement station, not hidden geometry, so it stays.
- *Dimensions:* `pump-physical.mjs` had its own `dimension()`, with no witness lines and slashes
  that scaled with the placement. **Migrated** to Plotter's `dimension()` in sheet space: witnesses
  with a gap of 3 and an overshoot of 3, Plotter's 8-unit slash, and the `dimension` role. It is not
  pinned by any test.
  `screening-physical.mjs` keeps its approved geometry under the `dimension` role. Plotter's slash
  has a fixed extent of 8 units, which swamps assets drawn at 8 units per metre, and the helper takes
  no slash size. The Family 09 panel (`structure-drawing.mjs`) keeps its geometry under the `dimension`
  and `leader` roles. It used to draw them at full ink.
- *Arrows:* Family 01 flow arrows (`M-4 -4 L0 -10 L4 -4`) are pinned by tests and differ from
  Plotter's `arrow()` (6-unit legs at 45°). They stay as they are.
- *Not migrated:* the Family 09 panel as a whole is outside Plotter's sheet rules. It has a
  520 × 340 canvas, bold 13 and 18 unit headings, and all-caps "NOT TO SCALE". `npm run check` does
  not cover it, because its galleries live in `review/`. It needs its own typography pass before
  scenes render structures inline.

### The inline profile departs from full mode on purpose

| Full mode (`screen`, `print`) | `inline` |
|---|---|
| One scoped `<style>` (theme colour, non-scaling strokes, print overrides) | No `<style>` and no `style` attribute |
| Paper `<rect>` for explicit themes and print | No paper. The host's background shows through |
| Cal Sans through the root `style` | `font-family="sans-serif" font-weight="400"` attributes |
| `data-plotter` root, restylable by `--plotter-ink` and `roles.css` | `data-processvg-profile="inline"`, with no `data-plotter`, so page CSS meant for full-mode drawings cannot restyle it |
| `vector-effect` from the stylesheet | `vector-effect="non-scaling-stroke"` on every stroked path and circle |

Ink is `currentColor`, which follows the chat theme. Opacity and dash were already attributes on
each role group and survive unchanged. An inline drawing takes no `theme`. `composeStructure(model,
{ profile: "inline" })` works too.

### Knockout mask IDs

`render` numbers masks per call. `svgDoc` renumbers them `<doc id>-knockout-<n>` in document order,
so drawings inlined on one page never clash and the same input always gives the same bytes. A
caller that inlines `render` output without `svgDoc` passes `render(shapes, { idPrefix })`.

### Checking

`npm run check` runs `python3 scripts/check.py`, then the node tests. With no arguments it checks
every committed drawing. It imports Plotter's `check()` unmodified, then waives only these
exceptions. Each waiver is still printed as `excepted: <id> (n messages)`.

| Exception | Scope | Why |
|---|---|---|
| `print-full-ink-labels` | Root `data-profile="print"` | Print is black on white for export, so its labels are full ink on purpose |
| `legend-density` | File named `legend-*.svg`, or root `data-processvg-sheet="legend"` | A legend shows symbols one by one; it is not a construction drawing |
| `theme-stylesheet-non-scaling` | The drawing contains processvg's theme rule | The stylesheet sets `vector-effect` on every shape, and Plotter reads attributes only |

Run `python3 scripts/check.py drawing.svg` (or `--compact`) on any drawing. Inline drawings need no
exceptions: a test runs a representative inline drawing through Plotter's own checker.

## Sushi in Omakase Civil

This is its own Omakase checkpoint, under that repo's process. It uses the full mode.

1. **Dependency.** Pin processvg to a commit and import only from `processvg`.
2. **Bundled skill.** A `pid` entry for `skills_load`, with its body taken from processvg.
3. **Validator.** `pid_validate({ noteText })` runs `validateScene` on every ```` ```processvg ````
   fence, the same way `charts_validate` works.
4. **Inline render.** Response cards and notes render the fence with `renderScene`. The host
   sets `--plotter-ink` from the Omakase theme, because the app theme is not
   `prefers-color-scheme`. Merge stays an explicit, undoable edit.
5. **Export.** DOCX and HTML exports use `profile: "print"`.
6. **Citations.** The card lists `Proposed` symbols and each symbol's source.

## Provenance of references

Many reference packages, reviews and SVGs behind the families were drafted by ChatGPT.
A model reviewing against a model's reference is not independent evidence. Each reference
records whether it comes from a cited standard (IS 3232, ISA-5.1, the B&C sheets, CPHEEO) or
is model-drafted. A symbol leaves `Proposed` only with a cited source or the firm's sign-off.

## Output contract (full mode)

- One `<style>` element, scoped to `svg[data-plotter]`, so many drawings can be inlined on one page.
- Host ink comes from `--plotter-ink`, which Plotter's `roles.css` also reads, or from the
  reader's colour scheme. Explicit light and dark themes, and print, keep their own ink.
- Electrical dashes and full print ink survive a host loading `roles.css`.
- `<title>`, `<desc>`, `role="img"`. Knockout mask IDs are already scoped to the document id.
  Inliners that combine drawings sharing an id still prefix IDs, as `scripts/build-review.mjs` does.
