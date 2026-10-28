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
}

export interface ExamResult {
  date: number;
  n: number;
  right: number;
  pass: boolean;
  ms: number;
  timeout: boolean;
}

export interface FinishedExam {
  ids: string[];
  perm: Record<string, number[]>;
  ans: Record<string, number>;
  res: ExamResult;
  byCat: Partial<Record<CategoryId, [right: number, total: number]>>;
}

/** [times right, times wrong, last answer correct (1) or wrong (0)] */
export type QuestionStat = [number, number, 0 | 1];

export interface Prefs {
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
  | { name: 'practice'; mode: CategoryId | 'all' | 'wrong' | 'list'; ids?: string[] }
  | { name: 'vocab' }
  | { name: 'flashcards' };
