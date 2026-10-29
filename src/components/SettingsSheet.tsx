import { useState } from 'react';
import { LANGS, MESSAGES, rich, useT } from '../i18n';
import type { Messages } from '../i18n/ru';
import { canVibrate } from '../lib/feedback';
import { useInstall } from '../lib/install';
import { playSound, setSoundPrefs } from '../lib/sound';
import { EMPTY } from '../lib/storage';
import { useApp } from '../state/AppState';
import type { Prefs, RevealMode } from '../types';
import { Icon } from './Icons';
import { Segmented } from './Segmented';
import { Sheet } from './Sheet';

export const revealOptions = (t: Messages): { value: RevealMode; label: string; hint: string }[] => [
  { value: 'instant', label: t.settings.instant, hint: t.settings.instantHint },
  { value: 'end', label: t.settings.end, hint: t.settings.endHint },
];

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { data, update } = useApp();
  const t = useT();
  const s = t.settings;
  const [confirmReset, setConfirmReset] = useState(false);
  const install = useInstall();
  const prefs = data.prefs;
  const set = (p: Partial<Prefs>) => update(d => ({ ...d, prefs: { ...d.prefs, ...p } }));

  return (
    <Sheet title={s.title} onClose={onClose} actions={<button className="btn primary" onClick={onClose}>{s.done}</button>}>
      <section className="setting">
        <h3>{s.lang}</h3>
        {/* a list rather than a segmented control, so that more languages fit */}
        <div className="choice-list" role="radiogroup" aria-label={s.lang}>
          {LANGS.map(l => (
            <button key={l} className="choice" role="radio" aria-checked={prefs.lang === l} lang={l} onClick={() => set({ lang: l, langChosen: true })}>
              <span className="radio" aria-hidden="true" />
              <span><b>{MESSAGES[l].langName}</b></span>
            </button>
          ))}
        </div>
        <p className="setting-note">{s.langHint}</p>
      </section>

      <section className="setting">
        <h3>{s.reveal}</h3>
        <div className="choice-list" role="radiogroup" aria-label={s.reveal}>
          {revealOptions(t).map(o => (
            <button key={o.value} className="choice" role="radio" aria-checked={prefs.reveal === o.value} onClick={() => set({ reveal: o.value })}>
              <span className="radio" aria-hidden="true" />
              <span><b>{o.label}</b><small>{o.hint}</small></span>
            </button>
          ))}
        </div>
        {data.cur && <p className="setting-note">{s.keepsMode}</p>}
      </section>

      <section className="setting">
        <h3>{s.size}</h3>
        <Segmented label={s.sizeLabel} value={prefs.size} onChange={size => set({ size })}
          options={([0, 1, 2] as const).map(v => ({ value: v, label: s.sizes[v] }))} />
        <p className="size-preview" data-size={prefs.size} lang="nb">Du nærmer deg et gangfelt. Hva gjelder?</p>
      </section>

      <section className="setting">
        <label className="switch-row">
          <span><b>{s.explain}</b><small>{s.explainHint}</small></span>
          <input type="checkbox" className="switch" checked={prefs.ru} onChange={e => set({ ru: e.target.checked })} />
        </label>
      </section>

      <section className="setting">
        <label className="switch-row">
          <span><b>{s.sound}</b><small>{s.soundHint}</small></span>
          <input type="checkbox" className="switch" checked={prefs.sound}
            onChange={e => { set({ sound: e.target.checked }); if (e.target.checked) { setSoundPrefs(true, prefs.volume); playSound('correct'); } }} />
        </label>
        {prefs.sound && (
          <div className="sound-row">
            <Segmented label={s.volume} value={prefs.volume}
              onChange={volume => { set({ volume }); setSoundPrefs(true, volume); playSound('correct'); }}
              options={([0, 1, 2] as const).map(v => ({ value: v, label: s.volumes[v] }))} />
            <button className="btn ghost-strong" onClick={() => playSound('pass')}><Icon name="speak" />{s.testSound}</button>
          </div>
        )}
      </section>

      {canVibrate() && (
        <section className="setting">
          <label className="switch-row">
            <span><b>{s.vibration}</b><small>{s.vibrationHint}</small></span>
            <input type="checkbox" className="switch" checked={prefs.haptics} onChange={e => set({ haptics: e.target.checked })} />
          </label>
        </section>
      )}

      {install.state !== 'unavailable' && (
        <section className="setting">
          <h3>{s.app}</h3>
          {install.state === 'installed' && <p className="install-done"><Icon name="check" />{s.installed}</p>}
          {install.state === 'prompt' && (
            <button className="btn" onClick={install.install}><Icon name="home" />{s.install}</button>
          )}
          {install.state === 'ios' && (
            <p className="install-ios">{rich(s.ios)}</p>
          )}
        </section>
      )}

      <section className="setting">
        <h3>{s.progress}</h3>
        {confirmReset ? (
          <div className="reset-confirm">
            <p>{s.resetQuestion}</p>
            <div className="row2">
              <button className="btn" onClick={() => setConfirmReset(false)}>{s.cancel}</button>
              <button className="btn danger" onClick={() => {
                update(d => ({ ...d, stats: EMPTY.stats, exams: EMPTY.exams, read: EMPTY.read, cur: null, last: null }));
                setConfirmReset(false);
              }}>{s.remove}</button>
            </div>
          </div>
        ) : (
          <button className="btn ghost danger-text" onClick={() => setConfirmReset(true)}>{s.reset}</button>
        )}
      </section>
    </Sheet>
  );
}
