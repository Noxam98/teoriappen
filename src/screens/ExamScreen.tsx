import { useEffect, useState } from 'react';
import { ActionBar } from '../components/ActionBar';
import { Icon } from '../components/Icons';
import { Explanation } from '../components/question/Explanation';
import { Options } from '../components/question/Options';
import { QuestionCard } from '../components/question/QuestionCard';
import { Sheet } from '../components/Sheet';
import { QUESTION_BY_ID } from '../data';
import { useAnswerKeys } from '../hooks/useAnswerKeys';
import { useNow } from '../hooks/useNow';
import { errorCount, MAX_ERRORS } from '../lib/exam';
import { fmtTime, plural } from '../lib/text';
import { useApp } from '../state/AppState';
import type { ExamSession } from '../types';

export function ExamScreen() {
  const { data, update, go, finishExam } = useApp();
  const now = useNow(1000);
  const [dialog, setDialog] = useState<'grid' | 'submit' | null>(null);
  const E = data.cur;

  const left = E ? E.end - now : 0;
  useEffect(() => {
    if (!E) go({ name: 'home' });
    else if (left <= 0) { finishExam(true); go({ name: 'result' }); }
  }, [E, left, finishExam, go]);

  const change = (fn: (s: ExamSession) => ExamSession) => update(d => (d.cur ? { ...d, cur: fn(d.cur) } : d));
  const id = E?.ids[E.i];
  const instant = E?.reveal === 'instant';
  const locked = !!(E && id && instant && E.ans[id] !== undefined);

  const pick = (oi: number) => {
    if (!id || locked) return;
    change(s => ({ ...s, ans: { ...s.ans, [id]: oi } }));
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
      <div className="examhead">
        <div className="examhead-row">
          <span className={left < 5 * 60_000 ? 'timer low tnum' : 'timer tnum'}><Icon name="clock" /><span>{fmtTime(left)}</span></span>
          <span className="counter tnum"><b>{E.i + 1}</b>/{E.ids.length}</span>
          {instant && (
            <span className={errors > MAX_ERRORS ? 'errs over tnum' : 'errs tnum'} title="Ошибок / можно">
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

      <ActionBar>
        <button className="btn square" disabled={E.i === 0} onClick={() => step(-1)} aria-label="Forrige"><Icon name="left" /></button>
        <button className="btn flagbtn" aria-pressed={!!E.flag[id]} title="Отметить, чтобы вернуться позже"
          onClick={() => change(s => ({ ...s, flag: { ...s.flag, [id]: !s.flag[id] } }))}>
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
