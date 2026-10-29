import type { AppData } from '../types';

const KEY = 'teoriprove-b-v1';

export const EMPTY: AppData = {
  stats: {},
  exams: [],
  vocab: [],
  cur: null,
  last: null,
  prefs: { reveal: 'instant', haptics: true, sound: true, volume: 1, size: 1, ru: false, seenBrushHint: false },
};

/** Progress lives in this browser only (localStorage); everything still works if storage is blocked. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const saved = JSON.parse(raw) as Partial<AppData>;
    return { ...EMPTY, ...saved, prefs: { ...EMPTY.prefs, ...saved.prefs } };
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
