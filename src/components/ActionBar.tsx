import type { ReactNode } from 'react';

/** Navigation buttons pinned to the bottom of the screen, within thumb reach on phones. */
export function ActionBar({ children, label = 'Действия' }: { children: ReactNode; label?: string }) {
  return (
    <div className="actionbar" role="group" aria-label={label}>
      <div className="actionbar-inner">{children}</div>
    </div>
  );
}
