import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio.js';

let contexts;

function installAudioContext(initialState) {
  contexts = [];
  globalThis.AudioContext = class {
    constructor() {
      this.state = initialState;
      this.resumed = 0;
      this.destination = {};
      this.currentTime = 0;
      this.sampleRate = 44100;
      contexts.push(this);
    }

    createGain() {
      return { gain: { value: 1 }, connect() {} };
    }

    resume() {
      this.resumed += 1;
      this.state = 'running';
      return Promise.resolve();
    }
  };
}

beforeEach(() => installAudioContext('suspended'));

afterEach(() => {
  delete globalThis.AudioContext;
  delete globalThis.navigator.audioSession;
});

test('unlock asks iOS for a playback audio session so the silent switch does not mute the game', () => {
  globalThis.navigator.audioSession = { type: 'auto' };
  createAudio().unlock();
  assert.equal(globalThis.navigator.audioSession.type, 'playback');
});

test('unlock works in a browser without audioSession', () => {
  createAudio().unlock();
  assert.equal(contexts.length, 1);
});

test('unlock resumes a context iOS left interrupted', () => {
  installAudioContext('interrupted');
  const audio = createAudio();
  audio.unlock();
  assert.equal(contexts[0].resumed, 1);
});

test('unlock resumes a suspended context and leaves a running one alone', () => {
  const audio = createAudio();
  audio.unlock();
  assert.equal(contexts[0].resumed, 1);
  audio.unlock();
  assert.equal(contexts[0].resumed, 1);
  contexts[0].state = 'suspended';
  audio.unlock();
  assert.equal(contexts[0].resumed, 2);
});
