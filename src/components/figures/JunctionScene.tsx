import type { ReactNode } from 'react';
import type { Leg, Scene } from '../../types';
import { signGraphic } from './signs/catalog';
import { Person } from './signs/parts';
import { vehicle } from './vehicles';

// Geometry: 300×300 picture, junction centre (150,150), road half-width 30 (two 30 px lanes), north is up.
type Vec = [number, number];
const C: Vec = [150, 150];
const HW = 30;
const OUT: Record<Leg, Vec> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const ORDER: Leg[] = ['n', 'e', 's', 'w'];
const OTHER_COLORS = ['#d9473b', '#16a06a', '#e08a12', '#8b5cf6'];
const ME = '#2563eb';
const YELLOW = '#f4c20d', WHITE = '#f4f6f8';

const rightOf = ([x, y]: Vec): Vec => [-y, x];
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
const neg = ([x, y]: Vec): Vec => [-x, -y];
const f = (n: number) => n.toFixed(1);
const pt = (p: Vec) => `${f(p[0])} ${f(p[1])}`;

function destination(from: Leg, go: 'straight' | 'left' | 'right'): Leg {
  const i = ORDER.indexOf(from);
  return go === 'straight' ? ORDER[(i + 2) % 4] : go === 'left' ? ORDER[(i + 1) % 4] : ORDER[(i + 3) % 4];
}

/** Top view of a crossroads or T-junction with vehicles, their intended paths, signs and pedestrians. */
export function JunctionScene({ scene }: { scene: Scene }) {
  const t = scene.type === 't';
  const legs: Leg[] = t ? ['w', 'e', 's'] : ['n', 'e', 's', 'w'];
  const ped = scene.ped ?? [];
  const roads: [number, number, number, number][] = t
    ? [[0, 150 - HW, 300, 2 * HW], [150 - HW, 150 - HW, 2 * HW, 150 + HW]]
    : [[0, 150 - HW, 300, 2 * HW], [150 - HW, 0, 2 * HW, 300]];

  // paths of all vehicles
  const paths = scene.veh.map(v => {
    const out = OUT[v.from], head = neg(out), right = rightOf(head);
    const dOut = OUT[destination(v.from, v.go)], dRight = rightOf(dOut);
    const lane = v.kind === 'bike' ? HW - 10 : HW / 2;
    const entry = add(add(C, out, HW), right, lane);
    const exit = add(add(C, dOut, HW + 26), dRight, lane);
    const corner = add(entry, head, dot([exit[0] - entry[0], exit[1] - entry[1]], head));
    return { v, out, head, right, dOut, lane, entry, exit, corner };
  });

  let colorIdx = 0;
  const arrows: ReactNode[] = [], cars: ReactNode[] = [];
  for (const p of paths) {
    const color = p.v.me ? ME : p.v.kind === 'utrykning' ? '#e11d48' : OTHER_COLORS[colorIdx++ % OTHER_COLORS.length];
    const rot = (Math.atan2(p.head[0], -p.head[1]) * 180) / Math.PI;
    const shape = vehicle(p.v.kind ?? 'car', color, p.v.id, rot);
    const gap = ped.includes(p.v.from) ? 30 : 6;
    const centre = add(add(C, p.out, HW + gap + shape.len / 2), p.right, p.lane);
    const front = add(centre, p.head, shape.len / 2 + 2);
    const lastDir = p.v.go === 'straight' ? p.head : p.dOut;
    const n = rightOf(lastDir), tip = add(p.exit, lastDir, 10);
    const d = p.v.go === 'straight'
      ? `M${pt(front)} L${pt(p.exit)}`
      : `M${pt(front)} L${pt(p.entry)} Q${pt(p.corner)} ${pt(p.exit)}`;
    arrows.push(
      <g key={p.v.id} data-arrow={p.v.id}>
        <path d={d} fill="none" stroke={color} strokeWidth={3.5} strokeDasharray="7 5" strokeLinecap="round" />
        <path d={`M${pt(tip)} L${pt(add(p.exit, n, 7))} L${pt(add(p.exit, n, -7))} Z`} fill={color} />
      </g>,
    );
    const tag = add(centre, p.out, shape.len / 2 + 10);
    cars.push(
      <g key={p.v.id}>
        <g transform={`translate(${f(centre[0])} ${f(centre[1])}) rotate(${f(rot)})`} data-vehicle={p.v.id}>{shape.node}</g>
        {p.v.me && (
          <g transform={`translate(${f(tag[0])} ${f(tag[1])})`} data-tag="">
            <rect x={-12} y={-8} width={24} height={16} rx={8} fill={ME} stroke="#fff" strokeWidth={1.5} />
            <text x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fontFamily="'Barlow Semi Condensed', Arial, sans-serif" fontWeight={700} fontSize={11} fill="#fff">DU</text>
          </g>
        )}
      </g>,
    );
  }

  return (
    <svg className="scene" viewBox="0 0 300 300" role="img" aria-label="Situasjon i veikryss" data-roads={roads.map(r => r.join(',')).join(';')}>
      <rect width={300} height={300} fill="var(--ground)" />
      {roads.map(([x, y, w, h], i) => <rect key={`k${i}`} x={x - 7} y={y - 7} width={w + 14} height={h + 14} fill="var(--kerb)" data-bleed="" />)}
      {roads.map(([x, y, w, h], i) => <rect key={`r${i}`} x={x} y={y} width={w} height={h} fill="var(--asphalt)" />)}

      {legs.map(leg => {
        const a = add(C, OUT[leg], ped.includes(leg) ? HW + 28 : HW + 4), b = add(C, OUT[leg], 160);
        return <line key={leg} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={YELLOW} strokeWidth={2.5} strokeDasharray="12 12" data-bleed="" />;
      })}

      {paths.filter(p => p.v.kind === 'tram').map(p => {
        const far = add(p.entry, p.out, 160), away = add(p.exit, p.dOut, 160);
        const d = `M${pt(far)} L${pt(p.entry)} Q${pt(p.corner)} ${pt(p.exit)} L${pt(away)}`;
        return (
          <g key={`rail${p.v.id}`} data-bleed="">
            <path d={d} fill="none" stroke="#2b2f35" strokeWidth={13} opacity={0.55} />
            <path d={d} fill="none" stroke="var(--asphalt)" strokeWidth={8} />
          </g>
        );
      })}

      {ped.map(leg => {
        const o = OUT[leg], across = rightOf(o), mid = add(C, o, HW + 16), horizontal = o[0] !== 0;
        const walker = add(mid, across, -HW - 2);
        return (
          <g key={`ped${leg}`}>
            {Array.from({ length: 6 }, (_, k) => -HW + 2 + k * 10).map(k => {
              const p = add(mid, across, k);
              return horizontal
                ? <rect key={k} x={p[0] - 7} y={Math.min(p[1], p[1] + 6 * across[1])} width={14} height={6} fill={WHITE} />
                : <rect key={k} x={Math.min(p[0], p[0] + 6 * across[0])} y={p[1] - 7} width={6} height={14} fill={WHITE} />;
            })}
            <g transform={`translate(${f(walker[0] - 8)} ${f(walker[1] - 9)}) scale(.42)`} data-ped=""><Person c="#111" /></g>
          </g>
        );
      })}

      {Object.entries(scene.signs ?? {}).map(([leg, key]) => {
        const o = OUT[leg as Leg], p = add(add(C, o, HW + 22), rightOf(neg(o)), HW + 13);
        return <svg key={`sign${leg}`} x={p[0] - 12} y={p[1] - 12} width={24} height={24} viewBox="0 0 100 100" data-scene-sign="">{signGraphic(key)}</svg>;
      })}

      {arrows}
      {cars}
    </svg>
  );
}
