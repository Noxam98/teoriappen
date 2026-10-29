import type { ReactNode } from 'react';
import { CATEGORY } from '../../data';
import { Words } from '../../features/brush/Words';
import { topicName, useLang, useT } from '../../i18n';
import { playSound } from '../../lib/sound';
import type { Question } from '../../types';
import { Figure } from '../figures/Figure';
import { Zoomable } from '../figures/viewer';
import { Icon } from '../Icons';
import { ShareButton } from '../ShareButton';

/** Picture + question text. */
export function QuestionBody({ q }: { q: Question }) {
  return (
    <div className={q.img ? 'qbody has-fig' : 'qbody'}>
      {q.img && <Zoomable slide={{ type: 'figure', spec: q.img, numbered: q.byNumber }}><Figure spec={q.img} numbered={q.byNumber} /></Zoomable>}
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

/** "I want to read about this after the test": the list of ticked questions comes after the test. */
function LaterToggle({ on, toggle }: { on: boolean; toggle: () => void }) {
  const t = useT().later;
  return (
    <label className={on ? 'later-toggle on' : 'later-toggle'}>
      <input type="checkbox" checked={on} onChange={() => { if (!on) playSound('flag'); toggle(); }} />
      <span className="later-box" aria-hidden="true"><Icon name="check" /></span>
      <span>{t.toggle}</span>
      <Icon name="bookmark" />
    </label>
  );
}

/**
 * One question on screen; `note` replaces the topic label in the corner ('' hides it); `share` adds a link button;
 * `later` adds the "read about this after the test" tick under it.
 */
export function QuestionCard({ q, number, note, share = false, later, children }: {
  q: Question; number: number; note?: ReactNode; share?: boolean; later?: { on: boolean; toggle: () => void }; children: ReactNode;
}) {
  return (
    <article className="qcard">
      <div className="qmeta">
        <span className="qn">Spørsmål {number}</span>
        <span className="qc">{note ?? CATEGORY[q.cat].no}</span>
        {share && <QuestionShare q={q} />}
      </div>
      <QuestionBody q={q} />
      {children}
      {later && <LaterToggle {...later} />}
    </article>
  );
}
