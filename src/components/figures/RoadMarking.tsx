import type { ReactNode } from 'react';
import type { RoadKind } from '../../types';
import { Bicycle } from './signs/parts';
import { signGraphic } from './signs/catalog';
import { TopCar } from './vehicles';

const YELLOW = '#f4c20d', WHITE = '#f4f6f8';
const FONT = "'Barlow Semi Condensed', Arial, sans-serif";

const Solid = ({ x, y1 = 0, y2 = 220, c = YELLOW, w = 3 }: { x: number; y1?: number; y2?: number; c?: string; w?: number }) =>
  <line x1={x} y1={y1} x2={x} y2={y2} stroke={c} strokeWidth={w} data-bleed="" />;
const Dashed = ({ x, y1 = 0, y2 = 220, dash, gap, c = YELLOW }: { x: number; y1?: number; y2?: number; dash: number; gap: number; c?: string }) =>
  <line x1={x} y1={y1} x2={x} y2={y2} stroke={c} strokeWidth={3} strokeDasharray={`${dash} ${gap}`} data-bleed="" />;
const Skille = (p: { x: number; y1?: number; y2?: number }) => <Dashed {...p} dash={9} gap={27} />;
const Varsel = (p: { x: number; y1?: number; y2?: number }) => <Dashed {...p} dash={30} gap={9} />;

/** Top view of a road with one marking; your car is at the bottom driving up (right-hand traffic). */
export function RoadMarking({ kind }: { kind: RoadKind }) {
  let left = 50, right = 150, me: [number, number] = [125, 182];
  if (kind === 'sykkelfelt') { left = 34; right = 172; }
  if (kind === 'kollektivfelt') { left = 26; right = 176; me = [100, 182]; }
  const crossing = kind === 'haitenner' || kind === 'stopplinje';
  const top = crossing ? 76 : 0;

  let marking: ReactNode = null;
  switch (kind) {
    case 'sperrelinje': marking = <Solid x={100} />; break;
    case 'dobbel_sperrelinje': marking = <><Solid x={96.5} /><Solid x={103.5} /></>; break;
    case 'varsellinje': marking = <Varsel x={100} />; break;
    case 'skillelinje': marking = <Skille x={100} />; break;
    case 'sperre_varsel': marking = <><Varsel x={96.5} /><Solid x={103.5} /></>; break;
    case 'varsel_sperre': marking = <><Solid x={96.5} /><Varsel x={103.5} /></>; break;
    case 'haitenner':
      marking = (
        <>
          <Skille x={100} y1={top} />
          <g data-within="101.5 0 146 220">
            {[0, 1, 2, 3, 4].map(k => { const x = 103 + k * 8.8; return <path key={k} d={`M${x} ${top} H${x + 6} L${x + 3} ${top + 10} Z`} fill={WHITE} />; })}
          </g>
        </>
      );
      break;
    case 'stopplinje':
      marking = (
        <>
          <Skille x={100} y1={top} />
          <rect x={101} y={top} width={46} height={6} fill={WHITE} />
          <text x={125} y={top + 34} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={15} fill={WHITE} opacity={0.9} data-within="101 0 147 220">STOP</text>
        </>
      );
      break;
    case 'sykkelfelt':
      marking = (
        <>
          <Skille x={100} />
          <Solid x={150} c={WHITE} />
          <g transform="translate(152.6 94) rotate(-90) scale(.48)" data-within="151.5 0 167.5 220"><Bicycle c={WHITE} sw={4} /></g>
        </>
      );
      break;
    case 'kollektivfelt':
      marking = (
        <>
          <Skille x={75} />
          <Solid x={125} c={WHITE} w={4} />
          <text transform="translate(156 90) rotate(-90)" textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={17} letterSpacing={2} fill={WHITE} data-within="127 0 171 220">KOLLEKTIVFELT</text>
        </>
      );
      break;
    case 'sperreflate':
      marking = (
        <>
          <Solid x={100} y2={40} /><Solid x={100} y1={160} />
          <path d="M100 40 L88 64 V136 L100 160 L112 136 V64 Z" fill="none" stroke={YELLOW} strokeWidth={3} />
          {[64, 76, 88, 100, 112, 124, 136].map(y => <line key={y} x1={89} y1={y + 8} x2={111} y2={y - 2} stroke={YELLOW} strokeWidth={3} />)}
        </>
      );
      break;
    case 'gangfelt':
      marking = (
        <>
          <Skille x={100} y2={60} /><Skille x={100} y1={100} />
          {Array.from({ length: Math.floor((right - left - 16) / 14) + 1 }, (_, k) => left + 8 + k * 14).filter(x => x < right - 8)
            .map(x => <rect key={x} x={x} y={62} width={8} height={34} fill={WHITE} />)}
          <g transform={`translate(${right + 6} 40)`} data-within={`${right} 0 200 220`}>
            <rect x={9} y={22} width={3} height={30} fill="#8b9097" />
            <svg x={0} y={0} width={22} height={22} viewBox="0 0 100 100">{signGraphic('gangfelt')}</svg>
          </g>
        </>
      );
      break;
  }

  return (
    <svg className="road" viewBox="0 0 200 220" role="img" aria-label="Veioppmerking">
      <rect width={200} height={220} fill="var(--ground)" />
      <rect x={left} y={0} width={right - left} height={220} fill="var(--asphalt)" />
      <Solid x={left + 3} c={WHITE} w={2} />
      <Solid x={right - 3} c={WHITE} w={2} />
      {crossing && (
        <>
          <rect x={0} y={16} width={200} height={56} fill="var(--asphalt)" />
          <line x1={0} y1={44} x2={200} y2={44} stroke={YELLOW} strokeWidth={3} strokeDasharray="10 22" data-bleed="" />
        </>
      )}
      {marking}
      <g data-within={`${me[0] - 25} 0 ${me[0] + 25} 220`}><TopCar x={me[0]} y={me[1]} color="#2563eb" label="DU" /></g>
    </svg>
  );
}
