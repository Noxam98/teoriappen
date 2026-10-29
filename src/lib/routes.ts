import { CATEGORY, QUESTION_BY_ID, THEORY_BY_CAT } from '../data';
import type { CategoryId, PracticeMode, Screen } from '../types';

// The current screen lives in the address after "#", so a reload, the browser's back button and a shared link
// all open the same place. A hash works everywhere: on the website, in the offline file and without server setup.
//   #/                                  home
//   #/theory  #/theory/<topic>[/<section>]
//   #/practice/<topic|all|wrong>[/<question id>]
//   #/questions/<id,id,…>[/<question id>]   a hand-picked list, e.g. the mistakes of one exam
//   #/exam  #/result  #/vocab  #/vocab/cards  #/history

export function toHash(s: Screen): string {
  switch (s.name) {
    case 'home': return '#/';
    case 'exam': return '#/exam';
    case 'result': return '#/result';
    case 'vocab': return '#/vocab';
    case 'flashcards': return '#/vocab/cards';
    case 'history': return '#/history';
    case 'theory': return '#/theory';
    case 'chapter': return `#/theory/${s.cat}${s.section ? `/${s.section}` : ''}`;
    case 'practice': {
      const at = s.q ? `/${s.q}` : '';
      return s.mode === 'list' ? `#/questions/${(s.ids ?? []).join(',')}${at}` : `#/practice/${s.mode}${at}`;
    }
  }
}

const isTopic = (x: string | undefined): x is CategoryId => !!x && x in CATEGORY;

/** The screen for an address; anything unknown opens the home screen. */
export function fromHash(hash: string): Screen {
  let path: string;
  try { path = decodeURIComponent(hash); } catch { path = hash; }
  const [page, a, b] = path.replace(/^#\/?/, '').split('/');
  switch (page) {
    case 'exam': return { name: 'exam' };
    case 'result': return { name: 'result' };
    case 'history': return { name: 'history' };
    case 'vocab': return a === 'cards' ? { name: 'flashcards' } : { name: 'vocab' };
    case 'theory': return isTopic(a) && THEORY_BY_CAT[a] ? { name: 'chapter', cat: a, section: b || undefined } : { name: 'theory' };
    case 'practice': {
      if (!(a === 'all' || a === 'wrong' || isTopic(a))) break;
      return { name: 'practice', mode: a as PracticeMode, q: b && QUESTION_BY_ID[b] ? b : undefined };
    }
    case 'questions': {
      const ids = (a ?? '').split(',').filter(id => QUESTION_BY_ID[id]);
      if (!ids.length) break;
      return { name: 'practice', mode: 'list', ids, q: b && ids.includes(b) ? b : undefined };
    }
  }
  return { name: 'home' };
}

/** "Høyreregelen" → "hoyreregelen": the address of a section of a theory chapter. */
export function slug(text: string): string {
  return text.toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Writes the address without reloading; a sandboxed frame that refuses the History API still gets the hash. */
export function setAddress(hash: string, push: boolean): void {
  if (!push && location.hash === hash) return;
  try {
    if (push) history.pushState(null, '', hash);
    else history.replaceState(history.state, '', hash);
  } catch {
    try { if (push) location.hash = hash; else location.replace(hash); } catch { /* no address bar to update */ }
  }
}

// Scroll positions per address, for this tab only: a reload or the back button returns to the same spot.
const SCROLL_KEY = 'teoriprove-scroll';
let positions: Record<string, number> | null = null;

function loadPositions(): Record<string, number> {
  if (!positions) {
    try { positions = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? '{}') as Record<string, number>; } catch { positions = {}; }
  }
  return positions;
}

export function rememberScroll(hash: string, y: number): void {
  const p = loadPositions();
  p[hash || '#/'] = Math.round(y);
  try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(p)); } catch { /* keep it in memory */ }
}

export const savedScroll = (hash: string): number | undefined => loadPositions()[hash || '#/'];

/** A link to a screen that works for someone else: only from the website itself, not from a file or an embedded copy. */
export function shareableLink(s: Screen): string | null {
  if (!location.protocol.startsWith('http') || window.top !== window) return null;
  return location.href.split('#')[0] + toHash(s);
}
