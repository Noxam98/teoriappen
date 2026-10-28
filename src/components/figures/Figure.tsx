import type { Figure as FigureSpec } from '../../types';
import { JunctionScene } from './JunctionScene';
import { RoadMarking } from './RoadMarking';
import { Sign } from './Sign';
import { TrafficLight } from './TrafficLight';

/** The picture of a question: a sign, several signs, a traffic light, a road marking or a junction. */
export function Figure({ spec }: { spec: FigureSpec | null }) {
  if (!spec) return null;
  if ('sign' in spec) return <div className="fig fig-sign"><Sign name={spec.sign} /></div>;
  if ('signs' in spec) return <div className="fig fig-signs">{spec.signs.map((s, i) => <Sign key={i} name={s} />)}</div>;
  if ('light' in spec) return <div className="fig fig-light"><TrafficLight state={spec.light} /></div>;
  if ('road' in spec) return <div className="fig fig-road"><RoadMarking kind={spec.road} /></div>;
  return <div className="fig fig-scene"><JunctionScene scene={spec.scene} /></div>;
}
