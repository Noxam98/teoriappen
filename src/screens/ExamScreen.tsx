import { useEffect, useRef, useState } from 'react';
import { ActionBar } from '../components/ActionBar';
import { Icon } from '../components/Icons';
import { Explanation } from '../components/question/Explanation';
import { Options } from '../components/question/Options';
import { QuestionCard } from '../components/question/QuestionCard';
import { Sheet } from '../components/Sheet';
import { QUESTION_BY_ID } from '../data';
import { useAnswerKeys } from '../hooks/useAnswerKeys';
import { useNow } from '../hooks/useNow';
import { errorCount, MAX_ERRORS, timeLeft } from '../lib/exam';
import { announce, answerFeedback } from '../lib/feedback';
import { playSound } from '../lib/sound';
import { fmtTime, plural } from '../lib/text';
import { useApp } from '../state/AppState';
import type { ExamSession } from '../types';

export function ExamScreen() {
  const { data, update, go, finishExam } = useApp();
  const now = useNow(1000);
  const [dialog, setDialog] = useState<'grid' | 'submit' | null>(null);
  const E = data.cur;

  const left = E ? timeLeft(E, now) : 0;
  const streak = useRef(0);
  // the "5 minutes left" chime rings once; not again after reopening the app past that point
  const warned = useRef(left <= 5 * 60_000);
  useEffect(() => {
    if (!E) go({ name: 'home' }, { replace: true });
    else if (left <= 0) { playSound('timeup'); finishExam(true); go({ name: 'result' }); }
    else if (left <= 5 * 60_000 && !warned.current) { warned.current = true; playSound('warn'); }
  }, [E, left, finishExam, go]);

  // after coming back to the app, say for how long the clock stood still
  const [pausedFor, setPausedFor] = useState(0);
  const pausedAt = useRef(E?.paused);
  useEffect(() => {
    const was = pausedAt.current;
    pausedAt.current = E?.paused;
    if (!was || E?.paused) return;
    const stood = Date.now() - was;
    if (stood < 3000) return;
    setPausedFor(stood);
    announce(`Таймер стоял на паузе ${fmtTime(stood)}`);
    const t = setTimeout(() => setPausedFor(0), 5000);
    return () => clearTimeout(t);
  }, [E?.paused]);

  const change = (fn: (s: ExamSession) => ExamSession) => update(d => (d.cur ? { ...d, cur: fn(d.cur) } : d));
  const id = E?.ids[E.i];
  const instant = E?.reveal === 'instant';
  const locked = !!(E && id && instant && E.ans[id] !== undefined);

  const pick = (oi: number) => {
    if (!id || locked || !E) return;
    change(s => ({ ...s, ans: { ...s.ans, [id]: oi } }));
    if (instant) {
      streak.current = oi === 0 ? streak.current + 1 : 0;
      answerFeedback(oi === 0, streak.current, QUESTION_BY_ID[id].a[0], data.prefs.haptics);
      // the 8th mistake means the exam can no longer be passed
      if (oi !== 0 && errorCount({ ids: E.ids, ans: { ...E.ans, [id]: oi } }) === MAX_ERRORS + 1) setTimeout(() => playSound('limit'), 480);
    }
  };
  const step = (d: number) => {
    change(s => ({ ...s, i: Math.min(Math.max(s.i + d, 0), s.ids.length - 1) }));
    window.scrollTo({ top: 0 });
  };

  useAnswerKeys({
    pick: k => { if (E && id && k < E.perm[id].length) pick(E.perm[id][k]); },
    next: () => step(1),
    prev: () => step(-1),
  });

  if (!E || !id) return null;
  const q = QUESTION_BY_ID[id];
  const done = Object.keys(E.ans).length;
  const unanswered = E.ids.length - done;
  const flagged = E.ids.filter(x => E.flag[x]).length;
  const errors = errorCount(E);
  const last = E.i === E.ids.length - 1;

  return (
    <div className="screen-q">
      <h1 className="sr-only">Экзамен, вопрос {E.i + 1} из {E.ids.length}</h1>
      <div className="examhead">
        <div className="examhead-row">
          <span className={left < 5 * 60_000 ? 'timer low tnum' : 'timer tnum'} role="timer" aria-label={`Осталось ${Math.ceil(left / 60000)} мин`}><Icon name="clock" /><span aria-hidden="true">{fmtTime(left)}</span></span>
          <span className="counter tnum" aria-hidden="true"><b>{E.i + 1}</b>/{E.ids.length}</span>
          {instant && (
            <span className={errors > MAX_ERRORS ? 'errs over tnum' : 'errs tnum'} title="Ошибок / можно" aria-label={`Ошибок ${errors} из ${MAX_ERRORS} допустимых`}>
              <Icon name="cross" />{errors}<small>/{MAX_ERRORS}</small>
            </span>
          )}
          <span className="sp" />
          <button className="iconbtn framed" onClick={() => setDialog('grid')} title="Обзор вопросов" aria-label="Обзор вопросов"><Icon name="grid" /></button>
          <button className="btn primary small-btn" onClick={() => setDialog('submit')}>Lever</button>
        </div>
        <div className="pbar" aria-hidden="true"><i style={{ width: `${(done / E.ids.length) * 100}%` }} /></div>
      </div>

      <QuestionCard key={id} q={q} number={E.i + 1} note={E.flag[id] ? <span className="flag-note"><Icon name="flag" />merket</span> : ''}>
        <Options q={q} order={E.perm[id]} chosen={E.ans[id]} reveal={locked} onPick={pick} />
        {locked && <Explanation q={q} correct={E.ans[id] === 0} />}
      </QuestionCard>

      <div className="toast-slot" aria-hidden="true">
        {pausedFor > 0 && <div className="toast info"><Icon name="clock" /><span>Таймер стоял на паузе {fmtTime(pausedFor)}</span></div>}
      </div>

      <ActionBar label="Навигация по вопросам">
        <button className="btn square" disabled={E.i === 0} onClick={() => step(-1)} aria-label="Forrige — предыдущий вопрос"><Icon name="left" /></button>
        <button className="btn flagbtn" aria-pressed={!!E.flag[id]} title="Отметить, чтобы вернуться позже"
          onClick={() => { if (!E.flag[id]) playSound('flag'); change(s => ({ ...s, flag: { ...s.flag, [id]: !s.flag[id] } })); }}>
          <Icon name="flag" />Merk
        </button>
        {last
          ? <button className="btn primary grow" onClick={() => setDialog('submit')}>Lever prøven</button>
          : <button className={E.ans[id] !== undefined ? 'btn primary grow' : 'btn grow'} onClick={() => step(1)}>Neste <Icon name="right" /></button>}
      </ActionBar>

      {dialog === 'grid' && (
        <Sheet title="Oversikt · все вопросы" onClose={() => setDialog(null)}>
          <div className="qgrid">
            {E.ids.map((x, k) => {
              const a = E.ans[x];
              const state = a === undefined ? '' : !instant ? 'done' : a === 0 ? 'ok' : 'bad';
              return (
                <button key={x} className={[state, E.flag[x] && 'flag', k === E.i && 'cur'].filter(Boolean).join(' ')}
                  aria-label={`Вопрос ${k + 1}: ${a === undefined ? 'без ответа' : state === 'ok' ? 'верно' : state === 'bad' ? 'ошибка' : 'отвечен'}${E.flag[x] ? ', отмечен' : ''}`}
                  aria-current={k === E.i ? 'step' : undefined}
                  onClick={() => { change(s => ({ ...s, i: k })); setDialog(null); window.scrollTo({ top: 0 }); }}>{k + 1}</button>
              );
            })}
          </div>
          <div className="legend">
            {instant
              ? <><span><i className="lg-ok" />верно</span><span><i className="lg-bad" />ошибка</span></>
              : <span><i className="lg-done" />отвечен</span>}
            <span><i className="lg-flag" />отмечен</span>
            <span><i />без ответа</span>
          </div>
        </Sheet>
      )}

      {dialog === 'submit' && (
        <Sheet title="Lever prøven? · Сдать экзамен?" onClose={() => setDialog(null)}
          actions={<>
            <button className="btn" onClick={() => setDialog(null)}>Вернуться</button>
            <button className="btn primary" data-autofocus onClick={() => { setDialog(null); finishExam(false); go({ name: 'result' }); }}>Lever prøven</button>
          </>}>
          <p className="mtext">
            {unanswered
              ? <>Без ответа: <b>{unanswered}</b> {plural(unanswered, 'вопрос', 'вопроса', 'вопросов')} — они засчитаются как ошибки.</>
              : 'Вы ответили на все вопросы.'}
            {flagged > 0 && <> Отмечено для проверки: <b>{flagged}</b>.</>}
          </p>
        </Sheet>
      )}
    </div>
  );
}
