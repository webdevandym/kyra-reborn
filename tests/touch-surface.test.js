import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTouchControls } from '../src/touch/controls.js';
import { createTouchSurface } from '../src/touch/surface.js';

const SIZE = { width: 960, height: 540 };
const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };

function setup({ rect = { left: 0, top: 0, width: 960, height: 540 }, active = true } = {}) {
  const stage = new EventTarget();
  const captured = [];
  stage.getBoundingClientRect = () => rect;
  stage.setPointerCapture = (id) => captured.push(id);
  const controls = createTouchControls({ scheme: 'slide', size: SIZE });
  const surface = createTouchSurface(stage, controls, { isActive: () => active, size: SIZE });
  const fire = (type, init, extra = {}) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0, ...init });
    if (extra.target) Object.defineProperty(event, 'target', { value: extra.target });
    stage.dispatchEvent(event);
    return event;
  };
  return { stage, controls, surface, captured, fire };
}

test('a touch pointerdown in the right half starts walking', () => {
  const { controls, fire } = setup();
  fire('pointerdown', { clientX: 600, clientY: 300 });
  fire('pointermove', { clientX: 680, clientY: 300 });
  assert.deepEqual(controls.snapshot(), { ...IDLE, right: true });
  fire('pointerup', { clientX: 680, clientY: 300 });
  assert.deepEqual(controls.snapshot(), IDLE);
});

test('a touch pointerdown in the left half jumps and is captured', () => {
  const { controls, captured, fire } = setup();
  const event = fire('pointerdown', { clientX: 100, clientY: 300 });
  assert.equal(controls.snapshot().jumpPressed, true);
  assert.deepEqual(captured, [1]);
  assert.equal(event.defaultPrevented, true);
});

test('mouse pointers are ignored', () => {
  const { controls, fire } = setup();
  fire('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 300 });
  assert.deepEqual(controls.snapshot(), IDLE);
});

test('a pointerdown on a button target is ignored so the pause button never also jumps or walks', () => {
  const { controls, fire } = setup();
  const button = { closest: (selector) => (selector === 'button' ? {} : null) };
  fire('pointerdown', { clientX: 100, clientY: 20 }, { target: button });
  assert.deepEqual(controls.snapshot(), IDLE);
});

test('nothing is captured when isActive is false', () => {
  const { controls, captured, fire } = setup({ active: false });
  fire('pointerdown', { clientX: 100, clientY: 300 });
  assert.deepEqual(controls.snapshot(), IDLE);
  assert.deepEqual(captured, []);
});

test('pointercancel releases a held walk', () => {
  const { controls, fire } = setup();
  fire('pointerdown', { clientX: 600, clientY: 300 });
  fire('pointermove', { clientX: 700, clientY: 300 });
  assert.equal(controls.snapshot().right, true);
  fire('pointercancel', { clientX: 700, clientY: 300 });
  assert.deepEqual(controls.snapshot(), IDLE);
});

test('releaseAll releases every touch', () => {
  const { controls, surface, fire } = setup();
  fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 300 });
  fire('pointerdown', { pointerId: 2, clientX: 600, clientY: 300 });
  fire('pointermove', { pointerId: 2, clientX: 700, clientY: 300 });
  surface.releaseAll();
  assert.deepEqual(controls.snapshot(), IDLE);
  fire('pointermove', { pointerId: 2, clientX: 800, clientY: 300 });
  assert.deepEqual(controls.snapshot(), IDLE);
});

test('coordinates are scaled from CSS pixels to controller size', () => {
  const { controls, fire } = setup({ rect: { left: 10, top: 20, width: 480, height: 270 } });
  fire('pointerdown', { clientX: 10 + 300, clientY: 20 + 135 });
  fire('pointermove', { clientX: 10 + 300 + 40, clientY: 20 + 135 });
  assert.deepEqual(controls.view().walk, { anchorX: 600, anchorY: 270, x: 680, y: 270, dir: 1 });
});

test('touchmove on the stage is default-prevented so Safari cannot scroll or bounce', () => {
  const { stage } = setup();
  const event = new Event('touchmove', { cancelable: true });
  stage.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
});

test('dispose stops listening', () => {
  const { controls, surface, fire } = setup();
  surface.dispose();
  fire('pointerdown', { clientX: 100, clientY: 300 });
  assert.deepEqual(controls.snapshot(), IDLE);
});
