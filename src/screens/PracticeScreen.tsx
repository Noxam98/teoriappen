import { useEffect, useRef, useState } from 'react';
import { ActionBar } from '../components/ActionBar';
import { Icon } from '../components/Icons';
import { Explanation } from '../components/question/Explanation';
import { Options } from '../components/question/Options';
import { QuestionCard } from '../components/question/QuestionCard';
import { CATEGORY, QUESTIONS, QUESTION_BY_ID } from '../data';
import { Words } from '../features/brush/Words';
import { useAnswerKeys } from '../hooks/useAnswerKeys';
import { wrongQuestionIds } from '../lib/exam';
import { answerFeedback } from '../lib/feedback';
import { playSound } from '../lib/sound';
import { shuffle } from '../lib/text';
import { useApp } from '../state/AppState';
import type { AppData, PracticeMode, Screen } from '../types';

type PracticeScreenSpec = Extract<Screen, { name: 'practice' }>;

function buildList(screen: PracticeScreenSpec, stats: AppData['stats']): string[] {
  if (screen.mode === 'wrong') return shuffle(wrongQuestionIds(stats));
  if (screen.mode === 'list') return shuffle(screen.ids ?? []);
  const pool = screen.mode === 'all' ? QUESTIONS : QUESTIONS.filter(q => q.cat === screen.mode);
  // questions never seen before come first
  return shuffle(pool.map(q => q.id)).sort((a, b) => Number(!!stats[a]) - Number(!!stats[b]));
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
  const { data, go, answer, finishPractice } = useApp();
  const [ids] = useState(() => buildList(screen, data.stats));
  const [instant] = useState(() => data.prefs.reveal === 'instant');
  const [start] = useState(Date.now);
  const [i, setI] = useState(0);
  const [orders, setOrders] = useState<Record<string, number[]>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const explainRef = useRef<HTMLDivElement>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => { if (!ids.length) go({ name: 'home' }); }, [ids, go]);
  useEffect(() => { if (ids.length) playOnce('begin'); }, [ids]);

  const id = ids[i];
  const q = id ? QUESTION_BY_ID[id] : null;
  const order = id ? orders[id] ?? [] : [];
  // each question gets its own shuffled option order once
  useEffect(() => {
    if (q && !orders[q.id]) setOrders(o => ({ ...o, [q.id]: shuffle(q.a.map((_, k) => k)) }));
  }, [q, orders]);

  const chosen = id ? answers[id] : undefined;
  const revealed = instant && chosen !== undefined;
  const right = Object.entries(answers).filter(([, a]) => a === 0).length;
  const done = Object.keys(answers).length;
  const [no, ru] = practiceTitle(screen.mode);

  useEffect(() => {
    if (revealed) explainRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [revealed]);

  const pick = (oi: number) => {
    if (!q || revealed) return;
    // in "answers at the end" mode the choice can still be changed; stats count the final choice when moving on
    setAnswers(a => ({ ...a, [q.id]: oi }));
    if (instant) {
      answer(q.id, oi === 0);
      const s = oi === 0 ? streak + 1 : 0;
      setStreak(s);
      answerFeedback(oi === 0, s, q.a[0], data.prefs.haptics);
    }
  };

  const finish = (recordCurrent: boolean) => {
    // in "answers at the end" mode the current choice is counted only when leaving the question
    if (recordCurrent && !instant && q && chosen !== undefined) answer(q.id, chosen === 0);
    const answered = ids.filter(x => answers[x] !== undefined);
    if (!answered.length) { go({ name: 'home' }); return; }
    finishPractice(
      { ids: answered, perm: orders, ans: answers, flag: {}, i: 0, start, end: Date.now() },
      { mode: screen.mode, title: [no, ru] },
    );
  };

  const next = () => {
    if (!q || chosen === undefined) return;
    if (!instant) answer(q.id, chosen === 0);
    if (i + 1 >= ids.length) { finish(false); return; }
    setI(i + 1);
    window.scrollTo({ top: 0 });
  };

  useAnswerKeys({ pick: k => { if (k < order.length) pick(order[k]); }, next });

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

      <QuestionCard key={q.id} q={q} number={i + 1}>
        <Options q={q} order={order} chosen={chosen} reveal={revealed} onPick={pick} />
        {revealed && <div ref={explainRef}><Explanation q={q} correct={chosen === 0} /></div>}
      </QuestionCard>

      <ActionBar label="Навигация по вопросам">
        <button className="btn ghost-strong" onClick={() => finish(true)}>Завершить</button>
        <button className={chosen !== undefined ? 'btn primary grow' : 'btn grow'} disabled={chosen === undefined} onClick={next}>
          <span translate="no">{i + 1 < ids.length ? 'Neste' : 'Ferdig'}</span> <Icon name="right" />
        </button>
      </ActionBar>
    </div>
  );
}
