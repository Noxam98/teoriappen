// Feedback after an answer: a short vibration (Android; iOS ignores it) and a screen-reader announcement.

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
