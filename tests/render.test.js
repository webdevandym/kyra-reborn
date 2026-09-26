import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STEP, RULES, TILE, COLORS } from '../src/config.js';
import levels from '../src/levels/index.js';
import { createGame } from '../src/core/game.js';
import { createWorld } from '../src/core/world.js';
import { createCamera, snapCamera } from '../src/core/camera.js';
import { parseLevel } from '../src/core/level.js';
import { createScene } from '../src/render/scene.js';
import { createMeadowTheme } from '../src/render/meadow.js';
import { createParticles } from '../src/render/particles.js';
import { drawChicken, drawCarrot, drawPropellerCarrot, drawZombie, drawBee, drawRedCrystal, drawGreenCrystal, drawSign, drawHeart } from '../src/render/sprites.js';
import { LANGS, loadLang } from '../src/i18n/index.js';
import { mapFromBottom } from './helpers.js';
import { createSkyTheme } from '../src/render/sky.js';
import { drawStarEnemy, drawBat, drawRainCloud, drawMovingCloud, drawMoon } from '../src/render/sky-sprites.js';

before(async () => {
  for (const lang of LANGS) await loadLang(lang, { fetchJson: (url) => JSON.parse(readFileSync(url, 'utf8')) });
});

function mockContext() {
  const calls = new Map();
  const state = {};
  const special = {
    measureText: (text) => ({ width: String(text).length * 10 }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  const ctx = new Proxy(state, {
    get(target, prop) {
      if (prop in special) return special[prop];
      if (prop in target) return target[prop];
      return (...args) => {
        for (const arg of args) {
          if (typeof arg === 'number' && !Number.isFinite(arg)) throw new Error(`${String(prop)} called with ${arg}`);
        }
        calls.set(prop, (calls.get(prop) ?? 0) + 1);
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  return { ctx, calls };
}

const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };

test('every sprite draws without errors and with finite coordinates', () => {
  const { ctx, calls } = mockContext();
  drawChicken(ctx, { x: 100, y: 450, facing: -1, vx: 200, onGround: true }, 1.3);
  drawChicken(ctx, { x: 100, y: 300, facing: 1, vx: 0, onGround: false, celebrate: true }, 2.1);
  drawChicken(ctx, { x: 100, y: 450, squash: 0.1 }, 0.3);
  drawCarrot(ctx, { x: 200, y: 450, dir: 1, anim: 3 }, 0.5);
  drawZombie(ctx, { x: 300, y: 450, size: 'big', anim: 1, dizzy: 0, dir: -1 }, 0.7);
  drawZombie(ctx, { x: 300, y: 450, size: 'small', anim: 1, dizzy: 0.4, dir: 1 }, 0.7);
  drawPropellerCarrot(ctx, { x: 350, y: 440, dir: -1, anim: 2 }, 0.9);
  drawPropellerCarrot(ctx, { x: 350, y: 440, dir: 1, anim: 0 }, Math.PI / 50);
  drawBee(ctx, { x: 380, y: 400, dir: 1 }, 1.1);
  drawBee(ctx, { x: 380, y: 400, dir: -1 }, 0);
  drawRedCrystal(ctx, { x: 400, y: 300 }, 1);
  drawGreenCrystal(ctx, { x: 500, y: 450 }, 1);
  drawSign(ctx, { x: 600, y: 450 }, 'Два\nрядки');
  drawHeart(ctx, 30, 30, 13);
  assert.ok(calls.get('stroke') > 20);
  assert.ok(calls.get('fill') > 20);
});

test('the scene renders every game state of every level without errors', () => {
  const { ctx, calls } = mockContext();
  const game = createGame(levels);
  const camera = createCamera();
  const particles = createParticles();
  const scene = createScene(ctx);
  const frame = (time) => scene.render({ game, camera, particles, time, lang: 'uk', muted: true, debug: true });

  frame(0);
  game.confirm();
  frame(0.1);
  for (let i = 0; i < Math.ceil(RULES.introTime / STEP) + 1; i++) game.tick(STEP, IDLE);
  assert.equal(game.state, 'playing');
  particles.feathers(200, 400);
  particles.confetti();
  particles.text(200, 300, '+1');
  for (const index of game.levels.keys()) {
    game.levelIndex = index;
    game.world = createWorld(game.levels[index]);
    for (let col = 0; col < game.level.cols; col += 20) {
      game.world.player.x = col * TILE;
      snapCamera(camera, game.world.player, game.level.width);
      frame(col * 0.37);
      scene.render({ game, camera, particles, time: col, lang: 'en', muted: false });
    }
  }
  game.lives = 7;
  frame(3);
  assert.ok(calls.get('fillText') > 0);
});

test('the meadow theme paints white paper and draws its backdrop, tiles and the green crystal', () => {
  const { ctx, calls } = mockContext();
  const theme = createMeadowTheme(ctx);
  const level = parseLevel(levels[0]);
  assert.equal(theme.paper, COLORS.paper);
  theme.drawBackdrop(level, 0, 0.5);
  theme.drawTiles(level, 0);
  theme.drawGoal({ x: 300, y: 450 }, 1.2, false);
  assert.ok(calls.get('stroke') > 10);
  assert.ok(calls.get('fill') > 10);
});

test('every sky sprite draws without errors and with finite coordinates', () => {
  const { ctx, calls } = mockContext();
  drawStarEnemy(ctx, { x: 100, y: 450, dir: 1, anim: 2, lives: 2, dizzy: 0 }, 0.4);
  drawStarEnemy(ctx, { x: 100, y: 450, dir: -1, anim: 1, lives: 1, dizzy: 0.3 }, 1.2);
  drawBat(ctx, { x: 200, y: 400, dir: -1 }, 0.7);
  drawBat(ctx, { x: 200, y: 400, dir: 1 }, 0);
  const cloud = { x: 300, y: 250, top: 270, bottom: 450 };
  drawRainCloud(ctx, cloud, { phase: 'dry', wet: null, time: 0.2 });
  drawRainCloud(ctx, cloud, { phase: 'warn', wet: null, time: 0.9 });
  drawRainCloud(ctx, cloud, { phase: 'rain', wet: { left: 255, right: 345, top: 270, bottom: 450 }, time: 1.1 });
  drawRainCloud(ctx, cloud, { phase: 'dry', wet: { left: 255, right: 345, top: 400, bottom: 450 }, time: 1.3 });
  drawMovingCloud(ctx, { x: 400, y: 450, w: 135, dx: 1.2 });
  drawMovingCloud(ctx, { x: 400, y: 450, w: 90, dx: -0.8 });
  drawMovingCloud(ctx, { x: 400, y: 450, w: 90, dx: 0 });
  drawMoon(ctx, { x: 500, y: 450 }, 0.3, false);
  drawMoon(ctx, { x: 500, y: 450 }, 2.3, true);
  assert.ok(calls.get('stroke') > 20);
  assert.ok(calls.get('fill') > 10);
});

test('the sky theme paints the evening wash and draws its backdrop, cloud tiles and the Moon', () => {
  const { ctx, calls } = mockContext();
  const theme = createSkyTheme(ctx);
  const level = parseLevel({ id: 'skytheme', theme: 'sky', map: mapFromBottom(['..=====...', 'C...##...G', '####..####']) });
  assert.equal(theme.paper, COLORS.skyWash);
  theme.drawBackdrop(level, 0, 0.5);
  theme.drawTiles(level, 0);
  theme.drawGoal({ x: 300, y: 450 }, 1.2, false);
  theme.drawGoal({ x: 300, y: 450 }, 1.2, true);
  assert.ok(calls.get('stroke') > 10);
  assert.ok(calls.get('fill') > 10);
});

test('the scene renders a sky level with moving clouds, rain, a star, a bat and the Moon', () => {
  const { ctx, calls } = mockContext();
  const def = {
    id: 'skytest',
    theme: 'sky',
    map: mapFromBottom([
      '..............R.....',
      '....................',
      '....................',
      '.........v..........',
      '....................',
      'C.......*..r.......G',
      '####=#######..~~..##',
    ]),
  };
  const game = createGame([def]);
  const camera = createCamera();
  const particles = createParticles();
  const scene = createScene(ctx);
  game.confirm();
  for (let i = 0; i < 720; i++) {
    game.tick(STEP, IDLE);
    if (i % 60 === 0) scene.render({ game, camera, particles, time: i * STEP, lang: 'pl', muted: false, debug: true });
  }
  game.world.player.won = true;
  scene.render({ game, camera, particles, time: 9, lang: 'en', muted: false });
  assert.ok(calls.get('stroke') > 50);
});
