import { THEORY_BY_CAT } from '../data';
import type { CategoryId, Question, TheoryBlock, TheoryChapter } from '../types';
import { slug } from './routes';

/** The address of each heading of a chapter (undefined for other blocks), numbered when a heading repeats. */
export function sectionIds(ch: TheoryChapter): (string | undefined)[] {
  const seen = new Set<string>();
  return ch.blocks.map(b => {
    if (!('h' in b)) return undefined;
    let s = slug(b.h);
    for (let k = 2; seen.has(s); k++) s = `${slug(b.h)}-${k}`;
    seen.add(s);
    return s;
  });
}

export interface Section {
  cat: CategoryId;
  chapter: TheoryChapter;
  /** The heading's address; none when the question names no section: then the chapter itself. */
  id?: string;
  /** The heading and what follows it, up to the next heading. */
  blocks: TheoryBlock[];
}

/** The theory a question is explained in: the section it links to ("<topic>/<section>"), else its topic's chapter. */
export function theoryOf(q: Question): Section | null {
  const [topic, id] = (q.theory ?? '').split('/') as [CategoryId, string | undefined];
  const linked = topic && THEORY_BY_CAT[topic];
  const chapter = linked || THEORY_BY_CAT[q.cat];
  if (!chapter) return null;
  const ids = sectionIds(chapter);
  const at = linked && id ? ids.indexOf(id) : -1;
  if (at < 0) return { cat: chapter.cat, chapter, blocks: [] };
  const end = ids.findIndex((s, i) => i > at && s !== undefined);
  return { cat: chapter.cat, chapter, id, blocks: chapter.blocks.slice(at, end < 0 ? undefined : end) };
}
