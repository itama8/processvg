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
| **Full** | Node, Omakase Sushi, Claude Code, Codex | `import … from "processvg"`, `validateScene`, Plotter's `check.py`, all profiles |
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
| 2 | `inline` render profile | Test that it emits no `<style>` and passes `check.py`. Make knockout mask IDs unique per drawing, because a module-level counter repeats `processvg-knockout-1` in every file inlined on one page. |
| 3 | `src/scene.mjs`, `schema/scene.schema.json` | `validateScene`, `renderScene`. Pure, with no DOM and no fs. Start with Family 09 structures, which the tank and SBR widgets needed. |
| 4 | Inline snippet builder and parity tests | Size budget a few KB per drawing. |
| 5 | `skills/processvg/SKILL.md`, `agents/openai.yaml` | Generated from the catalogue. Covers how to write a scene, paste the snippet, wire sliders to scene parameters, and verify. |
| 6 | A/B trial | In separate fresh chats, with the same brief: (A) repo only, (B) repo and skill. Record the model, commit, transcript, SVG and checker output. Repeat the trial. |

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
- `<title>`, `<desc>`, `role="img"`. Inliners prefix IDs, as `scripts/build-review.mjs` does.
