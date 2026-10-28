import { useState } from 'react';
import { ActionBar } from '../components/ActionBar';
import { Icon } from '../components/Icons';
import { shuffle, plural } from '../lib/text';
import { speak, useNorwegianVoice } from '../lib/speech';
import { useApp } from '../state/AppState';
import type { VocabItem } from '../types';

export function VocabScreen() {
  const { data, update, go } = useApp();
  const voice = useNorwegianVoice();
  const list = data.vocab.slice().reverse();
  const remove = (w: string) => update(d => ({ ...d, vocab: d.vocab.filter(v => v.w !== w) }));

  return (
    <div className="vocab">
      <div className="page-head">
        <div className="eyebrow">Ordliste</div>
        <h1>Мой словарь</h1>
        <p className="muted">{list.length ? `${list.length} ${plural(list.length, 'слово', 'слова', 'слов')}, сохранённых кистью` : 'Здесь появятся слова, которые вы сохраните кистью.'}</p>
      </div>
      {list.length ? (
        <div className="vlist">
          {list.map(v => (
            <div key={v.w} className="vrow">
              <span className="no">{v.show || v.w}{v.lemma && v.lemma !== v.w && <small>{v.lemma}</small>}</span>
              <span className="tr">{v.tr || '—'}{v.gram && <small>{v.gram}</small>}</span>
              <span className="vrow-acts">
                {voice && <button className="iconbtn" onClick={() => speak(v.show || v.w, voice)} aria-label="Произнести"><Icon name="speak" /></button>}
                <button className="iconbtn" onClick={() => remove(v.w)} aria-label="Удалить"><Icon name="trash" /></button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty how">
          <Icon name="brush" />
          <p>Включите <b>кисть</b> в панели сверху, проведите по незнакомому слову в вопросе и нажмите <b>«В словарь»</b>.</p>
        </div>
      )}
      <ActionBar>
        <button className="btn square" onClick={() => go({ name: 'home' })} aria-label="Назад"><Icon name="left" /></button>
        <button className="btn primary grow" disabled={!list.length} onClick={() => go({ name: 'flashcards' })}>Учить карточками</button>
      </ActionBar>
    </div>
  );
}

export function FlashcardsScreen() {
  const { data, go } = useApp();
  const voice = useNorwegianVoice();
  const [cards] = useState<VocabItem[]>(() => shuffle(data.vocab));
  const [k, setK] = useState(0);
  const [open, setOpen] = useState(false);
  const card = cards[k];
  if (!card) return <div className="empty">Словарь пуст.</div>;
  const word = card.show || card.w;

  return (
    <div className="flashcards">
      <div className="flash-progress tnum">Карточка {k + 1} из {cards.length}</div>
      <button className={open ? 'flash open' : 'flash'} onClick={() => setOpen(o => !o)} aria-label={open ? 'Скрыть перевод' : 'Показать перевод'}>
        <span className="flash-inner">
          <span className="flash-face front">
            <span className="flash-word">{word}</span>
            {card.lemma && card.lemma !== card.w && <span className="muted">{card.lemma}</span>}
            <span className="flash-hint">нажмите, чтобы перевернуть</span>
          </span>
          <span className="flash-face back">
            <span className="flash-tr">{card.tr || '—'}</span>
            <span className="flash-word small">{word}</span>
            {card.ctx && <span className="flash-ctx">«{card.ctx}»</span>}
          </span>
        </span>
      </button>
      <ActionBar>
        <button className="btn square" onClick={() => go({ name: 'vocab' })} aria-label="Закончить"><Icon name="close" /></button>
        {voice && <button className="btn square" onClick={() => speak(word, voice)} aria-label="Произнести"><Icon name="speak" /></button>}
        <button className="btn primary grow" onClick={() => { setK((k + 1) % cards.length); setOpen(false); }}>
          {k + 1 < cards.length ? 'Следующая' : 'Сначала'} <Icon name="right" />
        </button>
      </ActionBar>
    </div>
  );
}
