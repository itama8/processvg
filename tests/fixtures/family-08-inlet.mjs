import { composeEquipment, composeInstrument, composeScreeningDocument, instrumentNetwork,
  screeningNetwork, screeningTieIn, SCREENING_STREAMS } from "../../src/library.mjs";
import { routeLine } from "../../src/lines.mjs";
import { physicalFixtures } from "./family-08-physical.mjs";

const candidate = (assetId, symbolId, x, y) => ({ assetId, symbolId, variant: "candidate",
  physical: physicalFixtures[symbolId], views: { schematic: { x, y, s: 1.4 },
    plan: {}, section: {}, elevation: {} } });
const ref = (blockId, portId) => ({ blockId, portId });
const line = (id, kind, from, to, via) => ({ id, kind, from, to, via });
const note = (x, y, text, align = "middle") => ({ t: [x, y, text], align });

export function inletWorksFixture() {
  const assets = [
    candidate("SCR-101", "screen-bar", 255, 188), candidate("SCR-102", "screen-manual", 255, 256),
    candidate("WC-101", "screen-washer-compactor", 345, 98), candidate("SK-101", "container", 480, 98),
    candidate("SK-102", "container", 403, 215), candidate("GR-101", "grit-vortex", 552, 279.8),
    candidate("GW-101", "grit-washer", 600, 411), candidate("GB-101", "grit-bin", 741, 414),
  ];
  const { schedule, blocks } = composeScreeningDocument({ assets });
  const boundaries = [
    ["Raw", [24, 256], "wastewater", "out"], ["Degritted", [817, 279.8], "wastewater", "in"],
    ["WW-1", [345, 51], "wash-water", "out"], ["RL-1", [345, 154], "return-liquor", "in"],
    ["WW-2", [600, 352], "wash-water", "out"], ["RL-2", [600, 480], "return-liquor", "in"],
  ].map(([id, point, kind, direction]) => screeningTieIn({ id, point, kind, ports: [{ id: "tie", direction }] }));
  const lanes = ["primary", "parallel", "bypass"];
  const junction = (id, x, direction) => screeningTieIn({ id, point: [x, 256], kind: "wastewater",
    ports: [{ id: "main", direction }, ...lanes.map((id) => ({ id, direction: direction === "in" ? "out" : "in" }))] });
  const gates = [["SG-101", 188, "open"], ["SG-102", 256, "open"], ["BG-101", 324, "closed"]].map(([id, y, normalPosition]) => {
    const draw = composeEquipment({ type: "gate-slide", normalPosition }, { x: 160, y });
    return { ...draw, metadata: { ...draw.metadata, id }, processInterfaces: draw.channelPorts.map(({ id, point }, i) =>
      ({ id, kind: "wastewater", point, direction: i ? "out" : "in", visible: true })) };
  });
  const wastewater = (id, from, to, via) => line(id, "wastewater", from, to, via);
  const connections = [
    wastewater("influent", ref("Raw", "tie"), ref("Split", "main")),
    ...gates.map(({ metadata: { id }, processInterfaces }, i) => wastewater(`feed-${id}`, ref("Split", lanes[i]), ref(id, "in"),
      lanes[i] === "parallel" ? [] : [[100, processInterfaces[0].point[1]]])),
    wastewater("screen-a-in", ref("SG-101", "out"), ref("SCR-101", "influent")),
    wastewater("screen-b-in", ref("SG-102", "out"), ref("SCR-102", "influent")),
    wastewater("screen-a-out", ref("SCR-101", "screened_out"), ref("Join", "primary"), [[473, 188]]),
    wastewater("screen-b-out", ref("SCR-102", "screened_out"), ref("Join", "parallel")),
    wastewater("bypass", ref("BG-101", "out"), ref("Join", "bypass"), [[473, 324]]),
    wastewater("screened", ref("Join", "main"), ref("GR-101", "influent")),
    wastewater("degritted", ref("GR-101", "effluent"), ref("Degritted", "tie")),
    line("mechanical-screenings", "screenings-solids", ref("SCR-101", "screenings_discharge"), ref("WC-101", "screenings_in"), [[280.2, 98]]),
    line("compacted-screenings", "screenings-solids", ref("WC-101", "compacted_screenings"), ref("SK-101", "screenings_in"),
      [[448, 98], [448, 68], [480, 68]]),
    line("raked-screenings", "screenings-solids", ref("SCR-102", "removed_screenings"), ref("SK-102", "screenings_in"),
      [[270.4, 196.8]]),
    line("washer-water", "wash-water", ref("WW-1", "tie"), ref("WC-101", "wash_water")),
    line("washer-return", "return-liquor", ref("WC-101", "return_liquor"), ref("RL-1", "tie")),
    line("grit-slurry", "grit-slurry", ref("GR-101", "grit_slurry"), ref("GW-101", "raw_grit_in"), [[552, 411]]),
    line("washed-grit", "washed-grit", ref("GW-101", "washed_grit_out"), ref("GB-101", "grit_in"),
      [[690, 411], [690, 372], [741, 372]]),
    line("grit-water", "wash-water", ref("WW-2", "tie"), ref("GW-101", "wash_water")),
    line("grit-return", "return-liquor", ref("GW-101", "return_liquor"), ref("RL-2", "tie")),
  ];
  const network = screeningNetwork([...blocks, ...gates, ...boundaries,
    junction("Split", 100, "in"), junction("Join", 473, "out")], connections);

  const reading = { id: "reading", kind: "digital-data", direction: "out", anchor: "E" };
  const datum = "SCR-101 channel datum";
  const transmitters = ["upstream", "downstream"].map((side, i) => composeInstrument({
    id: `LIT-10${i + 1}`, preset: "inst-field", tag: { letters: "LIT", loop: `10${i + 1}` },
    measuredQuantity: "level", engineeringUnit: "m", datum, ports: [reading],
  }, { x: 106, y: 423 + i * 68 }));
  const delta = composeInstrument({
    id: "CALC-101", preset: "inst-computer", tag: { letters: "CALC", loop: "101" }, engineeringUnit: "m",
    executionHost: "PLC-01", operation: { type: "subtract", inputs: transmitters.map(({ metadata }) => metadata.id), commonDatum: datum },
    ports: [{ id: "upstream", anchor: "W", kind: "digital-data", direction: "in" },
      { id: "downstream", anchor: "S", kind: "digital-data", direction: "in" }],
  }, { x: 273, y: 423 });
  const control = instrumentNetwork([...transmitters, delta], transmitters.map(({ metadata }, i) => ({
    id: `reading-${i + 1}`, kind: "digital-data", from: { assetId: metadata.id, portId: "reading" },
    to: { assetId: delta.metadata.id, portId: i ? "downstream" : "upstream" },
  })));
  const controls = { equipmentId: "SCR-101", upstream: "LIT-101", downstream: "LIT-102", differential: "CALC-101" };
  const drawRoute = ({ points, kind }) => {
    // Colour-independent media cues. Labels in the figure identify each service.
    const shapes = routeLine("line-flow", points).shapes;
    const dash = { "wash-water": "3 3", "return-liquor": "1 3", "slurry-process": "10 3 2 3",
      "bulk-handling": "7 3" }[kind] ?? { "slurry-process": "10 3 2 3", "bulk-handling": "7 3" }[SCREENING_STREAMS[kind]];
    if (dash) shapes[0] = { ...shapes[0], dash };
    return shapes;
  };
  const shapeLabels = [
    note(24, 30, "Inlet works | Provisional review topology", "start"), note(24, 47, "Illustrative routes and normal gate positions", "start"),
    note(14, 246, "Raw wastewater", "start"), note(812, 268, "Degritted wastewater", "end"),
    note(160, 167, "SG-101"), note(160, 235, "SG-102"),
    note(160, 303, "BG-101"), note(230, 313, "Normally closed bypass", "start"),
    note(223, 217, "SCR-101"), note(255, 284, "SCR-102"),
    note(303, 73, "Screenings"), note(366, 64, "Wash water", "start"), note(366, 145, "Return liquor", "start"),
    note(389, 122, "WC-101"), note(480, 122, "SK-101"), note(403, 238, "SK-102"), note(334, 219, "Raked screenings"),
    note(607, 309, "GR-101"), note(541, 375, "Grit slurry", "end"),
    note(614, 361, "Wash water", "start"), note(614, 472, "Return liquor", "start"),
    note(645, 443, "GW-101"), note(741, 446, "GB-101"), note(737, 363, "Washed grit"),
    note(24, 379, "SCR-101 / Separate differential-level association", "start"),
    note(24, 539, "Equipment and wash/return tie-ins are illustrative. Process performance and control thresholds are outside this fixture.", "start"),
  ];
  return { assets, schedule, network, controls, control, gates, shapes: [
    ...network.edges.flatMap(drawRoute),
    ...[100, 473].map((x) => ({ c: [x, 256, 2.4], role: "dot", fill: "solid" })),
    ...blocks.flatMap(({ shapes }) => shapes), ...gates.flatMap(({ shapes }) => shapes),
    ...control.edges.flatMap(({ points }, i) => routeLine("line-data", i === 0 ? points :
      [points[0], [273, points[0][1]], points[1]]).shapes),
    ...transmitters.flatMap(({ shapes }) => shapes), ...delta.shapes, ...shapeLabels,
  ] };
}
