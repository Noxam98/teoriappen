// Geometry checks for the drawn pictures (signs, lights, road markings, junction scenes)
// and for question cards on narrow screens. Used by the figure lab (debug.html).

export interface Problem {
  where: string;
  what: string;
  el: Element;
}

type G = SVGGraphicsElement;
const TOL = 0.6;

/** Matrix from `el`'s user space to `ref`'s user space. */
const toSpace = (el: G, ref: G) => ref.getScreenCTM()!.inverse().multiply(el.getScreenCTM()!);
const scaleOf = (m: DOMMatrix) => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));

/** Points on the element's outline (or its box corners for text), in `ref` coordinates, plus half the stroke width there. */
function outline(el: G, ref: G): { pts: DOMPoint[]; half: number } {
  const m = toSpace(el, ref);
  const style = getComputedStyle(el);
  const stroked = style.stroke !== 'none' && style.stroke !== '' && !el.closest('[data-nostroke]');
  const half = stroked ? (parseFloat(style.strokeWidth) || 0) / 2 * scaleOf(m) : 0;
  const local: DOMPoint[] = [];
  if (el instanceof SVGGeometryElement && !(el instanceof SVGTextElement)) {
    const len = el.getTotalLength();
    const n = Math.max(16, Math.min(240, Math.ceil(len / 1.2)));
    for (let i = 0; i <= n; i++) local.push(el.getPointAtLength((len * i) / n));
  } else {
    const b = el.getBBox();
    local.push(new DOMPoint(b.x, b.y), new DOMPoint(b.x + b.width, b.y), new DOMPoint(b.x, b.y + b.height), new DOMPoint(b.x + b.width, b.y + b.height));
  }
  return { pts: local.map(p => p.matrixTransform(m)), half };
}

const SHAPES = 'path, rect, circle, ellipse, line, polyline, polygon, text';
const shapesIn = (root: Element) => [...root.querySelectorAll<G>(SHAPES)].filter(e => !e.closest('[data-exempt]') && e.getAttribute('opacity') !== '0');

// ---------- signs: the pictogram must stay inside the frame's field ----------
type Area = (p: DOMPoint) => number; // signed distance, > 0 inside

const tri = (p: DOMPoint) => {
  const v = [[50, 23], [81, 78], [19, 78]];
  let d = Infinity;
  for (let i = 0; i < 3; i++) {
    const [x1, y1] = v[i], [x2, y2] = v[(i + 1) % 3];
    const nx = y2 - y1, ny = x1 - x2, len = Math.hypot(nx, ny);
    // inward normal for clockwise vertex order in screen coordinates
    d = Math.min(d, -((p.x - x1) * nx + (p.y - y1) * ny) / len);
  }
  return d + 1.5; // the white field has a 1.5 px rounded edge
};
const disc = (r: number): Area => p => r - Math.hypot(p.x - 50, p.y - 50);
const rect = (x1: number, y1: number, x2: number, y2: number): Area => p => Math.min(p.x - x1, x2 - p.x, p.y - y1, y2 - p.y);

const AREAS: Record<string, Area> = {
  tri,
  ring: disc(36),
  disc: disc(44),        // keep 3 px from the white rim
  end: disc(44),
  plate: rect(7, 7, 93, 93),
  'plate-wide': rect(7, 7, 133, 93),
  under: p => Math.min(p.x - 10, 90 - p.x), // the times of a time plate stay inside its frame
};

export function checkSign(svg: SVGSVGElement, where: string, out: Problem[]) {
  for (const area of svg.querySelectorAll<G>('[data-area]')) {
    const test = AREAS[area.dataset.area!];
    for (const el of shapesIn(area)) {
      const { pts, half } = outline(el, area);
      const worst = Math.min(...pts.map(p => test(p) - half));
      if (worst < -TOL) out.push({ where, what: `${el.tagName} sticks out of the ${area.dataset.area} field by ${(-worst).toFixed(1)}`, el });
    }
  }
}

// ---------- every picture: nothing cut off by the edge ----------
export function checkViewBox(svg: SVGSVGElement, where: string, out: Problem[]) {
  const vb = svg.viewBox.baseVal;
  for (const el of shapesIn(svg)) {
    if (el.closest('[data-bleed]')) continue; // roads and centre lines that continue past the edge on purpose
    const { pts, half } = outline(el, svg);
    const worst = Math.min(...pts.map(p => Math.min(p.x - vb.x, vb.x + vb.width - p.x, p.y - vb.y, vb.y + vb.height - p.y) - half));
    if (worst < -TOL) out.push({ where, what: `${el.tagName} is cut off by the picture edge (${(-worst).toFixed(1)})`, el });
  }
}

// ---------- road markings: symbols and texts stay in their lane ----------
export function checkWithin(svg: SVGSVGElement, where: string, out: Problem[]) {
  for (const box of svg.querySelectorAll<G>('[data-within]')) {
    const [x1, y1, x2, y2] = box.dataset.within!.split(' ').map(Number);
    for (const el of [box, ...shapesIn(box)].filter(e => e instanceof SVGGeometryElement || e instanceof SVGTextElement)) {
      const { pts, half } = outline(el, svg);
      const worst = Math.min(...pts.map(p => Math.min(p.x - x1, x2 - p.x, p.y - y1, y2 - p.y) - half));
      if (worst < -TOL) out.push({ where, what: `${el.tagName} leaves its lane/area by ${(-worst).toFixed(1)}`, el });
    }
  }
}

// ---------- junction scenes ----------
interface Box { x1: number; y1: number; x2: number; y2: number }
function boxIn(el: G, svg: G): Box {
  const pts = shapesIn(el).flatMap(s => { const o = outline(s, svg); return o.pts.map(p => ({ x: p.x, y: p.y, h: o.half })); });
  if (el instanceof SVGGeometryElement) pts.push(...outline(el, svg).pts.map(p => ({ x: p.x, y: p.y, h: 0 })));
  return {
    x1: Math.min(...pts.map(p => p.x - p.h)), y1: Math.min(...pts.map(p => p.y - p.h)),
    x2: Math.max(...pts.map(p => p.x + p.h)), y2: Math.max(...pts.map(p => p.y + p.h)),
  };
}
const overlap = (a: Box, b: Box, pad = 0) => a.x1 < b.x2 + pad && b.x1 < a.x2 + pad && a.y1 < b.y2 + pad && b.y1 < a.y2 + pad;

export function checkScene(svg: SVGSVGElement, where: string, out: Problem[]) {
  const roads: Box[] = (svg.dataset.roads ?? '').split(';').filter(Boolean).map(r => {
    const [x, y, w, h] = r.split(',').map(Number);
    return { x1: x, y1: y, x2: x + w, y2: y + h };
  });
  const onRoad = (p: { x: number; y: number }, m: number) => roads.some(r => p.x >= r.x1 - m && p.x <= r.x2 + m && p.y >= r.y1 - m && p.y <= r.y2 + m);

  const vehicles = [...svg.querySelectorAll<G>('[data-vehicle]')];
  const boxes = vehicles.map(v => ({ id: v.dataset.vehicle!, el: v, box: boxIn(v, svg) }));
  for (const v of vehicles) {
    for (const el of shapesIn(v)) {
      const { pts } = outline(el, svg);
      if (pts.some(p => !onRoad(p, 0.5))) { out.push({ where, what: `vehicle ${v.dataset.vehicle}: ${el.tagName} is off the asphalt`, el }); break; }
    }
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    if (overlap(boxes[i].box, boxes[j].box)) out.push({ where, what: `vehicles ${boxes[i].id} and ${boxes[j].id} overlap`, el: boxes[j].el });
  }
  const tags = [...svg.querySelectorAll<G>('[data-tag]')].map(el => ({ el, box: boxIn(el, svg) }));
  for (const t of tags) for (const b of boxes) if (overlap(t.box, b.box, -1) && !t.el.parentElement?.contains(b.el)) {
    out.push({ where, what: `"DU" tag overlaps vehicle ${b.id}`, el: t.el });
  }
  for (const s of svg.querySelectorAll<SVGSVGElement>('svg[data-scene-sign]')) {
    const r = s.getBoundingClientRect(), m = svg.getScreenCTM()!.inverse();
    const a = new DOMPoint(r.left, r.top).matrixTransform(m), b = new DOMPoint(r.right, r.bottom).matrixTransform(m);
    const box = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    if (roads.some(rd => overlap(box, rd, -0.5))) out.push({ where, what: 'a road sign stands on the asphalt', el: s });
    for (const v of boxes) if (overlap(box, v.box)) out.push({ where, what: `a road sign overlaps vehicle ${v.id}`, el: s });
    for (const t of tags) if (overlap(box, t.box)) out.push({ where, what: 'a road sign overlaps the "DU" tag', el: s });
  }
  for (const pd of svg.querySelectorAll<G>('[data-ped]')) {
    const box = boxIn(pd, svg);
    for (const v of boxes) if (overlap(box, v.box)) out.push({ where, what: `pedestrian overlaps vehicle ${v.id}`, el: pd });
  }
}

// ---------- question cards: nothing wider than the card ----------
export function checkCard(card: HTMLElement, where: string, out: Problem[]) {
  const limit = card.getBoundingClientRect();
  for (const el of card.querySelectorAll<HTMLElement | SVGSVGElement>('.qtext, .opt, .otext, .fig, .fig svg, .explain, .qmeta')) {
    const r = el.getBoundingClientRect();
    if (r.right > limit.right + 0.5 || r.left < limit.left - 0.5) out.push({ where, what: `${el.className.toString() || el.tagName} wider than the card`, el });
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') {
      out.push({ where, what: `${el.className} has hidden overflow`, el });
    }
  }
  for (const w of card.querySelectorAll<HTMLElement>('.w')) {
    const r = w.getBoundingClientRect(), box = (w.closest('.otext, .qtext, .f') as HTMLElement).getBoundingClientRect();
    if (r.right > box.right + 1) out.push({ where, what: `word "${w.textContent}" runs past its text box`, el: w });
  }
}
