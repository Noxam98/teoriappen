import { useT } from '../i18n';

/** Circular progress (0–1) with a label in the middle. */
export function ProgressRing({ value, size = 76, label, sub }: { value: number; size?: number; label: string; sub?: string }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 76 76" role="img" aria-label={`${label} ${sub ?? ''}`}>
      <circle cx={38} cy={38} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={7} />
      <circle cx={38} cy={38} r={r} fill="none" stroke="var(--ring-fill)" strokeWidth={7} strokeLinecap="round"
        strokeDasharray={`${value * c} ${c}`} transform="rotate(-90 38 38)" opacity={value > 0 ? 1 : 0} />
      <text x={38} y={sub ? 36 : 39} textAnchor="middle" dominantBaseline="central" className="ring-label">{label}</text>
      {sub && <text x={38} y={51} textAnchor="middle" dominantBaseline="central" className="ring-sub">{sub}</text>}
    </svg>
  );
}

/**
 * Half-circle score gauge: right answers out of total; for exams a tick marks the pass line
 * (at most `maxErrors` wrong).
 */
export function ScoreGauge({ right, total, maxErrors, pass }: { right: number; total: number; maxErrors?: number; pass?: boolean }) {
  const t = useT();
  const R = 80, cx = 100, cy = 100;
  const arc = `M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`;
  const share = total ? right / total : 0;
  const tone = pass === undefined ? 'var(--blue)' : pass ? 'var(--ok)' : 'var(--bad)';
  let tick = null;
  if (maxErrors !== undefined && total) {
    const t = (total - maxErrors) / total, a = Math.PI * (1 - t);
    const p = (r: number) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const [x1, y1] = p(R - 13), [x2, y2] = p(R + 13), [lx, ly] = p(R + 24);
    tick = (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" className="gauge-tick">{total - maxErrors}</text>
      </g>
    );
  }
  return (
    <svg className="gauge" viewBox="0 -8 200 122" role="img" aria-label={t.gauge.of(right, total)}>
      <path d={arc} fill="none" stroke="var(--surface-3)" strokeWidth={16} strokeLinecap="round" />
      {right > 0 && (
        <path d={arc} fill="none" stroke={tone} strokeWidth={16} strokeLinecap="round" pathLength={100}
          strokeDasharray={`${share * 100} 200`} className="gauge-fill" />
      )}
      {tick}
      <text x={cx} y={cy - 22} textAnchor="middle" className="gauge-value">{right}</text>
      <text x={cx} y={cy + 2} textAnchor="middle" className="gauge-total">{t.gauge.total(total)}</text>
    </svg>
  );
}
