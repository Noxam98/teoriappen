import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  title: string;
  children?: ReactNode;
  /** Buttons at the bottom of the sheet. */
  actions?: ReactNode;
  onClose: () => void;
}

/** A bottom sheet on phones, a centred dialog on wider screens. */
export function Sheet({ title, children, actions, onClose }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const target = box.current?.querySelector<HTMLElement>('[data-autofocus]') ?? box.current;
    target?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', key);
    document.body.classList.add('sheet-open');
    return () => {
      document.removeEventListener('keydown', key);
      document.body.classList.remove('sheet-open');
    };
  }, []);

  return createPortal(
    <div className="modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={box} tabIndex={-1}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Закрыть">
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
