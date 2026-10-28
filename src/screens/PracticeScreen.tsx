import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { Explanation } from '../components/question/Explanation';
import { Options } from '../components/question/Options';
import { QuestionCard } from '../components/question/QuestionCard';
import { CATEGORY, QUESTIONS, QUESTION_BY_ID } from '../data';
import { useAnswerKeys } from '../hooks/useAnswerKeys';
import { wrongQuestionIds } from '../lib/exam';
import { shuffle } from '../lib/text';
import { useApp } from '../state/AppState';
import type { AppData, Screen } from '../types';

type PracticeMode = Extract<Screen, { name: 'practice' }>;

function buildList(screen: PracticeMode, stats: AppData['stats']): string[] {
  if (screen.mode === 'wrong') return shuffle(wrongQuestionIds(stats));
  if (screen.mode === 'list') return shuffle(screen.ids ?? []);
  const pool = screen.mode === 'all' ? QUESTIONS : QUESTIONS.filter(q => q.cat === screen.mode);
  // questions never seen before come first
  return shuffle(pool.map(q => q.id)).sort((a, b) => Number(!!stats[a]) - Number(!!stats[b]));
}

function title(screen: PracticeMode): [string, string] {
  if (screen.mode === 'all') return ['Alle temaer', 'все темы вперемешку'];
  if (screen.mode === 'wrong' || screen.mode === 'list') return ['Feil', 'работа над ошибками'];
  return [CATEGORY[screen.mode].no, CATEGORY[screen.mode].ru];
}

export function PracticeScreen({ screen }: { screen: PracticeMode }) {
  const { data, go, answer } = useApp();
  const [ids] = useState(() => buildList(screen, data.stats));
  const [i, setI] = useState(0);
  const [order, setOrder] = useState(() => shuffle([0, 1, 2, 3]));
  const [chosen, setChosen] = useState<number | undefined>();
  const [score, setScore] = useState({ right: 0, done: 0 });
  const [summary, setSummary] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const explainRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!ids.length) go({ name: 'home' }); }, [ids, go]);
  useEffect(() => {
    if (chosen === undefined) return;
    nextRef.current?.focus({ preventScroll: true });
    explainRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [chosen]);

  const id = ids[i];
  const q = id ? QUESTION_BY_ID[id] : null;
  const visibleOrder = q ? order.filter(o => o < q.a.length) : [];
  const answered = chosen !== undefined;

  const pick = (oi: number) => {
    if (!q || answered) return;
    setChosen(oi);
    setScore(s => ({ right: s.right + (oi === 0 ? 1 : 0), done: s.done + 1 }));
    answer(q.id, oi === 0);
  };
  const next = () => {
    if (!answered) return;
    if (i + 1 >= ids.length) { setSummary(true); return; }
    setI(i + 1); setChosen(undefined); setOrder(shuffle([0, 1, 2, 3]));
    window.scrollTo(0, 0);
  };

  useAnswerKeys({ pick: k => { if (k < visibleOrder.length) pick(visibleOrder[k]); }, next });

  if (!q) return null;
  const [no, ru] = title(screen);

  return (
    <>
      <div className="examhead">
        <span className="progress-txt"><b>{no}</b> · {ru}</span>
        <span className="sp" />
        <span className="progress-txt tnum">{i + 1} / {ids.length} · верно {score.right} из {score.done}</span>
        <button className="btn ghost" onClick={() => setSummary(true)}>Завершить</button>
        <div className="pbar" aria-hidden="true"><i style={{ width: `${(score.done / ids.length) * 100}%` }} /></div>
      </div>

      <QuestionCard q={q} number={i + 1}>
        <Options q={q} order={visibleOrder} chosen={chosen} reveal={answered} onPick={pick} />
        {answered && <div ref={explainRef}><Explanation q={q} correct={chosen === 0} /></div>}
      </QuestionCard>

      <nav className="qnav">
        <span className="sp" />
        {answered
          ? <button ref={nextRef} className="btn primary" onClick={next}>{i + 1 < ids.length ? 'Neste' : 'Ferdig'} <Icon name="right" /></button>
          : <span className="muted small">Выберите ответ — сразу увидите объяснение</span>}
      </nav>

      {summary && (
        <Modal title={`${no} · ${ru}`} onClose={() => setSummary(false)}
          actions={<>
            {i + 1 < ids.length && <button className="btn" onClick={() => setSummary(false)}>Продолжить</button>}
            <button className="btn primary" data-autofocus onClick={() => go({ name: 'home' })}>На главную</button>
          </>}>
          <p className="mtext tnum">
            Отвечено: <b>{score.done}</b>, верно: <b>{score.right}</b>
            {score.done > 0 && ` (${Math.round((score.right / score.done) * 100)}%)`}.
          </p>
        </Modal>
      )}
    </>
  );
}
