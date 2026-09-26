import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, RAIN } from '../src/config.js';
import { createRainCloud, rainPhase, rainRect } from '../src/core/hazards.js';
import { testLevel } from './helpers.js';

const PERIOD = RAIN.dry + RAIN.warn + RAIN.rain;
const START = RAIN.dry + RAIN.warn;
const EPS = 1e-6;

const LEVEL = testLevel([
  '..R.....R.R.......',
  '..................',
  '..................',
  '..................',
  '..........=.......',
  'C................G',
  '#######....#######',
]);
const [A, OVER_GAP, ON_PLANK] = LEVEL.rainClouds.map((spec) => createRainCloud(spec, LEVEL));
const at = (cloud, u) => u - cloud.col * RAIN.phasePerCol + PERIOD * 4;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('a rain column runs from under the cloud to the first # or = below it, or to the level bottom over a gap', () => {
  assert.equal(A.x, 2.5 * TILE);
  assert.equal(A.top, 6 * TILE);
  assert.equal(A.bottom, 11 * TILE);
  assert.equal(ON_PLANK.bottom, 9 * TILE);
  assert.equal(OVER_GAP.bottom, LEVEL.height);
});

test('each cloud cycles dry, warning, rain on its own clock', () => {
  const cases = [[EPS, 'dry'], [RAIN.dry - EPS, 'dry'], [RAIN.dry + EPS, 'warn'], [START - EPS, 'warn'], [START + EPS, 'rain'], [PERIOD - EPS, 'rain'], [PERIOD + EPS, 'dry']];
  for (const [u, phase] of cases) assert.equal(rainPhase(A, at(A, u)), phase, `u = ${u}`);
});

test('a cloud further right runs ahead on the same clock by phasePerCol per column', () => {
  for (let time = 0; time < PERIOD; time += 0.37) {
    assert.equal(rainPhase(ON_PLANK, time), rainPhase(A, time + (ON_PLANK.col - A.col) * RAIN.phasePerCol), `t = ${time}`);
  }
});

test('while it rains the wet area grows down from the cloud at drop speed and stops at the surface', () => {
  const early = rainRect(A, at(A, START + 0.1));
  assert.ok(near(early.top, A.top));
  assert.ok(near(early.bottom, A.top + RAIN.dropSpeed * 0.1));
  assert.equal(early.left, A.x - (RAIN.width * TILE) / 2);
  assert.equal(early.right, A.x + (RAIN.width * TILE) / 2);
  assert.equal(rainRect(A, at(A, START + 1)).bottom, A.bottom);
});

test('after the rain stops the last drops fall through, then nothing is wet until the next rain', () => {
  const tail = rainRect(A, at(A, 0.1));
  assert.ok(near(tail.top, A.top + RAIN.dropSpeed * 0.1));
  assert.equal(tail.bottom, A.bottom);
  assert.equal(rainRect(A, at(A, (A.bottom - A.top) / RAIN.dropSpeed + 0.01)), null);
  for (let u = RAIN.dry + 0.01; u < START; u += 0.1) assert.equal(rainRect(A, at(A, u)), null, `wet during the warning at u = ${u}`);
});

test('rain over a gap falls to the bottom of the level', () => {
  assert.equal(rainRect(OVER_GAP, at(OVER_GAP, START + 1.5)).bottom, LEVEL.height);
});
