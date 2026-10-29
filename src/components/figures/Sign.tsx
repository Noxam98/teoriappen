import type { CSSProperties } from 'react';
import type { PlateLine } from '../../types';
import { signGraphic, WIDE_SIGNS } from './signs/catalog';
import { Plate, PLATE, plateHeight } from './signs/parts';

/** A road sign; `under`: the underskilt below it (the picture grows taller, the sign keeps its size). */
export function Sign({ name, under, className = '' }: { name: string; under?: PlateLine[]; className?: string }) {
  const graphic = signGraphic(name);
  if (!graphic) return null;
  if (under?.length) {
    const height = 100 + PLATE.gap + plateHeight(under);
    return (
      <svg className={`sign with-plate ${className}`.trim()} viewBox={`0 0 100 ${height}`} style={{ '--k': height / 100 } as CSSProperties}
        role="img" aria-label={`Trafikkskilt, underskilt: ${under.map(l => l.text).join(' ')}`}>
        {graphic}
        <Plate lines={under} y={100 + PLATE.gap} />
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
