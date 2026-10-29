import { useEffect, useRef, useState } from 'react';
import { ActionBar } from '../components/ActionBar';
import { Icon } from '../components/Icons';
import { Explanation } from '../components/question/Explanation';
import { Options } from '../components/question/Options';
import { QuestionCard } from '../components/question/QuestionCard';
import { Sheet } from '../components/Sheet';
import { QUESTION_BY_ID } from '../data';
import { useAnswerKeys } from '../hooks/useAnswerKeys';
import { useRevealScroll } from '../hooks/useRevealScroll';
import { useNow } from '../hooks/useNow';
import { errorCount, MAX_ERRORS, timeLeft } from '../lib/exam';
import { announce, answerFeedback } from '../lib/feedback';
import { playSound } from '../lib/sound';
import { fill, useT } from '../i18n';
import { fmtTime } from '../lib/text';
import { useApp } from '../state/AppState';
import type { ExamSession } from '../types';

export function ExamScreen() {
  const { data, update, go, finishExam } = useApp();
  const t = useT();
  const x = t.exam;
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
    announce(x.paused(fmtTime(stood)));
    const t = setTimeout(() => setPausedFor(0), 5000);
    return () => clearTimeout(t);
  }, [E?.paused]);

  const change = (fn: (s: ExamSession) => ExamSession) => update(d => (d.cur ? { ...d, cur: fn(d.cur) } : d));
  const id = E?.ids[E.i];
  const instant = E?.reveal === 'instant';
  const locked = !!(E && id && instant && E.ans[id] !== undefined);

  // "right after the question": a tap only selects the option, «Sjekk» hands the answer in and shows the result
  const [pending, setPending] = useState<number>();
  useEffect(() => setPending(undefined), [id]);
  const [explainRef, showExplanation] = useRevealScroll();
  const checking = instant && !locked && pending !== undefined;

  const pick = (oi: number) => {
    if (!id || locked || !E) return;
    if (instant) setPending(oi);
    else change(s => ({ ...s, ans: { ...s.ans, [id]: oi } }));
  };
  const check = () => {
    if (!id || !E || !checking || pending === undefined) return;
    const oi = pending;
    change(s => ({ ...s, ans: { ...s.ans, [id]: oi } }));
    streak.current = oi === 0 ? streak.current + 1 : 0;
    answerFeedback(oi === 0, streak.current, QUESTION_BY_ID[id].a[0], data.prefs.haptics);
    // the 8th mistake means the exam can no longer be passed
    if (oi !== 0 && errorCount({ ids: E.ids, ans: { ...E.ans, [id]: oi } }) === MAX_ERRORS + 1) setTimeout(() => playSound('limit'), 480);
    showExplanation();
  };
  const step = (d: number) => {
    change(s => ({ ...s, i: Math.min(Math.max(s.i + d, 0), s.ids.length - 1) }));
    window.scrollTo({ top: 0 });
  };
  // handing in the exam also hands in an option that was selected but not yet checked
  const submit = () => {
    if (checking && id && pending !== undefined) { const oi = pending; change(s => ({ ...s, ans: { ...s.ans, [id]: oi } })); }
    setDialog(null);
    finishExam(false);
    go({ name: 'result' });
  };
  const last = !!E && E.i === E.ids.length - 1;
  // one main button: «Sjekk» while an option waits to be checked, otherwise «Neste» (or «Lever prøven» at the end)
  const main = checking ? check : last ? () => setDialog('submit') : () => step(1);

  useAnswerKeys({
    pick: k => { if (E && id && k < E.perm[id].length) pick(E.perm[id][k]); },
    next: () => step(1),
    prev: () => step(-1),
    confirm: main,
  });

  if (!E || !id) return null;
  const q = QUESTION_BY_ID[id];
  const done = Object.keys(E.ans).length;
  const unanswered = E.ids.length - done;
  const flagged = E.ids.filter(x => E.flag[x]).length;
  const errors = errorCount(E);

  return (
    <div className="screen-q">
      <h1 className="sr-only">{x.heading(E.i + 1, E.ids.length)}</h1>
      <div className="examhead">
        <div className="examhead-row">
          <span className={left < 5 * 60_000 ? 'timer low tnum' : 'timer tnum'} role="timer" aria-label={x.left(Math.ceil(left / 60000))}><Icon name="clock" /><span aria-hidden="true">{fmtTime(left)}</span></span>
          <span className="counter tnum" aria-hidden="true"><b>{E.i + 1}</b>/{E.ids.length}</span>
          {instant && (
            <span className={errors > MAX_ERRORS ? 'errs over tnum' : 'errs tnum'} title={x.errorsTitle} aria-label={x.errorsLabel(errors, MAX_ERRORS)}>
              <Icon name="cross" />{errors}<small>/{MAX_ERRORS}</small>
            </span>
          )}
          <span className="sp" />
          <button className="iconbtn framed" onClick={() => setDialog('grid')} title={x.overview} aria-label={x.overview}><Icon name="grid" /></button>
          <button className="btn primary small-btn" onClick={() => setDialog('submit')}>Lever</button>
        </div>
        <div className="pbar" aria-hidden="true"><i style={{ width: `${(done / E.ids.length) * 100}%` }} /></div>
      </div>

      <QuestionCard key={id} q={q} number={E.i + 1} note={E.flag[id] ? <span className="flag-note"><Icon name="flag" />merket</span> : ''}>
        <Options q={q} order={E.perm[id]} chosen={E.ans[id] ?? (instant ? pending : undefined)} reveal={locked} onPick={pick} />
        {locked && <div ref={explainRef}><Explanation q={q} correct={E.ans[id] === 0} /></div>}
      </QuestionCard>

      <div className="toast-slot" aria-hidden="true">
        {pausedFor > 0 && <div className="toast info"><Icon name="clock" /><span>{x.paused(fmtTime(pausedFor))}</span></div>}
      </div>

      <ActionBar label={x.nav}>
        <button className="btn square" disabled={E.i === 0} onClick={() => step(-1)} aria-label={x.prev}><Icon name="left" /></button>
        <button className="btn flagbtn" aria-pressed={!!E.flag[id]} title={x.flagTitle}
          onClick={() => { if (!E.flag[id]) playSound('flag'); change(s => ({ ...s, flag: { ...s.flag, [id]: !s.flag[id] } })); }}>
          <Icon name="flag" />Merk
        </button>
        <button className={locked && E.ans[id] === 0 ? 'btn ok grow' : checking || last || E.ans[id] !== undefined ? 'btn primary grow' : 'btn grow'} onClick={main}>
          {checking ? <>Sjekk <Icon name="check" /></> : last ? 'Lever prøven' : <>Neste <Icon name="right" /></>}
        </button>
      </ActionBar>

      {dialog === 'grid' && (
        <Sheet title={x.gridTitle} onClose={() => setDialog(null)}>
          <div className="qgrid">
            {E.ids.map((qid, k) => {
              const a = E.ans[qid];
              const state = a === undefined ? '' : !instant ? 'done' : a === 0 ? 'ok' : 'bad';
              return (
                <button key={qid} className={[state, E.flag[qid] && 'flag', k === E.i && 'cur'].filter(Boolean).join(' ')}
                  aria-label={x.gridItem(k + 1, a === undefined ? x.stateNone : state === 'ok' ? x.stateRight : state === 'bad' ? x.stateWrong : x.stateDone, !!E.flag[qid])}
                  aria-current={k === E.i ? 'step' : undefined}
                  onClick={() => { change(s => ({ ...s, i: k })); setDialog(null); window.scrollTo({ top: 0 }); }}>{k + 1}</button>
              );
            })}
          </div>
          <div className="legend">
            {instant
              ? <><span><i className="lg-ok" />{x.stateRight}</span><span><i className="lg-bad" />{x.stateWrong}</span></>
              : <span><i className="lg-done" />{x.stateDone}</span>}
            <span><i className="lg-flag" />{x.stateFlag}</span>
            <span><i />{x.stateNone}</span>
          </div>
        </Sheet>
      )}

      {dialog === 'submit' && (
        <Sheet title={x.submitTitle} onClose={() => setDialog(null)}
          actions={<>
            <button className="btn" onClick={() => setDialog(null)}>{x.stay}</button>
            <button className="btn primary" data-autofocus onClick={submit}>Lever prøven</button>
          </>}>
          <p className="mtext">
            {unanswered
              ? fill(x.unanswered, { n: t.questions(unanswered) })
              : x.allAnswered}
            {flagged > 0 && fill(x.flagged, { n: flagged })}
          </p>
        </Sheet>
      )}
    </div>
  );
}
