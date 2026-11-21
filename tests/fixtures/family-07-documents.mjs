const ref = (blockId, portId) => ({ blockId, portId });
const edge = (id, kind, from, to, medium, via) => ({ id, kind, from: ref(...from), to: ref(...to), medium, via });

export const submersible = {
  assets: [{
    assetId: "P-701", role: "standby", state: "running", speedControl: "VFD", actualRpm: 1280, setpointRpm: 1450,
    physical: {
      basis: "illustrative", source: "Family 07 synthetic review dimensions", unit: "mm", envelope: [1200, 700, 1000],
      features: [
        { id: "guide-rail", origin: [950, 340, 0], size: [36, 20, 1160] },
        { id: "elbow", origin: [850, 265, 160], size: [350, 170, 240] },
        { id: "cable", kind: "electrical-power", origin: [350, 350, 1000], size: [0, 0, 260] },
      ],
      interfaces: { wet_well_intake: [350, 350, 0], power_cable: [350, 350, 1260], discharge: [1200, 350, 280] },
    },
  }],
  instances: [{ id: "P-701-symbol", symbolId: "pump-submersible", assetId: "P-701", at: { x: 56, y: 113, s: 1.5 },
    views: {
      plan: { at: { x: 210, y: 92 }, unitsPerDrawingUnit: 12 },
      section: { at: { x: 400, y: 92 }, unitsPerDrawingUnit: 12 },
      electrical: { at: { x: 210, y: 279 }, unitsPerDrawingUnit: 12 },
    },
  }],
};

export const topology = {
  assets: [
    { assetId: "P-702", role: "duty-assist", state: "fault", speedControl: "VFD",
      accessories: [{ id: "pulsation", symbolId: "accessory-pulsation-dampener", status: "installed", assetId: "PD-702" },
        { id: "strainer", symbolId: "accessory-suction-strainer", status: "optional" }] },
    { assetId: "PD-702" }, { assetId: "M-702" }, { assetId: "VFD-702" }, { assetId: "P-703" }, { assetId: "P-704" },
  ],
  instances: [
    { id: "head", symbolId: "pump-dosing", variant: "head", assetId: "P-702", at: { x: 260, y: 90, s: 1.5 } },
    { id: "dampener", symbolId: "accessory-pulsation-dampener", assetId: "PD-702", at: { x: 350, y: 64, s: 1.5 },
      media: { branch: "polymer" } },
    { id: "motor", symbolId: "drive-electric-motor", assetId: "M-702", at: { x: 260, y: 145, s: 1.5, q: 3 },
      attachment: { parentId: "head", integral: false } },
    { id: "vfd", symbolId: "drive-vfd", assetId: "VFD-702", at: { x: 165, y: 157, s: 1.5 } },
    { id: "airlift", symbolId: "pump-airlift", assetId: "P-703", at: { x: 145, y: 315, s: 1.5 },
      media: { liquid_intake: "mixed liquor", air_injection: "air", mixed_discharge: "aerated mixed liquor" } },
    { id: "eductor", symbolId: "pump-eductor", assetId: "P-704", at: { x: 390, y: 315, s: 1.5 },
      portKinds: { motive_fluid: "gas-process", suction: "gas-process", mixed_discharge: "gas-process" },
      media: { motive_fluid: "steam", suction: "vapour", mixed_discharge: "steam-vapour mixture" } },
  ],
  boundaries: [
    { id: "polymer-line", kind: "liquid-process", direction: "bidirectional", point: [350, 90], medium: "polymer", terminal: "branch" },
    { id: "air-line", kind: "gas-process", direction: "out", point: [72, 307.5], medium: "air" },
    { id: "wet-well", kind: "liquid-environment", direction: "out", point: [145, 375], medium: "mixed liquor" },
    { id: "mixed-route", kind: "two-phase-process", direction: "in", point: [213, 282], medium: "aerated mixed liquor" },
    { id: "steam-line", kind: "gas-process", direction: "out", point: [308, 315], medium: "steam" },
    { id: "vapour-line", kind: "gas-process", direction: "out", point: [390, 374], medium: "vapour" },
    { id: "eductor-discharge", kind: "gas-process", direction: "in", point: [481, 315], medium: "steam-vapour mixture" },
  ],
  connections: [
    edge("shaft", "mechanical-drive", ["motor", "shaft"], ["head", "shaft"]),
    edge("power", "electrical-power", ["vfd", "electric_out"], ["motor", "electric_supply"], undefined, [[218, 157], [218, 174], [260, 174]]),
    edge("branch", "liquid-process", ["polymer-line", "tie"], ["dampener", "branch"], "polymer"),
    edge("lift-air", "gas-process", ["air-line", "tie"], ["airlift", "air_injection"], "air"),
    edge("lift-liquid", "liquid-environment", ["wet-well", "tie"], ["airlift", "liquid_intake"], "mixed liquor"),
    edge("lift-out", "two-phase-process", ["airlift", "mixed_discharge"], ["mixed-route", "tie"], "aerated mixed liquor"),
    edge("motive", "gas-process", ["steam-line", "tie"], ["eductor", "motive_fluid"], "steam"),
    edge("suction", "gas-process", ["vapour-line", "tie"], ["eductor", "suction"], "vapour"),
    edge("mixed", "gas-process", ["eductor", "mixed_discharge"], ["eductor-discharge", "tie"], "steam-vapour mixture"),
  ],
};
