import { Words } from '../../features/brush/Words';
import type { TheoryBlock as Block, TheoryLang } from '../../types';
import { Figure } from '../figures/Figure';
import { Sign } from '../figures/Sign';
import { Icon } from '../Icons';

/**
 * A Norwegian text and its Russian translation, as the reader chose: both (the translation under the text),
 * Norwegian only, or Russian only (the translation takes the text's place and style).
 */
export function TheoryText({ no, ru, lang, className = 't-main' }: { no: string; ru: string; lang: TheoryLang; className?: string }) {
  return (
    <>
      {lang !== 'ru' && <p className={className} data-block lang="nb"><Words text={no} /></p>}
      {lang === 'both' && <p className="t-ru">{ru}</p>}
      {lang === 'ru' && <p className={className}>{ru}</p>}
    </>
  );
}

/** "Name: what it means" → the name in bold. In Russian only the meaning is given. */
function SignName({ no, ru, lang }: { no: string; ru: string; lang: TheoryLang }) {
  const at = no.indexOf(': ');
  if (lang === 'ru' || at < 0) return <TheoryText no={no} ru={ru} lang={lang} className="t-main sname" />;
  return (
    <>
      <p className="t-main sname" data-block lang="nb"><b><Words text={no.slice(0, at)} /></b>: <Words text={no.slice(at + 2)} /></p>
      {lang === 'both' && <p className="t-ru">{ru}</p>}
    </>
  );
}

/** One block of a theory chapter, in the reading order. */
export function TheoryBlock({ b, lang, section }: { b: Block; lang: TheoryLang; section?: string }) {
  if ('h' in b) return (
    <div className="t-h" data-section={section}>
      {lang === 'ru' ? <h2>{b.ru}</h2> : <h2 data-block lang="nb"><Words text={b.h} /></h2>}
      {lang === 'both' && <p className="t-h-ru">{b.ru}</p>}
    </div>
  );
  if ('p' in b) return <div className="t-p"><TheoryText no={b.p} ru={b.ru} lang={lang} /></div>;
  if ('rule' in b || 'trap' in b) {
    const rule = 'rule' in b;
    return (
      <aside className={rule ? 't-box rule' : 't-box trap'}>
        <div className="t-box-label"><Icon name={rule ? 'bulb' : 'warn'} />{rule ? 'Запомните' : 'Ловушка на экзамене'}</div>
        <TheoryText no={rule ? b.rule : b.trap} ru={b.ru} lang={lang} />
      </aside>
    );
  }
  if ('list' in b) return (
    <ul className="t-list">
      {b.list.map(([no, tr], i) => <li key={i}><TheoryText no={no} ru={tr} lang={lang} /></li>)}
    </ul>
  );
  if ('fig' in b) return (
    <figure className="t-fig">
      <Figure spec={b.fig} />
      <figcaption><TheoryText no={b.no} ru={b.ru} lang={lang} /></figcaption>
    </figure>
  );
  if ('signs' in b) return (
    <ul className="t-signs">
      {b.signs.map(([sign, no, tr]) => (
        <li key={sign}>
          <span className="t-sign"><Sign name={sign} /></span>
          <span className="t-sign-text"><SignName no={no} ru={tr} lang={lang} /></span>
        </li>
      ))}
    </ul>
  );
  return (
    <ul className="t-nums">
      {b.nums.map(([value, no, tr], i) => (
        <li key={i}>
          <b className="tnum">{value}</b>
          <TheoryText no={no} ru={tr} lang={lang} />
        </li>
      ))}
    </ul>
  );
}
