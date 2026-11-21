// Family 06 Revision 03. Paths use the library’s absolute coordinates.
export const PRIMARY_DEFINITIONS = {
  "fe-mag": {
    interfaces: [
      {id: "in", kind: "process-flow", anchor: [-14, 0]},
      {id: "out", kind: "process-flow", anchor: [14, 0]},
      {id: "instrument", kind: "instrument-interface", anchor: [0, -7]},
    ],
  },
  "fe-flow-ultrasonic": {
    name: "Ultrasonic flowmeter",
    shapes: [
      {d: "M-14 0 L-9 0 M9 0 L14 0 M-9 -7 L9 -7 L9 7 L-9 7 Z"},
      {d: "M-6 -4 L6 4 M-6 4 L6 -4"},
    ],
    interfaces: [
      {id: "in", kind: "process-flow", anchor: [-14, 0]},
      {id: "out", kind: "process-flow", anchor: [14, 0]},
      {id: "instrument", kind: "instrument-interface", anchor: [0, -7]},
    ],
  },
  "fe-flow-turbine": {
    name: "Turbine flowmeter",
    shapes: [
      {d: "M-14 0 L-9 0 M9 0 L14 0 M-9 -7 L9 -7 L9 7 L-9 7 Z"},
      {d: "M0 -5 L0 5 M-4 -2.5 L4 2.5 M-4 2.5 L4 -2.5"},
      {c: [0, 0, 1], fill: "solid", role: "dot"},
    ],
    interfaces: [
      {id: "in", kind: "process-flow", anchor: [-14, 0]},
      {id: "out", kind: "process-flow", anchor: [14, 0]},
      {id: "instrument", kind: "instrument-interface", anchor: [0, -7]},
    ],
  },
  "fe-flow-thermal": {
    name: "Thermal mass flowmeter",
    shapes: [
      {d: "M-14 0 L-7 0 M7 0 L14 0 M-7 -7 L7 -7 L7 7 L-7 7 Z"},
      {t: [0, 0, "T"], fontSize: 10},
    ],
    interfaces: [
      {id: "in", kind: "process-flow", anchor: [-14, 0]},
      {id: "out", kind: "process-flow", anchor: [14, 0]},
      {id: "instrument", kind: "instrument-interface", anchor: [0, -7]},
    ],
  },
  "fe-flow-coriolis": {
    name: "Coriolis flowmeter",
    shapes: [
      {d: "M-14 0 L-10 0 M10 0 L14 0 M-10 -8 L10 -8 L10 8 L-10 8 Z"},
      {d: "M-7 -5 L-7 1 Q-7 6 -3.5 6 Q0 6 0 1 L0 -5 M0 -5 L0 1 Q0 6 3.5 6 Q7 6 7 1 L7 -5"},
    ],
    interfaces: [
      {id: "in", kind: "process-flow", anchor: [-14, 0]},
      {id: "out", kind: "process-flow", anchor: [14, 0]},
      {id: "instrument", kind: "instrument-interface", anchor: [0, -8]},
    ],
  },
  "fe-flow-variable-area": {
    name: "Rotameter (variable area)",
    shapes: [
      {d: "M-7 -13 L7 -13 L3 13 L-3 13 Z M0 -18 L0 -13 M0 13 L0 18"},
      {d: "M-3 -1 L3 -1 L2 2 L-2 2 Z"},
    ],
    interfaces: [
      {id: "in", kind: "process-flow", anchor: [0, 18]},
      {id: "out", kind: "process-flow", anchor: [0, -18]},
    ],
    defaultFlow: "bottom-to-top",
    orientationPolicy: "vertical-default",
  },
  "fe-flow-venturi": {
    name: "Venturi meter",
    shapes: [
      {d: "M-14 -7 L-5 -3 L3 -3 L14 -7 M-14 7 L-5 3 L3 3 L14 7"},
      {d: "M-20 0 L-14 0 M14 0 L20 0"},
    ],
    interfaces: [
      {id: "in", kind: "process-flow", anchor: [-20, 0]},
      {id: "out", kind: "process-flow", anchor: [20, 0]},
    ],
    sensingStations: [{id: "H", anchor: [-12, -6.1]}, {id: "L", anchor: [0, -3]}],
    defaultFlow: "left-to-right",
  },
  "fe-orifice": {
    interfaces: [
      {id: "in", kind: "process-flow", anchor: [-12, 0]},
      {id: "out", kind: "process-flow", anchor: [12, 0]},
    ],
  },
  "fe-ultrasonic": {
    name: "Generic non-contact level",
    interfaces: [
      {id: "instrument", kind: "instrument-interface", anchor: [0, -8]},
    ],
    sensing: {origin: [0, 2], direction: [0, 1]},
  },
  "fe-level-ultrasonic": {
    name: "Ultrasonic level",
    shapes: [
      {d: "M-4 -8 L4 -8 L4 2 L-4 2 Z"},
      {d: "M-5 5 Q0 9 5 5 M-8 9 Q0 16 8 9", role: "secondary"},
    ],
    interfaces: [
      {id: "instrument", kind: "instrument-interface", anchor: [0, -8]},
    ],
    sensing: {origin: [0, 2], direction: [0, 1]},
  },
  "fe-level-radar": {
    name: "Radar level",
    shapes: [
      {d: "M-4 -8 L4 -8 L4 -2 L7 3 L-7 3 L-4 -2 Z"},
      {d: "M-5 6 Q0 9 5 6 M-9 10 Q0 16 9 10", role: "secondary"},
    ],
    interfaces: [
      {id: "instrument", kind: "instrument-interface", anchor: [0, -8]},
    ],
    sensing: {origin: [0, 3], direction: [0, 1]},
  },
  "fe-float": {
    name: "Float level switch",
    shapes: [
      {d: "M0 -13 L0 -2 L6 5"},
      {c: [9, 8, 4]},
    ],
    interfaces: [
      {id: "instrument", kind: "instrument-interface", anchor: [0, -13]},
    ],
    sensing: {origin: [9, 8], direction: null},
  },
  "fe-hydrostatic": {
    name: "Hydrostatic probe",
    shapes: [
      {d: "M0 -13 L0 -7 M-4 -7 L4 -7 L4 8 L-4 8 Z M-3 5 L3 5"},
    ],
    interfaces: [
      {id: "instrument", kind: "instrument-interface", anchor: [0, -13]},
    ],
    sensing: {origin: [0, 8], direction: [0, 1]},
  },
  "fe-level-guided-radar": {
    name: "Guided-wave radar",
    shapes: [
      {d: "M-6 -10 L6 -10 L6 -3 L-6 -3 Z M0 -3 L0 15"},
      {d: "M-3 3 L3 3 M-3 10 L3 10", role: "secondary"},
    ],
    interfaces: [
      {id: "instrument", kind: "instrument-interface", anchor: [0, -10]},
    ],
    sensing: {origin: [0, -3], direction: [0, 1]},
  },
  "fe-level-conductivity": {
    name: "Conductivity level switch",
    shapes: [
      {d: "M-6 -10 L6 -10 L6 -3 L-6 -3 Z M-3 -3 L-3 13 M3 -3 L3 8"},
    ],
    interfaces: [
      {id: "instrument", kind: "instrument-interface", anchor: [0, -10]},
    ],
    sensing: {origin: [0, 8], direction: [0, 1]},
  },
  "fe-analysis-immersion": {
    name: "Immersion probe",
    shapes: [
      {d: "M0 -15 L0 -8 M-4 -8 L4 -8 L4 12 L-4 12 Z M-4 8 L4 8"},
    ],
    interfaces: [
      {id: "instrument", kind: "instrument-interface", anchor: [0, -15]},
    ],
    sensing: {origin: [0, 12], direction: [0, 1]},
  },
  "fe-analysis-insertion": {
    name: "Insertion probe",
    shapes: [
      {d: "M0 -15 L0 -11 M-7 -11 L7 -11 L7 -7 L-7 -7 Z M-4 -7 L4 -7 L4 12 L-4 12 Z M-4 8 L4 8"},
    ],
    interfaces: [
      {id: "instrument", kind: "instrument-interface", anchor: [0, -15]},
      {id: "mount", kind: "mechanical-mount", anchor: [0, -7]},
    ],
    sensing: {origin: [0, 12], direction: [0, 1]},
  },
  "fe-analysis-cell": {
    name: "Flow-through cell",
    shapes: [
      {d: "M-18 0 L-12 0 M12 0 L18 0 M-12 -9 L12 -9 L12 9 L-12 9 Z M0 -15 L0 -9 M0 -9 L0 4 M-3 4 L3 4"},
    ],
    interfaces: [
      {id: "in", kind: "sample-flow", anchor: [-18, 0]},
      {id: "out", kind: "sample-flow", anchor: [18, 0]},
      {id: "instrument", kind: "instrument-interface", anchor: [0, -15]},
    ],
  },
  "fe-analysis-cabinet": {
    name: "Sample-based analyser",
    shapes: [
      {d: "M-18 0 L-13 0 M13 0 L18 0 M-13 -11 L13 -11 L13 11 L-13 11 Z M-9 -7 L9 -7 L9 -3 L-9 -3 Z M-8 4 L8 4"},
    ],
    interfaces: [
      {id: "sample-in", kind: "sample-flow", anchor: [-18, 0]},
      {id: "sample-out", kind: "sample-flow", anchor: [18, 0]},
      {id: "instrument", kind: "instrument-interface", anchor: [0, -11]},
    ],
  },
  "fe-pressure-tap": {
    name: "Pressure tap",
    shapes: [
      {d: "M0 0 L0 -12"},
      {c: [0, 0, 1.25], fill: "solid", role: "dot"},
    ],
    interfaces: [
      {id: "process", kind: "process-boundary", anchor: [0, 0]},
      {id: "impulse", kind: "process-sensing", anchor: [0, -12]},
    ],
  },
  "fe-diaphragm-seal": {
    name: "Diaphragm seal",
    shapes: [
      {d: "M0 0 L0 -6 M-7 -6 L7 -6 L7 -12 L-7 -12 Z M0 -12 L0 -20 M-7 -9 Q-3.5 -12 0 -9 Q3.5 -6 7 -9"},
    ],
    interfaces: [
      {id: "process", kind: "process-sensing", anchor: [0, 0]},
      {id: "instrument", kind: "filled-system", anchor: [0, -20]},
    ],
  },
  "fe-thermowell": {
    name: "Thermowell",
    shapes: [
      {d: "M-5 0 L-5 10 Q0 15 5 10 L5 0 M-7 0 L7 0 M0 -15 L0 9"},
    ],
    interfaces: [
      {id: "mount", kind: "mechanical-mount", anchor: [0, 0]},
      {id: "instrument", kind: "instrument-interface", anchor: [0, -15]},
    ],
    sensing: {origin: [0, 10], direction: [0, 1]},
  },
  "fe-sample-point": {
    name: "Sampling point",
    shapes: [
      {d: "M0 0 L0 -5 M0 -13 L0 -19"},
      {c: [0, 0, 1.25], fill: "solid", role: "dot"},
    ],
    interfaces: [
      {id: "process", kind: "process-boundary", anchor: [0, 0]},
      {id: "sample-out", kind: "sample-flow", anchor: [0, -19]},
    ],
  },
  "fe-flume": {
    interfaces: [
      {id: "in", kind: "process-flow", anchor: [-14, 0]},
      {id: "out", kind: "process-flow", anchor: [14, 0]},
    ],
  },
};

export const ANALYTE_PRESETS = {
  "fe-analysis-do": {name: "Dissolved oxygen", analyte: "do", identityGlyph: "DO", base: "fe-analysis-immersion"},
  "fe-analysis-ph": {name: "pH", analyte: "ph", identityGlyph: "pH", base: "fe-analysis-immersion"},
  "fe-analysis-orp": {name: "Oxidation-reduction potential", analyte: "orp", identityGlyph: "ORP", base: "fe-analysis-immersion"},
  "fe-analysis-conductivity": {name: "Conductivity", analyte: "conductivity", identityGlyph: "EC", base: "fe-analysis-immersion"},
  "fe-analysis-mlss": {name: "Mixed liquor suspended solids", analyte: "mlss", identityGlyph: "MLSS", base: "fe-analysis-immersion"},
  "fe-analysis-turbidity": {name: "Turbidity", analyte: "turbidity", identityGlyph: "TUR", base: "fe-analysis-immersion"},
  "fe-analysis-chlorine": {name: "Residual chlorine (specify species)", analyte: "chlorine", identityGlyph: "Cl₂", base: "fe-analysis-immersion"},
  "fe-analysis-ammonium": {name: "Ammonium (specify reporting basis)", analyte: "ammonium", identityGlyph: "NH₄", base: "fe-analysis-immersion"},
  "fe-analysis-nitrate": {name: "Nitrate (specify reporting basis)", analyte: "nitrate", identityGlyph: "NO₃", base: "fe-analysis-immersion"},
  "fe-analysis-phosphate": {name: "Phosphate (specify reporting basis)", analyte: "phosphate", identityGlyph: "PO₄", base: "fe-analysis-immersion"},
};
