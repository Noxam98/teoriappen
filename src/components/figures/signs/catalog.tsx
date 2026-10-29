// Every road sign the app shows, keyed as in the question JSON files ({"sign": "vikeplikt"}): the official
// drawings of Statens vegvesen (public domain, from Wikimedia Commons), imported by scripts/import-signs.mjs.
import type { ReactElement } from 'react';
import { OFFICIAL } from './official';

export const SIGN_KEYS = Object.keys(OFFICIAL);

/** The drawing's size, from its viewBox. */
export function signSize(key: string): { w: number; h: number } | null {
  const vb = OFFICIAL[key]?.vb.split(/[\s,]+/).map(Number);
  return vb ? { w: vb[2], h: vb[3] } : null;
}

/**
 * The sign's drawing fitted into a box (by default 100×100, centred, proportions kept), for a picture that places
 * signs in its own coordinates: a junction, a road marking, a sign with an underskilt.
 */
export function signGraphic(key: string, box: { x?: number; y?: number; w?: number; h?: number } = {}): ReactElement | null {
  const o = OFFICIAL[key];
  if (!o) return null;
  return <svg x={box.x ?? 0} y={box.y ?? 0} width={box.w ?? 100} height={box.h ?? 100} viewBox={o.vb} dangerouslySetInnerHTML={{ __html: o.svg }} />;
}

/** The drawing as it is, for an <svg> of its own (its viewBox and contents). */
export const signDrawing = (key: string) => OFFICIAL[key] ?? null;
