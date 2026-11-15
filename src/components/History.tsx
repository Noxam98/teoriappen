import { useMemo, useState } from 'react';
import { QUESTION_BY_ID } from '../data';
import { Words } from '../features/brush/Words';
import { useT } from '../i18n';
import { testId } from '../lib/exam';
import { fmtTime } from '../lib/text';
import { practiceTitle } from '../screens/PracticeScreen';
import { useApp } from '../state/AppState';
import type { ExamResult, LookedUp, Question, ReadLater, TestKind } from '../types';
import { Figure } from './figures/Figure';
import { Zoomable } from './figures/viewer';
import { Icon } from './Icons';
import { laterOf, ReadingList, ReadingSheet } from './later/Reading';
import { LookedList, lookedOf } from './Looked';
import { Explanation } from './question/Explanation';

export interface HistoryEntry {
  key: string;
  /** None for a test left unfinished: it is in the history for the questions marked or the words translated in it. */
  res?: ExamResult;
  /** Its tab of the history. */
  kind: TestKind;
  test?: number;
  date: number;
  items: ReadLater[];
  words: LookedUp[];
}

/**
 * The history, newest first: every finished exam and practice round, and the tests left unfinished
 * (another one started instead) that have questions to read about or translated words — so nothing gets lost.
 */
export function useHistory(): HistoryEntry[] {
  const { data } = useApp();
  return useMemo(() => {
    const finished: HistoryEntry[] = data.exams.map(res => ({
      key: `r${res.date}`, res, kind: res.kind ?? 'exam', test: res.test, date: res.date,
      items: laterOf(data.later, res.test), words: lookedOf(data.looked, res.test),
    }));
    const known = new Set([...data.exams.map(r => r.test), data.cur && testId(data.cur), data.practice?.start]);
    const marks = [...data.later, ...data.looked];
    const left: HistoryEntry[] = [...new Set(marks.map(x => x.test))].filter(k => !known.has(k))
      .map(k => ({
        // marks from before they knew their test's kind: most tests left unfinished are practice rounds
        key: `u${k}`, kind: marks.find(x => x.test === k && x.kind)?.kind ?? 'practice', test: k, date: k,
        items: laterOf(data.later, k), words: lookedOf(data.looked, k),
      }))
      .filter(e => e.items.length || e.words.length);
    return [...finished, ...left].sort((a, b) => b.date - a.date);
  }, [data.exams, data.later, data.looked, data.cur, data.practice]);
}

/** A row: an exam with its verdict and score; a practice round with its score and topic. */
function Row({ e }: { e: HistoryEntry }) {
  const { data } = useApp();
  const t = useT();
  const r = e.res;
  const read = e.items.filter(x => x.read).length;
  const title = r?.kind === 'practice' ? practiceTitle(r.mode ?? 'all', t, data.prefs.lang) : null;
  return (
    <>
      {!r ? <span className="stamp open">Ikke fullført</span>
        : title ? <span className={`hscore tnum ${!r.n ? '' : r.right === r.n ? 'ok' : r.right / r.n >= .8 ? 'mid' : 'bad'}`}>{r.n ? <><b>{r.right}</b>/{r.n}</> : '—'}</span>
          : <span className={r.pass ? 'stamp pass' : 'stamp fail'}>{r.pass ? 'Bestått' : 'Ikke bestått'}</span>}
      <span className="hmain">
        {title
          ? <><span lang="nb">{title[0]}</span><small>{title[1]}{r!.n > 0 && <> · {t.errors(r!.n - r!.right)}</>}</small></>
          : r ? r.n > 0 && <span className="tnum"><b>{r.right}</b>/{r.n} · {t.errors(r.n - r.right)}</span>
            : <small>{t.history.unfinished}</small>}
      </span>
      <span className="hside">
        {e.items.length > 0 && (
          <span className={read === e.items.length ? 'later-chip done tnum' : 'later-chip tnum'} title={t.later.chip(e.items.length)}>
            <Icon name={read === e.items.length ? 'check' : 'bookmark'} />{e.items.length}
          </span>
        )}
        <span className="muted tnum small">{new Date(e.date).toLocaleDateString(t.locale, { day: 'numeric', month: 'short' })}</span>
        <span className="hchev"><Icon name="right" /></span>
      </span>
    </>
  );
}

/**
 * Rows of the history. A tap opens the test: its questions with the answers given, the words translated in it,
 * the questions to read about, and buttons to do it again or to train only its mistakes.
 */
export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  const { data } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [reading, setReading] = useState<{ test: number; at: string | null } | null>(null);
  return (
    <>
      <div className="history">
        {entries.map(e => {
          const on = open === e.key;
          return (
            <div key={e.key} className={on ? 'hentry open' : 'hentry'}>
              <button className="hrow" aria-expanded={on} aria-controls={`att-${e.key}`} onClick={() => setOpen(on ? null : e.key)}><Row e={e} /></button>
              {on && <Attempt id={`att-${e.key}`} e={e} onRead={at => setReading({ test: e.test!, at })} />}
            </div>
          );
        })}
      </div>
      {reading && <ReadingSheet items={laterOf(data.later, reading.test)} start={reading.at} onClose={() => setReading(null)} />}
    </>
  );
}

/** One test opened in the history. */
function Attempt({ id, e, onRead }: { id: string; e: HistoryEntry; onRead: (at: string | null) => void }) {
  const { go, startExam } = useApp();
  const t = useT();
  const h = t.history;
  const r = e.res;
  const [filter, setFilter] = useState<'all' | 'bad'>('all');
  // questions removed from the bank since are left out
  const ids = (r?.ids ?? []).filter(x => QUESTION_BY_ID[x]);
  const ans = r?.ans ?? {};
  const wrong = ids.filter(x => ans[x] !== 0);
  const shown = filter === 'all' ? ids : wrong;
  const isExam = !!r && r.kind !== 'practice';
  const mode = r?.mode ?? 'all';

  // the same questions again; a test from before the history kept them can only start anew
  let again: { label: string; run: () => void } | null = null;
  if (r && ids.length) again = { label: h.retake, run: () => (isExam ? startExam(ids) : go({ name: 'practice', mode, ids })) };
  else if (r && isExam) again = { label: t.result.newExam, run: () => startExam() };
  else if (r && r.mode && r.mode !== 'list') again = { label: t.result.again, run: () => go({ name: 'practice', mode }) };

  return (
    <div className="attempt" id={id}>
      {r && (
        <div className="attempt-facts">
          <span className="chip tnum">{new Date(e.date).toLocaleString(t.locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
          {r.ms > 0 && <span className="chip tnum"><Icon name="clock" />{fmtTime(r.ms)}</span>}
          {r.timeout && <span className="chip warn">{t.result.timeout}</span>}
        </div>
      )}

      {(again || wrong.length > 0 || (r && e.items.length > 0)) && (
        <div className="attempt-actions">
          {again && <button className="btn small-btn primary" onClick={again.run}><Icon name="redo" />{again.label}</button>}
          {wrong.length > 0 && <button className="btn small-btn" onClick={() => go({ name: 'practice', mode: 'list', ids: wrong })}>{h.trainMistakes(wrong.length)}</button>}
          {r && e.items.length > 0 && <button className="btn small-btn" onClick={() => onRead(null)}><Icon name="bookmark" />{h.readLater(e.items.length)}</button>}
        </div>
      )}

      {!r && <p className="attempt-note">{h.unfinishedNote}</p>}
      {!r && e.items.length > 0 && <ReadingList items={e.items} onOpen={onRead} />}

      {e.words.length > 0 && (
        <section className="attempt-part" aria-label={t.looked.title}>
          <div className="eyebrow">{t.looked.title} · {e.words.length}</div>
          <LookedList items={e.words} />
        </section>
      )}

      {r && (ids.length ? (
        <section className="attempt-part" aria-label={t.result.review}>
          <div className="attempt-head">
            <div className="eyebrow">{t.result.review}</div>
            {wrong.length > 0 && wrong.length < ids.length && (
              <div className="segmented small" role="radiogroup" aria-label={t.result.show}>
                <button role="radio" aria-checked={filter === 'all'} onClick={() => setFilter('all')}>{t.result.allN(ids.length)}</button>
                <button role="radio" aria-checked={filter === 'bad'} onClick={() => setFilter('bad')}>{t.result.mistakesN(wrong.length)}</button>
              </div>
            )}
          </div>
          <ol className="hq-list">
            {shown.map(x => <AnswerRow key={x} q={QUESTION_BY_ID[x]} n={ids.indexOf(x) + 1} chosen={ans[x]} />)}
          </ol>
        </section>
      ) : <p className="attempt-note">{r.ids ? h.noAnswers : h.lost}</p>)}
    </div>
  );
}

/** A question of the test with the answer given (and the right one after a mistake); a tap shows the picture and the explanation. */
function AnswerRow({ q, n, chosen }: { q: Question; n: number; chosen: number | undefined }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const h = t.history;
  const mine = chosen === undefined ? undefined : q.a[chosen];
  const ok = chosen === 0;
  const state = ok ? 'ok' : mine === undefined ? 'none' : 'bad';
  return (
    <li className={`hq ${state}${open ? ' open' : ''}`}>
      <button className="hq-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="hq-n tnum" aria-hidden="true">{n}</span>
        <span className="hq-text">
          <span className="sr-only">{h.question(n)}, {ok ? t.result.right : state === 'none' ? t.result.noAnswer : t.result.mistake}: </span>
          <span className="hq-q" data-block lang="nb"><Words text={q.q} /></span>
          {mine === undefined
            ? <span className="hq-a none"><Icon name="cross" /><span>{t.result.noAnswer}</span></span>
            : <span className={ok ? 'hq-a ok' : 'hq-a bad'}><Icon name={ok ? 'check' : 'cross'} /><span><span className="sr-only">{h.yourAnswer}</span><span data-block lang="nb"><Words text={mine} /></span></span></span>}
          {!ok && <span className="hq-a ok"><Icon name="check" /><span><span className="sr-only">{h.rightAnswer}</span><span data-block lang="nb"><Words text={q.a[0]} /></span></span></span>}
        </span>
        <span className="hq-go" aria-hidden="true"><Icon name="right" /></span>
      </button>
      {open && (
        <div className="hq-more">
          {q.img && <Zoomable slide={{ type: 'figure', spec: q.img, numbered: q.byNumber }}><Figure spec={q.img} numbered={q.byNumber} /></Zoomable>}
          <Explanation q={q} />
        </div>
      )}
    </li>
  );
}
