import { useMemo, useState } from 'react';
import { QUESTION_BY_ID } from '../data';
import { useT } from '../i18n';
import { testId } from '../lib/exam';
import { fmtTime } from '../lib/text';
import { practiceTitle } from '../screens/PracticeScreen';
import { useApp } from '../state/AppState';
import type { ExamResult, LookedUp, ReadLater, TestKind } from '../types';
import { Icon } from './Icons';
import { laterOf, ReadingList, ReadingSheet } from './later/Reading';
import { LookedList, lookedOf, mergeWords } from './Looked';
import { AnswerReview } from './review/AnswerReview';

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
 * Rows of the history. A tap opens the test: buttons to do it again or to train only its mistakes, the questions
 * to read about, and the review — its questions with the answers given and the words translated in them.
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

const NO_ANSWERS: Record<string, number> = {};

/** One test opened in the history. */
function Attempt({ id, e, onRead }: { id: string; e: HistoryEntry; onRead: (at: string | null) => void }) {
  const { go, startExam } = useApp();
  const t = useT();
  const h = t.history;
  const r = e.res;
  // questions removed from the bank since are left out
  const ids = useMemo(() => (r?.ids ?? []).filter(x => QUESTION_BY_ID[x]), [r]);
  const ans = r?.ans ?? NO_ANSWERS;
  const wrong = ids.filter(x => ans[x] !== 0);
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
        <p className="attempt-facts tnum">
          <span>{new Date(e.date).toLocaleString(t.locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
          {r.ms > 0 && <span><Icon name="clock" />{fmtTime(r.ms)}</span>}
          {r.timeout && <span className="warn">{t.result.timeout}</span>}
        </p>
      )}

      {(again || wrong.length > 0 || (r && e.items.length > 0)) && (
        <div className="attempt-actions">
          {again && <button className="btn small-btn primary" onClick={again.run}><Icon name="redo" />{again.label}</button>}
          {wrong.length > 0 && <button className="btn small-btn" onClick={() => go({ name: 'practice', mode: 'list', ids: wrong })}>{h.trainMistakes(wrong.length)}</button>}
          {r && e.items.length > 0 && <button className="btn small-btn wide" onClick={() => onRead(null)}><Icon name="bookmark" />{h.readLater(e.items.length)}</button>}
        </div>
      )}

      {!r && <p className="attempt-note">{h.unfinishedNote}</p>}
      {!r && e.items.length > 0 && <ReadingList items={e.items} onOpen={onRead} />}

      {r && ids.length > 0
        ? <AnswerReview ids={ids} ans={ans} perm={r.perm} words={e.words} />
        : (
          <>
            {r && <p className="attempt-note">{r.ids ? h.noAnswers : h.lost}</p>}
            {e.words.length > 0 && (
              <section className="attempt-part" aria-label={t.looked.title}>
                <div className="eyebrow">{t.looked.title}</div>
                <LookedList items={mergeWords(e.words)} />
              </section>
            )}
          </>
        )}
    </div>
  );
}
