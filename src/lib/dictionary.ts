import { DICTIONARY } from '../data';
import { currentLang } from '../i18n';
import type { DictEntry, Lang } from '../types';

export type Lookup =
  | { kind: 'entry'; entry: DictEntry; approx: boolean }
  | { kind: 'compound'; parts: [string, DictEntry][] }
  | null;

const ENDINGS = ['ene', 'ane', 'er', 'en', 'et', 'te', 'de', 'a', 'e', 's', 't'];

/** The entry of an exact word form, with the translation and the grammar note in the reader's language. */
function entry(w: string, lang: Lang): DictEntry | undefined {
  const e = DICTIONARY.words[w];
  if (!e || lang === 'ru') return e;
  const { words, grammar } = DICTIONARY.uk;
  return [e[0], words[w] ?? e[1], e[2] && (grammar[e[2]] ?? e[2])];
}

/** Finds a word in the built-in Norwegian dictionary, with simple fallbacks for unknown forms. */
export function lookup(word: string, lang: Lang = currentLang()): Lookup {
  const w = word.toLowerCase();
  const get = (k: string) => entry(k, lang);
  const exact = get(w);
  if (exact) return { kind: 'entry', entry: exact, approx: false };
  for (const end of ENDINGS) {
    const stem = w.slice(0, -end.length);
    const e = w.endsWith(end) && stem.length >= 3 ? get(stem) : undefined;
    if (e) return { kind: 'entry', entry: e, approx: true };
  }
  // compound word: "fartsgrense" → "fart" (+ binding s) + "grense"
  for (let i = w.length - 3; i >= 3; i--) {
    const head = w.slice(0, i);
    const he = get(head);
    if (!he) continue;
    const tail = get(w.slice(i)) ? w.slice(i) : w[i] === 's' && get(w.slice(i + 1)) ? w.slice(i + 1) : null;
    if (tail) return { kind: 'compound', parts: [[head, he], [tail, get(tail)!]] };
  }
  return null;
}

/** Short gloss for one word (first variant only). */
export function gloss(word: string, lang: Lang = currentLang()): string {
  const r = lookup(word, lang);
  if (!r) return '—';
  if (r.kind === 'entry') return r.entry[1];
  return r.parts.map(([, e]) => firstVariant(e[1])).join(' + ');
}

export const firstVariant = (tr: string) => tr.split(';')[0].trim();

/** Fixed expressions found inside a sequence of words, longest match first. */
export function phrasesIn(words: string[], lang: Lang = currentLang()): [string, string][] {
  const tr = (k: string) => (lang === 'uk' && DICTIONARY.uk.phrases[k]) || DICTIONARY.phrases[k];
  const low = words.map(w => w.toLowerCase());
  const found: [string, string][] = [];
  for (let i = 0; i < low.length; i++) {
    for (let j = low.length; j > i + 1; j--) {
      const key = low.slice(i, j).join(' ');
      if (DICTIONARY.phrases[key]) {
        found.push([key, tr(key)]);
        i = j - 1;
        break;
      }
    }
  }
  return found;
}
