import { useEffect } from 'react';
import { CategoryIcon } from '../components/CategoryIcon';
import { Sign } from '../components/figures/Sign';
import { Icon } from '../components/Icons';
import { CATEGORIES, QUESTIONS, QUESTION_BY_ID } from '../data';
import { useNow } from '../hooks/useNow';
import { EXAM_MINUTES, EXAM_QUESTIONS, MAX_ERRORS, wrongQuestionIds } from '../lib/exam';
import { fmtTime, plural } from '../lib/text';
import { useApp } from '../state/AppState';

export function HomeScreen() {
  const { data, go, startExam, finishExam } = useApp();
  const now = useNow(15_000);
  const cur = data.cur && data.cur.end > now ? data.cur : null;
  const wrong = wrongQuestionIds(data.stats).length;
  const seen = Object.keys(data.stats).filter(id => QUESTION_BY_ID[id]).length;
  const passed = data.exams.filter(e => e.pass).length;
  const recent = data.exams.slice(-5).reverse();

  // an exam whose time ran out while the app was closed is graded silently
  useEffect(() => { if (data.cur && data.cur.end <= Date.now()) finishExam(true); }, [data.cur, finishExam]);

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Тренажёр теоретического экзамена</div>
          <h1>Teoriprøven klasse B</h1>
          <p>
            Вопросы на норвежском, как на настоящем экзамене. Непонятное слово — включите <b>кисть</b> в панели сверху
            и проведите по слову: появится перевод на русский.
          </p>
          <div className="rules">
            <span className="chip"><b>{EXAM_QUESTIONS}</b> вопросов</span>
            <span className="chip"><b>{EXAM_MINUTES}</b> минут</span>
            <span className="chip">максимум <b>{MAX_ERRORS}</b> ошибок</span>
            <span className="chip"><b>{QUESTIONS.length}</b> вопросов в базе</span>
          </div>
        </div>
        <div className="hero-signs" aria-hidden="true">
          <Sign name="vikeplikt" /><Sign name="forkjorsveg" /><Sign name="fart_80" />
        </div>
        {cur && (
          <div className="resume">
            <b>Экзамен не закончен:</b>
            <span className="tnum">{Object.keys(cur.ans).length} из {cur.ids.length} отвечено · осталось {fmtTime(cur.end - now)}</span>
            <span className="sp" />
            <button className="btn primary" onClick={() => go({ name: 'exam' })}>Продолжить экзамен</button>
          </div>
        )}
        <div className="cta">
          <button className={cur ? 'btn' : 'btn primary'} onClick={startExam}>
            {cur ? 'Начать новый экзамен' : 'Начать экзамен'} <Icon name="right" />
          </button>
          <button className="btn" onClick={() => go({ name: 'practice', mode: 'all' })}>Тренировка: все темы</button>
        </div>
      </section>

      <div className="modes">
        <button className="mode" disabled={!wrong} onClick={() => go({ name: 'practice', mode: 'wrong' })}>
          <span className="n tnum">{wrong}</span>
          <b>Работа над ошибками</b>
          <span>{wrong ? 'Вопросы, на которые вы в последний раз ответили неверно' : 'Здесь появятся вопросы с ошибками'}</span>
        </button>
        <button className="mode" onClick={() => go({ name: 'vocab' })}>
          <span className="n tnum">{data.vocab.length}</span>
          <b>Мой словарь</b>
          <span>Слова, сохранённые кистью. Можно учить карточками</span>
        </button>
        <div className="mode static">
          <span className="n tnum">{seen}<small> / {QUESTIONS.length}</small></span>
          <b>Пройдено вопросов</b>
          <span>Сдано экзаменов: {passed} из {data.exams.length}</span>
        </div>
      </div>

      <div className="section-title">
        <h2>Темы</h2>
        <span className="muted small">нажмите тему, чтобы тренироваться</span>
      </div>
      <div className="cats">
        {CATEGORIES.map(c => {
          const qs = QUESTIONS.filter(q => q.cat === c.id);
          if (!qs.length) return null;
          const st = qs.map(q => data.stats[q.id]).filter(Boolean);
          const ok = st.filter(s => s[2] === 1).length, bad = st.filter(s => s[2] === 0).length;
          return (
            <button key={c.id} className="cat" onClick={() => go({ name: 'practice', mode: c.id })}>
              <span className="ic"><CategoryIcon id={c.id} /></span>
              <span className="nm">{c.no}<small>{c.ru}</small></span>
              <span className="ct tnum">{ok}/{qs.length}</span>
              <span className="meter" aria-hidden="true">
                <i className="g" style={{ width: `${(ok / qs.length) * 100}%` }} />
                <i className="r" style={{ width: `${(bad / qs.length) * 100}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="section-title"><h2>Последние экзамены</h2></div>
      {recent.length ? (
        <div className="history">
          {recent.map(e => (
            <div key={e.date} className="hrow panel">
              <span className={e.pass ? 'stamp pass' : 'stamp fail'}>{e.pass ? 'Bestått' : 'Ikke bestått'}</span>
              <span className="tnum">{e.right} из {e.n} верно · {e.n - e.right} {plural(e.n - e.right, 'ошибка', 'ошибки', 'ошибок')}</span>
              <span className="muted tnum">{fmtTime(e.ms)}</span>
              <span className="muted tnum">{new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">Пока нет попыток. Начните экзамен — результат появится здесь.</div>
      )}
    </>
  );
}
