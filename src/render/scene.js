import { TILE, VIEW_W, VIEW_H, COLORS, RULES, CRYSTAL } from '../config.js';
import { tileAt } from '../core/level.js';
import { bodyRect, centeredRect } from '../core/rect.js';
import { t, localized } from '../strings.js';
import { mulberry32, setBoilTime, inkShape, inkEllipse, inkLine } from './ink.js';
import {
  drawChicken,
  drawCarrot,
  drawPropellerCarrot,
  drawZombie,
  drawBee,
  drawRedCrystal,
  drawGreenCrystal,
  drawSign,
  drawHeart,
  drawGemIcon,
  drawMutedIcon,
} from './sprites.js';

const ENEMY_DRAWERS = { carrot: drawCarrot, zombie: drawZombie, propeller: drawPropellerCarrot, bee: drawBee };
const GROUND_Y = 10 * TILE;

function hashString(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function createScene(ctx) {
  const doodleCache = new Map();

  function doodlesFor(level) {
    if (doodleCache.has(level.id)) return doodleCache.get(level.id);
    const rand = mulberry32(hashString(level.id));
    const clouds = [];
    for (let x = 60; x < level.width * 0.3 + VIEW_W; x += 280 + rand() * 260) {
      clouds.push({ x, y: 70 + rand() * 90, s: 0.8 + rand() * 0.6, seed: Math.floor(rand() * 1e5) });
    }
    const hills = [];
    for (let x = -120; x < level.width * 0.5 + VIEW_W; x += 240 + rand() * 200) {
      hills.push({ x, w: 260 + rand() * 220, h: 60 + rand() * 80, seed: Math.floor(rand() * 1e5) });
    }
    const doodles = { clouds, hills };
    doodleCache.set(level.id, doodles);
    return doodles;
  }

  function drawGrid(camX) {
    ctx.lineWidth = 1;
    for (const [spacing, color] of [[TILE / 3, COLORS.gridMinor], [TILE, COLORS.gridMajor]]) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (let x = -(camX % spacing); x < VIEW_W; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, VIEW_H);
      }
      for (let y = 0; y < VIEW_H; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(VIEW_W, y);
      }
      ctx.stroke();
    }
  }

  function drawBackdrop(level, camX) {
    const { clouds, hills } = doodlesFor(level);
    const sunX = VIEW_W - 280 - camX * 0.05;
    const sunY = 130;
    inkEllipse(ctx, sunX, sunY, 32, 32, { fill: '#FFF4C2', stroke: COLORS.inkSoft, width: 2.2, seed: 5 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      inkLine(ctx, [[sunX + Math.cos(a) * 40, sunY + Math.sin(a) * 40], [sunX + Math.cos(a) * 54, sunY + Math.sin(a) * 54]], { stroke: COLORS.inkSoft, width: 2, seed: 6 + i });
    }
    for (const c of clouds) {
      const cx = c.x - camX * 0.3;
      if (cx < -120 || cx > VIEW_W + 120) continue;
      const points = [];
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const bump = 1 + 0.18 * Math.abs(Math.sin(a * 3));
        points.push([cx + Math.cos(a) * 52 * c.s * bump, c.y + Math.sin(a) * 20 * c.s * bump]);
      }
      inkShape(ctx, points, { fill: COLORS.paper, stroke: COLORS.inkSoft, width: 2, seed: c.seed });
    }
    for (const h of hills) {
      const hx = h.x - camX * 0.5;
      if (hx > VIEW_W || hx + h.w < 0) continue;
      const points = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        points.push([hx + u * h.w, GROUND_Y - Math.sin(u * Math.PI) * h.h]);
      }
      inkShape(ctx, points, { fill: '#EEF3FC', stroke: COLORS.inkSoft, width: 2, seed: h.seed, closed: false });
    }
  }

  function visibleCols(level, camX) {
    const first = Math.max(0, Math.floor(camX / TILE) - 1);
    const last = Math.min(level.cols - 1, first + Math.ceil(VIEW_W / TILE) + 2);
    return [first, last];
  }

  function drawTiles(level, camX) {
    const [c0, c1] = visibleCols(level, camX);
    const solid = (c, r) => tileAt(level, c, r) === 'solid';

    ctx.fillStyle = COLORS.dirt;
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) if (solid(c, r)) ctx.fillRect(c * TILE, r * TILE, TILE + 0.5, TILE + 0.5);
    }

    ctx.strokeStyle = COLORS.inkSoft;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) {
        if (!solid(c, r) || !solid(c, r - 1)) continue;
        const rand = mulberry32(c * 131 + r * 7);
        for (let k = 0; k < 2; k++) {
          const x = c * TILE + 8 + rand() * (TILE - 20);
          const y = r * TILE + 8 + rand() * (TILE - 20);
          ctx.moveTo(x, y);
          ctx.lineTo(x + 7, y - 5);
        }
      }
    }
    ctx.stroke();

    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) {
        if (!solid(c, r)) continue;
        const top = solid(c, r - 1) ? r * TILE : r * TILE + 6;
        if (!solid(c - 1, r)) inkLine(ctx, [[c * TILE, top], [c * TILE, (r + 1) * TILE]], { width: 2.4, seed: c * 17 + r });
        if (!solid(c + 1, r)) inkLine(ctx, [[(c + 1) * TILE, top], [(c + 1) * TILE, (r + 1) * TILE]], { width: 2.4, seed: c * 19 + r });
      }
    }

    for (let r = 0; r < level.rows; r++) {
      let c = c0;
      while (c <= c1) {
        if (!(solid(c, r) && !solid(c, r - 1))) {
          c++;
          continue;
        }
        let start = c;
        while (solid(start - 1, r) && !solid(start - 1, r - 1)) start--;
        let end = c;
        while (solid(end, r) && !solid(end, r - 1)) end++;
        drawGrassRun(start * TILE, end * TILE, r * TILE, start * 13 + r);
        c = end;
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
        drawPlank(start * TILE + 2, end * TILE - 2, r * TILE, start * 29 + r);
        c = end;
      }
    }
  }

  function wave(x) {
    return Math.sin(x / 14) * 2.2 + Math.sin(x / 37) * 1.4;
  }

  function drawGrassRun(x0, x1, top, seed) {
    const edge = [];
    for (let x = x0; x <= x1; x += 9) edge.push([x, top + wave(x)]);
    edge.push([x1, top + wave(x1)]);
    const band = [...edge];
    for (let x = x1; x >= x0; x -= 9) band.push([x, top + 10 + Math.abs(Math.sin(x / 6)) * 3]);
    band.push([x0, top + 10]);
    inkShape(ctx, band, { fill: COLORS.grass, stroke: null, seed, offset: 0, smooth: false, jitter: 0.5 });
    inkLine(ctx, edge, { width: 2.8, seed: seed + 1 });
  }

  function drawPlank(x0, x1, top, seed) {
    const h = 15;
    const points = [[x0, top + 2], [x0 + 4, top], [x1 - 4, top], [x1, top + 2], [x1, top + h - 2], [x1 - 4, top + h], [x0 + 4, top + h], [x0, top + h - 2]];
    inkShape(ctx, points, { fill: COLORS.platform, width: 2.4, seed, smooth: false });
    for (let x = x0 + 18; x < x1 - 10; x += 26) inkLine(ctx, [[x, top + 4], [x + 8, top + h - 4]], { width: 1.4, seed: seed + x });
  }

  function drawFinishLine(goal) {
    inkLine(ctx, [[goal.x, 0], [goal.x, goal.y]], { stroke: COLORS.margin, width: 2.6, seed: 77, jitter: 0.5 });
    inkLine(ctx, [[goal.x + 6, 0], [goal.x + 6, goal.y]], { stroke: COLORS.margin, width: 1.2, seed: 78, jitter: 0.5 });
  }

  function hudText(text, x, y, align, font) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = COLORS.paper;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(text, x, y);
  }

  function drawHud(game, lang, muted) {
    const shown = Math.min(game.lives, 5);
    for (let i = 0; i < shown; i++) drawHeart(ctx, 32 + i * 34, 32, 13, 71 + i);
    if (game.lives > 5) hudText(`×${game.lives}`, 32 + shown * 34 - 8, 34, 'left', '700 24px "Balsamiq Sans", system-ui, sans-serif');

    const title = `${t('level', lang)} ${game.levelIndex + 1} · ${localized(game.level.name, lang)}`;
    hudText(title, VIEW_W / 2, 32, 'center', '700 32px "Caveat", "Comic Sans MS", cursive');

    drawGemIcon(ctx, VIEW_W - 92, 30);
    hudText(String(game.points), VIEW_W - 28, 32, 'right', '700 28px "Balsamiq Sans", system-ui, sans-serif');
    const progress = game.points % RULES.crystalsPerLife;
    for (let i = 0; i < RULES.crystalsPerLife; i++) {
      inkEllipse(ctx, VIEW_W - 124 + i * 20, 62, 5.5, 5.5, { fill: i < progress ? COLORS.crystal : COLORS.paper, width: 1.8, seed: 100 + i });
    }
    if (muted) drawMutedIcon(ctx, VIEW_W - 32, VIEW_H - 28);
  }

  function drawDebug(world) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#E11D48';
    const box = (r) => ctx.strokeRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
    box(bodyRect(world.player));
    world.enemies.forEach((e) => box(bodyRect(e)));
    world.crystals.forEach((c) => box(centeredRect(c.x, c.y, CRYSTAL.size, CRYSTAL.size)));
    box(bodyRect(world.goal));
    ctx.restore();
  }

  function render({ game, camera, particles, time, lang, muted, debug = false, reducedMotion = false, shake = { x: 0, y: 0 }, fps = 0 }) {
    setBoilTime(time, reducedMotion);
    const { world } = game;
    const { level } = world;
    const camX = camera.x;

    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawGrid(Math.round(camX));
    drawBackdrop(level, camX);

    ctx.save();
    ctx.translate(-Math.round(camX) + shake.x, shake.y);
    drawFinishLine(world.goal);
    drawTiles(level, camX);
    level.signs.forEach((sign, i) => drawSign(ctx, sign, localized(sign.text, lang), 61 + i * 7));
    world.crystals.forEach((c, i) => drawRedCrystal(ctx, c, time, 41 + i));
    drawGreenCrystal(ctx, world.goal, time);
    world.enemies.forEach((e, i) => {
      if (e.alive) ENEMY_DRAWERS[e.kind](ctx, e, time, 200 + i * 37);
    });

    const p = world.player;
    if (!p.dead) {
      const blink = game.state === 'playing' && p.invuln > 0 && Math.floor(time * 10) % 2 === 0;
      ctx.globalAlpha = blink ? 0.35 : 1;
      drawChicken(ctx, { ...p, celebrate: p.won }, time);
      ctx.globalAlpha = 1;
    }
    particles.drawWorld(ctx);
    if (debug) drawDebug(world);
    ctx.restore();

    particles.drawScreen(ctx);
    if (game.state !== 'title') drawHud(game, lang, muted);
    if (debug) {
      ctx.font = '12px monospace';
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = 'left';
      ctx.fillText(`${fps.toFixed(0)} fps · ${game.state} · x ${p.x.toFixed(0)}`, 10, VIEW_H - 10);
    }
  }

  return { render };
}
