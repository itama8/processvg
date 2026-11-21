export default {
  "schema": "processvg.family07.design-final.v3",
  "sourceRepository": "itama8/processvg",
  "sourceBlobSha": "4711845074bc854d6750008c170f20d2dabee505",
  "approvalStatus": "User-approved design geometry and composition; reference/standards verification and implementation testing pending.",
  "svgEngineRequirement": "support full SVG path commands and arbitrary transforms; existing place() does not handle H/V/Q/C/T correctly",
  "families": {
    "existing": 6,
    "selectedTasks": 27,
    "distinctApprovedIds": 31,
    "additionalLobeVariantCards": 1
  },
  "symbols": [
    {
      "id": "pump-centrifugal",
      "label": "Centrifugal pump",
      "group": "pump",
      "status": "design approved; compact source geometry preserved",
      "geometry": {
        "paths": [
          "M0 -9 L14 -9"
        ],
        "circles": [
          [
            0,
            0,
            9
          ]
        ],
        "texts": []
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -9,
            0
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            14,
            -9
          ],
          "kind": "liquid-process",
          "direction": "out"
        }
      ],
      "notes": "Compact exactly matches source. New volute is optional; original ID and port coordinates remain unchanged.",
      "variants": {
        "compact": {
          "paths": [
            "M0 -9 L14 -9"
          ],
          "circles": [
            [
              0,
              0,
              9
            ]
          ]
        },
        "volute": {
          "paths": [
            "M0 -9 H14 V-3 H8.49 A9 9 0 1 1 0 -9 Z"
          ],
          "circles": []
        }
      },
      "defaultVariant": "compact"
    },
    {
      "id": "pump-submersible",
      "label": "Submersible wastewater pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-6 -16 H6 V-2 H-6 Z",
          "M-7 -2 H7 Q12 -1 12 5 V9 H-9 V5 Q-9 0 -7 -2 Z",
          "M12 3 H18 V-13 M18 -13 H24"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "wet_well_intake",
          "anchor": [
            0,
            9
          ],
          "kind": "liquid-environment",
          "direction": "in",
          "schematicVisible": false,
          "physicalViewVisible": true
        },
        {
          "name": "discharge",
          "anchor": [
            24,
            -13
          ],
          "kind": "liquid-process",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "power_cable",
          "anchor": [
            -3,
            -16
          ],
          "kind": "electrical",
          "direction": "in",
          "schematicVisible": false,
          "physicalViewVisible": true
        }
      ],
      "notes": "Refined schematic displays motor housing, pump casing and discharge only; no cable, feet or guide rails. Environmental intake and electrical interfaces remain semantic, visible in relevant physical/electrical views. Legacy drawing geometry preserved.",
      "variants": {
        "legacy": {
          "paths": [
            "M-6 -16 H6 V-2 H-6 Z",
            "M-7 -2 H7 Q12 -1 12 5 V9 H-9 V5 Q-9 0 -7 -2 Z",
            "M12 3 H18 V-13 M18 -13 H24",
            "M-5 9 V13 M5 9 V13 M-8 13 H8",
            "M-3 -16 V-20"
          ],
          "circles": [],
          "texts": []
        },
        "refined": {
          "paths": [
            "M-6 -16 H6 V-2 H-6 Z",
            "M-7 -2 H7 Q12 -1 12 5 V9 H-9 V5 Q-9 0 -7 -2 Z",
            "M12 3 H18 V-13 M18 -13 H24"
          ],
          "circles": [],
          "texts": []
        }
      },
      "defaultVariant": "refined",
      "legacyPorts": [
        [
          12,
          -16
        ]
      ]
    },
    {
      "id": "pump-pc",
      "label": "Progressing cavity pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-14 -5 H14 V5 H-14 Z",
          "M-11 0 Q-8 -4 -5 0 T1 0 T7 0 T11 0"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -14,
            0
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            14,
            0
          ],
          "kind": "liquid-process",
          "direction": "out"
        },
        {
          "name": "shaft",
          "anchor": [
            0,
            -5
          ],
          "kind": "mechanical-drive",
          "direction": "in"
        }
      ],
      "notes": "Smooth rotor mark is primary ink, not secondary."
    },
    {
      "id": "pump-dosing",
      "label": "Metering / dosing pump",
      "group": "pump",
      "status": "design approved; legacy assembly retained and head/drive composition required",
      "geometry": {
        "paths": [
          "M-12 0 H-6 M6 0 H12",
          "M-6 -5 H6 V5 H-6 Z",
          "M0 5 V9",
          "M-6 9 H6 V21 H-6 Z"
        ],
        "circles": [],
        "texts": [
          [
            0,
            17,
            "M"
          ]
        ]
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -12,
            0
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            12,
            0
          ],
          "kind": "liquid-process",
          "direction": "out"
        }
      ],
      "notes": "Original drawn envelope preserved in legacy preset, with mechanism and drive separately instantiated.",
      "defaultVariant": "legacy-assembly",
      "variants": {
        "legacy-assembly": {
          "paths": [
            "M-12 0 H-6 M6 0 H12",
            "M-6 -5 H6 V5 H-6 Z",
            "M0 5 V9",
            "M-6 9 H6 V21 H-6 Z"
          ],
          "circles": [],
          "texts": [
            [
              0,
              17,
              "M"
            ]
          ]
        }
      }
    },
    {
      "id": "blower-lobe",
      "label": "Rotary lobe blower",
      "group": "blower",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-16 0 H-11 M11 0 H16 M-11 -12 Q-11 -15 -8 -15 H8 Q11 -15 11 -12 V12 Q11 15 8 15 H-8 Q-11 15 -11 12 Z",
          "M5.050 -6.000 L5.008 -5.562 L4.884 -5.139 L4.684 -4.745 L4.416 -4.393 L4.091 -4.092 L3.724 -3.850 L3.328 -3.670 L2.919 -3.551 L2.510 -3.490 L2.114 -3.480 L1.742 -3.512 L1.400 -3.575 L1.093 -3.656 L0.821 -3.744 L0.583 -3.826 L0.372 -3.892 L0.181 -3.935 L0.000 -3.950 L-0.181 -3.935 L-0.372 -3.892 L-0.583 -3.826 L-0.821 -3.744 L-1.093 -3.656 L-1.400 -3.575 L-1.742 -3.512 L-2.114 -3.480 L-2.510 -3.490 L-2.919 -3.551 L-3.328 -3.670 L-3.724 -3.850 L-4.091 -4.092 L-4.416 -4.393 L-4.684 -4.745 L-4.884 -5.139 L-5.008 -5.562 L-5.050 -6.000 L-5.008 -6.438 L-4.884 -6.861 L-4.684 -7.255 L-4.416 -7.607 L-4.091 -7.908 L-3.724 -8.150 L-3.328 -8.330 L-2.919 -8.449 L-2.510 -8.510 L-2.114 -8.520 L-1.742 -8.488 L-1.400 -8.425 L-1.093 -8.344 L-0.821 -8.256 L-0.583 -8.174 L-0.372 -8.108 L-0.181 -8.065 L-0.000 -8.050 L0.181 -8.065 L0.372 -8.108 L0.583 -8.174 L0.821 -8.256 L1.093 -8.344 L1.400 -8.425 L1.742 -8.488 L2.114 -8.520 L2.510 -8.510 L2.919 -8.449 L3.328 -8.330 L3.724 -8.150 L4.091 -7.908 L4.416 -7.607 L4.684 -7.255 L4.884 -6.861 L5.008 -6.438 Z",
          "M3.550 6.000 L3.277 6.287 L2.991 6.527 L2.705 6.725 L2.430 6.884 L2.176 7.015 L1.949 7.125 L1.753 7.228 L1.588 7.332 L1.450 7.450 L1.332 7.588 L1.228 7.753 L1.125 7.949 L1.015 8.176 L0.884 8.430 L0.725 8.705 L0.527 8.991 L0.287 9.277 L0.000 9.550 L-0.332 9.796 L-0.706 10.001 L-1.113 10.153 L-1.544 10.242 L-1.986 10.259 L-2.425 10.199 L-2.845 10.063 L-3.231 9.851 L-3.571 9.571 L-3.851 9.231 L-4.063 8.845 L-4.199 8.425 L-4.259 7.986 L-4.242 7.544 L-4.153 7.113 L-4.001 6.706 L-3.796 6.332 L-3.550 6.000 L-3.277 5.713 L-2.991 5.473 L-2.705 5.275 L-2.430 5.116 L-2.176 4.985 L-1.949 4.875 L-1.753 4.772 L-1.588 4.668 L-1.450 4.550 L-1.332 4.412 L-1.228 4.247 L-1.125 4.051 L-1.015 3.824 L-0.884 3.570 L-0.725 3.295 L-0.527 3.009 L-0.287 2.723 L-0.000 2.450 L0.332 2.204 L0.706 1.999 L1.113 1.847 L1.544 1.758 L1.986 1.741 L2.425 1.801 L2.845 1.937 L3.231 2.149 L3.571 2.429 L3.851 2.769 L4.063 3.155 L4.199 3.575 L4.259 4.014 L4.242 4.456 L4.153 4.887 L4.001 5.294 L3.796 5.668 Z"
        ],
        "circles": [],
        "texts": [],
        "rotors": 2,
        "notes": "Schematic profile only; not dimensioned mechanical rotor geometry."
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -16,
            0
          ],
          "kind": "gas-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            16,
            0
          ],
          "kind": "gas-process",
          "direction": "out"
        }
      ],
      "notes": "Two- and three-lobe schematic motifs approved. Existing drawings retain original geometry via legacy variant; neither motif asserts a manufacturer or actual rotor count.",
      "variants": {
        "2-lobe": {
          "paths": [
            "M-16 0 H-11 M11 0 H16 M-11 -12 Q-11 -15 -8 -15 H8 Q11 -15 11 -12 V12 Q11 15 8 15 H-8 Q-11 15 -11 12 Z",
            "M5.050 -6.000 L5.008 -5.562 L4.884 -5.139 L4.684 -4.745 L4.416 -4.393 L4.091 -4.092 L3.724 -3.850 L3.328 -3.670 L2.919 -3.551 L2.510 -3.490 L2.114 -3.480 L1.742 -3.512 L1.400 -3.575 L1.093 -3.656 L0.821 -3.744 L0.583 -3.826 L0.372 -3.892 L0.181 -3.935 L0.000 -3.950 L-0.181 -3.935 L-0.372 -3.892 L-0.583 -3.826 L-0.821 -3.744 L-1.093 -3.656 L-1.400 -3.575 L-1.742 -3.512 L-2.114 -3.480 L-2.510 -3.490 L-2.919 -3.551 L-3.328 -3.670 L-3.724 -3.850 L-4.091 -4.092 L-4.416 -4.393 L-4.684 -4.745 L-4.884 -5.139 L-5.008 -5.562 L-5.050 -6.000 L-5.008 -6.438 L-4.884 -6.861 L-4.684 -7.255 L-4.416 -7.607 L-4.091 -7.908 L-3.724 -8.150 L-3.328 -8.330 L-2.919 -8.449 L-2.510 -8.510 L-2.114 -8.520 L-1.742 -8.488 L-1.400 -8.425 L-1.093 -8.344 L-0.821 -8.256 L-0.583 -8.174 L-0.372 -8.108 L-0.181 -8.065 L-0.000 -8.050 L0.181 -8.065 L0.372 -8.108 L0.583 -8.174 L0.821 -8.256 L1.093 -8.344 L1.400 -8.425 L1.742 -8.488 L2.114 -8.520 L2.510 -8.510 L2.919 -8.449 L3.328 -8.330 L3.724 -8.150 L4.091 -7.908 L4.416 -7.607 L4.684 -7.255 L4.884 -6.861 L5.008 -6.438 Z",
            "M3.550 6.000 L3.277 6.287 L2.991 6.527 L2.705 6.725 L2.430 6.884 L2.176 7.015 L1.949 7.125 L1.753 7.228 L1.588 7.332 L1.450 7.450 L1.332 7.588 L1.228 7.753 L1.125 7.949 L1.015 8.176 L0.884 8.430 L0.725 8.705 L0.527 8.991 L0.287 9.277 L0.000 9.550 L-0.332 9.796 L-0.706 10.001 L-1.113 10.153 L-1.544 10.242 L-1.986 10.259 L-2.425 10.199 L-2.845 10.063 L-3.231 9.851 L-3.571 9.571 L-3.851 9.231 L-4.063 8.845 L-4.199 8.425 L-4.259 7.986 L-4.242 7.544 L-4.153 7.113 L-4.001 6.706 L-3.796 6.332 L-3.550 6.000 L-3.277 5.713 L-2.991 5.473 L-2.705 5.275 L-2.430 5.116 L-2.176 4.985 L-1.949 4.875 L-1.753 4.772 L-1.588 4.668 L-1.450 4.550 L-1.332 4.412 L-1.228 4.247 L-1.125 4.051 L-1.015 3.824 L-0.884 3.570 L-0.725 3.295 L-0.527 3.009 L-0.287 2.723 L-0.000 2.450 L0.332 2.204 L0.706 1.999 L1.113 1.847 L1.544 1.758 L1.986 1.741 L2.425 1.801 L2.845 1.937 L3.231 2.149 L3.571 2.429 L3.851 2.769 L4.063 3.155 L4.199 3.575 L4.259 4.014 L4.242 4.456 L4.153 4.887 L4.001 5.294 L3.796 5.668 Z"
          ],
          "circles": [],
          "texts": [],
          "rotors": 2,
          "notes": "Schematic profile only; not dimensioned mechanical rotor geometry."
        },
        "3-lobe": {
          "paths": [
            "M-16 0 H-11 M11 0 H16 M-11 -12 Q-11 -15 -8 -15 H8 Q11 -15 11 -12 V12 Q11 15 8 15 H-8 Q-11 15 -11 12 Z",
            "M5.050 -6.000 L4.980 -5.564 L4.775 -5.158 L4.454 -4.807 L4.041 -4.529 L3.569 -4.336 L3.074 -4.225 L2.590 -4.186 L2.145 -4.200 L1.760 -4.240 L1.447 -4.276 L1.205 -4.279 L1.025 -4.225 L0.888 -4.096 L0.770 -3.885 L0.644 -3.595 L0.486 -3.243 L0.276 -2.850 L0.000 -2.450 L-0.343 -2.077 L-0.747 -1.765 L-1.193 -1.546 L-1.658 -1.443 L-2.113 -1.469 L-2.525 -1.627 L-2.867 -1.905 L-3.117 -2.285 L-3.260 -2.740 L-3.294 -3.236 L-3.226 -3.741 L-3.074 -4.225 L-2.866 -4.664 L-2.631 -5.042 L-2.405 -5.356 L-2.217 -5.609 L-2.093 -5.817 L-2.050 -6.000 L-2.093 -6.183 L-2.217 -6.391 L-2.405 -6.644 L-2.631 -6.958 L-2.866 -7.336 L-3.074 -7.775 L-3.226 -8.259 L-3.294 -8.764 L-3.260 -9.260 L-3.117 -9.715 L-2.867 -10.095 L-2.525 -10.373 L-2.113 -10.531 L-1.658 -10.557 L-1.193 -10.454 L-0.747 -10.235 L-0.343 -9.923 L-0.000 -9.550 L0.276 -9.150 L0.486 -8.757 L0.644 -8.405 L0.770 -8.115 L0.888 -7.904 L1.025 -7.775 L1.205 -7.721 L1.447 -7.724 L1.760 -7.760 L2.145 -7.800 L2.590 -7.814 L3.074 -7.775 L3.569 -7.664 L4.041 -7.471 L4.454 -7.193 L4.775 -6.842 L4.980 -6.436 Z",
            "M4.300 6.000 L3.923 6.343 L3.496 6.616 L3.054 6.818 L2.631 6.958 L2.256 7.052 L1.949 7.125 L1.721 7.205 L1.570 7.318 L1.486 7.486 L1.447 7.724 L1.428 8.039 L1.400 8.425 L1.336 8.866 L1.214 9.336 L1.019 9.804 L0.747 10.235 L0.402 10.593 L0.000 10.849 L-0.436 10.980 L-0.877 10.973 L-1.294 10.829 L-1.658 10.557 L-1.949 10.179 L-2.150 9.724 L-2.259 9.226 L-2.282 8.719 L-2.236 8.236 L-2.145 7.800 L-2.039 7.428 L-1.949 7.125 L-1.904 6.888 L-1.926 6.701 L-2.030 6.544 L-2.217 6.391 L-2.480 6.217 L-2.800 6.000 L-3.150 5.724 L-3.496 5.384 L-3.804 4.981 L-4.041 4.529 L-4.179 4.051 L-4.199 3.575 L-4.095 3.133 L-3.869 2.754 L-3.535 2.465 L-3.117 2.285 L-2.645 2.223 L-2.150 2.276 L-1.664 2.431 L-1.214 2.664 L-0.818 2.946 L-0.486 3.243 L-0.217 3.520 L-0.000 3.749 L0.183 3.907 L0.356 3.981 L0.544 3.970 L0.770 3.885 L1.052 3.744 L1.400 3.575 L1.814 3.410 L2.282 3.281 L2.785 3.215 L3.294 3.236 L3.777 3.355 L4.199 3.575 L4.531 3.887 L4.745 4.273 L4.829 4.706 L4.775 5.158 L4.593 5.598 Z"
          ],
          "circles": [],
          "texts": [],
          "rotors": 3,
          "notes": "Schematic profile only; not dimensioned mechanical rotor geometry."
        },
        "legacy": {
          "paths": [
            "M-16 0 H-11 M11 0 H16",
            "M-11 -12 Q-11 -15 -8 -15 H8 Q11 -15 11 -12 V12 Q11 15 8 15 H-8 Q-11 15 -11 12 Z",
            "M0 -11 C-4 -13 -8 -9 -5 -5 C-8 -1 -4 3 0 1 C4 3 8 -1 5 -5 C8 -9 4 -13 0 -11 Z",
            "M0 1 C-4 -1 -8 3 -5 7 C-8 11 -4 15 0 13 C4 15 8 11 5 7 C8 3 4 -1 0 1 Z"
          ],
          "circles": [],
          "texts": []
        }
      },
      "defaultVariant": "2-lobe"
    },
    {
      "id": "blower-centrifugal",
      "label": "Centrifugal / turbo blower",
      "group": "blower",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M0 -9 H14 V-3 H8.49 A9 9 0 1 1 0 -9 Z"
        ],
        "circles": [
          [
            0,
            0,
            3.5
          ]
        ],
        "texts": []
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -9,
            0
          ],
          "kind": "gas-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            14,
            -9
          ],
          "kind": "gas-process",
          "direction": "out"
        }
      ],
      "notes": "Maintain original two process port coordinates; identify air service in semantic metadata."
    },
    {
      "id": "pump-vertical-turbine",
      "label": "Vertical turbine pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-5 -19 H5 V-11 H-5 Z",
          "M0 -11 V-6",
          "M-4 -6 H4 V15 H-4 Z",
          "M-7 15 H7 L4 20 H-4 Z",
          "M4 -3 H16 V3 H4"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "intake",
          "anchor": [
            0,
            20
          ],
          "kind": "liquid-environment",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            16,
            0
          ],
          "kind": "liquid-process",
          "direction": "out"
        }
      ],
      "notes": "Section-like schematic; actual bowl/stage geometry vendor specific."
    },
    {
      "id": "pump-inline",
      "label": "Vertical inline pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-23 0 H-10 M10 0 H23",
          "M-6 -8 V-14 H6 V-8"
        ],
        "circles": [
          [
            0,
            0,
            10
          ]
        ],
        "texts": []
      },
      "ports": [
        {
          "name": "inlet",
          "anchor": [
            -23,
            0
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "outlet",
          "anchor": [
            23,
            0
          ],
          "kind": "liquid-process",
          "direction": "out"
        },
        {
          "name": "shaft",
          "anchor": [
            0,
            -14
          ],
          "kind": "mechanical-drive",
          "direction": "in"
        }
      ],
      "notes": ""
    },
    {
      "id": "pump-diaphragm",
      "label": "Diaphragm pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-12 M12 0 H24",
          "M-12 -8 Q-16 0 -12 8 H12 Q16 0 12 -8 Z",
          "M0 -8 Q-7 0 0 8 Q7 0 0 -8"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -24,
            0
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            24,
            0
          ],
          "kind": "liquid-process",
          "direction": "out"
        },
        {
          "name": "drive",
          "anchor": [
            0,
            -8
          ],
          "kind": "mechanical-drive",
          "direction": "in"
        }
      ],
      "notes": "Drive head illustrative; do not imply air vs motor until drive composed."
    },
    {
      "id": "pump-peristaltic",
      "label": "Peristaltic / hose pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 5 H-12 Q-9 -10 0 -10 Q9 -10 12 5 H24"
        ],
        "circles": [
          [
            0,
            0,
            12
          ],
          [
            -4,
            -2,
            2
          ],
          [
            4,
            -2,
            2
          ],
          [
            0,
            5,
            2
          ]
        ],
        "texts": []
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -24,
            5
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            24,
            5
          ],
          "kind": "liquid-process",
          "direction": "out"
        },
        {
          "name": "drive",
          "anchor": [
            0,
            -12
          ],
          "kind": "mechanical-drive",
          "direction": "in"
        }
      ],
      "notes": ""
    },
    {
      "id": "pump-rotary-lobe",
      "label": "Rotary lobe liquid pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-13 M13 0 H24",
          "M-13 -10 H13 V10 H-13 Z",
          "M-6 -7 C-12 -7 -12 -1 -6 -1 C0 -1 0 5 -6 5 C-12 5 -12 -1 -6 -1",
          "M6 -7 C12 -7 12 -1 6 -1 C0 -1 0 5 6 5 C12 5 12 -1 6 -1"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -24,
            0
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            24,
            0
          ],
          "kind": "liquid-process",
          "direction": "out"
        },
        {
          "name": "shaft",
          "anchor": [
            0,
            -10
          ],
          "kind": "mechanical-drive",
          "direction": "in"
        }
      ],
      "notes": "Use same lobe motif as blower but independent medium and hydraulic behaviour."
    },
    {
      "id": "pump-gear",
      "label": "Gear pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-13 M13 0 H24",
          "M-13 -10 H13 V10 H-13 Z"
        ],
        "circles": [
          [
            -6,
            0,
            5
          ],
          [
            6,
            0,
            5
          ],
          [
            -6,
            0,
            1.4
          ],
          [
            6,
            0,
            1.4
          ]
        ],
        "texts": []
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -24,
            0
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            24,
            0
          ],
          "kind": "liquid-process",
          "direction": "out"
        },
        {
          "name": "drive",
          "anchor": [
            0,
            -10
          ],
          "kind": "mechanical-drive",
          "direction": "in"
        }
      ],
      "notes": "Tooth markers optionally generated; shape in preview includes gear circles only."
    },
    {
      "id": "pump-piston",
      "label": "Reciprocating piston pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-12 M12 0 H24",
          "M-12 -7 H12 V7 H-12 Z",
          "M-3 -7 V7 M-3 0 H7"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "suction",
          "anchor": [
            -24,
            0
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "discharge",
          "anchor": [
            24,
            0
          ],
          "kind": "liquid-process",
          "direction": "out"
        },
        {
          "name": "drive",
          "anchor": [
            7,
            0
          ],
          "kind": "mechanical-drive",
          "direction": "in"
        }
      ],
      "notes": ""
    },
    {
      "id": "pump-archimedes",
      "label": "Archimedes screw pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-18 12 L18 -12 M-14 16 L22 -8",
          "M-18 6 L-10 14 M-11 1 L-3 9 M-4 -4 L4 4 M3 -9 L11 -1 M10 -14 L18 -6"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "lower_intake",
          "anchor": [
            -18,
            12
          ],
          "kind": "liquid-environment",
          "direction": "in"
        },
        {
          "name": "upper_discharge",
          "anchor": [
            18,
            -12
          ],
          "kind": "liquid-environment",
          "direction": "out"
        },
        {
          "name": "drive",
          "anchor": [
            18,
            -15
          ],
          "kind": "mechanical-drive",
          "direction": "in"
        }
      ],
      "notes": "Open channel lifting screw, not enclosed screw pump; section representation requires inclination and elevations."
    },
    {
      "id": "pump-airlift",
      "label": "Airlift pump",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-3 18 V-16 H3 V18",
          "M-15 13 H-3",
          "M-15 13 V-5",
          "M-8 10 L-3 8 L-8 6",
          "M0 11 V-12 M-2 -8 L0 -12 L2 -8",
          "M0 -16 V-22",
          "M0 18 V23"
        ],
        "circles": [
          [
            0,
            5,
            1
          ],
          [
            0,
            0,
            1
          ],
          [
            -1,
            -5,
            0.8
          ]
        ],
        "texts": []
      },
      "ports": [
        {
          "name": "liquid_intake",
          "anchor": [
            0,
            23
          ],
          "kind": "liquid-environment",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "air_injection",
          "anchor": [
            -15,
            13
          ],
          "kind": "gas-process",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "mixed_discharge",
          "anchor": [
            0,
            -22
          ],
          "kind": "two-phase-process",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Three externally attachable endpoints: liquid/environment intake, compressed-air inlet, two-phase outlet. Branch stubs added to the initial concept for visible port terminals; no shaft or mechanical drive.",
      "legacyProposedPorts": [
        {
          "name": "liquid_intake",
          "anchor": [
            0,
            18
          ],
          "kind": "liquid-environment",
          "direction": "in"
        },
        {
          "name": "air_injection",
          "anchor": [
            -15,
            13
          ],
          "kind": "gas-process",
          "direction": "in"
        },
        {
          "name": "mixed_discharge",
          "anchor": [
            0,
            -16
          ],
          "kind": "two-phase-process",
          "direction": "out"
        }
      ]
    },
    {
      "id": "pump-eductor",
      "label": "Ejector / eductor",
      "group": "pump",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-12 L-3 -4 H5 L15 -8 V8 L5 4 H-3 L-12 0 H-24",
          "M0 17 V5 M-4 9 L0 5 L4 9",
          "M15 0 H24"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "motive_fluid",
          "anchor": [
            -24,
            0
          ],
          "kind": "liquid-process",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "suction",
          "anchor": [
            0,
            17
          ],
          "kind": "liquid-process",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "mixed_discharge",
          "anchor": [
            24,
            0
          ],
          "kind": "liquid-process",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Three visible terminals: motive fluid inlet, entrained suction inlet, mixed discharge. Motive and suction media require compatibility verification; neither is a mechanical-drive shaft."
    },
    {
      "id": "blower-screw",
      "label": "Rotary screw blower",
      "group": "blower",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-23 0 H-15 M15 0 H23",
          "M-15 -10 H15 V10 H-15 Z",
          "M-12 -7 L-6 0 L-12 7 M-4 -7 L2 0 L-4 7 M4 -7 L10 0 L4 7"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "air_inlet",
          "anchor": [
            -23,
            0
          ],
          "kind": "gas-process",
          "direction": "in"
        },
        {
          "name": "air_outlet",
          "anchor": [
            23,
            0
          ],
          "kind": "gas-process",
          "direction": "out"
        }
      ],
      "notes": "Not interchangeable with liquid Archimedes screw; two screw rotors represented by simplified diagonal marks."
    },
    {
      "id": "blower-multistage",
      "label": "Multistage centrifugal blower",
      "group": "blower",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-18 M18 0 H24",
          "M-18 -8 H18 V8 H-18 Z"
        ],
        "circles": [
          [
            -11,
            0,
            4.5
          ],
          [
            0,
            0,
            4.5
          ],
          [
            11,
            0,
            4.5
          ]
        ],
        "texts": []
      },
      "ports": [
        {
          "name": "air_inlet",
          "anchor": [
            -24,
            0
          ],
          "kind": "gas-process",
          "direction": "in"
        },
        {
          "name": "air_outlet",
          "anchor": [
            24,
            0
          ],
          "kind": "gas-process",
          "direction": "out"
        }
      ],
      "notes": "Repeated impeller cells indicate multistage arrangement; count can be parameterized."
    },
    {
      "id": "compressor-piston",
      "label": "Reciprocating compressor",
      "group": "blower",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-11 M11 0 H24",
          "M-11 -10 H11 V10 H-11 Z",
          "M-11 -2 H11 M0 -2 V7"
        ],
        "circles": [
          [
            0,
            7,
            2
          ]
        ],
        "texts": []
      },
      "ports": [
        {
          "name": "air_inlet",
          "anchor": [
            -24,
            0
          ],
          "kind": "gas-process",
          "direction": "in"
        },
        {
          "name": "air_outlet",
          "anchor": [
            24,
            0
          ],
          "kind": "gas-process",
          "direction": "out"
        }
      ],
      "notes": "Compressors grouped for drawing convenience; operating envelope differs from blowers."
    },
    {
      "id": "pump-liquid-ring",
      "label": "Liquid ring blower / vacuum pump",
      "group": "blower",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-11 M11 0 H24"
        ],
        "circles": [
          [
            0,
            0,
            11
          ],
          [
            0,
            2,
            7
          ],
          [
            0,
            -2,
            2
          ]
        ],
        "texts": []
      },
      "ports": [
        {
          "name": "gas_inlet",
          "anchor": [
            -24,
            0
          ],
          "kind": "gas-process",
          "direction": "in"
        },
        {
          "name": "gas_outlet",
          "anchor": [
            24,
            0
          ],
          "kind": "gas-process",
          "direction": "out"
        },
        {
          "name": "seal_liquid",
          "anchor": [
            0,
            11
          ],
          "kind": "liquid-process",
          "direction": "in"
        }
      ],
      "notes": "Third seal-liquid interface; representative geometry requires process legend agreement."
    },
    {
      "id": "drive-electric-motor",
      "label": "Electric motor",
      "group": "drive",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-8 -10 H8 V10 H-8 Z"
        ],
        "circles": [],
        "texts": [
          [
            0,
            2.5,
            "M"
          ]
        ]
      },
      "ports": [
        {
          "name": "shaft",
          "anchor": [
            8,
            0
          ],
          "kind": "mechanical-drive",
          "direction": "out"
        },
        {
          "name": "electric_supply",
          "anchor": [
            -8,
            0
          ],
          "kind": "electrical-power",
          "direction": "in"
        }
      ],
      "notes": "Schematic M glyph; do not imply shaft and electrical terminals occupy same physical space."
    },
    {
      "id": "drive-gearbox",
      "label": "Gearbox",
      "group": "drive",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-10 -9 H10 V9 H-10 Z"
        ],
        "circles": [],
        "texts": [
          [
            0,
            2.5,
            "G"
          ]
        ]
      },
      "ports": [
        {
          "name": "input_shaft",
          "anchor": [
            -10,
            0
          ],
          "kind": "mechanical-drive",
          "direction": "in"
        },
        {
          "name": "output_shaft",
          "anchor": [
            10,
            0
          ],
          "kind": "mechanical-drive",
          "direction": "out"
        }
      ],
      "notes": ""
    },
    {
      "id": "drive-coupling",
      "label": "Mechanical shaft coupling",
      "group": "drive",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-7 M7 0 H24",
          "M-7 -6 H-1 V6 H-7 Z",
          "M1 -6 H7 V6 H1 Z"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "shaft_a",
          "anchor": [
            -24,
            0
          ],
          "kind": "mechanical-drive",
          "direction": "bidirectional"
        },
        {
          "name": "shaft_b",
          "anchor": [
            24,
            0
          ],
          "kind": "mechanical-drive",
          "direction": "bidirectional"
        }
      ],
      "notes": ""
    },
    {
      "id": "drive-vfd",
      "label": "Variable frequency drive",
      "group": "drive",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-14 -11 H14 V11 H-14 Z",
          "M-10 -5 Q-5 -10 0 -5 T10 -5"
        ],
        "circles": [],
        "texts": [
          [
            0,
            6,
            "VFD"
          ]
        ]
      },
      "ports": [
        {
          "name": "electric_in",
          "anchor": [
            -14,
            0
          ],
          "kind": "electrical-power",
          "direction": "in"
        },
        {
          "name": "electric_out",
          "anchor": [
            14,
            0
          ],
          "kind": "electrical-power",
          "direction": "out"
        },
        {
          "name": "control",
          "anchor": [
            0,
            -11
          ],
          "kind": "control-signal",
          "direction": "in"
        }
      ],
      "notes": "Separate electrical/control glyph. Never placed along mechanical shaft chain.",
      "shaftChainEligible": false,
      "connectionLayer": "electrical/control"
    },
    {
      "id": "drive-diesel",
      "label": "Diesel engine drive",
      "group": "drive",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-14 -11 H14 V11 H-14 Z",
          "M-9 -5 H9 V-2 H-9 Z"
        ],
        "circles": [],
        "texts": [
          [
            0,
            6,
            "D"
          ]
        ]
      },
      "ports": [
        {
          "name": "shaft",
          "anchor": [
            14,
            0
          ],
          "kind": "mechanical-drive",
          "direction": "out"
        },
        {
          "name": "fuel",
          "anchor": [
            -14,
            0
          ],
          "kind": "fuel-process",
          "direction": "in"
        }
      ],
      "notes": "Fuel, exhaust and air intake connections modelled only when relevant."
    },
    {
      "id": "drive-integral-motor",
      "label": "Integral motor package",
      "group": "drive",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-12 -10 H12 V10 H-12 Z",
          "M0 -10 V-14"
        ],
        "circles": [],
        "texts": [
          [
            0,
            3,
            "M"
          ]
        ]
      },
      "ports": [
        {
          "name": "electric_supply",
          "anchor": [
            -12,
            0
          ],
          "kind": "electrical-power",
          "direction": "in"
        },
        {
          "name": "integral_mount",
          "anchor": [
            12,
            0
          ],
          "kind": "mechanical-integral",
          "direction": "out"
        }
      ],
      "notes": "Motor mechanically part of one equipment asset, avoid double-counting procurement."
    },
    {
      "id": "accessory-suction-strainer",
      "label": "Suction strainer",
      "group": "accessory",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-10 M10 0 H24",
          "M-10 -7 H10 V7 H-10 Z",
          "M-10 -7 L10 7 M-10 0 L-3 7 M3 -7 L10 0"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "inlet",
          "anchor": [
            -24,
            0
          ],
          "kind": "liquid-process",
          "direction": "in"
        },
        {
          "name": "outlet",
          "anchor": [
            24,
            0
          ],
          "kind": "liquid-process",
          "direction": "out"
        }
      ],
      "notes": "",
      "catalogFamily": "07",
      "rehomeDecision": "Retain in Family 07 for now; revisit deduplication with Family 01 later."
    },
    {
      "id": "accessory-pulsation-dampener",
      "label": "Pulsation dampener",
      "group": "accessory",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M0 12 V2",
          "M-7 -14 Q0 -18 7 -14 V-4 Q0 5 -7 -4 Z",
          "M-7 -8 H7"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "branch",
          "anchor": [
            0,
            12
          ],
          "kind": "liquid-process",
          "direction": "bidirectional"
        }
      ],
      "notes": "Single branch, never a two-port inline component.",
      "catalogFamily": "07",
      "rehomeDecision": "Retain in Family 07 for now; revisit deduplication with Family 01 later."
    },
    {
      "id": "accessory-air-filter",
      "label": "Air intake filter",
      "group": "accessory",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-10 M10 0 H24",
          "M-10 -9 H10 V9 H-10 Z",
          "M-10 -9 L10 9 M-10 -2 L2 9 M-2 -9 L10 2 M10 -9 L-10 9"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "ambient_inlet",
          "anchor": [
            -24,
            0
          ],
          "kind": "gas-environment",
          "direction": "in"
        },
        {
          "name": "filtered_air_out",
          "anchor": [
            24,
            0
          ],
          "kind": "gas-process",
          "direction": "out"
        }
      ],
      "notes": "",
      "catalogFamily": "07",
      "rehomeDecision": "Retain in Family 07 for now; revisit deduplication with Family 01 later."
    },
    {
      "id": "accessory-silencer",
      "label": "Blower silencer",
      "group": "accessory",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-13 M13 0 H24",
          "M-13 -7 H13 V7 H-13 Z",
          "M-9 -4 H9 M-9 0 H9 M-9 4 H9"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "gas_in",
          "anchor": [
            -24,
            0
          ],
          "kind": "gas-process",
          "direction": "in"
        },
        {
          "name": "gas_out",
          "anchor": [
            24,
            0
          ],
          "kind": "gas-process",
          "direction": "out"
        }
      ],
      "notes": "",
      "catalogFamily": "07",
      "rehomeDecision": "Retain in Family 07 for now; revisit deduplication with Family 01 later."
    },
    {
      "id": "accessory-expansion-bellows",
      "label": "Expansion bellows",
      "group": "accessory",
      "status": "design approved / source verification pending",
      "geometry": {
        "paths": [
          "M-24 0 H-12 M12 0 H24",
          "M-12 -7 V7 M12 -7 V7",
          "M-12 -4 L-8 -7 L-4 -4 L0 -7 L4 -4 L8 -7 L12 -4",
          "M-12 4 L-8 7 L-4 4 L0 7 L4 4 L8 7 L12 4"
        ],
        "circles": [],
        "texts": []
      },
      "ports": [
        {
          "name": "end_a",
          "anchor": [
            -24,
            0
          ],
          "kind": "process-connector",
          "direction": "bidirectional"
        },
        {
          "name": "end_b",
          "anchor": [
            24,
            0
          ],
          "kind": "process-connector",
          "direction": "bidirectional"
        }
      ],
      "notes": "May be merged with Family 01 flexible connection variant after convention comparison.",
      "catalogFamily": "07",
      "rehomeDecision": "Retain in Family 07 for now; revisit deduplication with Family 01 later."
    }
  ],
  "finalDecisions": {
    "centrifugalDefault": "compact",
    "centrifugalAlternates": [
      "volute"
    ],
    "blowerLobeVariants": [
      "2-lobe",
      "3-lobe"
    ],
    "submersibleSchematic": [
      "motor housing",
      "pump casing",
      "discharge outlet"
    ],
    "submersibleSchematicOmissions": [
      "power cable glyph",
      "guide rails",
      "intake hardware",
      "installation feet"
    ],
    "specialtyPumpPorts": "three visible typed interfaces",
    "accessoriesCatalogFamily": "07",
    "approval": "All 27 development tasks approved"
  },
  "defaultInkProfiles": {
    "screen": {
      "primaryOpacity": 1,
      "secondaryOpacity": 0.32
    },
    "print": {
      "primaryOpacity": 1,
      "secondaryOpacity": 1
    }
  },
  "geometricPrerequisite": "Current src/library.mjs place() handles M/L and restricted A only. Implement SVG transform grouping or complete path parsing for H/V/Q/C/T; this manifest is NOT direct-import-ready."
}
