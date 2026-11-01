const DIAG = Math.SQRT1_2;
const OCTANT = Math.PI / 4;

// A literal table, not cos/sin: exact zeros keep -0 and 6e-17 out of cone velocities.
const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: DIAG, dy: DIAG },
  { dx: 0, dy: 1 },
  { dx: -DIAG, dy: DIAG },
  { dx: -1, dy: 0 },
  { dx: -DIAG, dy: -DIAG },
  { dx: 0, dy: -1 },
  { dx: DIAG, dy: -DIAG },
];

export function aim8(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return { ...DIRECTIONS[0] };
  const octant = Math.round(Math.atan2(dy, dx) / OCTANT);
  return { ...DIRECTIONS[((octant % 8) + 8) % 8] };
}
