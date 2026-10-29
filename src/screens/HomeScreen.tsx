import { useEffect } from 'react';
import { CategoryIcon } from '../components/CategoryIcon';
import { Words } from '../features/brush/Words';
import { ProgressRing } from '../components/Gauges';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { revealOptions } from '../components/SettingsSheet';
import { CATEGORIES, QUESTIONS, QUESTION_BY_ID, THEORY } from '../data';
import { useNow } from '../hooks/useNow';
import { EXAM_MINUTES, EXAM_QUESTIONS, MAX_ERRORS, readiness, timeLeft, wrongQuestionIds } from '../lib/exam';
import { fill, topicName, useT } from '../i18n';
import { fmtTime } from '../lib/text';
import { useApp } from '../state/AppState';

export function HomeScreen() {
  const { data, update, go, startExam, finishExam } = useApp();
  const t = useT();
  const h = t.home;
  const now = useNow(15_000);
  const cur = data.cur && timeLeft(data.cur, now) > 0 ? data.cur : null;
  const wrong = wrongQuestionIds(data.stats).length;
  const seen = Object.keys(data.stats).filter(id => QUESTION_BY_ID[id]).length;
  const ready = readiness(data.stats);
  const recent = data.exams.slice(-5).reverse();
  const chaptersRead = THEORY.filter(t => data.read[t.cat]).length;
  const options = revealOptions(t);
  const reveal = options.find(o => o.value === data.prefs.reveal) ?? options[0];

  // an exam whose time ran out while the app was closed is graded silently
  useEffect(() => { if (data.cur && timeLeft(data.cur) <= 0) finishExam(true); }, [data.cur, finishExam]);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-top">
          <div className="hero-title">
            <div className="eyebrow">Førerkort klasse B</div>
            <h1>Teoriprøven</h1>
            <p>{h.intro}</p>
          </div>
          <ProgressRing value={ready} label={`${Math.round(ready * 100)}%`} sub={h.ready} />
        </div>
        <ul className="hero-facts" aria-label={h.rules}>
          <li>{fill(h.factQuestions, { n: EXAM_QUESTIONS })}</li>
          <li>{fill(h.factMinutes, { n: EXAM_MINUTES })}</li>
          <li>{fill(h.factErrors, { n: MAX_ERRORS })}</li>
        </ul>
        {cur ? (
          <>
            <button className="cta" onClick={() => go({ name: 'exam' })}>
              <span><b>{h.continue}</b><small className="tnum">{h.continueSub(Object.keys(cur.ans).length, cur.ids.length, fmtTime(timeLeft(cur, now)))}</small></span>
              <Icon name="right" />
            </button>
            <button className="hero-link" onClick={startExam}>{h.newExam}</button>
          </>
        ) : (
          <button className="cta" onClick={startExam}>
            <span><b>{h.start}</b><small>{h.startSub}</small></span>
            <Icon name="right" />
          </button>
        )}
        <div className="hero-road" aria-hidden="true" />
      </section>

      <section className="reveal-card panel">
        <div className="reveal-text">
          <b>{h.reveal}</b>
          <small>{reveal.hint}</small>
        </div>
        <Segmented label={h.reveal} value={data.prefs.reveal}
          onChange={v => update(d => ({ ...d, prefs: { ...d.prefs, reveal: v } }))}
          options={[{ value: 'instant', label: h.revealShort[0] }, { value: 'end', label: h.revealShort[1] }]} />
      </section>

      <div className="tiles">
        <button className="tile" onClick={() => go({ name: 'theory' })}>
          <span className="tile-ic ok"><Icon name="theory" /></span>
          <b>{h.theory}</b><small className="tnum">{chaptersRead ? h.theoryRead(chaptersRead, THEORY.length) : t.chapters(THEORY.length)}</small>
        </button>
        <button className="tile" onClick={() => go({ name: 'practice', mode: 'all' })}>
          <span className="tile-ic"><Icon name="shuffle" /></span>
          <b>{h.practice}</b><small>{h.allTopics}</small>
        </button>
        <button className="tile" disabled={!wrong} onClick={() => go({ name: 'practice', mode: 'wrong' })}>
          <span className="tile-ic bad"><Icon name="redo" /></span>
          <b>{h.mistakes}</b><small className="tnum">{wrong ? t.questions(wrong) : h.noneYet}</small>
        </button>
        <button className="tile" onClick={() => go({ name: 'vocab' })}>
          <span className="tile-ic"><Icon name="book" /></span>
          <b>{h.vocab}</b><small className="tnum">{t.words(data.vocab.length)}</small>
        </button>
      </div>

      <div className="section-title stacked">
        <h2 id="topics-title">{h.topics}</h2>
        <p className="section-sub">{h.topicsSub} <span className="tnum">{h.seen(seen, QUESTIONS.length)}</span></p>
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
              <span className="nm"><span className="sr-only">{h.trainTopic}</span><span data-block lang="nb"><Words text={c.no} /></span><small>{topicName(c, data.prefs.lang)}</small></span>
              <span className="go" aria-hidden="true"><Icon name="play" /></span>
              <span className="cat-progress">
                <span className="meter" aria-hidden="true">
                  <i className="g" style={{ width: `${(ok / qs.length) * 100}%` }} />
                  <i className="r" style={{ width: `${(bad / qs.length) * 100}%` }} />
                </span>
                <span className="ct tnum">{st.length ? fill(h.rightOf(qs.length), { n: ok }) : t.questions(qs.length)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="section-title"><h2>{h.recent}</h2></div>
      {recent.length ? (
        <div className="history">
          {recent.map(e => (
            <div key={e.date} className="hrow">
              <span className={e.pass ? 'stamp pass' : 'stamp fail'}>{e.pass ? 'Bestått' : 'Ikke bestått'}</span>
              <span className="tnum"><b>{e.right}</b>/{e.n} · {t.errors(e.n - e.right)}</span>
              <span className="muted tnum small">{new Date(e.date).toLocaleDateString(t.locale, { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">{h.noExams}</div>
      )}
    </div>
  );
}
