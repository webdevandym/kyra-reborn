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

const round3 = (n) => String(Math.round(n * 1000) / 1000);

function formatValue(value, strict) {
  if (typeof value === 'number') {
    if (strict && !Number.isFinite(value)) throw new Error(`non-finite number ${value}`);
    return Number.isFinite(value) ? round3(value) : String(value);
  }
  if (typeof value === 'string') return value;
  return JSON.stringify(value, (key, v) => {
    if (typeof v !== 'number') return v;
    if (strict && !Number.isFinite(v)) throw new Error(`non-finite number ${v}`);
    return Number.isFinite(v) ? Number(round3(v)) : String(v);
  });
}

export function recordingContext() {
  const log = [];
  const state = {};
  const record = (name, args) => log.push(`${name}(${args.map((arg) => formatValue(arg, true)).join(',')})`);
  const special = {
    measureText: (text) => {
      record('measureText', [text]);
      return { width: String(text).length * 10 };
    },
    createRadialGradient: (...args) => {
      record('createRadialGradient', args);
      return { addColorStop: (...stop) => record('addColorStop', stop) };
    },
  };
  const ctx = new Proxy(state, {
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (prop in special) return special[prop];
      if (prop in target) return target[prop];
      return (...args) => record(prop, args);
    },
    set(target, prop, value) {
      target[prop] = value;
      log.push(`=${String(prop)}:${formatValue(value, false)}`);
      return true;
    },
  });
  return { ctx, log };
}

export function castleMap(bottomRows, walls = []) {
  const cols = bottomRows[0].length;
  const rows = ['#'.repeat(cols), ...Array(ROWS - 1 - bottomRows.length).fill('.'.repeat(cols)), ...bottomRows];
  return rows.map((line) => [...line].map((ch, col) => (walls.includes(col) ? '#' : ch)).join(''));
}
