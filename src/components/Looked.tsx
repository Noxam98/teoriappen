import { translationOf } from '../features/brush/TranslationPopover';
import { useT } from '../i18n';
import { useApp, useSavedWords } from '../state/AppState';
import type { LookedUp } from '../types';
import { Icon } from './Icons';

/** The words translated with «Перевод» during one test. */
export const lookedOf = (looked: LookedUp[], test: number | undefined) =>
  test === undefined ? [] : looked.filter(x => x.test === test);

/** One row per word: a word translated in several questions of the test is listed once, its counts added up. */
export function mergeWords(items: LookedUp[]): LookedUp[] {
  const byWord = new Map<string, LookedUp>();
  for (const x of items) {
    const seen = byWord.get(x.w);
    byWord.set(x.w, seen ? { ...seen, n: seen.n + x.n, ai: seen.ai ?? x.ai } : x);
  }
  return [...byWord.values()];
}

/**
 * Translated words: each with its translation in the reader's current language (the dictionary's, or Claude's in
 * context when the dictionary has none) and a star that keeps it in the vocabulary. `compact`: inside a question's
 * card in the review.
 */
export function LookedList({ items, compact = false }: { items: LookedUp[]; compact?: boolean }) {
  const { data, toggleVocab } = useApp();
  const saved = useSavedWords();
  const t = useT();
  const l = t.looked;
  return (
    <ul className={compact ? 'looked-list compact' : 'looked-list'}>
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
