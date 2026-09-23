import { PLAYER } from '../config.js';
import { bodyRect, overlaps } from './rect.js';

export function classifyContact(player, enemy) {
  const a = bodyRect(player);
  const b = bodyRect(enemy);
  if (!overlaps(a, b)) return null;
  if (player.vy > 0 && player.prevBottom <= b.top + PLAYER.stompTolerance) return 'stomp';
  return 'hit';
}
