import { Words } from '../../features/brush/Words';
import { tr, useT } from '../../i18n';
import type { Lang, Norwegian, TheoryBlock as Block, TheoryLang, Translated } from '../../types';
import { Figure } from '../figures/Figure';
import { Sign } from '../figures/Sign';
import { Zoomable } from '../figures/viewer';
import { Icon } from '../Icons';

/** How the reader wants the text: `mode` (both / Norwegian / translation only) and the translation's language. */
export interface Show { mode: TheoryLang; lang: Lang }

/**
 * A Norwegian text and its translation, as the reader chose: both (the translation under the text),
 * Norwegian only, or the translation only (it takes the text's place and style).
 */
export function TheoryText({ t, show, className = 't-main' }: { t: Norwegian; show: Show; className?: string }) {
  const text = tr(t, show.lang);
  return (
    <>
      {show.mode !== 'tr' && <p className={className} data-block lang="nb"><Words text={t.no} /></p>}
      {show.mode === 'both' && <p className="t-ru">{text}</p>}
      {show.mode === 'tr' && <p className={className}>{text}</p>}
    </>
  );
}

/** "Name: what it means" → the name in bold. In the translation only the meaning is given. */
function SignName({ t, show }: { t: Norwegian; show: Show }) {
  const at = t.no.indexOf(': ');
  if (show.mode === 'tr' || at < 0) return <TheoryText t={t} show={show} className="t-main sname" />;
  return (
    <>
      <p className="t-main sname" data-block lang="nb"><b><Words text={t.no.slice(0, at)} /></b>: <Words text={t.no.slice(at + 2)} /></p>
      {show.mode === 'both' && <p className="t-ru">{tr(t, show.lang)}</p>}
    </>
  );
}

/** A text block's Norwegian is under the block's own key (h, p, rule, trap); the translations are beside it. */
const norwegian = (no: string, b: Translated): Norwegian => ({ ...b, no });

/** One block of a theory chapter, in the reading order. */
export function TheoryBlock({ b, show, section }: { b: Block; show: Show; section?: string }) {
  const t = useT();
  if ('h' in b) return (
    <div className="t-h" data-section={section}>
      {show.mode === 'tr' ? <h2>{tr(b, show.lang)}</h2> : <h2 data-block lang="nb"><Words text={b.h} /></h2>}
      {show.mode === 'both' && <p className="t-h-ru">{tr(b, show.lang)}</p>}
    </div>
  );
  if ('p' in b) return <div className="t-p"><TheoryText t={norwegian(b.p, b)} show={show} /></div>;
  if ('rule' in b || 'trap' in b) {
    const rule = 'rule' in b;
    return (
      <aside className={rule ? 't-box rule' : 't-box trap'}>
        <div className="t-box-label"><Icon name={rule ? 'bulb' : 'warn'} />{rule ? t.theory.remember : t.theory.trap}</div>
        <TheoryText t={norwegian(rule ? b.rule : b.trap, b)} show={show} />
      </aside>
    );
  }
  if ('list' in b) return (
    <ul className="t-list">
      {b.list.map((item, i) => <li key={i}><TheoryText t={item} show={show} /></li>)}
    </ul>
  );
  if ('fig' in b) return (
    <figure className="t-fig">
      <Zoomable slide={{ type: 'figure', spec: b.fig, caption: b }} from={b}><Figure spec={b.fig} /></Zoomable>
      <figcaption><TheoryText t={b} show={show} /></figcaption>
    </figure>
  );
  if ('signs' in b) return (
    <ul className="t-signs">
      {b.signs.map(item => (
        <li key={item.sign}>
          <span className="t-sign"><Zoomable slide={{ type: 'figure', spec: { sign: item.sign, under: item.under }, caption: item }} from={item}><Sign name={item.sign} under={item.under} /></Zoomable></span>
          <span className="t-sign-text"><SignName t={item} show={show} /></span>
        </li>
      ))}
    </ul>
  );
  return (
    <ul className="t-nums">
      {b.nums.map((item, i) => (
        <li key={i}>
          <b className="tnum">{item.value}</b>
          <TheoryText t={item} show={show} />
        </li>
      ))}
    </ul>
  );
}
