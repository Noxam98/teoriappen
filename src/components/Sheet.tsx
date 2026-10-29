import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSwipeDown } from '../hooks/useSwipeDown';
import { useT } from '../i18n';

interface Props {
  title: string;
  children?: ReactNode;
  /** Buttons at the bottom of the sheet. */
  actions?: ReactNode;
  onClose: () => void;
  /** The sheet's language, when it differs from the app's (the first-start language dialog). */
  lang?: string;
  closeLabel?: string;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A modal bottom sheet on phones (drag the grip down, tap outside, press Esc or ✕ to close),
 * a centred dialog on wider screens. Focus stays inside while open and returns to the trigger afterwards.
 */
export function Sheet({ title, children, actions, onClose, lang, closeLabel }: Props) {
  const titleId = useId();
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const grip = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useCallback(() => closeRef.current(), []);
  useSwipeDown(box, grip, close);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    // a value, not "": the picture viewer opened over a sheet puts back what it found when it closes
    root?.setAttribute('inert', 'true');
    document.body.classList.add('sheet-open');
    const target = box.current?.querySelector<HTMLElement>('[data-autofocus]') ?? box.current;
    target?.focus({ preventScroll: true });

    const key = (e: KeyboardEvent) => {
      // a picture opened full screen from the sheet takes the keys (Esc closes the picture, not the sheet)
      if (document.body.classList.contains('viewer-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      root?.removeAttribute('inert');
      document.body.classList.remove('sheet-open');
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={box} tabIndex={-1} lang={lang}>
        <div className="sheet-grip" ref={grip} aria-hidden="true"><span /></div>
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label={closeLabel ?? t.close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {actions && <div className="sheet-actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
