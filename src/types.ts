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

/**
 * A line of an underskilt: a distance («150 m»), a text («Gjelder ikke buss») or a time («8–17»; black for weekdays,
 * in parentheses for Saturdays, `red` for Sundays and holidays).
 */
export interface PlateLine { text: string; red?: boolean }

export type Figure =
  /** a sign; `under`: the underskilt below it, line by line */
  | { sign: string; under?: PlateLine[] }
  | { signs: string[] }
  | { light: LightState }
  | { road: RoadKind }
  | { scene: Scene };

/**
 * A text in the translation languages: the base one (Russian) always, the others once they are written.
 * Adding a language adds its key here and everywhere in the data.
 */
export type Translated = { ru: string } & Partial<Record<Lang, string>>;

/** A Norwegian text (translatable with the brush) and its translations. */
export type Norwegian = { no: string } & Translated;

/**
 * One piece of a theory chapter. Like Figure, the kind of block is told by its first key; the Norwegian text
 * goes under that key and its translations next to it.
 */
export type TheoryBlock =
  /** subheading */
  | { h: string } & Translated
  | { p: string } & Translated
  /** the rule to remember, highlighted */
  | { rule: string } & Translated
  /** a typical mistake on the exam */
  | { trap: string } & Translated
  /** bullet list */
  | { list: Norwegian[] }
  /** a picture with a caption */
  | { fig: Figure } & Norwegian
  /** signs with their names (and the underskilt below a sign) */
  | { signs: ({ sign: string; under?: PlateLine[] } & Norwegian)[] }
  /** numbers to know, e.g. { value: "0,2 ‰", no: "promillegrense", ru: "допустимое промилле", … } */
  | { nums: ({ value: string } & Norwegian)[] };

export interface TheoryChapter {
  cat: CategoryId;
  /** One or two sentences under the title. */
  lead: Norwegian;
  blocks: TheoryBlock[];
  /** Official sources the chapter was checked against: [title, https URL]. */
  sources?: [string, string][];
  /** When the facts were last checked against the sources (YYYY-MM). */
  checked?: string;
}

/** A question; its explanation's translations sit beside it, keyed by language (`ru`, `uk`, …). */
export interface Question extends Translated {
  id: string;
  cat: CategoryId;
  /** Question text (Norwegian bokmål). */
  q: string;
  img: Figure | null;
  /** Answer options; the correct one is always a[0] — the app shuffles them. */
  a: string[];
  /** Explanation in Norwegian. */
  f: string;
  /** The theory section that explains it, `<topic>/<section>` as in the address #/theory/<topic>/<section>. */
  theory?: string;
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

/**
 * The language of translations and of the interface. To add one: its code here, interface texts in src/i18n/<code>.ts,
 * the translations in the data (README: «Как добавить язык»).
 */
export type Lang = 'ru' | 'uk';

/** Theory text: Norwegian with the translation under it, Norwegian only, or the translation only. */
export type TheoryLang = 'both' | 'nb' | 'tr';

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
  /** When the exam was created: names it in the reading list (`start` moves on with every pause). */
  tid?: number;
}

/** One finished test in the history: an exam, or a practice round (no pass/fail). */
export interface ExamResult {
  /** Old saved results have no kind: exam. */
  kind?: 'exam' | 'practice';
  /** For practice: the topic. */
  mode?: PracticeMode;
  /** The test's id (when it began), shared with the questions marked in it for reading. */
  test?: number;
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
  theoryLang: TheoryLang;
  lang: Lang;
  /** The reader has picked the translation language (the choice is offered once, on the first start). */
  langChosen: boolean;
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

/** A question someone ticked "I want to read about this" on, in the test where it came up. */
export interface ReadLater {
  id: string;
  /** The test: ExamResult.test, ExamSession.tid, PracticeRound.start. */
  test: number;
  /** When it was opened from the list. */
  read?: number;
}

export interface AppData {
  stats: Record<string, QuestionStat>;
  /** The history: finished exams and practice rounds, oldest first. */
  exams: ExamResult[];
  /** Questions to read about after the test, of every test; kept with the history. */
  later: ReadLater[];
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
  | { name: 'history' }
  | { name: 'theory' }
  /** `section`: the heading in view, so a reload or a shared link opens that part of the chapter */
  | { name: 'chapter'; cat: CategoryId; section?: string };
