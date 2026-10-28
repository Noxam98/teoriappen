import { useState } from 'react';
import { Icon } from '../components/Icons';
import { shuffle } from '../lib/text';
import { speak, useNorwegianVoice } from '../lib/speech';
import { useApp } from '../state/AppState';
import type { VocabItem } from '../types';

export function VocabScreen() {
  const { data, update, go } = useApp();
  const voice = useNorwegianVoice();
  const list = data.vocab.slice().reverse();
  const remove = (w: string) => update(d => ({ ...d, vocab: d.vocab.filter(v => v.w !== w) }));

  return (
    <>
      <div className="section-title first">
        <div><div className="eyebrow">Ordliste</div><h2 className="page-title">Мой словарь</h2></div>
        {list.length > 0 && <button className="btn primary" onClick={() => go({ name: 'flashcards' })}>Учить карточками</button>}
      </div>
      {list.length ? (
        <div className="vlist">
          {list.map(v => (
            <div key={v.w} className="vrow panel">
              <span className="no">{v.show || v.w}{v.lemma && v.lemma !== v.w && <small>{v.lemma}</small>}</span>
              <span className="tr">{v.tr || '—'}{v.gram && <small>{v.gram}</small>}</span>
              {voice ? <button className="iconbtn" onClick={() => speak(v.show || v.w, voice)} title="Произнести"><Icon name="speak" /></button> : <span />}
              <button className="iconbtn" onClick={() => remove(v.w)} title="Удалить"><Icon name="trash" /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">Словарь пуст. Включите кисть, проведите по незнакомому слову в вопросе и нажмите «В словарь».</div>
      )}
      <div className="cta"><button className="btn" onClick={() => go({ name: 'home' })}><Icon name="left" /> Назад</button></div>
    </>
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
    <>
      <div className="section-title first"><h2>Карточки</h2><span className="muted tnum">{k + 1} / {cards.length}</span></div>
      <section className="panel flash">
        <div className="front">{word}</div>
        {card.lemma && card.lemma !== card.w && <div className="muted">{card.lemma}</div>}
        {open ? (
          <>
            <div className="back">{card.tr || '—'}</div>
            {card.ctx && <div className="ctx">«{card.ctx}»</div>}
          </>
        ) : (
          <button className="btn primary" onClick={() => setOpen(true)}>Показать перевод</button>
        )}
      </section>
      <div className="cta">
        {voice && <button className="btn" onClick={() => speak(word, voice)}><Icon name="speak" /> Uttale</button>}
        <span className="sp" />
        <button className="btn" onClick={() => go({ name: 'vocab' })}>Закончить</button>
        <button className="btn primary" onClick={() => { setK((k + 1) % cards.length); setOpen(false); }}>
          {k + 1 < cards.length ? 'Следующая' : 'Сначала'} <Icon name="right" />
        </button>
      </div>
    </>
  );
}
