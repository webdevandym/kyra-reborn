import { RULES } from '../config.js';
import { parseLevel } from './level.js';
import { createWorld } from './world.js';

export function createGame(levelDefs, { best = 0 } = {}) {
  const levels = levelDefs.map(parseLevel);
  let queue = [];

  const game = {
    levels,
    state: 'title',
    levelIndex: 0,
    lives: RULES.startLives,
    points: 0,
    collected: new Set(),
    world: createWorld(levels[0]),
    timer: 0,
    best,

    get level() {
      return levels[game.levelIndex];
    },

    levelCrystals() {
      return { got: game.collected.size, total: game.level.crystals.length };
    },

    newGame() {
      game.lives = RULES.startLives;
      game.points = 0;
      enterLevel(0);
    },

    confirm() {
      if (game.state === 'title' || game.state === 'gameOver' || game.state === 'victory') {
        game.newGame();
      } else if (game.state === 'levelComplete') {
        enterLevel(game.levelIndex + 1);
      }
    },

    togglePause() {
      if (game.state === 'playing') game.state = 'paused';
      else if (game.state === 'paused') game.state = 'playing';
    },

    quitToTitle() {
      game.state = 'title';
      game.levelIndex = 0;
      game.collected = new Set();
      game.world = createWorld(levels[0]);
    },

    tick(dt, input) {
      if (game.state === 'intro') {
        game.timer -= dt;
        if (game.timer <= 0) game.state = 'playing';
      } else if (game.state === 'playing') {
        for (const event of game.world.step(dt, input)) handleWorldEvent(event);
      } else if (game.state === 'dying') {
        game.timer -= dt;
        if (game.timer <= 0) finishDying();
      }
      const events = queue;
      queue = [];
      return events;
    },
  };

  function enterLevel(index) {
    game.levelIndex = index;
    game.collected = new Set();
    game.world = createWorld(levels[index], game.collected);
    game.state = 'intro';
    game.timer = RULES.introTime;
    queue.push({ type: 'levelStart', index });
  }

  function handleWorldEvent(event) {
    queue.push(event);
    if (event.type === 'crystal') {
      game.collected.add(event.id);
      game.points += 1;
      if (game.points % RULES.crystalsPerLife === 0) {
        game.lives = Math.min(game.lives + 1, RULES.maxLives);
        queue.push({ type: 'life', x: event.x, y: event.y });
      }
    } else if (event.type === 'hit') {
      game.lives -= 1;
      game.state = 'dying';
      game.timer = RULES.dyingTime;
      queue.push({ type: 'death', livesLeft: game.lives });
    } else if (event.type === 'goal') {
      if (game.levelIndex + 1 < levels.length) {
        game.state = 'levelComplete';
        queue.push({ type: 'levelComplete', index: game.levelIndex });
      } else {
        game.state = 'victory';
        game.best = Math.max(game.best, game.points);
        queue.push({ type: 'victory' });
      }
    }
  }

  function finishDying() {
    if (game.lives > 0) {
      game.world = createWorld(game.level, game.collected);
      game.state = 'playing';
      queue.push({ type: 'respawn' });
    } else {
      game.state = 'gameOver';
      game.best = Math.max(game.best, game.points);
      queue.push({ type: 'gameOver' });
    }
  }

  return game;
}
