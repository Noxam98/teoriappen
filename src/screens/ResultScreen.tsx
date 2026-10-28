import { useState } from 'react';
import { Figure } from '../components/figures/Figure';
import { ScoreGauge } from '../components/Gauges';
import { Icon } from '../components/Icons';
import { Explanation } from '../components/question/Explanation';
import { CATEGORY, QUESTION_BY_ID } from '../data';
import { Words } from '../features/brush/Words';
import { MAX_ERRORS } from '../lib/exam';
import { fmtTime, plural } from '../lib/text';
import { useApp } from '../state/AppState';
import type { CategoryId, Question } from '../types';

export function ResultScreen() {
  const { data, go, startExam } = useApp();
  const [filter, setFilter] = useState<'bad' | 'all'>('bad');
  const L = data.last;
  if (!L) return null;
  const { res } = L;
  const isExam = L.kind !== 'practice';
  const errors = res.n - res.right;
  const wrongIds = L.ids.filter(id => L.ans[id] !== 0);
  const shown = filter === 'all' ? L.ids : wrongIds;
  const topics = (Object.entries(L.byCat) as [CategoryId, [number, number]][]).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);

  return (
    <div className="result">
      <h1 className="sr-only">{isExam ? `Результат экзамена: ${res.pass ? 'сдан' : 'не сдан'}, ${res.right} из ${res.n}` : `Тренировка завершена: ${res.right} из ${res.n}`}</h1>
      <section className={`result-hero ${isExam ? (res.pass ? 'pass' : 'fail') : 'practice'}`}>
        {isExam ? (
          <div className={res.pass ? 'bigstamp pass' : 'bigstamp fail'}>
            {res.pass ? 'Bestått' : 'Ikke bestått'}<small>{res.pass ? 'экзамен сдан' : 'экзамен не сдан'}</small>
          </div>
        ) : (
          <div className="practice-title">
            <div className="eyebrow">Тренировка завершена</div>
            <h2>{L.practice?.title[0]}</h2>
            <small>{L.practice?.title[1]}</small>
          </div>
        )}
        <ScoreGauge right={res.right} total={res.n} maxErrors={isExam ? MAX_ERRORS : undefined} pass={isExam ? res.pass : undefined} />
        <div className="rfacts">
          <span className="chip tnum"><b>{errors}</b>&nbsp;{plural(errors, 'ошибка', 'ошибки', 'ошибок')}{isExam && ` · можно ${MAX_ERRORS}`}</span>
          <span className="chip tnum"><Icon name="clock" />{fmtTime(res.ms)}</span>
          {res.timeout && <span className="chip warn">время вышло</span>}
        </div>
      </section>

      {topics.length > 1 && (
        <section className="panel breakdown">
          <div className="eyebrow">По темам · сначала слабые</div>
          {topics.map(([c, [r, n]]) => (
            <div key={c} className="brow">
              <span className="brow-name">{CATEGORY[c].no}<small>{CATEGORY[c].ru}</small></span>
              <span className="meter"><i className="g" style={{ width: `${(r / n) * 100}%` }} /><i className="r" style={{ width: `${((n - r) / n) * 100}%` }} /></span>
              <span className="v tnum">{r}/{n}</span>
            </div>
          ))}
        </section>
      )}

      <div className="result-actions">
        {isExam
          ? <button className="btn primary" onClick={startExam}><Icon name="redo" />Новый экзамен</button>
          : <button className="btn primary" onClick={() => go({ name: 'practice', mode: L.practice?.mode ?? 'all' })}><Icon name="redo" />Ещё раз</button>}
        {errors > 0 && <button className="btn" onClick={() => go({ name: 'practice', mode: 'list', ids: wrongIds })}>Тренировать ошибки</button>}
        <button className="btn ghost" onClick={() => go({ name: 'home' })}><Icon name="home" />На главную</button>
      </div>

      <div className="section-title tight">
        <h2>Разбор</h2>
        <div className="segmented small" role="radiogroup" aria-label="Что показать">
          <button role="radio" aria-checked={filter === 'bad'} onClick={() => setFilter('bad')}>Ошибки · {errors}</button>
          <button role="radio" aria-checked={filter === 'all'} onClick={() => setFilter('all')}>Все · {res.n}</button>
        </div>
      </div>
      <div className="review">
        {shown.length
          ? shown.map(id => <ReviewItem key={id} q={QUESTION_BY_ID[id]} chosen={L.ans[id]} number={L.ids.indexOf(id) + 1} />)
          : <div className="empty">Ошибок нет. Отличный результат!</div>}
      </div>
    </div>
  );
}

function ReviewItem({ q, chosen, number }: { q: Question; chosen: number | undefined; number: number }) {
  const ok = chosen === 0;
  return (
    <article className={ok ? 'ritem ok' : 'ritem bad'}>
      <div className="qmeta">
        <span className="qn">Spørsmål {number}</span>
        <span className={ok ? 'verdict-chip ok' : 'verdict-chip bad'}>{ok ? 'верно' : chosen === undefined ? 'без ответа' : 'ошибка'}</span>
      </div>
      <div className={q.img ? 'ritem-body has-fig' : 'ritem-body'}>
        <Figure spec={q.img} />
        <p className="qtext" data-block lang="nb"><Words text={q.q} /></p>
      </div>
      {chosen !== undefined && !ok && <div className="ans bad"><Icon name="cross" /><span className="sr-only">Ваш ответ: </span><span data-block lang="nb"><Words text={q.a[chosen]} /></span></div>}
      <div className="ans ok"><Icon name="check" /><span className="sr-only">Правильный ответ: </span><span data-block lang="nb"><Words text={q.a[0]} /></span></div>
      <Explanation q={q} />
    </article>
  );
}
