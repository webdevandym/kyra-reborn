import { COLORS } from '../config.js';

export const INK_W = 2.6;

export function dot(ctx, x, y, r, color = COLORS.ink) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function flip(ctx, x, y, dir) {
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);
}

export function starPoints(r, inner = 0.42, spikes = 4) {
  const points = [];
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    points.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return points;
}
