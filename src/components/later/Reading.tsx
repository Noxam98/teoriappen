import { useEffect, useRef, useState } from 'react';
import { CATEGORY, QUESTION_BY_ID } from '../../data';
import { Words } from '../../features/brush/Words';
import { topicName, tr, useT } from '../../i18n';
import { theoryOf } from '../../lib/theory';
import { useApp } from '../../state/AppState';
import type { Lang, Question, ReadLater } from '../../types';
import { Icon } from '../Icons';
import { Explanation } from '../question/Explanation';
import { QuestionBody } from '../question/QuestionCard';
import { Sheet } from '../Sheet';
import { TheoryBlock, TheoryText } from '../theory/TheoryBlock';

/** The questions of one test someone wanted to read about (unknown ids — removed questions — are left out). */
export const laterOf = (later: ReadLater[], test: number | undefined) =>
  test === undefined ? [] : later.filter(x => x.test === test && QUESTION_BY_ID[x.id]);

/** "Section title" in the reader's language, or the topic's name when the question links to a whole chapter. */
function theoryTitle(q: Question, lang: Lang): string {
  const s = theoryOf(q);
  if (!s) return topicName(CATEGORY[q.cat], lang);
  const h = s.blocks[0];
  return h && 'h' in h ? tr(h, lang) : topicName(CATEGORY[s.cat], lang);
}

/** The list: each question with the theory it leads to; read ones are ticked. */
export function ReadingList({ items, onOpen }: { items: ReadLater[]; onOpen: (id: string) => void }) {
  const { data } = useApp();
  const t = useT().later;
  return (
    <ol className="later-list">
      {items.map(x => {
        const q = QUESTION_BY_ID[x.id];
        return (
          <li key={x.id}>
            <button className={x.read ? 'later-item read' : 'later-item'} onClick={() => onOpen(x.id)}>
              <span className="later-ic" aria-hidden="true"><Icon name={x.read ? 'check' : 'theory'} /></span>
              <span className="later-text">
                <span className="later-q" data-block lang="nb"><Words text={q.q} /></span>
                <small>{theoryTitle(q, data.prefs.lang)}{x.read && <> · {t.read}</>}</small>
              </span>
              <span className="later-go" aria-hidden="true"><Icon name="right" /></span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** One question to read about: the question with its answer and explanation, then the theory section about it. */
function Reader({ q }: { q: Question }) {
  const { data, go } = useApp();
  const t = useT().later;
  const s = theoryOf(q);
  const show = { mode: data.prefs.theoryLang, lang: data.prefs.lang };
  const c = CATEGORY[q.cat];
  return (
    <div className="reader">
      <div className="eyebrow">{c.no} · {topicName(c, data.prefs.lang)}</div>
      <QuestionBody q={q} />
      <div className="ans ok"><Icon name="check" /><span className="sr-only">{t.rightAnswer}: </span><span data-block lang="nb"><Words text={q.a[0]} /></span></div>
      <Explanation q={q} />
      {s && (
        <section className="reader-theory" aria-label={t.theory}>
          <div className="t-box-label"><Icon name="theory" />{t.theory}</div>
          {s.blocks.length
            ? s.blocks.map((b, i) => <TheoryBlock key={i} b={b} show={show} />)
            : <><p className="setting-note">{t.noSection}</p><div className="t-p"><TheoryText t={s.chapter.lead} show={show} /></div></>}
          <button className="btn" onClick={() => go({ name: 'chapter', cat: s.cat, section: s.id })}>
            <Icon name="theory" />{t.openChapter}
          </button>
        </section>
      )}
    </div>
  );
}

/**
 * The reading list of a test in a sheet over the screen, so the list is still there after each question:
 * the list, or one question (`start`) with «To the list» and «Next». Opening a question ticks it as read.
 */
export function ReadingSheet({ items, start, onClose }: { items: ReadLater[]; start: string | null; onClose: () => void }) {
  const { markRead } = useApp();
  const t = useT().later;
  const [at, setAt] = useState(start);
  const box = useRef<HTMLDivElement>(null);
  const i = at ? items.findIndex(x => x.id === at) : -1;
  const item = items[i];

  useEffect(() => {
    if (item && !item.read) markRead(item.id, item.test);
    box.current?.closest('.sheet')?.scrollTo({ top: 0 });
  }, [item?.id]);

  const next = items[i + 1];
  const actions = item
    ? <>
        {items.length > 1 && <button className="btn" onClick={() => setAt(null)}>{t.toList}</button>}
        {next
          ? <button className="btn primary" data-autofocus onClick={() => setAt(next.id)}>{t.next}<Icon name="right" /></button>
          : <button className="btn primary" data-autofocus onClick={onClose}>{t.done}</button>}
      </>
    : <button className="btn primary" onClick={onClose}>{t.done}</button>;

  return (
    <Sheet title={item ? `${t.sheet} · ${t.item(i + 1, items.length)}` : `${t.sheet} · ${items.length}`} onClose={onClose} actions={actions}>
      <div ref={box}>
        {item ? <Reader key={item.id} q={QUESTION_BY_ID[item.id]} /> : <ReadingList items={items} onOpen={setAt} />}
      </div>
    </Sheet>
  );
}
