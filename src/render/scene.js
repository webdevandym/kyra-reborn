import { TILE, VIEW_W, VIEW_H, COLORS, RULES, CRYSTAL, PORTAL } from '../config.js';
import { bodyRect, centeredRect } from '../core/rect.js';
import { rainPhase, rainRect } from '../core/hazards.js';
import { projectileRect } from '../core/world.js';
import { t, tSign } from '../i18n/index.js';
import { setBoilTime, inkEllipse, inkLine } from './ink.js';
import { createMeadowTheme } from './meadow.js';
import { createSkyTheme } from './sky.js';
import { createCastleTheme } from './castle.js';
import { createSeaTheme } from './sea.js';
import { drawStarEnemy, drawBat, drawRainCloud, drawMovingCloud } from './sky-sprites.js';
import { drawRat, drawGhost, drawSkeleton, drawSpider, drawFireball, drawBone, drawPortal, drawCheckpoint, drawShield, drawDoor } from './castle-sprites.js';
import {
  drawDolphin,
  drawFish,
  drawShark,
  drawShell,
  drawBubble,
  drawPlayerBubble,
  drawTealCrystal,
  drawPearl,
  drawCrab,
  drawSandStick,
} from './sea-sprites.js';
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

const ENEMY_DRAWERS = {
  carrot: drawCarrot,
  zombie: drawZombie,
  propeller: drawPropellerCarrot,
  bee: drawBee,
  star: drawStarEnemy,
  bat: drawBat,
  rat: drawRat,
  ghost: drawGhost,
  skeleton: drawSkeleton,
  spider: drawSpider,
  dolphin: drawDolphin,
  fish: drawFish,
  shark: drawShark,
};

const PROJECTILE_DRAWERS = { bone: drawBone, fireball: drawFireball, shell: drawShell };

export function createScene(ctx) {
  const themes = { meadow: createMeadowTheme(ctx), sky: createSkyTheme(ctx), castle: createCastleTheme(ctx), sea: createSeaTheme(ctx) };

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

  function drawHud(game, lang, muted, inset) {
    const right = VIEW_W - inset;
    const shown = Math.min(game.lives, 5);
    for (let i = 0; i < shown; i++) drawHeart(ctx, 32 + i * 34, 32, 13, 71 + i);
    if (game.lives > 5) hudText(`×${game.lives}`, 32 + shown * 34 - 8, 34, 'left', '700 24px "Balsamiq Sans", system-ui, sans-serif');

    const title = `${t('level', lang)} ${game.levelIndex + 1} · ${t(game.level.nameKey, lang)}`;
    hudText(title, VIEW_W / 2, 32, 'center', '700 32px "Caveat", "Comic Sans MS", cursive');

    drawGemIcon(ctx, right - 92, 30);
    hudText(String(game.points), right - 28, 32, 'right', '700 28px "Balsamiq Sans", system-ui, sans-serif');
    const progress = game.points % RULES.crystalsPerLife;
    for (let i = 0; i < RULES.crystalsPerLife; i++) {
      inkEllipse(ctx, right - 124 + i * 20, 62, 5.5, 5.5, { fill: i < progress ? COLORS.crystal : COLORS.paper, width: 1.8, seed: 100 + i });
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
    world.movers.forEach((m) => ctx.strokeRect(m.x, m.y, m.w, 6));
    world.rain.forEach((cloud) => {
      const wet = rainRect(cloud, world.time);
      if (wet) box(wet);
    });
    world.projectiles.forEach((f) => box(projectileRect(f)));
    world.bubbles.forEach((b) => box(centeredRect(b.x, b.y, b.size, b.size)));
    world.pearls.forEach((pearl) => box(bodyRect(pearl)));
    world.crabs.forEach((crab) => box(bodyRect(crab)));
    if (world.portal) box(bodyRect(world.portal));
    world.doors.forEach((d) => box(bodyRect(d)));
    ctx.setLineDash([6, 6]);
    world.level.rooms.forEach((room) => ctx.strokeRect(room.left, 0, room.right - room.left, VIEW_H));
    ctx.setLineDash([]);
    ctx.restore();
  }

  function render({ game, camera, particles, time, lang, muted, debug = false, touch = false, hudInset = 0, reducedMotion = false, shake = { x: 0, y: 0 }, fps = 0 }) {
    setBoilTime(time, reducedMotion);
    const { world } = game;
    const { level } = world;
    const theme = themes[level.theme];
    const camX = camera.x;

    ctx.fillStyle = theme.paperAt?.(level, camX) ?? theme.paper;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawGrid(Math.round(camX));
    theme.drawBackdrop(level, camX, time);

    ctx.save();
    ctx.translate(-Math.round(camX) + shake.x, shake.y);
    drawFinishLine(world.goal);
    theme.drawTiles(level, camX);
    if (level.checkpoint) drawCheckpoint(ctx, level.checkpoint, world.checkpointReached, time);
    world.doors.forEach((d, i) => drawDoor(ctx, d, time, 731 + i * 11));
    if (world.portal?.open) drawPortal(ctx, world.portal, (world.time - world.portal.openedAt) / PORTAL.grow, time);
    world.movers.forEach((m, i) => (level.theme === 'sea' ? drawSandStick : drawMovingCloud)(ctx, m, 391 + i * 13));
    level.signs.forEach((sign, i) => drawSign(ctx, sign, tSign(sign.textKey, lang, touch), 61 + i * 7));
    world.crystals.forEach((c, i) => drawRedCrystal(ctx, c, time, 41 + i));
    theme.drawGoal(world.goal, time, world.player.won, world.goal.locked);
    world.pearls.forEach((pearl, i) => drawPearl(ctx, pearl, time, 961 + i * 17));
    world.teals.forEach((t, i) => drawTealCrystal(ctx, t, time, 941 + i * 5));
    world.bubbles.forEach((b, i) => drawBubble(ctx, b, time, 901 + i * 9));
    world.enemies.forEach((e, i) => {
      if (e.alive) ENEMY_DRAWERS[e.kind](ctx, e, time, 200 + i * 37);
    });
    world.crabs.forEach((crab, i) => drawCrab(ctx, crab, time, 981 + i * 13));
    world.projectiles.forEach((f, i) => PROJECTILE_DRAWERS[f.kind](ctx, f, time, 581 + i * 7));

    const p = world.player;
    if (!p.dead) {
      const blink = game.state === 'playing' && p.invuln > 0 && Math.floor(time * 10) % 2 === 0;
      ctx.globalAlpha = blink ? 0.35 : 1;
      drawChicken(ctx, { ...p, celebrate: p.won }, time);
      ctx.globalAlpha = 1;
      if (p.shield) drawShield(ctx, p, time);
      if (p.bubble) drawPlayerBubble(ctx, p, time);
    }
    world.rain.forEach((cloud, i) => drawRainCloud(ctx, cloud, { phase: rainPhase(cloud, world.time), wet: rainRect(cloud, world.time), time }, 361 + i * 11));
    particles.drawWorld(ctx);
    if (debug) drawDebug(world);
    ctx.restore();

    particles.drawScreen(ctx);
    if (game.state !== 'title') drawHud(game, lang, muted, hudInset);
    if (debug) {
      ctx.font = '12px monospace';
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = 'left';
      ctx.fillText(`${fps.toFixed(0)} fps · ${game.state} · x ${p.x.toFixed(0)}`, 10, VIEW_H - 10);
    }
  }

  return { render };
}
