import { useEffect, useRef } from 'react';

/** Scrolls just enough that `el` is fully visible between the sticky question header and the bottom buttons. */
function scrollIntoClearView(el: HTMLElement): void {
  const head = document.querySelector('.examhead')?.getBoundingClientRect().bottom
    ?? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 0);
  const foot = Math.min(window.innerHeight, document.querySelector('.actionbar')?.getBoundingClientRect().top ?? window.innerHeight);
  const r = el.getBoundingClientRect();
  const gap = 12;
  if (r.top >= head + gap && r.bottom <= foot - gap) return;
  // fits: bring its bottom above the buttons, so the options stay in view as much as possible; too tall: show its start
  const dy = r.height <= foot - head - 2 * gap ? r.bottom - (foot - gap) : r.top - (head + gap);
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollBy({ top: dy, behavior: smooth ? 'smooth' : 'auto' });
}

/**
 * After «Sjekk» the explanation is scrolled into view, so nobody has to scroll down by hand.
 * Returns the ref for the explanation and the function to call when the answer is handed in.
 */
export function useRevealScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const wanted = useRef(false);
  useEffect(() => {
    if (!wanted.current || !ref.current) return;
    wanted.current = false;
    const el = ref.current;
    const frame = requestAnimationFrame(() => scrollIntoClearView(el));
    return () => cancelAnimationFrame(frame);
  });
  const request = () => { wanted.current = true; };
  return [ref, request] as const;
}
