import type { Lang } from '../types';
import { ru, type Messages } from './ru';
import { uk } from './uk';

// The language of everything that is not Norwegian: buttons, explanations, theory and word translations.
// Every language registered here is offered in the first-start dialog and in the settings, in this order.
export const MESSAGES: Record<Lang, Messages> = { ru, uk };
export const LANGS = Object.keys(MESSAGES) as Lang[];
/** The translation every text has; others fall back to it while a translation is missing. */
export const BASE_LANG = 'ru' satisfies Lang;
