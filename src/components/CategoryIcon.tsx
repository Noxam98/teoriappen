import type { ReactNode } from 'react';
import type { CategoryId } from '../types';
import { Sign } from './figures/Sign';

const Glyph = ({ d, children }: { d: string; children?: ReactNode }) => (
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <rect x={1} y={1} width={38} height={38} rx={9} fill="var(--surface-2)" stroke="var(--line)" />
    {children}
    <path d={d} fill="none" stroke="var(--ink)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICONS: Record<CategoryId, () => ReactNode> = {
  vikeplikt: () => <Sign name="vikeplikt" />,
  skilt: () => <Sign name="fare_annen" />,
  lyssignal: () => <Sign name="fare_lyssignal" />,
  oppmerking: () => (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <rect x={1} y={1} width={38} height={38} rx={9} fill="var(--asphalt)" />
      <path d="M17 4 V36" stroke="#f4c20d" strokeWidth={3} />
      <path d="M23 4 V36" stroke="#f4c20d" strokeWidth={3} strokeDasharray="6 4" />
    </svg>
  ),
  fart: () => <Sign name="fart_50" />,
  plassering: () => <Sign name="pabudt_felt_hoyre" />,
  forbikjoring: () => <Sign name="forbikjoring_forbudt" />,
  parkering: () => <Sign name="parkering" />,
  mennesket: () => <Glyph d="M5 20 Q20 7 35 20 Q20 33 5 20 Z"><circle cx={20} cy={20} r={5} fill="var(--ink)" /></Glyph>,
  myke: () => <Sign name="fare_barn" />,
  sikring: () => <Glyph d="M12 7 L28 33 M10 22 Q20 18 30 22"><circle cx={12} cy={7} r={2.5} fill="var(--ink)" /></Glyph>,
  lys: () => <Glyph d="M8 13 Q4 20 8 27 H15 Q19 20 15 13 Z M21 14 H34 M21 20 H35 M21 26 H34" />,
  kjoretoy: () => <Glyph d="M6 25 V20 L10 13 H30 L34 20 V25 Z M6 25 V29 H11 V25 M29 25 V29 H34 V25 M12 19 H28" />,
  vinter: () => <Glyph d="M20 6 V34 M8 13 L32 27 M8 27 L32 13 M16 8 L20 11 L24 8 M16 32 L20 29 L24 32" />,
  ulykke: () => (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <rect x={1} y={1} width={38} height={38} rx={9} fill="var(--surface-2)" stroke="var(--line)" />
      <path d="M20 7 L34 31 H6 Z" fill="none" stroke="#c8102e" strokeWidth={4} strokeLinejoin="round" />
    </svg>
  ),
  miljo: () => <Glyph d="M10 30 Q8 12 30 9 Q32 30 10 30 Z M10 30 L22 18" />,
  forerkort: () => <Glyph d="M5 10 H35 V30 H5 Z M10 16 H18 M10 21 H16 M23 15 H30 V24 H23 Z" />,
};

export const CategoryIcon = ({ id }: { id: CategoryId }) => <>{ICONS[id]()}</>;
