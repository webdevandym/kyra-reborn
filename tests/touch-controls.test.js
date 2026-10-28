import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEAD_ZONE, createTouchControls, mergeSnapshots, stickLayout } from '../src/touch/controls.js';

const SIZE = { width: 800, height: 400 };
const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };

const setup = (scheme = 'slide') => createTouchControls({ scheme, size: SIZE });

test('slide: tap in left half reports jumpPressed once and jumpHeld until lifted', () => {
  const controls = setup();
  controls.pointerDown(1, 100, 200);
  assert.deepEqual(controls.snapshot(), { ...IDLE, jumpHeld: true, jumpPressed: true });
  assert.deepEqual(controls.snapshot(), { ...IDLE, jumpHeld: true });
  controls.pointerUp(1);
  assert.deepEqual(controls.snapshot(), IDLE);
});

test('slide: right thumb past the dead zone walks that way and stops when lifted', () => {
  const controls = setup();
  controls.pointerDown(1, 600, 300);
  assert.equal(controls.snapshot().right, false);
  controls.pointerMove(1, 605, 300);
  assert.equal(controls.snapshot().right, false);
  controls.pointerMove(1, 640, 300);
  assert.deepEqual(controls.snapshot(), { ...IDLE, right: true });
  controls.pointerMove(1, 560, 300);
  assert.deepEqual(controls.snapshot(), { ...IDLE, left: true });
  controls.pointerUp(1);
  assert.deepEqual(controls.snapshot(), IDLE);
});

test('slide: anchor trails the thumb so reversing needs only one range of travel', () => {
  const controls = setup();
  controls.pointerDown(1, 450, 300);
  controls.pointerMove(1, 750, 300);
  assert.equal(controls.snapshot().right, true);
  controls.pointerMove(1, 650, 300);
  assert.deepEqual(controls.snapshot(), { ...IDLE, left: true });
});

test('slide: view reports the landing anchor, the thumb and the direction', () => {
  const controls = setup();
  assert.equal(controls.view().walk, null);
  controls.pointerDown(1, 600, 300);
  controls.pointerMove(1, 640, 310);
  assert.deepEqual(controls.view().walk, { anchorX: 600, anchorY: 300, x: 640, y: 310, dir: 1 });
});

test('a thumb that drifts across the midline keeps its role', () => {
  const controls = setup();
  controls.pointerDown(1, 600, 300);
  controls.pointerMove(1, 100, 300);
  const snap = controls.snapshot();
  assert.equal(snap.left, true);
  assert.equal(snap.jumpHeld, false);
  assert.equal(snap.jumpPressed, false);
});

test('a second touch in an owned zone is ignored until the first lifts', () => {
  const controls = setup();
  controls.pointerDown(1, 100, 200);
  controls.snapshot();
  controls.pointerDown(2, 200, 200);
  assert.equal(controls.snapshot().jumpPressed, false);
  controls.pointerUp(2);
  assert.equal(controls.snapshot().jumpHeld, true);
  controls.pointerUp(1);
  controls.pointerDown(3, 300, 200);
  assert.equal(controls.snapshot().jumpPressed, true);

  controls.pointerDown(4, 600, 300);
  controls.pointerDown(5, 500, 300);
  controls.pointerMove(5, 790, 300);
  assert.equal(controls.snapshot().right, false);
});

test('both thumbs work at once', () => {
  const controls = setup();
  controls.pointerDown(1, 100, 200);
  controls.pointerDown(2, 600, 300);
  controls.pointerMove(2, 660, 300);
  assert.deepEqual(controls.snapshot(), { left: false, right: true, jumpHeld: true, jumpPressed: true });
});

test('pointerUp for an unknown id changes nothing', () => {
  const controls = setup();
  controls.pointerDown(1, 100, 200);
  controls.pointerUp(99);
  assert.equal(controls.snapshot().jumpHeld, true);
});

test('reset releases everything', () => {
  const controls = setup();
  controls.pointerDown(1, 100, 200);
  controls.pointerDown(2, 600, 300);
  controls.pointerMove(2, 700, 300);
  controls.reset();
  assert.deepEqual(controls.snapshot(), IDLE);
  assert.equal(controls.view().walk, null);
  assert.equal(controls.view().jump, false);
});

test('clearPressed drops a pending jump press but keeps the jump held', () => {
  const controls = setup();
  controls.pointerDown(1, 100, 200);
  controls.clearPressed();
  assert.deepEqual(controls.snapshot(), { ...IDLE, jumpHeld: true });
});

test('stick: walking is measured from the fixed stick centre with a dead zone of 12% of its radius', () => {
  const controls = setup('stick');
  const { stick } = stickLayout(SIZE);
  assert.equal(DEAD_ZONE, 0.12);
  controls.pointerDown(1, stick.x, stick.y);
  assert.equal(controls.snapshot().right, false);
  controls.pointerMove(1, stick.x + stick.r * DEAD_ZONE - 1, stick.y);
  assert.equal(controls.snapshot().right, false);
  controls.pointerMove(1, stick.x + stick.r * DEAD_ZONE + 1, stick.y);
  assert.equal(controls.snapshot().right, true);
  controls.pointerMove(1, stick.x - stick.r, stick.y);
  assert.equal(controls.snapshot().left, true);
});

test('stick: the thumb in the view is clamped to the stick radius and the anchor is the stick centre', () => {
  const controls = setup('stick');
  const { stick } = stickLayout(SIZE);
  controls.pointerDown(1, stick.x, stick.y);
  controls.pointerMove(1, SIZE.width - 1, stick.y);
  const { walk } = controls.view();
  assert.equal(walk.anchorX, stick.x);
  assert.equal(walk.anchorY, stick.y);
  assert.equal(walk.x, stick.x + stick.r);
  assert.equal(walk.dir, 1);
});

test('stick: the left half still jumps anywhere and the layout puts jump left and stick right', () => {
  const controls = setup('stick');
  const { jump, stick } = stickLayout(SIZE);
  assert.ok(jump.x < SIZE.width / 2 && stick.x > SIZE.width / 2);
  assert.ok(stick.r * 2 >= 100 && stick.r * 2 <= 140);
  controls.pointerDown(1, 10, 10);
  assert.equal(controls.snapshot().jumpPressed, true);
});

test('setScheme during a touch releases it', () => {
  const controls = setup();
  controls.pointerDown(1, 100, 200);
  controls.pointerDown(2, 600, 300);
  controls.pointerMove(2, 700, 300);
  controls.setScheme('stick');
  assert.deepEqual(controls.snapshot(), IDLE);
});

test('mergeSnapshots ORs every field', () => {
  const a = { left: true, right: false, jumpHeld: false, jumpPressed: true };
  const b = { left: false, right: false, jumpHeld: true, jumpPressed: false };
  assert.deepEqual(mergeSnapshots(a, b), { left: true, right: false, jumpHeld: true, jumpPressed: true });
});
