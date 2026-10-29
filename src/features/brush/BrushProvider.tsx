// Word translation ("Перевод" in the toolbar; internally the brush): switch it on, then tap a word or
// drag across several words to highlight them — a popover shows the Russian translation. Selecting text first and then pressing
// the brush button translates the selection.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { wordsOf } from '../../lib/text';

export interface Rect { left: number; right: number; top: number; bottom: number }

export interface TranslationRequest {
  id: number;
  words: string[];
  /** What the user marked, as written. */
  text: string;
  /** The sentence the words come from (for "translate in context"). */
  context: string;
  rect: Rect;
}

interface BrushApi {
  on: boolean;
  setOn: (on: boolean) => void;
  request: TranslationRequest | null;
  close: () => void;
  /** Brush button: translates a pending text selection, otherwise toggles the brush. */
  pressButton: () => void;
  /** Call from the brush button's pointerdown so a text selection survives the click. */
  keepSelection: (e: React.PointerEvent) => void;
}

const BrushContext = createContext<BrushApi | null>(null);

const clearPaint = () => document.querySelectorAll<HTMLElement>('[data-paint]').forEach(el => delete el.dataset.paint);
const blockOf = (node: Node | null) => (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>('[data-block]') ?? null;

interface Stroke { block: HTMLElement; words: HTMLElement[]; a: number; b: number; pointer: number }

export function BrushProvider({ children }: { children: ReactNode }) {
  const [on, setOnState] = useState(false);
  const [request, setRequest] = useState<TranslationRequest | null>(null);
  const onRef = useRef(on);
  const requestRef = useRef(request);
  const stroke = useRef<Stroke | null>(null);
  const justStroked = useRef(false);
  const selection = useRef<{ text: string; block: HTMLElement | null; rect: Rect } | null>(null);
  const nextId = useRef(1);
  onRef.current = on;
  requestRef.current = request;

  const close = useCallback(() => { setRequest(null); clearPaint(); }, []);
  const open = useCallback((r: Omit<TranslationRequest, 'id'>) => setRequest({ ...r, id: nextId.current++ }), []);

  const setOn = useCallback((value: boolean) => {
    setOnState(value);
    document.body.classList.toggle('brush-on', value);
    if (!value) close();
  }, [close]);

  useEffect(() => {
    const paint = (s: Stroke) => {
      const [a, b] = [Math.min(s.a, s.b), Math.max(s.a, s.b)];
      s.words.forEach((w, i) => { if (i >= a && i <= b) w.dataset.paint = '1'; else delete w.dataset.paint; });
    };

    const down = (e: PointerEvent) => {
      const target = e.target as Element;
      // tap outside closes the popover
      if (requestRef.current && !target.closest('.pop, #brushBtn') && !(onRef.current && target.closest('.w'))) close();
      if (!onRef.current || e.button > 0) return;
      const word = target.closest<HTMLElement>('.w');
      const block = word?.closest<HTMLElement>('[data-block]');
      if (!word || !block) return;
      e.preventDefault();
      clearPaint();
      setRequest(null);
      const words = [...block.querySelectorAll<HTMLElement>('.w')];
      const i = words.indexOf(word);
      stroke.current = { block, words, a: i, b: i, pointer: e.pointerId };
      paint(stroke.current);
    };

    const move = (e: PointerEvent) => {
      const s = stroke.current;
      if (!s || e.pointerId !== s.pointer) return;
      const word = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.w');
      if (word && s.block.contains(word)) {
        const i = s.words.indexOf(word);
        if (i !== s.b) { s.b = i; paint(s); }
      }
    };

    const up = (e: PointerEvent) => {
      const s = stroke.current;
      if (!s || e.pointerId !== s.pointer) return;
      stroke.current = null;
      const spans = s.words.slice(Math.min(s.a, s.b), Math.max(s.a, s.b) + 1);
      const first = spans[0].getBoundingClientRect(), last = spans[spans.length - 1].getBoundingClientRect();
      const words = spans.map(w => w.textContent ?? '');
      open({
        words,
        text: words.join(' '),
        context: s.block.textContent?.trim() ?? '',
        rect: { left: first.left, right: last.right, top: Math.min(first.top, last.top), bottom: Math.max(first.bottom, last.bottom) },
      });
      // the click that follows this stroke must not select an answer option
      justStroked.current = true;
      setTimeout(() => { justStroked.current = false; }, 60);
    };

    const cancel = () => { if (stroke.current) { stroke.current = null; clearPaint(); } };

    const click = (e: MouseEvent) => {
      if (justStroked.current) { e.stopPropagation(); e.preventDefault(); justStroked.current = false; }
    };

    const selectionChange = () => {
      const sel = window.getSelection();
      const text = sel && !sel.isCollapsed ? sel.toString().trim() : '';
      const block = text ? blockOf(sel!.anchorNode) : null;
      if (text && block) {
        const r = sel!.getRangeAt(0).getBoundingClientRect();
        selection.current = { text: text.slice(0, 300), block, rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom } };
      } else selection.current = null;
    };

    const key = (e: KeyboardEvent) => {
      if (document.querySelector('.modal') || document.body.classList.contains('viewer-open') || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as Element).closest?.('input, textarea')) return;
      if (e.key === 'Escape') {
        if (requestRef.current) close();
        else if (onRef.current) setOn(false);
      } else if (['t', 'T', 'е', 'Е', 'b', 'B', 'и', 'И'].includes(e.key)) setOn(!onRef.current);
    };

    document.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('click', click, true);
    document.addEventListener('selectionchange', selectionChange);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('click', click, true);
      document.removeEventListener('selectionchange', selectionChange);
      document.removeEventListener('keydown', key);
    };
  }, [close, open, setOn]);

  const api = useMemo<BrushApi>(() => ({
    on,
    setOn,
    request,
    close,
    keepSelection(e) { if (selection.current) e.preventDefault(); },
    pressButton() {
      const sel = selection.current;
      const words = sel ? wordsOf(sel.text) : [];
      if (sel && words.length) {
        open({ words, text: sel.text, context: sel.block?.textContent?.trim() ?? sel.text, rect: sel.rect });
        window.getSelection()?.removeAllRanges();
        selection.current = null;
        return;
      }
      setOn(!on);
    },
  }), [on, setOn, request, close, open]);

  return <BrushContext.Provider value={api}>{children}</BrushContext.Provider>;
}

export function useBrush(): BrushApi {
  const api = useContext(BrushContext);
  if (!api) throw new Error('useBrush must be used inside <BrushProvider>');
  return api;
}
