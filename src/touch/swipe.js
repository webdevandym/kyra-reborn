export function swipeStep(dx, dy, min = 40) {
  if (Math.abs(dx) < min || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? -1 : 1;
}
