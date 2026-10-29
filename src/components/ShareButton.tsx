import { shareableLink } from '../lib/routes';
import { useApp } from '../state/AppState';
import type { Screen } from '../types';
import { Icon } from './Icons';

/**
 * Shares a link to a place in the app (the system share sheet on phones, otherwise the link is copied).
 * Hidden where no link would work for someone else: in the offline file or an embedded copy.
 */
export function ShareButton({ to, title, label, className = 'iconbtn' }: { to: Screen; title: string; label: string; className?: string }) {
  const { notify } = useApp();
  const url = shareableLink(to);
  if (!url) return null;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      notify('Ссылка скопирована');
    } catch {
      notify(url);
    }
  };

  return <button className={className} onClick={share} title={label} aria-label={label}><Icon name="share" /></button>;
}
