import { TILE, MOVER } from '../config.js';

export function moverX(mover, time) {
  return mover.homeX + MOVER.range * TILE * Math.sin((2 * Math.PI * time) / MOVER.period + mover.col * MOVER.phasePerCol);
}

export function createMover(spec) {
  const mover = { id: spec.id, col: spec.col, homeX: spec.x, x: spec.x, y: spec.y, w: spec.width, dx: 0 };
  mover.x = moverX(mover, 0);
  return mover;
}

export function updateMovers(movers, time) {
  for (const m of movers) {
    const x = moverX(m, time);
    m.dx = x - m.x;
    m.x = x;
  }
}
