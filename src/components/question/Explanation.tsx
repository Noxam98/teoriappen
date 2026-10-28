import { Words } from '../../features/brush/Words';
import { useApp } from '../../state/AppState';
import type { Question } from '../../types';

/** Norwegian explanation (translatable with the brush) and a Russian one behind a toggle. */
export function Explanation({ q, correct }: { q: Question; correct?: boolean }) {
  const { data, update } = useApp();
  return (
    <div className="explain">
      {correct !== undefined && (
        <div className={correct ? 'verdict ok' : 'verdict bad'}>{correct ? 'Riktig! · Верно' : 'Feil · Неверно'}</div>
      )}
      <p className="f" data-block><Words text={q.f} /></p>
      <details open={data.prefs.ru}
        onToggle={e => {
          const open = e.currentTarget.open;
          if (open !== data.prefs.ru) update(d => ({ ...d, prefs: { ...d.prefs, ru: open } }));
        }}>
        <summary>Объяснение по-русски</summary>
        <p className="ru">{q.ru}</p>
      </details>
    </div>
  );
}
