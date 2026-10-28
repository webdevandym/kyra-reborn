import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLORS } from '../src/config.js';
import { STRIP_COLOR, STRIP_RGB } from '../src/render/strip.js';

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

test('the rgb triple is the strip colour', () => {
  assert.equal(STRIP_RGB, channels(STRIP_COLOR).join(', '));
});

test('the strip colour stays close to the paper colour of every world', () => {
  const papers = [COLORS.paper, COLORS.skyWash, COLORS.castleWash, COLORS.seaWash];
  const strip = channels(STRIP_COLOR);
  for (const paper of papers) {
    channels(paper).forEach((value, i) => assert.ok(Math.abs(value - strip[i]) <= 14, `${paper} vs ${STRIP_COLOR}`));
  }
});
