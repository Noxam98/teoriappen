import { useState } from 'react';
import { canVibrate } from '../lib/feedback';
import { useInstall } from '../lib/install';
import { playSound, setSoundPrefs } from '../lib/sound';
import { EMPTY } from '../lib/storage';
import { useApp } from '../state/AppState';
import type { Prefs, RevealMode } from '../types';
import { Icon } from './Icons';
import { Segmented } from './Segmented';
import { Sheet } from './Sheet';

export const REVEAL_OPTIONS: { value: RevealMode; label: string; hint: string }[] = [
  { value: 'instant', label: 'Сразу после вопроса', hint: 'Ответ фиксируется, сразу видно правильный вариант и объяснение.' },
  { value: 'end', label: 'После всех вопросов', hint: 'Как на настоящем экзамене: ответы можно менять, разбор — в конце.' },
];

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { data, update } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const install = useInstall();
  const prefs = data.prefs;
  const set = (p: Partial<Prefs>) => update(d => ({ ...d, prefs: { ...d.prefs, ...p } }));

  return (
    <Sheet title="Настройки" onClose={onClose} actions={<button className="btn primary" onClick={onClose}>Готово</button>}>
      <section className="setting">
        <h3>Показывать правильный ответ</h3>
        <div className="choice-list" role="radiogroup" aria-label="Показывать правильный ответ">
          {REVEAL_OPTIONS.map(o => (
            <button key={o.value} className="choice" role="radio" aria-checked={prefs.reveal === o.value} onClick={() => set({ reveal: o.value })}>
              <span className="radio" aria-hidden="true" />
              <span><b>{o.label}</b><small>{o.hint}</small></span>
            </button>
          ))}
        </div>
        {data.cur && <p className="setting-note">Начатый экзамен продолжится в прежнем режиме.</p>}
      </section>

      <section className="setting">
        <h3>Размер текста вопросов</h3>
        <Segmented label="Размер текста" value={prefs.size} onChange={size => set({ size })}
          options={[{ value: 0, label: 'Мелкий' }, { value: 1, label: 'Средний' }, { value: 2, label: 'Крупный' }]} />
        <p className="size-preview" data-size={prefs.size} lang="nb">Du nærmer deg et gangfelt. Hva gjelder?</p>
      </section>

      <section className="setting">
        <label className="switch-row">
          <span><b>Объяснение по-русски</b><small>Сразу раскрывать перевод объяснения после ответа</small></span>
          <input type="checkbox" className="switch" checked={prefs.ru} onChange={e => set({ ru: e.target.checked })} />
        </label>
      </section>

      <section className="setting">
        <label className="switch-row">
          <span><b>Звуки</b><small>Ответы, начало и итог экзамена, таймер, кисть</small></span>
          <input type="checkbox" className="switch" checked={prefs.sound}
            onChange={e => { set({ sound: e.target.checked }); if (e.target.checked) { setSoundPrefs(true, prefs.volume); playSound('correct'); } }} />
        </label>
        {prefs.sound && (
          <div className="sound-row">
            <Segmented label="Громкость" value={prefs.volume}
              onChange={volume => { set({ volume }); setSoundPrefs(true, volume); playSound('correct'); }}
              options={[{ value: 0, label: 'Тихо' }, { value: 1, label: 'Обычно' }, { value: 2, label: 'Громко' }]} />
            <button className="btn ghost-strong" onClick={() => playSound('pass')}><Icon name="speak" />Проверить звук</button>
          </div>
        )}
      </section>

      {canVibrate() && (
        <section className="setting">
          <label className="switch-row">
            <span><b>Вибрация</b><small>Короткий отклик, когда ответ проверен</small></span>
            <input type="checkbox" className="switch" checked={prefs.haptics} onChange={e => set({ haptics: e.target.checked })} />
          </label>
        </section>
      )}

      {install.state !== 'unavailable' && (
        <section className="setting">
          <h3>Приложение на телефоне</h3>
          {install.state === 'installed' && <p className="install-done"><Icon name="check" />Тренажёр установлен и работает без интернета.</p>}
          {install.state === 'prompt' && (
            <button className="btn" onClick={install.install}><Icon name="home" />Установить на главный экран</button>
          )}
          {install.state === 'ios' && (
            <p className="install-ios">В Safari нажмите <b>«Поделиться»</b> <span aria-hidden="true">⎙</span>, затем <b>«На экран „Домой“»</b>. Тренажёр откроется как приложение и будет работать без интернета.</p>
          )}
        </section>
      )}

      <section className="setting">
        <h3>Прогресс</h3>
        {confirmReset ? (
          <div className="reset-confirm">
            <p>Удалить статистику ответов и историю экзаменов? Словарь останется.</p>
            <div className="row2">
              <button className="btn" onClick={() => setConfirmReset(false)}>Отмена</button>
              <button className="btn danger" onClick={() => {
                update(d => ({ ...d, stats: EMPTY.stats, exams: EMPTY.exams, cur: null, last: null }));
                setConfirmReset(false);
              }}>Удалить</button>
            </div>
          </div>
        ) : (
          <button className="btn ghost danger-text" onClick={() => setConfirmReset(true)}>Сбросить статистику</button>
        )}
      </section>
    </Sheet>
  );
}
