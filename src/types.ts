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
}

export type Figure =
  | { sign: string }
  | { signs: string[] }
  | { light: LightState }
  | { road: RoadKind }
  | { scene: Scene };

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
  size: 0 | 1 | 2;
  ru: boolean;
  seenBrushHint: boolean;
}

export interface AppData {
  stats: Record<string, QuestionStat>;
  exams: ExamResult[];
  vocab: VocabItem[];
  cur: ExamSession | null;
  last: FinishedExam | null;
  prefs: Prefs;
}

export type Screen =
  | { name: 'home' }
  | { name: 'exam' }
  | { name: 'result' }
  | { name: 'practice'; mode: PracticeMode; ids?: string[] }
  | { name: 'vocab' }
  | { name: 'flashcards' };
