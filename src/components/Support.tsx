import { useT } from '../i18n';
import { SUPPORT_URL } from '../lib/support';
import { Icon } from './Icons';

/** «Buy the author a coffee»: opens the Ko-fi page in a new tab (or the browser, from the installed app). */
export function SupportLink({ className = 'btn' }: { className?: string }) {
  const t = useT();
  return (
    <a className={`${className} support-link`} href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
      <Icon name="coffee" />{t.support.button}
    </a>
  );
}

/** The end of the home screen: the coffee card and the note that the app is not an official one. */
export function SupportFooter() {
  const s = useT().support;
  return (
    <footer className="home-foot">
      <section className="support panel">
        <span className="support-ic" aria-hidden="true"><Icon name="coffee" /></span>
        <p><b>{s.title}</b><small>{s.text}</small></p>
        <SupportLink />
      </section>
      <p className="unofficial">{s.unofficial}</p>
    </footer>
  );
}
