import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shooterState, hurtShooter, stompShooter } from '../src/core/shooter.js';

const CFG = { lives: 5, fireEvery: 2.5, windup: 0.3, volleyGap: 0.2, dizzyTime: 0.7 };

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
  assert.deepEqual(e, { lives: 2, dizzy: CFG.dizzyTime, winding: false, shotsLeft: 0, cooldown: CFG.fireEvery });
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
  assert.deepEqual(e, { lives: 1, dizzy: CFG.dizzyTime, winding: false, shotsLeft: 0, cooldown: CFG.fireEvery });
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
  });
});
