import { LANGS, DEFAULT_LANG, LANG_NAMES } from './languages.js';

export { LANGS, DEFAULT_LANG, LANG_NAMES };

const dictionaries = new Map();
const pending = new Map();

async function fetchFromServer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

export function loadLang(lang, { fetchJson = fetchFromServer } = {}) {
  if (!LANGS.includes(lang)) return Promise.reject(new Error(`unknown language '${lang}'`));
  if (dictionaries.has(lang)) return Promise.resolve(dictionaries.get(lang));
  if (!pending.has(lang)) {
    const request = Promise.resolve()
      .then(() => fetchJson(new URL(`./${lang}.json`, import.meta.url)))
      .then((dict) => {
        if (!dict || typeof dict.ui !== 'object') throw new Error(`${lang}.json has no ui section`);
        dictionaries.set(lang, dict);
        return dict;
      })
      .finally(() => pending.delete(lang));
    pending.set(lang, request);
  }
  return pending.get(lang);
}

export function unloadLangs() {
  dictionaries.clear();
  pending.clear();
}

export function t(key, lang = DEFAULT_LANG) {
  const dict = dictionaries.get(lang);
  if (!dict) return key;
  const path = key.includes('.') ? key.split('.') : ['ui', key];
  let node = dict;
  for (const part of path) node = node?.[part];
  return typeof node === 'string' ? node : key;
}

export function nextLang(lang) {
  return LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
}

export function nextLangName(lang) {
  return LANG_NAMES[nextLang(lang)];
}

export function resolveLang(saved) {
  return LANGS.includes(saved) ? saved : DEFAULT_LANG;
}
