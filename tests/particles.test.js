import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createParticles } from '../src/render/particles.js';

test('emitters add particles that move and expire', () => {
  const particles = createParticles();
  particles.feathers(100, 100);
  const count = particles.list.length;
  assert.ok(count > 0);
  const first = { ...particles.list[0] };
  particles.update(0.1);
  assert.notEqual(particles.list[0].x, first.x);
  for (let i = 0; i < 40; i++) particles.update(0.1);
  assert.equal(particles.list.length, 0);
});

test('reduced motion emits about half as many particles', () => {
  const full = createParticles();
  const reduced = createParticles({ reduced: true });
  full.confetti();
  reduced.confetti();
  assert.ok(reduced.list.length <= full.list.length / 2 + 1);
});

test('confetti lives in screen space, everything else in world space', () => {
  const particles = createParticles();
  particles.confetti();
  particles.sparkle(0, 0);
  assert.ok(particles.list.filter((p) => p.kind === 'confetti').every((p) => p.screen));
  assert.ok(particles.list.filter((p) => p.kind === 'sparkle').every((p) => !p.screen));
});

test('the particle pool is capped and clear empties it', () => {
  const particles = createParticles();
  for (let i = 0; i < 20; i++) particles.confetti();
  assert.ok(particles.list.length <= 400);
  particles.clear();
  assert.equal(particles.list.length, 0);
});
