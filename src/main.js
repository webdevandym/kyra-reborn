import * as config from './config.js';
import { VIEW_W, VIEW_H, VIEW_W_MIN, STEP, MAX_FRAME, TILE, COLORS, setViewWidth, viewWidthFor } from './config.js';
import levels from './levels/index.js';
import { createGame } from './core/game.js';
import { createCamera, updateCamera, snapCamera } from './core/camera.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createScene } from './render/scene.js';
import { createParticles } from './render/particles.js';
import { t, loadLang, nextLang, nextLangName, resolveLang, DEFAULT_LANG, formatTime } from './i18n/index.js';
import { load, save } from './storage.js';
import { DEFAULT_SCHEME, SCHEMES, createTouchControls, mergeSnapshots } from './touch/controls.js';
import { createTouchMode } from './touch/mode.js';
import { createTouchOverlay } from './touch/overlay.js';
import { createTouchSurface } from './touch/surface.js';
import { swipeStep } from './touch/swipe.js';

const NO_INPUT = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const WORLD_ICONS = {
  meadow: '<svg class="level-card__world" viewBox="0 0 24 16" aria-hidden="true"><path d="M1 15h22M4 15c1-4 2-7 4-10M10 15c1-4 3-7 5-9M16 15c1-3 3-6 6-7"/></svg>',
  sky: '<svg class="level-card__world" viewBox="0 0 30 18" aria-hidden="true"><path d="M26 2a5 5 0 1 0 3 8a4 4 0 1 1-3-8z"/><path d="M4 16a4 4 0 0 1 1-8a5 5 0 0 1 9-2a4 4 0 0 1 6 3a3.5 3.5 0 0 1 0 7z"/></svg>',
  castle: '<svg class="level-card__world" viewBox="0 0 24 18" aria-hidden="true"><path d="M5 17V5h3v2h2V5h4v2h2V5h3v12z"/><path d="M10 17v-4a2 2 0 0 1 4 0v4"/></svg>',
  sea: '<svg class="level-card__world" viewBox="0 0 30 18" aria-hidden="true"><path d="M2 9c3-4 6 4 9 0s6 4 9 0s5 3 8 0"/><path d="M2 15c3-4 6 4 9 0s6 4 9 0s5 3 8 0"/><circle cx="22" cy="3.5" r="2"/></svg>',
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const screens = [...document.querySelectorAll('[data-screen]')];
const picker = document.querySelector('[data-level-picker]');
const dots = document.querySelector('[data-level-dots]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const debug = location.hash.includes('debug');

const prefs = { lang: resolveLang(load('kyra.lang')) };
prefs.lang = await bootLang(prefs.lang);

async function bootLang(lang) {
  try {
    await loadLang(lang);
    return lang;
  } catch (error) {
    console.warn(error);
  }
  try {
    await loadLang(DEFAULT_LANG);
  } catch (error) {
    console.warn(error);
  }
  return DEFAULT_LANG;
}

const game = createGame(levels, { best: Number(load('kyra.best', 0)) || 0 });
const camera = createCamera();
const particles = createParticles({ reduced: reducedMotion });
const audio = createAudio({ muted: load('kyra.muted', false) === true });
const input = createInput(window);
const scene = createScene(ctx);

const touchLayer = document.getElementById('touch-layer');
const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });
const savedScheme = load('kyra.controls', DEFAULT_SCHEME);
let touchScheme = SCHEMES.includes(savedScheme) ? savedScheme : DEFAULT_SCHEME;
const touch = createTouchControls({ scheme: touchScheme, size: viewportSize() });
const overlay = createTouchOverlay(touchLayer, touch, { size: viewportSize(), scheme: touchScheme });
const touchMode = createTouchMode({
  coarse: matchMedia('(pointer: coarse)').matches,
  target: window,
  onChange: (active) => {
    document.documentElement.dataset.touch = active ? 'on' : 'off';
    releaseTouch();
    applyView();
  },
});
const surface = createTouchSurface(touchLayer, touch, { isActive: () => touchMode.isActive() && game.state === 'playing' });
document.documentElement.dataset.touch = touchMode.isActive() ? 'on' : 'off';

function releaseTouch() {
  touch.reset();
  surface.releaseAll();
}

function syncTouchSize() {
  touch.setSize(viewportSize());
  overlay.setSize(viewportSize());
}

const desk = document.querySelector('.desk');
let appliedViewWidth = 0;

function applyView() {
  let width = VIEW_W_MIN;
  if (touchMode.isActive()) {
    const style = getComputedStyle(desk);
    const available = window.innerWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    width = viewWidthFor(available / window.innerHeight);
  }
  const next = setViewWidth(width);
  if (next === appliedViewWidth) return;
  appliedViewWidth = next;
  document.documentElement.style.setProperty('--view-aspect', `${next} / ${VIEW_H}`);
  snapCamera(camera, game.world.player, game.world.level);
  resizeCanvas();
}

let seenViewport = '';

function syncViewport() {
  const key = `${window.innerWidth}x${window.innerHeight}`;
  if (key === seenViewport) return;
  seenViewport = key;
  syncTouchSize();
  applyView();
}

let shakeTime = 0;

const PAUSE_BUTTON = { size: 44, edge: 8 };
let hudInset = 0;

function pauseButtonOverlap(stageRight, stageWidth) {
  if (!touchMode.isActive()) return 0;
  const safeRight = parseFloat(getComputedStyle(desk).paddingRight) || 0;
  const buttonLeft = window.innerWidth - Math.max(PAUSE_BUTTON.edge, safeRight) - PAUSE_BUTTON.size;
  const overlap = Math.max(0, stageRight - buttonLeft + PAUSE_BUTTON.edge);
  return (overlap * VIEW_W) / stageWidth;
}

function resizeCanvas() {
  const { width, height, right } = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  hudInset = width > 0 ? pauseButtonOverlap(right, width) : 0;
}

function levelTitle(index = game.levelIndex) {
  return `${t('level', prefs.lang)} ${index + 1} · ${t(game.levels[index].nameKey, prefs.lang)}`;
}

function fillStats() {
  const { got, total } = game.levelCrystals();
  const values = {
    best: game.best,
    points: game.points,
    crystals: `${got} / ${total}`,
    levelTime: formatTime(game.levelTime),
    levelTitle: levelTitle(),
    pickedLevel: levelTitle(game.selectedIndex),
  };
  for (const el of document.querySelectorAll('[data-stat]')) el.textContent = values[el.dataset.stat];
}

function buildPicker() {
  game.levels.forEach((level, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'btn level-card';
    card.tabIndex = -1;
    card.dataset.action = 'pick';
    card.dataset.level = String(index);
    card.innerHTML = `<span class="level-card__number">${index + 1}</span><span class="level-card__name"></span><span class="level-card__meta"><span class="level-card__stars" aria-hidden="true">${'★'.repeat(level.difficulty)}</span>${WORLD_ICONS[level.theme]}</span>`;
    picker.append(card);
    const dot = document.createElement('span');
    dot.className = 'carousel__dot';
    dot.dataset.theme = level.theme;
    dots.append(dot);
  });
}

function syncPicker() {
  picker.style.setProperty('--index', String(game.selectedIndex));
  for (const card of picker.children) {
    const index = Number(card.dataset.level);
    const offset = Math.max(-2, Math.min(2, index - game.selectedIndex));
    card.dataset.offset = String(offset);
    card.setAttribute('aria-pressed', String(offset === 0));
    card.setAttribute('aria-label', levelTitle(index));
    if (Math.abs(offset) === 2) card.setAttribute('aria-hidden', 'true');
    else card.removeAttribute('aria-hidden');
    card.querySelector('.level-card__name').textContent = t(game.levels[index].nameKey, prefs.lang);
  }
  [...dots.children].forEach((dot, index) => dot.toggleAttribute('data-picked', index === game.selectedIndex));
}

function applyStrings() {
  document.documentElement.lang = prefs.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n, prefs.lang);
  for (const el of document.querySelectorAll('[data-sound-label]')) el.textContent = t(audio.muted ? 'soundOff' : 'soundOn', prefs.lang);
  for (const el of document.querySelectorAll('[data-next-lang]')) el.textContent = nextLangName(prefs.lang);
  for (const el of document.querySelectorAll('[data-controls-label]')) el.textContent = t(touchScheme === 'slide' ? 'controlsSlide' : 'controlsStick', prefs.lang);
  for (const el of document.querySelectorAll('[data-i18n-aria-label]')) el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel, prefs.lang));
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
  document.documentElement.dataset.state = game.state;
  fillStats();
  for (const el of screens) el.hidden = el.dataset.screen !== game.state;
  focusPrimary();
}

function pickLevel(index) {
  if (!game.selectLevel(index)) return false;
  snapCamera(camera, game.world.player, game.world.level);
  syncPicker();
  fillStats();
  return true;
}

function toggleMute() {
  audio.setMuted(!audio.muted);
  save('kyra.muted', audio.muted);
  applyStrings();
}

let switchingLang = false;

function toggleLang() {
  if (switchingLang) return;
  switchingLang = true;
  const next = nextLang(prefs.lang);
  loadLang(next)
    .then(() => {
      prefs.lang = next;
      save('kyra.lang', next);
      applyStrings();
    })
    .catch((error) => console.warn(error))
    .finally(() => {
      switchingLang = false;
    });
}

function toggleControls() {
  touchScheme = touchScheme === 'slide' ? 'stick' : 'slide';
  touch.setScheme(touchScheme);
  overlay.setScheme(touchScheme);
  save('kyra.controls', touchScheme);
  applyStrings();
}

const BUTTON_ACTIONS = {
  confirm: () => game.confirm(),
  pause: () => {
    releaseTouch();
    game.togglePause();
  },
  controls: toggleControls,
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
        if (e.result === 'shrunk' || e.result === 'hurt') audio.sfx.shrink();
        else audio.sfx.stomp();
        particles.stars(e.x, e.y);
        if (e.result === 'hurt') particles.text(e.x, e.y - 14, '♥', COLORS.heart);
        if (e.result === 'defeated') particles.poof(e.x, e.y + 12);
        break;
      case 'throw':
        if (e.x > camera.x - 100 && e.x < camera.x + VIEW_W + 100) audio.sfx.throw();
        break;
      case 'boneBreak':
        particles.poof(e.x, e.y - 6);
        break;
      case 'door':
        audio.sfx.door();
        snapCamera(camera, game.world.player, game.world.level);
        break;
      case 'fire':
        if (e.x > camera.x - 100 && e.x < camera.x + VIEW_W + 100) audio.sfx.fire();
        break;
      case 'shell':
        if (e.x > camera.x - 100 && e.x < camera.x + VIEW_W + 100) audio.sfx.shell();
        break;
      case 'bubble':
        audio.sfx.bubble();
        particles.sparkle(e.x, e.y, COLORS.bubbleInk);
        break;
      case 'bubbleGrab':
        particles.sparkle(e.x, e.y, COLORS.bubbleInk);
        break;
      case 'bubblePop':
        audio.sfx.bubblePop();
        particles.poof(e.x, e.y);
        break;
      case 'pearlOpen':
        audio.sfx.pearl();
        particles.sparkle(e.x, e.y, COLORS.pearlShine);
        break;
      case 'crabPinch':
        audio.sfx.stomp();
        particles.stars(e.x, e.y);
        particles.text(e.x, e.y - 14, e.result === 'defeated' ? '✓' : '♥', COLORS.heart);
        if (e.result === 'defeated') particles.poof(e.x, e.y + 12);
        break;
      case 'goalOpen':
        audio.sfx.portal();
        particles.sparkle(e.x, e.y - 42, COLORS.goal);
        break;
      case 'shieldUp':
        audio.sfx.shieldUp();
        particles.sparkle(e.x, e.y, COLORS.shieldInk);
        break;
      case 'shieldPop':
        audio.sfx.shieldPop();
        particles.sparkle(e.x, e.y, COLORS.shieldInk);
        break;
      case 'portalOpen':
        audio.sfx.portal();
        particles.sparkle(e.x, e.y - 35, COLORS.portal);
        break;
      case 'portal':
        audio.sfx.portal();
        particles.sparkle(e.from.x, e.from.y - 35, COLORS.portal);
        particles.sparkle(e.to.x, e.to.y - 35, COLORS.portal);
        particles.text(e.to.x + 120, e.to.y - 90, t('checkpoint', prefs.lang), COLORS.ink);
        snapCamera(camera, game.world.player, game.world.level);
        break;
      case 'rainStart':
        if (e.x > camera.x - 100 && e.x < camera.x + VIEW_W + 100) audio.sfx.rain();
        break;
      case 'hit':
        audio.sfx.hit();
        particles.feathers(e.x, e.y);
        if (!reducedMotion) shakeTime = 0.3;
        break;
      case 'levelStart':
        if (touchMode.isActive()) overlay.showHint();
        particles.clear();
        snapCamera(camera, game.world.player, game.world.level);
        break;
      case 'respawn':
        snapCamera(camera, game.world.player, game.world.level);
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
  if (game.state === 'playing') {
    input.clearPressed();
    touch.clearPressed();
    syncTouchSize();
    if (touchMode.isActive() && portrait.matches) autoPause();
  } else {
    releaseTouch();
  }
  if (game.state === 'title') {
    particles.clear();
    snapCamera(camera, game.world.player, game.world.level);
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
  const buttons = [...screen.querySelectorAll('button:not(.level-card)')];
  if (!buttons.length) return;
  event.preventDefault();
  const index = buttons.indexOf(document.activeElement);
  const delta = event.code === 'ArrowUp' || event.code === 'ArrowLeft' ? -1 : 1;
  buttons[(index + delta + buttons.length) % buttons.length].focus();
});

const carousel = document.querySelector('.carousel');
let swipeStart = null;
let swiped = false;
carousel.addEventListener('pointerdown', (event) => {
  swiped = false;
  swipeStart = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
});
carousel.addEventListener('pointerup', (event) => {
  if (!swipeStart || game.state !== 'title') return;
  const step = swipeStep(event.clientX - swipeStart.x, event.clientY - swipeStart.y);
  swipeStart = null;
  if (step === 0) return;
  swiped = true;
  if (pickLevel(game.selectedIndex - step)) {
    audio.sfx.click();
    focusPrimary();
  }
});
carousel.addEventListener('pointercancel', () => {
  swipeStart = null;
});
carousel.addEventListener(
  'click',
  (event) => {
    if (!swiped) return;
    swiped = false;
    event.stopPropagation();
  },
  true,
);

window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('touchend', () => audio.unlock(), { passive: true });

const portrait = matchMedia('(orientation: portrait)');

const autoPause = () => {
  input.reset();
  releaseTouch();
  if (game.state === 'playing') game.togglePause();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) autoPause();
});
window.addEventListener('blur', autoPause);
window.addEventListener('resize', syncViewport);
portrait.addEventListener('change', (event) => {
  if (event.matches && touchMode.isActive()) autoPause();
});

new ResizeObserver(resizeCanvas).observe(canvas);
resizeCanvas();
syncViewport();

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
      snapCamera(camera, p, game.world.level);
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
  syncViewport();
  const dt = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;
  if (game.state !== 'paused') {
    acc += dt;
    time += dt;
  }
  while (acc >= STEP) {
    syncState();
    const gameInput = game.state === 'playing' ? mergeSnapshots(input.snapshot(), touch.snapshot()) : NO_INPUT;
    handleEvents(game.tick(STEP, gameInput));
    particles.update(STEP);
    updateCamera(camera, game.world.player, game.world.level, STEP);
    shakeTime = Math.max(0, shakeTime - STEP);
    acc -= STEP;
  }
  syncState();
  overlay.update();
  const k = shakeTime / 0.3;
  const shake = { x: (Math.random() - 0.5) * 10 * k, y: (Math.random() - 0.5) * 8 * k };
  ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
  scene.render({ game, camera, particles, time, lang: prefs.lang, muted: audio.muted, debug, touch: touchMode.isActive(), hudInset, reducedMotion, shake, fps });
  requestAnimationFrame(frame);
}

buildPicker();
applyStrings();
snapCamera(camera, game.world.player, game.world.level);
requestAnimationFrame(frame);
