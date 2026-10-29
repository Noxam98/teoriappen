import { useEffect } from 'react';
import { CategoryIcon } from '../components/CategoryIcon';
import { Words } from '../features/brush/Words';
import { ProgressRing } from '../components/Gauges';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { REVEAL_OPTIONS } from '../components/SettingsSheet';
import { CATEGORIES, QUESTIONS, QUESTION_BY_ID } from '../data';
import { useNow } from '../hooks/useNow';
import { EXAM_MINUTES, EXAM_QUESTIONS, MAX_ERRORS, readiness, wrongQuestionIds } from '../lib/exam';
import { fmtTime, plural } from '../lib/text';
import { useApp } from '../state/AppState';

export function HomeScreen() {
  const { data, update, go, startExam, finishExam } = useApp();
  const now = useNow(15_000);
  const cur = data.cur && data.cur.end > now ? data.cur : null;
  const wrong = wrongQuestionIds(data.stats).length;
  const seen = Object.keys(data.stats).filter(id => QUESTION_BY_ID[id]).length;
  const ready = readiness(data.stats);
  const recent = data.exams.slice(-5).reverse();
  const reveal = REVEAL_OPTIONS.find(o => o.value === data.prefs.reveal) ?? REVEAL_OPTIONS[0];

  // an exam whose time ran out while the app was closed is graded silently
  useEffect(() => { if (data.cur && data.cur.end <= Date.now()) finishExam(true); }, [data.cur, finishExam]);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-top">
          <div className="hero-title">
            <div className="eyebrow">Førerkort klasse B</div>
            <h1>Teoriprøven</h1>
            <p>Тренажёр теоретического экзамена. Вопросы на норвежском, а любое слово можно перевести кнопкой «Перевод» вверху.</p>
          </div>
          <ProgressRing value={ready} label={`${Math.round(ready * 100)}%`} sub="готово" />
        </div>
        <ul className="hero-facts" aria-label="Правила экзамена">
          <li><b>{EXAM_QUESTIONS}</b> вопросов</li>
          <li><b>{EXAM_MINUTES}</b> минут</li>
          <li>до <b>{MAX_ERRORS}</b> ошибок</li>
        </ul>
        {cur ? (
          <>
            <button className="cta" onClick={() => go({ name: 'exam' })}>
              <span><b>Продолжить экзамен</b><small className="tnum">{Object.keys(cur.ans).length} из {cur.ids.length} · осталось {fmtTime(cur.end - now)}</small></span>
              <Icon name="right" />
            </button>
            <button className="hero-link" onClick={startExam}>Начать новый экзамен</button>
          </>
        ) : (
          <button className="cta" onClick={startExam}>
            <span><b>Начать экзамен</b><small>Случайные вопросы по всем темам</small></span>
            <Icon name="right" />
          </button>
        )}
        <div className="hero-road" aria-hidden="true" />
      </section>

      <section className="reveal-card panel">
        <div className="reveal-text">
          <b>Показывать ответ</b>
          <small>{reveal.hint}</small>
        </div>
        <Segmented label="Показывать ответ" value={data.prefs.reveal}
          onChange={v => update(d => ({ ...d, prefs: { ...d.prefs, reveal: v } }))}
          options={[{ value: 'instant', label: 'Сразу' }, { value: 'end', label: 'В конце' }]} />
      </section>

      <div className="tiles">
        <button className="tile" onClick={() => go({ name: 'practice', mode: 'all' })}>
          <span className="tile-ic"><Icon name="shuffle" /></span>
          <b>Тренировка</b><small>все темы</small>
        </button>
        <button className="tile" disabled={!wrong} onClick={() => go({ name: 'practice', mode: 'wrong' })}>
          <span className="tile-ic bad"><Icon name="redo" /></span>
          <b>Ошибки</b><small className="tnum">{wrong ? `${wrong} ${plural(wrong, 'вопрос', 'вопроса', 'вопросов')}` : 'пока нет'}</small>
        </button>
        <button className="tile" onClick={() => go({ name: 'vocab' })}>
          <span className="tile-ic"><Icon name="book" /></span>
          <b>Словарь</b><small className="tnum">{data.vocab.length} {plural(data.vocab.length, 'слово', 'слова', 'слов')}</small>
        </button>
      </div>

      <div className="section-title stacked">
        <h2 id="topics-title">Тренировка по темам</h2>
        <p className="section-sub">Нажмите на тему — начнутся вопросы только по ней. <span className="tnum">Пройдено {seen} из {QUESTIONS.length}.</span></p>
      </div>
      <div className="cats" role="group" aria-labelledby="topics-title">
        {CATEGORIES.map(c => {
          const qs = QUESTIONS.filter(q => q.cat === c.id);
          if (!qs.length) return null;
          const st = qs.map(q => data.stats[q.id]).filter(Boolean);
          const ok = st.filter(s => s[2] === 1).length, bad = st.filter(s => s[2] === 0).length;
          return (
            <button key={c.id} className="cat" onClick={() => go({ name: 'practice', mode: c.id })}>
              <span className="ic"><CategoryIcon id={c.id} /></span>
              <span className="nm"><span className="sr-only">Тренировать тему: </span><span data-block lang="nb"><Words text={c.no} /></span><small>{c.ru}</small></span>
              <span className="go" aria-hidden="true"><Icon name="play" /></span>
              <span className="cat-progress">
                <span className="meter" aria-hidden="true">
                  <i className="g" style={{ width: `${(ok / qs.length) * 100}%` }} />
                  <i className="r" style={{ width: `${(bad / qs.length) * 100}%` }} />
                </span>
                <span className="ct tnum">{st.length ? <>верно <b>{ok}</b> из {qs.length}</> : <>{qs.length} {plural(qs.length, 'вопрос', 'вопроса', 'вопросов')}</>}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="section-title"><h2>Последние экзамены</h2></div>
      {recent.length ? (
        <div className="history">
          {recent.map(e => (
            <div key={e.date} className="hrow">
              <span className={e.pass ? 'stamp pass' : 'stamp fail'}>{e.pass ? 'Bestått' : 'Ikke bestått'}</span>
              <span className="tnum"><b>{e.right}</b>/{e.n} · {e.n - e.right} {plural(e.n - e.right, 'ошибка', 'ошибки', 'ошибок')}</span>
              <span className="muted tnum small">{new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">Пока нет попыток. Начните экзамен — результат появится здесь.</div>
      )}
    </div>
  );
}
