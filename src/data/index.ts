import type { CategoryId, DictEntry, Question, TheoryChapter } from '../types';
import { CATEGORIES } from './categories';
import words from './dictionary/words.json';
import phrases from './dictionary/phrases.json';

// Every file in ./questions is one topic; add a new JSON file there and it is picked up automatically.
const files = import.meta.glob<Question[]>('./questions/*.json', { eager: true, import: 'default' });

export const QUESTIONS: Question[] = Object.values(files).flat();
export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

// One theory chapter per topic (./theory/<topic>.json), in the order of the topics.
const chapters = import.meta.glob<TheoryChapter>('./theory/*.json', { eager: true, import: 'default' });
const byCat = Object.fromEntries(Object.values(chapters).map(c => [c.cat, c])) as Partial<Record<CategoryId, TheoryChapter>>;
export const THEORY: TheoryChapter[] = CATEGORIES.flatMap(c => byCat[c.id] ?? []);
export const THEORY_BY_CAT = byCat;

export const DICTIONARY = {
  words: words as unknown as Record<string, DictEntry>,
  phrases: phrases as Record<string, string>,
};

export { CATEGORIES, CATEGORY } from './categories';
