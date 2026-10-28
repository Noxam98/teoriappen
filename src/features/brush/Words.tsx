import { memo } from 'react';
import { segments } from '../../lib/text';
import { useSavedWords } from '../../state/AppState';

/** Norwegian text where every word is a separate span the brush can paint. Wrap it in an element with `data-block`. */
export const Words = memo(function Words({ text }: { text: string }) {
  const saved = useSavedWords();
  return (
    <>
      {segments(text).map((s, i) =>
        s.word
          ? <span key={i} className={saved.has(s.text.toLowerCase()) ? 'w saved' : 'w'}>{s.text}</span>
          : s.text,
      )}
    </>
  );
});
