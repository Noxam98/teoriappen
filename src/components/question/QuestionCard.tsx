import type { ReactNode } from 'react';
import { CATEGORY } from '../../data';
import { Words } from '../../features/brush/Words';
import type { Question } from '../../types';
import { Figure } from '../figures/Figure';
import { ShareButton } from '../ShareButton';

/** Picture + question text. */
export function QuestionBody({ q }: { q: Question }) {
  return (
    <div className={q.img ? 'qbody has-fig' : 'qbody'}>
      <Figure spec={q.img} numbered={q.byNumber} />
      <p className="qtext" data-block lang="nb"><Words text={q.q} /></p>
    </div>
  );
}

/** A link that opens this question first in a round of its topic. */
export const QuestionShare = ({ q }: { q: Question }) => (
  <ShareButton className="iconbtn qshare" to={{ name: 'practice', mode: q.cat, q: q.id }}
    title={`Вопрос по теме «${CATEGORY[q.cat].ru}»`} label="Поделиться ссылкой на вопрос" />
);

/** One question on screen; `note` replaces the topic label in the corner ('' hides it); `share` adds a link button. */
export function QuestionCard({ q, number, note, share = false, children }: { q: Question; number: number; note?: ReactNode; share?: boolean; children: ReactNode }) {
  return (
    <article className="qcard">
      <div className="qmeta">
        <span className="qn">Spørsmål {number}</span>
        <span className="qc">{note ?? CATEGORY[q.cat].no}</span>
        {share && <QuestionShare q={q} />}
      </div>
      <QuestionBody q={q} />
      {children}
    </article>
  );
}
