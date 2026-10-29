import { Words } from '../../features/brush/Words';
import type { TheoryBlock as Block } from '../../types';
import { Figure } from '../figures/Figure';
import { Sign } from '../figures/Sign';
import { Icon } from '../Icons';

/** Norwegian text the brush can translate. */
const Nb = ({ text }: { text: string }) => <p data-block lang="nb"><Words text={text} /></p>;

/** Its Russian translation, unless the reader chose Norwegian only. */
const Ru = ({ text, show }: { text: string; show: boolean }) => (show ? <p className="t-ru">{text}</p> : null);

/** "Name: what it means" → the name in bold. */
function SignName({ text }: { text: string }) {
  const at = text.indexOf(': ');
  if (at < 0) return <p className="sname" data-block lang="nb"><Words text={text} /></p>;
  return <p className="sname" data-block lang="nb"><b><Words text={text.slice(0, at)} /></b>: <Words text={text.slice(at + 2)} /></p>;
}

/** One block of a theory chapter, in the reading order. */
export function TheoryBlock({ b, ru }: { b: Block; ru: boolean }) {
  if ('h' in b) return (
    <div className="t-h">
      <h2 data-block lang="nb"><Words text={b.h} /></h2>
      {ru && <p className="t-h-ru">{b.ru}</p>}
    </div>
  );
  if ('p' in b) return <div className="t-p"><Nb text={b.p} /><Ru text={b.ru} show={ru} /></div>;
  if ('rule' in b || 'trap' in b) {
    const rule = 'rule' in b;
    return (
      <aside className={rule ? 't-box rule' : 't-box trap'}>
        <div className="t-box-label"><Icon name={rule ? 'bulb' : 'warn'} />{rule ? 'Запомните' : 'Ловушка на экзамене'}</div>
        <Nb text={rule ? b.rule : b.trap} />
        <Ru text={b.ru} show={ru} />
      </aside>
    );
  }
  if ('list' in b) return (
    <ul className="t-list">
      {b.list.map(([no, tr], i) => <li key={i}><Nb text={no} /><Ru text={tr} show={ru} /></li>)}
    </ul>
  );
  if ('fig' in b) return (
    <figure className="t-fig">
      <Figure spec={b.fig} />
      <figcaption><Nb text={b.no} /><Ru text={b.ru} show={ru} /></figcaption>
    </figure>
  );
  if ('signs' in b) return (
    <ul className="t-signs">
      {b.signs.map(([sign, no, tr]) => (
        <li key={sign}>
          <span className="t-sign"><Sign name={sign} /></span>
          <span className="t-sign-text"><SignName text={no} /><Ru text={tr} show={ru} /></span>
        </li>
      ))}
    </ul>
  );
  return (
    <ul className="t-nums">
      {b.nums.map(([value, no, tr], i) => (
        <li key={i}>
          <b className="tnum">{value}</b>
          <Nb text={no} />
          <Ru text={tr} show={ru} />
        </li>
      ))}
    </ul>
  );
}
