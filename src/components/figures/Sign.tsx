import { signGraphic, WIDE_SIGNS } from './signs/catalog';

export function Sign({ name, className = '' }: { name: string; className?: string }) {
  const graphic = signGraphic(name);
  if (!graphic) return null;
  const wide = WIDE_SIGNS.has(name);
  return (
    <svg className={`sign${wide ? ' wide' : ''} ${className}`.trim()} viewBox={wide ? '0 0 140 100' : '0 0 100 100'} role="img" aria-label="Trafikkskilt">
      {graphic}
    </svg>
  );
}
