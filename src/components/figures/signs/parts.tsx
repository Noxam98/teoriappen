// What the app draws itself around the official sign drawings: the underskilt plates (times, distances, texts,
// the parking disc) and the small people and bicycles of the junction and road-marking pictures.

export const COLOR = { red: '#c8102e', blue: '#1f4f9e', ink: '#111418' };
export const SIGN_FONT = "'Barlow Semi Condensed', 'Arial Narrow', Arial, sans-serif";

/** Underskilt below a sign: a white plate with a black frame, one line of text each (times, a distance, a text). */
export const PLATE = { gap: 6, line: 19, pad: 6 };
type Line = { text: string; red?: boolean; disc?: boolean };
/** A line with the parking-disc symbol takes two rows: the symbol on the left, its text beside it. */
const rows = (l: Line) => (l.disc ? 2 : 1);
export const plateHeight = (lines: Line[]) => PLATE.pad * 2 + PLATE.line * lines.reduce((n, l) => n + rows(l), 0);

/**
 * The parking-disc symbol (parkeringsskive), measured from a photo of the real plate: a pointer over the dial
 * (a white band of a ring) and a «P» in a thin frame, white on a blue plate a little taller than wide.
 */
const DiscSymbol = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect width={26} height={31} fill={COLOR.blue} />
    <path d="M10.65 2.25 H15.35 L13 9.4 Z" fill="#fff" />
    <path d="M4.77 12.76 A10.75 10.75 0 0 0 21.23 12.76 L17.14 9.32 A5.4 5.4 0 0 1 8.86 9.32 Z" fill="#fff" />
    <rect x={7.9} y={19.1} width={10.2} height={9.1} fill="none" stroke="#fff" strokeWidth={0.6} />
    <text x={13.1} y={26.7} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={9} fill="#fff">P</text>
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
              <DiscSymbol x={13} y={top + PLATE.line - 15.5} />
              {discText(l).map((t, k) => <text key={k} x={66} y={base(k)} textAnchor="middle" fontFamily={SIGN_FONT} fontWeight={700} fontSize={size} fill={fill}>{t}</text>)}
            </g>
          );
        })}
      </g>
    </g>
  );
};

// ---------- pictograms for the pictures (each in its own small box) ----------
/** Walking person, 40×40 box. */
export const Person = ({ c, sw = 5 }: { c: string; sw?: number }) => (
  <>
    <path d="M20 12 L17 25 M19 14 L11 21 M19 14 L27 20 M17 25 L10 37 M17 25 L24 30 L25 38"
      fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={21} cy={5} r={4.6} fill={c} />
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
