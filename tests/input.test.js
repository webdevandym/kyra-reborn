import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionForCode, createInput } from '../src/input.js';

function key(type, code, extra = {}) {
  return Object.assign(new Event(type, { cancelable: true }), { code, repeat: false, ...extra });
}

function setup() {
  const target = new EventTarget();
  const input = createInput(target);
  const press = (code, extra) => {
    const event = key('keydown', code, extra);
    target.dispatchEvent(event);
    return event;
  };
  const release = (code) => target.dispatchEvent(key('keyup', code));
  return { target, input, press, release };
}

test('arrows, WASD and space map to walk and jump; Esc/P pause; M, L and Enter are menu keys', () => {
  assert.equal(actionForCode('ArrowLeft'), 'left');
  assert.equal(actionForCode('KeyA'), 'left');
  assert.equal(actionForCode('ArrowRight'), 'right');
  assert.equal(actionForCode('KeyD'), 'right');
  assert.equal(actionForCode('Space'), 'jump');
  assert.equal(actionForCode('ArrowUp'), 'jump');
  assert.equal(actionForCode('KeyW'), 'jump');
  assert.equal(actionForCode('Escape'), 'pause');
  assert.equal(actionForCode('KeyP'), 'pause');
  assert.equal(actionForCode('Enter'), 'confirm');
  assert.equal(actionForCode('KeyM'), 'mute');
  assert.equal(actionForCode('KeyL'), 'lang');
  assert.equal(actionForCode('KeyQ'), null);
});

test('held keys show up in the snapshot until released', () => {
  const { input, press, release } = setup();
  press('ArrowRight');
  assert.equal(input.snapshot().right, true);
  assert.equal(input.snapshot().right, true);
  release('ArrowRight');
  assert.equal(input.snapshot().right, false);
});

test('a jump press is reported exactly once even while the key stays held', () => {
  const { input, press } = setup();
  press('Space');
  const first = input.snapshot();
  assert.equal(first.jumpPressed, true);
  assert.equal(first.jumpHeld, true);
  press('Space', { repeat: true });
  const second = input.snapshot();
  assert.equal(second.jumpPressed, false);
  assert.equal(second.jumpHeld, true);
});

test('arrow keys and space never scroll the page, other keys are left alone', () => {
  const { press } = setup();
  assert.equal(press('ArrowUp').defaultPrevented, true);
  assert.equal(press('Space').defaultPrevented, true);
  assert.equal(press('KeyM').defaultPrevented, false);
});

test('one-shot actions reach handlers once per press', () => {
  const { input, press } = setup();
  const seen = [];
  input.onAction((action) => seen.push(action));
  press('Escape');
  press('Escape', { repeat: true });
  press('KeyM');
  press('KeyL');
  press('Enter');
  press('ArrowLeft');
  assert.deepEqual(seen, ['pause', 'mute', 'lang', 'confirm']);
});

test('losing window focus releases every key', () => {
  const { target, input, press } = setup();
  press('ArrowLeft');
  press('Space');
  target.dispatchEvent(new Event('blur'));
  assert.deepEqual(input.snapshot(), { left: false, right: false, jumpHeld: false, jumpPressed: false });
});

test('clearPressed drops pending presses but keeps held keys', () => {
  const { input, press } = setup();
  press('Space');
  input.clearPressed();
  assert.deepEqual(input.snapshot(), { left: false, right: false, jumpHeld: true, jumpPressed: false });
});
