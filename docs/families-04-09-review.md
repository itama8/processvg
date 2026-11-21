# Families 04–09 · Second-pass reference review

This review covers local base `fc88b585dc963e7da32c1997067e42351d3e5d63` (Family 09 first pass) on branch `t3/processvg-families-04-09-reference-pass`. It was done in its own worktree from a clean tree. No other branch was integrated. The companion audit was read with `git show 0eed718e:docs/art-of-the-pid-audit.md` and `docs/sources.md` for slide notes and source limits. `git show e3ca06e:docs/family-03-review.md` supplied the actuator and signal limits. The Family 01–03 reviews and their histories are unchanged.

The review covers cross-family meaning, meaning the drawing grammar that one family's output asks a reader of another family's output to rely on. Approved geometry, archive placement and port indices are unchanged. Family 05 refined shapes and Family 08 candidates remain opt-in and provisional, and Family 08 still awaits exact visual approval. References complement the handoffs. They do not turn candidate geometry into project approval.

## Sources inspected

All PDFs were rendered read-only with Poppler and inspected as images alongside their text layers. Local renders are in `review/families-04-09-evidence/references/` (gitignored).

| Source | Pages inspected | SHA-256 (prefix) |
| --- | --- | --- |
| Ford, Bacon & Davis / AIChE, *Art of the P&ID* | Slides 17–18, 21, 24–25, 28, 56–62, 73–79, 85–90 | `ad548d941450ce03` |
| ProjectMaterials, *P&ID Symbols Reference* | PDF pp. 5, 6, 10–14, 20–25, 27–28 | `37f1d70d4725e1b4` |
| Stockton Terminal Dock 10–11, `STOT-02-002` rev. 2 | PDF p. 1 | `7972d8a74f53c05f` |
| Edraw, *Standard P&ID Symbols Legend* | p. 1, all sections (Instrument, Valves, Pumps, Compressors, Mixers, Motors, Peripheral, Piping) | `21fe90dfd45c57a1` |
| Brown and Caldwell, Pāhala WWTP design/build set (EPA, July 2021) | P-001, P-002, P-003, P-101 (PDF pp. 6–9). This pass used the copy cached by earlier passes. | `6b61266b4fc32d6b` |
| Family 09 package ZIP (final handoff supersedes iteration-02 text) | Final handoff §§1–3 and checks, decanter presets plate | `c527e34b15accaf8` |

Source limits:

- **CPHEEO.** The Omakase CPHEEO tools were not connected in this session, so no CPHEEO clause or source image was retrieved. Every `SEW-2013-A:…` and `WS-2024-A:…` handle on the Family 09 records stays an unverified source lead. No CPHEEO sizing, datum, kinematic or clearance value is applied. The final handoff makes the same requirement: "leads for checking, not automatically applied size rules".
- **Not re-retrieved.** Virden D-006-0, USBR *Water Measurement Manual* ch. 7, EPA 832-F-03-011 and the ANSI/ISA-5.1-2009 PDF were not available offline and could not be fetched in this pass. The first-pass citations in the family docs stand as written. This review adds no edition, panel or analyte-label conclusions from them. Pāhala P-001 was used for function-letter semantics instead.

## Decisions

| Family | Issue and project evidence | Disposition |
| --- | --- | --- |
| 05 | **LIC/PI vs MCP/LCP.** Candidate placement of an authored tag on the `inst-panel` or `inst-local` preset silently set `kind: "control-function"`. A local-panel PI therefore counted as a controller and dropped out of `physicalDeviceIds`. Pāhala P-001 separates readout *I = indicate* from output *C = control*. Stockton and ProjectMaterials p. 23 list PI as a pressure indicator. All four legends treat the single and double bars as mounting location, independent of function. | **Changed.** Without a declared `kind`, the instance is `unclassified`. Archive migration reports `needsClassification` for the same case. Geometry, tags and legacy placement are unchanged. The review fixture's PI is declared `physical-instrument`. **Open:** the approved candidate draws the panel asset itself (MCP 007, MCP 407) as a single-bar bubble. Stockton, Edraw and ProjectMaterials all read that glyph as an instrument on the main panel, and Pāhala P-101 marks MCP as a location band. The panel identity therefore relies on its letters and the legend. |
| 06 | **Integral vs remote transmitter.** The process fixture drew the integral FIT with the same dashed signal as the remote FIT, so the two differed only by caption. AoP slide 17 draws the integral transmitter on the line and joins a separate FE/FT with a signal. Pāhala P-002 distinguishes integral, close-coupled and separate instruments. | **Changed (fixture).** The integral FIT now sits on its element with no drawn line. The electrical edge remains in the topology contract. The remote FIT keeps its dashed signal. The analysis sheet's integral AIT now sits on its cabinet the same way. Project adoption of the convention is open. |
| 09 | **Authored coincidence vs projection overlap.** `portDiagnostics` flagged only model-level shared anchors. Plan and elevation views could stack distinct ports with no report. The only case among the 96 canonical views is the ASP plan, where `return-sludge-in` and `air-in` share XY at different RL. | **Changed.** `projectStructure` now returns `viewPortDiagnostics`, which labels each view overlap `COINCIDENT_ILLUSTRATIVE_PORT_ANCHORS` or `PROJECTED_PORT_OVERLAP`. Sheets without a model flag print a projection-overlap note. The fixture report lists both. |
| 04 | **Flap gate vs pipe check.** The flap reuses the NRV drawing by design (revision 03). Its FG label is the only visible distinction, and an explicit non-FG tag such as `CK-201` makes it identical to `valve-check`. Pāhala P-002/P-003 use a separate hinged flap glyph. | **Documented, unchanged.** The approved geometry governs. Use an FG-prefixed tag or display name. The before/after fixture records the collapse. |
| 04 | **Reduced gate vs pipe knife.** At 0.65× the reduced slide gate (label fallback) and the pipe knife NC are both short dark bars with NC. They are distinguishable only by port spacing and caption in the 300 dpi one-bit raster. | **Open.** This is a legibility criterion for the governing legend. |
| 07 | **Power vs signal grammar.** The topology fixture draws VFD→motor power as a secondary `4 3` dash. Family 01 `line-electric` is a `6 4` dash. In print both are full-ink dashes and differ only in pitch. Pāhala P-001 draws power as a separate ES supply, and slide 18 does not cover power. Process and mechanical shaft routes are both solid. They are separated only by endpoint type and caption. | **Open.** No project power-line convention exists in this base. The Family 03 ES-fork study lives on an unintegrated branch. The typed `electrical-power`, `control-signal` and `mechanical-drive` endpoints already reject cross-domain joins. |
| 08 | **Taxonomy.** P-003 labels the hatched box *FINE SCREEN* and the hopper *GRIT SEPARATOR*. *HYDROCYCLONE* and *GRIT CYCLONE* are separate glyphs. The archive names `screen-fine` "Fine screen, drum" and `grit-separator` "Grit separator (cyclone)". The candidates label them "Fine drum screen" and "Hydrocyclone grit separator", while `screen-drum` and `grit-vortex` also exist. | **Recommendation for the pending Family 08 approval.** Use mechanism-neutral labels for `screen-fine` and `grit-separator` or confirm the intended mechanism. Archive names, handoff data and geometry are unchanged. |
| 09 | **Datum, equal-RL anchors and decanter reach.** The receiving and stilling inlet/outlet anchors have equal RL (flagged). Pressure-filter backwash/waste and clarifier RAS/WAS anchors coincide, which conflicts with the handoff's "backwash port explicit, not assumed to be common outlet". The datum is `EXAMPLE_RL100_UNVERIFIED`. Swing-arm intake RLs (BWL 103.32 m, TWL 104.92 m) match the package decanter plate. | **Unchanged, diagnosed.** Corrections need supplied project anchors. Decanter reach is solved from the illustrative pivot and arm and is not vendor travel. |

Family 06 tap/receiver boundaries were checked on the process sheet and in `src/primary-network.mjs` against Pāhala P-002 flange, pipe and combination taps and AoP slide 17. `measurementBoundary`, separate high and low taps, and the pressure-only diaphragm transfer keep the process, impulse and filled-system media separate. No change was needed. The radar beam, float and probe on the analysis sheet were inspected in print at both scales. This pass added no non-contact fixture. The Family 08 integrated drives, aerated-grit air input and the four grit mechanisms agree with the P-003 and P-101 headworks (fine screen with vendor package, grit removal tank, wash-water spray valves). Plan, section and elevation for the six representative Family 09 units were re-inspected at nominal and 65%, in screen and print profiles.

## Before/after evidence

`node scripts/build-families-04-09-review.mjs` (or `npm run review:families-04-09`) extracts `fc88b58` from local Git objects into `review/families-04-09/base-fc88b58/` and rebuilds the Family 05, 06 and 09 sheets there and in the working tree. It also evaluates four cross-family fixtures (gate/pipe, panel/function, line grammar, screening taxonomy) against both libraries.

| Artifact | Path |
| --- | --- |
| Screen review page and print page | `review/families-04-09/index.html`, `review/families-04-09/print.html` |
| Fixture declarations and recorded behaviour per version | `review/families-04-09/fixtures.json` |
| Chromium layout report | `review/families-04-09-evidence/layout.json` |
| Full-page captures | `review/families-04-09-evidence/screen.png`, `print.png` |
| A4 landscape print PDF and 300 dpi one-bit rasters | `review/families-04-09-evidence/families-04-09-print.pdf`, `print-mono-01.pbm` … `print-mono-22.pbm` |
| Rendered reference pages | `review/families-04-09-evidence/references/` |

Chromium 155.0.8059.84 measured 112 sheet renders (56 SVGs at 100% and 65%, light and print, before and after) and 1,780 text and identity-ink boxes. It found zero clipping or touching-label findings. A negative control with the unwrapped Family 04 captions produced 48 findings, and those captions are now wrapped. The smallest measured ink box at 65% is 3.1 CSS px. It is a Family 06 identity glyph on the reduced process sheet and measures the same before and after. The PDF has 22 pages.

Repository checks after the change: `npm run all` passed 77 tests, and Plotter reported only the existing `legend-lines-2.svg` sparse warning. The focused checks passed:

- gate: 15 sheets, 267 labels
- actuator: 20 sheets, 402 labels
- valve: 0 errors
- instrument: 17 sheets, 644 labels, 1,488 dash samples
- primary: 38 sheets, 912 anchors
- pump: 30 sheets
- screening: 252 placements
- structure: 684 panels, 5,736 labels (six more than base, from the new ASP note)

## Open criteria

The following remain unverified, and this review does not claim them:

- conformance with the governing client legend and licensed IS 3232 or ISA-5.1 editions
- legibility on a physical printer or plotter (the 300 dpi one-bit raster is a simulation)
- project hardware and vendor arrangements (gates, drives, VFDs, analysers, decanters)
- process safety and control validation
- hydraulic or weir/flume ratings
- survey datum and site transform
- the CPHEEO clauses
- the Virden, USBR, EPA and ISA documents in this pass
- Family 08 exact visual approval
- whether a project adopts the Family 06 integral convention, a power-line convention for Family 07, and the Family 08 renaming
