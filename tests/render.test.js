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
import { mapFromBottom, castleMap } from './helpers.js';
import { createSkyTheme } from '../src/render/sky.js';
import { drawStarEnemy, drawBat, drawRainCloud, drawMovingCloud, drawMoon } from '../src/render/sky-sprites.js';
import { createCastleTheme } from '../src/render/castle.js';
import { drawRat, drawGhost, drawSkeleton, drawSpider, drawFireball, drawBone, drawPortal, drawCheckpoint, drawShield, drawPrincess, drawDoor } from '../src/render/castle-sprites.js';
import { ROOM_PROPS, ROOM_TINTS } from '../src/render/castle-props.js';
import { createSeaTheme } from '../src/render/sea.js';
import { drawDolphin, drawFish, drawShark, drawShell, drawBubble, drawPlayerBubble, drawTealCrystal, drawPearl, drawCrab, drawSandStick, drawBubbleCage } from '../src/render/sea-sprites.js';
import { ROOM_KINDS } from '../src/core/level.js';

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
      snapCamera(camera, game.world.player, game.level);
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

test('every castle sprite draws without errors and with finite coordinates', () => {
  const { ctx, calls } = mockContext();
  drawRat(ctx, { x: 100, y: 450, dir: 1, anim: 2 }, 0.4);
  drawRat(ctx, { x: 100, y: 450, dir: -1, anim: 0 }, 1.2);
  const trail = Array.from({ length: 12 }, (_, i) => ({ x: 200 + i * 2, y: 300 - i, t: i * 0.02 }));
  drawGhost(ctx, { x: 200, y: 300, h: 36, dir: -1, shy: false, trail }, 0.7);
  drawGhost(ctx, { x: 200, y: 300, h: 36, dir: 1, shy: true, trail: [] }, 0.1);
  drawSkeleton(ctx, { x: 300, y: 450, dir: 1, anim: 1, lives: 2, dizzy: 0 }, 0.3);
  drawSkeleton(ctx, { x: 300, y: 450, dir: -1, anim: 3, lives: 1, dizzy: 0.4 }, 1.9);
  drawSpider(ctx, { x: 400, y: 450, dir: -1, winding: false }, 0.5);
  drawSpider(ctx, { x: 400, y: 450, dir: 1, winding: true }, 0.8);
  drawFireball(ctx, { x: 450, y: 436, vx: -220 }, 0.2);
  drawFireball(ctx, { x: 450, y: 386, vx: 220 }, 0.9);
  const portal = { x: 500, y: 450, w: 50, h: 70 };
  drawPortal(ctx, portal, 0, 0.1);
  drawPortal(ctx, portal, 0.4, 0.3);
  drawPortal(ctx, portal, 3, 2.1);
  drawCheckpoint(ctx, { x: 600, y: 450 }, false, 0.2);
  drawCheckpoint(ctx, { x: 600, y: 450 }, true, 1.4);
  drawShield(ctx, { x: 650, y: 450, h: 40 }, 0.6);
  drawPrincess(ctx, { x: 700, y: 450 }, 0.3, false);
  drawPrincess(ctx, { x: 700, y: 450 }, 2.3, true);
  assert.ok(calls.get('stroke') > 40);
  assert.ok(calls.get('fill') > 20);
});

test('a closed portal draws nothing', () => {
  const { ctx, calls } = mockContext();
  drawPortal(ctx, { x: 500, y: 450, w: 50, h: 70 }, 0, 0.1);
  assert.equal(calls.size, 0);
});

test('the castle theme paints the parchment wash and draws its backdrop, stone tiles, shelves and the princess', () => {
  const { ctx, calls } = mockContext();
  const theme = createCastleTheme(ctx);
  const level = parseLevel({ id: 'castletheme', map: castleMap(['..====....', 'C...##...G', '##########'], [7]) });
  assert.equal(theme.paper, COLORS.castleWash);
  theme.drawBackdrop(level, 0, 0.5);
  theme.drawTiles(level, 0);
  theme.drawGoal({ x: 300, y: 450 }, 1.2, false);
  theme.drawGoal({ x: 300, y: 450 }, 1.2, true);
  assert.ok(calls.get('stroke') > 10);
  assert.ok(calls.get('fill') > 10);
});

test('the scene renders a castle level with the spider firing, the shield, a ghost trail, the open portal and the checkpoint', () => {
  const { ctx, calls } = mockContext();
  const def = { id: 'castletest', theme: 'castle', map: castleMap(['...g......................', 'C...m...s..S.O......#K...G', '##########################'], [20]) };
  const game = createGame([def]);
  const camera = createCamera();
  const particles = createParticles();
  const scene = createScene(ctx);
  game.confirm();
  let fireballs = 0;
  for (let i = 0; i < 720; i++) {
    game.tick(STEP, IDLE);
    game.world.player.invuln = 1;
    game.world.player.shield = true;
    fireballs = Math.max(fireballs, game.world.projectiles.length);
    if (i === 400) game.world.portal.open = true;
    if (i % 60 === 0) scene.render({ game, camera, particles, time: i * STEP, lang: 'pl', muted: false, debug: true });
  }
  assert.ok(fireballs > 0, 'the spider fired while the scene was drawn');
  game.world.checkpointReached = true;
  game.world.player.won = true;
  scene.render({ game, camera, particles, time: 9, lang: 'en', muted: false, debug: true });
  assert.ok(calls.get('stroke') > 50);
});

test('the new castle sprites draw with finite coordinates: door, bone, guard rat, throwing skeleton, hurt and dizzy spider', () => {
  const { ctx, calls } = mockContext();
  drawDoor(ctx, { x: 300, y: 450 }, 0.4);
  drawBone(ctx, { x: 200, y: 300, vx: 150 }, 0.3);
  drawBone(ctx, { x: 200, y: 300, vx: -150 }, 1.7);
  drawRat(ctx, { x: 100, y: 450, dir: -1, anim: 1, guard: true }, 0.2);
  drawSkeleton(ctx, { x: 300, y: 450, dir: 1, anim: 1, lives: 2, dizzy: 0, winding: true }, 0.3);
  drawSpider(ctx, { x: 400, y: 450, dir: -1, winding: false, lives: 3, dizzy: 0 }, 0.5);
  drawSpider(ctx, { x: 400, y: 450, dir: 1, winding: false, lives: 1, dizzy: 0.5 }, 0.9);
  assert.ok(calls.get('stroke') > 30);
  assert.ok(calls.get('fill') > 10);
});

test('every room kind has props and a tint, and every prop draws with finite coordinates', () => {
  assert.deepEqual(Object.keys(ROOM_PROPS).sort(), [...ROOM_KINDS].sort());
  assert.deepEqual(Object.keys(ROOM_TINTS).sort(), [...ROOM_KINDS].sort());
  const { ctx, calls } = mockContext();
  for (const kind of ROOM_KINDS) ROOM_PROPS[kind].forEach((draw, i) => draw(ctx, 200 + i * 40, 1.3 + i, 900 + i));
  assert.ok(calls.get('stroke') > 50);
});

test('the castle theme tints and decorates each room by its kind, and draws the throne behind the princess', () => {
  const { ctx, calls } = mockContext();
  const theme = createCastleTheme(ctx);
  const row = 'C' + '.'.repeat(24) + '#' + '.'.repeat(24) + 'G';
  const level = parseLevel({ id: 'kinds', map: castleMap([row, '#'.repeat(row.length)], [25]), rooms: ['dungeon', 'throne'] });
  assert.equal(theme.paperAt(level, 0), COLORS.dungeonWash);
  assert.equal(theme.paperAt(level, 26 * TILE), COLORS.throneWash);
  const plain = parseLevel({ id: 'plain', map: castleMap(['C....G', '######']) });
  assert.equal(theme.paperAt(plain, 0), COLORS.castleWash);
  theme.drawBackdrop(level, 0, 0.5);
  theme.drawBackdrop(level, 26 * TILE, 0.5);
  theme.drawBackdrop(plain, 0, 0.5);
  theme.drawGoal({ x: 45 * TILE, y: 11 * TILE }, 1, true);
  assert.ok(calls.get('stroke') > 20);
});

test('every sea sprite draws without errors and with finite coordinates', () => {
  const { ctx, calls } = mockContext();
  drawDolphin(ctx, { x: 100, y: 450, dir: 1, anim: 2, lives: 2, dizzy: 0 }, 0.4);
  drawDolphin(ctx, { x: 100, y: 300, dir: -1, anim: 0, lives: 1, dizzy: 0.4 }, 1.2);
  drawFish(ctx, { x: 200, y: 450, dir: -1, anim: 3 }, 0.5);
  drawFish(ctx, { x: 200, y: 300, dir: 1, anim: 0 }, 0.9);
  drawShark(ctx, { x: 400, y: 450, dir: -1, winding: false, lives: 3, dizzy: 0, w: 104 }, 0.5);
  drawShark(ctx, { x: 400, y: 450, dir: 1, winding: true, lives: 1, dizzy: 0.5, w: 104 }, 0.8);
  drawShell(ctx, { x: 450, y: 436, vx: -300, vy: 0 }, 0.2);
  drawShell(ctx, { x: 450, y: 386, vx: 0, vy: -300 }, 0.9);
  drawBubble(ctx, { x: 500, y: 300, size: 40, carry: null }, 0.3);
  drawBubble(ctx, { x: 500, y: 300, size: 40, carry: { id: '1,1' } }, 1.3);
  drawPlayerBubble(ctx, { x: 550, y: 400, h: 40 }, 0.6);
  drawTealCrystal(ctx, { x: 600, y: 380 }, 0.7);
  drawPearl(ctx, { x: 650, y: 450, open: false }, 0.4);
  drawPearl(ctx, { x: 650, y: 450, open: true }, 1.4);
  drawCrab(ctx, { x: 700, y: 450, dir: 1, anim: 2, cooldown: 0 }, 0.5);
  drawCrab(ctx, { x: 700, y: 450, dir: -1, anim: 0, cooldown: 0.8 }, 1.5);
  drawSandStick(ctx, { x: 750, y: 450, w: 135, dx: 1.2, dy: 0 });
  drawSandStick(ctx, { x: 750, y: 400, w: 90, dx: 0, dy: -1.1 });
  drawSandStick(ctx, { x: 750, y: 400, w: 90, dx: 0, dy: 0.9 });
  drawSandStick(ctx, { x: 750, y: 400, w: 90, dx: 0, dy: 0 });
  drawBubbleCage(ctx, { x: 800, y: 450 }, 0.7);
  assert.ok(calls.get('stroke') > 40);
  assert.ok(calls.get('fill') > 20);
});

test('the sea theme paints the water wash and draws its backdrop, sand tiles, reef ledges and the green crystal, caged until the sharks are gone', () => {
  const { ctx, calls } = mockContext();
  const theme = createSeaTheme(ctx);
  const level = parseLevel({ id: 'seatheme', theme: 'sea', map: mapFromBottom(['..=====...', 'C...##..HG', '####..####']) });
  assert.equal(theme.paper, COLORS.seaWash);
  theme.drawBackdrop(level, 0, 0.5);
  theme.drawBackdrop(level, 3 * TILE, 4.5);
  theme.drawTiles(level, 0);
  theme.drawGoal({ x: 300, y: 450 }, 1.2, false, true);
  theme.drawGoal({ x: 300, y: 450 }, 1.2, true, false);
  assert.ok(calls.get('stroke') > 10);
  assert.ok(calls.get('fill') > 10);
});

test('the scene renders a sea level with swimmers, a shark firing shells, bubbles, a pearl and crab, lifts and a shield', () => {
  const { ctx, calls } = mockContext();
  const def = {
    id: 'seatest',
    theme: 'sea',
    map: mapFromBottom([
      '....................',
      '.......o...r........',
      '..........d.........',
      '....................',
      'C..T..P.f.VV.H...G..',
      '####.....~~~########',
    ]),
  };
  const game = createGame([def]);
  const camera = createCamera();
  const particles = createParticles();
  const scene = createScene(ctx);
  game.confirm();
  let shells = 0;
  let crabs = 0;
  for (let i = 0; i < 1500; i++) {
    game.tick(STEP, IDLE);
    game.world.player.invuln = 1;
    game.world.player.shield = true;
    game.world.player.shieldAll = true;
    game.world.player.bubble = i % 400 < 100;
    if (i === 100) game.world.pearls[0].open = true;
    if (i === 120) game.world.player.x = game.world.pearls[0].x;
    shells = Math.max(shells, game.world.projectiles.length);
    crabs = Math.max(crabs, game.world.crabs.length);
    if (i % 60 === 0) scene.render({ game, camera, particles, time: i * STEP, lang: 'pl', muted: false, debug: true });
  }
  assert.ok(shells > 0, 'the shark fired while the scene was drawn');
  game.world.player.won = true;
  scene.render({ game, camera, particles, time: 9, lang: 'en', muted: false, debug: true });
  assert.ok(calls.get('stroke') > 50);
});
