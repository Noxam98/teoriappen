import { Fragment, type ReactNode } from 'react';
import { useApp } from '../state/AppState';
import type { Category } from '../data/categories';
import type { Lang, Question } from '../types';
import { ru, type Messages } from './ru';
import { uk } from './uk';

// The language of everything that is not Norwegian: buttons, explanations, theory and word translations.
export const MESSAGES: Record<Lang, Messages> = { ru, uk };
export const LANGS: Lang[] = ['ru', 'uk'];

let current: Lang = 'ru';

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

/** The translation in the reader's language; Russian while a Ukrainian one is missing. */
export const pick = (lang: Lang, ru: string, uk?: string): string => (lang === 'uk' && uk) || ru;

export const topicName = (c: Category, lang: Lang): string => c[lang];
export const explanation = (q: Question, lang: Lang): string => pick(lang, q.ru, q.uk);
