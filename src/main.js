import * as config from './config.js';
import { VIEW_W, VIEW_H, STEP, MAX_FRAME, TILE, COLORS } from './config.js';
import levels from './levels/index.js';
import { createGame } from './core/game.js';
import { createCamera, updateCamera, snapCamera } from './core/camera.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createScene } from './render/scene.js';
import { createParticles } from './render/particles.js';
import { t, localized, nextLang, nextLangName, resolveLang } from './strings.js';
import { load, save } from './storage.js';

const NO_INPUT = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const screens = [...document.querySelectorAll('[data-screen]')];
const picker = document.querySelector('[data-level-picker]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const debug = location.hash.includes('debug');

const prefs = { lang: resolveLang(load('kyra.lang')) };
const game = createGame(levels, { best: Number(load('kyra.best', 0)) || 0 });
const camera = createCamera();
const particles = createParticles({ reduced: reducedMotion });
const audio = createAudio({ muted: load('kyra.muted', false) === true });
const input = createInput(window);
const scene = createScene(ctx);

let shakeTime = 0;

function resizeCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
}

function levelTitle(index = game.levelIndex) {
  return `${t('level', prefs.lang)} ${index + 1} · ${localized(game.levels[index].name, prefs.lang)}`;
}

function fillStats() {
  const { got, total } = game.levelCrystals();
  const values = {
    best: game.best,
    points: game.points,
    crystals: `${got} / ${total}`,
    levelTitle: levelTitle(),
    pickedLevel: levelTitle(game.selectedIndex),
  };
  for (const el of document.querySelectorAll('[data-stat]')) el.textContent = values[el.dataset.stat];
}

function buildPicker() {
  game.levels.forEach((level, index) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'btn level-tile';
    tile.dataset.action = 'pick';
    tile.dataset.level = String(index);
    const number = document.createElement('span');
    number.className = 'level-tile__number';
    number.textContent = String(index + 1);
    const stars = document.createElement('span');
    stars.className = 'level-tile__stars';
    stars.setAttribute('aria-hidden', 'true');
    stars.textContent = '★'.repeat(level.difficulty);
    tile.append(number, stars);
    picker.append(tile);
  });
}

function syncPicker() {
  for (const tile of picker.children) {
    const index = Number(tile.dataset.level);
    tile.setAttribute('aria-pressed', String(index === game.selectedIndex));
    tile.setAttribute('aria-label', levelTitle(index));
  }
}

function applyStrings() {
  document.documentElement.lang = prefs.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n, prefs.lang);
  for (const el of document.querySelectorAll('[data-sound-label]')) el.textContent = t(audio.muted ? 'soundOff' : 'soundOn', prefs.lang);
  for (const el of document.querySelectorAll('[data-next-lang]')) el.textContent = nextLangName(prefs.lang);
  syncPicker();
  fillStats();
}

function visibleScreen() {
  return screens.find((el) => !el.hidden) ?? null;
}

function focusPrimary() {
  const primary = visibleScreen()?.querySelector('[data-primary]');
  if (primary) primary.focus({ preventScroll: true });
  else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function syncScreens() {
  fillStats();
  for (const el of screens) el.hidden = el.dataset.screen !== game.state;
  focusPrimary();
}

function pickLevel(index) {
  if (!game.selectLevel(index)) return false;
  snapCamera(camera, game.world.player, game.world.level.width);
  syncPicker();
  fillStats();
  return true;
}

function toggleMute() {
  audio.setMuted(!audio.muted);
  save('kyra.muted', audio.muted);
  applyStrings();
}

function toggleLang() {
  prefs.lang = nextLang(prefs.lang);
  save('kyra.lang', prefs.lang);
  applyStrings();
}

const BUTTON_ACTIONS = {
  confirm: () => game.confirm(),
  pick: (button) => {
    pickLevel(Number(button.dataset.level));
    focusPrimary();
  },
  resume: () => game.togglePause(),
  menu: () => game.quitToTitle(),
  lang: toggleLang,
  mute: toggleMute,
};

function handleEvents(events) {
  for (const e of events) {
    switch (e.type) {
      case 'jump':
        audio.sfx.jump();
        break;
      case 'land':
        particles.dust(e.x, e.y);
        break;
      case 'crystal':
        audio.sfx.crystal();
        particles.sparkle(e.x, e.y, COLORS.crystal);
        particles.text(e.x, e.y - 20, '+1', COLORS.crystal);
        break;
      case 'life':
        audio.sfx.life();
        particles.text(e.x, e.y - 50, '+1 ♥', COLORS.heart);
        break;
      case 'stomp':
        if (e.result === 'shrunk') audio.sfx.shrink();
        else audio.sfx.stomp();
        particles.stars(e.x, e.y);
        if (e.result === 'defeated') particles.poof(e.x, e.y + 12);
        break;
      case 'hit':
        audio.sfx.hit();
        particles.feathers(e.x, e.y);
        if (!reducedMotion) shakeTime = 0.3;
        break;
      case 'levelStart':
        particles.clear();
        snapCamera(camera, game.world.player, game.world.level.width);
        break;
      case 'respawn':
        snapCamera(camera, game.world.player, game.world.level.width);
        break;
      case 'levelComplete':
        audio.sfx.levelComplete();
        particles.sparkle(game.world.goal.x, game.world.goal.y - 40, COLORS.goal);
        break;
      case 'victory':
        audio.sfx.levelComplete();
        particles.confetti();
        save('kyra.best', game.best);
        break;
      case 'gameOver':
        audio.sfx.gameOver();
        save('kyra.best', game.best);
        break;
    }
  }
}

function onStateChange() {
  if (game.state === 'playing') input.clearPressed();
  if (game.state === 'title') {
    particles.clear();
    snapCamera(camera, game.world.player, game.world.level.width);
  }
  syncScreens();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  audio.unlock();
  audio.sfx.click();
  BUTTON_ACTIONS[button.dataset.action]?.(button);
});

input.onAction((action) => {
  if (action === 'pause') game.togglePause();
  else if (action === 'mute') toggleMute();
  else if (action === 'lang') toggleLang();
  else if (action === 'confirm') visibleScreen()?.querySelector('[data-primary]')?.click();
});

window.addEventListener('keydown', (event) => {
  audio.unlock();
  const screen = visibleScreen();
  if (!screen || !ARROWS.has(event.code)) return;
  if (game.state === 'title' && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) {
    event.preventDefault();
    if (pickLevel(game.selectedIndex + (event.code === 'ArrowLeft' ? -1 : 1))) {
      audio.sfx.click();
      focusPrimary();
    }
    return;
  }
  const buttons = [...screen.querySelectorAll('button')];
  if (!buttons.length) return;
  event.preventDefault();
  const index = buttons.indexOf(document.activeElement);
  const delta = event.code === 'ArrowUp' || event.code === 'ArrowLeft' ? -1 : 1;
  buttons[(index + delta + buttons.length) % buttons.length].focus();
});

window.addEventListener('pointerdown', () => audio.unlock());

const autoPause = () => {
  input.reset();
  if (game.state === 'playing') game.togglePause();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) autoPause();
});
window.addEventListener('blur', autoPause);

new ResizeObserver(resizeCanvas).observe(canvas);
resizeCanvas();

if (debug) {
  window.kyra = {
    game,
    config,
    camera,
    teleport(col) {
      const p = game.world.player;
      p.x = (col + 0.5) * TILE;
      p.y = 2 * TILE;
      p.vx = 0;
      p.vy = 0;
      p.onGround = false;
      snapCamera(camera, p, game.world.level.width);
    },
  };
}

let last = performance.now();
let acc = 0;
let time = 0;
let fps = 60;
let prevState = null;

function syncState() {
  if (game.state === prevState) return;
  prevState = game.state;
  onStateChange();
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;
  if (game.state !== 'paused') {
    acc += dt;
    time += dt;
  }
  while (acc >= STEP) {
    syncState();
    const gameInput = game.state === 'playing' ? input.snapshot() : NO_INPUT;
    handleEvents(game.tick(STEP, gameInput));
    particles.update(STEP);
    updateCamera(camera, game.world.player, game.world.level.width, STEP);
    shakeTime = Math.max(0, shakeTime - STEP);
    acc -= STEP;
  }
  syncState();
  const k = shakeTime / 0.3;
  const shake = { x: (Math.random() - 0.5) * 10 * k, y: (Math.random() - 0.5) * 8 * k };
  ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
  scene.render({ game, camera, particles, time, lang: prefs.lang, muted: audio.muted, debug, reducedMotion, shake, fps });
  requestAnimationFrame(frame);
}

buildPicker();
applyStrings();
snapCamera(camera, game.world.player, game.world.level.width);
requestAnimationFrame(frame);
