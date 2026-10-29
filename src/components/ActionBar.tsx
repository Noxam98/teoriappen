import type { ReactNode } from 'react';
import { useT } from '../i18n';

/** Navigation buttons pinned to the bottom of the screen, within thumb reach on phones. */
export function ActionBar({ children, label }: { children: ReactNode; label?: string }) {
  const t = useT();
  return (
    <div className="actionbar" role="group" aria-label={label ?? t.actions}>
      <div className="actionbar-inner">{children}</div>
    </div>
  );
}
