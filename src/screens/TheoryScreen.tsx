import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ActionBar } from '../components/ActionBar';
import { CategoryIcon } from '../components/CategoryIcon';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { ShareButton } from '../components/ShareButton';
import { TheoryBlock, TheoryText } from '../components/theory/TheoryBlock';
import { CATEGORY, QUESTIONS, THEORY, THEORY_BY_CAT } from '../data';
import { Words } from '../features/brush/Words';
import { savedScroll, slug } from '../lib/routes';
import { plural, wordsOf } from '../lib/text';
import { useApp } from '../state/AppState';
import type { CategoryId, TheoryChapter } from '../types';

/** Reading time for a learner: about 90 Norwegian words a minute, with the translation alongside. */
function minutes(ch: TheoryChapter): number {
  const texts = ch.blocks.flatMap(b =>
    'list' in b ? b.list.map(([no]) => no)
      : 'signs' in b ? b.signs.map(([, no]) => no)
        : 'nums' in b ? b.nums.map(([, no]) => no)
          : 'fig' in b ? [b.no]
            : [Object.values(b)[0] as string]);
  return Math.max(1, Math.round([ch.lead, ...texts].reduce((n, t) => n + wordsOf(t).length, 0) / 90));
}

const questionsIn = (cat: CategoryId) => QUESTIONS.filter(q => q.cat === cat).length;

/** "2026-10" → "октябрь 2026" */
const fmtMonth = (ym: string) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(/\s*г\.?$/, '');

export function TheoryScreen() {
  const { data, go, startExam } = useApp();
  const read = THEORY.filter(t => data.read[t.cat]).length;
  const nextUp = THEORY.find(t => !data.read[t.cat]);

  return (
    <div className="theory">
      <div className="page-head">
        <div className="eyebrow">Teori</div>
        <h1>Теория</h1>
        <p className="muted">Главное из правил по каждой теме экзамена. Текст на норвежском с переводом под каждым абзацем, а любое слово можно перевести кнопкой «Перевод». Если удобнее, главу можно читать только по-русски или только по-норвежски.</p>
        <p className="theory-note">Главы сверены с законами и правилами на Lovdata и с официальными страницами Statens vegvesen, Helsedirektoratet и Trygg Trafikk; ссылки — в конце каждой главы. Правила иногда меняются: перед экзаменом сверяйтесь с <a href="https://www.vegvesen.no/forerkort/" target="_blank" rel="noopener noreferrer">vegvesen.no</a>.</p>
      </div>

      <div className="theory-progress panel">
        <span className="tnum">Прочитано <b>{read}</b> из {THEORY.length} {plural(THEORY.length, 'главы', 'глав', 'глав')}</span>
        <span className="meter" aria-hidden="true"><i className="g" style={{ width: `${(read / THEORY.length) * 100}%` }} /></span>
      </div>

      <div className="cats chapters" role="group" aria-label="Главы">
        {THEORY.map((t, i) => {
          const c = CATEGORY[t.cat];
          const n = questionsIn(t.cat);
          const done = !!data.read[t.cat];
          return (
            <button key={t.cat} className={done ? 'chapter-row done' : 'chapter-row'} onClick={() => go({ name: 'chapter', cat: t.cat })}>
              <span className="ic"><CategoryIcon id={t.cat} /></span>
              <span className="nm"><span className="sr-only">Глава {i + 1}: </span><span data-block lang="nb"><Words text={c.no} /></span><small>{c.ru}</small></span>
              <span className="ch-meta tnum">
                {done ? <span className="ch-done"><Icon name="check" />прочитано</span> : <span>{minutes(t)} мин</span>}
                <span>{n} {plural(n, 'вопрос', 'вопроса', 'вопросов')}</span>
              </span>
              <span className="chev" aria-hidden="true"><Icon name="right" /></span>
            </button>
          );
        })}
      </div>

      <ActionBar>
        <button className="btn square" onClick={() => go({ name: 'home' })} aria-label="На главную"><Icon name="left" /></button>
        {nextUp
          ? <button className="btn primary grow" onClick={() => go({ name: 'chapter', cat: nextUp.cat })}>{read ? 'Продолжить чтение' : 'Начать с первой главы'}<Icon name="right" /></button>
          : <button className="btn primary grow" onClick={startExam}>Всё прочитано — на экзамен<Icon name="right" /></button>}
      </ActionBar>
    </div>
  );
}

export function ChapterScreen({ cat }: { cat: CategoryId }) {
  const { data, update, go, mark, restored, screen } = useApp();
  const ch = THEORY_BY_CAT[cat];
  const c = CATEGORY[cat];
  const at = THEORY.findIndex(t => t.cat === cat);
  const next = THEORY[at + 1];
  const lang = data.prefs.theoryLang;
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
        <div className="eyebrow tnum">Глава {at + 1} из {THEORY.length} · {minutes(ch)} мин</div>
        <div className="chapter-title">
          <span className="ic"><CategoryIcon id={cat} /></span>
          <div>
            <h1 data-block lang="nb"><Words text={c.no} /></h1>
            <p className="chapter-ru">{c.ru}</p>
          </div>
        </div>
        <div className="t-p lead"><TheoryText no={ch.lead} ru={ch.leadRu} lang={lang} /></div>
        <Segmented label="Язык текста" value={lang}
          onChange={v => update(d => ({ ...d, prefs: { ...d.prefs, theoryLang: v } }))}
          options={[{ value: 'both', label: 'Оба языка' }, { value: 'nb', label: 'Norsk' }, { value: 'ru', label: 'Русский' }]} />
      </header>

      <div className="chapter-body">
        {ch.blocks.map((b, i) => <TheoryBlock key={i} b={b} lang={lang} section={sections[i]} />)}
      </div>

      {!!ch.sources?.length && (
        <section className="sources" aria-labelledby="sources-title">
          <h2 id="sources-title">Источники{ch.checked && <small className="tnum"> · проверено {fmtMonth(ch.checked)}</small>}</h2>
          <ul>
            {ch.sources.map(([title, url]) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{title}</a></li>)}
          </ul>
        </section>
      )}

      <div className="chapter-end" ref={end}>
        {isRead && <p className="ch-done"><Icon name="check" />Глава прочитана</p>}
        {next ? (
          <button className="next-chapter" onClick={() => go({ name: 'chapter', cat: next.cat })}>
            <span className="eyebrow">Следующая глава</span>
            <span className="nm"><span className="sr-only">: </span><span data-block lang="nb"><Words text={CATEGORY[next.cat].no} /></span><small>{CATEGORY[next.cat].ru}</small></span>
            <Icon name="right" />
          </button>
        ) : (
          <button className="next-chapter" onClick={() => go({ name: 'theory' })}>
            <span className="eyebrow">Это последняя глава</span>
            <span className="nm">Все главы<small>оглавление и прогресс чтения</small></span>
            <Icon name="right" />
          </button>
        )}
      </div>

      <ActionBar>
        <button className="btn square" onClick={() => go({ name: 'theory' })} aria-label="Все главы"><Icon name="left" /></button>
        <ShareButton className="btn square" to={{ name: 'chapter', cat, section }} title={`${c.no} — ${c.ru}`}
          label={section ? 'Поделиться ссылкой на этот раздел' : 'Поделиться ссылкой на главу'} />
        <button className="btn primary grow" onClick={() => go({ name: 'practice', mode: cat })}>
          <Icon name="play" />Тренировать<span className="wide-only"> тему</span><span className="btn-sub tnum">{n}</span>
        </button>
      </ActionBar>
    </article>
  );
}
