import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, LANGS, t, localized, nextLang, nextLangName, resolveLang } from '../src/strings.js';

test('every language defines exactly the same keys', () => {
  const ukKeys = Object.keys(STRINGS.uk).sort();
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(STRINGS[lang]).sort(), ukKeys, `keys differ for ${lang}`);
  }
});

test('t returns the string for the language and falls back to Polish then the key', () => {
  assert.equal(t('play', 'pl'), 'Graj');
  assert.equal(t('play', 'en'), 'Play');
  assert.equal(t('play', 'uk'), 'Грати');
  assert.equal(t('play', 'fr'), 'Graj');
  assert.equal(t('play'), 'Graj');
  assert.equal(t('no-such-key', 'en'), 'no-such-key');
});

test('localized picks the language from a {pl, uk, en} object, falls back to Polish and passes plain strings through', () => {
  assert.equal(localized({ pl: 'Tak', uk: 'Так', en: 'Yes' }, 'en'), 'Yes');
  assert.equal(localized({ pl: 'Tak', uk: 'Так' }, 'en'), 'Tak');
  assert.equal(localized({ pl: 'Tak', uk: 'Так' }), 'Tak');
  assert.equal(localized('plain', 'en'), 'plain');
  assert.equal(localized(undefined, 'en'), '');
});

test('nextLang cycles Polish, Ukrainian, English and back to Polish', () => {
  assert.equal(nextLang('pl'), 'uk');
  assert.equal(nextLang('uk'), 'en');
  assert.equal(nextLang('en'), 'pl');
});

test('nextLangName names the language L switches to, in that language', () => {
  assert.equal(nextLangName('pl'), 'Українська');
  assert.equal(nextLangName('uk'), 'English');
  assert.equal(nextLangName('en'), 'Polski');
});

test('resolveLang keeps a saved language and defaults to Polish otherwise', () => {
  assert.equal(resolveLang('uk'), 'uk');
  assert.equal(resolveLang('en'), 'en');
  assert.equal(resolveLang(undefined), 'pl');
  assert.equal(resolveLang('fr'), 'pl');
});
