import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ title, children, actions, onClose }: { title: string; children?: ReactNode; actions: ReactNode; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusable = box.current?.querySelector<HTMLElement>('[data-autofocus]') ?? box.current?.querySelector('button');
    focusable?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);

  return createPortal(
    <div className="modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox" role="dialog" aria-modal="true" aria-label={title} ref={box}>
        <h3>{title}</h3>
        {children}
        <div className="row">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
