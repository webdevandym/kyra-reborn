import { TILE, VIEW_W, VIEW_W_MAX, COLORS } from '../config.js';
import { tileAt } from '../core/level.js';
import { mulberry32, inkShape, inkEllipse, inkLine, rectPoints } from './ink.js';
import { drawGreenCrystal } from './sprites.js';
import { drawPine, drawOak, drawBush, drawCage } from './forest-sprites.js';
import { hashString, visibleCols, eachRun } from './layout.js';
import { fillSolidTiles, inkTileEdges } from './tiles.js';

const GROUND_Y = 11 * TILE;
const FAR = { parallax: 0.3, far: true };
const NEAR = { parallax: 0.55, far: false };
const TREES = { pine: drawPine, oak: drawOak, bush: drawBush };

function isWallColumn(level, c) {
  if (c < 0 || c >= level.cols) return false;
  for (let r = 0; r < level.rows; r++) {
    if (tileAt(level, c, r) !== 'solid') return false;
  }
  return true;
}

export function createForestTheme(ctx) {
  const doodleCache = new Map();

  function row(rand, from, to, kinds, step, spread) {
    const items = [];
    for (let x = from; x < to; x += step + rand() * spread) {
      items.push({ draw: TREES[kinds[Math.floor(rand() * kinds.length)]], x, s: 0.75 + rand() * 0.4, seed: Math.floor(rand() * 1e5) });
    }
    return items;
  }

  function doodlesFor(level) {
    if (doodleCache.has(level.id)) return doodleCache.get(level.id);
    const rand = mulberry32(hashString(level.id) ^ 0x3c6ef372);
    const doodles = [
      { ...FAR, items: row(rand, 40, level.width * FAR.parallax + VIEW_W_MAX, ['pine', 'pine', 'oak'], 150, 140) },
      { ...NEAR, items: row(rand, 90, level.width * NEAR.parallax + VIEW_W_MAX, ['pine', 'bush', 'bush', 'oak'], 170, 190) },
    ];
    doodleCache.set(level.id, doodles);
    return doodles;
  }

  function drawBackdrop(level, camX) {
    for (const { parallax, far, items } of doodlesFor(level)) {
      for (const item of items) {
        const x = item.x - camX * parallax;
        if (x < -120 || x > VIEW_W + 120) continue;
        item.draw(ctx, x, GROUND_Y, item.s, item.seed, far);
      }
    }
  }

  function drawTiles(level, camX) {
    const [c0, c1] = visibleCols(level, camX);
    const solid = (c, r) => tileAt(level, c, r) === 'solid';
    const wall = (c) => isWallColumn(level, c);

    eachRun(c0, c1, (c) => c >= c0 && c <= c1 && !wall(c), (start, end) => fillSolidTiles(ctx, level, start, end - 1, COLORS.dirt));

    for (let c = c0; c <= c1; c++) {
      if (wall(c)) continue;
      for (let r = 0; r < level.rows; r++) {
        if (!solid(c, r)) continue;
        inkTileEdges(ctx, level, c, r);
        const rand = mulberry32(c * 131 + r * 7);
        if (solid(c, r - 1) && rand() < 0.3) {
          const px = c * TILE + 8 + rand() * (TILE - 22);
          const py = r * TILE + 10 + rand() * (TILE - 24);
          inkEllipse(ctx, px, py, 3.2, 2.2, { fill: COLORS.platform, stroke: COLORS.inkSoft, width: 1.2, seed: c * 31 + r, jitter: 0.3 });
        }
      }
    }

    eachRun(c0, c1, wall, (start, end) => drawRockWall(start * TILE, end * TILE, level.rows * TILE, start));

    for (let r = 0; r < level.rows; r++) {
      eachRun(c0, c1, (c) => solid(c, r) && !solid(c, r - 1) && !wall(c), (start, end) => drawGrassRun(start * TILE, end * TILE, r * TILE, start * 13 + r));
    }

    for (let r = 0; r < level.rows; r++) {
      eachRun(c0, c1, (c) => tileAt(level, c, r) === 'oneway', (start, end) => drawLog(start * TILE + 2, end * TILE - 2, r * TILE, start * 29 + r));
    }
  }

  function drawRockWall(x0, x1, height, seed) {
    const rand = mulberry32(seed * 977 + 11);
    ctx.fillStyle = COLORS.stoneShade;
    ctx.fillRect(x0, 0, x1 - x0 + 0.5, height);
    const pieces = Math.max(1, Math.round((x1 - x0) / (1.4 * TILE)));
    const pw = (x1 - x0) / pieces;
    for (let top = 0, i = 0; top < height; i++) {
      let h = TILE * (1.2 + rand() * 0.6);
      if (height - top - h < TILE) h = height - top;
      for (let j = 0; j < pieces; j++) {
        const px = x0 + j * pw + 1.5;
        const py = top + 2;
        const w = pw - 3;
        const ph = h - 4;
        const s = seed * 53 + i * 7 + j;
        const wobble = ([x, y]) => [x + (rand() - 0.5) * 4, y + (rand() - 0.5) * 4];
        inkShape(ctx, rectPoints(px, py, w, ph).map(wobble), { fill: COLORS.stone, width: 2.6, seed: s, jitter: 0.5 });
        inkEllipse(ctx, px + w * 0.5, py + ph * 0.82, w * 0.3, ph * 0.09, { fill: COLORS.stoneShade, stroke: null, offset: 0, seed: s + 1, jitter: 0.3 });
        const cx = px + w * (0.3 + rand() * 0.4);
        const cy = py + ph * (0.12 + rand() * 0.18);
        const lean = (rand() - 0.5) * w * 0.4;
        inkLine(ctx, [[cx, cy], [cx + lean, cy + ph * 0.2], [cx + lean * 0.3, cy + ph * 0.38]], { stroke: COLORS.inkSoft, width: 1.8, seed: s + 2, jitter: 0.4 });
        if (rand() < 0.5) {
          const sx = px + w * 0.1;
          const sy = py + ph * (0.5 + rand() * 0.2);
          inkLine(ctx, [[sx, sy], [sx + w * 0.22, sy - ph * 0.05]], { stroke: COLORS.inkSoft, width: 1.8, seed: s + 3, jitter: 0.4 });
        }
      }
      top += h;
    }
  }

  function drawGrassRun(x0, x1, top, seed) {
    const band = [];
    for (let x = x0; x <= x1; x += 9) band.push([x, top]);
    band.push([x1, top]);
    const lower = [];
    for (let x = x1; x >= x0; x -= 9) lower.push([x, top + 9 + Math.abs(Math.sin(x / 6)) * 3]);
    lower.push([x0, top + 9]);
    inkShape(ctx, [...band, ...lower], { fill: COLORS.grass, stroke: null, seed, offset: 0, smooth: false, jitter: 0.5 });
    inkLine(ctx, lower, { stroke: COLORS.inkSoft, width: 1.4, seed: seed + 1, jitter: 0.5 });
    for (let x = x0 + 7; x < x1 - 4; x += 15) {
      const rand = mulberry32(Math.floor(x) * 7 + seed);
      const lean = (rand() - 0.5) * 6;
      for (const spread of [-3, 0, 3]) inkLine(ctx, [[x + spread, top], [x + spread + lean, top - 5 - rand() * 4]], { stroke: COLORS.pine, width: 2.2, seed: seed + x + spread, jitter: 0.4 });
    }
  }

  function drawLog(x0, x1, top, seed) {
    const r = 7.5;
    const points = [];
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI;
      points.push([x1 - r + Math.cos(a) * r, top + r + Math.sin(a) * r]);
    }
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI / 2 + (i / 6) * Math.PI;
      points.push([x0 + r + Math.cos(a) * r, top + r + Math.sin(a) * r]);
    }
    inkShape(ctx, points, { fill: COLORS.wood, width: 2.6, seed });
    for (const ex of [x0 + 8, x1 - 8]) inkEllipse(ctx, ex, top + r, 3.4, 5, { width: 1.5, seed: seed + ex });
    for (let x = x0 + 22; x < x1 - 14; x += 26) inkLine(ctx, [[x, top + 4], [x + 8, top + 2 * r - 4]], { width: 1.4, seed: seed + x });
  }

  return {
    paper: COLORS.forestWash,
    drawBackdrop,
    drawTiles,
    drawGoal: (goal, time, awake, locked = false) => {
      drawGreenCrystal(ctx, goal, time);
      if (locked) drawCage(ctx, goal, time);
    },
  };
}
