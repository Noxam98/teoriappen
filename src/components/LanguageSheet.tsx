import { LANGS, MESSAGES } from '../i18n';
import { useApp } from '../state/AppState';
import type { Lang } from '../types';
import { Sheet } from './Sheet';

/**
 * Asked once — on the first start, and once for everyone who used the app before languages could be chosen.
 * Every option speaks its own language, so the reader recognises theirs before anything is translated.
 */
export function LanguageSheet() {
  const { data, update } = useApp();
  const choose = (lang: Lang) => update(d => ({ ...d, prefs: { ...d.prefs, lang, langChosen: true } }));

  return (
    <Sheet title={LANGS.map(l => MESSAGES[l].chooseTitle).join(' · ')} onClose={() => choose(data.prefs.lang)}>
      <div className="choice-list lang-list" role="radiogroup" aria-label={LANGS.map(l => MESSAGES[l].chooseTitle).join(' · ')}>
        {LANGS.map(l => (
          <button key={l} className="choice" role="radio" aria-checked={data.prefs.lang === l} lang={l} onClick={() => choose(l)}
            data-autofocus={data.prefs.lang === l || undefined}>
            <span className="radio" aria-hidden="true" />
            <span><b>{MESSAGES[l].langName}</b><small>{MESSAGES[l].choosePrompt}</small></span>
          </button>
        ))}
      </div>
      <p className="setting-note lang-later">{LANGS.map(l => <span key={l} lang={l}>{MESSAGES[l].chooseLater}</span>)}</p>
    </Sheet>
  );
}
