import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import { tr, useT } from '../../i18n';
import { useApp } from '../../state/AppState';
import { Figure } from './Figure';
import type { FigureSlide } from './viewer';

declare module 'yet-another-react-lightbox' {
  interface SlideTypes { figure: FigureSlide }
}

/** The full-screen viewer itself (loaded on first use): the picture large, zoomable, with its caption below. */
export default function FigureLightbox({ slides, index, onClose }: { slides: FigureSlide[]; index: number; onClose: () => void }) {
  const { data } = useApp();
  const t = useT().viewer;
  const [at, setAt] = useState(index);
  const many = slides.length > 1;
  const caption = slides[at]?.caption;
  const mode = data.prefs.theoryLang;
  return (
    <Lightbox
      open close={onClose} index={index} slides={slides} plugins={[Zoom]} className="viewer"
      on={{ view: ({ index: i }) => setAt(i) }}
      carousel={{ finite: true, padding: 16, spacing: 24 }}
      controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
      zoom={{ supports: ['figure'], maxZoom: 6, scrollToZoom: true, doubleClickMaxStops: 2 }}
      labels={{
        Previous: t.prev, Next: t.next, Close: t.close, 'Zoom in': t.zoomIn, 'Zoom out': t.zoomOut,
        Lightbox: t.title, Carousel: t.title, 'Photo gallery': t.title, Slide: t.slide, '{index} of {total}': t.of,
      }}
      render={{
        slide: ({ slide }) => slide.type === 'figure'
          ? <div className="viewer-fig"><Figure spec={slide.spec} numbered={slide.numbered} /></div>
          : null,
        buttonPrev: many ? undefined : () => null,
        buttonNext: many ? undefined : () => null,
        controls: () => (
          <>
            {many && <div className="viewer-count tnum" aria-hidden="true">{at + 1} / {slides.length}</div>}
            {caption && (
              <div className="viewer-caption">
                {mode !== 'tr' && <p lang="nb">{caption.no}</p>}
                {mode !== 'nb' && <p className={mode === 'tr' ? undefined : 'viewer-tr'}>{tr(caption, data.prefs.lang)}</p>}
              </div>
            )}
          </>
        ),
      }}
    />
  );
}
