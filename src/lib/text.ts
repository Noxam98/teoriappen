/** A Norwegian word: letters (incl. æ, ø, å, é …), hyphenated compounds stay one word. */
export const WORD_RE = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*/g;

export interface Segment {
  text: string;
  word: boolean;
}

export function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i), word: false });
    out.push({ text: m[0], word: true });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), word: false });
  return out;
}

export const wordsOf = (text: string): string[] => text.match(WORD_RE) ?? [];

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Russian plural: plural(5, 'ошибка', 'ошибки', 'ошибок') → 'ошибок' */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

export function shuffle<T>(list: readonly T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
