import { useEffect, useRef, useState } from 'react';
import { ActionBar } from '../components/ActionBar';
import { Icon } from '../components/Icons';
import { Explanation } from '../components/question/Explanation';
import { Options } from '../components/question/Options';
import { QuestionCard } from '../components/question/QuestionCard';
import { CATEGORY, QUESTIONS, QUESTION_BY_ID } from '../data';
import { Words } from '../features/brush/Words';
import { useAnswerKeys } from '../hooks/useAnswerKeys';
import { optionOrder, wrongQuestionIds } from '../lib/exam';
import { answerFeedback } from '../lib/feedback';
import { playSound } from '../lib/sound';
import { shuffle } from '../lib/text';
import { useApp } from '../state/AppState';
import type { AppData, PracticeMode, PracticeRound, Screen } from '../types';

type PracticeScreenSpec = Extract<Screen, { name: 'practice' }>;

function buildList(screen: PracticeScreenSpec, stats: AppData['stats']): string[] {
  if (screen.mode === 'wrong') return shuffle(wrongQuestionIds(stats));
  if (screen.mode === 'list') return shuffle(screen.ids ?? []);
  const pool = screen.mode === 'all' ? QUESTIONS : QUESTIONS.filter(q => q.cat === screen.mode);
  // questions never seen before come first
  return shuffle(pool.map(q => q.id)).sort((a, b) => Number(!!stats[a]) - Number(!!stats[b]));
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));

/**
 * The round to show: after a reload (or the back button) the saved round of this topic continues at the question in
 * the address; otherwise a new round starts, with the question from a shared link first.
 */
function openRound(screen: PracticeScreenSpec, data: AppData, restored: boolean): PracticeRound {
  const saved = data.practice;
  if (restored && saved && saved.mode === screen.mode && (screen.mode !== 'list' || sameSet(saved.ids, screen.ids ?? []))
    && (!screen.q || saved.ids.includes(screen.q))) {
    return { ...saved, i: screen.q ? saved.ids.indexOf(screen.q) : saved.i };
  }
  let ids = buildList(screen, data.stats);
  if (screen.q) ids = [screen.q, ...ids.filter(x => x !== screen.q)];
  return { mode: screen.mode, ids, i: 0, ans: {}, perm: {}, start: Date.now(), instant: data.prefs.reveal === 'instant' };
}

// React StrictMode mounts twice in development: don't play the start chime twice.
let lastBegin = 0;
function playOnce(name: 'begin') {
  if (Date.now() - lastBegin < 500) return;
  lastBegin = Date.now();
  playSound(name);
}

export function practiceTitle(mode: PracticeMode): [string, string] {
  if (mode === 'all') return ['Alle temaer', 'все темы вперемешку'];
  if (mode === 'wrong' || mode === 'list') return ['Feil', 'работа над ошибками'];
  return [CATEGORY[mode].no, CATEGORY[mode].ru];
}

export function PracticeScreen({ screen }: { screen: PracticeScreenSpec }) {
  const { data, update, go, mark, restored, answer, finishPractice } = useApp();
  const [round] = useState(() => openRound(screen, data, restored));
  const { ids, instant, start } = round;
  const [i, setI] = useState(round.i);
  const [orders, setOrders] = useState<Record<string, number[]>>(round.perm);
  const [answers, setAnswers] = useState<Record<string, number>>(round.ans);
  const explainRef = useRef<HTMLDivElement>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => { if (!ids.length) go({ name: 'home' }, { replace: true }); }, [ids, go]);
  useEffect(() => { if (ids.length && !restored) playOnce('begin'); }, [ids, restored]);

  const id = ids[i];
  // the round is saved and the address names the question, so a reload or a shared link opens this question
  useEffect(() => {
    if (!id) return;
    update(d => ({ ...d, practice: { mode: screen.mode, ids, i, ans: answers, perm: orders, start, instant } }));
  }, [id, i, answers, orders, ids, instant, start, screen.mode, update]);
  useEffect(() => {
    if (id) mark({ name: 'practice', mode: screen.mode, ids: screen.mode === 'list' ? ids : undefined, q: id });
  }, [id, ids, screen.mode, mark]);

  const q = id ? QUESTION_BY_ID[id] : null;
  const order = id ? orders[id] ?? [] : [];
  // each question gets its own option order once
  useEffect(() => {
    if (q && !orders[q.id]) setOrders(o => ({ ...o, [q.id]: optionOrder(q) }));
  }, [q, orders]);

  // "right after the question": a tap only selects the option, «Sjekk» hands the answer in and shows the result
  const [pending, setPending] = useState<number>();
  const handedIn = id ? answers[id] : undefined;
  const chosen = instant ? handedIn ?? pending : handedIn;
  const revealed = instant && handedIn !== undefined;
  const right = Object.entries(answers).filter(([, a]) => a === 0).length;
  const done = Object.keys(answers).length;
  const [no, ru] = practiceTitle(screen.mode);

  useEffect(() => {
    if (revealed) explainRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [revealed]);

  const pick = (oi: number) => {
    if (!q || revealed) return;
    if (instant) { setPending(oi); return; }
    // in "answers at the end" mode the choice can still be changed; stats count the final choice when moving on
    setAnswers(a => ({ ...a, [q.id]: oi }));
  };

  const check = () => {
    if (!q || revealed || pending === undefined) return;
    setAnswers(a => ({ ...a, [q.id]: pending }));
    answer(q.id, pending === 0);
    const s = pending === 0 ? streak + 1 : 0;
    setStreak(s);
    answerFeedback(pending === 0, s, q.a[0], data.prefs.haptics);
  };

  const finish = (recordCurrent: boolean) => {
    // in "answers at the end" mode the current choice is counted only when leaving the question
    if (recordCurrent && !instant && q && chosen !== undefined) answer(q.id, chosen === 0);
    const answered = ids.filter(x => answers[x] !== undefined);
    if (!answered.length) { update(d => ({ ...d, practice: null })); go({ name: 'home' }); return; }
    finishPractice(
      { ids: answered, perm: orders, ans: answers, flag: {}, i: 0, start, end: Date.now() },
      { mode: screen.mode, title: [no, ru] },
    );
  };

  const next = () => {
    if (!q || handedIn === undefined) return;
    if (!instant) answer(q.id, handedIn === 0);
    if (i + 1 >= ids.length) { finish(false); return; }
    setPending(undefined);
    setI(i + 1);
    window.scrollTo({ top: 0 });
  };

  // one main button: «Sjekk» until the answer is handed in, then «Neste» (the same element, so focus stays on it)
  const checking = instant && !revealed;
  const main = checking ? check : next;
  const canMain = checking ? pending !== undefined : handedIn !== undefined;

  useAnswerKeys({ pick: k => { if (k < order.length) pick(order[k]); }, next, confirm: main });

  if (!q || !order.length) return null;

  return (
    <div className="screen-q">
      <h1 className="sr-only">Тренировка: {no}, вопрос {i + 1} из {ids.length}</h1>
      <div className="examhead">
        <div className="examhead-row">
          <span className="topic"><b data-block lang="nb"><Words text={no} /></b><small>{ru}</small></span>
          <span className="sp" />
          <span className="counter tnum"><b>{i + 1}</b>/{ids.length}</span>
          {instant && done > 0 && <span className="score-chip tnum"><Icon name="check" />{right}<small>/{done}</small></span>}
          {instant && streak >= 3 && <span key={streak} className="streak-chip tnum" title="Правильных ответов подряд">серия {streak}</span>}
        </div>
        <div className="pbar" aria-hidden="true"><i style={{ width: `${(i / ids.length) * 100}%` }} /></div>
      </div>

      <QuestionCard key={q.id} q={q} number={i + 1} share>
        <Options q={q} order={order} chosen={chosen} reveal={revealed} onPick={pick} />
        {revealed && <div ref={explainRef}><Explanation q={q} correct={chosen === 0} /></div>}
      </QuestionCard>

      <ActionBar label="Навигация по вопросам">
        <button className="btn ghost-strong" onClick={() => finish(true)}>Завершить</button>
        <button className={!canMain ? 'btn grow' : revealed && handedIn === 0 ? 'btn ok grow' : 'btn primary grow'} disabled={!canMain} onClick={main}>
          {checking ? <>Sjekk <Icon name="check" /></> : <>{i + 1 < ids.length ? 'Neste' : 'Ferdig'} <Icon name="right" /></>}
        </button>
      </ActionBar>
    </div>
  );
}
