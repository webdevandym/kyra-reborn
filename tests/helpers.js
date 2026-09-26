import { ROWS } from '../src/config.js';
import { parseLevel } from '../src/core/level.js';

export function mapFromBottom(bottomRows) {
  const cols = bottomRows[0].length;
  const empty = '.'.repeat(cols);
  return [...Array(ROWS - bottomRows.length).fill(empty), ...bottomRows];
}

export function testLevel(bottomRows, extra = {}) {
  return parseLevel({ id: 'test', map: mapFromBottom(bottomRows), ...extra });
}

export function runSteps(n, fn) {
  for (let i = 0; i < n; i++) fn(i);
}
