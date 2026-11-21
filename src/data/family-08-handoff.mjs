export default {
  "schema": "processvg.family08.review.v2",
  "sourceRepository": "itama8/processvg",
  "sourceFile": "src/library.mjs",
  "sourceReadDate": "2026-11-21",
  "status": "User approved direction and thirteen development tasks; detailed geometry in review, NOT yet final design approved or standards verified",
  "counts": {
    "existingIds": 8,
    "newIds": 13,
    "totalIds": 21
  },
  "decisions": {
    "screenComposition": "Single complete screen schematic with drive depicted; manually cleaned screen has manual rake instead",
    "mediaTyping": "Typed wastewater, screenings solids, grit slurry, washed grit, washwater, return liquor, gas and bulk solids",
    "gritTypes": "Hydrocyclone, vortex, aerated and horizontal-flow independent geometries",
    "mixers": "Preserve mixer and mixer-static IDs here; factor shared mixer/drive primitives later",
    "views": [
      "schematic",
      "plan",
      "section",
      "elevation"
    ],
    "ink": "Essential screen and screw internals 100% primary; secondary screen 32% and print 100% only for genuinely secondary geometry"
  },
  "geometryContract": {
    "coordinateUnit": "internal drawing unit, not engineering dimension",
    "pathTransform": "full SVG arc/curve/line support required; current place() transformer incomplete",
    "legacyPolicy": "Existing diagrams retain snapshot geometry until explicit migration; ports are semantic augmentation not retroactive change to drawn pipe fittings",
    "symbolVsEquipment": "Complete screen glyph renders as one symbol; shared drive head may be internally composed but does not require user to assemble it",
    "processPortKinds": [
      "wastewater",
      "screenings-solids",
      "solids-bulk",
      "grit-slurry",
      "washed-grit",
      "wash-water",
      "return-liquor",
      "gas-process",
      "liquid-process",
      "mechanical-drive"
    ],
    "topologyPolicy": "medium + direction checking; no implicit piping from solids interface into liquid process line"
  },
  "symbols": [
    {
      "id": "screen-bar",
      "label": "Mechanical bar screen",
      "group": "screening",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-7.2 11.4 L5.2 -10.1 M-2.8 13.9 L9.6 -7.6 M5.2 -10.1 A2.54 2.54 0 0 1 9.6 -7.6 M-2.8 13.9 A2.54 2.54 0 0 1 -7.2 11.4",
          "M7.4 -10.05 L7.4 -14",
          "M9.6 -7.6 H18"
        ],
        "circles": [
          [
            7.4,
            -8.85,
            1.2
          ],
          [
            7.4,
            -19,
            6
          ]
        ],
        "texts": [
          [
            7.4,
            -19,
            "M",
            6
          ]
        ],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -14,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "screened_out",
          "anchor": [
            14,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "screenings_discharge",
          "anchor": [
            18,
            -7.6
          ],
          "kind": "screenings-solids",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Single complete mechanical screen with drive depicted. Legacy ID had no process ports: new typed ports are schematic interfaces, not physical pipe flanges. Mechanical bar bank remains original. Drive has shared geometry internally but is one complete rendered symbol.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": [
        "IS 3232 1505 (as cited by repository)",
        "B&C P-003 (as cited by repository)"
      ],
      "variants": {
        "legacy": {
          "paths": [
            "M-7.2 11.4 L5.2 -10.1 M-2.8 13.9 L9.6 -7.6 M5.2 -10.1 A2.54 2.54 0 0 1 9.6 -7.6 M-2.8 13.9 A2.54 2.54 0 0 1 -7.2 11.4"
          ],
          "circles": [
            [
              7.4,
              -8.85,
              1.2
            ]
          ],
          "circleRoles": [
            "secondary"
          ],
          "secondaryPaths": [],
          "texts": []
        },
        "refined": {
          "paths": [
            "M-7.2 11.4 L5.2 -10.1 M-2.8 13.9 L9.6 -7.6 M5.2 -10.1 A2.54 2.54 0 0 1 9.6 -7.6 M-2.8 13.9 A2.54 2.54 0 0 1 -7.2 11.4",
            "M7.4 -10.05 L7.4 -14",
            "M9.6 -7.6 H18"
          ],
          "circles": [
            [
              7.4,
              -8.85,
              1.2
            ],
            [
              7.4,
              -19,
              6
            ]
          ],
          "texts": [
            [
              7.4,
              -19,
              "M",
              6
            ]
          ],
          "secondaryPaths": []
        }
      },
      "defaultForNewDrawings": "refined",
      "defaultForExistingDrawings": "legacy"
    },
    {
      "id": "screen-fine",
      "label": "Fine drum screen",
      "group": "screening",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-12 -7 H2 V7 H-12 Z",
          "M2 -2 H12 V2 H2 Z",
          "M-9 7 L-5 -7 M-5 7 L-1 -7",
          "M-2 -7 V-13 H8",
          "M-9 -7 L-18 -12"
        ],
        "circles": [
          [
            8,
            -18,
            6
          ]
        ],
        "texts": [
          [
            8,
            -18,
            "M",
            6
          ]
        ],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -12,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "screened_out",
          "anchor": [
            12,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "screenings_discharge",
          "anchor": [
            -18,
            -12
          ],
          "kind": "screenings-solids",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Preserve source drum/rectangular body geometry and elevate identity marks. Drive integrated in complete schematic. Real drum style may vary.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": [
        "B&C P-003 (as cited by repository)"
      ],
      "variants": {
        "legacy": {
          "paths": [
            "M-12 -7 H2 V7 H-12 Z",
            "M2 -2 H12 V2 H2 Z"
          ],
          "secondaryPaths": [
            "M-9 7 L-5 -7 M-5 7 L-1 -7"
          ],
          "circles": [],
          "texts": []
        },
        "refined": {
          "paths": [
            "M-12 -7 H2 V7 H-12 Z",
            "M2 -2 H12 V2 H2 Z",
            "M-9 7 L-5 -7 M-5 7 L-1 -7",
            "M-2 -7 V-13 H8",
            "M-9 -7 L-18 -12"
          ],
          "circles": [
            [
              8,
              -18,
              6
            ]
          ],
          "texts": [
            [
              8,
              -18,
              "M",
              6
            ]
          ],
          "secondaryPaths": []
        }
      },
      "defaultForNewDrawings": "refined",
      "defaultForExistingDrawings": "legacy"
    },
    {
      "id": "conveyor-screw",
      "label": "Screw conveyor",
      "group": "solids-handling",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-16 6 L14 -10 L16 -6.3 L-14 9.7 Z",
          "M-10 3.4 L-6 8.4 M-4 .2 L0 5.2 M2 -3 L6 2 M8 -6.2 L12 -1.2"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "solids_in",
          "anchor": [
            -15,
            8
          ],
          "kind": "solids-bulk",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "solids_out",
          "anchor": [
            15,
            -8
          ],
          "kind": "solids-bulk",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Promote screw flights to primary ink. Geometry and external ports unchanged; actual transport direction is instance-defined.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": [
        "IS 3232 2101 (as cited by repository)",
        "B&C P-003 (as cited by repository)"
      ],
      "variants": {
        "legacy": {
          "paths": [
            "M-16 6 L14 -10 L16 -6.3 L-14 9.7 Z"
          ],
          "secondaryPaths": [
            "M-10 3.4 L-6 8.4 M-4 .2 L0 5.2 M2 -3 L6 2 M8 -6.2 L12 -1.2"
          ],
          "circles": [],
          "texts": []
        },
        "refined": {
          "paths": [
            "M-16 6 L14 -10 L16 -6.3 L-14 9.7 Z",
            "M-10 3.4 L-6 8.4 M-4 .2 L0 5.2 M2 -3 L6 2 M8 -6.2 L12 -1.2"
          ],
          "circles": [],
          "texts": [],
          "secondaryPaths": []
        }
      },
      "defaultForNewDrawings": "refined",
      "defaultForExistingDrawings": "legacy"
    },
    {
      "id": "grit-classifier",
      "label": "Grit classifier",
      "group": "grit-handling",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-16 6 L14 -10 L16 -6.3 L-14 9.7 Z M-16 6 V-2 H-8 V1.7",
          "M-10 -2 V-10",
          "M-4 -3 V-13"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "grit_slurry_in",
          "anchor": [
            -12,
            -2
          ],
          "kind": "grit-slurry",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "dewatered_grit_out",
          "anchor": [
            15,
            -8
          ],
          "kind": "washed-grit",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "return_liquor",
          "anchor": [
            -4,
            -13
          ],
          "kind": "return-liquor",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Third outlet proposed for classifier overflow/return liquor. Port positions illustrative; validate equipment-specific connection locations.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": [
        "B&C P-003 (as cited by repository)"
      ],
      "variants": {
        "legacy": {
          "paths": [
            "M-16 6 L14 -10 L16 -6.3 L-14 9.7 Z M-16 6 V-2 H-8 V1.7"
          ],
          "secondaryPaths": [],
          "circles": [],
          "texts": []
        },
        "refined": {
          "paths": [
            "M-16 6 L14 -10 L16 -6.3 L-14 9.7 Z M-16 6 V-2 H-8 V1.7",
            "M-10 -2 V-10",
            "M-4 -3 V-13"
          ],
          "circles": [],
          "texts": [],
          "secondaryPaths": []
        }
      },
      "defaultForNewDrawings": "refined",
      "defaultForExistingDrawings": "legacy"
    },
    {
      "id": "grit-separator",
      "label": "Hydrocyclone grit separator",
      "group": "grit-separation",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-8 -12 H8 V0 L2 12 H-2 L-8 0 Z M-14 -8 H-8"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "slurry_in",
          "anchor": [
            -14,
            -8
          ],
          "kind": "grit-slurry",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "underflow_grit",
          "anchor": [
            0,
            12
          ],
          "kind": "grit-slurry",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "overflow_liquid",
          "anchor": [
            0,
            -12
          ],
          "kind": "return-liquor",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "This existing conical symbol is hydrocyclone-like, not the same as open circular vortex grit chamber.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": [
        "B&C P-003 (as cited by repository)"
      ],
      "variants": {
        "legacy": {
          "paths": [
            "M-8 -12 H8 V0 L2 12 H-2 L-8 0 Z M-14 -8 H-8"
          ],
          "secondaryPaths": [],
          "circles": [],
          "texts": []
        },
        "refined": {
          "paths": [
            "M-8 -12 H8 V0 L2 12 H-2 L-8 0 Z M-14 -8 H-8"
          ],
          "circles": [],
          "texts": [],
          "secondaryPaths": []
        }
      },
      "defaultForNewDrawings": "refined",
      "defaultForExistingDrawings": "legacy"
    },
    {
      "id": "container",
      "label": "Screenings bin / skip",
      "group": "solids-handling",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-12 -6 H12 L9 6 H-9 Z",
          "M-9 -6 H9"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "screenings_in",
          "anchor": [
            0,
            -6
          ],
          "kind": "screenings-solids",
          "direction": "in",
          "schematicVisible": true
        }
      ],
      "notes": "Receiving asset; the receiving connection is bulk solids handling, not water process.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": [
        "B&C P-101 (as cited by repository)"
      ],
      "variants": {
        "legacy": {
          "paths": [
            "M-12 -6 H12 L9 6 H-9 Z"
          ],
          "secondaryPaths": [],
          "circles": [],
          "texts": []
        },
        "refined": {
          "paths": [
            "M-12 -6 H12 L9 6 H-9 Z",
            "M-9 -6 H9"
          ],
          "circles": [],
          "texts": [],
          "secondaryPaths": []
        }
      },
      "defaultForNewDrawings": "refined",
      "defaultForExistingDrawings": "legacy"
    },
    {
      "id": "mixer",
      "label": "Top-entry mixer",
      "group": "mixing",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-5 -18 H5 V-8 H-5 Z M0 -8 V10 M-8 10 H8"
        ],
        "circles": [
          [
            -5,
            10,
            2.5
          ],
          [
            5,
            10,
            2.5
          ]
        ],
        "texts": [
          [
            0,
            -13,
            "M",
            6
          ]
        ],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "mechanical_mount",
          "anchor": [
            0,
            -18
          ],
          "kind": "mechanical-drive",
          "direction": "in",
          "schematicVisible": false
        }
      ],
      "notes": "Preserve ID under screening family; completed mixer glyph includes drive, shaft and impeller. Mixer has no generic inline liquid-process port.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": [
        "IS 3232 1907 (as cited by repository)",
        "B&C P-003 (as cited by repository)"
      ],
      "variants": {
        "legacy": {
          "paths": [
            "M-5 -18 H5 V-8 H-5 Z M0 -8 V10 M-8 10 H8"
          ],
          "circles": [
            [
              -5,
              10,
              2.5
            ],
            [
              5,
              10,
              2.5
            ]
          ],
          "secondaryPaths": [],
          "texts": []
        },
        "refined": {
          "paths": [
            "M-5 -18 H5 V-8 H-5 Z M0 -8 V10 M-8 10 H8"
          ],
          "circles": [
            [
              -5,
              10,
              2.5
            ],
            [
              5,
              10,
              2.5
            ]
          ],
          "texts": [
            [
              0,
              -13,
              "M",
              6
            ]
          ],
          "secondaryPaths": []
        }
      },
      "defaultForNewDrawings": "refined",
      "defaultForExistingDrawings": "legacy"
    },
    {
      "id": "mixer-static",
      "label": "Static inline mixer",
      "group": "mixing",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-16 0 H-12 M12 0 H16 M-12 -5 H12 V5 H-12 Z",
          "M-12 -5 L-4 5 M-12 5 L-4 -5 M-4 -5 L4 5 M-4 5 L4 -5 M4 -5 L12 5 M4 5 L12 -5"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "liquid_in",
          "anchor": [
            -16,
            0
          ],
          "kind": "liquid-process",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "liquid_out",
          "anchor": [
            16,
            0
          ],
          "kind": "liquid-process",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Internal mixing elements full primary ink. No mechanical drive.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": [
        "B&C P-003 (as cited by repository)"
      ],
      "variants": {
        "legacy": {
          "paths": [
            "M-16 0 H-12 M12 0 H16 M-12 -5 H12 V5 H-12 Z"
          ],
          "secondaryPaths": [
            "M-12 -5 L-4 5 M-12 5 L-4 -5 M-4 -5 L4 5 M-4 5 L4 -5 M4 -5 L12 5 M4 5 L12 -5"
          ],
          "circles": [],
          "texts": []
        },
        "refined": {
          "paths": [
            "M-16 0 H-12 M12 0 H16 M-12 -5 H12 V5 H-12 Z",
            "M-12 -5 L-4 5 M-12 5 L-4 -5 M-4 -5 L4 5 M-4 5 L4 -5 M4 -5 L12 5 M4 5 L12 -5"
          ],
          "circles": [],
          "texts": [],
          "secondaryPaths": []
        }
      },
      "defaultForNewDrawings": "refined",
      "defaultForExistingDrawings": "legacy"
    },
    {
      "id": "screen-manual",
      "label": "Manually cleaned bar screen",
      "group": "screening",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-12 12 L2 -10 M-8 12 L6 -10 M-4 12 L10 -10",
          "M-1 -13 H8 L11 -16 M8 -13 L10 -10",
          "M-17 0 H-12 M12 0 H18"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -17,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "screened_out",
          "anchor": [
            18,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "removed_screenings",
          "anchor": [
            11,
            -16
          ],
          "kind": "screenings-solids",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Manual rake not powered; one complete symbol with manual rake mark. Bulk screenings output represents handled solids, not a physical pipe.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "screen-step",
      "label": "Step screen",
      "group": "screening",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-13 12 H-10 V9 H-7 V6 H-4 V3 H-1 V0 H2 V-3 H5 V-6 H8 V-9 H11 V-12",
          "M-16 0 H-13 M13 0 H20",
          "M9 -12 V-15",
          "M11 -12 H22"
        ],
        "circles": [
          [
            14,
            -19,
            5
          ]
        ],
        "texts": [
          [
            14,
            -19,
            "M",
            5.5
          ]
        ],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -16,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "screened_out",
          "anchor": [
            20,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "screenings_out",
          "anchor": [
            22,
            -12
          ],
          "kind": "screenings-solids",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Stepped elements identify step screen; motor integrated. Do not imply bar gaps or step clearance.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "screen-perforated",
      "label": "Perforated plate fine screen",
      "group": "screening",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-10 -10 H10 V10 H-10 Z",
          "M-16 0 H-10 M10 0 H16 M0 -10 V-15 M-10 -10 L-18 -16"
        ],
        "circles": [
          [
            -6,
            -6,
            1.1
          ],
          [
            -6,
            -1,
            1.1
          ],
          [
            -6,
            4,
            1.1
          ],
          [
            -1,
            -6,
            1.1
          ],
          [
            -1,
            -1,
            1.1
          ],
          [
            -1,
            4,
            1.1
          ],
          [
            4,
            -6,
            1.1
          ],
          [
            4,
            -1,
            1.1
          ],
          [
            4,
            4,
            1.1
          ],
          [
            0,
            -20,
            5
          ]
        ],
        "texts": [
          [
            0,
            -20,
            "M",
            5.5
          ]
        ],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -16,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "screened_out",
          "anchor": [
            16,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "screenings_out",
          "anchor": [
            -18,
            -16
          ],
          "kind": "screenings-solids",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Perforations are full-ink repeated hole boundaries; complete motorized symbol. No claimed aperture dimension.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "screen-drum",
      "label": "Rotary drum screen",
      "group": "screening",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-23 0 H-12 M12 0 H23 M-12 -9 H12 V9 H-12 Z",
          "M-7 -4 V4 M-3 -7 V7 M3 -7 V7 M7 -4 V4",
          "M0 -9 V-14 M-12 -9 L-20 -15"
        ],
        "circles": [
          [
            0,
            0,
            8
          ],
          [
            0,
            -19,
            5
          ]
        ],
        "texts": [
          [
            0,
            -19,
            "M",
            5.5
          ]
        ],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -23,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "screened_out",
          "anchor": [
            23,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "screenings_out",
          "anchor": [
            -20,
            -15
          ],
          "kind": "screenings-solids",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Rotating drum identity clearly distinct from source screen-fine rectangular motif. Real configurations include internally/externally fed screens.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "screen-band",
      "label": "Travelling band screen",
      "group": "screening",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-9 -9 H9 V12 H-9 Z",
          "M-9 -9 A9 3 0 0 1 9 -9 M-9 12 A9 3 0 0 0 9 12",
          "M-6 -6 V9 M0 -6 V9 M6 -6 V9",
          "M-20 0 H-9 M9 0 H20",
          "M0 -9 V-15 M-9 -9 L-18 -17"
        ],
        "circles": [
          [
            0,
            -20,
            5
          ]
        ],
        "texts": [
          [
            0,
            -20,
            "M",
            5.5
          ]
        ],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -20,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "screened_out",
          "anchor": [
            20,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "screenings_out",
          "anchor": [
            -18,
            -17
          ],
          "kind": "screenings-solids",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Complete motorized travelling band screen, stylized belt with repeated band elements.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "screen-washer-compactor",
      "label": "Screenings washer-compactor",
      "group": "solids-handling",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-12 -9 H4 L12 -4 V4 L4 9 H-12 Z",
          "M-10 -4 L-5 2 L0 -4 L5 2 M-9 5 H8",
          "M-20 0 H-12 M12 0 H20",
          "M0 -17 V-9 M0 9 V17"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "screenings_in",
          "anchor": [
            -20,
            0
          ],
          "kind": "screenings-solids",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "compacted_screenings",
          "anchor": [
            20,
            0
          ],
          "kind": "screenings-solids",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "wash_water",
          "anchor": [
            0,
            -17
          ],
          "kind": "wash-water",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "return_liquor",
          "anchor": [
            0,
            17
          ],
          "kind": "return-liquor",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Combined washing, conveyance and compaction preset. Four visible media-specific terminals; actual design may contain bypass and spray sections.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "screen-grinder",
      "label": "Macerator / grinder",
      "group": "screening",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-14 -10 H14 V10 H-14 Z",
          "M-20 0 H-14 M14 0 H20",
          "M-8 -7 L-3 -2 L-8 3 L-3 8 M0 -7 L5 -2 L0 3 L5 8",
          "M0 -10 V-15"
        ],
        "circles": [
          [
            0,
            -20,
            5
          ]
        ],
        "texts": [
          [
            0,
            -20,
            "M",
            5.5
          ]
        ],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "sewage_in",
          "anchor": [
            -20,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "comminuted_out",
          "anchor": [
            20,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Comminuting/grinding changes solids size and retains slurry in outgoing wastewater, not a screenings removal stream unless explicitly configured.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "grit-vortex",
      "label": "Vortex grit chamber",
      "group": "grit-separation",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-25 -6 H-17",
          "M17 0 H25",
          "M0 17 V25",
          "M-8 -6 C1 -16 14 -4 9 5 C5 13 -5 9 -4 2 C-3 -3 3 -4 5 1"
        ],
        "circles": [
          [
            0,
            0,
            17
          ],
          [
            0,
            0,
            3.5
          ]
        ],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -25,
            -6
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "effluent",
          "anchor": [
            25,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "grit_slurry",
          "anchor": [
            0,
            25
          ],
          "kind": "grit-slurry",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Plan schematic circular chamber; tangential inflow. Does not reuse conical hydrocyclone symbol.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "grit-aerated",
      "label": "Aerated grit chamber",
      "group": "grit-separation",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-20 -10 H20 V12 L8 18 H-8 L-20 12 Z",
          "M-27 0 H-20 M20 0 H27 M0 18 V26 M-12 12 H12",
          "M-12 12 L-12 7 M0 12 V7 M12 12 V7",
          "M-12 -19 V-10"
        ],
        "circles": [
          [
            -12,
            7,
            1
          ],
          [
            0,
            7,
            1
          ],
          [
            12,
            7,
            1
          ]
        ],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -27,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "effluent",
          "anchor": [
            27,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "air_supply",
          "anchor": [
            -12,
            -19
          ],
          "kind": "gas-process",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "grit_withdrawal",
          "anchor": [
            0,
            26
          ],
          "kind": "grit-slurry",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Schematic section with aeration diffuser and bottom grit hopper. Air injection is not a wastewater outlet.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "grit-horizontal",
      "label": "Horizontal-flow grit channel",
      "group": "grit-separation",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-22 -10 H22 V10 H11 L6 19 H-6 L-11 10 H-22 Z",
          "M-29 0 H-22 M22 0 H29 M0 19 V26",
          "M-10 7 H10"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "influent",
          "anchor": [
            -29,
            0
          ],
          "kind": "wastewater",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "effluent",
          "anchor": [
            29,
            0
          ],
          "kind": "wastewater",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "grit_withdrawal",
          "anchor": [
            0,
            26
          ],
          "kind": "grit-slurry",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Schematic longitudinal section; no air port; grit collection sump indicated. Geometry not dimensioned.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "grit-washer",
      "label": "Grit washer",
      "group": "grit-handling",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-16 -9 H16 V6 L8 11 H-8 L-16 6 Z",
          "M-12 -4 H10 M-12 0 H10 M-12 4 H10",
          "M-24 0 H-16 M16 0 H24 M0 -17 V-9 M0 11 V17"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "raw_grit_in",
          "anchor": [
            -24,
            0
          ],
          "kind": "grit-slurry",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "washed_grit_out",
          "anchor": [
            24,
            0
          ],
          "kind": "washed-grit",
          "direction": "out",
          "schematicVisible": true
        },
        {
          "name": "wash_water",
          "anchor": [
            0,
            -17
          ],
          "kind": "wash-water",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "return_liquor",
          "anchor": [
            0,
            17
          ],
          "kind": "return-liquor",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Washing + conveying combined equipment; washwater input and return liquor output separately typed.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "grit-bin",
      "label": "Grit storage bin",
      "group": "solids-handling",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-16 -9 H16 L12 10 H-12 Z",
          "M0 -16 V-9",
          "M-10 4 H10"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "grit_in",
          "anchor": [
            0,
            -16
          ],
          "kind": "washed-grit",
          "direction": "in",
          "schematicVisible": true
        }
      ],
      "notes": "One bulk washed-grit receiving interface; optional drain is separate asset feature rather than an assumed pipe.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    },
    {
      "id": "screenings-chute",
      "label": "Screenings discharge chute",
      "group": "solids-handling",
      "status": "proposed geometry; visual approval pending",
      "geometry": {
        "paths": [
          "M-12 -16 H12 L6 16 H-6 Z",
          "M-5 -9 L0 -3 L5 -9 M0 -3 V10",
          "M0 -23 V-16 M0 16 V23"
        ],
        "circles": [],
        "texts": [],
        "secondaryPaths": []
      },
      "ports": [
        {
          "name": "screenings_in",
          "anchor": [
            0,
            -23
          ],
          "kind": "screenings-solids",
          "direction": "in",
          "schematicVisible": true
        },
        {
          "name": "screenings_out",
          "anchor": [
            0,
            23
          ],
          "kind": "screenings-solids",
          "direction": "out",
          "schematicVisible": true
        }
      ],
      "notes": "Gravity screenings chute; two solids ports. It does not imply a continuous liquid-process flow.",
      "views": [
        "schematic",
        "plan",
        "section"
      ],
      "source": []
    }
  ]
}
;
