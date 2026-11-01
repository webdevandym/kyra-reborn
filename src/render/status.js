import { COLORS } from '../config.js';
import { drawHeart, drawStar } from './sprites.js';

export function hearts(ctx, lives, y, time, seed) {
  for (let i = 0; i < lives; i++) {
    drawHeart(ctx, (i - (lives - 1) / 2) * 13, y + Math.sin(time * 5 + i) * 2, 5, seed + i);
  }
}

export function dizzyStars(ctx, y, time, seed) {
  for (let i = 0; i < 3; i++) {
    const a = time * 6 + (i * Math.PI * 2) / 3;
    drawStar(ctx, Math.cos(a) * 18, y + Math.sin(a) * 5, 5, COLORS.star, seed + i);
  }
}
