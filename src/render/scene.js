import { TILE, VIEW_W, VIEW_H, COLORS, RULES, CRYSTAL } from '../config.js';
import { bodyRect, centeredRect } from '../core/rect.js';
import { t } from '../i18n/index.js';
import { setBoilTime, inkEllipse, inkLine } from './ink.js';
import { createMeadowTheme } from './meadow.js';
import {
  drawChicken,
  drawCarrot,
  drawPropellerCarrot,
  drawZombie,
  drawBee,
  drawRedCrystal,
  drawSign,
  drawHeart,
  drawGemIcon,
  drawMutedIcon,
} from './sprites.js';

const ENEMY_DRAWERS = { carrot: drawCarrot, zombie: drawZombie, propeller: drawPropellerCarrot, bee: drawBee };

export function createScene(ctx) {
  const themes = { meadow: createMeadowTheme(ctx) };

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

    const title = `${t('level', lang)} ${game.levelIndex + 1} · ${t(game.level.nameKey, lang)}`;
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
    const theme = themes[level.theme];
    const camX = camera.x;

    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawGrid(Math.round(camX));
    theme.drawBackdrop(level, camX, time);

    ctx.save();
    ctx.translate(-Math.round(camX) + shake.x, shake.y);
    drawFinishLine(world.goal);
    theme.drawTiles(level, camX);
    level.signs.forEach((sign, i) => drawSign(ctx, sign, t(sign.textKey, lang), 61 + i * 7));
    world.crystals.forEach((c, i) => drawRedCrystal(ctx, c, time, 41 + i));
    theme.drawGoal(world.goal, time, world.player.won);
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
