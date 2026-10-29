// Figure lab (npm run dev → /debug.html): every drawn picture and every question card on one page,
// with automatic geometry checks. Problems are listed at the top and outlined in red.
import { useEffect, useState } from 'react';
import { Figure } from '../components/figures/Figure';
import { JunctionScene } from '../components/figures/JunctionScene';
import { RoadMarking } from '../components/figures/RoadMarking';
import { Sign } from '../components/figures/Sign';
import { SIGN_KEYS } from '../components/figures/signs/catalog';
import { TrafficLight } from '../components/figures/TrafficLight';
import { Options } from '../components/question/Options';
import { QuestionBody } from '../components/question/QuestionCard';
import { QUESTIONS } from '../data';
import type { LightState, RoadKind } from '../types';
import { checkCard, checkScene, checkSign, checkViewBox, checkWithin, type Problem } from './checks';

const LIGHTS: LightState[] = ['rod', 'rodgul', 'gronn', 'gul', 'gulblink', 'gronnpil_h', 'gronnpil_v'];
const ROADS: RoadKind[] = ['sperrelinje', 'dobbel_sperrelinje', 'varsellinje', 'skillelinje', 'sperre_varsel', 'varsel_sperre',
  'haitenner', 'stopplinje', 'sykkelfelt', 'kollektivfelt', 'sperreflate', 'gangfelt'];
const SCENES = QUESTIONS.filter(q => q.img && 'scene' in q.img);

export function FigureLab() {
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    // wait for fonts, then measure
    document.fonts.ready.then(() => requestAnimationFrame(() => {
      const out: Problem[] = [];
      document.querySelectorAll('[data-problem]').forEach(e => e.removeAttribute('data-problem'));
      for (const cell of document.querySelectorAll<HTMLElement>('[data-figure]')) {
        const svg = cell.querySelector<SVGSVGElement>('svg')!;
        const where = cell.dataset.figure!;
        checkViewBox(svg, where, out);
        if (svg.classList.contains('sign')) checkSign(svg, where, out);
        if (svg.classList.contains('road')) checkWithin(svg, where, out);
        if (svg.classList.contains('scene')) {
          checkScene(svg, where, out);
          svg.querySelectorAll<SVGSVGElement>('svg[data-scene-sign]').forEach(s => checkSign(s, where + ' (sign)', out));
        }
      }
      for (const card of document.querySelectorAll<HTMLElement>('[data-card]')) checkCard(card, card.dataset.card!, out);
      out.forEach(p => p.el.setAttribute('data-problem', ''));
      setProblems(out);
    }));
  }, [width]);

  return (
    <div className="lab">
      <header className="lab-head">
        <h1>Figure lab</h1>
        <label>Card width <select id="w" value={width} onChange={e => setWidth(Number(e.target.value))}>
          {[300, 320, 360, 390].map(w => <option key={w} value={w}>{w}px</option>)}
        </select></label>
        <pre id="problems">{problems === null ? 'checking…' : problems.length ? problems.map(p => `✗ ${p.where}: ${p.what}`).join('\n') : '✓ no problems'}</pre>
      </header>

      <h2>Signs ({SIGN_KEYS.length})</h2>
      <div className="lab-grid">
        {SIGN_KEYS.map(k => <figure key={k} data-figure={`sign ${k}`}><Sign name={k} /><figcaption>{k}</figcaption></figure>)}
      </div>
      <h2>Lights</h2>
      <div className="lab-grid">
        {LIGHTS.map(k => <figure key={k} data-figure={`light ${k}`}><TrafficLight state={k} /><figcaption>{k}</figcaption></figure>)}
      </div>
      <h2>Road markings</h2>
      <div className="lab-grid wide">
        {ROADS.map(k => <figure key={k} data-figure={`road ${k}`}><RoadMarking kind={k} /><figcaption>{k}</figcaption></figure>)}
      </div>
      <h2>Junction scenes ({SCENES.length})</h2>
      <div className="lab-grid wide">
        {SCENES.map(q => (
          <figure key={q.id} data-figure={`scene ${q.id}`}>
            {q.img && 'scene' in q.img && <JunctionScene scene={q.img.scene} />}
            <figcaption>{q.id}</figcaption>
          </figure>
        ))}
      </div>
      <h2>Question cards at {width}px ({QUESTIONS.length})</h2>
      <div className="lab-cards" style={{ ['--card-w' as string]: `${width}px` }}>
        {QUESTIONS.map(q => (
          <article key={q.id} className="qcard" data-card={q.id}>
            <div className="qmeta"><span className="qn">{q.id}</span></div>
            <QuestionBody q={q} />
            <Options q={q} order={q.a.map((_, i) => i)} chosen={0} reveal />
          </article>
        ))}
      </div>
      <div hidden><Figure spec={null} /></div>
    </div>
  );
}
