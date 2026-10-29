import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ActionBar } from '../components/ActionBar';
import { CategoryIcon } from '../components/CategoryIcon';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { ShareButton } from '../components/ShareButton';
import { TheoryBlock, TheoryText } from '../components/theory/TheoryBlock';
import { CATEGORY, QUESTIONS, THEORY, THEORY_BY_CAT } from '../data';
import { Words } from '../features/brush/Words';
import { fill, topicName, useT } from '../i18n';
import { savedScroll, slug } from '../lib/routes';
import { wordsOf } from '../lib/text';
import { useApp } from '../state/AppState';
import type { CategoryId, TheoryChapter } from '../types';

/** Reading time for a learner: about 90 Norwegian words a minute, with the translation alongside. */
function minutes(ch: TheoryChapter): number {
  const texts = ch.blocks.flatMap(b =>
    'list' in b ? b.list.map(x => x.no)
      : 'signs' in b ? b.signs.map(x => x.no)
        : 'nums' in b ? b.nums.map(x => x.no)
          : 'fig' in b ? [b.no]
            : [Object.values(b)[0] as string]);
  return Math.max(1, Math.round([ch.lead.no, ...texts].reduce((n, t) => n + wordsOf(t).length, 0) / 90));
}

const questionsIn = (cat: CategoryId) => QUESTIONS.filter(q => q.cat === cat).length;

/** "2026-10" → "октябрь 2026" / "жовтень 2026" */
const fmtMonth = (ym: string, locale: string) => new Date(`${ym}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' }).replace(/\s*(г|р)\.?$/, '');

export function TheoryScreen() {
  const { data, go, startExam } = useApp();
  const t = useT();
  const lang = data.prefs.lang;
  const read = THEORY.filter(t => data.read[t.cat]).length;
  const nextUp = THEORY.find(t => !data.read[t.cat]);

  return (
    <div className="theory">
      <div className="page-head">
        <div className="eyebrow">Teori</div>
        <h1>{t.theory.title}</h1>
        <p className="muted">{t.theory.intro}</p>
        <p className="theory-note">{t.theory.note[0]}<a href="https://www.vegvesen.no/forerkort/" target="_blank" rel="noopener noreferrer">{t.theory.note[1]}</a>{t.theory.note[2]}</p>
      </div>

      <div className="theory-progress panel">
        <span className="tnum">{fill(t.theory.readOf(THEORY.length), { n: read })}</span>
        <span className="meter" aria-hidden="true"><i className="g" style={{ width: `${(read / THEORY.length) * 100}%` }} /></span>
      </div>

      <div className="cats chapters" role="group" aria-label={t.theory.chapters}>
        {THEORY.map((ch, i) => {
          const c = CATEGORY[ch.cat];
          const n = questionsIn(ch.cat);
          const done = !!data.read[ch.cat];
          return (
            <button key={ch.cat} className={done ? 'chapter-row done' : 'chapter-row'} onClick={() => go({ name: 'chapter', cat: ch.cat })}>
              <span className="ic"><CategoryIcon id={ch.cat} /></span>
              <span className="nm"><span className="sr-only">{t.theory.chapterSr(i + 1)}</span><span data-block lang="nb"><Words text={c.no} /></span><small>{topicName(c, lang)}</small></span>
              <span className="ch-meta tnum">
                {done ? <span className="ch-done"><Icon name="check" />{t.theory.readMark}</span> : <span>{t.theory.minutes(minutes(ch))}</span>}
                <span>{t.questions(n)}</span>
              </span>
              <span className="chev" aria-hidden="true"><Icon name="right" /></span>
            </button>
          );
        })}
      </div>

      <ActionBar>
        <button className="btn square" onClick={() => go({ name: 'home' })} aria-label={t.toHome}><Icon name="left" /></button>
        {nextUp
          ? <button className="btn primary grow" onClick={() => go({ name: 'chapter', cat: nextUp.cat })}>{read ? t.theory.continue : t.theory.startFirst}<Icon name="right" /></button>
          : <button className="btn primary grow" onClick={startExam}>{t.theory.allRead}<Icon name="right" /></button>}
      </ActionBar>
    </div>
  );
}

export function ChapterScreen({ cat }: { cat: CategoryId }) {
  const { data, update, go, mark, restored, screen } = useApp();
  const t = useT();
  const ch = THEORY_BY_CAT[cat];
  const c = CATEGORY[cat];
  const at = THEORY.findIndex(t => t.cat === cat);
  const next = THEORY[at + 1];
  const show = { mode: data.prefs.theoryLang, lang: data.prefs.lang };
  const topic = topicName(c, data.prefs.lang);
  const n = questionsIn(cat);
  const isRead = !!data.read[cat];
  const end = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLElement>(null);
  const section = screen.name === 'chapter' ? screen.section : undefined;

  // every heading has an address: #/theory/<topic>/<heading>
  const sections = useMemo(() => {
    const seen = new Set<string>();
    return (ch?.blocks ?? []).map(b => {
      if (!('h' in b)) return undefined;
      let s = slug(b.h);
      for (let k = 2; seen.has(s); k++) s = `${slug(b.h)}-${k}`;
      seen.add(s);
      return s;
    });
  }, [ch]);

  // a shared link (or a reload without a saved position) opens the chapter at its section
  useLayoutEffect(() => {
    if (restored && section && savedScroll(location.hash) === undefined) {
      document.querySelector(`.chapter-body [data-section="${CSS.escape(section)}"]`)?.scrollIntoView({ block: 'start' });
    }
  }, []); // only when the chapter opens

  // a thin bar under the toolbar shows how far the chapter has been read, and the address follows the heading in view
  const shown = useRef(section);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.current?.style.setProperty('transform', `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 1})`);
      const line = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 60) + 90;
      let now: string | undefined;
      for (const h of document.querySelectorAll<HTMLElement>('.chapter-body [data-section]')) {
        if (h.getBoundingClientRect().top > line) break;
        now = h.dataset.section;
      }
      if (now !== shown.current) { shown.current = now; mark({ name: 'chapter', cat, section: now }); }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [cat, mark]);

  // the chapter counts as read once its end has been scrolled into view
  useEffect(() => {
    const el = end.current;
    if (!el || isRead) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      update(d => (d.read[cat] ? d : { ...d, read: { ...d.read, [cat]: Date.now() } }));
    });
    io.observe(el);
    return () => io.disconnect();
  }, [cat, isRead, update]);

  if (!ch) return null;

  return (
    <article className="chapter">
      <div className="read-progress" aria-hidden="true"><i ref={progress} /></div>
      <header className="chapter-head">
        <div className="eyebrow tnum">{t.theory.chapterOf(at + 1, THEORY.length, minutes(ch))}</div>
        <div className="chapter-title">
          <span className="ic"><CategoryIcon id={cat} /></span>
          <div>
            <h1 data-block lang="nb"><Words text={c.no} /></h1>
            <p className="chapter-ru">{topic}</p>
          </div>
        </div>
        <div className="t-p lead"><TheoryText t={ch.lead} show={show} /></div>
        <Segmented label={t.theory.textLang} value={show.mode}
          onChange={v => update(d => ({ ...d, prefs: { ...d.prefs, theoryLang: v } }))}
          options={[{ value: 'both', label: t.theory.both }, { value: 'nb', label: 'Norsk' }, { value: 'tr', label: t.langName }]} />
      </header>

      <div className="chapter-body">
        {ch.blocks.map((b, i) => <TheoryBlock key={i} b={b} show={show} section={sections[i]} />)}
      </div>

      {!!ch.sources?.length && (
        <section className="sources" aria-labelledby="sources-title">
          <h2 id="sources-title">{t.theory.sources}{ch.checked && <small className="tnum">{t.theory.checked(fmtMonth(ch.checked, t.locale))}</small>}</h2>
          <ul>
            {ch.sources.map(([title, url]) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{title}</a></li>)}
          </ul>
        </section>
      )}

      <div className="chapter-end" ref={end}>
        {isRead && <p className="ch-done"><Icon name="check" />{t.theory.chapterRead}</p>}
        {next ? (
          <button className="next-chapter" onClick={() => go({ name: 'chapter', cat: next.cat })}>
            <span className="eyebrow">{t.theory.next}</span>
            <span className="nm"><span className="sr-only">: </span><span data-block lang="nb"><Words text={CATEGORY[next.cat].no} /></span><small>{topicName(CATEGORY[next.cat], data.prefs.lang)}</small></span>
            <Icon name="right" />
          </button>
        ) : (
          <button className="next-chapter" onClick={() => go({ name: 'theory' })}>
            <span className="eyebrow">{t.theory.last}</span>
            <span className="nm">{t.theory.allChapters}<small>{t.theory.allChaptersSub}</small></span>
            <Icon name="right" />
          </button>
        )}
      </div>

      <ActionBar>
        <button className="btn square" onClick={() => go({ name: 'theory' })} aria-label={t.theory.allChapters}><Icon name="left" /></button>
        <ShareButton className="btn square" to={{ name: 'chapter', cat, section }} title={`${c.no} — ${topic}`}
          label={section ? t.theory.shareSection : t.theory.shareChapter} />
        <button className="btn primary grow" onClick={() => go({ name: 'practice', mode: cat })}>
          <Icon name="play" />{t.theory.train}<span className="wide-only">{t.theory.trainWide}</span><span className="btn-sub tnum">{n}</span>
        </button>
      </ActionBar>
    </article>
  );
}
