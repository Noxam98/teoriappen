import { useState } from 'react';
import { EMPTY } from '../lib/storage';
import { useApp } from '../state/AppState';
import type { Prefs, RevealMode } from '../types';
import { Segmented } from './Segmented';
import { Sheet } from './Sheet';

export const REVEAL_OPTIONS: { value: RevealMode; label: string; hint: string }[] = [
  { value: 'instant', label: 'Сразу после вопроса', hint: 'Ответ фиксируется, сразу видно правильный вариант и объяснение.' },
  { value: 'end', label: 'После всех вопросов', hint: 'Как на настоящем экзамене: ответы можно менять, разбор — в конце.' },
];

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { data, update } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const prefs = data.prefs;
  const set = (p: Partial<Prefs>) => update(d => ({ ...d, prefs: { ...d.prefs, ...p } }));

  return (
    <Sheet title="Настройки" onClose={onClose} actions={<button className="btn primary" onClick={onClose}>Готово</button>}>
      <section className="setting">
        <h4>Показывать правильный ответ</h4>
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
        <h4>Размер текста вопросов</h4>
        <Segmented label="Размер текста" value={prefs.size} onChange={size => set({ size })}
          options={[{ value: 0, label: 'Мелкий' }, { value: 1, label: 'Средний' }, { value: 2, label: 'Крупный' }]} />
        <p className="size-preview" data-size={prefs.size}>Du nærmer deg et gangfelt. Hva gjelder?</p>
      </section>

      <section className="setting">
        <label className="switch-row">
          <span><b>Объяснение по-русски</b><small>Сразу раскрывать перевод объяснения после ответа</small></span>
          <input type="checkbox" className="switch" checked={prefs.ru} onChange={e => set({ ru: e.target.checked })} />
        </label>
      </section>

      <section className="setting">
        <h4>Прогресс</h4>
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
