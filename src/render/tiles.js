import { TILE } from '../config.js';
import { tileAt } from '../core/level.js';
import { inkLine } from './ink.js';

export function fillSolidTiles(ctx, level, c0, c1, color) {
  ctx.fillStyle = color;
  for (let c = c0; c <= c1; c++) {
    for (let r = 0; r < level.rows; r++) {
      if (tileAt(level, c, r) === 'solid') ctx.fillRect(c * TILE, r * TILE, TILE + 0.5, TILE + 0.5);
    }
  }
}

export function inkTileEdges(ctx, level, c, r) {
  const solid = (cc, rr) => tileAt(level, cc, rr) === 'solid';
  if (!solid(c - 1, r)) inkLine(ctx, [[c * TILE, r * TILE], [c * TILE, (r + 1) * TILE]], { width: 2.4, seed: c * 17 + r });
  if (!solid(c + 1, r)) inkLine(ctx, [[(c + 1) * TILE, r * TILE], [(c + 1) * TILE, (r + 1) * TILE]], { width: 2.4, seed: c * 19 + r });
  if (!solid(c, r - 1) && r > 0) inkLine(ctx, [[c * TILE, r * TILE], [(c + 1) * TILE, r * TILE]], { width: 2.6, seed: c * 23 + r });
  if (!solid(c, r + 1) && r < level.rows - 1) inkLine(ctx, [[c * TILE, (r + 1) * TILE], [(c + 1) * TILE, (r + 1) * TILE]], { width: 2.6, seed: c * 29 + r });
}
