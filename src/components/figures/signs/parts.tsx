// Building blocks for Norwegian road signs: sign frames and simple pictograms.
// All signs are drawn in a 100×100 box (wide information signs: 140×100).
import type { ReactNode } from 'react';

export const COLOR = { red: '#c8102e', blue: '#1f4f9e', yellow: '#f6c400', ink: '#111418', grey: '#8a9099', white: '#fff' };
export const SIGN_FONT = "'Barlow Semi Condensed', 'Arial Narrow', Arial, sans-serif";

type Kids = { children?: ReactNode };

// ---------- frames ----------
/** Fareskilt: white triangle with red border. */
export const Triangle = ({ children }: Kids) => (
  <>
    <path d="M50 5 L96 87 H4 Z" fill={COLOR.red} stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
    <path d="M50 23 L81 78 H19 Z" fill="#fff" stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
    <g data-area="tri">{children}</g>
  </>
);

/** Forbudsskilt: round with red ring (inner colour white, or blue for stans/parkering). */
export const Ring = ({ children, fill = '#fff' }: Kids & { fill?: string }) => (
  <>
    <circle cx={50} cy={50} r={49} fill="#fff" />
    <circle cx={50} cy={50} r={47} fill={COLOR.red} />
    <circle cx={50} cy={50} r={36} fill={fill} />
    <g data-area="ring">{children}</g>
  </>
);

/** Påbudsskilt: blue disc. */
export const BlueDisc = ({ children }: Kids) => (
  <>
    <circle cx={50} cy={50} r={49} fill="#fff" />
    <circle cx={50} cy={50} r={47} fill={COLOR.blue} />
    <g data-area="disc">{children}</g>
  </>
);

/** Underskilt below a sign: a white plate with a black frame, one line of text each (times, a distance, a text). */
export const PLATE = { gap: 6, line: 19, pad: 6 };
type Line = { text: string; red?: boolean; disc?: boolean };
/** A line with the parking-disc symbol takes two rows: the symbol on the left, its text beside it. */
const rows = (l: Line) => (l.disc ? 2 : 1);
export const plateHeight = (lines: Line[]) => PLATE.pad * 2 + PLATE.line * lines.reduce((n, l) => n + rows(l), 0);

/** The parking disc (parkeringsskive): a dial with a pointer over a «P», white on a blue square. */
const DiscSymbol = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect width={26} height={26} rx={1.5} fill={COLOR.blue} />
    <path d="M5 13 A8 8 0 0 1 21 13 Z" fill="#fff" />
    <path d="M13 4.5 L11 9.5 H15 Z" fill={COLOR.blue} />
    <rect x={8.5} y={15.5} width={9} height={8} fill="none" stroke="#fff" strokeWidth={1.2} />
    <text x={13} y={22.3} textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight={700} fontSize={7} fill="#fff">P</text>
  </g>
);

export const Plate = ({ lines, y }: { lines: Line[]; y: number }) => {
  // the longest line sets one size for all: about half an em per letter of the condensed sign font, 74 units wide at most
  // (46 beside the parking disc, where the text goes in two lines)
  const discText = (l: Line) => { const at = l.text.indexOf(' '); return at < 0 ? [l.text] : [l.text.slice(0, at), l.text.slice(at + 1)]; };
  const fits = lines.map(l => (l.disc ? 46 / (0.5 * Math.max(...discText(l).map(t => t.length))) : 74 / (0.5 * l.text.length)));
  const size = Math.min(17, ...fits);
  let row = 0;
  return (
    <g transform={`translate(0 ${y})`}>
      <rect x={8} y={0.75} width={84} height={plateHeight(lines) - 1.5} rx={4} fill="#fff" stroke={COLOR.ink} strokeWidth={1.5} />
      <g data-area="under">
        {lines.map((l, i) => {
          const top = PLATE.pad + PLATE.line * row;
          row += rows(l);
          const base = (r: number) => top + PLATE.line * r + 9.5 + size * 0.35;
          const fill = l.red ? COLOR.red : COLOR.ink;
          if (!l.disc) return <text key={i} x={50} y={base(0)} textAnchor="middle" fontFamily={SIGN_FONT} fontWeight={700} fontSize={size} fill={fill}>{l.text}</text>;
          return (
            <g key={i}>
              <DiscSymbol x={13} y={top + PLATE.line - 13} />
              {discText(l).map((t, k) => <text key={k} x={66} y={base(k)} textAnchor="middle" fontFamily={SIGN_FONT} fontWeight={700} fontSize={size} fill={fill}>{t}</text>)}
            </g>
          );
        })}
      </g>
    </g>
  );
};

/** Opplysningsskilt: blue square (or wide rectangle). */
export const BluePlate = ({ children, wide = false }: Kids & { wide?: boolean }) => (
  <>
    <rect x={1} y={1} width={wide ? 138 : 98} height={98} rx={9} fill="#fff" />
    <rect x={4} y={4} width={wide ? 132 : 92} height={92} rx={7} fill={COLOR.blue} />
    <g data-area={wide ? 'plate-wide' : 'plate'}>{children}</g>
  </>
);

/** "Slutt på …" signs: white disc with thin black diagonal lines. */
export const EndDisc = ({ children }: Kids) => (
  <>
    <circle cx={50} cy={50} r={48} fill="#fff" stroke="#b9bec5" strokeWidth={2} />
    <g data-area="end">{children}</g>
    <Stripes cx={50} cy={50} r={44} shape="circle" />
  </>
);

/** Five thin lines from lower-left to upper-right, clipped to a circle or a diamond. */
export function Stripes({ cx, cy, r, shape }: { cx: number; cy: number; r: number; shape: 'circle' | 'diamond' }) {
  return (
    <g stroke={COLOR.ink} strokeWidth={2.2}>
      {[-10, -5, 0, 5, 10].map(d => {
        const half = shape === 'circle' ? Math.sqrt(r * r - d * d) : r;
        const n = d / Math.SQRT2, u = half / Math.SQRT2;
        return <line key={d} x1={cx + n - u} y1={cy + n + u} x2={cx + n + u} y2={cy + n - u} />;
      })}
    </g>
  );
}

export const Strike = ({ color = COLOR.red }: { color?: string }) => (
  <line x1={24} y1={24} x2={76} y2={76} stroke={color} strokeWidth={8} data-exempt="" />
);

export const Place = ({ x, y, s = 1, children }: Kids & { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>{children}</g>
);

// ---------- pictograms (each in its own small box, positioned with <Place>) ----------
/** Walking person, 40×40 box. */
export const Person = ({ c, sw = 5 }: { c: string; sw?: number }) => (
  <>
    <path d="M20 12 L17 25 M19 14 L11 21 M19 14 L27 20 M17 25 L10 37 M17 25 L24 30 L25 38"
      fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={21} cy={5} r={4.6} fill={c} />
  </>
);

/** Running child, 40×40 box. */
export const Runner = ({ c }: { c: string }) => (
  <>
    <path d="M22 13 L17 25 M21 15 L12 18 M21 15 L29 21 M17 25 L9 31 M17 25 L25 31 L23 38"
      fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={24} cy={6} r={4.8} fill={c} />
  </>
);

/** Bicycle, 44×28 box. */
export const Bicycle = ({ c, sw = 3 }: { c: string; sw?: number }) => (
  <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={9} cy={19} r={7.5} />
    <circle cx={35} cy={19} r={7.5} />
    <path d="M9 19 L20 19 L15 8 Z M20 19 L30 8 L35 19 M30 8 L28 3 H33 M13 6 H18" />
  </g>
);

/** Car seen from behind, 30×22 box. */
export const CarRear = ({ c }: { c: string }) => (
  <>
    <path d="M6 9 L9 2 H21 L24 9 Z" fill={c} />
    <rect x={2} y={9} width={26} height={9} rx={2.5} fill={c} />
    <rect x={4} y={18} width={5} height={4} fill={c} />
    <rect x={21} y={18} width={5} height={4} fill={c} />
    <path d="M9 8 L11 4 H19 L21 8 Z" fill="#fff" opacity={0.9} />
  </>
);

/** Car seen from the side, 54×24 box. */
export const CarSide = ({ c }: { c: string }) => (
  <>
    <path d="M3 17 V12 Q3 9 7 9 L15 8 L22 2 H37 L45 8 Q51 9 51 13 V17 Z" fill={c} />
    <circle cx={14} cy={18} r={5} fill={c} stroke="#fff" strokeWidth={1.6} />
    <circle cx={40} cy={18} r={5} fill={c} stroke="#fff" strokeWidth={1.6} />
    <path d="M18 8 L23.5 3.5 H29 V8 Z M31.5 8 V3.5 H36 L41 8 Z" fill="#fff" />
  </>
);

/** Moose, ~56×40 box. */
export const Moose = ({ c }: { c: string }) => (
  <>
    <g fill={c}>
      <ellipse cx={22} cy={17} rx={16} ry={7.5} />
      <circle cx={33} cy={12} r={6} />
      <path d="M35 9 L44 8 L48 13 L52 15 L51 19 L45 18 L39 19 Z" />
      <rect x={9} y={20} width={3.4} height={17} rx={1} />
      <rect x={14.5} y={21} width={3.4} height={16} rx={1} />
      <rect x={27} y={21} width={3.4} height={16} rx={1} />
      <rect x={32.5} y={20} width={3.4} height={17} rx={1} />
      <path d="M50 20 l1 5 l-3 0 z" />
    </g>
    <path d="M43 8 L41 2 M43 8 L45 2 M43 8 L48 4 M43 8 L38 4" fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" />
  </>
);

/** Steam locomotive, 56×34 box. */
export const Locomotive = ({ c }: { c: string }) => (
  <>
    <g fill={c}>
      <rect x={6} y={12} width={30} height={12} rx={3} />
      <rect x={34} y={4} width={16} height={20} rx={1.5} />
      <rect x={10} y={4} width={6} height={9} />
      <path d="M2 24 L6 18 V24 Z" />
      <rect x={4} y={23} width={48} height={3} />
      <circle cx={13} cy={29} r={4.6} />
      <circle cx={25} cy={29} r={4.6} />
      <circle cx={42} cy={29} r={4.6} />
    </g>
    <rect x={38} y={7} width={8} height={6} fill="#fff" />
  </>
);

// ---------- arrows ----------
interface ArrowProps { cx: number; top: number; bottom: number; c: string; hw?: number; sw?: number }
export const ArrowUp = ({ cx, top, bottom, c, hw = 10, sw = 4 }: ArrowProps) => (
  <path d={`M${cx} ${top} L${cx + hw} ${top + hw * 1.4} H${cx + sw} V${bottom} H${cx - sw} V${top + hw * 1.4} H${cx - hw} Z`} fill={c} />
);
export const ArrowDown = ({ cx, top, bottom, c, hw = 10, sw = 4 }: ArrowProps) => (
  <path d={`M${cx} ${bottom} L${cx + hw} ${bottom - hw * 1.4} H${cx + sw} V${top} H${cx - sw} V${bottom - hw * 1.4} H${cx - hw} Z`} fill={c} />
);

/** Three counter-clockwise arrows around a centre (roundabout). */
export function RoundArrows({ cx, cy, r, c, sw }: { cx: number; cy: number; r: number; c: string; sw: number }) {
  return (
    <>
      {[0, 1, 2].map(k => {
        const a0 = ((k * 120 + 25) * Math.PI) / 180, a1 = a0 + (75 * Math.PI) / 180;
        const p0 = [cx + r * Math.cos(a0), cy - r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy - r * Math.sin(a1)];
        const t = [-Math.sin(a1), -Math.cos(a1)], n = [Math.cos(a1), -Math.sin(a1)], h = sw * 1.25;
        const f = (v: number) => v.toFixed(1);
        return (
          <g key={k}>
            <path d={`M${f(p0[0])} ${f(p0[1])} A${r} ${r} 0 0 0 ${f(p1[0])} ${f(p1[1])}`} fill="none" stroke={c} strokeWidth={sw} />
            <path d={`M${f(p1[0] + t[0] * h * 1.4)} ${f(p1[1] + t[1] * h * 1.4)} L${f(p1[0] + n[0] * h)} ${f(p1[1] + n[1] * h)} L${f(p1[0] - n[0] * h)} ${f(p1[1] - n[1] * h)} Z`} fill={c} />
          </g>
        );
      })}
    </>
  );
}

/** Big centred number (speed limits). */
export const SignNumber = ({ n, c = COLOR.ink }: { n: number; c?: string }) => (
  <text x={50} y={51} textAnchor="middle" dominantBaseline="central" fontFamily={SIGN_FONT} fontWeight={700}
    fontSize={String(n).length > 2 ? 34 : 42} fill={c}>{n}</text>
);
