import { useEffect, useState } from 'react';
import { ActionBar } from '../components/ActionBar';
import { Icon } from '../components/Icons';
import { shuffle, plural } from '../lib/text';
import { playSound } from '../lib/sound';
import { speak, useNorwegianVoice } from '../lib/speech';
import { useApp } from '../state/AppState';
import type { VocabItem } from '../types';

export function VocabScreen() {
  const { data, update, go } = useApp();
  const voice = useNorwegianVoice();
  const list = data.vocab.slice().reverse();
  const [removed, setRemoved] = useState<{ item: VocabItem; index: number } | null>(null);
  const remove = (w: string) => {
    const index = data.vocab.findIndex(v => v.w === w);
    if (index < 0) return;
    setRemoved({ item: data.vocab[index], index });
    update(d => ({ ...d, vocab: d.vocab.filter(v => v.w !== w) }));
  };
  const undo = () => {
    if (!removed) return;
    update(d => { const vocab = d.vocab.slice(); vocab.splice(removed.index, 0, removed.item); return { ...d, vocab }; });
    setRemoved(null);
  };
  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 6000);
    return () => clearTimeout(t);
  }, [removed]);

  return (
    <div className="vocab">
      <div className="page-head">
        <div className="eyebrow" translate="no">Ordliste</div>
        <h1>Мой словарь</h1>
        <p className="muted">{list.length ? `${list.length} ${plural(list.length, 'слово', 'слова', 'слов')} из переводов` : 'Здесь появятся слова, которые вы сохраните из перевода.'}</p>
      </div>
      {list.length ? (
        <div className="vlist">
          {list.map(v => (
            <div key={v.w} className="vrow">
              <span className="no" lang="nb">{v.show || v.w}{v.lemma && v.lemma !== v.w && <small>{v.lemma}</small>}</span>
              <span className="tr">{v.tr || '—'}{v.gram && <small>{v.gram}</small>}</span>
              <span className="vrow-acts">
                {voice && <button className="iconbtn" onClick={() => speak(v.show || v.w, voice)} aria-label={`Произнести «${v.show || v.w}»`}><Icon name="speak" /></button>}
                <button className="iconbtn" onClick={() => remove(v.w)} aria-label={`Удалить «${v.show || v.w}»`}><Icon name="trash" /></button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty how">
          <Icon name="translate" />
          <p>Нажмите <b>«Перевод»</b> в панели сверху, затем на незнакомое слово в вопросе и <b>«В словарь»</b>.</p>
        </div>
      )}
      <div className="toast-slot" role="status">
        {removed && (
          <div className="toast">
            <span>Удалено «{removed.item.show || removed.item.w}»</span>
            <button onClick={undo}>Вернуть</button>
          </div>
        )}
      </div>
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
      <h1 className="sr-only">Карточки слов</h1>
      <div className="flash-progress tnum">Карточка {k + 1} из {cards.length}</div>
      <button className={open ? 'flash open' : 'flash'} onClick={() => { playSound('flip'); setOpen(o => !o); }} aria-label={open ? 'Скрыть перевод' : 'Показать перевод'}>
        <span className="flash-inner">
          <span className="flash-face front">
            <span className="flash-word" lang="nb">{word}</span>
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
