import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, LANGS, t, localized, nextLang } from '../src/strings.js';

test('every language defines exactly the same keys', () => {
  const ukKeys = Object.keys(STRINGS.uk).sort();
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(STRINGS[lang]).sort(), ukKeys, `keys differ for ${lang}`);
  }
});

test('t returns the string for the language and falls back to Ukrainian then the key', () => {
  assert.equal(t('play', 'en'), 'Play');
  assert.equal(t('play', 'uk'), 'Грати');
  assert.equal(t('play', 'fr'), 'Грати');
  assert.equal(t('no-such-key', 'en'), 'no-such-key');
});

test('localized picks the language from a {uk, en} object and passes plain strings through', () => {
  assert.equal(localized({ uk: 'Так', en: 'Yes' }, 'en'), 'Yes');
  assert.equal(localized({ uk: 'Так' }, 'en'), 'Так');
  assert.equal(localized('plain', 'en'), 'plain');
  assert.equal(localized(undefined, 'en'), '');
});

test('nextLang cycles through the languages', () => {
  assert.equal(nextLang('uk'), 'en');
  assert.equal(nextLang('en'), 'uk');
});
