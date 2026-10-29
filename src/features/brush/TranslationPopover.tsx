import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useSwipeDown } from '../../hooks/useSwipeDown';
import { Icon } from '../../components/Icons';
import { classifyError, getSample, translateInContext, type ContextTranslation } from '../../lib/claude';
import { useT } from '../../i18n';
import type { Messages } from '../../i18n/ru';
import { firstVariant, gloss, lookup, phrasesIn } from '../../lib/dictionary';
import { playSound } from '../../lib/sound';
import { speak, useNorwegianVoice } from '../../lib/speech';
import { useApp } from '../../state/AppState';
import type { Lang } from '../../types';
import { useBrush, type TranslationRequest } from './BrushProvider';

type Ai =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; result: ContextTranslation }
  | { state: 'error'; message: string };

let claudeBlocked = false;

/** Dictionary result for what the user painted: what to show and what to save to the vocabulary. */
function translate(req: TranslationRequest, t: Messages['popover'], lang: Lang): { body: ReactNode; lemma: string; tr: string; gram: string } {
  if (req.words.length === 1) {
    const r = lookup(req.words[0], lang);
    if (r?.kind === 'entry') {
      const [lemma, tr, gram = ''] = r.entry;
      return {
        lemma, tr, gram,
        body: (
          <>
            <div className="lemma"><b>{lemma}</b>{gram && ` · ${gram}`}</div>
            <div className="tr">{tr}</div>
            {r.approx && <div className="lemma">{t.similar}</div>}
          </>
        ),
      };
    }
    if (r?.kind === 'compound') {
      const tr = r.parts.map(([, e]) => firstVariant(e[1])).join(' + ');
      return {
        lemma: '', tr, gram: t.compound,
        body: (
          <>
            <div className="lemma">{t.compound}</div>
            <div className="tr">{tr}</div>
            <div className="parts">{r.parts.map(([w, e]) => <div key={w}><b>{w}</b><span>{e[1]}</span></div>)}</div>
          </>
        ),
      };
    }
    return { lemma: '', tr: '', gram: '', body: <div className="none">{t.notFound}</div> };
  }
  const found = phrasesIn(req.words, lang);
  const whole = found.length === 1 && found[0][0].split(' ').length === req.words.length;
  const tr = found.length ? found.map(([, x]) => x).join('; ') : req.words.map(w => firstVariant(gloss(w, lang))).join(' ');
  return {
    lemma: '', tr, gram: t.phrase,
    body: (
      <>
        {found.map(([p, x]) => (
          <div key={p}>
            <div className="lemma">{whole ? t.phrase : <><b>{p}</b> · {t.phrase}</>}</div>
            <div className="tr">{x}</div>
          </div>
        ))}
        <div className="parts">{req.words.map((w, i) => <div key={i}><b>{w}</b><span>{gloss(w, lang)}</span></div>)}</div>
      </>
    ),
  };
}

export function TranslationPopover() {
  const { request } = useBrush();
  if (!request) return null;
  return <Popover key={request.id} req={request} />;
}

function Popover({ req }: { req: TranslationRequest }) {
  const { close } = useBrush();
  const { data, toggleVocab } = useApp();
  const tt = useT();
  const p = tt.popover;
  const voice = useNorwegianVoice();
  const ref = useRef<HTMLDivElement>(null);
  const grip = useRef<HTMLDivElement>(null);
  useSwipeDown(ref, grip, close);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [canAsk, setCanAsk] = useState(false);
  const [ai, setAi] = useState<Ai>({ state: 'idle' });
  const abort = useRef<AbortController | null>(null);

  const key = req.words.map(w => w.toLowerCase()).join(' ');
  const saved = data.vocab.some(v => v.w === key);
  const res = translate(req, p, data.prefs.lang);

  useEffect(() => {
    playSound('magic');
    getSample().then(s => setCanAsk(!!s && !claudeBlocked));
    return () => abort.current?.abort();
  }, []);

  // place next to the painted words; on phones CSS turns the popover into a bottom sheet
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    const left = Math.min(Math.max(12, req.rect.left), window.innerWidth - w - 12);
    let top = req.rect.bottom + 10;
    if (top + h > window.innerHeight - 12) top = Math.max(12, req.rect.top - h - 10);
    setPos({ left, top });
  }, [req, ai.state]);

  async function ask() {
    abort.current = new AbortController();
    setAi({ state: 'loading' });
    try {
      const result = await translateInContext(req.text, req.context, data.prefs.lang, abort.current.signal);
      setAi({ state: 'done', result });
    } catch (e) {
      const kind = classifyError(e);
      if (kind === 'cancelled') return;
      if (kind === 'blocked') { claudeBlocked = true; setCanAsk(false); }
      setAi({
        state: 'error',
        message: kind === 'blocked' ? p.blocked : kind === 'busy' ? p.busy : p.failed,
      });
    }
  }

  function save() {
    const tr = res.tr || (ai.state === 'done' ? ai.result.translation : '');
    if (toggleVocab({ w: key, show: req.text, lemma: res.lemma, tr, gram: res.gram, ctx: req.context.slice(0, 220) })) playSound('save');
  }

  return (
    <div className="pop" ref={ref} role="dialog" aria-label={p.label(req.text)} style={pos ?? { visibility: 'hidden' }}>
      <div className="pop-grip" ref={grip} aria-hidden="true"><span /></div>
      <div className="ph">
        <div className="pw" lang="nb">{req.text}</div>
        <button className="iconbtn" onClick={close} aria-label={tt.close}><Icon name="close" /></button>
      </div>
      {res.body}
      {ai.state !== 'idle' && (
        <div className="ai">
          <div className="lbl">{p.ctxLabel}</div>
          {ai.state === 'loading' && <div>{p.thinking}</div>}
          {ai.state === 'error' && <div>{ai.message}</div>}
          {ai.state === 'done' && (
            <>
              <div className="tr">{ai.result.translation || '—'}</div>
              {ai.result.base && <div className="lemma"><b>{ai.result.base}</b></div>}
              {ai.result.note && <div>{ai.result.note}</div>}
              {ai.result.sentence && (
                <details>
                  <summary>{p.sentence}</summary>
                  <div className="sent">{ai.result.sentence}</div>
                </details>
              )}
            </>
          )}
        </div>
      )}
      <div className="acts">
        {voice && <button className="btn" onClick={() => speak(req.text, voice)}><Icon name="speak" />Uttale</button>}
        <button className={saved ? 'btn on' : 'btn'} onClick={save}>
          <Icon name={saved ? 'starOn' : 'star'} />{saved ? p.saved : p.save}
        </button>
        {canAsk && (
          <button className="btn" onClick={ask} disabled={ai.state === 'loading'} title={p.ctxTitle}>
            <Icon name="spark" />{p.ctx}
          </button>
        )}
      </div>
    </div>
  );
}
