import { BASE_LANG, LANGS } from '../i18n/langs';
import type { AppData } from '../types';

const KEY = 'teoriprove-b-v1';

export const EMPTY: AppData = {
  stats: {},
  exams: [],
  vocab: [],
  cur: null,
  last: null,
  practice: null,
  read: {},
  prefs: { reveal: 'instant', haptics: true, sound: true, volume: 1, size: 1, ru: false, theoryLang: 'both', lang: BASE_LANG, langChosen: false, seenBrushHint: false },
};

/** Progress lives in this browser only (localStorage); everything still works if storage is blocked. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const saved = JSON.parse(raw) as Partial<AppData>;
    const prefs = { ...EMPTY.prefs, ...saved.prefs };
    // earlier versions had only an on/off switch for the Russian under the theory text
    const old = saved.prefs as { theoryRu?: boolean; theoryLang?: string } | undefined;
    if (old?.theoryRu === false && !old.theoryLang) prefs.theoryLang = 'nb';
    if (old?.theoryLang === 'ru') prefs.theoryLang = 'tr';
    // a language this version does not have (yet): ask again
    if (!LANGS.includes(prefs.lang)) Object.assign(prefs, { lang: BASE_LANG, langChosen: false });
    return { ...EMPTY, ...saved, prefs };
  } catch {
    return EMPTY;
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // private mode or blocked storage: keep working without saving
  }
}
