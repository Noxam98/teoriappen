import type { ReactNode } from 'react';
import { CATEGORY } from '../../data';
import { Words } from '../../features/brush/Words';
import type { Question } from '../../types';
import { Figure } from '../figures/Figure';

/** Picture + question text. */
export function QuestionBody({ q }: { q: Question }) {
  return (
    <div className={q.img ? 'qbody has-fig' : 'qbody'}>
      <Figure spec={q.img} />
      <p className="qtext" data-block><Words text={q.q} /></p>
    </div>
  );
}

/** One question on screen; `note` replaces the topic label in the corner ('' hides it). */
export function QuestionCard({ q, number, note, children }: { q: Question; number: number; note?: ReactNode; children: ReactNode }) {
  return (
    <article className="qcard">
      <div className="qmeta">
        <span className="qn">Spørsmål {number}</span>
        <span className="qc">{note ?? CATEGORY[q.cat].no}</span>
      </div>
      <QuestionBody q={q} />
      {children}
    </article>
  );
}
