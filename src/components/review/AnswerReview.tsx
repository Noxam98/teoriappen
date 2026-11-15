import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY, QUESTION_BY_ID } from '../../data';
import { Words } from '../../features/brush/Words';
import { useT } from '../../i18n';
import { optionOrder } from '../../lib/exam';
import type { LookedUp, Question } from '../../types';
import { Figure } from '../figures/Figure';
import { Zoomable } from '../figures/viewer';
import { Icon } from '../Icons';
import { LookedList, mergeWords } from '../Looked';
import { Explanation } from '../question/Explanation';
import { QuestionShare } from '../question/QuestionCard';

export type ReviewFilter = 'all' | 'bad' | 'words';
type Verdict = 'ok' | 'bad' | 'none';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * The translated words of a test, by the question they were translated in. Words from before they kept their
 * question are found by the sentence they came from; the ones that fit no question of the test are `rest`.
 */
function wordsByQuestion(ids: string[], words: LookedUp[]): { by: Map<string, LookedUp[]>; rest: LookedUp[] } {
  const by = new Map<string, LookedUp[]>();
  const rest: LookedUp[] = [];
  for (const x of words) {
    const ctx = norm(x.ctx).slice(0, 200);
    const id = x.q && ids.includes(x.q) ? x.q
      : x.q || !ctx ? undefined
        : ids.find(k => { const q = QUESTION_BY_ID[k]; return [q.q, ...q.a, q.f].some(s => norm(s).startsWith(ctx)); });
    if (id) by.set(id, [...(by.get(id) ?? []), x]);
    else rest.push(x);
  }
  return { by, rest };
}

/** The options in the order they were shown; a test saved without it, or a question changed since, gets a fixed one. */
function shownOrder(q: Question, saved: number[] | undefined): number[] {
  if (saved && saved.length === q.a.length && saved.every(i => i >= 0 && i < q.a.length)) return saved;
  return q.byNumber ? optionOrder(q) : q.a.map((_, i) => i);
}

/** Cards this far from the one on screen are drawn in full; the rest are empty frames (45 pictures at once is a lot). */
const NEAR = 2;
/** The deck's own vertical padding (room for the cards' shadow), added to the height of the card on screen. */
const DECK_PAD = 12;

/**
 * The review of a test: its questions as a deck of cards, swiped sideways, with a strip of numbers above to see the
 * whole test and jump. A card shows the picture, the question and the answer given; opened, all options and the
 * explanation — every card opens and closes together, so leafing on keeps the same view. Words translated during
 * the test are highlighted in their question and listed under it.
 * `heading: false` and `keys` are for a dialog: no title of its own, and ← → leaf through the cards from anywhere.
 */
export function AnswerReview({ ids, ans, perm, words, initial = 'all', heading = true, keys = false }: {
  ids: string[];
  ans: Record<string, number>;
  perm?: Record<string, number[]>;
  words: LookedUp[];
  initial?: ReviewFilter;
  heading?: boolean;
  keys?: boolean;
}) {
  const t = useT();
  const v = t.review;
  const { by, rest } = useMemo(() => wordsByQuestion(ids, words), [ids, words]);
  const wrong = useMemo(() => ids.filter(x => ans[x] !== 0), [ids, ans]);
  const withWords = useMemo(() => ids.filter(x => by.has(x)), [ids, by]);
  const [filter, setFilter] = useState<ReviewFilter>(initial === 'bad' && !wrong.length ? 'all' : initial);
  const shown = filter === 'bad' ? wrong : filter === 'words' ? withWords : ids;
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState<number>();
  const deck = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const cur = Math.min(at, Math.max(0, shown.length - 1));

  const cards = () => [...(deck.current?.children ?? [])] as HTMLElement[];
  const goTo = (k: number) => {
    const el = deck.current, card = cards()[k];
    if (el && card) el.scrollTo({ left: card.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = deck.current, list = cards();
    if (!el || list.length < 2) return;
    const step = list[1].offsetLeft - list[0].offsetLeft;
    setAt(Math.max(0, Math.min(list.length - 1, Math.round(el.scrollLeft / step))));
  };
  const pick = (f: ReviewFilter) => {
    setFilter(f);
    setAt(0);
  };
  const step = useRef((_d: number) => {});
  step.current = d => goTo(cur + d);

  // in a dialog the arrow keys leaf through the cards wherever the focus is (not while a picture is open full screen)
  useEffect(() => {
    if (!keys) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (e.metaKey || e.ctrlKey || e.altKey || document.body.classList.contains('viewer-open')) return;
      e.preventDefault();
      step.current(e.key === 'ArrowRight' ? 1 : -1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [keys]);

  // the deck is as tall as the card on screen, also when that card opens or its picture loads
  useLayoutEffect(() => {
    const card = cards()[cur];
    if (!card) return;
    const fit = () => setHeight(card.offsetHeight + DECK_PAD);
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(card);
    return () => watch.disconnect();
  }, [cur, filter, shown.length]);

  // the strip keeps the number of the card on screen in the middle
  useEffect(() => {
    const el = strip.current, dot = el?.children[cur] as HTMLElement | undefined;
    if (el && dot) el.scrollTo({ left: dot.offsetLeft - (el.clientWidth - dot.offsetWidth) / 2, behavior: 'smooth' });
  }, [cur, filter]);

  const verdict = (id: string): Verdict => (ans[id] === 0 ? 'ok' : ans[id] === undefined || QUESTION_BY_ID[id].a[ans[id]] === undefined ? 'none' : 'bad');
  const word = { ok: t.result.right, bad: t.result.mistake, none: t.result.noAnswer };
  const filters: [ReviewFilter, string][] = [['all', t.result.allN(ids.length)]];
  if (wrong.length && wrong.length < ids.length) filters.push(['bad', t.result.mistakesN(wrong.length)]);
  if (withWords.length) filters.push(['words', v.wordsN(withWords.length)]);

  return (
    <section className="rv" aria-label={t.result.review}>
      {(heading || filters.length > 1) && <div className="rv-top">
        {heading && <div className="eyebrow">{t.result.review}</div>}
        {filters.length > 1 && (
          <div className="segmented small" role="radiogroup" aria-label={t.result.show}>
            {filters.map(([f, label]) => (
              <button key={f} role="radio" aria-checked={filter === f} className={f === 'words' ? 'rv-fwords' : undefined} onClick={() => pick(f)}>{label}</button>
            ))}
          </div>
        )}
      </div>}

      {shown.length > 1 && (
        <div className="rv-strip" ref={strip} role="group" aria-label={v.strip}>
          {shown.map((id, k) => {
            const n = ids.indexOf(id) + 1, s = verdict(id);
            return (
              <button key={id} className={`rv-dot ${s}${k === cur ? ' cur' : ''}${by.has(id) ? ' has-words' : ''}`}
                aria-current={k === cur || undefined} aria-label={v.goTo(n, word[s])} onClick={() => goTo(k)}>{n}</button>
            );
          })}
        </div>
      )}

      {/* a new deck per filter: a kept one would stay scrolled to the card it was snapped to */}
      <div key={filter} className={shown.length > 1 ? 'rv-deck' : 'rv-deck single'} ref={deck} onScroll={onScroll} style={height ? { height } : undefined}
        tabIndex={shown.length > 1 ? 0 : undefined} role="group" aria-label={v.deck}
        onKeyDown={keys ? undefined : e => {
          if (e.key === 'ArrowRight') { e.preventDefault(); goTo(cur + 1); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(cur - 1); }
        }}>
        {shown.map((id, k) => (Math.abs(k - cur) <= NEAR
          ? <Card key={id} q={QUESTION_BY_ID[id]} n={ids.indexOf(id) + 1} total={ids.length} chosen={ans[id]} state={verdict(id)}
              order={shownOrder(QUESTION_BY_ID[id], perm?.[id])} words={by.get(id)} open={open} toggle={() => setOpen(o => !o)} />
          : <div key={id} className="rv-card ghost" aria-hidden="true" />))}
      </div>

      {shown.length > 1 && (
        <div className="rv-nav">
          <button className="iconbtn framed" disabled={cur === 0} onClick={() => goTo(cur - 1)} aria-label={v.prev}><Icon name="left" /></button>
          <span className="tnum" aria-live="polite">{t.of(cur + 1, shown.length)}</span>
          <button className="iconbtn framed" disabled={cur === shown.length - 1} onClick={() => goTo(cur + 1)} aria-label={v.next}><Icon name="right" /></button>
        </div>
      )}

      {rest.length > 0 && (
        <div className="rv-rest">
          <div className="eyebrow">{v.otherWords}</div>
          <LookedList items={mergeWords(rest)} />
        </div>
      )}
    </section>
  );
}

/** One question of the test: closed, with the answer given; opened (all cards at once), with every option and the explanation. */
function Card({ q, n, total, chosen, state, order, words, open, toggle }: {
  q: Question; n: number; total: number; chosen: number | undefined; state: Verdict; order: number[];
  words: LookedUp[] | undefined; open: boolean; toggle: () => void;
}) {
  const t = useT();
  const v = t.review;
  const mine = state === 'none' ? undefined : q.a[chosen!];
  const list = useMemo(() => mergeWords(words ?? []), [words]);
  // every word of what was translated here, to highlight it in the text
  const marks = useMemo(() => (list.length ? new Set(list.flatMap(x => x.w.split(' '))) : undefined), [list]);
  return (
    <article className={`rv-card ${state}${open ? ' open' : ''}`} aria-label={v.card(n, total)}>
      <header className="rv-head">
        <span className="rv-n tnum">{n}</span>
        <span className="rv-topic" lang="nb">{CATEGORY[q.cat].no}</span>
        <span className={`verdict-chip ${state}`}>{state === 'ok' ? t.result.right : state === 'none' ? t.result.noAnswer : t.result.mistake}</span>
        <QuestionShare q={q} />
      </header>

      {q.img && <Zoomable slide={{ type: 'figure', spec: q.img, numbered: q.byNumber }}><Figure spec={q.img} numbered={q.byNumber} /></Zoomable>}
      <p className="qtext" data-block lang="nb"><Words text={q.q} marks={marks} /></p>

      {open ? (
        <>
          <ol className="rv-opts">
            {order.map((oi, k) => (
              <li key={oi} className={oi === 0 ? 'rv-opt right' : oi === chosen ? 'rv-opt wrong' : 'rv-opt'}>
                <span className="key" aria-hidden="true">{k + 1}</span>
                <span className="rv-otext">
                  <span data-block lang="nb"><Words text={q.a[oi]} marks={marks} /></span>
                  {(oi === chosen || oi === 0) && <small>{oi === chosen ? v.yours : v.correct}</small>}
                </span>
                {oi === 0 ? <Icon name="check" /> : oi === chosen ? <Icon name="cross" /> : null}
              </li>
            ))}
          </ol>
          <Explanation q={q} />
        </>
      ) : (
        <div className={`rv-mine ${state}`}>
          <span className="rv-label">{v.yourAnswer}</span>
          <span className="rv-ans">
            <Icon name={state === 'ok' ? 'check' : 'cross'} />
            {mine === undefined ? <span>{v.noAnswer}</span> : <span data-block lang="nb"><Words text={mine} marks={marks} /></span>}
          </span>
        </div>
      )}

      {list.length > 0 && (
        <div className="rv-words" role="group" aria-label={v.words}>
          <LookedList items={list} compact />
        </div>
      )}

      <button className="rv-more" aria-expanded={open} onClick={toggle}>{open ? v.less : v.more}<Icon name="right" /></button>
    </article>
  );
}
