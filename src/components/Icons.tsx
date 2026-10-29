const PATHS = {
  check: <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />,
  cross: <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />,
  close: <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />,
  flag: <path d="M6 21 V4 M6 4 H17 L14.5 8 L17 12 H6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />,
  grid: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" fill="none" stroke="currentColor" strokeWidth={1.8} />,
  clock: <><circle cx={12} cy={13} r={8} fill="none" stroke="currentColor" strokeWidth={2} /><path d="M12 9 V13 L15 15 M9 2.5 H15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" /></>,
  speak: <><path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" /><path d="M16.5 9 Q18.5 12 16.5 15 M19 6.5 Q23 12 19 17.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" /></>,
  star: <path d="M12 3.5 L14.6 9 L20.5 9.6 L16 13.6 L17.3 19.5 L12 16.5 L6.7 19.5 L8 13.6 L3.5 9.6 L9.4 9 Z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />,
  starOn: <path d="M12 3.5 L14.6 9 L20.5 9.6 L16 13.6 L17.3 19.5 L12 16.5 L6.7 19.5 L8 13.6 L3.5 9.6 L9.4 9 Z" fill="#f6c400" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />,
  spark: <path d="M12 3 l1.8 5.2 5.2 1.8 -5.2 1.8 -1.8 5.2 -1.8 -5.2 -5.2 -1.8 5.2 -1.8z M19 15 l.8 2.2 2.2 .8 -2.2 .8 -.8 2.2 -.8 -2.2 -2.2 -.8 2.2 -.8z" fill="currentColor" />,
  trash: <path d="M4 7 H20 M9 7 V4.5 H15 V7 M6.5 7 L7.5 20 H16.5 L17.5 7" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />,
  left: <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />,
  right: <path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />,
  book: <><path d="M5 4.5 A1.5 1.5 0 0 1 6.5 3 H19 V18 H6.5 A1.5 1.5 0 0 0 5 19.5 Z M5 19.5 A1.5 1.5 0 0 0 6.5 21 H19 V18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" /><path d="M9 8 H15 M9 11 H13" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" /></>,
  textSize: <path d="M3 19 L8 6 L13 19 M5 15 H11 M14 19 L17.5 10 L21 19 M15.3 16 H19.7" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />,
  play: <path d="M8.5 5.5 L18.5 12 L8.5 18.5 Z" fill="currentColor" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />,
  gear: (
    <>
      <circle cx={12} cy={12} r={3.2} fill="none" stroke="currentColor" strokeWidth={1.8} />
      <path d="M12 2.8 L13.6 5.2 L16.4 4.6 L17 7.4 L19.4 8.4 L18.6 11.1 L20.6 13.2 L18.3 14.9 L18.5 17.7 L15.7 18 L14.3 20.5 L12 19 L9.7 20.5 L8.3 18 L5.5 17.7 L5.7 14.9 L3.4 13.2 L5.4 11.1 L4.6 8.4 L7 7.4 L7.6 4.6 L10.4 5.2 Z" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
    </>
  ),
  shuffle: <path d="M3 7 H7 Q10 7 12 11 L13 13 Q15 17 18 17 H21 M3 17 H7 Q9 17 10.5 15 M13.5 9 Q15 7 18 7 H21 M18.5 4.5 L21 7 L18.5 9.5 M18.5 14.5 L21 17 L18.5 19.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />,
  redo: <path d="M4 12 A8 8 0 1 0 7 5.8 M4 4 V8.5 H8.5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />,
  theory: <path d="M12 6.8 C9.8 5.2 6.8 4.7 3 5.2 V18.8 C6.8 18.3 9.8 18.8 12 20.4 C14.2 18.8 17.2 18.3 21 18.8 V5.2 C17.2 4.7 14.2 5.2 12 6.8 Z M12 6.8 V20.4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />,
  bulb: <path d="M9.5 17.5 H14.5 M10.5 20.5 H13.5 M12 3 A6 6 0 0 0 8.2 13.6 C9 14.4 9.4 15.2 9.5 16 H14.5 C14.6 15.2 15 14.4 15.8 13.6 A6 6 0 0 0 12 3 Z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />,
  warn: <path d="M12 3.8 L21.2 19.8 H2.8 Z M12 10 V14.2 M12 17 V17.1" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />,
  home: <path d="M4 11 L12 4 L20 11 M6.5 9 V20 H10 V14.5 H14 V20 H17.5 V9" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />,
  translate: (
    <>
      <rect x={2.5} y={3} width={11} height={11} rx={2.5} fill="none" stroke="currentColor" strokeWidth={1.7} />
      <text x={8} y={12.3} textAnchor="middle" fontSize={7.6} fontWeight={700} fontFamily="Arial, sans-serif" fill="currentColor">Å</text>
      <rect x={10.5} y={10} width={11} height={11} rx={2.5} fill="var(--yellow)" stroke="currentColor" strokeWidth={1.7} />
      <text x={16} y={18.8} textAnchor="middle" fontSize={8.2} fontWeight={700} fontFamily="Arial, sans-serif" fill="#1c1700">Я</text>
    </>
  ),
  brush: (
    <>
      <path d="M14.5 9.5 L19.8 4.2 a1.6 1.6 0 0 1 2.3 2.3 L16.8 11.8 Z" fill="currentColor" />
      <path d="M13.6 10.4 L15.9 12.7 Q15 16.5 10.5 17.6 Q7 18.4 3.2 20.2 Q5 17 5.5 14 Q6.3 10.6 13.6 10.4 Z" fill="#f6c400" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M6.5 2.5 l.8 2 2 .8 -2 .8 -.8 2 -.8 -2 -2 -.8 2 -.8z M19.5 14 l.6 1.5 1.5 .6 -1.5 .6 -.6 1.5 -.6 -1.5 -1.5 -.6 1.5 -.6z" fill="currentColor" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}
