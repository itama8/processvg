// Authored exercise dimensions in metres. Coordinates are relative to each asset's local datum.
// Each projection is explicit input to the renderer, independent of the schematic glyph.
const line = (points, type = "equipment") => ({ type, points });
const polygon = (points, type = "outline") => ({ type, points, closed: true });
const rect = (x, y, w, h, type) => polygon([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], type);
const circle = (x, y, radius, type = "equipment") => ({ type, circle: { center: [x, y], radius } });
const dimension = (name, from, to, offset) => ({ name, from, to, offset });

function projections({ l, w, d, plan, section, elevation }) {
  return {
    unit: "m", source: "F08 review exercise input", datum: "Local outline centre / top datum", unitsPerMetre: 8,
    projections: {
      plan: { features: plan, dimensions: [
        dimension("length", [-l / 2, w / 2], [l / 2, w / 2], 0.65),
        dimension("width", [l / 2, -w / 2], [l / 2, w / 2], 0.75),
      ] },
      section: { features: section, dimensions: [
        dimension("length", [-l / 2, d], [l / 2, d], 0.65),
        dimension("depth", [l / 2, 0], [l / 2, d], 0.75),
      ] },
      elevation: { features: elevation, dimensions: [
        dimension("width", [-w / 2, d], [w / 2, d], 0.65),
        dimension("height", [w / 2, 0], [w / 2, d], 0.75),
      ] },
    },
  };
}

function screen({ l, w, d, toe, crest, deck, discharge, head, drive, shape }) {
  const channel = line([[-l / 2, 0], [-l / 2, d], [l / 2, d], [l / 2, 0]], "outline");
  return projections({ l, w, d,
    plan: [rect(-l / 2, -w / 2, l, w), rect(toe[0], -w / 2, crest[0] - toe[0], w, "equipment"),
      rect(deck[0], -w / 2, deck[1], w, "access"), line([[crest[0], 0], [discharge[0], 0]])],
    section: [channel, line([[-l / 2, 0.6], [l / 2, 0.6]], "waterline"),
      line([[deck[0], 0], [deck[0] + deck[1], 0]], "access"), ...shape(toe, crest),
      line([crest, discharge]), ...(drive ? [line([crest, head]), circle(...head, 0.28)] :
        [line([crest, head, [head[0] + 0.22, head[1] - 0.18]])])],
    elevation: [rect(-w / 2, 0, w, d), rect(-w / 2, crest[1], w, toe[1] - crest[1], "equipment"),
      line([[0, crest[1]], [0, head[1]]]), ...(drive ? [circle(0, head[1], 0.28)] : [line([[0, head[1]], [0.22, head[1] - 0.18]])])],
  });
}

const rack = (toe, crest) => [line([toe, crest])];
const step = () => [line([[-1.7, 1.75], [-1, 1.75], [-1, 1.2], [-0.3, 1.2], [-0.3, 0.65], [0.4, 0.65], [0.4, 0.05], [1.1, 0.05], [1.1, -0.5]])];
const drum = () => [circle(0, 0.85, 0.72), line([[-0.62, 0.85], [0.62, 0.85]])];
const band = () => [polygon([[-0.4, 1.9], [0.7, -0.7], [1, -0.7], [-0.1, 1.9]], "equipment")];
const screenInputs = {
  "screen-bar": { l: 6.4, w: 1.6, d: 2.1, toe: [-1.6, 2.1], crest: [0.9, -0.65], deck: [0.8, 2.2], discharge: [2.6, -0.4], head: [0.9, -1.15], drive: true, shape: rack },
  "screen-fine": { l: 4.8, w: 1.7, d: 2, toe: [-0.7, 1.6], crest: [0.7, 0.15], deck: [0.75, 1.5], discharge: [1.85, 0.1], head: [0.7, -0.6], drive: true, shape: drum },
  "screen-manual": { l: 5.6, w: 1.4, d: 1.9, toe: [-1.2, 1.9], crest: [0.8, -0.4], deck: [0.7, 1.8], discharge: [2.1, -0.25], head: [0.55, -1.03], drive: false, shape: rack },
  "screen-step": { l: 6, w: 1.8, d: 2.2, toe: [-1.7, 1.75], crest: [1.1, -0.5], deck: [1.1, 1.9], discharge: [2.5, -0.5], head: [1.1, -1.05], drive: true, shape: step },
  "screen-perforated": { l: 5.8, w: 1.9, d: 2.1, toe: [-0.95, 2], crest: [1.1, -0.55], deck: [1, 1.8], discharge: [2.35, -0.55], head: [1.1, -1.2], drive: true, shape: rack },
  "screen-drum": { l: 5.2, w: 2.2, d: 2.3, toe: [-0.72, 1.57], crest: [0.72, 0.13], deck: [0.8, 1.6], discharge: [2, 0.13], head: [0.72, -0.55], drive: true, shape: drum },
  "screen-band": { l: 5.4, w: 1.8, d: 2, toe: [-0.4, 1.9], crest: [1, -0.7], deck: [1, 1.6], discharge: [2.3, -0.7], head: [1, -1.25], drive: true, shape: band },
};

function box(l, w, d, sectionDetails, elevationDetails = [], planDetails = []) {
  return projections({ l, w, d, plan: [rect(-l / 2, -w / 2, l, w), ...planDetails],
    section: [rect(-l / 2, 0, l, d), ...sectionDetails],
    elevation: [rect(-w / 2, 0, w, d), ...elevationDetails] });
}

function bin(w, l, d, floor) {
  return projections({ l, w, d, plan: [rect(-l / 2, -w / 2, l, w)],
    section: [polygon([[-l / 2, 0], [l / 2, 0], [floor[0], d], [-floor[0], d]])],
    elevation: [polygon([[-w / 2, 0], [w / 2, 0], [floor[1], d], [-floor[1], d]])] });
}

export const physicalFixtures = {
  ...Object.fromEntries(Object.entries(screenInputs).map(([id, input]) => [id, screen(input)])),
  "conveyor-screw": box(6, 0.85, 2.25, [line([[-3, 2], [3, 0.25]]), line([[-2, 1.9], [-1.7, 1.4], [-1.4, 1.72], [-1.1, 1.2], [-0.8, 1.55]])],
    [circle(0, 0.42, 0.33)], [line([[-3, 0], [3, 0]])]),
  "grit-classifier": box(5.8, 1.8, 2.8, [line([[-2.9, 2.5], [2.9, 0.3]]), polygon([[-2.6, 0.6], [-1.1, 0.6], [-1.2, 1.8], [-2.1, 2.3]], "equipment")],
    [circle(0, 0.45, 0.31)], [rect(-2.4, -0.7, 1.4, 1.4, "equipment")]),
  "grit-separator": projections({ l: 1.7, w: 1.7, d: 3.2,
    plan: [circle(0, 0, 0.85, "outline"), line([[-1.55, -0.85], [0, -0.85]]), circle(0, 0, 0.21)],
    section: [polygon([[-0.85, 0], [0.85, 0], [0.85, 1.05], [0.16, 3.2], [-0.16, 3.2], [-0.85, 1.05]]),
      line([[-1.55, 0.4], [-0.85, 0.4]]), line([[0, 0], [0, -0.55]])],
    elevation: [polygon([[-0.85, 0], [0.85, 0], [0.85, 1.05], [0.16, 3.2], [-0.16, 3.2], [-0.85, 1.05]]),
      circle(0.48, 0.4, 0.15)] }),
  "container": bin(1.9, 3.5, 1.7, [1.45, 0.73]),
  "mixer": box(1.4, 1.4, 2.8, [rect(-0.42, 0, 0.84, 0.58, "equipment"), line([[0, 0.58], [0, 2.55]]), line([[-0.7, 2.55], [0.7, 2.55]])],
    [line([[0, 0], [0, 2.55]]), line([[-0.63, 2.55], [0.63, 2.55]])], [circle(0, 0, 0.64)]),
  "mixer-static": box(3.2, 1.1, 1.1, [line([[-1.6, 0.15], [-0.8, 0.95], [0, 0.15], [0.8, 0.95], [1.6, 0.15]])],
    [circle(0, 0.55, 0.51)], [line([[-1.6, 0], [1.6, 0]])]),
  "screen-washer-compactor": box(4.8, 1.5, 2.4,
    [line([[-2.4, 1.52], [-1.2, 1.52], [0.25, 0.8], [2.4, 0.8]]), line([[-1.2, 0], [-1.2, 0.55]]), line([[0.2, 2.1], [0.2, 2.4]])],
    [circle(0, 0.8, 0.33)], [rect(-2, -0.65, 1.2, 1.3, "equipment")]),
  "screen-grinder": box(2.4, 1.35, 1.85, [line([[-0.45, 0.25], [-0.45, 1.45]]), line([[0.45, 0.25], [0.45, 1.45]])],
    [line([[-0.45, 0.4], [0.45, 0.4]])], [circle(-0.45, 0, 0.34), circle(0.45, 0, 0.34)]),
  "grit-vortex": projections({ l: 4.8, w: 4.8, d: 3.9,
    plan: [circle(0, 0, 2.4, "outline"), circle(0, 0, 0.7), line([[-3.6, -2.4], [0, -2.4]]), line([[2.4, 0], [3.6, 0]])],
    section: [line([[-2.4, 0], [-2.4, 2.4], [-0.7, 3.9], [0.7, 3.9], [2.4, 2.4], [2.4, 0]], "outline"),
      line([[-2.4, 0.55], [2.4, 0.55]], "waterline"), line([[0, 2.8], [0, 3.9]])],
    elevation: [rect(-2.4, 0, 4.8, 3.9), rect(-0.7, 3.15, 1.4, 0.75, "equipment")] }),
  "grit-aerated": projections({ l: 8.2, w: 2.8, d: 3.45,
    plan: [rect(-4.1, -1.4, 8.2, 2.8), line([[-3.7, 1], [3.7, 1]])],
    section: [line([[-4.1, 0], [-4.1, 2.5], [-2.1, 3.45], [2.1, 3.45], [4.1, 2.5], [4.1, 0]], "outline"),
      line([[-4.1, 0.65], [4.1, 0.65]], "waterline"), line([[-3.3, 1.5], [-3.3, 2.15], [3.3, 2.15]]),
      ...[-2.6, 0, 2.6].map((x) => circle(x, 2.03, 0.12))],
    elevation: [line([[-1.4, 0], [-1.4, 2.6], [-0.46, 3.45], [0.46, 3.45], [1.4, 2.6], [1.4, 0]], "outline"),
      circle(1, 2.05, 0.14)] }),
  "grit-horizontal": projections({ l: 10, w: 1.8, d: 2.7,
    plan: [rect(-5, -0.9, 10, 1.8), rect(-0.8, -0.6, 1.6, 1.2, "equipment")],
    section: [line([[-5, 0], [-5, 1.9], [-1.15, 1.9], [-0.8, 2.7], [0.8, 2.7], [1.15, 1.9], [5, 1.9], [5, 0]], "outline"),
      line([[-5, 0.58], [5, 0.58]], "waterline")],
    elevation: [line([[-0.9, 0], [-0.9, 1.9], [-0.6, 1.9], [-0.6, 2.7], [0.6, 2.7], [0.6, 1.9], [0.9, 1.9], [0.9, 0]], "outline")] }),
  "grit-washer": box(3.8, 2.2, 2.6, [polygon([[-1.5, 0.4], [1.5, 0.4], [0.6, 2.2], [-0.6, 2.2]], "equipment"),
    line([[0, 0], [0, 1.5]]), line([[0, 1.5], [1.9, 0.9]])],
    [circle(0, 1.1, 0.6)], [circle(-0.45, 0, 1)]),
  "grit-bin": bin(2.2, 3.3, 1.8, [1.32, 0.86]),
  "screenings-chute": bin(1.15, 1.25, 2.7, [0.23, 0.2]),
};
