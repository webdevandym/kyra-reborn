import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { LANGS, DEFAULT_LANG, LANG_NAMES, loadLang, unloadLangs, t, nextLang, nextLangName, resolveLang, formatTime } from '../src/i18n/index.js';

const dir = new URL('../src/i18n/', import.meta.url);
const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const file = (lang) => readJson(new URL(`${lang}.json`, dir));

function keyPaths(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) => (typeof value === 'string' ? [prefix + key] : keyPaths(value, `${prefix}${key}.`)));
}

beforeEach(() => unloadLangs());

test('the manifest lists exactly the language files in src/i18n, with Polish as the default', () => {
  const files = readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => name.replace('.json', '')).sort();
  assert.deepEqual(files, [...LANGS].sort());
  assert.equal(DEFAULT_LANG, 'pl');
  assert.deepEqual(Object.keys(LANG_NAMES).sort(), [...LANGS].sort());
});

test('every language file has exactly the same key paths, and every value is a non-empty string', () => {
  const reference = keyPaths(file(DEFAULT_LANG)).sort();
  assert.ok(reference.includes('ui.play') && reference.includes('levels.level1.name'));
  for (const lang of LANGS) {
    const dict = file(lang);
    assert.deepEqual(keyPaths(dict).sort(), reference, `key paths differ for ${lang}`);
    for (const path of reference) {
      const value = path.split('.').reduce((node, part) => node[part], dict);
      assert.ok(value.trim().length > 0, `${lang}: ${path} is empty`);
    }
  }
});

test('loadLang fetches a language file once and then serves it from the cache', async () => {
  const urls = [];
  const fetchJson = (url) => {
    urls.push(String(url));
    return readJson(url);
  };
  const first = await loadLang('uk', { fetchJson });
  const second = await loadLang('uk', { fetchJson });
  assert.equal(first, second);
  assert.equal(urls.length, 1);
  assert.ok(urls[0].endsWith('/src/i18n/uk.json'), urls[0]);
});

test('two loads started together share one fetch', async () => {
  let calls = 0;
  const fetchJson = async (url) => {
    calls++;
    return readJson(url);
  };
  await Promise.all([loadLang('en', { fetchJson }), loadLang('en', { fetchJson })]);
  assert.equal(calls, 1);
});

test('loadLang rejects an unknown language without fetching', async () => {
  let calls = 0;
  await assert.rejects(loadLang('fr', { fetchJson: () => { calls++; return {}; } }), /unknown language 'fr'/);
  assert.equal(calls, 0);
});

test('a failed fetch rejects, caches nothing and can be retried', async () => {
  await assert.rejects(loadLang('pl', { fetchJson: () => { throw new Error('offline'); } }), /offline/);
  assert.equal(t('play', 'pl'), 'play');
  await loadLang('pl', { fetchJson: readJson });
  assert.equal(t('play', 'pl'), 'Graj');
});

test('a file without a ui section is rejected', async () => {
  await assert.rejects(loadLang('pl', { fetchJson: () => ({ levels: {} }) }), /ui section/);
});

test('t reads bare keys from ui and dotted keys from the root', async () => {
  for (const lang of LANGS) await loadLang(lang, { fetchJson: readJson });
  assert.equal(t('play', 'pl'), 'Graj');
  assert.equal(t('play', 'uk'), 'Грати');
  assert.equal(t('play', 'en'), 'Play');
  assert.equal(t('play'), 'Graj');
  assert.equal(t('levels.level1.name', 'en'), 'Carrot Field');
  assert.equal(t('levels.level1.signs.walk', 'uk'), '← → — йти');
  assert.equal(t('levels.level5.signs.last', 'en'), 'Last mountain —\ngood luck!');
});

test('t returns the key for a missing key, a path that is not a string, or a language that is not loaded', async () => {
  await loadLang('en', { fetchJson: readJson });
  assert.equal(t('no-such-key', 'en'), 'no-such-key');
  assert.equal(t('levels.level1', 'en'), 'levels.level1');
  assert.equal(t('levels.nope.name', 'en'), 'levels.nope.name');
  assert.equal(t('play', 'uk'), 'play');
});

test('nextLang cycles Polish, Ukrainian, English and back to Polish', () => {
  assert.equal(nextLang('pl'), 'uk');
  assert.equal(nextLang('uk'), 'en');
  assert.equal(nextLang('en'), 'pl');
});

test('nextLangName names the next language in that language without loading its file', () => {
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

test('formatTime shows whole minutes and zero-padded whole seconds', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(5), '0:05');
  assert.equal(formatTime(59.99), '0:59');
  assert.equal(formatTime(83.4), '1:23');
  assert.equal(formatTime(3665), '61:05');
  assert.equal(formatTime(-3), '0:00');
  assert.equal(formatTime(Number.NaN), '0:00');
  assert.equal(formatTime(Number.POSITIVE_INFINITY), '0:00');
});
