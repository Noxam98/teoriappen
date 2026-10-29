export type CategoryId =
  | 'vikeplikt' | 'skilt' | 'lyssignal' | 'oppmerking' | 'fart' | 'plassering' | 'forbikjoring' | 'parkering'
  | 'mennesket' | 'myke' | 'sikring' | 'lys' | 'kjoretoy' | 'vinter' | 'ulykke' | 'miljo' | 'forerkort';

export type LightState = 'rod' | 'rodgul' | 'gronn' | 'gul' | 'gulblink' | 'gronnpil_h' | 'gronnpil_v';

export type RoadKind =
  | 'sperrelinje' | 'dobbel_sperrelinje' | 'varsellinje' | 'skillelinje' | 'sperre_varsel' | 'varsel_sperre'
  | 'haitenner' | 'stopplinje' | 'sykkelfelt' | 'kollektivfelt' | 'sperreflate' | 'gangfelt';

/** Side of a junction: the vehicle comes FROM this leg (n = top of the picture). */
export type Leg = 'n' | 'e' | 's' | 'w';
export type VehicleKind = 'car' | 'bus' | 'bike' | 'tram' | 'utrykning' | 'truck';

export interface SceneVehicle {
  id: string;
  from: Leg;
  go: 'straight' | 'left' | 'right';
  kind?: VehicleKind;
  /** The learner's own car. */
  me?: boolean;
}

export interface Scene {
  /** x = crossroads, t = T-junction without the north leg */
  type: 'x' | 't';
  signs?: Partial<Record<Leg, 'vikeplikt' | 'stopp' | 'forkjorsveg'>>;
  veh: SceneVehicle[];
  /** Legs with a zebra crossing and a pedestrian. */
  ped?: Leg[];
  /** Where the pedestrian is: waiting at the kerb (default) or already walking on the crossing. */
  pedAt?: 'kerb' | 'crossing';
}

export type Figure =
  | { sign: string }
  | { signs: string[] }
  | { light: LightState }
  | { road: RoadKind }
  | { scene: Scene };

/**
 * One piece of a theory chapter. Norwegian text (translatable with the brush) goes with its Russian translation.
 * Like Figure, the kind of block is told by its first key.
 */
export type TheoryBlock =
  /** subheading */
  | { h: string; ru: string }
  | { p: string; ru: string }
  /** the rule to remember, highlighted */
  | { rule: string; ru: string }
  /** a typical mistake on the exam */
  | { trap: string; ru: string }
  /** bullet list: [Norwegian, Russian] */
  | { list: [string, string][] }
  /** a picture with a caption */
  | { fig: Figure; no: string; ru: string }
  /** signs with their names: [sign, Norwegian, Russian] */
  | { signs: [string, string, string][] }
  /** numbers to know: [value, Norwegian, Russian], e.g. ["0,2 ‰", "promillegrense", "допустимое промилле"] */
  | { nums: [string, string, string][] };

export interface TheoryChapter {
  cat: CategoryId;
  /** One or two sentences under the title. */
  lead: string;
  leadRu: string;
  blocks: TheoryBlock[];
  /** Official sources the chapter was checked against: [title, https URL]. */
  sources?: [string, string][];
  /** When the facts were last checked against the sources (YYYY-MM). */
  checked?: string;
}

export interface Question {
  id: string;
  cat: CategoryId;
  /** Question text (Norwegian bokmål). */
  q: string;
  img: Figure | null;
  /** Answer options; the correct one is always a[0] — the app shuffles them. */
  a: string[];
  /** Explanation in Norwegian. */
  f: string;
  /** Explanation in Russian. */
  ru: string;
  /**
   * The options name the signs of the picture by number ("Skilt 1 …", "Skilt 2 …"): the signs get numbers,
   * and the options are shown in that order instead of shuffled, so plate 1 is always sign 1.
   */
  byNumber?: boolean;
}

/** [dictionary form, Russian translation, grammar note] */
export type DictEntry = [string, string, string?];

export interface VocabItem {
  /** lowercased key (word or phrase) */
  w: string;
  show: string;
  lemma: string;
  tr: string;
  gram: string;
  ctx: string;
  t: number;
}

export type TheoryLang = 'both' | 'nb' | 'ru';

/** When the correct answer is shown: right after each question, or only at the end. */
export type RevealMode = 'instant' | 'end';

export interface ExamSession {
  ids: string[];
  /** Shuffled option order per question. */
  perm: Record<string, number[]>;
  /** Chosen option (index into Question.a) per question. */
  ans: Record<string, number>;
  flag: Record<string, boolean>;
  i: number;
  start: number;
  end: number;
  /** Fixed when the exam starts; old saved sessions have none and count as 'end'. */
  reveal?: RevealMode;
  /** Set while the clock stands still because the app is off screen (tab hidden, browser minimised, app closed). */
  paused?: number;
}

export interface ExamResult {
  date: number;
  n: number;
  right: number;
  pass: boolean;
  ms: number;
  timeout: boolean;
}

export type PracticeMode = CategoryId | 'all' | 'wrong' | 'list';

export interface FinishedExam {
  /** A timed exam, or a finished practice round (no pass/fail). Old saved results have no kind: exam. */
  kind?: 'exam' | 'practice';
  /** For practice: the topic, to offer "once more". */
  practice?: { mode: PracticeMode; title: [string, string] };
  ids: string[];
  perm: Record<string, number[]>;
  ans: Record<string, number>;
  res: ExamResult;
  byCat: Partial<Record<CategoryId, [right: number, total: number]>>;
}

/** [times right, times wrong, last answer correct (1) or wrong (0)] */
export type QuestionStat = [number, number, 0 | 1];

export interface Prefs {
  reveal: RevealMode;
  /** Short vibration after an answer (Android). */
  haptics: boolean;
  /** UI sounds and their volume (quiet / normal / loud). */
  sound: boolean;
  volume: 0 | 1 | 2;
  size: 0 | 1 | 2;
  ru: boolean;
  /** Theory text: Norwegian with the Russian under it, Norwegian only, or Russian only. */
  theoryLang: TheoryLang;
  seenBrushHint: boolean;
}

/** A practice round in progress, kept so that a reload continues it at the same question. */
export interface PracticeRound {
  mode: PracticeMode;
  ids: string[];
  i: number;
  ans: Record<string, number>;
  perm: Record<string, number[]>;
  start: number;
  instant: boolean;
}

export interface AppData {
  stats: Record<string, QuestionStat>;
  exams: ExamResult[];
  vocab: VocabItem[];
  cur: ExamSession | null;
  last: FinishedExam | null;
  practice: PracticeRound | null;
  /** Theory chapters read to the end (when). */
  read: Partial<Record<CategoryId, number>>;
  prefs: Prefs;
}

export type Screen =
  | { name: 'home' }
  | { name: 'exam' }
  | { name: 'result' }
  /** `q`: the question on screen (a reload or a shared link opens it) */
  | { name: 'practice'; mode: PracticeMode; ids?: string[]; q?: string }
  | { name: 'vocab' }
  | { name: 'flashcards' }
  | { name: 'theory' }
  /** `section`: the heading in view, so a reload or a shared link opens that part of the chapter */
  | { name: 'chapter'; cat: CategoryId; section?: string };
