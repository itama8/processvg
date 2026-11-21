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

## Families 01 and 02 · Symbol references and limits

| Reference and location | Observed convention | Processvg decision |
| --- | --- | --- |
| Ford, Bacon & Davis / AIChE, *Art of the P&ID*, slides 18, 21, 56–62, 88 and 90 | Repeating right-angle hydraulic marks, butterfly and knife NC, clear routing, specification breaks in a staged checklist, and continuation cross-checks. | Use explicit NC for typed butterfly design closure. Preserve the current knife convention. Keep the reciprocal sheet audit. See the [94-slide inventory](art-of-the-pid-audit.md). |
| Terminal P&ID legend, user-supplied, PDF p. 1 | A specification break uses inward triangles on a continuous pipe with a transverse boundary. The legend distinguishes signal media, shows continuation references with line numbers, and uses FO, FC and FL. | Add `line-spec-break` with optional class labels. Class positions and local dimensions are Processvg choices. The symbol denotes a piping specification boundary. `line-break` denotes omitted length. |
| ProjectMaterials, *P&ID Symbols Reference*, PDF pp. 5 and 10 | The manual-valve page shows opposing chevrons for pinch and a separate projecting knife blade. The signal page shows repeating slanted hooks for hydraulic and paired slashes for air. | Fit the pinch compression chevrons inside the sleeve outline and use one Family 01/02 hydraulic hook/fallback rule. |
| Edraw, *Standard P&ID Symbols Legend*, p. 1, Valves section | Opposed pinch chevrons, distinct knife and slide blades, a diagonal butterfly disc and alternative check geometries. It also depicts separate control-valve and back-pressure regulator examples. | Retain the diagonal butterfly and use explicit pressure-reducing text and downstream sensing. Preserve the approved NRV and foot valve. |

The four supplied PDFs are comparative sources for drafting, with project-specific examples. The pinched sleeve, closed-state rendering, hook pitch and short-run threshold are Processvg design decisions. These sources and the reduced review sheets give no equipment sizing or hydraulic validation. Exact glyph verification against the governing project legend and licensed standards remains pending.

In the Chromium monochrome view and the 300 dpi one-bit print raster, the 0.65× pinch sleeve read separately from the knife blade, with NC carrying the closed state at that reduction. The reduced butterfly centre approached the stroke width, while the NC remained legible. The hooked hydraulic pattern separated from standby, electrical and paired air slashes. The short dash needed its caption. The specification-break labels stayed on their respective piping sides through all four orientations.
