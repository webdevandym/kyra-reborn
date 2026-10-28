import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COVER_PARAM, retryUrl, shouldRetryCover, withoutCoverParam } from '../src/touch/cover.js';

const PHONE = { coarse: true, screen: { width: 440, height: 956 }, search: '' };
const inset = { ...PHONE, inner: { width: 832, height: 366 } };

test('a phone in landscape that still has a window narrower than the screen retries once', () => {
  assert.equal(shouldRetryCover(inset), true);
});

test('a window that fills the screen needs no retry', () => {
  assert.equal(shouldRetryCover({ ...PHONE, inner: { width: 956, height: 366 } }), false);
  assert.equal(shouldRetryCover({ ...PHONE, inner: { width: 945, height: 366 } }), false);
});

test('portrait is not treated as inset', () => {
  assert.equal(shouldRetryCover({ ...PHONE, inner: { width: 440, height: 766 } }), false);
});

test('a page that already came from a retry never retries again', () => {
  assert.equal(shouldRetryCover({ ...inset, search: `?${COVER_PARAM}=1` }), false);
  assert.equal(shouldRetryCover({ ...inset, search: `?a=1&${COVER_PARAM}=1` }), false);
});

test('desktops and tablets are left alone', () => {
  assert.equal(shouldRetryCover({ ...inset, coarse: false }), false);
  assert.equal(shouldRetryCover({ ...inset, screen: { width: 820, height: 1180 }, inner: { width: 700, height: 700 } }), false);
});

test('retryUrl adds the marker and keeps the other parameters and the hash', () => {
  assert.equal(retryUrl('https://x.test/kyra/', '', '#diag'), `https://x.test/kyra/?${COVER_PARAM}=1#diag`);
  assert.equal(retryUrl('https://x.test/kyra/', '?a=1', ''), `https://x.test/kyra/?a=1&${COVER_PARAM}=1`);
});

test('withoutCoverParam removes only the marker', () => {
  assert.equal(withoutCoverParam(`?${COVER_PARAM}=1`), '');
  assert.equal(withoutCoverParam(`?a=1&${COVER_PARAM}=1`), '?a=1');
  assert.equal(withoutCoverParam(`?${COVER_PARAM}=1&b=2`), '?b=2');
  assert.equal(withoutCoverParam('?a=1'), '?a=1');
});
