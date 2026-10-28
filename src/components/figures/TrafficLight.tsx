import type { LightState } from '../../types';

function Lamp({ cy, color, lit }: { cy: number; color: string; lit: boolean }) {
  return (
    <>
      <circle cx={40} cy={cy} r={20} fill={lit ? color : '#3b4148'} />
      {lit && <circle cx={40} cy={cy} r={27} fill={color} opacity={0.18} />}
    </>
  );
}

export function TrafficLight({ state }: { state: LightState }) {
  const red = state === 'rod' || state === 'rodgul';
  const yellow = state === 'gul' || state === 'rodgul' || state === 'gulblink';
  const arrow = state === 'gronnpil_h' ? 1 : state === 'gronnpil_v' ? -1 : 0;
  return (
    <svg className="light" viewBox="-14 0 108 186" role="img" aria-label="Lyssignal">
      <rect x={10} y={10} width={60} height={156} rx={14} fill="#1f2328" />
      <rect x={36} y={166} width={8} height={18} fill="#5a6068" />
      <Lamp cy={36} color="#ff3b30" lit={red} />
      <g className={state === 'gulblink' ? 'blink' : undefined}><Lamp cy={86} color="#ffc400" lit={yellow} /></g>
      {arrow ? (
        <>
          <circle cx={40} cy={136} r={20} fill="#3b4148" />
          <g transform={`translate(40 136) scale(${arrow} 1)`}><path d="M-12 -4 H2 V-12 L14 0 L2 12 V4 H-12 Z" fill="#2ee07a" /></g>
        </>
      ) : <Lamp cy={136} color="#22c768" lit={state === 'gronn'} />}
      {state === 'gulblink' && (
        <path className="blink" d="M74 72 L86 66 M74 88 L86 94 M76 80 H90 M6 72 L-6 66 M6 88 L-6 94 M4 80 H-10"
          stroke="#ffcc00" strokeWidth={4} strokeLinecap="round" />
      )}
    </svg>
  );
}
