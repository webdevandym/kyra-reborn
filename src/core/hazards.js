import { TILE, RAIN } from '../config.js';
import { tileAt } from './level.js';

const PERIOD = RAIN.dry + RAIN.warn + RAIN.rain;
const RAIN_START = RAIN.dry + RAIN.warn;

export function createRainCloud(spec, level) {
  const top = (spec.row + 1) * TILE;
  let bottom = level.height;
  for (let row = spec.row + 1; row < level.rows; row++) {
    const kind = tileAt(level, spec.col, row);
    if (kind === 'solid' || kind === 'oneway') {
      bottom = row * TILE;
      break;
    }
  }
  return { id: spec.id, col: spec.col, x: spec.x, y: spec.y, top, bottom };
}

function localTime(cloud, time) {
  const u = (time + cloud.col * RAIN.phasePerCol) % PERIOD;
  return u < 0 ? u + PERIOD : u;
}

export function rainPhase(cloud, time) {
  const u = localTime(cloud, time);
  if (u < RAIN.dry) return 'dry';
  if (u < RAIN_START) return 'warn';
  return 'rain';
}

export function rainRect(cloud, time) {
  const u = localTime(cloud, time);
  let top;
  let bottom;
  if (u >= RAIN_START) {
    top = cloud.top;
    bottom = Math.min(cloud.bottom, cloud.top + RAIN.dropSpeed * (u - RAIN_START));
  } else if (u < RAIN.dry) {
    top = Math.min(cloud.bottom, cloud.top + RAIN.dropSpeed * u);
    bottom = cloud.bottom;
  } else {
    return null;
  }
  if (bottom <= top) return null;
  const half = (RAIN.width * TILE) / 2;
  return { left: cloud.x - half, right: cloud.x + half, top, bottom };
}
