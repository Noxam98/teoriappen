import type { CSSProperties } from 'react';
import type { TimeLine } from '../../types';
import { signGraphic, WIDE_SIGNS } from './signs/catalog';
import { PLATE, plateHeight, TimePlate } from './signs/parts';

/** A road sign; `under`: the time plate under it (the picture grows taller, the sign keeps its size). */
export function Sign({ name, under, className = '' }: { name: string; under?: TimeLine[]; className?: string }) {
  const graphic = signGraphic(name);
  if (!graphic) return null;
  if (under?.length) {
    const height = 100 + PLATE.gap + plateHeight(under.length);
    return (
      <svg className={`sign with-plate ${className}`.trim()} viewBox={`0 0 100 ${height}`} style={{ '--k': height / 100 } as CSSProperties}
        role="img" aria-label={`Trafikkskilt, underskilt: ${under.map(l => l.text).join(' ')}`}>
        {graphic}
        <TimePlate lines={under} y={100 + PLATE.gap} />
      </svg>
    );
  }
  const wide = WIDE_SIGNS.has(name);
  return (
    <svg className={`sign${wide ? ' wide' : ''} ${className}`.trim()} viewBox={wide ? '0 0 140 100' : '0 0 100 100'} role="img" aria-label="Trafikkskilt">
      {graphic}
    </svg>
  );
}
