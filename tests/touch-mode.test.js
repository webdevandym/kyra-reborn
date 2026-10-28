import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTouchMode } from '../src/touch/mode.js';

const pointer = (pointerType) => Object.assign(new Event('pointerdown'), { pointerType });
const key = (code = 'KeyA') => Object.assign(new Event('keydown'), { code });

function setup(coarse) {
  const target = new EventTarget();
  const changes = [];
  const mode = createTouchMode({ coarse, target, onChange: (active) => changes.push(active) });
  return { target, mode, changes };
}

test('starts active only when the pointer is coarse', () => {
  assert.equal(setup(true).mode.isActive(), true);
  assert.equal(setup(false).mode.isActive(), false);
});

test('a touch pointerdown turns it on', () => {
  const { target, mode } = setup(false);
  target.dispatchEvent(pointer('touch'));
  assert.equal(mode.isActive(), true);
});

test('a mouse pointerdown does not', () => {
  const { target, mode } = setup(false);
  target.dispatchEvent(pointer('mouse'));
  assert.equal(mode.isActive(), false);
});

test('a keydown turns it off and a later touch turns it on again', () => {
  const { target, mode } = setup(true);
  target.dispatchEvent(key());
  assert.equal(mode.isActive(), false);
  target.dispatchEvent(pointer('touch'));
  assert.equal(mode.isActive(), true);
});

test('onChange fires once per change', () => {
  const { target, changes } = setup(false);
  target.dispatchEvent(pointer('touch'));
  target.dispatchEvent(pointer('touch'));
  target.dispatchEvent(key());
  target.dispatchEvent(key('KeyD'));
  assert.deepEqual(changes, [true, false]);
});

test('dispose stops listening', () => {
  const { target, mode, changes } = setup(false);
  mode.dispose();
  target.dispatchEvent(pointer('touch'));
  assert.equal(mode.isActive(), false);
  assert.deepEqual(changes, []);
});
