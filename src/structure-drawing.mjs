import { esc, render, svgDoc } from "./render.mjs";
import { projectStructure } from "./structure-projections.mjs";

const fmt = (n) => String(Number(n.toFixed(6)));
const metric = (n) => Number(n.toFixed(3)).toString();
const level = (n) => `RL ${metric(n)} m`;
const strokePath = (points, closed = false) =>
  points.map(([x,y], i) => `${i ? "L" : "M"}${fmt(x)} ${fmt(y)}`).join(" ") + (closed ? " Z" : "");
const angleTitle = { "A-A": "A–A", "B-B": "B–B" };
export const STRUCTURE_PANEL = Object.freeze({ width: 520, height: 340 });

export function drawStructure(placeSymbol, model, options = {}) {
  const { profile = "screen", theme = "light", id = `${model.kind}-${options.view ?? model.viewPolicy.preferred}` } = options;
  if (options.deliverable && options.deliverable !== "review") throw new RangeError("Family 09 is eligible for illustrative review only");
  const print = profile === "print";
  const result = projectStructure(model, options);
  const { view, axis, extent, verticalExtent: [bottom, top], reverse, cut, span, face } = result;
  const plan = view === "plan", schematic = view === "schematic";
  const unitsHigh = top-bottom;
  const scale = Math.min(326/extent, 157/unitsHigh);
  const startX = 212 - extent * scale/2;
  const topY = 133 - unitsHigh * scale/2;
  const project = ([x,y]) => [startX + (reverse ? extent-x : x) * scale, topY + (top-y) * scale];
  const body = [];
  function path(points, { closed = false, dash, attr = "" } = {}) {
    const pixels = points.map(project);
    if (pixels.every(([x,y]) => Math.hypot(x-pixels[0][0],y-pixels[0][1]) < 0.001)) return "";
    return `<path d="${strokePath(pixels,closed)}"${dash ? ` stroke-dasharray="${dash}"` : ""}${attr} />`;
  }
  function ring(point, radius, attr = "") {
    const [x,y] = project(point);
    return `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(radius)}"${attr} />`;
  }
  const wire = (points, attr = "") => `<path d="${strokePath(points)}"${attr} />`;
  const text = (x,y,value,{ size=13, anchor="start", bold=false, attr="" } = {}) =>
    `<text x="${fmt(x)}" y="${fmt(y)}" fill="currentColor" stroke="none" font-size="${size}" text-anchor="${anchor}"${bold ? ' font-weight="700"' : ""}${attr}>${esc(value)}</text>`;

  const viewName = { schematic: "Schematic", plan: "Plan", section: `Section ${angleTitle[cut?.id]}`,
    elevation: `${face?.[0].toUpperCase() ?? ""}${face?.slice(1) ?? ""} elevation` }[view];
  body.push(`<g data-structure-asset="${esc(model.assetId)}" data-structure-view="${view}">`);
  if (!options.hideTitle) body.push(text(21,24,options.heading ?? model.name,{ size:18, bold:true }));
  body.push(text(21,43,viewName,{ bold:true }));
  body.push(text(499,43,"NOT TO SCALE / ILLUSTRATIVE",{ anchor:"end" }));
  for (const { id: feature, type, points, closed, centre, radius, at, dash, secondary, partId, x,
    half, endRise, bottomSeam, topSeam } of result.primitives) {
    const attr = ` data-feature="${feature}" data-plotter-role="${secondary ? "secondary" : "primary"}" opacity="${secondary && !print ? 0.32 : 1}"${partId ? ` data-part="${esc(partId)}"` : ""}`;
    if (type === "path") body.push(path(points,{ closed,dash,attr }));
    if (type === "circle") body.push(ring(centre,radius*scale,attr));
    if (type === "point") body.push(ring(at,feature.startsWith("decanter") ? 2.6 : 1.7,attr));
    if (type === "capsule") {
      const [cx,y0] = project([x,bottomSeam]);
      const [,y1] = project([x,topSeam]);
      const dx = half*scale, dy = endRise*scale, a = fmt(cx-dx), b = fmt(cx+dx);
      const arc = `${fmt(dx)} ${fmt(dy)} 0 0 1`;
      body.push(`<path${attr} d="M${a} ${fmt(y0)}L${a} ${fmt(y1)}A${arc} ${b} ${fmt(y1)}L${b} ${fmt(y0)}A${arc} ${a} ${fmt(y0)}Z"/>`);
    }
  }

  for (const port of result.ports) {
    const { id: portId, medium, direction, point, normal } = port;
    const [x,y] = project(point);
    const dx = normal[0]*(reverse ? -1 : 1), dy = -normal[1];
    const attr = ` data-port="${esc(portId)}" data-medium="${esc(medium)}" data-direction="${direction}"`;
    body.push(`<g${attr}><title>${esc(`${portId} · ${medium} · ${direction}`)}</title>`);
    if (dx || dy) {
      body.push(wire([[x,y],[x+dx*12,y+dy*12]]), ring([point[0]+normal[0]*12/scale,point[1]+normal[1]*12/scale],2.25));
    } else body.push(ring(point,3.1));
    body.push("</g>");
  }

  if (plan) {
    for (const marker of result.cuts) {
      const [a,b] = marker.points.map(project);
      const label = marker.id[0];
      body.push(wire([a,b],` stroke-dasharray="6 4" data-plotter-role="secondary" opacity="${print ? 1 : 0.32}"`));
      const positions = marker.axis === 0 ? [[a[0]-15,a[1]-8],[b[0]+15,b[1]-8]]
        : [[a[0]+10,a[1]-6],[b[0]+10,b[1]+12]];
      for (const [x,y] of positions) body.push(text(x,y,label,{ anchor:"middle", bold:true }));
    }
  }

  const labelledLevels = [];
  for (const { name, rl, segments } of result.levels) {
    const dash = { TWL:"", CURRENT:"10 3 2 3", BWL:"4 3", WL:"" }[name];
    const duplicate = labelledLevels.find((entry) => Math.abs(entry.rl-rl) < 1e-8);
    if (duplicate) {
      duplicate.name += ` / ${name === "CURRENT" ? "NOW" : name}`;
      continue;
    }
    labelledLevels.push({ name: name === "CURRENT" ? "NOW" : name, rl, y: project([0,rl])[1] });
    for (const [a,b] of segments) body.push(path([[a,rl],[b,rl]],{ dash,attr:` data-water-level="${name}"` }));
  }
  labelledLevels.forEach(({ name, rl, y }, i) => {
    // A fixed annotation lane keeps labels distinct even at coincident or near-coincident RLs.
    const targetY = 91 + i*31;
    const [x] = project([span[1],rl]);
    body.push(wire([[x+1,y],[x+7,y],[394,targetY-4],[401,targetY-4]],' stroke-dasharray="2 3"'),
      text(407,targetY,name,{ bold:true }),text(407,targetY+13,level(rl),{ size:11 }));
  });

  if (!schematic) {
    const byDimension = Object.fromEntries(model.dimensions.map((d) => [d.id,d]));
    const [firstX,edgeY] = project([span[0],bottom]);
    const [lastX] = project([span[1],bottom]);
    const x0 = Math.min(firstX,lastX), x1 = Math.max(firstX,lastX);
    const dimY = Math.max(edgeY+23,229);
    const round = ["circular","pressure"].includes(model.geometry.shape);
    const full = Math.abs(span[1]-span[0]-extent) < 1e-8;
    const label = full ? `${round ? "Ø" : axis ? "W" : "L"} ${metric(byDimension[axis ? "width" : "length"].valueM)} m` :
      `Cut chord ${metric(span[1]-span[0])} m`;
    const horizontalWitness = plan ? project([0,byDimension.length.fromM[1]])[1] : edgeY;
    body.push(wire([[x0,horizontalWitness+2],[x0,dimY+5]]),wire([[x1,horizontalWitness+2],[x1,dimY+5]]),
      wire([[x0-4,dimY],[x1+4,dimY]]),wire([[x0-3,dimY+3],[x0+3,dimY-3]]),
      wire([[x1-3,dimY+3],[x1+3,dimY-3]]),text((x0+x1)/2,dimY+15,label,{ anchor:"middle",bold:true }));
    if (plan && !round) {
      const [left,b0] = project([0,byDimension.width.fromM[1]]);
      const [,b1] = project([0,byDimension.width.toM[1]]);
      const dimX = left-29;
      const labelAt = [dimX-4,(b0+b1)/2];
      body.push(wire([[left-6,b0],[dimX-5,b0]]),wire([[left-6,b1],[dimX-5,b1]]),
        wire([[dimX,b0+4],[dimX,b1-4]]),
        text(...labelAt,`W ${metric(byDimension.width.valueM)} m`,{ anchor:"middle",bold:true,
          attr:` transform="rotate(-90 ${labelAt.map(fmt).join(" ")})"` }));
    }
    if (!plan) {
      const d = byDimension.depth;
      const [,y0] = project([0,d.fromM[2]]), [,y1] = project([0,d.toM[2]]);
      const dimX = x0-25;
      body.push(wire([[dimX,y0],[dimX,y1]]),wire([[dimX-4,y0],[dimX+5,y0]]),
        wire([[dimX-4,y1],[dimX+5,y1]]),
        text(21,268,`Depth ${metric(d.valueM)} m  ·  Floor ${level(bottom)}  ·  Top ${level(top)}`,{ bold:true }));
    }
  }

  const components = model.components.filter(({ membership, representation }) => membership !== "reference" && representation !== "preset");
  const libraryParts = components.map((component) => {
    const placed = placeSymbol(component.symbolId, { q:component.q }, component.options);
    return { ...component, library: placed };
  });
  if (schematic && libraryParts.length) {
    const gap = Math.min(68,440/libraryParts.length);
    const start = 260 - gap * (libraryParts.length-1)/2;
    for (const [i,part] of libraryParts.entries()) {
      const placed = placeSymbol(part.symbolId,{ x:start+i*gap,y:254,s:0.9,q:part.q },part.options);
      body.push(`<g data-library-symbol="${esc(part.symbolId)}" data-membership="${part.membership}" data-part="${esc(part.id)}"><title>${esc(part.symbolId)}</title>${render(placed.shapes,{ profile })}</g>`);
    }
  }
  if (result.decanter) {
    const value = result.decanter.valid ? `${result.decanter.id}  ·  Intake ${level(result.decanter.intakeM[2])}` :
      result.decanter.diagnostics.filter(({ severity }) => severity === "error").map(({ code }) => code).join(" · ");
    const lines = value.length > 65 && !result.decanter.valid ? value.match(/.{1,62}(?:\s|$)/g) ?? [value] : [value];
    lines.slice(0,2).forEach((item,i) => body.push(text(21,288+i*13,item,{ size:12 })));
  }
  if (model.portDiagnostics.length) body.push(text(21,303,"Illustrative port placement flagged · see model diagnostics",{ size:12 }));
  body.push(text(21,321,`Datum ${model.datum.id} · ${model.siteTransform ? "site transform unverified" : "site unsurveyed"}`,{ size:12 }));
  body.push("</g>");
  const svg = svgDoc(id,`${options.heading ?? model.name} · ${viewName}`,
    "Illustrative review. Metric local coordinates and project RL. Engineering criteria and vendor fit unverified.",
    body.join("\n"),{ profile,theme,...STRUCTURE_PANEL });
  return { ...result, libraryParts, svg };
}
