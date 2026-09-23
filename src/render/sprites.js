import { COLORS, PLAYER, ZOMBIE } from '../config.js';
import { inkShape, inkEllipse, inkLine, inkPoly, inkRect } from './ink.js';

const INK_W = 2.6;

function marker(ctx, points, color, width, seed) {
  inkLine(ctx, points, { stroke: color, width: width + 2, seed: seed + 5, jitter: 0.6 });
  inkLine(ctx, points, { width: 1.6, seed });
}

function starPoints(r, inner = 0.42, spikes = 4) {
  const points = [];
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    points.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return points;
}

export function drawStar(ctx, x, y, r, color = COLORS.star, seed = 1) {
  ctx.save();
  ctx.translate(x, y);
  inkPoly(ctx, starPoints(r, 0.45, 5), { fill: color, width: 1.6, seed, jitter: 0.4 });
  ctx.restore();
}

export function drawChicken(ctx, chicken, time, seed = 11) {
  const { x, y, facing = 1, vx = 0, onGround = true, celebrate = false, squash = 0 } = chicken;
  const speed = Math.min(1, Math.abs(vx) / 260);
  const phase = time * 16;
  const hop = celebrate ? Math.abs(Math.sin(time * 7)) * 16 : 0;
  const bob = onGround && speed > 0.1 ? Math.abs(Math.sin(phase)) * 2.5 : 0;
  const swing = onGround ? Math.sin(phase) * 6 * speed : 3;
  const k = squash / PLAYER.squashTime;

  ctx.save();
  ctx.translate(x, y - hop);
  ctx.scale(facing * (1 + 0.25 * k), 1 - 0.3 * k);

  const legY = -12 - bob;
  marker(ctx, [[-5, legY], [-6 + swing, -1]], COLORS.beak, 2, seed + 1);
  marker(ctx, [[5, legY], [6 - swing, -1]], COLORS.beak, 2, seed + 2);
  for (const [fx, s] of [[-6 + swing, seed + 3], [6 - swing, seed + 4]]) {
    inkLine(ctx, [[fx - 3, 0], [fx + 6, 0]], { width: 2, seed: s, stroke: COLORS.ink });
    inkLine(ctx, [[fx, 0], [fx + 4, -3]], { width: 1.6, seed: s + 1 });
  }

  const by = -bob;
  inkEllipse(ctx, -2, -25 + by, 19, 16, { fill: COLORS.chicken, width: INK_W, seed: seed + 10 });
  inkShape(ctx, [[-20, -30 + by], [-26, -36 + by], [-24, -28 + by], [-28, -26 + by], [-21, -22 + by]], { fill: COLORS.chicken, width: 2, seed: seed + 11 });

  ctx.save();
  ctx.translate(2, -28 + by);
  const flap = onGround && !celebrate ? 0 : -0.5 - Math.sin(time * 28) * 0.35;
  ctx.rotate(flap);
  inkShape(ctx, [[0, 0], [-6, -3], [-14, -1], [-18, 5], [-15, 11], [-8, 13], [-1, 9]], { fill: COLORS.chickenWing, width: 2.2, seed: seed + 12 });
  inkLine(ctx, [[-14, 4], [-8, 6], [-3, 4]], { width: 1.4, seed: seed + 13 });
  inkLine(ctx, [[-12, 9], [-6, 10]], { width: 1.4, seed: seed + 14 });
  ctx.restore();

  for (const [cx, cy] of [[3, -55], [9, -58], [15, -55]]) {
    inkEllipse(ctx, cx, cy + by, 4.6, 4.6, { fill: COLORS.comb, width: 2, seed: seed + 20 + cx });
  }
  inkEllipse(ctx, 9, -43 + by, 12, 12, { fill: COLORS.chicken, width: INK_W, seed: seed + 30 });
  inkPoly(ctx, [[19, -47 + by], [29, -43.5 + by], [19, -39.5 + by]], { fill: COLORS.beak, width: 2, seed: seed + 31 });

  const blinking = time % 3.2 < 0.12;
  if (blinking) {
    inkLine(ctx, [[8.5, -45 + by], [16, -45 + by]], { width: 2, seed: seed + 32 });
  } else {
    inkEllipse(ctx, 12, -45 + by, 4.6, 4.6, { fill: COLORS.eyeWhite, width: 1.8, seed: seed + 33 });
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.arc(13.6, -45 + by, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function leaf(ctx, cx, cy, angle, seed) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  inkEllipse(ctx, 0, -6, 3.6, 7.5, { fill: COLORS.leaves, width: 1.8, seed });
  ctx.restore();
}

export function drawCarrot(ctx, carrot, time, seed = 21) {
  const { x, y, dir = -1, anim = 0 } = carrot;
  const step = Math.sin(anim * 1.6) * 3;
  const wave = Math.sin(time * 5 + seed) * 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);

  inkLine(ctx, [[-3, -7], [-5 + step, 0]], { width: 2.2, seed: seed + 1 });
  inkLine(ctx, [[3, -7], [5 - step, 0]], { width: 2.2, seed: seed + 2 });
  leaf(ctx, -5, -37, -0.45, seed + 3);
  leaf(ctx, 0, -39, 0, seed + 4);
  leaf(ctx, 5, -37, 0.45, seed + 5);
  inkLine(ctx, [[-12, -25], [-19, -19 + wave]], { width: 2, seed: seed + 6 });
  inkLine(ctx, [[12, -25], [19, -30 - wave]], { width: 2, seed: seed + 7 });

  inkShape(ctx, [[-14, -36], [-7, -39], [0, -40], [7, -39], [14, -36], [12, -26], [8, -16], [3, -8], [0, -6], [-3, -8], [-8, -16], [-12, -26]], { fill: COLORS.carrot, width: INK_W, seed: seed + 8 });
  inkLine(ctx, [[-10, -21], [-5, -21]], { width: 1.6, seed: seed + 9 });
  inkLine(ctx, [[4, -15], [8, -16]], { width: 1.6, seed: seed + 10 });
  inkLine(ctx, [[-5, -12], [-2, -12]], { width: 1.6, seed: seed + 11 });

  for (const ex of [-5, 5]) {
    inkEllipse(ctx, ex, -29, 4, 4, { fill: COLORS.eyeWhite, width: 1.6, seed: seed + 12 + ex });
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.arc(ex + 1.5, -29, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  inkLine(ctx, [[-8, -35], [-3, -36.5]], { width: 1.6, seed: seed + 13 });
  inkLine(ctx, [[3, -36.5], [8, -35]], { width: 1.6, seed: seed + 14 });
  inkLine(ctx, [[-3, -20], [0, -21.5], [3, -20]], { width: 1.6, seed: seed + 15 });
  ctx.restore();
}

function zombieHand(ctx, x, y, seed) {
  for (const [fx, fy] of [[-6, -3], [0, -8], [6, -4]]) {
    inkEllipse(ctx, x + fx, y + fy, 4.2, 4.6, { fill: COLORS.zombie, width: 1.8, seed: seed + fx });
  }
  inkEllipse(ctx, x, y + 1, 6.5, 5.5, { fill: COLORS.zombie, width: 2, seed: seed + 9 });
}

export function drawZombie(ctx, zombie, time, seed = 31) {
  const { x, y, size = 'big', anim = 0, dizzy = 0, dir = -1 } = zombie;
  const scale = size === 'small' ? ZOMBIE.smallH / ZOMBIE.bigH + 0.04 : 1;
  const step = Math.sin(anim * 1.4) * 3;
  const sway = Math.sin(time * 3 + seed) * 3;
  const look = dir < 0 ? -1.2 : 1.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  inkLine(ctx, [[-10, -12], [-12 + step, 0]], { width: 3, seed: seed + 1 });
  inkLine(ctx, [[10, -12], [12 - step, 0]], { width: 3, seed: seed + 2 });
  inkLine(ctx, [[-24, -58], [-36 + sway, -76]], { width: 3, seed: seed + 3 });
  inkLine(ctx, [[24, -58], [36 - sway, -76]], { width: 3, seed: seed + 4 });
  zombieHand(ctx, -38 + sway, -80, seed + 5);
  zombieHand(ctx, 38 - sway, -80, seed + 6);

  inkRect(ctx, -25, -84, 50, 72, { fill: COLORS.zombie, width: 3, seed: seed + 7 });
  for (const sx of [-13, 0, 13]) {
    inkLine(ctx, [[sx, -80], [sx + 1, -48], [sx, -16]], { stroke: COLORS.zombieStripe, width: 3, seed: seed + 8 + sx });
  }
  inkLine(ctx, [[-20, -71], [-6, -63]], { width: 4.5, seed: seed + 9 });
  inkLine(ctx, [[20, -71], [6, -63]], { width: 4.5, seed: seed + 10 });
  inkRect(ctx, -18, -62, 11, 10, { fill: COLORS.eyeWhite, width: 2, seed: seed + 11 });
  inkEllipse(ctx, 12, -57, 5.2, 5.2, { fill: COLORS.eyeWhite, width: 2, seed: seed + 12 });
  ctx.fillStyle = COLORS.ink;
  for (const [px, py] of [[-12.5 + look, -57], [12 + look, -57]]) {
    ctx.beginPath();
    ctx.arc(px, py, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  inkRect(ctx, -10, -45, 20, 13, { fill: COLORS.zombieMouth, width: 2.2, seed: seed + 13 });
  inkPoly(ctx, [[-10, -45], [-7, -40], [-4, -45], [-1, -40], [2, -45], [5, -40], [8, -45], [10, -45]], { fill: COLORS.teeth, width: 1.4, seed: seed + 14, jitter: 0.4 });
  inkPoly(ctx, [[-10, -32], [-7, -36], [-4, -32], [-1, -36], [2, -32], [5, -36], [8, -32], [10, -32]], { fill: COLORS.teeth, width: 1.4, seed: seed + 15, jitter: 0.4 });

  if (dizzy > 0) {
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + (i * Math.PI * 2) / 3;
      drawStar(ctx, Math.cos(a) * 26, -96 + Math.sin(a) * 6, 6, COLORS.star, seed + 20 + i);
    }
  }
  ctx.restore();
}

const GEM = [[-10, -4], [-5, -11], [5, -11], [10, -4], [0, 12]];

function drawGem(ctx, s, fill, light, seed) {
  const pts = GEM.map(([gx, gy]) => [gx * s, gy * s]);
  inkPoly(ctx, pts, { fill, width: 2.2, seed });
  inkPoly(ctx, [[-5 * s, -11 * s], [-1 * s, -4 * s], [-10 * s, -4 * s]], { fill: light, stroke: null, seed: seed + 1 });
  inkLine(ctx, [[-10 * s, -4 * s], [10 * s, -4 * s]], { width: 1.5, seed: seed + 2 });
  inkLine(ctx, [[-1 * s, -4 * s], [0, 12 * s]], { width: 1.3, seed: seed + 3 });
}

export function drawRedCrystal(ctx, crystal, time, seed = 41) {
  const bob = Math.sin(time * 3 + crystal.x * 0.05) * 4;
  ctx.save();
  ctx.translate(crystal.x, crystal.y + bob);
  drawGem(ctx, 1.05, COLORS.crystal, COLORS.crystalLight, seed);
  const twinkle = 2 + Math.max(0, Math.sin(time * 4 + crystal.x)) * 3;
  drawStar(ctx, 8, -11, twinkle, COLORS.paper, seed + 7);
  ctx.restore();
}

export function drawGreenCrystal(ctx, goal, time, seed = 51) {
  const bob = -8 - Math.sin(time * 2) * 5;
  ctx.save();
  ctx.translate(goal.x, goal.y + bob);
  const glow = ctx.createRadialGradient(0, -30, 4, 0, -30, 72);
  glow.addColorStop(0, 'rgba(34, 197, 94, 0.45)');
  glow.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -30, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -32);
  drawGem(ctx, 2.5, COLORS.goal, COLORS.goalLight, seed);
  for (let i = 0; i < 3; i++) {
    const a = time * 1.6 + (i * Math.PI * 2) / 3;
    drawStar(ctx, Math.cos(a) * 38, Math.sin(a) * 30, 4 + Math.sin(time * 5 + i) * 1.5, COLORS.star, seed + 10 + i);
  }
  ctx.restore();
}

export function drawSign(ctx, sign, text, seed = 61) {
  const lines = text.split('\n');
  ctx.font = '700 21px "Caveat", "Comic Sans MS", cursive';
  const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 26;
  const height = lines.length * 22 + 16;
  const boardBottom = sign.y - 34;
  ctx.save();
  inkRect(ctx, sign.x - 3, boardBottom, 6, 34, { fill: COLORS.platform, width: 2, seed });
  inkRect(ctx, sign.x - width / 2, boardBottom - height, width, height, { fill: COLORS.sign, width: 2.4, seed: seed + 1 });
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, sign.x, boardBottom - height + 8 + 11 + i * 22));
  ctx.restore();
}

export function heartPoints(size) {
  const points = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    const hx = 16 * Math.sin(t) ** 3;
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    points.push([(hx / 16) * size, (hy / 16) * size]);
  }
  return points;
}

export function drawHeart(ctx, x, y, size, seed = 71) {
  ctx.save();
  ctx.translate(x, y);
  inkShape(ctx, heartPoints(size), { fill: COLORS.heart, width: 2.2, seed });
  ctx.restore();
}

export function drawGemIcon(ctx, x, y, seed = 81) {
  ctx.save();
  ctx.translate(x, y);
  drawGem(ctx, 1.1, COLORS.crystal, COLORS.crystalLight, seed);
  ctx.restore();
}

export function drawMutedIcon(ctx, x, y, seed = 91) {
  ctx.save();
  ctx.translate(x, y);
  inkPoly(ctx, [[-10, -4], [-5, -4], [1, -10], [1, 10], [-5, 4], [-10, 4]], { fill: COLORS.sign, width: 2, seed });
  inkLine(ctx, [[5, -5], [13, 5]], { width: 2.2, seed: seed + 1, stroke: COLORS.comb });
  inkLine(ctx, [[13, -5], [5, 5]], { width: 2.2, seed: seed + 2, stroke: COLORS.comb });
  ctx.restore();
}
