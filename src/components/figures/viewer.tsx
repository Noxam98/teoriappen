import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useT } from '../../i18n';
import type { Figure as FigureSpec, Norwegian, TheoryBlock } from '../../types';
import { Icon } from '../Icons';

/** One picture in the full-screen viewer, with what it shows (a sign's name, a figure's caption). */
export interface FigureSlide {
  type: 'figure';
  spec: FigureSpec;
  numbered?: boolean;
  caption?: Norwegian;
}

type Open = (slides: FigureSlide[], index: number) => void;
const ViewerContext = createContext<Open>(() => {});

// the lightbox library is loaded the first time a picture is opened
const FigureLightbox = lazy(() => import('./FigureLightbox'));

/** Full screen for pictures: pinch or double-tap to zoom, swipe to the next picture, swipe down to close. */
export function ViewerProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<{ slides: FigureSlide[]; index: number } | null>(null);
  const open = useCallback<Open>((slides, index) => setShown({ slides, index }), []);
  // while it is open, the keys of the screen behind (1–4, arrows, Enter, Esc) stay with the viewer
  useEffect(() => {
    if (!shown) return;
    document.body.classList.add('viewer-open');
    return () => document.body.classList.remove('viewer-open');
  }, [shown]);
  return (
    <ViewerContext.Provider value={open}>
      {children}
      {shown && <Suspense fallback={null}><FigureLightbox {...shown} onClose={() => setShown(null)} /></Suspense>}
    </ViewerContext.Provider>
  );
}

/** All pictures of a theory chapter, in reading order, so that one swipe goes to the next. */
export interface Gallery { slides: FigureSlide[]; index: Map<object, number> }
const GalleryContext = createContext<Gallery | null>(null);
export const GalleryProvider = GalleryContext.Provider;

export function useChapterGallery(blocks: TheoryBlock[]): Gallery {
  return useMemo(() => {
    const slides: FigureSlide[] = [];
    const index = new Map<object, number>();
    const add = (key: object, slide: FigureSlide) => { index.set(key, slides.length); slides.push(slide); };
    for (const b of blocks) {
      if ('fig' in b) add(b, { type: 'figure', spec: b.fig, caption: b });
      else if ('signs' in b) for (const item of b.signs) add(item, { type: 'figure', spec: { sign: item.sign }, caption: item });
    }
    return { slides, index };
  }, [blocks]);
}

/**
 * A picture that opens full screen when tapped. `from` is the block or sign item it shows: inside a chapter it opens
 * the chapter's gallery at that picture, elsewhere just this picture.
 */
export function Zoomable({ slide, from, children }: { slide: FigureSlide; from?: object; children: ReactNode }) {
  const open = useContext(ViewerContext);
  const gallery = useContext(GalleryContext);
  const t = useT().viewer;
  const at = from && gallery ? gallery.index.get(from) : undefined;
  return (
    <div className="zoomable">
      {children}
      <button type="button" className="zoomable-btn" aria-label={t.open}
        onClick={() => (gallery && at !== undefined ? open(gallery.slides, at) : open([slide], 0))}>
        <span className="zoomable-ic" aria-hidden="true"><Icon name="expand" /></span>
      </button>
    </div>
  );
}
