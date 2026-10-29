import { useMemo, useState } from 'react';
import { useT } from '../i18n';
import { testId } from '../lib/exam';
import { practiceTitle } from '../screens/PracticeScreen';
import { useApp } from '../state/AppState';
import type { ExamResult, ReadLater } from '../types';
import { Icon } from './Icons';
import { laterOf, ReadingSheet } from './later/Reading';

export interface HistoryEntry {
  key: string;
  /** None for a test left unfinished: it is in the history for the questions marked in it. */
  res?: ExamResult;
  test?: number;
  date: number;
  items: ReadLater[];
}

/**
 * The history, newest first: every finished exam and practice round, and the tests left unfinished
 * (another one started instead) that have questions to read about — so no reading list gets lost.
 */
export function useHistory(): HistoryEntry[] {
  const { data } = useApp();
  return useMemo(() => {
    const finished: HistoryEntry[] = data.exams.map(res => ({ key: `r${res.date}`, res, test: res.test, date: res.date, items: laterOf(data.later, res.test) }));
    const known = new Set([...data.exams.map(r => r.test), data.cur && testId(data.cur), data.practice?.start]);
    const left = [...new Set(data.later.map(x => x.test))].filter(k => !known.has(k))
      .map(k => ({ key: `u${k}`, test: k, date: k, items: laterOf(data.later, k) }))
      .filter(e => e.items.length);
    return [...finished, ...left].sort((a, b) => b.date - a.date);
  }, [data.exams, data.later, data.cur, data.practice]);
}

function Row({ e }: { e: HistoryEntry }) {
  const { data } = useApp();
  const t = useT();
  const r = e.res;
  const practice = r?.kind === 'practice';
  const read = e.items.filter(x => x.read).length;
  return (
    <>
      {!r ? <span className="stamp open">Ikke fullført</span>
        : practice ? <span className="stamp practice">Øving</span>
          : <span className={r.pass ? 'stamp pass' : 'stamp fail'}>{r.pass ? 'Bestått' : 'Ikke bestått'}</span>}
      <span className="hmain">
        {r && r.n > 0 && <span className="tnum"><b>{r.right}</b>/{r.n} · {t.errors(r.n - r.right)}</span>}
        {practice && r.mode && <small>{practiceTitle(r.mode, t, data.prefs.lang)[1]}</small>}
        {!r && <small>{t.history.unfinished}</small>}
      </span>
      <span className="hside">
        {e.items.length > 0 && (
          <span className={read === e.items.length ? 'later-chip done tnum' : 'later-chip tnum'} title={t.later.chip(e.items.length)}>
            <Icon name={read === e.items.length ? 'check' : 'bookmark'} />{e.items.length}
          </span>
        )}
        <span className="muted tnum small">{new Date(e.date).toLocaleDateString(t.locale, { day: 'numeric', month: 'short' })}</span>
      </span>
    </>
  );
}

/** Rows of the history; a row with questions to read about opens their list. */
export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  const { data } = useApp();
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className="history">
        {entries.map(e => e.items.length
          ? <button key={e.key} className="hrow has-later" onClick={() => setOpen(e.test!)} aria-label={`${t.later.chip(e.items.length)} · ${new Date(e.date).toLocaleDateString(t.locale, { day: 'numeric', month: 'long' })}`}><Row e={e} /></button>
          : <div key={e.key} className="hrow"><Row e={e} /></div>)}
      </div>
      {open !== null && <ReadingSheet items={laterOf(data.later, open)} start={null} onClose={() => setOpen(null)} />}
    </>
  );
}
