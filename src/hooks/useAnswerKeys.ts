import { useEffect, useRef } from 'react';

interface Keys {
  /** 1–4 or A–D: pick the option shown at that position */
  pick?: (position: number) => void;
  next?: () => void;
  prev?: () => void;
}

/** Keyboard shortcuts for a question screen. */
export function useAnswerKeys(keys: Keys): void {
  const ref = useRef(keys);
  ref.current = keys;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.modal') || document.body.classList.contains('brush-on') || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as Element;
      if (target.closest?.('input, textarea, .opt')) return;
      const k = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
      if (k >= 0 && e.key.length === 1) ref.current.pick?.(k);
      else if (e.key === 'ArrowRight') ref.current.next?.();
      else if (e.key === 'ArrowLeft') ref.current.prev?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
