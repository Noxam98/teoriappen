import { useEffect, useState } from 'react';
import { HistoryList, useHistory } from '../components/History';
import { useT } from '../i18n';
import { useApp } from '../state/AppState';
import type { Screen, TestKind } from '../types';

/** Every test, newest first, in two tabs: exams and practice rounds. A test opens to its questions and words. */
export function HistoryScreen({ screen }: { screen: Extract<Screen, { name: 'history' }> }) {
  const { mark } = useApp();
  const h = useT().history;
  const entries = useHistory();
  const [tab, setTab] = useState<TestKind>(() => screen.tab ?? entries[0]?.kind ?? 'exam');
  // the address names the tab, so a reload or the back button returns to it
  useEffect(() => { mark({ name: 'history', tab }); }, [tab, mark]);
  const tabs: { kind: TestKind; no: string; sub: string }[] = [
    { kind: 'exam', no: 'Prøver', sub: h.exams },
    { kind: 'practice', no: 'Øving', sub: h.practice },
  ];
  const shown = entries.filter(e => e.kind === tab);

  return (
    <div className="history-screen">
      <div className="page-head">
        <div className="eyebrow">Historikk</div>
        <h1>{h.screen}</h1>
        <p className="muted">{h.sub}</p>
      </div>
      <div className="segmented history-tabs" role="tablist" aria-label={h.screen}>
        {tabs.map(x => (
          <button key={x.kind} role="tab" id={`tab-${x.kind}`} aria-selected={tab === x.kind} aria-controls="history-panel" onClick={() => setTab(x.kind)}>
            <span lang="nb">{x.no}</span>
            <small className="tnum">{x.sub} · {entries.filter(e => e.kind === x.kind).length}</small>
          </button>
        ))}
      </div>
      <div id="history-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {shown.length ? <HistoryList key={tab} entries={shown} /> : <div className="empty">{tab === 'exam' ? h.emptyExams : h.emptyPractice}</div>}
      </div>
    </div>
  );
}
