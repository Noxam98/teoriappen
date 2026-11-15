import { useEffect, useRef } from 'react';
import { AttemptSheet, HistoryList, useHistory } from '../components/History';
import { useT } from '../i18n';
import { useApp } from '../state/AppState';
import type { Screen, TestKind } from '../types';

/**
 * Every test, newest first, in two tabs: exams and practice rounds. A test opens in a dialog over the list.
 * The tab and the opened test live in the address, so the browser's back button (or the back swipe) closes the dialog.
 */
export function HistoryScreen({ screen }: { screen: Extract<Screen, { name: 'history' }> }) {
  const { go, mark } = useApp();
  const h = useT().history;
  const entries = useHistory();
  // without a tab in the address: the tab of the newest test
  const tab: TestKind = screen.tab ?? entries[0]?.kind ?? 'exam';
  useEffect(() => { if (!screen.tab) mark({ name: 'history', tab }); }, [screen.tab, tab, mark]);
  const opened = screen.open ? entries.find(e => e.key === screen.open) : undefined;
  const tabs: { kind: TestKind; no: string; sub: string }[] = [
    { kind: 'exam', no: 'Prøver', sub: h.exams },
    { kind: 'practice', no: 'Øving', sub: h.practice },
  ];
  const shown = entries.filter(e => e.kind === tab);

  // closing steps back to the list when the dialog was opened from it; a dialog opened by a link has no step to go back to
  const closing = useRef(false);
  useEffect(() => { closing.current = false; }, [screen.open]);
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if ((window.history.state as { stay?: boolean } | null)?.stay) window.history.back();
    else go({ name: 'history', tab }, { replace: true, stay: true });
  };

  return (
    <div className="history-screen">
      <div className="page-head">
        <div className="eyebrow">Historikk</div>
        <h1>{h.screen}</h1>
        <p className="muted">{h.sub}</p>
      </div>
      <div className="segmented history-tabs" role="tablist" aria-label={h.screen}>
        {tabs.map(x => (
          <button key={x.kind} role="tab" id={`tab-${x.kind}`} aria-selected={tab === x.kind} aria-controls="history-panel" onClick={() => mark({ name: 'history', tab: x.kind })}>
            <span lang="nb">{x.no}</span>
            <small className="tnum">{x.sub} · {entries.filter(e => e.kind === x.kind).length}</small>
          </button>
        ))}
      </div>
      <div id="history-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {shown.length
          ? <HistoryList entries={shown} onOpen={key => go({ name: 'history', tab, open: key }, { stay: true })} />
          : <div className="empty">{tab === 'exam' ? h.emptyExams : h.emptyPractice}</div>}
      </div>
      {opened && <AttemptSheet key={opened.key} e={opened} onClose={close} />}
    </div>
  );
}
