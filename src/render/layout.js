import { TILE, VIEW_W } from '../config.js';

export function hashString(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function visibleCols(level, camX) {
  const first = Math.max(0, Math.floor(camX / TILE) - 1);
  const last = Math.min(level.cols - 1, first + Math.ceil(VIEW_W / TILE) + 2);
  return [first, last];
}

export function eachRun(c0, c1, pred, draw) {
  let c = c0;
  while (c <= c1) {
    if (!pred(c)) {
      c++;
      continue;
    }
    let start = c;
    while (pred(start - 1)) start--;
    let end = c;
    while (pred(end)) end++;
    draw(start, end);
    c = end;
  }
}
