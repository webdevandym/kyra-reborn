import { TILE, MOVER, LIFT } from '../config.js';

const phase = (mover, time, period) => (2 * Math.PI * time) / period + mover.col * MOVER.phasePerCol;

export function moverX(mover, time) {
  if (mover.axis === 'y') return mover.homeX;
  return mover.homeX + MOVER.range * TILE * Math.sin(phase(mover, time, MOVER.period));
}

export function moverY(mover, time) {
  if (mover.axis !== 'y') return mover.homeY;
  return mover.homeY + LIFT.range * TILE * Math.sin(phase(mover, time, LIFT.period));
}

export function createMover(spec) {
  const mover = { id: spec.id, col: spec.col, axis: spec.axis ?? 'x', homeX: spec.x, homeY: spec.y, x: spec.x, y: spec.y, w: spec.width, dx: 0, dy: 0 };
  mover.x = moverX(mover, 0);
  mover.y = moverY(mover, 0);
  return mover;
}

export function updateMovers(movers, time) {
  for (const m of movers) {
    const x = moverX(m, time);
    const y = moverY(m, time);
    m.dx = x - m.x;
    m.dy = y - m.y;
    m.x = x;
    m.y = y;
  }
}
