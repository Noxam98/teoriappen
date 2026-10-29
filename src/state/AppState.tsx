import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createExam, gradeExam, recordAnswer, setClock } from '../lib/exam';
import { playSound } from '../lib/sound';
import { loadData, saveData } from '../lib/storage';
import type { AppData, ExamSession, FinishedExam, Screen, VocabItem } from '../types';

interface AppApi {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  screen: Screen;
  /** Increases on every navigation, so screens remount with fresh local state. */
  visit: number;
  go: (s: Screen) => void;
  startExam: () => void;
  finishExam: (timeout: boolean) => void;
  /** Ends a practice round and shows its result screen. */
  finishPractice: (session: ExamSession, practice: NonNullable<FinishedExam['practice']>) => void;
  answer: (id: string, ok: boolean) => void;
  toggleVocab: (item: Omit<VocabItem, 't'>) => boolean;
}

const AppContext = createContext<AppApi | null>(null);

const onScreen = () => typeof document === 'undefined' || document.visibilityState === 'visible';

function withClock(d: AppData, running: boolean, now: number): AppData {
  if (!d.cur) return d;
  const cur = setClock(d.cur, running, now);
  return cur === d.cur ? d : { ...d, cur };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => withClock(loadData(), onScreen(), Date.now()));
  const [nav, setNav] = useState<{ screen: Screen; visit: number }>({ screen: { name: 'home' }, visit: 0 });
  const latest = useRef(data);
  latest.current = data;

  useEffect(() => saveData(data), [data]);

  // the exam clock stops while the tab is hidden, the browser is minimised or the app is closed
  useEffect(() => {
    const sync = (running: boolean) => {
      const now = Date.now();
      // saved right away: a closing page may not get another render
      const next = withClock(latest.current, running, now);
      if (next !== latest.current) saveData(next);
      setData(d => withClock(d, running, now));
    };
    const onVisibility = () => sync(onScreen());
    const onHide = () => sync(false);
    const onShow = () => sync(onScreen());
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onShow);
    };
  }, []);

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), []);

  const go = useCallback((screen: Screen) => {
    setNav(n => ({ screen, visit: n.visit + 1 }));
    window.scrollTo(0, 0);
  }, []);

  const api = useMemo<AppApi>(() => ({
    data,
    update,
    screen: nav.screen,
    visit: nav.visit,
    go,
    startExam() {
      playSound('start');
      setData(d => ({ ...d, cur: createExam(d.stats, d.prefs.reveal) }));
      go({ name: 'exam' });
    },
    finishExam(timeout) {
      setData(d => {
        if (!d.cur) return d;
        const done = gradeExam(d.cur, timeout);
        let stats = d.stats;
        // when time runs out, unanswered questions are not counted as "wrong" in the training stats
        for (const id of done.ids) if (done.ans[id] !== undefined || !timeout) stats = recordAnswer(stats, id, done.ans[id] === 0);
        return { ...d, stats, exams: [...d.exams, done.res], last: done, cur: null };
      });
    },
    finishPractice(session, practice) {
      setData(d => ({ ...d, last: gradeExam(session, false, practice) }));
      go({ name: 'result' });
    },
    answer(id, ok) {
      setData(d => ({ ...d, stats: recordAnswer(d.stats, id, ok) }));
    },
    toggleVocab(item) {
      const has = data.vocab.some(v => v.w === item.w);
      setData(d => ({
        ...d,
        vocab: has ? d.vocab.filter(v => v.w !== item.w) : [...d.vocab, { ...item, t: Date.now() }],
      }));
      return !has;
    },
  }), [data, nav, update, go]);

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  const api = useContext(AppContext);
  if (!api) throw new Error('useApp must be used inside <AppProvider>');
  return api;
}

export function useSavedWords(): Set<string> {
  const { data } = useApp();
  return useMemo(() => new Set(data.vocab.map(v => v.w)), [data.vocab]);
}
