import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { load, save } from '../src/storage.js';

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function useStorage(storage) {
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
}

afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete globalThis.localStorage;
});

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
}

test('save then load round-trips JSON values', () => {
  useStorage(memoryStorage());
  save('kyra.best', 12);
  save('kyra.lang', 'en');
  assert.equal(load('kyra.best', 0), 12);
  assert.equal(load('kyra.lang', 'uk'), 'en');
});

test('missing keys and corrupt values fall back', () => {
  const storage = memoryStorage();
  storage.setItem('kyra.best', '{not json');
  useStorage(storage);
  assert.equal(load('kyra.best', 0), 0);
  assert.equal(load('kyra.nothing', 'uk'), 'uk');
});

test('blocked storage never throws', () => {
  useStorage({
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
  });
  assert.equal(load('kyra.best', 7), 7);
  assert.doesNotThrow(() => save('kyra.best', 9));
});
