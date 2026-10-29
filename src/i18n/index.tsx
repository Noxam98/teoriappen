import { Fragment, type ReactNode } from 'react';
import { useApp } from '../state/AppState';
import type { Category } from '../data/categories';
import type { Lang, Question, Translated } from '../types';
import { BASE_LANG, MESSAGES } from './langs';
import type { Messages } from './ru';

export { BASE_LANG, LANGS, MESSAGES } from './langs';

let current: Lang = BASE_LANG;

/** For code outside React (screen-reader announcements, the Claude prompt). */
export const messages = (): Messages => MESSAGES[current];
export const currentLang = (): Lang => current;

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
}

export function useT(): Messages {
  return MESSAGES[useApp().data.prefs.lang];
}

export const useLang = (): Lang => useApp().data.prefs.lang;

/** "до {n} ошибок" with the value in bold. */
export function fill(text: string, values: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return key && key in values ? <b key={i}>{values[key]}</b> : <Fragment key={i}>{part}</Fragment>;
  });
}

/** A rich text: every second part is bold. */
export const rich = (parts: string[]): ReactNode => parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : <Fragment key={i}>{p}</Fragment>));

/** The text in the reader's language, or the base translation while that one is missing. */
export const tr = (t: Translated, lang: Lang): string => t[lang] || t[BASE_LANG];

export const topicName = (c: Category, lang: Lang): string => c[lang];
export const explanation = (q: Question, lang: Lang): string => tr(q, lang);
