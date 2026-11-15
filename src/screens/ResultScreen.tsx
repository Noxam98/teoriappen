import { useEffect, useMemo, useState } from 'react';
import { playSound } from '../lib/sound';
import { ScoreGauge } from '../components/Gauges';
import { Icon } from '../components/Icons';
import { laterOf, ReadingList, ReadingSheet } from '../components/later/Reading';
import { LookedList, lookedOf, mergeWords } from '../components/Looked';
import { AnswerReview } from '../components/review/AnswerReview';
import { CATEGORY, THEORY_BY_CAT } from '../data';
import { Words } from '../features/brush/Words';
import { MAX_ERRORS } from '../lib/exam';
import { topicName, useT } from '../i18n';
import { fmtTime } from '../lib/text';
import { practiceTitle } from './PracticeScreen';
import { useApp } from '../state/AppState';
import type { CategoryId } from '../types';

let soundedFor = 0;

export function ResultScreen() {
  const { data, go, startExam } = useApp();
  const t = useT();
  const r = t.result;
  const lang = data.prefs.lang;
  const [reading, setReading] = useState<string | null>(null);
  const L = data.last;
  // the stamp sound plays together with the stamp animation, once per result
  useEffect(() => {
    if (!L || soundedFor === L.res.date) return;
    soundedFor = L.res.date;
    const share = L.res.n ? L.res.right / L.res.n : 0;
    const name = L.kind === 'practice' ? (share >= 0.8 ? 'finishGood' : 'finishOk') : L.res.pass ? 'pass' : 'fail';
    if (L.res.timeout) setTimeout(() => playSound(name), 900);
    else playSound(name);
  }, [L]);
  // the address #/result from another device or after a reset: there is nothing to show
  useEffect(() => { if (!L) go({ name: 'home' }, { replace: true }); }, [L, go]);
  const words = useMemo(() => lookedOf(data.looked, L?.res.test), [data.looked, L?.res.test]);
  if (!L) return null;
  const { res } = L;
  const isExam = L.kind !== 'practice';
  const errors = res.n - res.right;
  const wrongIds = L.ids.filter(id => L.ans[id] !== 0);
  const topics = (Object.entries(L.byCat) as [CategoryId, [number, number]][]).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);
  const practiced = L.practice && L.practice.mode in CATEGORY ? L.practice.mode as CategoryId : null;
  // the title in the reader's current language, not the one saved with the result
  const title = L.practice ? practiceTitle(L.practice.mode, t, lang) : null;
  const later = laterOf(data.later, res.test);
  const readCount = later.filter(x => x.read).length;
  const wordList = mergeWords(words);

  return (
    <div className="result">
      <h1 className="sr-only">{isExam ? r.examHeading(res.pass, res.right, res.n) : r.practiceHeading(res.right, res.n)}</h1>
      <section className={`result-hero ${isExam ? (res.pass ? 'pass' : 'fail') : 'practice'}`}>
        {isExam ? (
          <div className={res.pass ? 'bigstamp pass' : 'bigstamp fail'}>
            <span data-block lang="nb"><Words text={res.pass ? 'Bestått' : 'Ikke bestått'} /></span><small>{res.pass ? r.passed : r.failed}</small>
          </div>
        ) : (
          <div className="practice-title">
            <div className="eyebrow">{r.practiceDone}</div>
            <h2 data-block lang="nb"><Words text={title?.[0] ?? ''} /></h2>
            <small>{title?.[1]}</small>
          </div>
        )}
        {res.n > 0 && <>
          <ScoreGauge right={res.right} total={res.n} maxErrors={isExam ? MAX_ERRORS : undefined} pass={isExam ? res.pass : undefined} />
          <div className="rfacts">
            <span className="chip tnum">{t.errors(errors)}{isExam && r.allowed(MAX_ERRORS)}</span>
            <span className="chip tnum"><Icon name="clock" />{fmtTime(res.ms)}</span>
            {res.timeout && <span className="chip warn">{r.timeout}</span>}
          </div>
        </>}
      </section>

      {later.length > 0 && (
        <section className="panel later-panel" aria-labelledby="later-title">
          <div className="later-head">
            <Icon name="bookmark" />
            <h2 id="later-title">{t.later.title}</h2>
            <span className="chip tnum">{t.later.count(later.length, readCount)}</span>
          </div>
          <ReadingList items={later} onOpen={setReading} />
        </section>
      )}
      {reading && <ReadingSheet items={later} start={reading} onClose={() => setReading(null)} />}

      {words.length > 0 && (
        <section className="panel looked-panel" aria-labelledby="looked-title">
          <div className="later-head">
            <Icon name="translate" />
            <h2 id="looked-title">{t.looked.title}</h2>
            <span className="chip tnum">{wordList.length}</span>
          </div>
          <LookedList items={wordList} />
        </section>
      )}

      {topics.length > 1 && (
        <section className="panel breakdown">
          <div className="eyebrow">{r.byTopic}</div>
          {topics.map(([c, [right, n]]) => (
            <div key={c} className="brow">
              <span className="brow-name">{CATEGORY[c].no}<small>{topicName(CATEGORY[c], lang)}</small></span>
              <span className="meter"><i className="g" style={{ width: `${(right / n) * 100}%` }} /><i className="r" style={{ width: `${((n - right) / n) * 100}%` }} /></span>
              <span className="v tnum">{right}/{n}</span>
              {THEORY_BY_CAT[c] && (
                <button className="iconbtn" onClick={() => go({ name: 'chapter', cat: c })} title={r.theoryTitle} aria-label={r.theoryLabel(CATEGORY[c].no)}><Icon name="theory" /></button>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="result-actions">
        {isExam
          ? <button className="btn primary" onClick={() => startExam()}><Icon name="redo" />{r.newExam}</button>
          : <button className="btn primary" onClick={() => go({ name: 'practice', mode: L.practice?.mode ?? 'all' })}><Icon name="redo" />{r.again}</button>}
        {errors > 0 && <button className="btn" onClick={() => go({ name: 'practice', mode: 'list', ids: wrongIds })}>{r.trainMistakes}</button>}
        {practiced && THEORY_BY_CAT[practiced] && <button className="btn" onClick={() => go({ name: 'chapter', cat: practiced })}><Icon name="theory" />{r.theoryTitle}</button>}
        <button className="btn ghost" onClick={() => go({ name: 'home' })}><Icon name="home" />{t.toHome}</button>
      </div>

      {res.n > 0 && <AnswerReview ids={L.ids} ans={L.ans} perm={L.perm} words={words} initial="bad" />}
    </div>
  );
}
