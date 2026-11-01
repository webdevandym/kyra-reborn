import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { TILE, COLORS } from '../src/config.js';
import levels from '../src/levels/index.js';
import { createGame } from '../src/core/game.js';
import { createWorld } from '../src/core/world.js';
import { createCamera } from '../src/core/camera.js';
import { parseLevel } from '../src/core/level.js';
import { createScene } from '../src/render/scene.js';
import { createParticles } from '../src/render/particles.js';
import { setBoilTime } from '../src/render/ink.js';
import { createMeadowTheme } from '../src/render/meadow.js';
import { createSkyTheme } from '../src/render/sky.js';
import { createCastleTheme } from '../src/render/castle.js';
import { createSeaTheme } from '../src/render/sea.js';
import {
  drawStar,
  drawChicken,
  drawCarrot,
  drawPropellerCarrot,
  drawBee,
  drawZombie,
  drawGem,
  drawRedCrystal,
  drawGreenCrystal,
  drawSign,
  drawHeart,
  drawGemIcon,
  drawMutedIcon,
} from '../src/render/sprites.js';
import { drawRat, drawGhost, drawSkeleton, drawSpider, drawFireball, drawPortal, drawCheckpoint, drawShield, drawPrincess, drawBone, drawDoor } from '../src/render/castle-sprites.js';
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
  drawBubbleCage,
} from '../src/render/sea-sprites.js';
import { drawStarEnemy, drawBat, drawRainCloud, drawMovingCloud, drawMoon } from '../src/render/sky-sprites.js';
import { LANGS, loadLang } from '../src/i18n/index.js';
import { recordingContext } from './helpers.js';

const GOLDEN_URL = new URL('./golden/render.json', import.meta.url);
const UPDATE = process.env.UPDATE_GOLDEN === '1';
const DUMP_DIR = process.env.GOLDEN_DUMP;
const CHUNK = 64;
const BOIL_TIME = 1.3;

function digest(log) {
  const chunks = [];
  for (let i = 0; i < log.length; i += CHUNK) chunks.push(createHash('sha1').update(log.slice(i, i + CHUNK).join('\n')).digest('hex'));
  return { count: log.length, chunks };
}

before(async () => {
  for (const lang of LANGS) await loadLang(lang, { fetchJson: (url) => JSON.parse(readFileSync(url, 'utf8')) });
});

const trail = Array.from({ length: 12 }, (_, i) => ({ x: 200 + i * 2, y: 300 - i, t: i * 0.02 }));
const portal = { x: 500, y: 450, w: 50, h: 70 };
const cloud = { x: 300, y: 250, top: 270, bottom: 450 };
const wetFull = { left: 255, right: 345, top: 270, bottom: 450 };
const wetShort = { left: 255, right: 345, top: 270, bottom: 380 };

const SPRITE_STATES = {
  drawStar: {
    'default colour and seed': (ctx) => drawStar(ctx, 100, 450, 14),
    'custom colour and seed': (ctx) => drawStar(ctx, 100, 450, 6, COLORS.paper, 7),
  },
  drawChicken: {
    'facing -1 running': (ctx) => drawChicken(ctx, { x: 100, y: 450, facing: -1, vx: 200, onGround: true }, 1.3),
    'facing 1 standing': (ctx) => drawChicken(ctx, { x: 100, y: 450, facing: 1, vx: 0, onGround: true }, 2.1),
    'airborne flapping': (ctx) => drawChicken(ctx, { x: 100, y: 300, facing: 1, vx: 0, onGround: false }, 0.7),
    'celebrating hop': (ctx) => drawChicken(ctx, { x: 100, y: 300, facing: 1, vx: 0, onGround: false, celebrate: true }, 2.1),
    'squashed landing': (ctx) => drawChicken(ctx, { x: 100, y: 450, squash: 0.1 }, 0.3),
    'blinking': (ctx) => drawChicken(ctx, { x: 100, y: 450 }, 3.25),
    'minimal': (ctx) => drawChicken(ctx, { x: 100, y: 450 }, 1.3),
  },
  drawCarrot: {
    'dir -1 stepping': (ctx) => drawCarrot(ctx, { x: 200, y: 450, dir: -1, anim: 3 }, 0.5),
    'dir 1 stepping': (ctx) => drawCarrot(ctx, { x: 200, y: 450, dir: 1, anim: 3 }, 0.5),
    'minimal': (ctx) => drawCarrot(ctx, { x: 200, y: 450 }, 1.3),
  },
  drawPropellerCarrot: {
    'dir -1 anim 2': (ctx) => drawPropellerCarrot(ctx, { x: 350, y: 440, dir: -1, anim: 2 }, 0.9),
    'dir 1 anim 0': (ctx) => drawPropellerCarrot(ctx, { x: 350, y: 440, dir: 1, anim: 0 }, Math.PI / 50),
    'minimal': (ctx) => drawPropellerCarrot(ctx, { x: 350, y: 440 }, 1.3),
  },
  drawBee: {
    'dir 1': (ctx) => drawBee(ctx, { x: 380, y: 400, dir: 1 }, 1.1),
    'dir -1': (ctx) => drawBee(ctx, { x: 380, y: 400, dir: -1 }, 0),
    'minimal': (ctx) => drawBee(ctx, { x: 380, y: 400 }, 1.3),
  },
  drawZombie: {
    'big dir -1': (ctx) => drawZombie(ctx, { x: 300, y: 450, size: 'big', anim: 1, dizzy: 0, dir: -1 }, 0.7),
    'big dir 1': (ctx) => drawZombie(ctx, { x: 300, y: 450, size: 'big', anim: 1, dizzy: 0, dir: 1 }, 0.7),
    'big dizzy': (ctx) => drawZombie(ctx, { x: 300, y: 450, size: 'big', anim: 1, dizzy: 0.4, dir: -1 }, 0.7),
    'small dir -1': (ctx) => drawZombie(ctx, { x: 300, y: 450, size: 'small', anim: 1, dizzy: 0, dir: -1 }, 0.7),
    'small dir 1 dizzy': (ctx) => drawZombie(ctx, { x: 300, y: 450, size: 'small', anim: 1, dizzy: 0.4, dir: 1 }, 0.7),
    'minimal': (ctx) => drawZombie(ctx, { x: 300, y: 450 }, 1.3),
  },
  drawGem: {
    'small red': (ctx) => drawGem(ctx, 1.05, COLORS.crystal, COLORS.crystalLight, 41),
    'large green': (ctx) => drawGem(ctx, 2.5, COLORS.goal, COLORS.goalLight, 51),
  },
  drawRedCrystal: {
    'bobbing at x 400': (ctx) => drawRedCrystal(ctx, { x: 400, y: 300 }, 1),
    'resting at x 0': (ctx) => drawRedCrystal(ctx, { x: 0, y: 300 }, 0),
  },
  drawGreenCrystal: {
    'time 1.3': (ctx) => drawGreenCrystal(ctx, { x: 500, y: 450 }, 1.3),
    'time 0': (ctx) => drawGreenCrystal(ctx, { x: 500, y: 450 }, 0),
  },
  drawSign: {
    'two lines': (ctx) => drawSign(ctx, { x: 600, y: 450 }, 'Two\nlines'),
    'one line': (ctx) => drawSign(ctx, { x: 600, y: 450 }, 'Jump'),
    'three lines in Ukrainian': (ctx) => drawSign(ctx, { x: 600, y: 450 }, 'Один\nДва\nТри'),
  },
  drawHeart: {
    'default seed': (ctx) => drawHeart(ctx, 30, 30, 13),
    'custom seed': (ctx) => drawHeart(ctx, 60, 40, 5, 9),
  },
  drawGemIcon: {
    'default seed': (ctx) => drawGemIcon(ctx, 100, 30),
    'custom seed': (ctx) => drawGemIcon(ctx, 100, 30, 5),
  },
  drawMutedIcon: {
    'default seed': (ctx) => drawMutedIcon(ctx, 100, 30),
    'custom seed': (ctx) => drawMutedIcon(ctx, 100, 30, 5),
  },

  drawRat: {
    'dir -1 stepping': (ctx) => drawRat(ctx, { x: 100, y: 450, dir: -1, anim: 2 }, 0.4),
    'dir 1': (ctx) => drawRat(ctx, { x: 100, y: 450, dir: 1, anim: 0 }, 1.2),
    'guard': (ctx) => drawRat(ctx, { x: 100, y: 450, dir: -1, anim: 1, guard: true }, 0.2),
    'guard dir 1': (ctx) => drawRat(ctx, { x: 100, y: 450, dir: 1, anim: 1, guard: true }, 0.2),
    'minimal': (ctx) => drawRat(ctx, { x: 100, y: 450 }, 1.3),
  },
  drawGhost: {
    'dir -1 with trail': (ctx) => drawGhost(ctx, { x: 200, y: 300, h: 36, dir: -1, shy: false, trail }, 0.7),
    'dir 1 without trail': (ctx) => drawGhost(ctx, { x: 200, y: 300, h: 36, dir: 1, shy: false, trail: [] }, 0.7),
    'shy without trail': (ctx) => drawGhost(ctx, { x: 200, y: 300, h: 36, dir: 1, shy: true, trail: [] }, 0.1),
    'shy dir -1 with trail': (ctx) => drawGhost(ctx, { x: 200, y: 300, h: 36, dir: -1, shy: true, trail }, 0.1),
    'tall': (ctx) => drawGhost(ctx, { x: 200, y: 300, h: 50, dir: -1, shy: false, trail }, 0.7),
    'minimal': (ctx) => drawGhost(ctx, { x: 200, y: 300 }, 1.3),
  },
  drawSkeleton: {
    'dir -1 lives 3': (ctx) => drawSkeleton(ctx, { x: 300, y: 450, dir: -1, anim: 3, lives: 3, dizzy: 0 }, 1.9),
    'dir 1 lives 2': (ctx) => drawSkeleton(ctx, { x: 300, y: 450, dir: 1, anim: 1, lives: 2, dizzy: 0 }, 0.3),
    'dir -1 lives 1 dizzy': (ctx) => drawSkeleton(ctx, { x: 300, y: 450, dir: -1, anim: 3, lives: 1, dizzy: 0.4 }, 1.9),
    'dir 1 lives 3 dizzy': (ctx) => drawSkeleton(ctx, { x: 300, y: 450, dir: 1, anim: 1, lives: 3, dizzy: 0.4 }, 0.3),
    'winding': (ctx) => drawSkeleton(ctx, { x: 300, y: 450, dir: 1, anim: 1, lives: 2, dizzy: 0, winding: true }, 0.3),
    'winding dir -1': (ctx) => drawSkeleton(ctx, { x: 300, y: 450, dir: -1, anim: 1, lives: 2, dizzy: 0, winding: true }, 0.3),
    'minimal': (ctx) => drawSkeleton(ctx, { x: 300, y: 450 }, 1.3),
  },
  drawSpider: {
    'dir -1 lives 3': (ctx) => drawSpider(ctx, { x: 400, y: 450, dir: -1, winding: false, lives: 3, dizzy: 0 }, 0.5),
    'dir 1 lives 1': (ctx) => drawSpider(ctx, { x: 400, y: 450, dir: 1, winding: false, lives: 1, dizzy: 0 }, 0.5),
    'dir 1 winding lives 1': (ctx) => drawSpider(ctx, { x: 400, y: 450, dir: 1, winding: true, lives: 1, dizzy: 0 }, 0.8),
    'dir -1 winding lives 3': (ctx) => drawSpider(ctx, { x: 400, y: 450, dir: -1, winding: true, lives: 3, dizzy: 0 }, 0.8),
    'dizzy lives 1': (ctx) => drawSpider(ctx, { x: 400, y: 450, dir: 1, winding: false, lives: 1, dizzy: 0.5 }, 0.9),
    'dizzy lives 3 dir -1': (ctx) => drawSpider(ctx, { x: 400, y: 450, dir: -1, winding: false, lives: 3, dizzy: 0.5 }, 0.9),
    'minimal': (ctx) => drawSpider(ctx, { x: 400, y: 450 }, 1.3),
  },
  drawFireball: {
    'vx -220': (ctx) => drawFireball(ctx, { x: 450, y: 436, vx: -220 }, 0.2),
    'vx 220': (ctx) => drawFireball(ctx, { x: 450, y: 386, vx: 220 }, 0.9),
    'vx 0': (ctx) => drawFireball(ctx, { x: 450, y: 386, vx: 0 }, 0.9),
    'minimal': (ctx) => drawFireball(ctx, { x: 450, y: 436 }, 1.3),
  },
  drawPortal: {
    'closed draws nothing': (ctx) => drawPortal(ctx, portal, 0, 0.1),
    'opening': (ctx) => drawPortal(ctx, portal, 0.4, 0.3),
    'open and clamped': (ctx) => drawPortal(ctx, portal, 3, 2.1),
    'exactly grown': (ctx) => drawPortal(ctx, portal, 1, 0.7),
  },
  drawCheckpoint: {
    'flag down': (ctx) => drawCheckpoint(ctx, { x: 600, y: 450 }, false, 0.2),
    'flag raised': (ctx) => drawCheckpoint(ctx, { x: 600, y: 450 }, true, 1.4),
  },
  drawShield: {
    'time 0.6': (ctx) => drawShield(ctx, { x: 650, y: 450, h: 40 }, 0.6),
    'time 2.2': (ctx) => drawShield(ctx, { x: 650, y: 450, h: 40 }, 2.2),
  },
  drawPrincess: {
    'asleep': (ctx) => drawPrincess(ctx, { x: 700, y: 450 }, 0.3, false),
    'awake': (ctx) => drawPrincess(ctx, { x: 700, y: 450 }, 2.3, true),
    'minimal': (ctx) => drawPrincess(ctx, { x: 700, y: 450 }, 1.3),
  },
  drawBone: {
    'vx 150': (ctx) => drawBone(ctx, { x: 200, y: 300, vx: 150 }, 0.3),
    'vx -150': (ctx) => drawBone(ctx, { x: 200, y: 300, vx: -150 }, 1.7),
    'vx 0': (ctx) => drawBone(ctx, { x: 200, y: 300, vx: 0 }, 1.7),
    'minimal': (ctx) => drawBone(ctx, { x: 200, y: 300 }, 1.3),
  },
  drawDoor: {
    'standing': (ctx) => drawDoor(ctx, { x: 300, y: 450 }, 0.4),
    'elsewhere': (ctx) => drawDoor(ctx, { x: 90, y: 360 }, 1.9),
  },

  drawDolphin: {
    'dir 1 lives 2': (ctx) => drawDolphin(ctx, { x: 100, y: 450, dir: 1, anim: 2, lives: 2, dizzy: 0 }, 0.4),
    'dir -1 lives 3': (ctx) => drawDolphin(ctx, { x: 100, y: 300, dir: -1, anim: 0, lives: 3, dizzy: 0 }, 1.2),
    'dir -1 lives 1 dizzy': (ctx) => drawDolphin(ctx, { x: 100, y: 300, dir: -1, anim: 0, lives: 1, dizzy: 0.4 }, 1.2),
    'dir 1 lives 3 dizzy': (ctx) => drawDolphin(ctx, { x: 100, y: 300, dir: 1, anim: 2, lives: 3, dizzy: 0.4 }, 1.2),
    'minimal': (ctx) => drawDolphin(ctx, { x: 100, y: 450 }, 1.3),
  },
  drawFish: {
    'dir -1 anim 3': (ctx) => drawFish(ctx, { x: 200, y: 450, dir: -1, anim: 3 }, 0.5),
    'dir 1 anim 0': (ctx) => drawFish(ctx, { x: 200, y: 300, dir: 1, anim: 0 }, 0.9),
    'minimal': (ctx) => drawFish(ctx, { x: 100, y: 450 }, 0),
  },
  drawShark: {
    'dir -1 lives 3': (ctx) => drawShark(ctx, { x: 400, y: 450, dir: -1, winding: false, lives: 3, dizzy: 0, w: 104 }, 0.5),
    'dir 1 lives 1': (ctx) => drawShark(ctx, { x: 400, y: 450, dir: 1, winding: false, lives: 1, dizzy: 0, w: 104 }, 0.5),
    'dir 1 winding lives 1': (ctx) => drawShark(ctx, { x: 400, y: 450, dir: 1, winding: true, lives: 1, dizzy: 0, w: 104 }, 0.8),
    'dir -1 winding lives 3': (ctx) => drawShark(ctx, { x: 400, y: 450, dir: -1, winding: true, lives: 3, dizzy: 0, w: 104 }, 0.8),
    'dir -1 dizzy lives 1': (ctx) => drawShark(ctx, { x: 400, y: 450, dir: -1, winding: false, lives: 1, dizzy: 0.5, w: 104 }, 0.8),
    'dir 1 dizzy lives 3': (ctx) => drawShark(ctx, { x: 400, y: 450, dir: 1, winding: false, lives: 3, dizzy: 0.5, w: 104 }, 0.8),
    'wide': (ctx) => drawShark(ctx, { x: 400, y: 450, dir: -1, winding: false, lives: 2, dizzy: 0, w: 140 }, 0.5),
    'minimal': (ctx) => drawShark(ctx, { x: 400, y: 450 }, 1.3),
  },
  drawShell: {
    'vx -300': (ctx) => drawShell(ctx, { x: 450, y: 436, vx: -300, vy: 0 }, 0.2),
    'vx 300': (ctx) => drawShell(ctx, { x: 450, y: 436, vx: 300, vy: 0 }, 0.2),
    'vy -300': (ctx) => drawShell(ctx, { x: 450, y: 386, vx: 0, vy: -300 }, 0.9),
    'vy 300': (ctx) => drawShell(ctx, { x: 450, y: 386, vx: 0, vy: 300 }, 0.9),
    'minimal': (ctx) => drawShell(ctx, { x: 450, y: 436 }, 1.3),
  },
  drawBubble: {
    'empty': (ctx) => drawBubble(ctx, { x: 500, y: 300, size: 40, carry: null }, 0.3),
    'carrying a crystal': (ctx) => drawBubble(ctx, { x: 500, y: 300, size: 40, carry: { id: '1,1' } }, 1.3),
    'minimal': (ctx) => drawBubble(ctx, { x: 500, y: 300 }, 1.3),
  },
  drawPlayerBubble: {
    'time 0.6': (ctx) => drawPlayerBubble(ctx, { x: 550, y: 400, h: 40 }, 0.6),
    'time 2.2': (ctx) => drawPlayerBubble(ctx, { x: 550, y: 400, h: 40 }, 2.2),
  },
  drawTealCrystal: {
    'time 0.7': (ctx) => drawTealCrystal(ctx, { x: 600, y: 380 }, 0.7),
    'time 0 at x 0': (ctx) => drawTealCrystal(ctx, { x: 0, y: 380 }, 0),
  },
  drawPearl: {
    'closed': (ctx) => drawPearl(ctx, { x: 650, y: 450, open: false }, 0.4),
    'open': (ctx) => drawPearl(ctx, { x: 650, y: 450, open: true }, 1.4),
    'minimal': (ctx) => drawPearl(ctx, { x: 650, y: 450 }, 1.3),
  },
  drawCrab: {
    'dir 1 cooldown 0': (ctx) => drawCrab(ctx, { x: 700, y: 450, dir: 1, anim: 2, cooldown: 0 }, 0.5),
    'dir -1 cooldown 0.8': (ctx) => drawCrab(ctx, { x: 700, y: 450, dir: -1, anim: 0, cooldown: 0.8 }, 1.5),
    'dir -1 cooldown 0.3': (ctx) => drawCrab(ctx, { x: 700, y: 450, dir: -1, anim: 1, cooldown: 0.3 }, 1.5),
    'minimal': (ctx) => drawCrab(ctx, { x: 700, y: 450 }, 1.3),
  },
  drawSandStick: {
    'dx 1.2': (ctx) => drawSandStick(ctx, { x: 750, y: 450, w: 135, dx: 1.2, dy: 0 }),
    'dx -0.8': (ctx) => drawSandStick(ctx, { x: 750, y: 450, w: 90, dx: -0.8, dy: 0 }),
    'dy -1.1': (ctx) => drawSandStick(ctx, { x: 750, y: 400, w: 90, dx: 0, dy: -1.1 }),
    'dy 0.9': (ctx) => drawSandStick(ctx, { x: 750, y: 400, w: 90, dx: 0, dy: 0.9 }),
    'dx and dy 0': (ctx) => drawSandStick(ctx, { x: 750, y: 400, w: 90, dx: 0, dy: 0 }),
    'dy wins over dx': (ctx) => drawSandStick(ctx, { x: 750, y: 400, w: 90, dx: 1, dy: 1 }),
    'minimal': (ctx) => drawSandStick(ctx, { x: 750, y: 400, w: 90 }),
  },
  drawBubbleCage: {
    'time 0.7': (ctx) => drawBubbleCage(ctx, { x: 800, y: 450 }, 0.7),
    'time 2.2': (ctx) => drawBubbleCage(ctx, { x: 800, y: 450 }, 2.2),
  },

  drawStarEnemy: {
    'dir 1 lives 2': (ctx) => drawStarEnemy(ctx, { x: 100, y: 450, dir: 1, anim: 2, lives: 2, dizzy: 0 }, 0.4),
    'dir -1 lives 1 dizzy': (ctx) => drawStarEnemy(ctx, { x: 100, y: 450, dir: -1, anim: 1, lives: 1, dizzy: 0.3 }, 1.2),
    'dir -1 lives 3': (ctx) => drawStarEnemy(ctx, { x: 100, y: 450, dir: -1, anim: 1, lives: 3, dizzy: 0 }, 1.2),
    'dir 1 lives 3 dizzy': (ctx) => drawStarEnemy(ctx, { x: 100, y: 450, dir: 1, anim: 2, lives: 3, dizzy: 0.3 }, 0.4),
    'dir 1 lives 1': (ctx) => drawStarEnemy(ctx, { x: 100, y: 450, dir: 1, anim: 2, lives: 1, dizzy: 0 }, 0.4),
    'minimal': (ctx) => drawStarEnemy(ctx, { x: 100, y: 450 }, 1.3),
  },
  drawBat: {
    'dir -1': (ctx) => drawBat(ctx, { x: 200, y: 400, dir: -1 }, 0.7),
    'dir 1': (ctx) => drawBat(ctx, { x: 200, y: 400, dir: 1 }, 0),
    'minimal': (ctx) => drawBat(ctx, { x: 200, y: 400 }, 1.3),
  },
  drawRainCloud: {
    'dry': (ctx) => drawRainCloud(ctx, cloud, { phase: 'dry', wet: null, time: 0.2 }),
    'warn': (ctx) => drawRainCloud(ctx, cloud, { phase: 'warn', wet: null, time: 0.9 }),
    'rain on the ground with splashes': (ctx) => drawRainCloud(ctx, cloud, { phase: 'rain', wet: wetFull, time: 1.1 }),
    'rain stopping short of the ground': (ctx) => drawRainCloud(ctx, cloud, { phase: 'rain', wet: wetShort, time: 1.1 }),
    'dry with rain still falling': (ctx) => drawRainCloud(ctx, cloud, { phase: 'dry', wet: { left: 255, right: 345, top: 400, bottom: 450 }, time: 1.3 }),
    'minimal': (ctx) => drawRainCloud(ctx, cloud, { phase: 'dry', wet: null, time: 1.3 }),
  },
  drawMovingCloud: {
    'dx 1.2': (ctx) => drawMovingCloud(ctx, { x: 400, y: 450, w: 135, dx: 1.2 }),
    'dx -0.8': (ctx) => drawMovingCloud(ctx, { x: 400, y: 450, w: 90, dx: -0.8 }),
    'dx 0': (ctx) => drawMovingCloud(ctx, { x: 400, y: 450, w: 90, dx: 0 }),
    'dx just under the threshold': (ctx) => drawMovingCloud(ctx, { x: 400, y: 450, w: 90, dx: 0.04 }),
  },
  drawMoon: {
    'asleep': (ctx) => drawMoon(ctx, { x: 500, y: 450 }, 0.3, false),
    'awake': (ctx) => drawMoon(ctx, { x: 500, y: 450 }, 2.3, true),
    'minimal': (ctx) => drawMoon(ctx, { x: 500, y: 450 }, 1.3),
  },
};

const THEME_FACTORIES = { meadow: createMeadowTheme, sky: createSkyTheme, castle: createCastleTheme, sea: createSeaTheme };
const GOAL_STATES = {
  meadow: { 'goal': [false, false] },
  sky: { 'moon asleep': [false, false], 'moon awake': [true, false] },
  castle: { 'princess asleep': [false, false], 'princess awake': [true, false] },
  sea: { 'caged': [false, true], 'free': [false, false], 'won': [true, false] },
};

const parsedLevels = levels.map(parseLevel);
const camXs = (level) => [['camX 0', 0], ['camX half', Math.floor(level.cols / 2) * TILE + 13]];

const CASES = [];

for (const [fn, states] of Object.entries(SPRITE_STATES)) {
  for (const [state, draw] of Object.entries(states)) CASES.push({ name: `sprite ${fn} ${state}`, draw });
}

for (const [themeName, createTheme] of Object.entries(THEME_FACTORIES)) {
  const levelIndex = parsedLevels.findIndex((level) => level.theme === themeName);
  const level = parsedLevels[levelIndex];
  for (const [camLabel, camX] of camXs(level)) {
    CASES.push({ name: `theme ${themeName} drawBackdrop ${camLabel}`, draw: (ctx) => createTheme(ctx).drawBackdrop(level, camX, BOIL_TIME) });
    CASES.push({ name: `theme ${themeName} drawTiles ${camLabel}`, draw: (ctx) => createTheme(ctx).drawTiles(level, camX) });
    for (const [goalLabel, [awake, locked]] of Object.entries(GOAL_STATES[themeName])) {
      CASES.push({
        name: `theme ${themeName} drawGoal ${goalLabel} ${camLabel}`,
        draw: (ctx) => {
          ctx.translate(-camX, 0);
          createTheme(ctx).drawGoal(level.goal, BOIL_TIME, awake, locked);
        },
      });
    }
    CASES.push({
      name: `scene ${themeName} level ${levelIndex + 1} ${camLabel}`,
      draw: (ctx) => {
        const game = createGame(levels);
        game.state = 'playing';
        game.levelIndex = levelIndex;
        game.world = createWorld(game.levels[levelIndex]);
        const camera = createCamera();
        camera.x = camX;
        createScene(ctx).render({ game, camera, particles: createParticles(), time: BOIL_TIME, lang: 'en', muted: false });
      },
    });
  }
}

const DRAWS_NOTHING = new Set(['sprite drawPortal closed draws nothing']);
const fileSlug = (name) => name.replace(/[^A-Za-z0-9.-]+/g, '_');
const recorded = {};
let golden = null;

function firstDifferingChunk(expected, actual) {
  const longest = Math.max(expected.chunks.length, actual.chunks.length);
  for (let i = 0; i < longest; i++) if (expected.chunks[i] !== actual.chunks[i]) return i;
  return -1;
}

function readGolden() {
  if (golden) return golden;
  try {
    golden = JSON.parse(readFileSync(GOLDEN_URL, 'utf8'));
  } catch (error) {
    throw new Error(`tests/golden/render.json cannot be read (${error.message}); it is generated once from the unmodified src with UPDATE_GOLDEN=1`);
  }
  return golden;
}

test('golden case names are unique and map to unique dump file names', () => {
  const names = CASES.map((c) => c.name);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(names.map(fileSlug)).size, names.length);
});

test('the golden file holds exactly the cases this test draws', { skip: UPDATE }, () => {
  assert.deepEqual(Object.keys(readGolden()).sort(), CASES.map((c) => c.name).sort());
});

for (const { name, draw } of CASES) {
  test(`${name} replays its golden canvas log`, () => {
    setBoilTime(BOIL_TIME);
    const { ctx, log } = recordingContext();
    draw(ctx);
    assert.equal(log.length === 0, DRAWS_NOTHING.has(name), `${name}: ${log.length} canvas calls`);
    if (DUMP_DIR) {
      mkdirSync(DUMP_DIR, { recursive: true });
      writeFileSync(`${DUMP_DIR}/${fileSlug(name)}.log`, `${log.join('\n')}\n`);
    }
    const actual = digest(log);
    if (UPDATE) {
      recorded[name] = actual;
      return;
    }
    const expected = readGolden()[name];
    assert.ok(expected, `${name}: no golden entry; the golden file is generated once with UPDATE_GOLDEN=1`);
    const index = firstDifferingChunk(expected, actual);
    if (index >= 0) {
      assert.fail(`${name}: first differing chunk ${index} (log entries ${index * CHUNK} to ${index * CHUNK + CHUNK - 1}), ${expected.count} entries expected, ${actual.count} drawn; rerun with GOLDEN_DUMP=<dir> and diff against a dump of the first commit`);
    }
    assert.equal(actual.count, expected.count);
  });
}

after(() => {
  if (!UPDATE || Object.keys(recorded).length !== CASES.length) return;
  const body = Object.entries(recorded).map(([name, value]) => `  ${JSON.stringify(name)}: ${JSON.stringify(value)}`);
  mkdirSync(new URL('./golden/', import.meta.url), { recursive: true });
  writeFileSync(GOLDEN_URL, `{\n${body.join(',\n')}\n}\n`);
});
