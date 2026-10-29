import { HistoryList, useHistory } from '../components/History';
import { useT } from '../i18n';

/** Every test, newest first, with the reading lists made in them. */
export function HistoryScreen() {
  const t = useT().history;
  const entries = useHistory();
  return (
    <div className="history-screen">
      <div className="page-head">
        <div className="eyebrow">Historikk</div>
        <h1>{t.screen}</h1>
        <p className="muted">{t.sub}</p>
      </div>
      {entries.length ? <HistoryList entries={entries} /> : <div className="empty">{t.empty}</div>}
    </div>
  );
}
