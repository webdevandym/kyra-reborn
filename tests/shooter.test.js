import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEP } from '../src/config.js';
import { shooterState, updateShooter, hurtShooter, stompShooter } from '../src/core/shooter.js';

const CFG = { lives: 5, fireEvery: 2.5, windup: 0.3, volleyGap: 0.2, dizzyTime: 0.7 };
const OVER = { ...CFG, overheadDelay: 0.6 };
const CHICKEN = { x: 10 };

function overheadScene({ cooldown, rule = true }) {
  const scene = { above: true };
  scene.e = { x: 0, dir: 1, anim: 0, ...shooterState(OVER, 1), cooldown };
  scene.rules = { cfg: OVER, minVolley: 1, maxVolley: 3, inRange: () => true, shoot: () => ({ kind: 'test' }) };
  if (rule) scene.rules.overhead = () => scene.above;
  scene.run = (seconds) => {
    const shots = [];
    for (let step = 1; step <= Math.round(seconds / STEP); step++) {
      if (updateShooter(scene.e, STEP, null, CHICKEN, scene.rules)) shots.push(step);
    }
    return shots;
  };
  return scene;
}

function defeatSpy() {
  const calls = [];
  const defeat = (e) => {
    calls.push(e);
    return 'sentinel';
  };
  return { calls, defeat };
}

const armed = (lives, dizzy = 0) => ({ lives, dizzy, winding: true, shotsLeft: 2, cooldown: 0.05 });

test('hurtShooter lowers a life, makes it dizzy and resets the volley', () => {
  const e = armed(3);
  hurtShooter(e, CFG);
  assert.deepEqual(e, { lives: 2, dizzy: CFG.dizzyTime, winding: false, shotsLeft: 0, cooldown: CFG.fireEvery, overheadFor: 0 });
});

test('stompShooter bounces while dizzy and leaves the life alone', () => {
  const e = armed(3, 0.4);
  const { calls, defeat } = defeatSpy();
  assert.equal(stompShooter(e, CFG, defeat), 'bounce');
  assert.deepEqual(e, armed(3, 0.4));
  assert.equal(calls.length, 0);
});

test('stompShooter hurts while more than one life is left', () => {
  const e = armed(2);
  const { calls, defeat } = defeatSpy();
  assert.equal(stompShooter(e, CFG, defeat), 'hurt');
  assert.deepEqual(e, { lives: 1, dizzy: CFG.dizzyTime, winding: false, shotsLeft: 0, cooldown: CFG.fireEvery, overheadFor: 0 });
  assert.equal(calls.length, 0);
});

test('stompShooter defeats on the last life and leaves lives at 1', () => {
  const e = armed(1);
  const { calls, defeat } = defeatSpy();
  assert.equal(stompShooter(e, CFG, defeat), 'sentinel');
  assert.deepEqual(calls, [e]);
  assert.equal(e.lives, 1);
});

test('shooterState starts the volley at its smallest size', () => {
  assert.deepEqual(shooterState(CFG, 2), {
    lives: 5,
    dizzy: 0,
    cooldown: 2.5,
    winding: false,
    volleySize: 2,
    volleyHigh: false,
    nextHigh: false,
    shotsLeft: 0,
    gap: 0,
    overheadFor: 0,
  });
});

test('a quick pass overhead gets no shot: the overhead rule holds the wind-up and cancels a volley', () => {
  const winding = overheadScene({ cooldown: OVER.windup / 2 });
  for (let i = 0; i < Math.floor(OVER.overheadDelay / STEP) - 1; i++) {
    assert.equal(updateShooter(winding.e, STEP, null, CHICKEN, winding.rules), null);
    assert.equal(winding.e.winding, false);
  }
  assert.ok(winding.e.overheadFor < OVER.overheadDelay);
  assert.ok(winding.e.cooldown >= OVER.windup, 'a full wind-up is still ahead');

  const volley = overheadScene({ cooldown: 0 });
  Object.assign(volley.e, { shotsLeft: 2, gap: STEP / 2 });
  assert.equal(updateShooter(volley.e, STEP, null, CHICKEN, volley.rules), null);
  assert.equal(volley.e.shotsLeft, 0, 'the rest of the volley is dropped');
});

test('a chicken that stays overhead is shot after the overhead delay plus the wind-up', () => {
  const scene = overheadScene({ cooldown: 0.05 });
  const [first] = scene.run(2);
  const t = first * STEP;
  assert.ok(t >= OVER.overheadDelay + OVER.windup - STEP / 2, `shot at ${t}`);
  assert.ok(t <= OVER.overheadDelay + OVER.windup + 3 * STEP, `shot at ${t}`);
});

test('leaving overhead resets the overhead timer, so a second short pass is safe too', () => {
  const scene = overheadScene({ cooldown: 0.05 });
  assert.deepEqual(scene.run(0.5), []);
  scene.above = false;
  assert.deepEqual(scene.run(STEP), []);
  assert.equal(scene.e.overheadFor, 0);
  scene.above = true;
  assert.deepEqual(scene.run(0.5), []);
});

test('a shooter without an overhead rule fires exactly as with a rule that never sees her overhead', () => {
  const plain = overheadScene({ cooldown: 0.05, rule: false });
  const never = overheadScene({ cooldown: 0.05 });
  never.above = false;
  const shots = plain.run(6);
  assert.ok(shots[0] <= Math.ceil(0.05 / STEP) + 1, `first shot at step ${shots[0]}`);
  assert.deepEqual(shots, never.run(6));
  assert.equal(plain.e.overheadFor, 0);
});

test('hurtShooter resets the overhead timer', () => {
  const e = { ...armed(3), overheadFor: 0.5 };
  hurtShooter(e, OVER);
  assert.equal(e.overheadFor, 0);
});
