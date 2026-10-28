// "Add to home screen": Chromium fires beforeinstallprompt (captured as early as possible);
// iOS Safari has no prompt, the user installs via Share → "На экран «Домой»".
import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  listeners.forEach(l => l());
});
window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach(l => l()); });

export type InstallState = 'installed' | 'prompt' | 'ios' | 'unavailable';

function detect(): InstallState {
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return 'installed';
  // only a real website can be installed (not a local file or an embedded preview)
  if (!location.protocol.startsWith('http') || window.top !== window) return 'unavailable';
  if (deferred) return 'prompt';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : 'unavailable';
}

export function useInstall(): { state: InstallState; install: () => Promise<void> } {
  const [state, setState] = useState<InstallState>(detect);
  useEffect(() => {
    const update = () => setState(detect());
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);
  return {
    state,
    async install() {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      setState(detect());
    },
  };
}
