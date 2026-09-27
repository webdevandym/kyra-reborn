import { COLORS, GHOST } from '../config.js';
import { inkShape, inkEllipse, inkLine, inkPoly, inkRect } from './ink.js';
import { drawChicken, drawHeart, drawStar } from './sprites.js';

const INK_W = 2.6;

function dot(ctx, x, y, r, color = COLORS.ink) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function hearts(ctx, lives, y, time, seed) {
  for (let i = 0; i < lives; i++) {
    drawHeart(ctx, (i - (lives - 1) / 2) * 13, y + Math.sin(time * 5 + i) * 2, 5, seed + i);
  }
}

function dizzyStars(ctx, y, time, seed) {
  for (let i = 0; i < 3; i++) {
    const a = time * 6 + (i * Math.PI * 2) / 3;
    drawStar(ctx, Math.cos(a) * 18, y + Math.sin(a) * 5, 5, COLORS.star, seed + i);
  }
}

export function drawRat(ctx, rat, time, seed = 471) {
  const { x, y, dir = -1, anim = 0 } = rat;
  const step = Math.sin(anim * 2.2) * 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  const tail = [];
  for (let i = 0; i <= 6; i++) tail.push([-14 - i * 3, -9 - i * 1.2 + Math.sin(time * 8 + i * 0.9) * 2.2]);
  inkLine(ctx, tail, { stroke: COLORS.ratEar, width: 2.4, seed: seed + 1 });
  inkLine(ctx, [[-7, -4], [-8 + step, 0]], { width: 2.2, seed: seed + 2 });
  inkLine(ctx, [[6, -4], [7 - step, 0]], { width: 2.2, seed: seed + 3 });
  inkEllipse(ctx, -2, -11, 15, 9.5, { fill: COLORS.rat, width: INK_W, seed: seed + 4 });
  inkPoly(ctx, [[8, -17], [20, -11], [8, -5]], { fill: COLORS.rat, width: 2.2, seed: seed + 5 });
  inkEllipse(ctx, 7, -19, 4.5, 4.5, { fill: COLORS.ratEar, width: 1.8, seed: seed + 6 });
  dot(ctx, 20, -11, 2, COLORS.ratEar);
  dot(ctx, 12, -13, 1.8);
  inkLine(ctx, [[18, -10], [25, -12]], { stroke: COLORS.inkSoft, width: 1, seed: seed + 7 });
  inkLine(ctx, [[18, -9], [25, -7]], { stroke: COLORS.inkSoft, width: 1, seed: seed + 8 });
  ctx.restore();
}

function ghostSheet(cx, cy, time) {
  const points = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    points.push([cx + Math.cos(a) * 17, cy - 2 + Math.sin(a) * 16]);
  }
  points.push([cx + 17, cy + 16]);
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    points.push([cx + 17 - u * 34, cy + 16 + Math.sin(u * Math.PI * 3 + time * 6) * 3]);
  }
  return points;
}

export function drawGhost(ctx, ghost, time, seed = 491) {
  const { x, y, h = GHOST.h, dir = -1, shy = false, trail = [] } = ghost;
  const n = trail.length;
  if (n > 1) {
    for (let k = 0; k < 5; k++) {
      const point = trail[Math.floor((k * (n - 1)) / 5)];
      ctx.globalAlpha = 0.25 + k * 0.1;
      inkEllipse(ctx, point.x, point.y - h / 2 + 6, 5 + k * 2, 5 + k * 2, { fill: COLORS.ghostShade, stroke: COLORS.inkSoft, width: 1.2, seed: seed + k });
    }
    ctx.globalAlpha = 1;
  }
  const cy = y - h / 2;
  inkShape(ctx, ghostSheet(x, cy, time), { fill: COLORS.ghost, width: INK_W, seed: seed + 10 });
  ctx.save();
  ctx.translate(x, cy);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  if (shy) {
    inkEllipse(ctx, -3, -4, 5, 4, { fill: COLORS.paper, width: 1.6, seed: seed + 11 });
    inkEllipse(ctx, 7, -4, 5, 4, { fill: COLORS.paper, width: 1.6, seed: seed + 12 });
    inkEllipse(ctx, 2, 5, 3, 2, { fill: COLORS.moonCheek, stroke: null, seed: seed + 13 });
  } else {
    inkEllipse(ctx, -2, -4, 3, 4.5, { fill: COLORS.ink, stroke: null, seed: seed + 11 });
    inkEllipse(ctx, 7, -4, 3, 4.5, { fill: COLORS.ink, stroke: null, seed: seed + 12 });
    inkEllipse(ctx, 3, 6, 2.5, 3, { width: 1.6, seed: seed + 13 });
  }
  ctx.restore();
}

export function drawSkeleton(ctx, skeleton, time, seed = 511) {
  const { x, y, dir = -1, anim = 0, lives = 2, dizzy = 0 } = skeleton;
  const step = Math.sin(anim * 1.6) * 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  inkLine(ctx, [[-4, -16], [-6 + step, 0]], { stroke: COLORS.bone, width: 4, seed: seed + 1 });
  inkLine(ctx, [[-4, -16], [-6 + step, 0]], { width: 1.4, seed: seed + 2 });
  inkLine(ctx, [[4, -16], [6 - step, 0]], { stroke: COLORS.bone, width: 4, seed: seed + 3 });
  inkLine(ctx, [[4, -16], [6 - step, 0]], { width: 1.4, seed: seed + 4 });
  inkRect(ctx, -9, -32, 18, 16, { fill: COLORS.bone, width: 2.2, seed: seed + 5 });
  for (const ry of [-27, -22]) inkLine(ctx, [[-7, ry], [7, ry]], { width: 1.3, seed: seed + ry });
  inkLine(ctx, [[-9, -30], [-15, -20 - step]], { width: 2, seed: seed + 6 });
  inkLine(ctx, [[9, -30], [15, -20 + step]], { width: 2, seed: seed + 7 });
  ctx.save();
  ctx.translate(1, -42);
  ctx.rotate(dizzy > 0 ? Math.sin(time * 10) * 0.3 : 0);
  inkEllipse(ctx, 0, 0, 10, 10, { fill: COLORS.bone, width: INK_W, seed: seed + 8 });
  inkEllipse(ctx, -3, -1, 2.6, 3, { fill: COLORS.ink, stroke: null, seed: seed + 9 });
  inkEllipse(ctx, 4, -1, 2.6, 3, { fill: COLORS.ink, stroke: null, seed: seed + 10 });
  inkLine(ctx, [[-4, 5], [5, 5]], { width: 1.4, seed: seed + 11 });
  for (const tx of [-2, 1, 4]) inkLine(ctx, [[tx, 3.5], [tx, 6.5]], { width: 1, seed: seed + 12 + tx });
  ctx.restore();
  hearts(ctx, lives, -64, time, seed + 20);
  if (dizzy > 0) dizzyStars(ctx, -56, time, seed + 30);
  ctx.restore();
}

function drawWeb(ctx, cx, cy, seed) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    inkLine(ctx, [[cx, cy], [cx + Math.cos(a) * 34, cy + Math.sin(a) * 34]], { stroke: COLORS.inkSoft, width: 1.2, seed: seed + i });
  }
  for (const r of [12, 22, 32]) {
    const ring = [];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    inkLine(ctx, ring, { stroke: COLORS.inkSoft, width: 1, seed: seed + r, smooth: false });
  }
}

export function drawSpider(ctx, spider, time, seed = 541) {
  const { x, y, dir = -1, winding = false } = spider;
  drawWeb(ctx, x, y - 84, seed + 40);
  inkLine(ctx, [[x, y - 50], [x, y - 84]], { stroke: COLORS.inkSoft, width: 1.2, seed: seed + 50 });
  const rear = winding ? 6 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  for (let i = 0; i < 4; i++) {
    const wiggle = Math.sin(time * 6 + i) * 2;
    for (const side of [-1, 1]) {
      const hip = [side * (4 + i * 5), -20 - rear];
      const knee = [side * (20 + i * 6), -42 - rear + wiggle];
      const foot = [side * (26 + i * 5), 0];
      inkLine(ctx, [hip, knee, foot], { width: 2.6, seed: seed + i * 2 + (side > 0 ? 1 : 0), smooth: false });
    }
  }
  ctx.save();
  ctx.translate(0, -18 - rear);
  ctx.rotate(winding ? -0.12 : 0);
  inkEllipse(ctx, 0, 0, 24, 17, { fill: COLORS.spider, width: INK_W, seed: seed + 10 });
  for (const [ex, ey, r] of [[10, -6, 4], [17, -5, 4], [8, 1, 2.2], [14, 2, 2.2], [19, 1, 2.2]]) {
    inkEllipse(ctx, ex, ey, r, r, { fill: COLORS.eyeWhite, width: 1.2, seed: seed + 11 + ex });
    dot(ctx, ex + r * 0.3, ey, r * 0.45);
  }
  if (winding) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(time * 20));
    inkEllipse(ctx, 22, 9, 7, 5, { fill: COLORS.spiderGlow, stroke: null, seed: seed + 20 });
    ctx.globalAlpha = 1;
  }
  inkPoly(ctx, [[15, 10], [17, 17], [19, 10]], { fill: COLORS.teeth, width: 1.2, seed: seed + 21, jitter: 0.3 });
  inkPoly(ctx, [[20, 9], [22, 16], [24, 9]], { fill: COLORS.teeth, width: 1.2, seed: seed + 22, jitter: 0.3 });
  ctx.restore();
  ctx.restore();
}

export function drawFireball(ctx, ball, time, seed = 581) {
  const { x, y, vx = -1 } = ball;
  const back = vx < 0 ? 1 : -1;
  for (let k = 0; k < 3; k++) {
    const len = 16 + k * 6 + Math.sin(time * 30 + k) * 3;
    const off = (k - 1) * 5;
    inkPoly(ctx, [[x, y + off - 4], [x + back * len, y + off], [x, y + off + 4]], { fill: k === 1 ? COLORS.fireCore : COLORS.fireball, stroke: null, seed: seed + k, jitter: 0.8 });
  }
  const r = 11 + Math.sin(time * 25) * 0.8;
  inkEllipse(ctx, x, y, r, r, { fill: COLORS.fireball, width: 2.2, seed: seed + 5 });
  inkEllipse(ctx, x - back * 3, y - 2, 4.5, 4.5, { fill: COLORS.fireCore, stroke: null, seed: seed + 6 });
}

export function drawPortal(ctx, portal, progress, time, seed = 601) {
  if (progress <= 0) return;
  const s = 1 - (1 - Math.min(1, progress)) ** 3;
  const cx = portal.x;
  const cy = portal.y - portal.h / 2;
  inkEllipse(ctx, cx, cy, 25 * s, 35 * s, { fill: COLORS.portalLight, stroke: COLORS.portal, width: 3, seed });
  const spiral = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * Math.PI * 5 + time * 4;
    spiral.push([cx + Math.cos(a) * 21 * s * t, cy + Math.sin(a) * 30 * s * t]);
  }
  inkLine(ctx, spiral, { stroke: COLORS.portal, width: 2.4, seed: seed + 1 });
}

export function drawCheckpoint(ctx, checkpoint, raised, time, seed = 621) {
  const { x, y } = checkpoint;
  const pole = x - 14;
  inkLine(ctx, [[pole, y], [pole, y - 78]], { width: 2.8, seed });
  inkEllipse(ctx, pole, y - 80, 3.5, 3.5, { fill: COLORS.crown, width: 1.6, seed: seed + 1 });
  if (raised) {
    const wave = Math.sin(time * 4) * 3;
    inkPoly(ctx, [[pole, y - 76], [pole + 30, y - 68 + wave], [pole, y - 58]], { fill: COLORS.banner, width: 2.2, seed: seed + 2 });
  } else {
    inkPoly(ctx, [[pole, y - 26], [pole + 20, y - 20], [pole, y - 12]], { fill: COLORS.stoneShade, width: 2, seed: seed + 2 });
  }
}

export function drawShield(ctx, player, time, seed = 641) {
  const cx = player.x;
  const cy = player.y - player.h / 2 - 6;
  const wobble = Math.sin(time * 5) * 1.5;
  inkEllipse(ctx, cx, cy, 30 + wobble, 32 - wobble, { fill: COLORS.shield, stroke: COLORS.shieldInk, width: 2, seed });
  inkLine(ctx, [[cx - 18, cy - 14], [cx - 12, cy - 22], [cx - 4, cy - 26]], { stroke: COLORS.paper, width: 2.4, seed: seed + 1 });
}

export function drawPrincess(ctx, goal, time, awake = false, seed = 661) {
  const hop = awake ? Math.abs(Math.sin(time * 7)) * 16 : 0;
  ctx.save();
  ctx.translate(goal.x, goal.y);
  ctx.rotate(awake ? 0 : Math.sin(time * 2) * 0.04);
  inkShape(ctx, [[4, -44 - hop], [26, -34 - hop], [34, -2 - hop], [10, -8 - hop]], { fill: COLORS.princessCape, width: 2.2, seed });
  drawChicken(ctx, { x: 0, y: 0, facing: -1, celebrate: awake }, time, seed + 10);
  const crown = [[-20, -60], [-18, -72], [-13, -64], [-9, -75], [-5, -64], [0, -72], [2, -60]].map(([cx, cy]) => [cx, cy - hop]);
  inkPoly(ctx, crown, { fill: COLORS.crown, width: 2, seed: seed + 1 });
  dot(ctx, -9, -64 - hop, 1.8, COLORS.crystal);
  for (const [lx, ly] of [[-16, -50], [-13, -51.5], [-10, -51]]) inkLine(ctx, [[lx, ly - hop], [lx - 1, ly - 3 - hop]], { width: 1.2, seed: seed + lx });
  if (awake) {
    for (let i = 0; i < 3; i++) {
      const k = (time * 0.8 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      drawHeart(ctx, -30 + i * 30, -80 - k * 50, 6, seed + 20 + i);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
