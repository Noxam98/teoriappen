import type { ReactNode } from 'react';
import { CATEGORY } from '../../data';
import { Words } from '../../features/brush/Words';
import { topicName, useLang, useT } from '../../i18n';
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
export function QuestionShare({ q }: { q: Question }) {
  const t = useT().question;
  return (
    <ShareButton className="iconbtn qshare" to={{ name: 'practice', mode: q.cat, q: q.id }}
      title={t.shareTitle(topicName(CATEGORY[q.cat], useLang()))} label={t.share} />
  );
}

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
