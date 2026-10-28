import { useState } from 'react';
import { Figure } from '../components/figures/Figure';
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
  const errors = res.n - res.right;
  const wrongIds = L.ids.filter(id => L.ans[id] !== 0);
  const shown = filter === 'all' ? L.ids : wrongIds;
  const topics = (Object.entries(L.byCat) as [CategoryId, [number, number]][]).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);

  return (
    <div className="result">
      <section className="panel rcard">
        <div className={res.pass ? 'bigstamp pass' : 'bigstamp fail'}>
          {res.pass ? 'Bestått' : 'Ikke bestått'}<small>{res.pass ? 'экзамен сдан' : 'не сдан'}</small>
        </div>
        <div>
          <div className="score tnum">{res.right}<small> / {res.n} верно</small></div>
          <div className="rfacts">
            <span className="chip tnum"><b>{errors}</b>&nbsp;{plural(errors, 'ошибка', 'ошибки', 'ошибок')} (можно {MAX_ERRORS})</span>
            <span className="chip tnum">время {fmtTime(res.ms)}</span>
            {res.timeout && <span className="chip">время вышло</span>}
          </div>
        </div>
      </section>

      <section className="panel breakdown">
        <div className="eyebrow">По темам</div>
        {topics.map(([c, [r, n]]) => (
          <div key={c} className="brow">
            <span>{CATEGORY[c].no} <span className="muted">· {CATEGORY[c].ru}</span></span>
            <span className="meter"><i className="g" style={{ width: `${(r / n) * 100}%` }} /><i className="r" style={{ width: `${((n - r) / n) * 100}%` }} /></span>
            <span className="v tnum">{r}/{n}</span>
          </div>
        ))}
      </section>

      <div className="cta">
        <button className="btn primary" onClick={startExam}>Новый экзамен</button>
        <button className="btn" onClick={() => go({ name: 'home' })}>На главную</button>
        {errors > 0 && <button className="btn" onClick={() => go({ name: 'practice', mode: 'list', ids: wrongIds })}>Тренировать ошибки</button>}
      </div>

      <div className="section-title tight">
        <h2>Разбор</h2>
        <div className="filter">
          <button aria-pressed={filter === 'bad'} onClick={() => setFilter('bad')}>Ошибки ({errors})</button>
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Все {res.n}</button>
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
  return (
    <article className="panel ritem">
      <div className="qmeta"><span className="qn">Spørsmål {number}</span><span className="qc">{CATEGORY[q.cat].no}</span></div>
      <Figure spec={q.img} />
      <p className="qtext" data-block><Words text={q.q} /></p>
      {chosen === undefined && <div className="ans bad"><Icon name="cross" /><span><i>Ikke besvart · без ответа</i></span></div>}
      {chosen !== undefined && chosen !== 0 && <div className="ans bad"><Icon name="cross" /><span data-block><Words text={q.a[chosen]} /></span></div>}
      <div className="ans ok"><Icon name="check" /><span data-block><Words text={q.a[0]} /></span></div>
      <Explanation q={q} />
    </article>
  );
}
