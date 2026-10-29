import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBrush } from '../features/brush/BrushProvider';
import { useT } from '../i18n';
import { useApp } from '../state/AppState';
import { Icon } from './Icons';
import { SettingsSheet } from './SettingsSheet';

export function Toolbar() {
  const { data, update, go, visit } = useApp();
  const brush = useBrush();
  const t = useT();
  const b = t.toolbar;
  const [nothingToTranslate, setNothing] = useState(false);
  useEffect(() => {
    if (!brush.on) return;
    const id = requestAnimationFrame(() => setNothing(!document.querySelector('main [data-block] .w')));
    return () => cancelAnimationFrame(id);
  }, [brush.on, visit]);
  const [settings, setSettings] = useState(false);
  const firstVisit = !data.prefs.seenBrushHint;
  const bar = useRef<HTMLElement>(null);

  // sticky screen headers sit right below the toolbar, whose height changes with the brush hint
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--bar-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pressBrush = () => {
    brush.pressButton();
    if (firstVisit) update(d => ({ ...d, prefs: { ...d.prefs, seenBrushHint: true } }));
  };

  return (
    <header className="bar" ref={bar}>
      <a className="skip-link" href="#main">{b.skip}</a>
      <div className="wrap bar-row">
        <button className="brand" onClick={() => go({ name: 'home' })} title={t.toHome}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <polygon points="50,2 98,50 50,98 2,50" fill="#fff" stroke="#333" strokeWidth={2} />
            <polygon points="50,18 82,50 50,82 18,50" fill="#f6c400" />
          </svg>
          <span className="brand-text"><small>Førerkort B</small><b>Teoriprøven</b></span>
          <span className="sr-only">{b.homeSr}</span>
        </button>
        <div className="tools">
          <button id="brushBtn" className={`tool brush${firstVisit ? ' pulse' : ''}`} aria-pressed={brush.on}
            onPointerDown={brush.keepSelection} onClick={pressBrush}
            title={b.translateTitle}>
            <Icon name="translate" /><span>{b.translate}</span>
          </button>
          <button className="tool icon" onClick={() => go({ name: 'vocab' })} title={b.vocab} aria-label={b.vocabLabel(data.vocab.length)}>
            <Icon name="book" />{data.vocab.length > 0 && <span className="badge">{data.vocab.length}</span>}
          </button>
          <button className="tool icon" onClick={() => setSettings(true)} title={b.settings} aria-label={b.settings}>
            <Icon name="gear" />
          </button>
        </div>
      </div>
      {brush.on && (
        <div className="brushhint">
          <div className="wrap">
            <Icon name="translate" />
            {nothingToTranslate ? (
              <span>{b.nothing}</span>
            ) : (
              <>
                <span className="hint-long">{b.hintLong}</span>
                <span className="hint-short">{b.hintShort}</span>
              </>
            )}
          </div>
        </div>
      )}
      {settings && <SettingsSheet onClose={() => setSettings(false)} />}
    </header>
  );
}
