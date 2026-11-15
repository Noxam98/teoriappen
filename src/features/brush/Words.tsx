import { memo } from 'react';
import { segments } from '../../lib/text';
import { useSavedWords } from '../../state/AppState';

/**
 * Norwegian text where every word is a separate span the brush can paint. Wrap it in an element with `data-block`.
 * `marks`: lowercased words to show as highlighted — the ones translated here during a test.
 */
export const Words = memo(function Words({ text, marks }: { text: string; marks?: Set<string> }) {
  const saved = useSavedWords();
  return (
    <>
      {segments(text).map((s, i) => {
        if (!s.word) return s.text;
        const k = s.text.toLowerCase();
        return <span key={i} className={`w${saved.has(k) ? ' saved' : ''}${marks?.has(k) ? ' looked' : ''}`}>{s.text}</span>;
      })}
    </>
  );
});
