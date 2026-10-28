import { useEffect, useState } from 'react';
import { Icon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { Options } from '../components/question/Options';
import { QuestionCard } from '../components/question/QuestionCard';
import { QUESTION_BY_ID } from '../data';
import { useAnswerKeys } from '../hooks/useAnswerKeys';
import { useNow } from '../hooks/useNow';
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

  useAnswerKeys({
    pick: k => { if (E && id && k < E.perm[id].length) change(s => ({ ...s, ans: { ...s.ans, [id]: s.perm[id][k] } })); },
    next: () => change(s => ({ ...s, i: Math.min(s.i + 1, s.ids.length - 1) })),
    prev: () => change(s => ({ ...s, i: Math.max(s.i - 1, 0) })),
  });

  if (!E || !id) return null;
  const q = QUESTION_BY_ID[id];
  const done = Object.keys(E.ans).length;
  const unanswered = E.ids.filter(x => E.ans[x] === undefined).length;
  const flagged = E.ids.filter(x => E.flag[x]).length;
  const last = E.i === E.ids.length - 1;

  return (
    <>
      <div className="examhead">
        <span className={left < 5 * 60_000 ? 'timer low tnum' : 'timer tnum'}><Icon name="clock" /><span>{fmtTime(left)}</span></span>
        <span className="progress-txt tnum"><span className="lbl-long">Spørsmål </span>{E.i + 1} av {E.ids.length}</span>
        <span className="sp" />
        <button className="btn" onClick={() => setDialog('grid')} title="Обзор вопросов"><Icon name="grid" /><span className="lbl-long">Oversikt</span></button>
        <button className="btn primary" onClick={() => setDialog('submit')}>Lever</button>
        <div className="pbar" aria-hidden="true"><i style={{ width: `${(done / E.ids.length) * 100}%` }} /></div>
      </div>

      <QuestionCard q={q} number={E.i + 1} note={E.flag[id] ? 'merket' : ''}>
        <Options q={q} order={E.perm[id]} chosen={E.ans[id]} onPick={oi => change(s => ({ ...s, ans: { ...s.ans, [id]: oi } }))} />
      </QuestionCard>

      <nav className="qnav">
        <button className="btn" disabled={E.i === 0} onClick={() => change(s => ({ ...s, i: s.i - 1 }))}>
          <Icon name="left" /><span className="lbl-long">Forrige</span>
        </button>
        <button className="btn flagbtn" aria-pressed={!!E.flag[id]} title="Отметить, чтобы вернуться позже"
          onClick={() => change(s => ({ ...s, flag: { ...s.flag, [id]: !s.flag[id] } }))}>
          <Icon name="flag" />Merk
        </button>
        <span className="sp" />
        <button className={last ? 'btn' : 'btn primary'} disabled={last} onClick={() => change(s => ({ ...s, i: s.i + 1 }))}>
          Neste <Icon name="right" />
        </button>
      </nav>

      {dialog === 'grid' && (
        <Modal title="Oversikt · обзор вопросов" onClose={() => setDialog(null)}
          actions={<button className="btn" onClick={() => setDialog(null)}>Lukk</button>}>
          <div className="qgrid">
            {E.ids.map((x, k) => (
              <button key={x} className={[E.ans[x] !== undefined && 'done', E.flag[x] && 'flag', k === E.i && 'cur'].filter(Boolean).join(' ')}
                onClick={() => { change(s => ({ ...s, i: k })); setDialog(null); }}>{k + 1}</button>
            ))}
          </div>
          <div className="legend">
            <span><i className="lg-done" />besvart · отвечен</span>
            <span><i className="lg-flag" />merket · отмечен</span>
            <span><i />ubesvart · без ответа</span>
          </div>
        </Modal>
      )}

      {dialog === 'submit' && (
        <Modal title="Lever prøven? · Сдать экзамен?" onClose={() => setDialog(null)}
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
        </Modal>
      )}
    </>
  );
}
