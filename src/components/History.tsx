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
import { Sheet } from './Sheet';

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

/** Rows of the history; a tap opens the test in a dialog over the list. */
export function HistoryList({ entries, onOpen }: { entries: HistoryEntry[]; onOpen: (key: string) => void }) {
  return (
    <div className="history">
      {entries.map(e => <button key={e.key} className="hrow" aria-haspopup="dialog" onClick={() => onOpen(e.key)}><Row e={e} /></button>)}
    </div>
  );
}

const NO_ANSWERS: Record<string, number> = {};

/**
 * One test of the history in a dialog: its score and date in the head (with the way to its reading list), the review
 * in the middle, and at the bottom the buttons to do it again or to train only its mistakes.
 */
export function AttemptSheet({ e, onClose }: { e: HistoryEntry; onClose: () => void }) {
  const { data, go, startExam } = useApp();
  const t = useT();
  const h = t.history;
  const r = e.res;
  // the reading list over this dialog: closed, the list (null), or one of its questions
  const [reading, setReading] = useState<string | null>();
  // questions removed from the bank since are left out
  const ids = useMemo(() => (r?.ids ?? []).filter(x => QUESTION_BY_ID[x]), [r]);
  const ans = r?.ans ?? NO_ANSWERS;
  const wrong = ids.filter(x => ans[x] !== 0);
  const isExam = !!r && r.kind !== 'practice';
  const mode = r?.mode ?? 'all';
  const read = e.items.filter(x => x.read).length;

  // the same questions again; a test from before the history kept them can only start anew
  let again: { label: string; run: () => void } | null = null;
  if (r && ids.length) again = { label: h.retake, run: () => (isExam ? startExam(ids) : go({ name: 'practice', mode, ids })) };
  else if (r && isExam) again = { label: t.result.newExam, run: () => startExam() };
  else if (r && r.mode && r.mode !== 'list') again = { label: t.result.again, run: () => go({ name: 'practice', mode }) };

  const score = r && r.n > 0 && <span className="att-score tnum"><b>{r.right}</b>/{r.n}</span>;
  const title = !r ? <span className="stamp open">Ikke fullført</span>
    : isExam ? <><span className={r.pass ? 'stamp pass' : 'stamp fail'}>{r.pass ? 'Bestått' : 'Ikke bestått'}</span>{score}</>
      : <><span lang="nb">{practiceTitle(mode, t, data.prefs.lang)[0]}</span>{score}</>;
  const sub = (
    <>
      <span className="tnum">{new Date(e.date).toLocaleString(t.locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
      {r && r.ms > 0 && <span className="tnum"><Icon name="clock" />{fmtTime(r.ms)}</span>}
      {r?.timeout && <span className="att-warn">{t.result.timeout}</span>}
    </>
  );
  const tools = r && e.items.length > 0 && (
    <button className={read === e.items.length ? 'later-chip done tnum' : 'later-chip tnum'} onClick={() => setReading(null)}
      aria-label={t.later.chip(e.items.length)} title={t.later.chip(e.items.length)}>
      <Icon name={read === e.items.length ? 'check' : 'bookmark'} />{e.items.length}
    </button>
  );
  const actions = (again || wrong.length > 0) && (
    <>
      {again && (
        <button className={wrong.length ? 'btn' : 'btn primary'} onClick={again.run} aria-label={again.label}>
          <Icon name="redo" />{wrong.length && again.label === h.retake ? h.retakeShort : again.label}
        </button>
      )}
      {wrong.length > 0 && <button className="btn primary" onClick={() => go({ name: 'practice', mode: 'list', ids: wrong })}>{h.trainMistakes(wrong.length)}</button>}
    </>
  );

  return (
    <>
      <Sheet tall title={<span className="att-title">{title}</span>} sub={sub} tools={tools} actions={actions || undefined} onClose={onClose}>
        {r && ids.length > 0
          ? <AnswerReview ids={ids} ans={ans} perm={r.perm} words={e.words} heading={false} keys={reading === undefined} />
          : (
            <>
              <p className="attempt-note">{!r ? h.unfinishedNote : r.ids ? h.noAnswers : h.lost}</p>
              {!r && e.items.length > 0 && <ReadingList items={e.items} onOpen={setReading} />}
              {e.words.length > 0 && (
                <section className="attempt-part" aria-label={t.looked.title}>
                  <div className="eyebrow">{t.looked.title}</div>
                  <LookedList items={mergeWords(e.words)} />
                </section>
              )}
            </>
          )}
      </Sheet>
      {reading !== undefined && <ReadingSheet items={laterOf(data.later, e.test)} start={reading} onClose={() => setReading(undefined)} />}
    </>
  );
}
