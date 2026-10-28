import { useEffect, type RefObject } from 'react';

/**
 * Lets the user drag a bottom sheet down by its grip to close it (the close button and Esc still work).
 * Only on phones, where sheets are anchored to the bottom.
 */
export function useSwipeDown(sheet: RefObject<HTMLElement | null>, grip: RefObject<HTMLElement | null>, onClose: () => void): void {
  useEffect(() => {
    const el = sheet.current, handle = grip.current;
    if (!el || !handle) return;
    let start: { y: number; t: number; id: number } | null = null;
    let dy = 0;

    const down = (e: PointerEvent) => {
      if (!matchMedia('(max-width: 639px)').matches || e.button > 0) return;
      start = { y: e.clientY, t: performance.now(), id: e.pointerId };
      dy = 0;
      handle.setPointerCapture(e.pointerId);
      el.style.transition = 'none';
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      dy = Math.max(0, e.clientY - start.y);
      el.style.transform = `translateY(${dy}px)`;
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const speed = dy / Math.max(1, performance.now() - start.t);
      start = null;
      el.style.transition = 'transform .2s ease-out';
      if (dy > 110 || (dy > 30 && speed > 0.6)) {
        el.style.transform = 'translateY(100%)';
        setTimeout(onClose, 160);
      } else el.style.transform = '';
    };

    handle.addEventListener('pointerdown', down);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
    return () => {
      handle.removeEventListener('pointerdown', down);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
  }, [sheet, grip, onClose]);
}
