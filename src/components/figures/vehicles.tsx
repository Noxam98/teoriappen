// Vehicles seen from above, drawn heading up (−y) around (0, 0).
import type { ReactNode } from 'react';
import type { VehicleKind } from '../../types';

const FONT = "'Barlow Semi Condensed', Arial, sans-serif";

/** A label that stays upright even when the vehicle is rotated. */
function Label({ text, rot, size = 11 }: { text: string; rot: number; size?: number }) {
  return (
    <text transform={`rotate(${-rot})`} x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fontFamily={FONT}
      fontWeight={700} fontSize={size} fill="#fff" stroke="rgba(0,0,0,.35)" strokeWidth={0.6} paintOrder="stroke">{text}</text>
  );
}

export function TopCar({ x, y, color, label }: { x: number; y: number; color: string; label?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <CarBody color={color} />
      {label && <Label text={label} rot={0} size={10} />}
    </g>
  );
}

const CarBody = ({ color }: { color: string }) => (
  <>
    <rect x={-11} y={-19} width={22} height={38} rx={6} fill={color} stroke="rgba(0,0,0,.35)" />
    <path d="M-8 -9 Q0 -13 8 -9 L7 -4 H-7 Z" fill="rgba(255,255,255,.75)" />
    <path d="M-7 10 H7 L8 14 Q0 16 -8 14 Z" fill="rgba(255,255,255,.5)" />
  </>
);

/** Returns the drawing and its length (used to place it in its lane). */
export function vehicle(kind: VehicleKind, color: string, label: string, rot: number): { len: number; node: ReactNode } {
  switch (kind) {
    case 'bus':
      return {
        len: 64,
        node: (
          <>
            <rect x={-13} y={-32} width={26} height={64} rx={4} fill={color} stroke="rgba(0,0,0,.35)" />
            <rect x={-11} y={-30} width={22} height={7} rx={2} fill="rgba(255,255,255,.75)" />
            <rect x={-9} y={-12} width={18} height={30} rx={2} fill="rgba(255,255,255,.18)" />
            <Label text={label} rot={rot} />
          </>
        ),
      };
    case 'truck':
      return {
        len: 58,
        node: (
          <>
            <rect x={-12} y={-29} width={24} height={15} rx={3} fill={color} stroke="rgba(0,0,0,.35)" />
            <rect x={-9} y={-27} width={18} height={5} fill="rgba(255,255,255,.75)" />
            <rect x={-13} y={-12} width={26} height={41} rx={2} fill="#cfd4da" stroke="rgba(0,0,0,.35)" />
            <Label text={label} rot={rot} />
          </>
        ),
      };
    case 'tram':
      return {
        len: 76,
        node: (
          <>
            <rect x={-12} y={-38} width={24} height={76} rx={8} fill="#e6e9ee" stroke="rgba(0,0,0,.4)" />
            <rect x={-12} y={-6} width={24} height={12} fill={color} />
            <rect x={-9} y={-35} width={18} height={7} rx={2} fill="#6b7f99" />
            <line x1={-12} y1={-14} x2={12} y2={-14} stroke="rgba(0,0,0,.25)" />
            <line x1={-12} y1={14} x2={12} y2={14} stroke="rgba(0,0,0,.25)" />
            <Label text={label} rot={rot} />
          </>
        ),
      };
    case 'bike':
      return {
        len: 24,
        node: (
          <>
            <rect x={-1.5} y={-12} width={3} height={24} rx={1.5} fill="#222" />
            <rect x={-7} y={-8} width={14} height={2.6} rx={1.3} fill="#222" />
            <circle cx={0} cy={1} r={5.5} fill={color} stroke="rgba(0,0,0,.4)" />
            <g transform="translate(13 0)"><circle r={7} fill={color} /><Label text={label} rot={rot} /></g>
          </>
        ),
      };
    case 'utrykning':
      return {
        len: 40,
        node: (
          <>
            <rect x={-11} y={-20} width={22} height={40} rx={6} fill="#fff" stroke="rgba(0,0,0,.45)" />
            <rect x={-11} y={-2} width={22} height={5} fill="#e11d48" />
            <rect className="blink" x={-9} y={-9} width={7} height={4} rx={1} fill="#2563eb" />
            <rect x={2} y={-9} width={7} height={4} rx={1} fill="#2563eb" />
            <path d="M-8 -16 Q0 -19 8 -16 L7 -12 H-7 Z" fill="#9fb3c8" />
            <g transform="translate(0 11)"><circle r={6.5} fill={color} /><Label text={label} rot={rot} /></g>
          </>
        ),
      };
    default:
      return { len: 38, node: <><CarBody color={color} /><Label text={label} rot={rot} /></> };
  }
}
