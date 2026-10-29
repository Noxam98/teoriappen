import { Words } from '../../features/brush/Words';
import { pick, useT } from '../../i18n';
import type { Lang, TheoryBlock as Block, TheoryLang } from '../../types';
import { Figure } from '../figures/Figure';
import { Sign } from '../figures/Sign';
import { Icon } from '../Icons';

/** How the reader wants the text: `mode` (both / Norwegian / translation only) and the translation's language. */
export interface Show { mode: TheoryLang; lang: Lang }

/**
 * A Norwegian text and its translation, as the reader chose: both (the translation under the text),
 * Norwegian only, or the translation only (it takes the text's place and style).
 */
export function TheoryText({ no, ru, uk, show, className = 't-main' }: { no: string; ru: string; uk?: string; show: Show; className?: string }) {
  const tr = pick(show.lang, ru, uk);
  return (
    <>
      {show.mode !== 'tr' && <p className={className} data-block lang="nb"><Words text={no} /></p>}
      {show.mode === 'both' && <p className="t-ru">{tr}</p>}
      {show.mode === 'tr' && <p className={className}>{tr}</p>}
    </>
  );
}

/** "Name: what it means" → the name in bold. In the translation only the meaning is given. */
function SignName({ no, ru, uk, show }: { no: string; ru: string; uk?: string; show: Show }) {
  const at = no.indexOf(': ');
  if (show.mode === 'tr' || at < 0) return <TheoryText no={no} ru={ru} uk={uk} show={show} className="t-main sname" />;
  return (
    <>
      <p className="t-main sname" data-block lang="nb"><b><Words text={no.slice(0, at)} /></b>: <Words text={no.slice(at + 2)} /></p>
      {show.mode === 'both' && <p className="t-ru">{pick(show.lang, ru, uk)}</p>}
    </>
  );
}

/** One block of a theory chapter, in the reading order. */
export function TheoryBlock({ b, show, section }: { b: Block; show: Show; section?: string }) {
  const t = useT();
  if ('h' in b) return (
    <div className="t-h" data-section={section}>
      {show.mode === 'tr' ? <h2>{pick(show.lang, b.ru, b.uk)}</h2> : <h2 data-block lang="nb"><Words text={b.h} /></h2>}
      {show.mode === 'both' && <p className="t-h-ru">{pick(show.lang, b.ru, b.uk)}</p>}
    </div>
  );
  if ('p' in b) return <div className="t-p"><TheoryText no={b.p} ru={b.ru} uk={b.uk} show={show} /></div>;
  if ('rule' in b || 'trap' in b) {
    const rule = 'rule' in b;
    return (
      <aside className={rule ? 't-box rule' : 't-box trap'}>
        <div className="t-box-label"><Icon name={rule ? 'bulb' : 'warn'} />{rule ? t.theory.remember : t.theory.trap}</div>
        <TheoryText no={rule ? b.rule : b.trap} ru={b.ru} uk={b.uk} show={show} />
      </aside>
    );
  }
  if ('list' in b) return (
    <ul className="t-list">
      {b.list.map(([no, ru, uk], i) => <li key={i}><TheoryText no={no} ru={ru} uk={uk} show={show} /></li>)}
    </ul>
  );
  if ('fig' in b) return (
    <figure className="t-fig">
      <Figure spec={b.fig} />
      <figcaption><TheoryText no={b.no} ru={b.ru} uk={b.uk} show={show} /></figcaption>
    </figure>
  );
  if ('signs' in b) return (
    <ul className="t-signs">
      {b.signs.map(([sign, no, ru, uk]) => (
        <li key={sign}>
          <span className="t-sign"><Sign name={sign} /></span>
          <span className="t-sign-text"><SignName no={no} ru={ru} uk={uk} show={show} /></span>
        </li>
      ))}
    </ul>
  );
  return (
    <ul className="t-nums">
      {b.nums.map(([value, no, ru, uk], i) => (
        <li key={i}>
          <b className="tnum">{value}</b>
          <TheoryText no={no} ru={ru} uk={uk} show={show} />
        </li>
      ))}
    </ul>
  );
}
