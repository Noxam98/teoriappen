import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createExam, fixNumberedOrders, gradeExam, recordAnswer, setClock, testId } from '../lib/exam';
import { fromHash, rememberScroll, setAddress, toHash } from '../lib/routes';
import { playSound } from '../lib/sound';
import { loadData, saveData } from '../lib/storage';
import type { AppData, ExamSession, FinishedExam, Screen, VocabItem } from '../types';

interface AppApi {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  screen: Screen;
  /** Increases on every navigation, so screens remount with fresh local state. */
  visit: number;
  /** The screen came from the address (reload, back/forward, a link) rather than a tap in the app: restore where it was. */
  restored: boolean;
  /** Opens a screen as a new step in the browser history (`replace`: instead of the current step, e.g. a redirect). */
  go: (s: Screen, opts?: { replace?: boolean }) => void;
  /** Updates the address for the place within the same screen (question, section) without remounting it. */
  mark: (s: Screen) => void;
  /** A short message at the bottom of the screen, e.g. "link copied". */
  notify: (text: string) => void;
  toast: string;
  startExam: () => void;
  finishExam: (timeout: boolean) => void;
  /** Ends a practice round and shows its result screen. */
  finishPractice: (session: ExamSession, practice: NonNullable<FinishedExam['practice']>) => void;
  answer: (id: string, ok: boolean) => void;
  toggleVocab: (item: Omit<VocabItem, 't'>) => boolean;
  /** Ticks or unticks "I want to read about this" on a question of the test `test`. */
  toggleLater: (id: string, test: number) => void;
  /** The question was opened from the reading list. */
  markRead: (id: string, test: number) => void;
}

const AppContext = createContext<AppApi | null>(null);

const onScreen = () => typeof document === 'undefined' || document.visibilityState === 'visible';

function withClock(d: AppData, running: boolean, now: number): AppData {
  if (!d.cur) return d;
  const cur = setClock(d.cur, running, now);
  return cur === d.cur ? d : { ...d, cur };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => {
    const d = withClock(loadData(), onScreen(), Date.now());
    // an exam begun before the reading list existed is named by its start, fixed now
    return d.cur ? { ...d, cur: { ...fixNumberedOrders(d.cur), tid: testId(d.cur) } } : d;
  });
  const [nav, setNav] = useState<{ screen: Screen; visit: number; restored: boolean }>(() => ({ screen: fromHash(location.hash), visit: 0, restored: true }));
  const navRef = useRef(nav);
  navRef.current = nav;
  const latest = useRef(data);
  latest.current = data;
  const [toast, setToast] = useState('');

  // the address follows the screen; the back button and edits of the address open the screen it names
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    setAddress(toHash(navRef.current.screen), false);
    const onAddress = () => {
      const screen = fromHash(location.hash);
      if (toHash(screen) === toHash(navRef.current.screen)) return;
      setNav(n => ({ screen, visit: n.visit + 1, restored: true }));
    };
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; rememberScroll(location.hash, window.scrollY); });
    };
    window.addEventListener('popstate', onAddress);
    window.addEventListener('hashchange', onAddress);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('popstate', onAddress);
      window.removeEventListener('hashchange', onAddress);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

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

  const go = useCallback((screen: Screen, opts?: { replace?: boolean }) => {
    rememberScroll(location.hash, window.scrollY);
    setNav(n => ({ screen, visit: n.visit + 1, restored: false }));
    setAddress(toHash(screen), !opts?.replace);
    window.scrollTo(0, 0);
  }, []);

  const mark = useCallback((screen: Screen) => {
    setNav(n => ({ ...n, screen }));
    setAddress(toHash(screen), false);
    rememberScroll(location.hash, window.scrollY);
  }, []);

  const api = useMemo<AppApi>(() => ({
    data,
    update,
    screen: nav.screen,
    visit: nav.visit,
    restored: nav.restored,
    go,
    mark,
    notify: setToast,
    toast,
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
      setData(d => {
        const done = gradeExam(session, false, practice);
        return { ...d, exams: [...d.exams, done.res], last: done, practice: null };
      });
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
    toggleLater(id, test) {
      setData(d => {
        const has = d.later.some(x => x.id === id && x.test === test);
        return { ...d, later: has ? d.later.filter(x => !(x.id === id && x.test === test)) : [...d.later, { id, test }] };
      });
    },
    markRead(id, test) {
      setData(d => d.later.some(x => x.id === id && x.test === test && !x.read)
        ? { ...d, later: d.later.map(x => (x.id === id && x.test === test && !x.read ? { ...x, read: Date.now() } : x)) }
        : d);
    },
  }), [data, nav, toast, update, go, mark]);

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
