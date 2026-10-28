import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createExam, gradeExam, recordAnswer } from '../lib/exam';
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);
  const [nav, setNav] = useState<{ screen: Screen; visit: number }>({ screen: { name: 'home' }, visit: 0 });

  useEffect(() => saveData(data), [data]);

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
