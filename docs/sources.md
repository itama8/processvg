# Sources

The symbol library records its declared references and review status. The short names:

| Short name | Source |
|---|---|
| IS 3232 | IS 3232:1999 (reaffirmed 2005), *Recommendations on graphical symbols for process flow diagrams, piping and instrumentation diagrams*, Bureau of Indian Standards. Cited by symbol number. |
| ISA-5.1 | ANSI/ISA-5.1-2009, *Instrumentation symbols and identification*. |
| B&C | Brown and Caldwell, Pahala Wastewater Treatment Plant design-build documents, sheets C-001, P-002, P-003, P-101 (County of Hawaii, 2021), published by the US EPA: <https://www.epa.gov/system/files/documents/2021-08/pahala-wwtp-design-build-drawings-2021-07-23.pdf> |
| Proposed | Not in the sources above. Drafted here; agree with the firm before use. |

Structure descriptions in `docs/structures.md` also cite:

- CPHEEO *Manual on Sewerage and Sewage Treatment Systems*, Part A: Engineering (3rd ed., 2013), as `SEW-2013-A:…` handles from omakase-cpheeo.
- CPHEEO *Manual on Water Supply and Treatment Systems*, Part A (4th ed., 2024), as `WS-2024-A:…`.
- Metcalf & Eddy, *Wastewater Engineering: Treatment and Reuse*, 4th ed. (2003), by figure.

Utility P&ID standards read for conventions (tagging, legends, line codes):

- JEA, *P&ID Standard*, Revision 2 (2024): <https://www.jea.com/Pdf/Download/12884936472>
- Hunter Water, STS-913 *Preparation of P&ID engineering drawings*.
- SA Water, TS 112 *Process and Instrumentation Diagrams*, rev. 2.0 (2015).
- Water Corporation (WA), DS 81 *Process Engineering Design Standard*.

The symbols are redrawn in the Plotter style from these conventions; no drawing files are copied.

## Family 01 project references

- City of Sandpoint lift station replacements, Keller Associates, sheet EI-002 (PDF page 132). The project legend distinguishes connected and non-connecting lines, flange and blind flange, and flat-side-up and flat-side-down eccentric unions. Its piping specification break has a different meaning from the Family 01 omitted-length pipe break. [Drawing set](https://mccmeetingspublic.blob.core.usgovcloudapi.net/sndpointid-meet-b83a1ad7256d4daa98746a21ca1bfefd/ITEM-Attachment-001-95004caaaae84417a6e6ba9084a40bb7.pdf#page=132)
- Johannesburg Water Northern WWTW, JW14060R-CI-002, Legend Sheet 2 (PDF page 48). The project legend shows concentric and eccentric reducers and distinguishes a short sleeve for flexible coupling from expansion joint and flexible hose. [Drawing set](https://scm.johannesburgwater.co.za/wp-content/uploads/2026/06/03-DRAWING-SET-JW14060RRR-NORTHERN-WASTEWATER-TREATMENT-WORKS-DEWATERING-BUILDING-BELT-PRESS-REPLACEMENT_.pdf#page=48)

These project legends informed the visual review. The Family 01 candidates retain the `Proposed` status pending engineering review and acceptance against the governing project legend. The catalogue retains the existing IS 3232, ISA-5.1 and Pahala citations as originally declared.

See [Family 02 verification and provenance](family-02.md#verification-and-provenance) for the audit of valve references and the BIS bulletin on the 2024 edition.

## Follow-up audit of Families 01 and 02

| Reference and location | What it supports | Processvg decision |
|---|---|---|
| Ford, Bacon & Davis, *Art of the P&ID*, slides 56–58 and 90 | Layout should communicate meaningful gravity-flow relationships. Stream arrows need cross-checking between drawings. | Audit explicit reciprocal sheet links. Gravity feasibility still requires elevations and service context. |
| Stockton Terminal, Dock 10–11, `STOT-02-002` rev. 2, PDF p. 1 | Continuation flags carry a drawing reference and line number. The legend distinguishes hydraulic, pneumatic and electrical lines, a specification break, and FO, FC and FL failure tags. | Full flags can carry the line ID. Keep the existing omitted-length pipe break meaning. Add a named hydraulic line using the existing PRV pattern. Processvg legends spell out its FLP label. |
| ProjectMaterials, *P&ID Symbols Reference Guide*, pp. 5–10 | The check-valve triangle and stop bar agree with the Processvg concept. Other pages show alternative pinch, butterfly, diverter and signal marks. | Keep the approved check and foot geometry. Treat the catalogue as a comparative reference. |
| Edraw, *Standard P&ID Symbols Legend*, valve section | The catalogue shows a diagonal check variant and a filled closed gate. | Keep the documented local state and signal conventions. Use a project legend when applying them to a drawing set. |

A specification break changes the piping class or specification at a location. The Family 01 pipe break stands for omitted drawing length on a through connection. Treat a future specification-break symbol as a separate catalogue addition. The attached references provide comparison and project examples. Exact standards verification of the Family 02 glyphs remains pending.
