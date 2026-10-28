import type { DictEntry, Question } from '../types';
import words from './dictionary/words.json';
import phrases from './dictionary/phrases.json';

// Every file in ./questions is one topic; add a new JSON file there and it is picked up automatically.
const files = import.meta.glob<Question[]>('./questions/*.json', { eager: true, import: 'default' });

export const QUESTIONS: Question[] = Object.values(files).flat();
export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

export const DICTIONARY = {
  words: words as unknown as Record<string, DictEntry>,
  phrases: phrases as Record<string, string>,
};

export { CATEGORIES, CATEGORY } from './categories';
