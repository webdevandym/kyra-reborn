import { COLORS, VIEW_W } from '../config.js';
import { mulberry32, inkEllipse, inkPoly } from './ink.js';

const MAX_PARTICLES = 400;

export function createParticles({ reduced = false, seed = 1234 } = {}) {
  const list = [];
  const rand = mulberry32(seed);
  const range = (lo, hi) => lo + rand() * (hi - lo);
  const scale = (n) => Math.max(1, Math.round(reduced ? n / 2 : n));

  function add(p) {
    if (list.length >= MAX_PARTICLES) list.shift();
    list.push({ vx: 0, vy: 0, gravity: 0, drag: 0, rot: 0, spin: 0, size: 6, screen: false, seed: Math.floor(rand() * 1e6), ...p, age: 0 });
  }

  const emitters = {
    feathers(x, y) {
      for (let i = 0; i < scale(14); i++) {
        add({ kind: 'feather', x, y, vx: range(-220, 220), vy: range(-360, -120), gravity: 380, drag: 1.8, spin: range(-6, 6), size: range(6, 10), life: range(0.9, 1.4), color: COLORS.chicken });
      }
    },
    sparkle(x, y, color = COLORS.star) {
      const n = scale(10);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const speed = range(120, 220);
        add({ kind: 'sparkle', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, drag: 3, size: range(4, 7), life: range(0.35, 0.6), color });
      }
    },
    dust(x, y) {
      for (let i = 0; i < scale(6); i++) {
        add({ kind: 'dust', x: x + range(-12, 12), y, vx: range(-60, 60), vy: range(-40, -10), drag: 4, size: range(4, 7), life: 0.35, color: COLORS.inkSoft });
      }
    },
    stars(x, y) {
      for (let i = 0; i < scale(6); i++) {
        const a = -Math.PI / 2 + range(-1.2, 1.2);
        add({ kind: 'star', x, y, vx: Math.cos(a) * range(140, 240), vy: Math.sin(a) * range(140, 240), gravity: 500, spin: range(-8, 8), size: range(6, 9), life: 0.6, color: COLORS.star });
      }
    },
    poof(x, y) {
      const n = scale(8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        add({ kind: 'dust', x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, drag: 3, size: range(7, 11), life: 0.45, color: COLORS.inkSoft });
      }
    },
    text(x, y, text, color = COLORS.ink) {
      add({ kind: 'text', x, y, vy: -70, drag: 1, life: 1.1, text, color, size: 26 });
    },
    confetti() {
      for (let i = 0; i < scale(120); i++) {
        add({ kind: 'confetti', screen: true, x: range(0, VIEW_W), y: range(-200, -10), vx: range(-40, 40), vy: range(80, 220), gravity: 60, spin: range(-10, 10), size: range(6, 11), life: range(2.5, 4), color: COLORS.confetti[i % COLORS.confetti.length] });
      }
    },
  };

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      if (p.age >= p.life) {
        list.splice(i, 1);
        continue;
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  function drawOne(ctx, p) {
    const fade = 1 - p.age / p.life;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade * 1.4));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === 'feather') {
      inkEllipse(ctx, 0, 0, p.size, p.size * 0.45, { fill: p.color, width: 2, seed: p.seed });
    } else if (p.kind === 'sparkle' || p.kind === 'star') {
      const s = p.size;
      const points = [];
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? s : s * 0.4;
        const a = (i / 8) * Math.PI * 2;
        points.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      inkPoly(ctx, points, { fill: p.color, width: 1.5, seed: p.seed, jitter: 0.4 });
    } else if (p.kind === 'dust') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * (1 + p.age / p.life), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'text') {
      ctx.font = `700 ${p.size}px "Balsamiq Sans", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = COLORS.paper;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
    } else if (p.kind === 'confetti') {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    ctx.restore();
  }

  return {
    list,
    ...emitters,
    update,
    clear: () => {
      list.length = 0;
    },
    drawWorld(ctx) {
      for (const p of list) if (!p.screen) drawOne(ctx, p);
    },
    drawScreen(ctx) {
      for (const p of list) if (p.screen) drawOne(ctx, p);
    },
  };
}
