// What the app draws itself around the official sign drawings: the underskilt plates (times, distances, texts,
// the parking disc) and the small people and bicycles of the junction and road-marking pictures.

export const COLOR = { red: '#e23828', disc: '#0046ac', ink: '#111418' };

/**
 * Underskilt below a sign, drawn like the official plates (802 Avstand, 806 Tid, 831 Parkeringsskive, 834 Kombinert
 * regulering): as wide as the sign, square corners, a black frame, the wide sign lettering, times as «08-17».
 */
export const PLATE = { gap: 6, line: 19, pad: 6 };
const PLATE_FONT = "Barlow, 'Barlow Semi Condensed', Arial, sans-serif";
type Line = { text: string; red?: boolean; disc?: boolean };
/** A line with the parking-disc symbol takes two rows: the symbol on the left, its text beside it. */
const rows = (l: Line) => (l.disc ? 2 : 1);
export const plateHeight = (lines: Line[]) => PLATE.pad * 2 + PLATE.line * lines.reduce((n, l) => n + rows(l), 0);

/**
 * The parking-disc symbol, the official drawing (from plate 831.0, Statens vegvesen): a pointer over the dial and a «P»
 * in a frame, white on blue. Placed by its top left corner, 26 wide (34 high).
 */
const DiscSymbol = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y}) scale(${26 / 1540} ${-26 / 1540}) translate(-427.5 -2372.5)`}>
    <path d="M427.5 390h1540v1982.5h-1540z" fill={COLOR.disc} />
    <path d="m1477.5 1127.5-10 10-15 2.5H940l-12.5-2.5-10-10-5-15v-510l5-15 10-10L940 575h512.5l15 2.5 10 10 2.5 15v510z" fill="#fff" />
    <path d="m1465 1120-5 5-7.5 2.5H940l-5-2.5-7.5-5V595l7.5-5 5-2.5h512.5l7.5 2.5 5 5 2.5 7.5v510z" fill={COLOR.disc} />
    <path d="m1330 962.5-15 37.5-27.5 32.5-37.5 17.5-40 7.5h-147.5V660h67.5v160h87.5l40 7.5 35 22.5 25 32.5 15 40z" fill="#fff" />
    <path d="m1255 965-20 22.5-25 5h-80v-110h77.5l27.5 7.5 20 20 7.5 27.5z" fill={COLOR.disc} />
    <path d="m1060 2225 137.5-475 135 475z" fill="#fff" />
    <path d="m1415 1767.5-35-47.5-45-35-52.5-25-55-12.5H1170l-55 10-52.5 25-45 37.5-35 45L715 1545l55-67.5 65-55 72.5-47.5 77.5-37.5 82.5-22.5 85-12.5h87.5l85 12.5 82.5 22.5 77.5 37.5 72.5 45 65 57.5 57.5 65z" fill="#fff" />
  </g>
);

export const Plate = ({ lines, y }: { lines: Line[]; y: number }) => {
  // the plates write times with a short dash: «08-17»
  const shown = (t: string) => t.replace(/–/g, '-');
  // the longest line sets one size for all: about .55 em per letter of the wide lettering, 88 units wide at most
  // (56 beside the parking disc, where the text goes in two lines)
  const discText = (l: Line) => { const t = shown(l.text), at = t.indexOf(' '); return at < 0 ? [t] : [t.slice(0, at), t.slice(at + 1)]; };
  const fits = lines.map(l => (l.disc ? 56 / (0.55 * Math.max(...discText(l).map(t => t.length))) : 88 / (0.55 * shown(l.text).length)));
  const size = Math.min(16.5, ...fits);
  let row = 0;
  return (
    <g transform={`translate(0 ${y})`}>
      <rect x={0.75} y={0.75} width={98.5} height={plateHeight(lines) - 1.5} rx={0.6} fill="#fff" stroke="#000" strokeWidth={1.5} />
      <g data-area="under">
        {lines.map((l, i) => {
          const top = PLATE.pad + PLATE.line * row;
          row += rows(l);
          const base = (r: number) => top + PLATE.line * r + 9.5 + size * 0.36;
          const fill = l.red ? COLOR.red : '#000';
          if (!l.disc) return <text key={i} x={50} y={base(0)} textAnchor="middle" fontFamily={PLATE_FONT} fontWeight={600} fontSize={size} fill={fill}>{shown(l.text)}</text>;
          return (
            <g key={i}>
              <DiscSymbol x={7} y={top + PLATE.line - 16.7} />
              {discText(l).map((t, k) => <text key={k} x={66} y={base(k)} textAnchor="middle" fontFamily={PLATE_FONT} fontWeight={600} fontSize={size} fill={fill}>{t}</text>)}
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
