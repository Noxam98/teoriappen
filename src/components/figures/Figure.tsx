import type { Figure as FigureSpec } from '../../types';
import { JunctionScene } from './JunctionScene';
import { RoadMarking } from './RoadMarking';
import { sceneUrl } from './sceneImages';
import { Sign } from './Sign';
import { TrafficLight } from './TrafficLight';

/** The picture of a question: a sign (with a time plate under it), several signs (`numbered` 1, 2, 3 when the options refer to them), a traffic light, a road marking or a junction. */
export function Figure({ spec, numbered = false }: { spec: FigureSpec | null; numbered?: boolean }) {
  if (!spec) return null;
  if ('sign' in spec) return <div className="fig fig-sign"><Sign name={spec.sign} under={spec.under} /></div>;
  if ('signs' in spec) return (
    <div className="fig fig-signs">
      {spec.signs.map((s, i) => (
        <span key={i} className="fig-sign"><Sign name={s} />{numbered && <b className="sign-tag">{i + 1}</b>}</span>
      ))}
    </div>
  );
  if ('light' in spec) return <div className="fig fig-light"><TrafficLight state={spec.light} /></div>;
  if ('view' in spec) return (
    <div className="fig fig-view">
      <img className="view" src={sceneUrl(spec.view)} alt="Situasjon på veien" width={960} height={600} loading="lazy" decoding="async" />
    </div>
  );
  if ('road' in spec) return <div className="fig fig-road"><RoadMarking kind={spec.road} /></div>;
  return <div className="fig fig-scene"><JunctionScene scene={spec.scene} /></div>;
}
