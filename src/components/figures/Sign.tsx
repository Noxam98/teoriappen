import type { CSSProperties } from 'react';
import type { PlateLine } from '../../types';
import { signDrawing, signGraphic, signSize } from './signs/catalog';
import { Plate, PLATE, plateHeight } from './signs/parts';

/**
 * A road sign (the official drawing, in its own proportions); `under`: the underskilt below it — the picture grows
 * taller and the sign keeps its size (--k: the whole picture's height over the sign's).
 */
export function Sign({ name, under, className = '' }: { name: string; under?: PlateLine[]; className?: string }) {
  const drawing = signDrawing(name);
  const size = signSize(name);
  if (!drawing || !size) return null;
  if (under?.length) {
    const h = (100 * size.h) / size.w;
    const height = h + PLATE.gap + plateHeight(under);
    return (
      <svg className={`sign with-plate ${className}`.trim()} viewBox={`0 0 100 ${height}`} style={{ '--k': height / h } as CSSProperties}
        role="img" aria-label={`Trafikkskilt, underskilt: ${under.map(l => l.text).join(' ')}`}>
        {signGraphic(name, { w: 100, h })}
        <Plate lines={under} y={h + PLATE.gap} />
      </svg>
    );
  }
  return (
    <svg className={`sign ${className}`.trim()} viewBox={drawing.vb} role="img" aria-label="Trafikkskilt"
      dangerouslySetInnerHTML={{ __html: drawing.svg }} />
  );
}
