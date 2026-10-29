// Feedback after an answer: a sound, a short vibration (Android; iOS ignores it) and a screen-reader announcement.
import { messages } from '../i18n';
import { playSound } from './sound';

export const STREAK_STEP = 5;

/** Call when an answer is checked. `streak` = correct answers in a row including this one. */
export function answerFeedback(ok: boolean, streak: number, correctText: string, haptics: boolean): void {
  playSound(!ok ? 'wrong' : streak > 0 && streak % STREAK_STEP === 0 ? 'streak' : 'correct');
  vibrate(ok, haptics);
  const t = messages().question;
  announce(ok ? (streak >= STREAK_STEP && streak % STREAK_STEP === 0 ? t.rightStreak(streak) : t.right) : t.wrongAnswer(correctText));
}

export function vibrate(ok: boolean, enabled: boolean): void {
  if (!enabled || !('vibrate' in navigator)) return;
  try { navigator.vibrate(ok ? 12 : [30, 60, 30]); } catch { /* not allowed here */ }
}

export const canVibrate = () => 'vibrate' in navigator;

let region: HTMLElement | null = null;

/** Reads `text` aloud in screen readers (polite live region). */
export function announce(text: string): void {
  if (!region) {
    region = document.createElement('div');
    region.className = 'sr-only';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('role', 'status');
    document.body.append(region);
  }
  region.textContent = '';
  setTimeout(() => { if (region) region.textContent = text; }, 60);
}
