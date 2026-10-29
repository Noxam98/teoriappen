import { Words } from '../../features/brush/Words';
import { useApp } from '../../state/AppState';
import type { Question } from '../../types';

/** Norwegian explanation (translatable with the brush) and a Russian one behind a toggle. */
export function Explanation({ q, correct }: { q: Question; correct?: boolean }) {
  const { data, update } = useApp();
  return (
    <div className={correct === undefined ? 'explain' : correct ? 'explain ok' : 'explain bad'}>
      {correct !== undefined && (
        <div className={correct ? 'verdict ok' : 'verdict bad'} aria-hidden="true"><span translate="no">{correct ? 'Riktig!' : 'Feil'}</span> · {correct ? 'Верно' : 'Неверно'}</div>
      )}
      <p className="f" data-block lang="nb"><Words text={q.f} /></p>
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
