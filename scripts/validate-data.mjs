// Checks the question bank, the theory chapters and the dictionary:  npm run validate
// - every question has the right shape, a known category, 3–4 options and a valid picture
// - every theory chapter has known block types, Russian translations and valid pictures
// - every Norwegian word in questions, options, explanations and theory has a dictionary entry
// Drafting new text: `node scripts/validate-data.mjs --words draft.json fart lys` also reads the entries in
// draft.json ({ "words": {…}, "phrases": {…} }) and checks only the named theory chapters.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));

const CATS = {
  vikeplikt: 'vik', lyssignal: 'sig', skilt: 'sk', oppmerking: 'opp', fart: 'far', plassering: 'pla',
  forbikjoring: 'fob', parkering: 'par', mennesket: 'men', myke: 'myk', sikring: 'sik', lys: 'lys',
  kjoretoy: 'kjt', vinter: 'vin', ulykke: 'uly', miljo: 'mil', forerkort: 'fk',
};
const LIGHTS = ['rod', 'rodgul', 'gronn', 'gul', 'gulblink', 'gronnpil_h', 'gronnpil_v'];
const ROADS = ['sperrelinje', 'dobbel_sperrelinje', 'varsellinje', 'skillelinje', 'sperre_varsel', 'varsel_sperre',
  'haitenner', 'stopplinje', 'sykkelfelt', 'kollektivfelt', 'sperreflate', 'gangfelt'];
const KINDS = ['car', 'bus', 'bike', 'tram', 'utrykning', 'truck'];
const ORDER = ['n', 'e', 's', 'w'];
const WORD = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*/g;

// sign names are the keys of the SIGNS table in catalog.tsx (+ generated speed signs)
const catalog = readFileSync(join(root, 'src/components/figures/signs/catalog.tsx'), 'utf8');
const SIGNS = new Set([...catalog.matchAll(/^ {2}(\w+): \(\) =>/gm)].map(m => m[1]));
for (const n of [30, 40, 50, 60, 70, 80, 90, 100, 110]) SIGNS.add(`fart_${n}`);
for (const n of [60, 70, 80]) SIGNS.add(`slutt_fart_${n}`);

const errors = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const ids = new Set();
const counts = {};
const args = process.argv.slice(2);
const draftAt = args.indexOf('--words');
const draft = draftAt >= 0 ? JSON.parse(readFileSync(args.splice(draftAt, 2)[1], 'utf8')) : {};
const onlyChapters = args;
const words = { ...read('src/data/dictionary/words.json'), ...(draft.words ?? {}) };
for (const [w, e] of Object.entries(draft.words ?? {})) {
  if (w !== w.toLowerCase()) err(`--words`, `key "${w}" must be lowercase`);
  if (!Array.isArray(e) || e.length !== 3 || e.some(x => typeof x !== 'string' || !x.trim())) err('--words', `entry "${w}" must be [lemma, translation, grammar]`);
}
const missing = new Map();
const checkWords = (id, text) => {
  for (const m of String(text).matchAll(WORD)) {
    const w = m[0].toLowerCase();
    if (!words[w]) missing.set(w, id);
  }
};

const dir = 'src/data/questions';
for (const file of readdirSync(join(root, dir)).filter(f => f.endsWith('.json'))) {
  for (const q of read(join(dir, file))) {
    const id = q.id ?? `(no id in ${file})`;
    if (ids.has(id)) err(id, 'duplicate id');
    ids.add(id);
    if (!CATS[q.cat]) err(id, `unknown category "${q.cat}"`);
    else if (!id.startsWith(`${CATS[q.cat]}-`)) err(id, `id should start with "${CATS[q.cat]}-"`);
    if (`${q.cat}.json` !== file) err(id, `category "${q.cat}" is in ${file}`);
    counts[q.cat] = (counts[q.cat] ?? 0) + 1;
    for (const k of ['q', 'f', 'ru']) if (typeof q[k] !== 'string' || q[k].trim().length < 5) err(id, `missing "${k}"`);
    if (!Array.isArray(q.a) || q.a.length < 3 || q.a.length > 4) err(id, '"a" needs 3–4 options (correct one first)');
    else if (new Set(q.a).size !== q.a.length) err(id, 'duplicate options');
    checkFigure(id, q.img);
    if (q.byNumber !== undefined) {
      // options name the numbered signs: "Skilt 1 …", "Skilt 2 …", each sign once
      const nums = (q.a ?? []).map(a => Number(/^Skilt (\d)\b/.exec(a)?.[1]));
      const n = q.img?.signs?.length ?? 0;
      if (q.byNumber !== true || !n) err(id, '"byNumber" needs a picture with several signs');
      else if (nums.some(x => !(x >= 1 && x <= n)) || new Set(nums).size !== nums.length) err(id, `with "byNumber" every option starts with "Skilt 1" … "Skilt ${n}", each number once`);
    }
    for (const text of [q.q, ...(q.a ?? []), q.f]) checkWords(id, text);
  }
}

// theory: one chapter per topic, every Norwegian text with its Russian translation
const BLOCKS = ['h', 'p', 'rule', 'trap', 'list', 'fig', 'signs', 'nums'];
const tdir = 'src/data/theory';
const chapters = existsSync(join(root, tdir)) ? readdirSync(join(root, tdir)).filter(f => f.endsWith('.json')) : [];
const text = (id, v, what) => { if (typeof v !== 'string' || v.trim().length < 2) err(id, `missing ${what}`); };
for (const file of chapters) {
  const cat = file.replace(/\.json$/, '');
  if (onlyChapters.length && !onlyChapters.includes(cat)) continue;
  const ch = read(join(tdir, file));
  const id = `theory/${file}`;
  if (ch.cat !== cat) err(id, `"cat" should be "${cat}"`);
  if (!CATS[cat]) err(id, `unknown category "${cat}"`);
  text(id, ch.lead, '"lead"'); text(id, ch.leadRu, '"leadRu"');
  checkWords(id, ch.lead);
  for (const s of ch.sources ?? []) {
    if (!Array.isArray(s) || s.length !== 2 || typeof s[0] !== 'string' || !/^https:\/\/\S+$/.test(s[1] ?? '')) err(id, `source must be ["title", "https://…"]: ${JSON.stringify(s)}`);
  }
  if (ch.checked !== undefined && !/^\d{4}-\d{2}$/.test(ch.checked)) err(id, '"checked" must look like "2026-10"');
  if (!Array.isArray(ch.blocks) || ch.blocks.length < 3) { err(id, 'needs at least 3 blocks'); continue; }
  ch.blocks.forEach((b, i) => {
    const bid = `${id} block ${i + 1}`;
    const type = Object.keys(b)[0];
    if (!BLOCKS.includes(type)) return err(bid, `unknown block "${type}" (one of ${BLOCKS.join(', ')})`);
    if (['h', 'p', 'rule', 'trap'].includes(type)) {
      text(bid, b[type], `"${type}"`); text(bid, b.ru, '"ru"'); checkWords(bid, b[type]);
    } else if (type === 'list') {
      if (!b.list.length) err(bid, 'empty list');
      for (const [no, ru] of b.list) { text(bid, no, 'list item'); text(bid, ru, 'list item translation'); checkWords(bid, no); }
    } else if (type === 'fig') {
      checkFigure(bid, b.fig); text(bid, b.no, '"no" caption'); text(bid, b.ru, '"ru" caption'); checkWords(bid, b.no);
    } else if (type === 'signs') {
      for (const [sign, no, ru] of b.signs) {
        if (!SIGNS.has(sign)) err(bid, `unknown sign "${sign}"`);
        text(bid, no, `name of ${sign}`); text(bid, ru, `translation of ${sign}`); checkWords(bid, no);
      }
    } else if (type === 'nums') {
      for (const [value, no, ru] of b.nums) { text(bid, value, 'value'); text(bid, no, 'label'); text(bid, ru, 'label translation'); checkWords(bid, no); }
    }
  });
}

function checkFigure(id, img) {
  if (img == null) return;
  const keys = Object.keys(img);
  if (keys.length !== 1) return err(id, 'img must have exactly one key');
  const [type] = keys;
  if (type === 'sign') { if (!SIGNS.has(img.sign)) err(id, `unknown sign "${img.sign}"`); }
  else if (type === 'signs') { for (const s of img.signs) if (!SIGNS.has(s)) err(id, `unknown sign "${s}"`); }
  else if (type === 'light') { if (!LIGHTS.includes(img.light)) err(id, `unknown light "${img.light}"`); }
  else if (type === 'road') { if (!ROADS.includes(img.road)) err(id, `unknown road marking "${img.road}"`); }
  else if (type === 'scene') {
    const s = img.scene;
    const legs = s.type === 't' ? ['w', 'e', 's'] : ORDER;
    if (!['x', 't'].includes(s.type)) err(id, 'scene.type must be "x" or "t"');
    for (const [leg, sign] of Object.entries(s.signs ?? {})) {
      if (!legs.includes(leg)) err(id, `sign on missing leg "${leg}"`);
      if (!['vikeplikt', 'stopp', 'forkjorsveg'].includes(sign)) err(id, `sign "${sign}" not allowed in scenes`);
    }
    if (s.pedAt !== undefined && !['kerb', 'crossing'].includes(s.pedAt)) err(id, `scene.pedAt must be "kerb" or "crossing"`);
    for (const v of s.veh ?? []) {
      if (!legs.includes(v.from)) err(id, `vehicle ${v.id} comes from missing leg "${v.from}"`);
      if (v.kind && !KINDS.includes(v.kind)) err(id, `unknown vehicle kind "${v.kind}"`);
      const i = ORDER.indexOf(v.from);
      const to = v.go === 'straight' ? ORDER[(i + 2) % 4] : v.go === 'left' ? ORDER[(i + 1) % 4] : ORDER[(i + 3) % 4];
      if (!legs.includes(to)) err(id, `vehicle ${v.id} drives into missing leg "${to}"`);
    }
  } else err(id, `unknown picture type "${type}"`);
}

for (const [w, id] of missing) err(id, `no dictionary entry for "${w}" (src/data/dictionary/words.json)`);

console.log(`${ids.size} questions in ${Object.keys(counts).length} topics, ${chapters.length} theory chapters, ${Object.keys(words).length} dictionary words`);
console.log(Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(' · '));
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('OK');
