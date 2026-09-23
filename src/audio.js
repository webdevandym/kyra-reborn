const MASTER_VOLUME = 0.35;

export function createAudio({ muted = false } = {}) {
  let ctx = null;
  let master = null;
  let isMuted = muted;

  function unlock() {
    if (!ctx) {
      const AudioContextClass = globalThis.AudioContext;
      if (!AudioContextClass) return;
      ctx = new AudioContextClass();
      master = ctx.createGain();
      master.gain.value = isMuted ? 0 : MASTER_VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone({ type = 'square', from, to = from, dur = 0.12, vol = 0.4, delay = 0 }) {
    if (!ctx || isMuted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.25, vol = 0.3, freq = 1200, delay = 0 }) {
    if (!ctx || isMuted) return;
    const t0 = ctx.currentTime + delay;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    source.connect(filter).connect(gain).connect(master);
    source.start(t0);
  }

  const notes = (list, opts) => list.forEach((from, i) => tone({ ...opts, from, delay: i * opts.gap }));

  const sfx = {
    jump: () => tone({ type: 'square', from: 330, to: 660, dur: 0.12, vol: 0.22 }),
    land: () => tone({ type: 'sine', from: 180, to: 90, dur: 0.06, vol: 0.2 }),
    crystal: () => notes([1046, 1568], { type: 'triangle', dur: 0.12, vol: 0.35, gap: 0.07 }),
    stomp: () => tone({ type: 'sine', from: 560, to: 110, dur: 0.2, vol: 0.55 }),
    shrink: () => tone({ type: 'sawtooth', from: 300, to: 900, dur: 0.28, vol: 0.18 }),
    hit: () => {
      noise({ dur: 0.25, vol: 0.3 });
      tone({ type: 'square', from: 440, to: 110, dur: 0.45, vol: 0.22 });
    },
    life: () => notes([523, 659, 784, 1046], { type: 'square', dur: 0.1, vol: 0.18, gap: 0.08 }),
    levelComplete: () => notes([523, 659, 784, 659, 784, 1046], { type: 'triangle', dur: 0.16, vol: 0.32, gap: 0.11 }),
    gameOver: () => notes([392, 370, 349, 262], { type: 'triangle', dur: 0.32, vol: 0.32, gap: 0.28 }),
    click: () => tone({ type: 'square', from: 880, dur: 0.04, vol: 0.12 }),
  };

  return {
    unlock,
    sfx,
    get muted() {
      return isMuted;
    },
    setMuted(value) {
      isMuted = value;
      if (master) master.gain.value = isMuted ? 0 : MASTER_VOLUME;
    },
  };
}
