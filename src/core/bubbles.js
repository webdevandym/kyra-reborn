import { TILE, BUBBLE } from '../config.js';
import { centeredRect } from './rect.js';

export function createBubble(spec, col = Math.floor(spec.x / TILE)) {
  const bubble = { id: spec.id, col, homeX: spec.x, homeY: spec.y, x: spec.x, y: spec.y, size: BUBBLE.size, carry: null };
  placeBubble(bubble, 0);
  return bubble;
}

export function placeBubble(bubble, time) {
  const turn = (2 * Math.PI * time) / BUBBLE.period + bubble.col * 1.3;
  bubble.x = bubble.homeX + BUBBLE.range * TILE * Math.sin(turn);
  bubble.y = bubble.homeY + BUBBLE.bob * Math.cos(turn * 1.7);
}

export function bubbleRect(bubble) {
  return centeredRect(bubble.x, bubble.y, bubble.size, bubble.size);
}
