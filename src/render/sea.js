import { TILE, VIEW_W, VIEW_W_MAX, VIEW_H, COLORS } from '../config.js';
import { tileAt } from '../core/level.js';
import { mulberry32, inkShape, inkEllipse, inkLine, inkPoly } from './ink.js';
import { drawGreenCrystal } from './sprites.js';
import { drawBubbleCage } from './sea-sprites.js';
import { hashString, visibleCols } from './layout.js';

export function createSeaTheme(ctx) {
  const doodleCache = new Map();

  function doodlesFor(level) {
    if (doodleCache.has(level.id)) return doodleCache.get(level.id);
    const rand = mulberry32(hashString(level.id) ^ 0x1b873593);
    const rays = [];
    for (let x = -60; x < level.width * 0.15 + VIEW_W_MAX; x += 150 + rand() * 120) {
      rays.push({ x, w: 40 + rand() * 50, lean: 60 + rand() * 60 });
    }
    const bubbles = [];
    for (let x = 20; x < level.width * 0.25 + VIEW_W_MAX; x += 70 + rand() * 110) {
      bubbles.push({ x, y: rand() * VIEW_H, r: 3 + rand() * 5, speed: 14 + rand() * 22, wobble: rand() * Math.PI * 2, seed: Math.floor(rand() * 1e5) });
    }
    const weeds = [];
    for (let x = 0; x < level.width * 0.4 + VIEW_W_MAX; x += 110 + rand() * 140) {
      weeds.push({ x, h: 90 + rand() * 110, sway: rand() * Math.PI * 2, seed: Math.floor(rand() * 1e5) });
    }
    const doodles = { rays, bubbles, weeds };
    doodleCache.set(level.id, doodles);
    return doodles;
  }

  function drawBackdrop(level, camX, time) {
    const { rays, bubbles, weeds } = doodlesFor(level);
    ctx.fillStyle = COLORS.seaDeep;
    ctx.globalAlpha = 0.35;
    for (const r of rays) {
      const rx = r.x - camX * 0.08;
      if (rx < -r.lean - r.w || rx > VIEW_W + r.lean) continue;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + r.w, 0);
      ctx.lineTo(rx + r.w + r.lean, VIEW_H);
      ctx.lineTo(rx + r.lean, VIEW_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const w of weeds) {
      const wx = w.x - camX * 0.25;
      if (wx < -60 || wx > VIEW_W + 60) continue;
      const base = VIEW_H - TILE;
      const points = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        points.push([wx + Math.sin(time * 1.4 + w.sway + u * 3) * 12 * u, base - u * w.h]);
      }
      inkLine(ctx, points, { stroke: COLORS.inkSoft, width: 3, seed: w.seed });
    }
    for (const b of bubbles) {
      const bx = b.x - camX * 0.15 + Math.sin(time + b.wobble) * 8;
      if (bx < -20 || bx > VIEW_W + 20) continue;
      const by = (((b.y - time * b.speed) % VIEW_H) + VIEW_H) % VIEW_H;
      inkEllipse(ctx, bx, by, b.r, b.r, { fill: COLORS.paper, stroke: COLORS.inkSoft, width: 1.4, seed: b.seed, jitter: 0.4 });
    }
  }

  function drawSeaweed(x, y, rand, seed) {
    const h = 26 + rand() * 24;
    const lean = (rand() - 0.5) * 16;
    const stem = [];
    for (let i = 0; i <= 4; i++) stem.push([x + Math.sin(i * 1.3 + seed) * 5 + (lean * i) / 4, y - (h * i) / 4]);
    inkLine(ctx, stem, { stroke: COLORS.weed, width: 5, seed, jitter: 0.5 });
    inkLine(ctx, stem, { width: 1.6, seed: seed + 1, jitter: 0.5 });
  }

  function drawCoral(x, y, rand, seed) {
    const h = 20 + rand() * 18;
    const branches = [[0, 0, 0, -h], [0, -h * 0.45, -9, -h * 0.85], [0, -h * 0.6, 10, -h * 0.95]];
    for (const [x0, y0, x1, y1] of branches) {
      inkLine(ctx, [[x + x0, y + y0], [x + x1, y + y1]], { stroke: COLORS.coral, width: 6, seed: seed + x1, jitter: 0.5 });
      inkEllipse(ctx, x + x1, y + y1, 3.4, 3.4, { fill: COLORS.coralLight, width: 1.6, seed: seed + y1 });
    }
  }

  function drawTiles(level, camX) {
    const [c0, c1] = visibleCols(level, camX);
    const solid = (c, r) => tileAt(level, c, r) === 'solid';

    ctx.fillStyle = COLORS.seaFloor;
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) if (solid(c, r)) ctx.fillRect(c * TILE, r * TILE, TILE + 0.5, TILE + 0.5);
    }

    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) {
        if (!solid(c, r)) continue;
        if (!solid(c - 1, r)) inkLine(ctx, [[c * TILE, r * TILE], [c * TILE, (r + 1) * TILE]], { width: 2.4, seed: c * 17 + r });
        if (!solid(c + 1, r)) inkLine(ctx, [[(c + 1) * TILE, r * TILE], [(c + 1) * TILE, (r + 1) * TILE]], { width: 2.4, seed: c * 19 + r });
        if (!solid(c, r - 1) && r > 0) inkLine(ctx, [[c * TILE, r * TILE], [(c + 1) * TILE, r * TILE]], { width: 2.6, seed: c * 23 + r });
        if (!solid(c, r + 1) && r < level.rows - 1) inkLine(ctx, [[c * TILE, (r + 1) * TILE], [(c + 1) * TILE, (r + 1) * TILE]], { width: 2.6, seed: c * 29 + r });
        const rand = mulberry32(c * 131 + r * 7);
        if (rand() < 0.35) {
          const x = c * TILE + 8 + rand() * (TILE - 22);
          const y = r * TILE + 10 + rand() * (TILE - 24);
          inkEllipse(ctx, x, y, 2.6, 2, { fill: COLORS.seaFloorShade, stroke: COLORS.inkSoft, width: 1, seed: c * 31 + r, jitter: 0.3 });
        }
        if (!solid(c, r - 1) && r > 0) {
          const top = r * TILE;
          if (rand() < 0.28) drawSeaweed(c * TILE + 10 + rand() * (TILE - 20), top, rand, c * 37 + r);
          else if (rand() < 0.22) drawCoral(c * TILE + 12 + rand() * (TILE - 24), top, rand, c * 41 + r);
        }
      }
    }

    for (let r = 0; r < level.rows; r++) {
      let c = c0;
      while (c <= c1) {
        if (tileAt(level, c, r) !== 'oneway') {
          c++;
          continue;
        }
        let start = c;
        while (tileAt(level, start - 1, r) === 'oneway') start--;
        let end = c;
        while (tileAt(level, end, r) === 'oneway') end++;
        drawReefLedge(start * TILE + 2, end * TILE - 2, r * TILE, start * 43 + r);
        c = end;
      }
    }
  }

  function drawReefLedge(x0, x1, top, seed) {
    inkShape(ctx, [[x0, top], [x1, top], [x1, top + 13], [x0, top + 13]], { fill: COLORS.coral, width: 2.4, seed, smooth: false });
    for (let x = x0 + 8; x < x1 - 4; x += 16) inkEllipse(ctx, x, top + 6, 2.4, 2.4, { fill: COLORS.coralLight, stroke: null, seed: seed + x });
    inkPoly(ctx, [[x0 + 6, top + 13], [x0 + 14, top + 24], [x0 + 22, top + 13]], { fill: COLORS.coral, width: 1.8, seed: seed + 1 });
    inkPoly(ctx, [[x1 - 22, top + 13], [x1 - 14, top + 24], [x1 - 6, top + 13]], { fill: COLORS.coral, width: 1.8, seed: seed + 2 });
  }

  return {
    paper: COLORS.seaWash,
    drawBackdrop,
    drawTiles,
    drawGoal: (goal, time, awake, locked = false) => {
      drawGreenCrystal(ctx, goal, time);
      if (locked) drawBubbleCage(ctx, goal, time);
    },
  };
}
