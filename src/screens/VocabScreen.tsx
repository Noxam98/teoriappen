import { useEffect, useState } from 'react';
import { ActionBar } from '../components/ActionBar';
import { Icon } from '../components/Icons';
import { rich, useT } from '../i18n';
import { lookup } from '../lib/dictionary';
import { shuffle } from '../lib/text';
import { playSound } from '../lib/sound';
import { speak, useNorwegianVoice } from '../lib/speech';
import { useApp } from '../state/AppState';
import type { Lang, VocabItem } from '../types';

/** A saved word's translation in the reader's current language (the saved one if the dictionary doesn't know it). */
function savedText(v: VocabItem, lang: Lang): [tr: string, gram: string] {
  const r = v.w.includes(' ') ? null : lookup(v.w, lang);
  return r?.kind === 'entry' ? [r.entry[1], r.entry[2] ?? ''] : [v.tr, v.gram];
}

export function VocabScreen() {
  const { data, update, go } = useApp();
  const t = useT();
  const s = t.vocab;
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
        <div className="eyebrow">Ordliste</div>
        <h1>{s.title}</h1>
        <p className="muted">{list.length ? s.count(list.length) : s.empty}</p>
      </div>
      {list.length ? (
        <div className="vlist">
          {list.map(v => {
            const [tr, gram] = savedText(v, data.prefs.lang);
            return (
              <div key={v.w} className="vrow">
                <span className="no" lang="nb">{v.show || v.w}{v.lemma && v.lemma !== v.w && <small>{v.lemma}</small>}</span>
                <span className="tr">{tr || '—'}{gram && <small>{gram}</small>}</span>
                <span className="vrow-acts">
                  {voice && <button className="iconbtn" onClick={() => speak(v.show || v.w, voice)} aria-label={s.speak(v.show || v.w)}><Icon name="speak" /></button>}
                  <button className="iconbtn" onClick={() => remove(v.w)} aria-label={s.remove(v.show || v.w)}><Icon name="trash" /></button>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty how">
          <Icon name="translate" />
          <p>{rich(s.how)}</p>
        </div>
      )}
      <div className="toast-slot" role="status">
        {removed && (
          <div className="toast">
            <span>{s.removed(removed.item.show || removed.item.w)}</span>
            <button onClick={undo}>{s.undo}</button>
          </div>
        )}
      </div>
      <ActionBar>
        <button className="btn square" onClick={() => go({ name: 'home' })} aria-label={t.back}><Icon name="left" /></button>
        <button className="btn primary grow" disabled={!list.length} onClick={() => go({ name: 'flashcards' })}>{s.learn}</button>
      </ActionBar>
    </div>
  );
}

export function FlashcardsScreen() {
  const { data, go } = useApp();
  const s = useT().vocab;
  const voice = useNorwegianVoice();
  const [cards] = useState<VocabItem[]>(() => shuffle(data.vocab));
  const [k, setK] = useState(0);
  const [open, setOpen] = useState(false);
  const card = cards[k];
  if (!card) return <div className="empty">{s.emptyCards}</div>;
  const word = card.show || card.w;
  const [tr] = savedText(card, data.prefs.lang);

  return (
    <div className="flashcards">
      <h1 className="sr-only">{s.cards}</h1>
      <div className="flash-progress tnum">{s.card(k + 1, cards.length)}</div>
      <button className={open ? 'flash open' : 'flash'} onClick={() => { playSound('flip'); setOpen(o => !o); }} aria-label={open ? s.hide : s.show}>
        <span className="flash-inner">
          <span className="flash-face front">
            <span className="flash-word" lang="nb">{word}</span>
            {card.lemma && card.lemma !== card.w && <span className="muted">{card.lemma}</span>}
            <span className="flash-hint">{s.flip}</span>
          </span>
          <span className="flash-face back">
            <span className="flash-tr">{tr || '—'}</span>
            <span className="flash-word small">{word}</span>
            {card.ctx && <span className="flash-ctx">«{card.ctx}»</span>}
          </span>
        </span>
      </button>
      <ActionBar>
        <button className="btn square" onClick={() => go({ name: 'vocab' })} aria-label={s.end}><Icon name="close" /></button>
        {voice && <button className="btn square" onClick={() => speak(word, voice)} aria-label={s.speakWord}><Icon name="speak" /></button>}
        <button className="btn primary grow" onClick={() => { setK((k + 1) % cards.length); setOpen(false); }}>
          {k + 1 < cards.length ? s.next : s.restart} <Icon name="right" />
        </button>
      </ActionBar>
    </div>
  );
}
