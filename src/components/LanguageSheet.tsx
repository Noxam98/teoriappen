import { useState } from 'react';
import { LANGS, MESSAGES } from '../i18n';
import { useApp } from '../state/AppState';
import type { Lang } from '../types';
import { Sheet } from './Sheet';

/** Until a language is picked, the dialog speaks Norwegian: the one language every reader of the app is learning. */
const NORSK = {
  chooseTitle: 'Velg språk for oversettelse',
  chooseLater: 'Du kan endre det senere i innstillingene ⚙',
  chooseSave: 'Lagre',
  close: 'Lukk',
};

/**
 * Asked once — on the first start, and once for everyone who used the app before languages could be chosen.
 * Every option speaks its own language; picking one turns the dialog into that language, and «Save» confirms it.
 * Closing without saving keeps the current language.
 */
export function LanguageSheet() {
  const { data, update } = useApp();
  const [picked, setPicked] = useState<Lang | null>(null);
  const text = picked ? MESSAGES[picked] : NORSK;
  const save = (lang: Lang) => update(d => ({ ...d, prefs: { ...d.prefs, lang, langChosen: true } }));

  return (
    <Sheet title={text.chooseTitle} lang={picked ?? 'nb'} closeLabel={text.close} onClose={() => save(data.prefs.lang)}
      actions={<button className="btn primary" disabled={!picked} onClick={() => picked && save(picked)}>{text.chooseSave}</button>}>
      <div className="choice-list lang-list" role="radiogroup" aria-label={text.chooseTitle}>
        {LANGS.map(l => (
          <button key={l} className="choice" role="radio" aria-checked={picked === l} lang={l} onClick={() => setPicked(l)}>
            <span className="radio" aria-hidden="true" />
            <span><b>{MESSAGES[l].langName}</b><small>{MESSAGES[l].choosePrompt}</small></span>
          </button>
        ))}
      </div>
      <p className="setting-note lang-later">{text.chooseLater}</p>
    </Sheet>
  );
}
