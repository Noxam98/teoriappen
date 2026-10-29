import { useBrush } from '../../features/brush/BrushProvider';
import { Words } from '../../features/brush/Words';
import type { Question } from '../../types';
import { Icon } from '../Icons';

const LETTERS = 'ABCD';

interface Props {
  q: Question;
  /** Display order: indexes into q.a */
  order: number[];
  chosen: number | undefined;
  /** Show right/wrong marks and lock the options. */
  reveal?: boolean;
  onPick?: (option: number) => void;
}

/** Answer plates A–D. Index 0 of q.a is the correct answer. */
export function Options({ q, order, chosen, reveal = false, onPick }: Props) {
  const brush = useBrush();

  const pick = (oi: number, target: EventTarget | null) => {
    if (reveal || !onPick) return;
    if (brush.on && (target as Element | null)?.closest('.w')) return; // painting a word, not answering
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) return; // the user is selecting text to translate
    onPick(oi);
  };

  // arrow keys move focus between the plates (Enter/Space answers)
  const moveFocus = (e: React.KeyboardEvent, k: number) => {
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return false;
    e.preventDefault();
    const plates = (e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('.opt')) ?? [];
    plates[(k + d + plates.length) % plates.length]?.focus();
    return true;
  };
  const focusable = order.includes(chosen ?? -1) ? chosen : order[0];

  return (
    <div className="opts" role="radiogroup" aria-label="Svaralternativer — варианты ответа">
      {order.map((oi, k) => {
        const state = reveal ? (oi === 0 ? ' right' : oi === chosen ? ' wrong' : '') : '';
        return (
          <div key={oi} className={`opt${state}${reveal ? ' locked' : ''}`} role="radio" tabIndex={oi === focusable ? 0 : -1} aria-checked={oi === chosen} data-option={oi}
            aria-disabled={reveal || undefined}
            onClick={e => pick(oi, e.target)}
            onKeyDown={e => { if (moveFocus(e, k)) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(oi, null); } }}>
            <span className="key">{LETTERS[k]}</span>
            <span className="otext" data-block lang="nb"><Words text={q.a[oi]} /></span>
            <span className="mark">
              {reveal && oi === 0 ? <><Icon name="check" /><span className="sr-only">правильный ответ</span></>
                : reveal && oi === chosen ? <><Icon name="cross" /><span className="sr-only">ваш ответ, неверно</span></> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
