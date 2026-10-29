import { CATEGORIES, QUESTIONS, QUESTION_BY_ID } from '../data';
import type { AppData, ExamSession, FinishedExam, QuestionStat, RevealMode } from '../types';
import { shuffle } from './text';

export const EXAM_QUESTIONS = 45;
export const EXAM_MINUTES = 90;
export const MAX_ERRORS = 7;

/** Picks 45 questions spread over the topics like the real test, preferring ones not yet answered correctly. */
export function pickExamQuestions(stats: Record<string, QuestionStat>): string[] {
  const chosen: string[] = [];
  const rank = (id: string) => (stats[id] ? stats[id][2] : -1);
  for (const cat of CATEGORIES) {
    const pool = shuffle(QUESTIONS.filter(q => q.cat === cat.id)).sort((a, b) => rank(a.id) - rank(b.id));
    chosen.push(...pool.slice(0, cat.inExam).map(q => q.id));
  }
  for (const q of shuffle(QUESTIONS)) {
    if (chosen.length >= Math.min(EXAM_QUESTIONS, QUESTIONS.length)) break;
    if (!chosen.includes(q.id)) chosen.push(q.id);
  }
  return shuffle(chosen.slice(0, EXAM_QUESTIONS));
}

export function createExam(stats: Record<string, QuestionStat>, reveal: RevealMode): ExamSession {
  const ids = pickExamQuestions(stats);
  const now = Date.now();
  return {
    ids,
    perm: Object.fromEntries(ids.map(id => [id, shuffle(QUESTION_BY_ID[id].a.map((_, i) => i))])),
    ans: {},
    flag: {},
    i: 0,
    start: now,
    end: now + EXAM_MINUTES * 60_000,
    reveal,
  };
}

/** Time left on the exam clock; a paused clock stands still. */
export const timeLeft = (s: ExamSession, now = Date.now()) => s.end - (s.paused ?? now);

/**
 * The exam clock runs only while the app is on screen. Going off screen stops it; coming back moves the start
 * and the deadline forward by the time it stood still, so neither the time left nor the time spent changes.
 */
export function setClock(s: ExamSession, running: boolean, now = Date.now()): ExamSession {
  if (!running) return s.paused ? s : { ...s, paused: now };
  if (!s.paused) return s;
  const { paused, ...rest } = s;
  const stood = Math.max(0, now - paused);
  return { ...rest, start: s.start + stood, end: s.end + stood };
}

export function gradeExam(session: ExamSession, timeout: boolean, practice?: FinishedExam['practice']): FinishedExam {
  let right = 0;
  const byCat: FinishedExam['byCat'] = {};
  for (const id of session.ids) {
    const ok = session.ans[id] === 0;
    if (ok) right++;
    const c = QUESTION_BY_ID[id].cat;
    const row = (byCat[c] ??= [0, 0]);
    row[1]++;
    if (ok) row[0]++;
  }
  const n = session.ids.length;
  return {
    kind: practice ? 'practice' : 'exam',
    practice,
    ids: session.ids,
    perm: session.perm,
    ans: session.ans,
    byCat,
    res: { date: Date.now(), n, right, pass: n - right <= MAX_ERRORS, ms: Math.min(Date.now(), session.end) - session.start, timeout },
  };
}

export function recordAnswer(stats: AppData['stats'], id: string, ok: boolean): AppData['stats'] {
  const [r, w] = stats[id] ?? [0, 0, 0];
  return { ...stats, [id]: [r + (ok ? 1 : 0), w + (ok ? 0 : 1), ok ? 1 : 0] };
}

/** Wrong answers so far (only meaningful when answers are shown instantly). */
export const errorCount = (s: Pick<ExamSession, 'ids' | 'ans'>) => s.ids.filter(id => s.ans[id] !== undefined && s.ans[id] !== 0).length;

/** Share of the question bank whose last answer was correct, 0–1. */
export const readiness = (stats: AppData['stats']) => QUESTIONS.filter(q => stats[q.id]?.[2] === 1).length / QUESTIONS.length;

export const wrongQuestionIds = (stats: AppData['stats']) =>
  QUESTIONS.filter(q => stats[q.id]?.[2] === 0).map(q => q.id);
