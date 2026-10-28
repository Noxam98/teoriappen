import type { ReactNode } from 'react';

/** Navigation buttons pinned to the bottom of the screen, within thumb reach on phones. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="actionbar">
      <div className="actionbar-inner">{children}</div>
    </div>
  );
}
