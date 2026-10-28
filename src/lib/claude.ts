// Optional "translate in context" via Claude. Works only when the page is opened inside the claude.ai
// artifact viewer (window.claude exists there). Locally the app simply hides the button.

interface SampleError { code: string; message: string; text?: string }
interface SampleFn {
  json<T>(input: string, options?: { modelTier?: 'quick' | 'default' | 'complex'; signal?: AbortSignal }): Promise<T>;
}
declare global {
  interface Window {
    claude?: { use(name: 'sample'): Promise<SampleFn | null> };
  }
}

let samplePromise: Promise<SampleFn | null> | null = null;

export function getSample(): Promise<SampleFn | null> {
  if (!samplePromise) {
    samplePromise = window.claude?.use
      ? window.claude.use('sample').catch(() => null)
      : Promise.resolve(null);
  }
  return samplePromise;
}

export interface ContextTranslation {
  translation: string;
  base?: string;
  note?: string;
  sentence?: string;
}

export type ClaudeFailure = 'blocked' | 'busy' | 'cancelled' | 'failed';

const BLOCKED = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];

export function classifyError(e: unknown): ClaudeFailure {
  const code = (e as SampleError | undefined)?.code ?? '';
  if (code === 'cancelled') return 'cancelled';
  if (BLOCKED.includes(code)) return 'blocked';
  if (code === 'rate_limited') return 'busy';
  return 'failed';
}

export async function translateInContext(phrase: string, sentence: string, signal: AbortSignal): Promise<ContextTranslation> {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted', message: 'Claude is not available here' } satisfies SampleError;
  const what = phrase.includes(' ') ? 'норвежское выражение' : 'норвежское слово';
  const prompt = `Ты помогаешь русскоязычному человеку готовиться к теоретическому экзамену на водительские права в Норвегии (класс B).
Переведи ${what} «${phrase}» на русский язык именно в контексте этого предложения:
"${sentence.slice(0, 600)}"
Ответь только JSON: {"translation": "краткий перевод в этом контексте", "base": "словарная форма (с артиклем en/ei/et или å), если это одно слово, иначе пустая строка", "note": "одно короткое пояснение по-русски о грамматике или о значении термина в ПДД, до 20 слов", "sentence": "перевод всего предложения на русский"}`;
  const r = await sample.json<ContextTranslation>(prompt, { modelTier: 'quick', signal });
  return { translation: String(r?.translation ?? ''), base: r?.base, note: r?.note, sentence: r?.sentence };
}
