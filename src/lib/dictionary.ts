import { DICTIONARY } from '../data';
import type { DictEntry } from '../types';

export type Lookup =
  | { kind: 'entry'; entry: DictEntry; approx: boolean }
  | { kind: 'compound'; parts: [string, DictEntry][] }
  | null;

const ENDINGS = ['ene', 'ane', 'er', 'en', 'et', 'te', 'de', 'a', 'e', 's', 't'];

/** Finds a word in the built-in Norwegian → Russian dictionary, with simple fallbacks for unknown forms. */
export function lookup(word: string): Lookup {
  const w = word.toLowerCase();
  const { words } = DICTIONARY;
  if (words[w]) return { kind: 'entry', entry: words[w], approx: false };
  for (const end of ENDINGS) {
    const stem = w.slice(0, -end.length);
    if (w.endsWith(end) && stem.length >= 3 && words[stem]) return { kind: 'entry', entry: words[stem], approx: true };
  }
  // compound word: "fartsgrense" → "fart" (+ binding s) + "grense"
  for (let i = w.length - 3; i >= 3; i--) {
    const head = w.slice(0, i);
    if (!words[head]) continue;
    const tail = words[w.slice(i)] ? w.slice(i) : w[i] === 's' && words[w.slice(i + 1)] ? w.slice(i + 1) : null;
    if (tail) return { kind: 'compound', parts: [[head, words[head]], [tail, words[tail]]] };
  }
  return null;
}

/** Short Russian gloss for one word (first variant only). */
export function gloss(word: string): string {
  const r = lookup(word);
  if (!r) return '—';
  if (r.kind === 'entry') return r.entry[1];
  return r.parts.map(([, e]) => firstVariant(e[1])).join(' + ');
}

export const firstVariant = (tr: string) => tr.split(';')[0].trim();

/** Fixed expressions found inside a sequence of words, longest match first. */
export function phrasesIn(words: string[]): [string, string][] {
  const low = words.map(w => w.toLowerCase());
  const found: [string, string][] = [];
  for (let i = 0; i < low.length; i++) {
    for (let j = low.length; j > i + 1; j--) {
      const key = low.slice(i, j).join(' ');
      if (DICTIONARY.phrases[key]) {
        found.push([key, DICTIONARY.phrases[key]]);
        i = j - 1;
        break;
      }
    }
  }
  return found;
}
