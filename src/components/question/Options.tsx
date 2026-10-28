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

  return (
    <div className="opts" role="radiogroup" aria-label="Svaralternativer">
      {order.map((oi, k) => {
        const state = reveal ? (oi === 0 ? ' right' : oi === chosen ? ' wrong' : '') : '';
        return (
          <div key={oi} className={`opt${state}${reveal ? ' locked' : ''}`} role="radio" tabIndex={0} aria-checked={oi === chosen}
            onClick={e => pick(oi, e.target)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(oi, null); } }}>
            <span className="key">{LETTERS[k]}</span>
            <span className="otext" data-block><Words text={q.a[oi]} /></span>
            <span className="mark">{reveal && oi === 0 ? <Icon name="check" /> : reveal && oi === chosen ? <Icon name="cross" /> : null}</span>
          </div>
        );
      })}
    </div>
  );
}
