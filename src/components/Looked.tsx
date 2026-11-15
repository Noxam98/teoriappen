import { translationOf } from '../features/brush/TranslationPopover';
import { useT } from '../i18n';
import { useApp, useSavedWords } from '../state/AppState';
import type { LookedUp } from '../types';
import { Icon } from './Icons';

/** The words translated with «Перевод» during one test. */
export const lookedOf = (looked: LookedUp[], test: number | undefined) =>
  test === undefined ? [] : looked.filter(x => x.test === test);

/**
 * The words translated during a test: each with its translation in the reader's current language (the dictionary's,
 * or Claude's in context when the dictionary has none) and a star that keeps it in the vocabulary.
 */
export function LookedList({ items }: { items: LookedUp[] }) {
  const { data, toggleVocab } = useApp();
  const saved = useSavedWords();
  const t = useT();
  const l = t.looked;
  return (
    <ul className="looked-list">
      {items.map(x => {
        const f = translationOf(x.w.split(' '), t.popover, data.prefs.lang);
        const tr = f.tr || x.ai || '';
        const on = saved.has(x.w);
        return (
          <li key={x.w} className="looked-item">
            <span className="looked-w">
              <b lang="nb">{x.show}</b>
              {x.n > 1 && <small className="tnum"><span aria-hidden="true">×{x.n}</span><span className="sr-only">{l.times(x.n)}</span></small>}
              {f.lemma && f.lemma !== x.w && <small lang="nb">{f.lemma}</small>}
            </span>
            <span className={tr ? 'looked-tr' : 'looked-tr none'}>
              {tr || l.none}
              {f.tr && x.ai && x.ai !== f.tr && <small>{x.ai}</small>}
            </span>
            <button className={on ? 'iconbtn looked-star on' : 'iconbtn looked-star'} aria-pressed={on}
              aria-label={on ? l.saved(x.show) : l.save(x.show)} title={on ? t.popover.saved : t.popover.save}
              onClick={() => toggleVocab({ w: x.w, show: x.show, lemma: f.lemma, tr, gram: f.gram, ctx: x.ctx })}>
              <Icon name={on ? 'starOn' : 'star'} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
